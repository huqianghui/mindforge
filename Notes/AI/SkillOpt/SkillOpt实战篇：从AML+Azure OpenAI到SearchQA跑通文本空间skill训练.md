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
  --num_epochs 1 --steps_per_epoch 1 --batch_size 8 \
  --sel_env_num 8 --eval_test false \
  --out_root outputs/searchqa_smoke
```

> ⚠️ **不要用 `--train_size 16` 来砍数据**（我第一次就这么踩了）。`train.py` 里 `_resolve_train_size` 把 `train_size` 当**一致性校验**：它必须 == 实际 materialize 出来的 split 大小（SearchQA=400），不符直接 `ValueError`。真正的省钱开关是 **`--steps_per_epoch N`**（限制每 epoch 跑几步，每步只 rollout `batch_size` 条，与 split 总量无关）；若要真缩小加载的数据池再用 `--limit N`。上面命令的 token 花销 ≈ 1 步 ×（8 条 rollout + 1 次反射 + 8 条 gate 验证）。

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
export OPTIMIZER_MODEL=<你的deployment>  TARGET_MODEL=<你的deployment>
bash scripts/run_searchqa.sh --num_epochs 2 --train_size 80

# test split 上评优化后的 skill
python scripts/eval_only.py --config configs/searchqa/default.yaml \
  --skill outputs/searchqa/<run_id>/skills/best_skill.md
```

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
- ✅ **Phase D 冒烟（闭环跑通）**：修正命令（去 `--train_size`、加限步）后完整跑起来，六段循环 `ROLLOUT → REFLECT → AGGREGATE → SELECT → UPDATE → EVALUATE` 一步不缺。实测数据（gpt-5.4 / gpt-5.4-nano）：
  - baseline（初始 104 字 skill，`D_sel` 8 条）：`hard=0.3750 soft=0.5565`
  - **STEP 1**：train rollout `hard=0.625` → REFLECT 出 `failure=1 + success=1` 补丁 → SELECT `2→2 edits (budget=4)` → UPDATE `skill_len 104→1283` → EVALUATE **ACCEPT** `0.5000 > 0.3750`（严格改进，收）。单步 `dt≈129s`，其中 **reflect 占 94.6s（大头）**、aggregate 27.5s、rollout 仅 2.7s。
  - **STEP 2**：train rollout `hard=1.0` → 只出 1 条 success 补丁 → UPDATE `1283→1608` → EVALUATE **REJECT** `0.5000 <= 0.5000`（**打平也拒**，验证论文 "ties rejected"；被拒编辑进 rejected-edit buffer）。`dt≈49s`。
  - 关键印证：**有界 LR**（SELECT 恒 ≤budget=4）、**接受门严格改进/ties-rejected**、**skill 文本随 accept 增长**、**reflect 是耗时/token 主瓶颈**（optimizer 侧推理最贵）。
- ⏳ **Phase E 真跑**：初始 skill vs best_skill 的 val/test 分数；accept 率；总耗时与总 token 成本；`best_skill.md` 里 optimizer 到底写了哪些规则。

### 踩坑区（按遇到顺序）

1. **⚠️ `--train_size` 不是采样上限，是一致性校验**：`_resolve_train_size` 里 `configured>0 且 configured != inferred(=split 实际大小 400)` 直接 `ValueError`。**砍 token 用 `--steps_per_epoch`/`--max_steps`，别动 `train_size`**；真要缩数据池用 `--limit N`。
2. **⚠️ Azure auth 默认是 `azure_cli`，不是 api_key**：`configs/_base_/default.yaml` 里 `azure_openai_auth_mode: ""` → 空则读 `AZURE_OPENAI_AUTH_MODE` 环境变量 → **仍空则默认 `azure_cli`**。所以哪怕 `.env` 填了 `AZURE_OPENAI_API_KEY`，不显式声明也不会用，而是去找 `az login` 会话报 `AzureCliCredential ... Please run 'az login'`。**修复：`echo 'export AZURE_OPENAI_AUTH_MODE=api_key' >> .env` 后重新 source**。（云原生替代：`az login --use-device-code` 走默认 azure_cli，免 key。）
3. **⚠️ `.env` 不会被自动加载**：SkillOpt 未用 python-dotenv，必须手动 `set -a; source .env; set +a`，且只对**当前 shell 会话**生效（换终端要重 source）。长期方案是把 export 追加进 `~/.bashrc`。
4. **⚠️ 失败会写缓存，重试前必须清目录**：rollout 失败结果会落盘到 `--out_root`，SkillOpt 的 resume 逻辑下次读到"已存在的失败"（`rollout.py:393 _raise_on_systemic_failure(existing)`，注意是 `existing` 不是 `results`）**直接抛错、不重试**。表现为报错文本还是上一次的（如 endpoint/az login 早已修好却仍报旧错）。**修复：`rm -rf outputs/xxx` 或每次换新 `--out_root`**。判断技巧：日志有 `[rollout] x/8` = 真跑；没有直接 traceback = 读缓存。
5. **⚠️ `--steps_per_epoch 1` 可能不生效**：banner 仍显示 `steps/epoch=50 (auto)`，按 `train_size/batch_size` 自动算。**要硬限步用 `--max_steps 2`** 更可靠；否则会跑满 50 步（~40min、50× token）。
6. **✅ `reasoning_effort=medium` 对 gpt-5.4/nano 不报错**：这两个是 reasoning-capable 模型，默认 config 不用改；若换成非 reasoning 模型（gpt-4o 等）才需处理这个字段。

---

## 五、与 vault 的关联

- **论文精读**：机制原理（四大机件、三 split、快慢两层循环）见 [[2026-07-01-SkillOpt]]
- **对照实践**：GPU 权重训练那条线见 [[Agent Lightning系列08：RL实战篇——example选型、calc_x跑通VERL训练与tinker等框架]]——两者是"权重级 vs 文本级"的互补实验
- **今日任务**：本篇服务于"学习和掌握 SkillOpt，形成 ppt"（见当日日记）
