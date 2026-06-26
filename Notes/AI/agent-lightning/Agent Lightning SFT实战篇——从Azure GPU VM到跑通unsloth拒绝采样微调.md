---
title: Agent Lightning SFT 实战篇——从 Azure GPU VM 到跑通 unsloth 拒绝采样微调
created: 2026-06-26
tags: [agent-lightning, SFT, unsloth, LoRA, hands-on, azure, gpu, cuda, vllm, qwen3, rejection-sampling, practice]
---

# Agent Lightning SFT 实战篇——从 Azure GPU VM 到跑通 unsloth 拒绝采样微调

> [[Agent Lightning系列05：SFT路线剖析——reward不喂答案而造标签、拒绝采样微调与自蒸馏真相]] 把 SFT 这条线的**原理**讲透了：reward 造标签、拒绝采样、A/B 拆分、自蒸馏。本篇是它的**实战配套**——真正把 `examples/unsloth/` 跑起来。从「macOS 跑不了」这个硬约束出发，开一台 Azure GPU VM，装通 unsloth + vLLM 全栈，跑通 GSM-hard 的迭代自提升训练，读懂每一轮的 loss/reward/产出，最后讲怎么换成自己的任务。
>
> **本篇是「边搭边写」的活文档**：标 ⏳ 的小节是等真实运行结果回填的占位，标 ✅ 的是已验证可执行的内容。

---

## 〇、为什么需要一篇实战篇——以及那个绕不开的平台坑

系列 05 把原理讲清了，但「看懂」和「跑通」之间隔着一整套环境工程。而第一道坎就反直觉：**你大概率没法在自己的 Mac 上跑。**

官方安装文档（`docs/tutorials/installation.md`）白纸黑字：

> agent-lightning is **officially supported on Linux (Ubuntu 22.04+)**. **macOS and Windows (outside WSL2) are NOT supported.**

而 `examples/unsloth/` 这个 SFT 例子还额外要求 **一块 ≥16GB 的 NVIDIA CUDA GPU**——因为它要 4-bit 量化加载模型、起 vLLM 本地推理服务、跑 LoRA 微调，全链路绑死 CUDA。`unsloth` / `bitsandbytes` / `vllm` 都没有可用的 macOS 轮子。

所以「引用错误」（IDE 里 `import unsloth` 全标红）不是你环境配坏了，是**这些包在 macOS 上本就装不上**。结论很干脆：

| 目标 | Mac 本地 | 方案 |
|------|---------|------|
| 只想消 IDE 红线（读代码/写笔记） | ✅ | `pip install --upgrade agentlightning`（base 包），`unsloth/vllm` 仍红属正常 |
| **真正跑训练** | ❌ | 开 **Linux + NVIDIA GPU** 机器（本篇用 Azure GPU VM） |

本篇的全部操作都在一台 Azure GPU VM 上进行。

---

## 一、环境搭建：从开 VM 到装通全栈 ✅

### 1.1 选哪台 Azure GPU VM

例子的硬指标是 **16GB 显存**（4-bit 量化），基座模型是 `unsloth/Qwen3-4B-Instruct-2507`（4B 参数）。选型权衡：

| VM 系列 | GPU | 显存 | 适配度 | 备注 |
|---------|-----|------|--------|------|
| **NC4as_T4_v3** | 1× T4 | **16GB** | 刚好踩线 | README 最低要求，最省钱；4B 跑得动但 KV cache 紧 |
| **NV36ads_A10_v5** | 1× A10 | **24GB** | 舒服 | 留足余量，迭代不易 OOM，**推荐** |
| NC24ads_A100_v4 | 1× A100 | 80GB | 过剩 | 贵，没必要 |

> **建议**：图省钱用 **T4 16GB（NC4as_T4_v3）**踩 README 基线；图省心用 **A10 24GB**——4B 模型 + vLLM serving + LoRA 训练三者同时占显存，16GB 容易在第二轮 OOM，24GB 几乎无忧。

镜像选 **Ubuntu 22.04 LTS**（或 Azure 的 "NVIDIA GPU-Optimized" 镜像，预装驱动可省一步）。

> ✅ 实测：本篇实跑用的是一台 **A100 80GB PCIe**（VM 名 `agent-lighting-vm`）。80GB 对 4B 模型是绝对过剩——但好处是 vLLM 直接拿到 **51.28 GiB KV cache（373,424 tokens）**，两轮迭代全程零 OOM、零显存焦虑，适合「先跑通再说」。软件栈版本：vLLM 0.10.2 / Unsloth 2025.10.1 / Transformers 4.56.2 / Torch 2.8.0+cu128 / Triton 3.4.0。
> 省钱的话 T4 16GB 也能跑（4B + 4-bit），但 KV cache 会紧、`--gpu-memory-utilization` 要调低，第二轮容易触边。

### 1.2 NVIDIA 驱动（torch cu128 的前提）

torch 2.8.0 的 cu128 轮子**自带 CUDA 12.8 运行时**，所以**不需要单独装 CUDA Toolkit**——你只需要一个够新的 NVIDIA 驱动（≥ 550，支持 CUDA 12.8 运行时）。

```bash
# 若用纯净 Ubuntu 22.04（非 GPU-Optimized 镜像），先装驱动
sudo apt update
sudo apt install -y nvidia-driver-550
sudo reboot
# 重启后验证
nvidia-smi   # 应看到 GPU 型号 + Driver Version ≥ 550 + CUDA Version ≥ 12.4
```

> **坑**：如果 `nvidia-smi` 报 "command not found" 或 "couldn't communicate with driver"，多半是驱动没装好或没重启。GPU-Optimized 镜像可跳过这步。

### 1.3 Python 环境与装包序列

用 Python 3.10+（例子要求）。强烈建议独立 venv/conda，避免污染系统 Python。

```bash
# 1) 建环境
python3 -m venv ~/agl-venv && source ~/agl-venv/bin/activate
pip install --upgrade pip

# 2) torch 系（必须先用 cu128 源装，否则后面 vllm/unsloth 会拉错 CUDA 版本）
pip install torch==2.8.0 torchvision==0.23.0 --index-url https://download.pytorch.org/whl/cu128

# 3) 推理引擎
pip install vllm==0.10.2

# 4) unsloth + 微调栈
pip install unsloth==2025.10.1 unsloth_zoo==2025.10.1 bitsandbytes peft datasets transformers trl kernels

# 5) agent 侧（OpenAI Agents SDK + MCP）
pip install openai-agents mcp

# 6) 框架本体
pip install --upgrade agentlightning

# 7) 两个隐藏依赖（README Requirements 没列，但例子实际要用）
pip install huggingface_hub          # 提供 hf / huggingface-cli，用于下基座模型
pip install uv                       # 提供 uvx，math_agent.py 用 `uvx mcp-server-calculator` 起计算器工具
```

> **为什么顺序重要**：先装 cu128 的 torch，能锁住 CUDA ABI；之后 vllm/unsloth/bitsandbytes 都会复用这套 torch，不会再去拉 CPU 版或别的 CUDA 版。颠倒顺序是最常见的「装完跑起来 segfault / CUDA error」根因。

### 1.4 下基座模型（最容易漏的前置步骤）

`sft_algorithm.py:10` 的 docstring 藏着一条**必做前置**——例子默认从 `models/version_0` 这个本地目录起步，但仓库里**不含**这个模型，要自己下：

```bash
cd /path/to/agent-lightning/examples/unsloth
hf download unsloth/Qwen3-4B-Instruct-2507 --local-dir models/version_0
```

> 漏了这步，跑 `sft_allinone.py` 会直接抛 `ValueError: Model path models/version_0 does not exist.`（`sft_algorithm.py:169-170`）。

### 1.5 拿源码

```bash
git clone https://github.com/microsoft/agent-lightning.git
cd agent-lightning/examples/unsloth
ls   # 应看到 math_agent.py / sft_allinone.py / sft_algorithm.py / sft_rollout_runners.py / unsloth_helper.py / data_gsmhard.jsonl
```

数据 `data_gsmhard.jsonl`（64 条 GSM-hard）已打包在目录里，不用另下。

> ⏳ 实测待填：`pip install` 全程有没有依赖冲突（尤其 vllm 与 transformers/torch 的版本钳制）；装完 `python -c "import unsloth, vllm, bitsandbytes; print('ok')"` 是否通过。

---

## 二、跑通流程：dry-run → 一键 → 三进程 ✅（一键已实跑，三进程待补）

### 2.1 先 dry-run 验证 agent 接没接通（不训练）

正式训练前，先用 `math_agent.py` 单跑几条题，确认 agent + 工具 + LLM 端点通了。它需要一个**外部** LLM 端点（不是本地 vLLM，纯验证 agent 逻辑）：

```bash
export OPENAI_API_KEY=<your_key>
export OPENAI_BASE_URL=<your_endpoint>   # 如 Azure OpenAI / OpenAI / 任意兼容端点
python math_agent.py
```

它会跑前 4 条题（`math_agent.py:161` `limit=4`），每条让模型调 `uvx mcp-server-calculator` 算术、输出 `### <数字> ###`，再用 `compute_reward` 的 `np.isclose` 判分。

> **坑**：`uvx mcp-server-calculator` 首次会现拉包，需要联网；若卡住先单独 `uvx mcp-server-calculator --help` 预热。

> ✅ 实测：dry-run 跑前 4 条，2 对 2 错：
> - **对**（reward=1.0）：robe-fiber 题、Wendi-chickens 题——模型正确调计算器、输出 `### <数字> ###` 格式，`np.isclose` 命中。
> - **错**（reward=0.0）：Janet-ducks 题模型答 "26 dollars"——**带了单位**，正则 `### (\d+) ###` 抽不到纯数字 → `Cannot parse answer`；James-sprints 题是算错（格式对但数值错）。
>
> 这两类 0 分恰好示范了 reward=0 的两种来源：**格式没遵守**（parse 失败）和**答案算错**。前者说明 dry-run 阶段就该把输出格式约束写进 prompt，否则正确答案也会因格式被判 0，污染后续 SFT 样本。

### 2.2 一键跑（推荐）

确认 agent 通了、模型下好了，直接：

```bash
python sft_allinone.py
```

它等价于把 store / runners / algorithm 三件事塞进一个进程（`sft_allinone.py:3-12`）。关键参数（`:99-108`）：

| 参数 | 值 | 含义 |
|------|----|----|
| `max_iterations` | 2 | 跑 2 轮自提升（version_0→1→2） |
| `n_runners` | 4 | 4 个并发 rollout worker |
| `vllm_port` | 12316 | 本地 vLLM 推理服务端口 |
| `LLMProxy(port=12358)` | 12358 | LLM 代理（采轨迹） |
| `train_triplet_fraction` | 0.5 | 每轮留 reward 最高的 50% 轨迹训练 |

一键模式默认用 **runner 侧 OtelTracer + TracerTraceToTriplet** 采轨迹（`:109-113` 注释说明，若想改成 proxy 侧采集就解开那两行）。

> ✅ 实测：A100 上一把跑通，version_0 → version_1 → version_2 两轮自提升全程无报错，**总耗时约 9.5 分钟**（04:08:44 → 04:18:09），每轮约 3.5 分钟。关键节点如下。

**启动 → vLLM 起服务**：框架先拉起本地 vLLM（端口 12316）serve 当前 `models/version_0`，关键参数：

```
--gpu-memory-utilization 0.7 --max-model-len 32768 --port 12316
--quantization bitsandbytes --enable-auto-tool-choice --tool-call-parser hermes
```

- `--quantization bitsandbytes` 对应 4-bit 加载；`--enable-auto-tool-choice --tool-call-parser hermes` 让 vLLM 能解析模型发出的 function-call（calculator 工具要用）。
- 模型权重加载 2.7 GiB / 2.2s；`torch.compile` 首轮编译 37s，**第二轮命中编译缓存只要 12s**；KV cache 拿到 51.28 GiB（373,424 tokens）。
- store 在 4747，LLM proxy 在 12358——和系列 03 的控制平面/代理分工对得上。

**第 0 轮（version_0 → version_1）**：

```
64 rollouts → [Algo] Generated 134 triplets ... Keeping 80 with reward greater than 0.0
[Algo] SFT dataset has 80 samples
Num examples = 80 | Epochs = 6 | max_steps = 60 | total batch = 8
Trainable params 66,060,288 / 4,088,528,384 (1.62%)
train_runtime = 85.41s | 5.62 samples/s | train_loss = 0.0151
→ Saved model to models/version_1
```

- 64 条题切出 **134 个 triplet**（多数题是「调工具 + 收尾」两轮 → 2 个 triplet，所以 >64）；按 `reward > 0.0` 过滤后**留 80 个**进 SFT。
- 只训 LoRA 适配器：可训参数 6606 万 / 全量 40.9 亿 = **1.62%**。

**第 1 轮（version_1 → version_2）**：vLLM 改 serve `version_1`（编译缓存命中，起得更快），重新 rollout：

```
[Algo] Generated 130 triplets ... Keeping 86 with reward greater than 0.0
[Algo] SFT dataset has 86 samples
train_runtime = 80.95s | 5.93 samples/s | train_loss = 0.0069
→ Saved model to models/version_2
Final model path: models/version_2
```

**两轮的关键对比——飞轮确实转起来了**：留用样本数从 **80（iter0）涨到 86（iter1）**。同样 64 条题、同样 `reward>0` 阈值，留得更多 = version_1 比 version_0 答对的轨迹更多。这是「模型越训越强 → 正确轨迹越多 → 可训样本越多」的自举飞轮在真实数据上的直接证据（呼应系列 05 §2.3 的 ReST 形态）。

**每条 rollout 的 reward 转储**长这样，印证了「每轮一个 triplet + reward 只落在最后一轮 + `reversed()` 反向回传」：

```
[Algo] Rollout ro-3fa1db1d2ac8 has 2 triplets. Prompt lengths: [272, 328].
       Response lengths: [35, 13]. Rewards are: [None, 1.0]
```

`[None, 1.0]` = 第一轮（决定调工具）当时没有 reward，最终答案对了拿到 1.0，再倒序把 1.0 传给前置轮次。

**一批良性告警**（不影响跑通，看到不用慌）：`torch<2.11` 跳过 cpp 扩展、`Dashboard directory not found`、AgentOps 报 `No module named 'openai.resources.beta.chat'`、`No headers found in N subtree spans ... Cannot log to store`、`FlashInfer not available`、bitsandbytes 未完全优化提示。这些都是环境探测/可选加速缺失，不阻断训练。

### 2.3 三进程跑（调试 / 分布式时用）

需要拆开看每一环、或要多机扩 runner 时，用三进程（`README.md:52-67`）。开三个终端：

```bash
# 终端 1：起 store（控制平面）
agl store --port 4747

# 终端 2：起算法侧（生产者：收集→筛→训练）
python sft_algorithm.py

# 终端 3：起 rollout runners（消费者：4 个 worker 跑 rollout）
python sft_rollout_runners.py
```

注意 `sft_algorithm.py:365` 这里用的是 **proxy 侧 `LlmProxyTraceToTriplet()`** 采集——和一键模式默认的 tracer 侧不同。这对应系列 03 讲的「生产者/消费者经 store 解耦」。

> ⏳ 实测待填：三进程各自的日志片段、store 队列状态、runner 与 algorithm 经 store 的交互节奏；与一键模式产出是否一致。

> ✅ 实测踩坑表（本次真实遇到的，全在「装环境」阶段，训练本身零报错）：
>
> | 报错 | 根因 | 解法 |
> |------|------|------|
> | `ModuleNotFoundError: No module named 'agents'` | math_agent 用 OpenAI Agents SDK，但包名不叫 `agents` | `pip install openai-agents`（import 名是 `agents`，包名是 `openai-agents`） |
> | `FileNotFoundError: 'uvx'` | math_agent 用 `uvx mcp-server-calculator` 起计算器，但 README 没列 `uv` | `pip install uv`，再 `uvx mcp-server-calculator --help` 预热拉包 |
> | `ValueError: Model path models/version_0 does not exist` | 漏了下基座模型 | `hf download unsloth/Qwen3-4B-Instruct-2507 --local-dir models/version_0` |
>
> 这三个都是 README Requirements 没写全的「隐藏前置」——印证 §1.3 的装包清单要补 `openai-agents` / `uv` / `huggingface_hub`。A100 上没遇到 OOM、端口占用、vllm 起不来。

---

## 三、输出解读：loss / reward / version_n / pass@k ✅（pass@k 评测待补）

### 3.1 一轮迭代产出什么

按 `sft_one_iter`（系列 05 §二）的四步，一轮跑完你应该看到：

1. **rollout 阶段**：vLLM 用当前 `models/version_{n}` 起服务，4 个 runner 并发跑 64 条题，每条产出 reasoning + tool 调用 + 最终答案，grader 打 0/1。
2. **筛选阶段**：所有 triplet 按 reward 降序排，留 top 50%（`sft_algorithm.py:294-295`）。
3. **训练阶段**：unsloth 子进程跑 LoRA SFT，trl `SFTTrainer` 按 `unsloth_helper.py:63-76` 配置——`max_steps=60`、`batch=2`、`grad_accum=4`、`lr=2e-4`、`adamw_8bit`。
4. **存模型**：`save_pretrained_merged(..., "merged_16bit")` 存成 `models/version_{n+1}`，供下一轮 vLLM serving。

### 3.2 该盯哪几个数

| 指标 | 在哪看 | 健康的样子 | 本次实测 |
|------|--------|-----------|---------|
| **留用样本数**（`Keeping X`） | 算法日志 `Generated N triplets ... Keeping X with reward greater than 0.0` | 应随 version 上升 | **80 → 86**（涨了，飞轮转动）✅ |
| **训练 loss** | trl `logging_steps=1`，每步打 loss | 平稳下降，不 NaN | 0.0151 → 0.0069（见下方 §3.2.1 的重要提醒） |
| **峰值显存** | `nvidia-smi` | 16GB 卡要盯 OOM，尤其第二轮 vLLM+训练叠加 | A100 80GB 远未触边，KV cache 拿满 51.28 GiB |

> **重要订正（实测推翻了原推断）**：本版 `sft_algorithm.py` 的筛选用的是**阈值过滤** `reward > 0.0`（日志 `Keeping 80 with reward greater than 0.0`），**不是**系列 05 §2.1.1 / 本文 §4.2 早先所说的「固定切 50%」。也就是说这一版**已经做了阈值过滤**，0 分样本不会被「凑满比例」带进训练集——系列 05 担心的污染坑在当前 demo 里其实不存在。这正是「边搭边写」的价值：实跑日志直接纠正了读源码时的推断。

### 3.2.1 为什么不能拿 train_loss 当「变强了」的证据

train_loss 从 0.0151 降到 0.0069 看着很美，但**它只是「模型对自己筛出来的那批正确轨迹拟合得多好」，不是「模型解题能力」**。原因：

- SFT 训的标签是模型**自己产的、且已被 reward 判对**的轨迹——本来就是它分布内、能复现的东西，loss 低到接近过拟合是自然的。
- loss 低 ≠ 没见过的题答得更对。真正的能力指标只有一个：**在 holdout 题上的 pass@1 / pass@k**（见 §3.3）。

所以盯 loss 只用来确认「训练没崩」（不 NaN、不剧震），**别拿它的下降幅度当模型进步的证据**。能反映进步的是 `Keeping X` 的 80→86，以及 §3.3 的实测评测。

### 3.3 验证「pass@k → pass@1」是否真的发生

系列 05 §三的核心论点是「自蒸馏把偶然对压成稳定对」。怎么验证它真发生了？

- **同一批没在训练里见过的题**，分别用 `version_0` 和 `version_2` 各跑：
  - **greedy（temperature=0）单次**：看 pass@1 是否从 v0 到 v2 提升；
  - **采样多次（如 temperature=0.8 跑 8 次）取 best**：看 pass@8。
- **预期**：v2 的 **pass@1 明显涨**（搜索成本内化进权重），pass@8 涨幅较小（v0 本来 pass@8 就不低）。这正是「best-of-N → greedy 内化」的实证。

**怎么实操评测**（demo 没内置评测，要自己搭，三步）：

```bash
# 1) 用 vLLM serve 要测的那个 checkpoint（逐个换 version_0 / version_1 / version_2）
python -m vllm.entrypoints.openai.api_server \
  --model models/version_2 --quantization bitsandbytes \
  --enable-auto-tool-choice --tool-call-parser hermes \
  --port 12316 --max-model-len 32768

# 2) 把 math_agent 指到这个本地端点（而不是外部 gpt-4.1-mini）
export OPENAI_BASE_URL=http://localhost:12316/v1
export OPENAI_API_KEY=dummy        # vLLM 不校验

# 3) 跑评测：greedy 一次算 pass@1；temperature=0.8 跑 8 次取 best 算 pass@8
python math_agent.py
```

> **关键提醒：要用 holdout 题**。本 demo 的 64 条 GSM-hard **全部进过训练**，直接拿它们评测是「考已经背过的题」，pass@1 必然虚高。要么从 GSM-hard 另取一批没训过的题，要么训练时就留出 holdout split。否则评测数字不能说明泛化。

> ⏳ 实测待填（评测需自己搭 holdout，本次只跑了训练未跑评测）：v0/v1/v2 在 holdout 上的 pass@1 / pass@8 数字。
> 但**飞轮信号已有实证**：留用样本 80→86（§3.2），是 version_1 比 version_0 答对更多的直接证据。

---

## 四、改造成自己的：换数据集 / grader / agent ✅

跑通 demo 只是第一步。要把这条 SFT 线套到自己的任务上，按系列 05 的拆解，只需动**三个领域零件**，框架管道一行不改（呼应 [[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]] 的 method-agnostic）。

### 4.1 换数据集：你只需提供「题目 + 评分钥匙」

GSM-hard 的记录是 `{input, target}`（`code` 字段是死字段，系列05 §2.4）。换成你的任务，照这个结构写你的 `data_xxx.jsonl`：

```jsonl
{"input": "你的任务输入（喂给模型当 prompt）", "target": "你的标准答案（只喂 grader 评分，不喂模型）"}
```

- `target` **不必是数字**——可以是字符串、JSON、任何能被你的 grader 拿来判分的东西。
- 把 `math_agent.py` 的 `GsmProblem` TypedDict（`:39-50`）和 `load_math_dataset`（`:69`）改成读你的字段即可。

> **铁律重申**（系列05 §一）：你**不需要**提供「标准解题过程」当模仿 label——那是模型自己 rollout 造的。你只需提供 `target` 当评分钥匙。

### 4.2 换 grader：reward 设计才是真瓶颈

`compute_reward`（`math_agent.py:128`）是整个流程**唯一需要你动脑的地方**。GSM-hard 用的是精确匹配：

```python
answer = float(answer_extracted.group(1))
return 1.0 if np.isclose(answer, target, rtol=1e-5) else 0.0
```

换成你的任务时，grader 的设计直接决定成败（系列04 §四、系列05 §2.1.1）：

- **可验证任务**（数学、代码、结构化抽取）→ 写精确/规则匹配 grader，**0 噪声，首选**。
- **主观任务**（摘要、对话质量）→ 只能用 LLM-as-judge，**有噪声，要防 reward hacking**，且小数据集上 `sort` 会被噪声带偏。
- **生产建议**：用**阈值过滤**（只留 `reward > 0` 或 `reward == max`），而非按固定比例切。**实测订正**：本版 `sft_algorithm.py` 跑出来的日志是 `Keeping 80 with reward greater than 0.0`——说明它**已经是阈值过滤**（`reward > 0`），系列 05 §2.1.1 担心的「固定切 50% → 0 分凑满污染」在当前 demo 里并不存在。若你的任务 reward 是连续分（非 0/1），可把阈值收得更紧（如只留 `reward == max` 或 top 分位），避免把「勉强及格」的轨迹也喂进去。

### 4.3 换 agent：rollout 逻辑随便写

`math_agent` 是个 `@rollout async def`（`math_agent.py:85`），签名 `(task, llm)`，体内用 OpenAI Agents SDK + MCP 计算器。换成你的 agent：

- 工具不用计算器 → 换成你的 MCP server / function（但记住系列05 §2.5：**换工具 schema = 调用语法不迁移，要重训**，先把工具契约定稳）。
- 不想用 Agents SDK → 裸写 OpenAI 调用、LangChain、AutoGen 都行，框架只认「签名 + 返回 float」（系列02 §2.1）。
- 关键：rollout 函数最后 `return` 你 grader 算出的 float，runner 会自动 emit 成 reward span（系列02 §2.6）。

### 4.4 改造检查清单

| 改什么 | 文件:位置 | 注意 |
|--------|----------|------|
| 数据结构 + 加载 | `math_agent.py` `GsmProblem` / `load_math_dataset` | input 喂模型、target 只喂 grader |
| grader | `math_agent.py` `compute_reward` | 可验证优先；加阈值过滤 |
| agent 逻辑 + 工具 | `math_agent.py` `math_agent` | 工具契约定稳再 SFT |
| 基座模型 | `sft_algorithm.py:358` / `hf download` | 换成你要微调的模型 |
| 迭代/超参 | `sft_allinone.py:99-108`、`unsloth_helper.py:63-76` | max_iterations / lr / max_steps 等 |

> 这一节本质就是 [[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]] §六的「四步插槽」在 SFT 上的具象，也是系列07「套到真实 Agent」的预演。

---

## 五、小结

1. **平台硬约束**：agent-lightning 官方只支持 Linux（Ubuntu 22.04+），SFT 例子要 ≥16GB NVIDIA GPU；macOS 跑不了训练，只能装 base 包消 IDE 红线。
2. **环境搭建关键序列**：先装 cu128 的 torch（锁 CUDA ABI）→ vllm → unsloth 栈 → agent 侧 → agentlightning → 隐藏依赖 `huggingface_hub`（`hf`）+ `uv`（`uvx`）。
3. **两个最容易漏的前置**：`hf download unsloth/Qwen3-4B-Instruct-2507 --local-dir models/version_0`（不下会直接报路径不存在）；`uvx` 装好（math_agent 用它起计算器）。
4. **三种跑法**：`math_agent.py` dry-run 验证接线 → `sft_allinone.py` 一键 → `agl store` + runners + algorithm 三进程（调试/分布式）。
5. **改造只动三零件**：数据集（input+target）、grader（reward 设计是真瓶颈，建议加阈值过滤）、agent 逻辑——框架管道一行不改。
6. **实测要点**：A100 80GB 上一键跑通两轮自提升，约 9.5 分钟；留用样本 **80→86**（飞轮转动的直接证据）；train_loss 0.0151→0.0069 只表拟合不表能力；**最关键的实测订正**——本版 demo 的筛选是 `reward > 0` 阈值过滤（日志 `Keeping X with reward greater than 0.0`），不是早先读源码推断的「固定切 50%」。
7. **仍待补**：v0/v1/v2 在 holdout 上的 pass@1 / pass@8（demo 无内置评测，需用 vLLM serve + math_agent 自搭，且必须用没训过的题）。

> 相关：[[Agent Lightning系列05：SFT路线剖析——reward不喂答案而造标签、拒绝采样微调与自蒸馏真相]]（本篇的原理底座）、[[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]]（脊柱与四步插槽）、[[Agent Lightning系列03：自定义算法与Trainer集成——5个store动作、生产者消费者与一键运行]]（生产者/消费者、一键 vs 三进程）、[[Agent Lightning系列04：APO源码剖析——算法=LLM调用+sorted、虚拟多agent真相与核心使用场景]]、[[Agent Lightning系列01：用APO做Prompt Tuning——Azure实践与beam search算法解析]]
