---
title: "SkillOpt 实战篇：从 AML + Azure OpenAI 到 SearchQA 跑通文本空间 skill 训练"
created: 2026-07-01
tags: [skill-optimization, text-space-optimization, agent-skill, hands-on, azure-openai, aml, searchqa, prompt-optimization]
repo: https://github.com/huqianghui/SkillOpt
paper: "SkillOpt: A Systematic Controllable Text-Space Optimizer for Agent Skills"
related: "[[2026-07-01-SkillOpt]]"
---

# SkillOpt 实战篇：从 AML + Azure OpenAI 到 SearchQA 跑通文本空间 skill 训练

> 活文档（持续回填）。配套论文精读见 [[2026-07-01-SkillOpt]]。本篇只记**动手实践**：环境、runbook、踩坑、实测数据。状态标记：✅ 已验证 / ⏳ 待跑 / ⚠️ 踩坑。

---

## 一、这篇记什么 & 与 agent-lightning 实战的最大不同

跑的是自己 fork 的 [microsoft/SkillOpt](https://github.com/huqianghui/SkillOpt)。目标是把论文里那套"像训权重一样训 skill"的循环（`rollout → reflect → aggregate → select(≤lr) → gate → update`）在真实 benchmark 上跑通，产出一份 `best_skill.md`。

和 [[Agent Lightning系列08：RL实战篇——example选型、calc_x跑通VERL训练与tinker等框架]] 的实践对比——**最大区别是不用 GPU**：

| 维度 | agent-lightning RL（calc_x） | SkillOpt |
|---|---|---|
| 要不要 GPU | 要（A100，跑 VERL/vLLM 训练） | **完全不用**——冻结模型，只发 API 调用 |
| "训练"产物 | 权重 / LoRA adapter | 一份 `best_skill.md` 文本 |
| 跑在哪 | Azure GPU VM | **AML CPU compute 即可** |
| 主要成本 | GPU 机时 | **API token 费**（optimizer + target 双模型调用） |
| 冒烟策略 | `--ci-fast` 1 step | 砍 `train_size` + `--eval_test false` |

---

## 二、环境与选型

- **算力**：AML 一台 CPU compute instance（无需 GPU）。
- **后端**：Azure OpenAI 资源（仓库默认 backend = `azure_openai`）。
- **模型**：默认 config 里 optimizer 和 target 都是 `gpt-5.5`；Azure 下模型串 = **deployment 名**，需覆盖成自己资源里实际部署的 deployment。
- **认证**：三选一——API key（最省事）/ `azure_cli`（`az login`）/ `managed_identity`（AML compute 常挂 identity，需授 "Cognitive Services OpenAI User" 角色）。首跑建议先用 key。
- **首个 benchmark**：**SearchQA**（官方文档标 ⭐ Easy、~30min），最快见效。

**关键前置（易漏）**：`data/` 里各 benchmark 只放了 **ID 清单（manifest）**，不含可运行样本。SearchQA 需先 `scripts/materialize_searchqa.py` 从 HF `lucadiliello/searchqa` 下载 materialize 到 `data/searchqa_split`（正是 config `env.split_dir` 指向的路径）。

**配置项 ↔ DL 术语对照**（`configs/_base_/default.yaml`）：

| config 键 | 含义（DL 类比） |
|---|---|
| `train.num_epochs` | epoch 数（默认 4） |
| `train.batch_size` | batch size（默认 40） |
| `optimizer.learning_rate` | **每步最多几条编辑**（默认 4）= textual LR |
| `optimizer.min_learning_rate` | 衰减下限（默认 2） |
| `optimizer.lr_scheduler` | `constant/linear/cosine/autonomous`（默认 cosine） |
| `optimizer.use_slow_update` | 慢权重 / epoch 末巩固（默认 true） |
| `optimizer.use_meta_skill` | 跨 epoch 优化器记忆（默认 true） |
| `gradient.analyst_workers` | 并行反射 worker 数（默认 16） |
| `evaluation.use_gate` | validation 接受门（默认 true） |
| `evaluation.eval_test` | 结束时是否在 test split 评测（默认 true） |

---

## 三、上手 Runbook（Phase A–E）

### Phase A — 环境（clone fork + venv + 装包）

```bash
git clone https://github.com/huqianghui/SkillOpt.git
cd SkillOpt
python3 -m venv .venv && source .venv/bin/activate
pip install -U pip
pip install -e .
pip install datasets            # materialize SearchQA 需要
python -c "import skillopt; print('SkillOpt ready!')"
```

### Phase B — 配 Azure OpenAI 凭证

```bash
cp .env.example .env
```

`.env`（走 API key，最省事）：

```ini
export AZURE_OPENAI_ENDPOINT=https://<你的资源>.openai.azure.com/
export AZURE_OPENAI_API_VERSION=2024-12-01-preview
export AZURE_OPENAI_API_KEY=<你的key>
```

加载：`set -a; source .env; set +a`

> 免 key 方案：`export AZURE_OPENAI_AUTH_MODE=managed_identity`（AML identity 授权后）或 `az login --use-device-code` 后走 `azure_cli`。首跑先用 key 别卡认证。

### Phase C — Materialize SearchQA 数据

```bash
python scripts/materialize_searchqa.py
# 默认：读 data/searchqa_id_split → 写 data/searchqa_split（400/200/1400）
# 打印 "Wrote SearchQA splits to .../data/searchqa_split: {...}" 即成功
```

### Phase D — 省钱冒烟（对标 calc_x 的 `--ci-fast`，先把 loop 跑通）

不要一上来跑满（400×4 epoch + 1400 条 test eval 烧 token）。先砍到极小：

```bash
python scripts/train.py --config configs/searchqa/default.yaml \
  --optimizer_model gpt-5.4 \
  --target_model    gpt-5.4-nano \
  --num_epochs 1 --batch_size 8 --limit 8 --train_size 8 \
  --sel_env_num 8 --eval_test false \
  --out_root outputs/searchqa_smoke
```

> ⚠️ **省钱靠 `--limit N` + `--train_size N` 成对（本 config 硬写 `train_size=400`，两个缺一不可），不是 `--steps_per_epoch`、更没有 `--max_steps`**。step 数由源码 `trainer.py:802` 死算：`total_steps = num_epochs × ceil(train_size / (batch_size × accumulation))`。`--steps_per_epoch` 传了也白传——`trainer.py:809` 会用 auto 值无条件覆盖它；`--max_steps` 这个 knob **在代码里根本不存在**。能改 step 数的只有两条：① **`--limit N` + `--train_size N` 一起用**——`--limit N` 把每个 split 截到 N 条（`datasets/base.py:383`）让加载量变 N，`--train_size N` 覆盖 config 里硬写的 400 让校验值也变 N，两者相等才过 `_resolve_train_size`（**只加 `--limit` 会报 `400 does not match N`；只加 `--train_size` 会报 `N does not match 400`——必须同改**）→ `ceil(N/bs)` 步；② 调大 `--batch_size`（`400/bs` 步，但每步更贵）。上面 `--limit 8 --train_size 8 --batch_size 8` → `ceil(8/8)=1` 步，token 花销 ≈ 1 步 ×（8 条 rollout + 1 次反射 + 8 条 gate 验证）。注意 `--limit` 会同时截 val/test，冒烟正好省。

盯日志（论文 §三 的循环）：
```
[Step x] Rollout ... Score → Reflect → N edit patches
[Step x] Selected K edits (lr=4, cosine → ...)
[Step x] Gate: val score A > B  ✓ ACCEPT   /   ✗ REJECT
```
跑完确认 `outputs/searchqa_smoke/` 下有 `best_skill.md` / `history.json` / `steps/step_0001/`。

> `scripts/train.py` docstring 明说"任意 YAML 键都可命令行覆盖"（示例 `--batch_size --num_epochs --seed`），扁平叶子名。先 `python scripts/train.py --help` 核对上面 flag 名。

### Phase E — 小规模真跑 + eval + 读产物

```bash
bash scripts/run_searchqa.sh --num_epochs 2 --train_size 400 \
  --optimizer_model gpt-5.4 --target_model gpt-5.4-nano

# test split 上评优化后的 skill
python scripts/eval_only.py --config configs/searchqa/default.yaml \
  --optimizer_model gpt-5.4 --target_model gpt-5.4-nano \
  --train_size 400 \
  --skill outputs/searchqa/<run_id>/skills/best_skill.md
```

> ⚠️ SearchQA 数据集的命令（不带 `--limit` 截断时）**必须带 `--train_size 400`**——materialize 后 train split 实际就是 400 条，`_resolve_train_size` 校验要求 configured == 加载量，传 80 之类的值会直接报 `80 does not match 400`。

**产物目录结构**（`outputs/<benchmark>/<run_id>/`）：
```
├── steps/step_0001/{candidate_skill.md, step_record.json, trajectory_digest.json}
├── slow_update/epoch_02/
├── meta_skill/epoch_02/
├── skills/best_skill.md
├── history.json
└── config.yaml
```
重点读 `best_skill.md`（训出来的最终 skill）+ `history.json`（每步 accept/reject 轨迹）。

---

## 四、实测记录（持续回填）

- ✅ **Phase A 环境**：clone / venv / `pip install -e .` / `import skillopt` 跑通（AML CPU instance，azureml_py38 base env + 项目自建 `.venv`）。
- ✅ **Phase B 认证**：`optimizer=gpt-5.4`、`target=gpt-5.4-nano`（deployment 名），endpoint `https://open-ai-hu-demo-sweden-central.openai.azure.com/`。**走 API key**，但必须显式 `AZURE_OPENAI_AUTH_MODE=api_key`（详见踩坑区②）。
- ✅ **Phase C materialize**：数据已就位，`[SearchQADataLoader] train=400 val=200 test=1400 (from data/searchqa_split)`，与 config 预期计数一致。
- ✅ **Phase D 冒烟（闭环跑通）**：正确的省钱命令是 `--limit 8 --train_size 8` **成对**（不是去 `--train_size`，见踩坑①订正），六段循环 `ROLLOUT → REFLECT → AGGREGATE → SELECT → UPDATE → EVALUATE` 一步不缺。两次实测（gpt-5.4 / gpt-5.4-nano）：
  - **早前多步跑**：baseline（`D_sel` 8 条）`hard=0.3750 soft=0.5565`；STEP1 train `hard=0.625` → `failure=1+success=1` 补丁 → SELECT `2→2 (budget=4)` → UPDATE `104→1283` → **ACCEPT** `0.5000 > 0.3750`（严格改进，收），`dt≈129s`（reflect 94.6s / aggregate 27.5s / rollout 2.7s）；STEP2 train `hard=1.0` → 1 条 success → UPDATE `1283→1608` → **REJECT** `0.5000 <= 0.5000`（打平也拒），`dt≈49s`。
  - **单步干净跑（`--limit 8 --train_size 8 --num_epochs 1`，`total_steps=1`）**：baseline `hard=0.5000 soft=0.6141`；STEP1 train `hard=0.7500` → `failure=1+success=1` → AGGREGATE `1+1→2` → SELECT `2→2 (budget=4)` → UPDATE `104→1891` → EVALUATE **REJECT** `0.5000 <= 0.5000`（打平也拒）→ best 仍是 step 0 初始 skill（**候选未被接受，`best_skill.md` = 原始 104 字未改写**）。`wall=98s`（reflect **63.2s** / aggregate 28.5s / evaluate 3.9s / rollout 2.4s），**总成本 47752 tokens（prompt 42659 + completion 5093，27 calls）**。
  - **两次对比揭示的观察点**：同一初始 skill、几乎同样的编辑，一次 ACCEPT 一次 REJECT——**accept/reject 对 `D_sel` 大小极敏感**（sel 仅 8 条时分辨率 1/8=0.125 一档，微小改动跨不过 ties-rejected 门槛）。想看真 accept / 真长出规则，需放大 `--sel_env_num` + 多跑几步。
  - **⭐ "为什么打平"的深挖（逐条对齐，比平均分更硬的证据）**：把单步跑的 baseline 与 candidate 在**同一批 8 条 sel 上按 id 逐条对齐**，发现 **8 条 hard 全部一模一样**（对的仍是 675f/52967/1758/e77d 那 4 条，错的仍是 dccd/efde/70e3/98773 那 4 条）——skill 从 104 字涨到 1891 字，但对这 8 条 sel 的边际效果**精确为零**。所以"打平"不是平均分凑巧相等，是**新增的 1783 字对这些题完全没起作用**。三个叠加根因：① **编辑来自不相交的 train 8 条**（train 的 id 与 sel 完全不同），REFLECT 学的是 train 那批的失败模式，泛化不到 sel 的 4 条错题——8 条 train 信号太窄；② **只跑了 1 步**（`train=8,bs=8→每 epoch 仅 1 batch→total_steps=1`），等于只做一次梯度更新，`num_epochs=1` 连重试机会都没有；③ **sel=8 门太粗**，要严格超 0.5 得翻对至少 1 条错题（→0.625），任何"帮 10% 边角"的改进都被量化成 0。
  - **结论：冒烟配置根本测不出效果，不是"没学到"**。`1 步 + 8 train + 8 sel` 三重太小，注定原地打平——它验证的是**管路通**（六段全跑 / gate 严格 / token 会花），不是**效果**。三个瓶颈对应三味药，缺一不可：**更大 train**（治①，失败更多样、每 epoch 步数也变多）+ **更多 epoch/步**（治②，多次 propose→gate 配 rejected-buffer 逼近）+ **更大 sel**（治③，门变细才记得下真实小改进）。其中 **sel 太小是最关键的**——sel 不放大，就算真帮到了也照样显示打平被拒。要见 accept，按论文量级放大（如 `--num_epochs 3 --sel_env_num 50`、train 几十条以上）再跑。
  - 关键印证：**有界 LR**（SELECT 恒 ≤budget=4）、**接受门严格改进/ties-rejected**、**reflect 是耗时/token 主瓶颈**（占 wall 的 60~73%，optimizer 侧推理最贵）。
- ⏳ **Phase E 真跑**：初始 skill vs best_skill 的 val/test 分数；accept 率；总耗时与总 token 成本；`best_skill.md` 里 optimizer 到底写了哪些规则。

### 踩坑区（按遇到顺序）

1. **⚠️ `--train_size` 不是采样上限，是一致性校验，且必须与 `--limit` 成对**：`_resolve_train_size` 里 `configured>0 且 configured != inferred(=加载后实际 split 大小)` 直接 `ValueError`。**本 SearchQA config 把 `train_size` 硬写成 400**（banner 会显示 `train_size: 400`），所以它恒 `>0`、恒参与校验——不像我先前误以为的"默认 0 不校验"。三种组合实测：`--limit 8` 单独 → 加载=8 但 configured 仍=400 → 报 `400 does not match 8`；`--train_size 8` 单独 → 加载仍=400 但 configured=8 → 报 `8 does not match 400`；**`--limit 8 --train_size 8` 成对 → 8==8 通过**。记忆法：`--limit` 管"实际加载多少"，`--train_size` 管"config 期望多少"，两个都改成 N 才相等。**别用 `--steps_per_epoch`/`--max_steps` 砍**——见踩坑⑤，前者被覆盖、后者不存在。
2. **⚠️ Azure auth 默认是 `azure_cli`，不是 api_key**：`configs/_base_/default.yaml` 里 `azure_openai_auth_mode: ""` → 空则读 `AZURE_OPENAI_AUTH_MODE` 环境变量 → **仍空则默认 `azure_cli`**。所以哪怕 `.env` 填了 `AZURE_OPENAI_API_KEY`，不显式声明也不会用，而是去找 `az login` 会话报 `AzureCliCredential ... Please run 'az login'`。**修复：`echo 'export AZURE_OPENAI_AUTH_MODE=api_key' >> .env` 后重新 source**。（云原生替代：`az login --use-device-code` 走默认 azure_cli，免 key。）
3. **⚠️ `.env` 不会被自动加载**：SkillOpt 未用 python-dotenv，必须手动 `set -a; source .env; set +a`，且只对**当前 shell 会话**生效（换终端要重 source）。长期方案是把 export 追加进 `~/.bashrc`。
4. **⚠️ 失败会写缓存，重试前必须清目录**：rollout 失败结果会落盘到 `--out_root`，SkillOpt 的 resume 逻辑下次读到"已存在的失败"（`rollout.py:393 _raise_on_systemic_failure(existing)`，注意是 `existing` 不是 `results`）**直接抛错、不重试**。表现为报错文本还是上一次的（如 endpoint/az login 早已修好却仍报旧错）。**修复：`rm -rf outputs/xxx` 或每次换新 `--out_root`**。判断技巧：日志有 `[rollout] x/8` = 真跑；没有直接 traceback = 读缓存。
5. **⚠️ `--steps_per_epoch` 无效、`--max_steps` 不存在（此前写错，已订正）**：`trainer.py:809` 无条件用 auto 值 `cfg["steps_per_epoch"] = ceil(train_size/(batch_size×accumulation))` 覆盖 CLI 传入值，banner 显示 `steps/epoch=50 (auto)`，所以 `--steps_per_epoch 1` 被静默丢弃。而 `--max_steps` 我 grep 全仓 `trainer.py` 零命中——**这个 knob 从来不存在**（早前版本笔记误写为限步开关，特此纠正）。step 循环是 `for step_in_epoch in range(steps_per_epoch)`（`trainer.py:1062`），无 break。**要限步只能靠 `--limit N`**（改小 `train_size` 推断值）或调大 `--batch_size`；不然默认跑满 `ceil(400/bs)` 步（bs=8 时 50 步、~40min、50× token）。
6. **✅ `reasoning_effort=medium` 对 gpt-5.4/nano 不报错**：这两个是 reasoning-capable 模型，默认 config 不用改；若换成非 reasoning 模型（gpt-4o 等）才需处理这个字段。

---

## 五、与 vault 的关联

- **论文精读**：机制原理（四大机件、三 split、快慢两层循环）见 [[2026-07-01-SkillOpt]]
- **对照实践**：GPU 权重训练那条线见 [[Agent Lightning系列08：RL实战篇——example选型、calc_x跑通VERL训练与tinker等框架]]——两者是"权重级 vs 文本级"的互补实验
- **今日任务**：本篇服务于"学习和掌握 SkillOpt，形成 ppt"（见当日日记）
