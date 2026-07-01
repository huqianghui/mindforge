---
title: "SFT 拒绝采样微调实战流程（Azure GPU VM + unsloth）"
created: "2026-06-29"
updated: "2026-06-29"
tags:
  - wiki
  - method
  - agent-lightning
  - sft
  - unsloth
  - rejection-sampling
  - azure-gpu
method_type: "pipeline"
related_concepts:
  - "[[rejection-sampling-finetuning]]"
  - "[[agent-lightning]]"
related_methods: []
---

# SFT 拒绝采样微调实战流程（Azure GPU VM + unsloth）

## 摘要

把 [[rejection-sampling-finetuning]] 的原理落成可执行流程：在一台 Linux + NVIDIA GPU 机器上装通 unsloth + vLLM 全栈，跑 agent-lightning `examples/unsloth/` 的 GSM-hard 迭代自提升训练（version_0→1→2），并正确解读 loss/reward/留用样本数。核心是「采样自产轨迹 → reward 过滤 → LoRA 微调 → 存 checkpoint 供下一轮 serving」的自举飞轮。

本方法是 [[agent-lightning]] 三级阶梯第二级（SFT）的动手配套——SFT 不是内置算法类，走自定义算法扩展点。

## 适用条件

- **前置依赖**：Linux（Ubuntu 22.04+）+ NVIDIA CUDA GPU（≥16GB 显存）；agent-lightning 已装；一个外部 LLM 端点用于 dry-run。**macOS/Windows（WSL2 外）不支持**——IDE 里 `import unsloth/vllm` 全红是平台限制不是配置错误。
- **适用场景**：APO 到顶、reward 干净可验证、pass@k>0 时把「偶尔对」固化成「次次对」；或作为 RL warmup；或当「便宜探针」验证框架接线。
- **不适用场景**：纯 prompt 调优阶段（用 APO）；需要探索基座没有的新策略（升 RL/VERL）；只能用 Mac 本地。

## 步骤

### Step 1: 开 VM + 装驱动

- **输入**：Azure 订阅
- **操作**：开 GPU VM（省钱 T4 16GB / 推荐 A10 24GB / 过剩 A100 80GB），Ubuntu 22.04 LTS 或 GPU-Optimized 镜像；纯净镜像需 `nvidia-driver-550` + 重启
- **输出**：`nvidia-smi` 显示 GPU + Driver ≥550 + CUDA ≥12.4
- **判断标准**：`nvidia-smi` 正常输出，无 "couldn't communicate with driver"

### Step 2: 按序装包（顺序是关键）

- **输入**：干净 venv（Python 3.10+）
- **操作**：**先** cu128 源装 `torch==2.8.0`（锁 CUDA ABI）→ `vllm==0.10.2` → `unsloth==2025.10.1` + bitsandbytes/peft/trl → `openai-agents mcp` → `agentlightning` → 隐藏依赖 `huggingface_hub`(hf) + `uv`(uvx)
- **输出**：`python -c "import unsloth, vllm, bitsandbytes; print('ok')"` 通过
- **判断标准**：无 segfault/CUDA error（颠倒装包序是最常见根因）

### Step 3: 下基座模型 + 拿源码

- **输入**：源码仓库
- **操作**：`hf download unsloth/Qwen3-4B-Instruct-2507 --local-dir models/version_0`；clone 仓库进 `examples/unsloth`（`data_gsmhard.jsonl` 64 条已打包）
- **输出**：`models/version_0` 存在
- **判断标准**：不漏这步——否则 `ValueError: Model path models/version_0 does not exist`

### Step 4: dry-run 验证 agent 接通（不训练）

- **输入**：外部 LLM 端点（`OPENAI_BASE_URL`/`OPENAI_API_KEY`）
- **操作**：`python math_agent.py` 跑前 4 条题，模型调 `uvx mcp-server-calculator`、输出 `### <数字> ###`、`np.isclose` 判分
- **输出**：看到 reward 0/1
- **判断标准**：agent+工具+LLM 通；**注意 reward=0 两类来源**——格式没遵守（parse 失败）和答案算错，前者说明此阶段就要把输出格式约束写进 prompt 防污染 SFT 样本

### Step 5: 一键训练（推荐）

- **输入**：通过的 agent + 下好的模型
- **操作**：`python sft_allinone.py`（store+runners+algorithm 同进程）。关键参数：`max_iterations=2`、`n_runners=4`、`train_triplet_fraction=0.5`、vLLM `--quantization bitsandbytes --enable-auto-tool-choice --tool-call-parser hermes`
- **输出**：`models/version_1`、`version_2`
- **判断标准**：两轮无报错跑通（A100 实测约 9.5 分钟）；一批良性告警（FlashInfer/Dashboard/AgentOps）不阻断

### Step 6: 读输出（盯对指标）

- **输入**：训练日志
- **操作**：盯三个数——**留用样本数** `Keeping X`（应随 version 上升，实测 80→86 = 飞轮转动）、train_loss（只确认没崩，**不能当变强证据**）、峰值显存（16GB 卡防 OOM）
- **输出**：飞轮信号判断
- **判断标准**：`Keeping X` 上升说明 version_1 比 version_0 答对更多

### Step 7: holdout 评测 pass@1/pass@8（需自搭）

- **输入**：version_0/1/2 checkpoint
- **操作**：逐个用 vLLM serve，把 math_agent 指到本地端点；greedy 单次算 pass@1、temperature=0.8 跑 8 次取 best 算 pass@8
- **输出**：泛化能力数字
- **判断标准**：**必须用 holdout 题**——demo 的 64 条全进过训练，直接评测是"考背过的题"，pass@1 虚高；预期 v2 的 pass@1 明显涨、pass@8 涨幅小（best-of-N→greedy 内化的实证）

## 决策点

| 条件 | 选择 | 理由 |
|------|------|------|
| 图省钱踩基线 | T4 16GB（NC4as_T4_v3） | README 最低要求；4B+4-bit 跑得动但 KV cache 紧、第二轮易 OOM |
| 图省心 | A10 24GB（NV36ads_A10_v5） | 4B+vLLM+LoRA 三者同时占显存，24GB 几乎无忧 |
| 只想跑通别焦虑 | A100 80GB | 过剩但零 OOM；KV cache 拿满 51.28 GiB |
| 调试/分布式扩 runner | 三进程（`agl store` + `sft_algorithm.py` + `sft_rollout_runners.py`） | 拆开看每一环；注意三进程用 proxy 侧 `LlmProxyTraceToTriplet`，一键用 tracer 侧 |
| 跑通自己的任务 | 换 data + reward + agent 逻辑 | 框架不动，只换领域零件 |

## Claims

### Claim: 留用样本数 80→86 是自举飞轮转动的直接实证

- **来源**：[[Agent Lightning系列06：SFT实战篇——从Azure GPU VM到跑通unsloth拒绝采样微调]]
- **首次出现**：2026-06-26
- **最近更新**：2026-06-29
- **置信度**：0.85
- **状态**：active

> 同样 64 条题、同样 `reward>0` 阈值，留用样本从 iter0 的 80 涨到 iter1 的 86 = version_1 比 version_0 答对的轨迹更多。这是「模型越训越强 → 正确轨迹越多 → 可训样本越多」的 ReST 飞轮在真实数据上的直接证据，比 train_loss 下降更能反映进步。

### Claim: train_loss 下降不能当「变强」的证据，只能确认没崩

- **来源**：[[Agent Lightning系列06：SFT实战篇——从Azure GPU VM到跑通unsloth拒绝采样微调]]
- **首次出现**：2026-06-26
- **最近更新**：2026-06-29
- **置信度**：0.85
- **状态**：active

> train_loss 0.0151→0.0069 只是「模型对自己筛出的正确轨迹拟合多好」——这些本就是它分布内能复现的东西，loss 低到接近过拟合是自然的。loss 低 ≠ 没见过的题答得更对。唯一真实能力指标是 holdout 上的 pass@1/pass@8。盯 loss 只为确认训练没崩（不 NaN、不剧震）。

### Claim: 当前 demo 用阈值过滤 reward>0，不是固定切 50%

- **来源**：[[Agent Lightning系列06：SFT实战篇——从Azure GPU VM到跑通unsloth拒绝采样微调]]
- **首次出现**：2026-06-26
- **最近更新**：2026-06-29
- **置信度**：0.8
- **状态**：active

> 实跑日志 `Keeping 80 with reward greater than 0.0` 推翻了读源码时「固定切 50%」的推断——当前版本已做阈值过滤，0 分样本不会被凑满比例带进训练集，系列05 担心的污染坑在 demo 里不存在。这是「边搭边写活文档」的价值：实跑直接纠正读码推断。

## 实践记录

### Practice: 2026-06-26 — A100 80GB 跑通 GSM-hard 两轮自提升

- **应用场景**：agent-lightning `examples/unsloth/` SFT demo，VM `agent-lighting-vm`（A100 80GB）
- **实际结果**：部分成功——训练全程零报错跑通（version_0→1→2，约 9.5 分钟），但 holdout pass@k 评测未跑
- **偏差与调整**：踩坑全在装环境阶段（`openai-agents`/`uv`/基座模型三个隐藏前置 README 没列全），训练本身零报错；A100 无 OOM/端口/vllm 问题
- **经验教训**：装包顺序（cu128 torch 先行）是 segfault 根因；dry-run 阶段就要把输出格式写进 prompt 防 SFT 样本污染
- **置信度影响**：飞轮信号（80→86）已实证，相关 Claim 可维持 0.85；pass@k 待 holdout 评测回填

## 关联概念

- [[rejection-sampling-finetuning]] — `implements` 本流程是拒绝采样微调原理的可执行落地（采样→reward 过滤→LoRA 训练→存 checkpoint）

## 关联方法

（暂无）

## 来源

- [[Agent Lightning系列06：SFT实战篇——从Azure GPU VM到跑通unsloth拒绝采样微调]] — 环境搭建、dry-run、一键/三进程跑、输出解读、holdout 评测设计
- [[Agent Lightning系列05：SFT路线剖析——reward不喂答案而造标签、拒绝采样微调与自蒸馏真相]] — SFT 原理（sft_one_iter 四步、A 法逐轮记录）
