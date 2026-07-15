---
title: "SkillOpt 系列 01：源码篇——主要模块拆解与六阶段执行流剖析"
created: 2026-07-01
tags: [skill-optimization, text-space-optimization, agent-skill, source-code, architecture, module-breakdown, envadapter, optimizer, azure-openai]
repo: https://github.com/huqianghui/SkillOpt
paper: "SkillOpt: A Systematic Controllable Text-Space Optimizer for Agent Skills"
related: "[[2026-07-01-SkillOpt]]"
---

# SkillOpt 系列 01：源码篇——主要模块拆解与六阶段执行流剖析

> 承接 [[2026-07-01-SkillOpt]]（论文精读）与 [[SkillOpt系列02：快速上手——AML+Azure OpenAI跑通SearchQA最小实验|快速上手]]（跑通 runbook）。本篇对标 [[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计|agent-lightning 系列 02]] 的"框架全景 + 脊柱拆解"，把 SkillOpt 仓库的**主要模块、核心函数、执行数据流**逐一读通。所有论断均对 `github.com/huqianghui/SkillOpt` 实际源码逐行核对，标注 `file:function`。
>
> 一句话定位：**SkillOpt 的代码骨架 = 一个 environment-agnostic 的 `ReflACTTrainer.train()` 主循环，把六阶段流水线（rollout→reflect→aggregate→select→update→evaluate）编排起来，具体任务逻辑全部下沉到 `EnvAdapter`。** 这与 agent-lightning "method-agnostic + 换算法只换槽位"是同构的设计哲学，只是这里换的是 **environment**，不是 algorithm。

---

## 〇、和 agent-lightning 的骨架对照

先建立跨项目的心智映射，后面读代码不迷路：

| 维度 | agent-lightning | SkillOpt |
|---|---|---|
| 脊柱抽象 | `Triplet` 轨迹 + store 控制平面 | `ReflACTTrainer.train()` 六阶段循环 |
| 可插拔的是什么 | **algorithm**（APO/SFT/RL 换槽位） | **environment**（benchmark 换 `EnvAdapter`） |
| 业务逻辑落点 | agent 代码（用户写） | `envs/<benchmark>/`（adapter+rollout+prompts） |
| "训练"产物 | 权重 / LoRA / prompt | `best_skill.md` 文本 |
| 算力 | GPU（RL 走 VERL） | 无 GPU，纯 API 调用 |
| 两类模型 | policy vs reward | **optimizer_model vs target_model** |

**最该记住的一条**：SkillOpt 里 `engine/trainer.py` 是唯一的"发动机"，它**不认识任何 benchmark**——所有 `rollout`/`reflect`/数据加载都通过 `EnvAdapter` 接口回调。想接新任务，不改 trainer，只写一个 adapter（详见 §六）。

---

## 一、顶层 Package 职责表（8 个包）

`skillopt/` 下的模块划分，一表看全：

| Package | 职责 | 关键文件 |
|---|---|---|
| `engine/` | **训练主循环**，编排六阶段 + epoch-end | `trainer.py`（`ReflACTTrainer.train()`） |
| `gradient/` | **文本梯度**（Stage 2-3）：反射 + 聚合 | `reflect.py`、`aggregate.py` |
| `optimizer/` | **优化器操作**（Stage 4-5 + epoch-end 慢层） | `clip.py`、`scheduler.py`、`skill.py`、`slow_update.py`、`meta_skill.py`、`lr_autonomous.py`、`rewrite.py`、`appendix.py`、`skill_aware.py` |
| `evaluation/` | **验证门控**（Stage 6，纯函数无 LLM） | `gate.py` |
| `model/` | **后端路由**：optimizer/target 双通道 | `__init__.py`、`backend_config.py`、`azure_openai.py`、`claude_backend.py`、`qwen_backend.py`… |
| `envs/` | **环境适配器**：每个 benchmark 一套 | `base.py`（`EnvAdapter` 接口）+ `searchqa/` 等子目录 |
| `datasets/` | **三切数据加载**（train/val/test） | `base.py`（`SplitDataLoader`、`BatchSpec`） |
| `prompts/` `utils/` `types.py` `config.py` | prompt 加载 / 打分工具 / 核心 dataclass / YAML 继承 | — |

**读代码的推荐路径**：`config.py`（看配置怎么进来）→ `types.py`（看数据结构）→ `engine/trainer.py`（看主循环）→ 遇到某阶段再跳去 `gradient/`、`optimizer/`、`evaluation/`。

---

## 二、六阶段流水线——逐阶段代码映射

论文的 `ROLLOUT → REFLECT → AGGREGATE → SELECT → UPDATE → EVALUATE`，在代码里落在这几处（实战篇日志里那六段 `x/6` 就是它）：

### Stage 1 · ROLLOUT —— 冻结 target 跑一批任务

- **入口**：`trainer.py` 调 `adapter.rollout(train_env, current_skill, rollout_dir)`
- **实现**：`EnvAdapter.rollout()` → 各 env 的 `rollout.py`（SearchQA 是 `searchqa/rollout.py:run_batch()`）
- **调用链**：`run_batch()` → `ThreadPoolExecutor` 并行 → `process_one()` → **`chat_target(system, user)`** → `evaluate()`
- **输入/输出**：current_skill(str) → `list[dict]`（每项 `RolloutResult`：`id/hard/soft/fail_reason/...`），轨迹落盘 `predictions/<id>/conversation.json`
- **关键点**：这一步用的是 **target_model**（冻结的"运动员"）；resume-aware——已有 results 会跳过。实测里 rollout 只占 2.7s，是最便宜的一段。

### Stage 2 · REFLECT —— 文本梯度（最贵的一段）

- **入口**：`adapter.reflect(results, current_skill, ...)` → 默认委托 `gradient/reflect.py:run_minibatch_reflect()`
- **核心**：先分离 failure/success → `_split_minibatches(items, M)` → **并行** `run_error_analyst_minibatch()` + `run_success_analyst_minibatch()`
- **LLM 调用**：**`chat_optimizer(system=analyst_prompt, user=skill+trajectories)`** —— 用 **optimizer_model**
- **并行度**：`ThreadPoolExecutor(max_workers=analyst_workers)`，failure/success minibatch 同时提交
- **输出**：`list[RawPatch]`（`patch` + `source_type`(failure/success) + `failure_summary`）
- **关键点**：**minibatch 分析**是设计核心——不是逐条轨迹分析，而是把 M 条打成一组共同反射，类比 minibatch SGD vs per-sample SGD。前序步骤的 rejected 编辑通过 `step_buffer_context` 注入 analyst prompt（见 §四）。实测 reflect 占单步 94.6s / 128.9s——**优化器侧推理是绝对瓶颈**。

### Stage 3 · AGGREGATE —— 补丁分层合并

- **入口**：`aggregate.py:merge_patches(current_skill, failure_patches, success_patches)`
- **算法**：三步 hierarchical merge——① 并行 merge failure → ② 并行 merge success → ③ **failure 优先**的 final merge
- **内部**：`_hierarchical_merge()` while `len>1` 循环，每层分组并行 `_merge_batch()`（`chat_optimizer`）
- **Fallback**：任何 LLM 失败 → 直接 concat 所有 edits，**保证不丢补丁**
- **输出**：单个 merged patch（`edits` list + `reasoning`）

### Stage 4 · SELECT —— 有界学习率（梯度裁剪）

- **入口**：`optimizer/clip.py:rank_and_select(current_skill, merged_patch, max_edits)`
- **预算 L 来自三种模式**（`lr_control_mode`）：
  - `"fixed"` → `scheduler.step()`（`scheduler.py:build_scheduler()`，默认 cosine 4→2）
  - `"autonomous"` → `lr_autonomous.py:decide_autonomous_learning_rate()`（LLM 自己定预算）
  - `"none"` → 不限制（full_rewrite 模式，对应论文 without-lr baseline）
- **LLM 调用**：当 edits 数 > budget，`chat_optimizer(ranking_prompt)` 返回 `selected_indices` → 取 top-L
- **Fallback**：LLM 失败 → `edits[:max_edits]` 截断
- **关键点**：这就是论文的 **textual LR = 每步最多几条编辑**。实测日志 `SELECT 2→2 edits (budget=4)` 即此处——当补丁数已 ≤ 预算时无需 ranking，直接放行。

**LR Scheduler 家族**（`scheduler.py`）：`ConstantScheduler` / `LinearScheduler` / `CosineScheduler`（`min+0.5(max-min)(1+cos(πt/T))`）/ `AutonomousScheduler`（返回 999 = 交给 LLM）。

### Stage 5 · UPDATE —— 把编辑打到 skill 文档

- **入口**：`optimizer/skill.py:apply_patch_with_report(current_skill, ranked_patch)`（patch 模式）
- **三条路径**（`update_mode`）：`"patch"`（逐条 edit）/ `"rewrite_from_suggestions"`（`rewrite.py`）/ `full_rewrite_minibatch`（直接取 `new_skill`）
- **四种 op**：`append` / `insert_after` / `replace` / `delete`
- **Protected Region（关键）**：`SLOW_UPDATE_START/END`、`APPENDIX_START/END` 围栏内的文本**禁止** step 级编辑；`append` 会插到最早 protected 区之前（`_earliest_protected_start()`），保证受保护块永远在文档尾部
- **输出**：candidate_skill(str) + 每条 edit 的 apply_report。实测 `UPDATE 104→1283`（字符数）即此处 skill 增长。

### Stage 6 · EVALUATE —— 验证门控（纯函数）

- **入口**：`evaluation/gate.py:evaluate_gate()` —— **无 LLM 调用的纯决策函数**
- **流程**：① 算 candidate 的 selection-set 分数（`sel_cache` 命中或 `adapter.rollout(sel_env, candidate)`，用 target_model）→ ② `select_gate_score(hard, soft, metric, weight)` 投影 → ③ `evaluate_gate()` 比较 cand vs current vs best
- **决策**：`cand > current` → accept；`cand > best` → accept_new_best；**否则 reject**
- **Gate metric**：`hard`（默认）/ `soft` / `mixed`（`(1-w)·hard + w·soft`）
- **两分支**：accept → `current_skill = candidate`；reject → skill 不变 + step_buffer 追加 rejected_edits
- **关键点**：**严格改进、ties rejected**——实测 STEP2 `REJECT 0.5000 <= 0.5000`（打平也拒）正是此逻辑。`use_gate=false` 时仍跑验证记分，但强制 accept。

---

## 三、`train()` 主循环伪代码（按实际实现）

把六阶段套进 epoch/step 双层循环（`engine/trainer.py:ReflACTTrainer.train()`）：

```python
def train(self):
    adapter.setup(cfg); dataloader = adapter.get_dataloader()
    scheduler = build_scheduler(mode, max_lr, min_lr, total_steps)
    current_skill = best_skill = load_initial_skill()
    current_score = best_score = baseline_on_selection_set()

    for epoch in range(1, num_epochs+1):
        step_buffer = []                       # ← REJECTED-EDIT BUFFER（epoch 内清空）
        active_meta_skill = load_meta_skill(epoch-1)   # 上一 epoch 产出

        for step in range(steps_per_epoch):    # steps_per_epoch = ceil(train_size/(bs·accum))
            all_patches = []
            for a in range(accumulation):       # 梯度累积：多 minibatch 拼接
                results = adapter.rollout(train_env, current_skill)          # ① target_model
                patches = adapter.reflect(results, current_skill,
                              step_buffer_context, meta_skill_context)       # ② optimizer_model
                all_patches += patches
            merged = merge_patches(current_skill, failure, success)          # ③ optimizer_model
            budget = (decide_autonomous_lr() if autonomous else scheduler.step())
            ranked = rank_and_select(current_skill, merged, budget)          # ④ optimizer_model
            candidate = apply_patch_with_report(current_skill, ranked)       # ⑤ 无 LLM（patch 模式）
            gate = evaluate_gate(candidate, cand_score, current, best)       # ⑥ target_model 跑 sel + 纯门控
            if gate.accept:  current_skill = candidate
            else:            step_buffer.append({failure_patterns, rejected_edits})

        if use_slow_update and epoch >= 2:      # ← 慢层：SLOW UPDATE
            pairs = build_comparison_pairs(prev_epoch_results, curr_epoch_results)
            current_skill = replace_slow_update_field(current_skill,
                                run_slow_update(current_skill, pairs))       # optimizer_model
        if use_meta_skill and epoch >= 2:        # ← 慢层：META SKILL（独立文件，不进 skill）
            save(run_meta_skill(prev_skill, curr_skill, pairs))              # optimizer_model

    test_results = adapter.rollout(test_env, best_skill)     # 最终 test 评测
```

**三个必须记住的结构点**：
1. **accumulation = 梯度累积**：多个 minibatch 的 patch 先拼接，再一起 aggregate/select/update；有效 batch = `batch_size × accumulation`。
2. **epoch 定义**：`steps_per_epoch = ceil(train_size / (batch_size·accumulation))`——一个 epoch = 遍历一遍 train split（不是无限采样）。这解释了实战篇踩坑⑤：`--steps_per_epoch 1` 被 auto 算法覆盖，要用 `--max_steps`。
3. **慢层只在 epoch≥2 触发**：slow_update / meta_skill 都需要"上一版 vs 当前版"的纵向对比，epoch 1 没有前一版，故 skip。

---

## 四、三大 Memory 机制的代码实现

论文里最精妙的三层记忆，代码落点各不相同——**一个进 skill、一个进独立文件、一个只活在变量里**：

| Memory | 存储位置 | 作用域 | 写入时机 | 出厂? |
|---|---|---|---|:---:|
| **rejected-edit buffer** | `step_buffer` 变量（内存） | **epoch-local**（每 epoch 开头 `= []`） | 每步结束（reject 追加 edits+score drop） | 否 |
| **slow-update field** | **嵌入 skill 文档**（`<!--SLOW_UPDATE-->` 围栏） | 整个 run | epoch 末 `replace_slow_update_field()` | **是** |
| **meta skill** | **独立 JSON** `out_root/meta_skill/epoch_XX/` | 整个 run | epoch 末 `run_meta_skill()` | 否 |

**① Rejected-Edit Buffer**（`trainer.py` 的 `step_buffer: list[dict]`）
- reject 时追加 `{failure_patterns, rejected_edits, score_before/after}`；下一步 REFLECT 通过 `_format_step_buffer()` → `step_buffer_context` 注入 analyst prompt
- **epoch 边界清空**——换 epoch 后样本重排、skill 也变了，旧失败模式可能失效，故意让它短命
- 类比：负经验 replay，但只在 epoch 内有效

**② Slow-Update Field**（`optimizer/slow_update.py`）
- epoch 1 `inject_empty_slow_update_field()`；epoch 2+ 用 `build_comparison_pairs()` 产出 **4 分类纵向 diff**（improved/regressed/persistent_fail/stable_success）喂给 `run_slow_update()`（optimizer_model），再 `replace_slow_update_field()` 写回
- `longitudinal_pair_policy`：`mixed`（全 4 类）/ `changed`（只 improved+regressed，不足则补采）/ `unchanged`（persistent+stable）
- **⚠️ 关键工程真相**：force-accept 模式下 slow_update **只改 `current_skill` 不改 `best_skill`**（`best_skill` 必须是某个 val-best step 的忠实快照）。所以最终 `best_skill.md` 可能**不含** slow_update 内容——除非它经过 gated 验证真正涨了分。这纠正了"慢层内容一定进成品"的直觉。
- 类比：EMA / 慢权重 / 双时间尺度

**③ Meta Skill**（`optimizer/meta_skill.py`）
- 存**独立 JSON**（不进 skill 文档）；下一 epoch 开头加载为 `active_meta_skill`，通过 `format_meta_skill_context()` 注入 REFLECT/AGGREGATE/SELECT 的 prompt
- 与 slow_update 的本质区别：**meta_skill 是"怎么改得更好"的优化器经验，不碰 target skill**；slow_update 改的是 target skill 内容本身
- 类比：Adam 的 momentum（optimizer state，不是 model weight）

> 论文精读篇 §2.3+2.4 用"更衣室战术板 vs 兜里执教笔记"辨析二者，代码层面证实了这个比喻：slow_update 写进 skill（战术板，随队出赛），meta_skill 存优化器侧 JSON（执教笔记，不给运动员）。

---

## 五、optimizer_model vs target_model 的代码分离

实战篇里 `--optimizer_model gpt-5.4 --target_model gpt-5.4-nano` 的分工，代码层面清清楚楚——**两条独立后端通道**：

| 角色 | 配置 | 干哪些阶段 | 统一入口 |
|---|---|---|---|
| **optimizer_model** | `optimizer_model` + `optimizer_backend` | REFLECT / AGGREGATE / SELECT / SLOW_UPDATE / META_SKILL / REWRITE / LR_AUTONOMOUS | **`chat_optimizer()`** |
| **target_model** | `target_model` + `target_backend` | ROLLOUT / EVALUATE（sel-set rollout） | **`chat_target()`** |

**路由实现**（`model/__init__.py`）：`chat_optimizer()` 查 `get_optimizer_backend()` 分发到 `_openai/_claude/_qwen…`；`chat_target()` 同理查 `get_target_backend()`。支持 target 后端：`openai_chat`、`claude_chat`、`qwen_chat`、`minimax_chat`、`codex_exec`、`claude_code_exec`。exec 型后端（codex/claude_code）在 env rollout 里直接调 `run_target_exec()`，不走 `chat_target()`。

**成本直觉**：target 每条 rollout 都调（高频、便宜模型），optimizer 每步只调几次但推理重（低频、贵模型）。这解释了为什么实战篇建议 optimizer ≥ target 档位——它决定编辑质量，是 reflect 瓶颈的来源。

---

## 六、EnvAdapter 契约——接新任务只写这一层

`envs/base.py:EnvAdapter` 是所有 benchmark 的抽象基类。想接新任务，**不碰 trainer，只实现这个接口**：

| 方法 | 必需? | 职责 |
|---|:---:|---|
| `build_train_env(batch_size, seed)` | **abstract** | 构建 train 环境（item 列表或 simulator） |
| `build_eval_env(env_num, split, seed)` | **abstract** | 构建 eval 环境 |
| `rollout(env_manager, skill, out_dir)` | **abstract** | 执行 episodes → `list[RolloutResult]` |
| `get_task_types()` | **abstract** | task type 列表（per-type 统计用） |
| `setup(cfg)` / `get_dataloader()` | optional | 一次性初始化 / 返回三切 DataLoader |
| `reflect(results, skill, ...)` | default | 默认委托 `run_minibatch_reflect()`，多数 env 不覆写 |
| `get_error/success_minibatch_prompt()` | optional | env-specific analyst prompt（2 级优先级：非 None 则用，None 则用通用默认） |
| `build_env_from_batch(batch: BatchSpec)` | default | 从 BatchSpec 路由到 train/eval env |
| `requires_ray()` | optional | 是否需要 Ray（ALFWorld=True） |

**SearchQA 的填充**（`envs/searchqa/adapter.py`）极简：
- `build_env_from_batch()` → 直接 `list(batch.payload)`
- `rollout()` → `searchqa/rollout.py:run_batch(items, skill, workers=64)`，ThreadPoolExecutor 并行 `process_one()` → `chat_target()`
- `get_dataloader()` → `SearchQADataLoader(SplitDataLoader)`；`get_task_types()` → `["qa"]`

**Prompt 的两级优先级**（`reflect.py` 开头注释）：adapter 返回非 None 的 custom prompt 就用它，返回 None 就用内置通用默认——这让"零配置接新 env"成为可能。

---

## 七、三切 DataLoader

`datasets/base.py:SplitDataLoader`：

| Split | 用途 | trainer 内 alias |
|---|---|---|
| `train/` | rollout + reflect | `train` |
| `val/` | **gate 评估**（accept/reject） | `selection` / `valid_seen` |
| `test/` | 最终报告，不参与优化 | `test` / `valid_unseen` |

两种初始化：`split_mode="split_dir"`（加载现成目录，SearchQA 走这条）或 `"ratio"`（从 `data_path` 全量加载→确定性 shuffle→按 `split_ratio` 默认 2:1:7 切）。`plan_train_epoch()`：一个 epoch = 遍历一遍 train_items（shuffle 后分 batch）。

> 对应论文三 split（`D_tr`/`D_sel`/`D_test`）与实战篇 `train=400 val=200 test=1400`。注意 gate 用的是 `val`（`D_sel`），epoch 末纵向诊断重采样用的是 `train`（`D_tr`），两者不同 split（论文 §2.6 辨析）。

---

## 八、Notable Gotchas（源码级坑点）

对照实战篇踩坑区，这些是代码层面的根因：

1. **`_raise_on_systemic_failure()`**（`searchqa/rollout.py`）：若**所有** rollout item 都在 agent 响应前失败（`agent_ok=False`）→ 立即 raise 中止。这是对 API 系统性错误的 fail-fast。实战篇踩坑④"读缓存直接抛旧错"就是 resume 时对 `existing` 结果跑了这个检查。
2. **`_resolve_train_size()`**（`trainer.py`）：config `train_size` 与 dataloader 推断的实际大小必须一致，否则 raise ValueError——**它是一致性校验，不是采样上限**（实战篇踩坑①）。
3. **两级 Resume**（`trainer.py`）：优先读 `runtime_state.json`（含 current/best skill 路径 + scheduler state），退化到 `history.json` 末条。
4. **Selection cache**：以 `skill_hash(candidate)` 为 key 缓存 sel-set 分数，相同 skill 不重复 rollout。
5. **Protected region**（`optimizer/skill.py`）：`replace`/`delete` 落在 `SLOW_UPDATE`/`APPENDIX` 围栏内 → skip；`append` 插到最早围栏前，保证受保护块恒在尾部。
6. **best_skill 不接受 force-inject 的 slow_update**（§四②）：final 阶段若含 slow_update 的 current 经 gate 打败 incumbent best 才 promote，确保 test 测的是真最优。
7. **Threshold-gated appendix consolidation**（`trainer.py:_flush_skill_aware_appendix`）：skill-aware 模式下 appendix 笔记超阈值时，一次 optimizer 调用做去重/合并/压缩（对应论文 Eq.11），失败则原样保留。

---

## 九、与 vault 的关联

- **论文机制**：四大机件、三 split、快慢两层循环的原理 → [[2026-07-01-SkillOpt]]
- **动手跑通**：环境/runbook/踩坑/实测数据 → [[SkillOpt系列02：快速上手——AML+Azure OpenAI跑通SearchQA最小实验]]
- **真实任务移植**：video2frames 从 APO 移植到 SkillOpt 的 env 适配、reward 设计与静默 skip 事故 → [[SkillOpt系列03：实战篇——video2frames提示词调优，从agent-lightning APO移植到SkillOpt]]
- **骨架对照**：method-agnostic vs environment-agnostic 的同构设计 → [[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]]
- **今日任务**：本篇服务于"学习和掌握 SkillOpt，形成 ppt"——源码篇提供"主要模块/主要函数"这一层给 ppt 的技术纵深
