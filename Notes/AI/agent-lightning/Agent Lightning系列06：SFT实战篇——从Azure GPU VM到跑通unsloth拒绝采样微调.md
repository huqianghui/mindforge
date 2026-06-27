---
title: Agent Lightning 系列 06：SFT 实战篇——从 Azure GPU VM 到跑通 unsloth 拒绝采样微调
created: 2026-06-26
tags: [agent-lightning, SFT, unsloth, LoRA, hands-on, azure, gpu, cuda, vllm, qwen3, rejection-sampling, practice]
---

# Agent Lightning 系列 06：SFT 实战篇——从 Azure GPU VM 到跑通 unsloth 拒绝采样微调

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
git clone https://github.com/huqianghui/agent-lightning.git
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

### 3.4 一条 triplet 落库长什么样——display 字段对 tool_call 轮有损 ✅

把 §2.2 里那条 `Rewards are: [None, 1.0]` 的 rollout（`ro-fa5b7bd5115a`，Gunter 数豆子题）落库的两条 triplet 摊开，能看清两个反直觉的认知点。这次 rollout 切成 **2 条**（A 法，每轮一条，系列05 §2.5）：

| | Record 2（决定调工具这轮） | Record 1（拿结果收尾这轮） |
|---|---|---|
| `prompt` 含什么 | 只有 `[system, user]`（268 token） | `[system, user, assistant 的 tool_call, tool 返回 9099577.916666]`（359 token） |
| `response` | tool_call（61 token，`finish_reason=tool_calls`） | `### 9099577.92 ###`（14 token，`finish_reason=stop`） |
| `reward`（落库） | **1.0** | 1.0 |

**坑一：Record 2 的 `response_raw_content` 里没有工具名。** 它只剩 `{finish_reason: "tool_calls", role: "assistant"}`，`response_text` 是残串 `"tool_calls\nassistant"`。这不是工具名丢了，是**这个人类可读字段对 tool_call 轮有损**——没把结构化的 `tool_calls`（函数名 + arguments）序列化进来。两个证据反推名字其实在：① `response_token_count=61`，远超那几个字，这 61 个 token 正是 hermes 格式的完整调用（`calculate` + 表达式 `(9926805 + (20 + 9926805/2) + 9926805*1.25)/3` + `<tool_call>` 包裹）；② 同一个 tool_call 在 Record 1 的 `prompt_raw_content` 里被逐字内联成历史。**真正进 SFT 的是 token_ids，不是 `response_text`——别用这个坏掉的 display 字段判断训了什么。**

**坑二：两条 reward 都是 1.0**，而 §2.2 控制台聚合日志里是 `[None, 1.0]`（Record 2 当时没有 reward）。落库却显示 1.0，说明这份数据已经是 **`reversed()` 把最终 reward 往前轮回传之后**的结果——系列05 §2.6「reward 跨轮传播」的落地证据。

> 顺带：`9099577.916666 → 9099577.92` 说明收尾轮是**重写**了被 `-100` mask 的工具输出（做了四舍五入），不是背出来的；`np.isclose(rtol=1e-5)` 下相对误差约 3.6e-10，照判 1.0。

### 3.5 数据全生命周期串讲：从 jsonl 到 version_n（七个阶段）✅

把前面散落的环节连成一条线——一条数据从 `data_gsmhard.jsonl` 出发，到变成 `models/version_2`，中间经过**七次形态转换**。用本次 A100 实跑的真实数字（§2.2）+ `ro-fa5b7bd5115a` 那两条记录（§3.4）当标本：

```
[1] jsonl 原始数据         {input, target} ×64
        │  agent rollout（4 runner，vLLM serve version_n）
        ▼
[2] OTel spans → store     每次 LLM 调用一个 span + grader 一个 reward span
        │  adapter: TraceToTriplet（reversed() 回传 reward）
        ▼
[3] 中间结构 triplet        {prompt, response, reward} ×134（iter0）
        │  reward>0 过滤 → 80 条
        ▼
[4] token 化 + mask         {input_ids, labels(-100), attention_mask, reward}
        │  SFTTrainer：6 epoch / 60 step / batch 8，只 response 段算 CE loss
        ▼
[5] 梯度更新（只动 LoRA 1.62%）  train_loss 0.0151
        │  save_pretrained_merged（LoRA 合并回基座，16bit）
        ▼
[6] checkpoint             models/version_1
        │  当下一轮 rollout 基座
        ▼
[7] 版本飞轮               version_1 →（再跑一轮，留用 80→86）→ version_2
```

**[1] 初始数据：只有「题目 + 评分钥匙」**——`data_gsmhard.jsonl` 64 条 `{input, target}`（`code` 是死字段，系列05 §2.4）。此刻**还没有任何「模型该输出什么」的标签**：SFT 要模仿的 response 这时根本不存在，靠后面 rollout 造（系列05 §一）。

**[2] agent 运行 → 存储：rollout 产 span，写进 store**——4 个 runner 并发，vLLM 本地 serve 当前 `models/version_0`。每条题让模型解题（决定调 `calculate` → 拿计算器返回 → 收尾输出 `### 数字 ###`）。tracer 把**每次 LLM 调用**记成一个 OTel span；grader 用 `np.isclose(answer, target)` 判 0/1，`emit_reward` 写一个 reward span（系列02 §2.6）。全部 spans 回写 store（控制平面，系列03）。此刻数据 = 一堆扁平 span 属性，按 `rollout_id` 归组。

**[3] 转中间结构：spans → triplet（§3.4 看到的就是这步产物）**——adapter（一键模式 `TracerTraceToTriplet` / 三进程模式 proxy 侧 `LlmProxyTraceToTriplet`）把一次 rollout 的 spans 还原成 `List[Triplet]`：**每次 LLM 调用 = 一个 triplet**（A 法），`ro-fa5b7bd5115a` → 2 条。`reversed()` 把最终 reward 往前轮回传（系列05 §2.6），所以 §3.4 两条 reward 都落库成 1.0 而非 `[None, 1.0]`。实测：iter0 的 64 题 → **134 triplet**（多数题「调工具+收尾」两轮）；过 `reward > 0` 门 → **留 80 条**（§3.2 阈值过滤，非固定 50%）。

**[4] 转 token + mask：triplet → 训练张量**——每条 triplet 按系列05 §2.4 拼成四个字段。两条标本：
- Record 2：`input_ids` = 268(prompt)+61(response) = 329；`labels` = `[-100]×268 ++ 61 真 token`。
- Record 1：`input_ids` = 359+14 = 373；`labels` = `[-100]×359 ++ 14 真 token`（工具返回 `9099577.916666` 在那 359 里，被盖住）。

等式 `len(input_ids) = prompt_token_count + response_token_count`；prompt 段全 `-100`、只 response 段算 loss；`attention_mask` 全 1。`reward` 字段此时已用完（筛 top-k），**不进张量、不进 loss**。

**[5] epoch → loss：只在 response token 上算交叉熵**——配置（`unsloth_helper.py:63-76`）：`batch 2 × grad_accum 4 = 总 batch 8`，`max_steps=60`。实测对得上：**80 样本 × 6 epoch ÷ 8 = 60 步**（`max_steps` 是硬上限，80 条时恰好 = 6 epoch；iter1 的 86 条则约 5.6 epoch 就被 60 步截断）。每步：取 8 条前向，对每条**只在 `labels≠-100` 的 response token 上**算 `CrossEntropyLoss`（`-100`=`ignore_index`，prompt 段贡献 0）→ 求均值 → 反向 → 更新。只动 LoRA 适配器：可训 **66,060,288 / 4,088,528,384 = 1.62%**，基座冻结。`train_loss` iter0 = 0.0151（注意 §3.2.1：只表对自筛轨迹的拟合，不表解题能力）。

**[6] checkpoint：LoRA 合并回基座，存 16bit**——`save_pretrained_merged(..., "merged_16bit")` 把训好的 LoRA 增量**合并回基座权重**，存成完整 16bit 模型（不是只存适配器），这样下一轮 vLLM 能直接 serve。产出 `models/version_1`。

**[7] 版本飞轮：version_1 → version_2**——下一轮把 rollout 基座换成 version_1（vLLM 编译缓存命中，起得更快）。模型更强 → 答对更多 → 留用样本 **80 → 86** → 再训成 version_2（ReST 飞轮，系列05 §2.3）。`MAX_ITERATIONS=2` → 最终产物 `models/version_2`。

> 七次变身收口：**jsonl 的 `{input,target}` → spans → triplet（reward 回传 + 过滤）→ token/mask 张量 → response 段 CE loss → LoRA 合并 checkpoint → version_n+1**。其中 `target` 全程只在 [2] 喂 grader、[3] 决定 reward，**从不进 [4] 的 `input_ids`/`labels`**；模型模仿的 response 是 [2] 自产、[3] 认证、[4] 才定型的——这就是系列05「reward 造标签、不喂答案」在数据流上的完整兑现。

### 3.6 六个常见疑问：64→134、80→86 飞轮、终止条件、脊柱一致性、动态化、epoch vs max_steps ✅

**Q1：64 题为什么变 134 条？**——每次 LLM 调用 = 一个 triplet（A 法，§3.4），不是每题一条。多数题「调工具 + 收尾」两轮 → 2 条，64×2≈128；实测 134 略多，因为部分题调了不止一次计算器（多 tool_call → 多 triplet）或有重试，`134÷64≈2.09` 条/题。**134 是过滤前的全部**，过 `reward>0` 才留 80。

**Q2：80→86 怎么算飞轮？**——先分清两个数是哪一轮跑的：

| | 谁跑 rollout | 同 64 题 → triplet | `reward>0` 留下 |
|---|---|---|---|
| iter0 | `version_0`（初始） | 134 | **80** |
| iter1 | `version_1`（被 80 条训过） | 130 | **86** |

两轮跑的是**同一批 64 题、同一道门，唯一变量是「谁在跑」**。version_1 比 version_0 多留 6 条 = 把原来答错的多解对了几道。链路：`v0 跑→留 80→训出 v1→v1 更强→再跑→留 86`，即「越训越强 → 正确轨迹越多 → 可训样本越多」（ReST，系列05 §2.3）。注意总 triplet 反降（134→130，更强的模型解题更省步或采样波动），但**通过率升**（`80/134≈60%` → `86/130≈66%`）才是信号。

> **诚实边界**（呼应 §3.2.1）：80→86 是在**训练用的那 64 题**上测的、且只 +6、rollout 又是 temperature>0 采样——是「方向对」的正向信号，**不是泛化证明**。严格证明要看 holdout 的 pass@1（§3.3，未做）。

**Q3：终止条件是什么？**——两层，都是**写死的计数，不是质量判据**：

- 内层（单轮训练停在哪）：`max_steps=60`（`unsloth_helper.py`）。80 样本 ×6 epoch ÷8 batch 恰好 = 60 步；86 样本约 5.6 epoch 就被 60 步截断。
- 外层（飞轮转几圈）：`MAX_ITERATIONS=2`（`sft_algorithm.py:351`），固定两轮 `version_0→1→2` 就停。

demo **没有任何收敛 / 质量终止**（不看留用数是否还涨、不看 holdout、无 early-stopping）。真实任务该用的信号是**飞轮到顶**——`Keeping X` 连续几轮不再上升 = 模型已稳定输出它能找到的全部正确轨迹，该停 SFT；这正是系列05 §7.1「SFT 到顶 → 升 RL」的触发点。

**Q4：APO 一直强调 `litagent→runner→tracer→store→adapter→reward→algorithm` 这条脊柱，SFT 还是同一条吗？store 去哪了？**——**是同一条，store 一直在场**。SFT 讨论里少提它，只因笔墨集中在**新增的后半段**（tokenize→loss→checkpoint）；前半段和 APO 一字不差地复用了。对照 §3.5 七阶段：`[1]` 读 jsonl → `[2]` agent 跑、span 回写 **store** → `[3]` adapter 转 triplet——就是脊柱本身。store 在 demo 里两种形态：一键模式（`sft_allinone.py`）塞进同一进程、默认 `InMemoryLightningStore`；三进程模式显式 `agl store --port 4747`（§三）当控制平面。APO 与 SFT 摆在同一脊柱上**只有两处不同**：

| | adapter 出口（系列02 §2.5） | algorithm 槽位内部 |
|---|---|---|
| APO | `TraceToMessages`（看对话） | critic/edit + `sorted`，**不改权重** |
| SFT | `TraceToTriplet`（取训练样本） | tokenize→CE loss→LoRA merge，**改权重** |

`litagent→runner→tracer→store→adapter→reward` 这一段两者完全相同——正是 [[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]] §6.3 的 method-agnostic 兑现：换算法只换槽位 + adapter 出口，脊柱不动。

**Q5：两轮和 60 步都写死了，能不能让飞轮「自动转」、步数随数据走？**——能，但要分清这是**两个独立的常量**（别和 Q3 混）：外层圈数 `MAX_ITERATIONS=2`（`sft_algorithm.py:351`，覆盖入口 `sft_allinone.py:99-108`），内层步数 `max_steps=60`（`unsloth_helper.py:63-76`）。后者是**硬上限步数、不是从数据算的**：total batch=8，80 样本→60 步=6 epoch，86 样本→60 步≈5.6 epoch——**数据涨了过的遍数反缩**（6→5.6），是固定 `max_steps` 的小坑。两处分别这样改：

- **飞轮动态（替换固定两轮）**：把 `for i in range(MAX_ITERATIONS)` 换成 `while` + 平台检测，停条件用真实信号 `Keeping X`——连续几轮 Δ 小于阈值 = 饱和就停（即 Q3 说的「飞轮到顶 → 升 RL」），并加安全上限防空转。**更稳的是用 holdout 的 pass@1 不再涨来驱动停**（§3.3 有配方），因为 `Keeping X` 在训练题上量、80→86 的 +6 可能是采样噪声（§3.2.1 诚实边界），不宜单独当停机判据。
- **步数随数据 scale（替换固定 60）**：在 `unsloth_helper.py:63-76` 的 SFTConfig 里设 `num_train_epochs=N` 且 `max_steps=-1`（关掉硬上限）→ 每轮过固定遍数、步数随留用数涨（80→6 epoch=60 步，86→6 epoch≈64.5 步）；或每轮算 `max_steps = ceil(kept / total_batch) * target_epochs`。固定 epoch 若数据增长多易过拟合，配 val loss 的 early-stopping 更稳。

> 一句话：demo 把外层圈数和内层步数都写成**与数据无关的常量**，真实任务应分别换成「飞轮 kept 平台检测（最好 holdout 驱动）」和「按 epoch 自动算步数」。

**Q6：demo 的 SFTConfig 只设了 `max_steps` 没设 epoch，这两个该用哪个？日志里的小数 epoch 又是哪来的？**——unsloth 模板的 SFTConfig 把这两行写成**二选一的开关**：

```python
max_steps=60,              # 按「步数」停 —— demo 用的是这条
# num_train_epochs = 1,    # Set this for 1 full training run —— 注释掉了
```

HF Trainer 的规则是 **`max_steps > 0` 直接覆盖 `num_train_epochs`**，epoch 填了也不算数——模板干脆注释掉，那行 `# Set this for 1 full training run` 是官方留的切换提示：想改成「按整遍训练」就去掉 max_steps、解开这行。

**日志里的 `epoch 5.58` 是算出来给你看的、不是设定值**：

```
显示 epoch = 已见样本数 / N = (global_step × total_batch) / N = (60×8)/86 ≈ 5.58
```

它是个**进度比例**，真正在计数、决定停止的是整数 `global_step`（数到 60 就停）。所以 epoch 出现小数不是「该四舍五入的计数器」——它本就是 `max_steps` 倒推的连续比值；真正「整 / 丢」的取舍发生在 **batch 层**（见下）。

**单次正常训练里 epoch 是更合理的默认单位**，两个理由：

1. **对数据量自适应**：epoch=「过几遍」，换数据集不用改数字（N=80→6 epoch=60 步，N=8000→6 epoch=6000 步，意图不变）；`max_steps=60` 是绝对步数，N 一变就得重算，N 翻 100 倍时 60 步连一遍都跑不完。
2. **保证整遍、曝光均匀**：`max_steps` 可能停在「半遍」。86 条、total batch=8 → 跑完一整遍≈11 步，`60÷11≈5.45 遍`——最后 0.45 遍只有部分样本被多喂一次（取决于那次 shuffle 谁排前），是无意义的随机曝光偏差。`num_train_epochs=6`（整数）则停在整遍边界、每条恰好过 6 次。要每条都跑完，还需 `dataloader_drop_last=False`（默认值），否则 `86÷8` 余下的 6 条会被整轮丢掉。

**但 demo 选 `max_steps` 是对的**——它正踩中 `max_steps` 的三个专用场景：①算力预算固定（每圈严格等长、可预算，而飞轮每圈 kept 在变 80→86，用 epoch 则时长飘）；②数据量未知 / 流式（没 N 算不出「一遍」）；③飞轮每圈要点到为止（系列05 ReST：浅训保多样性）。demo 是「飞轮 + 每圈数据量变 + 没 holdout」三条叠加，固定小步数刚好同时满足「没信号可早停」和「故意别训深」。

**想用「loss 升了再停」（early stopping）要注意**：靠的是 **val loss 不是 train loss**。train loss 几乎一路降不回升（模型在死记这批数据，demo 的 `0.0151` 就是这么压下来的），等它回升早已过拟合；只有 holdout 上的 val loss「先降后升」，拐点才是早停时机。demo 没切 holdout（成功轨迹全喂训练，`sft_algorithm.py:291-295`），没有 val 曲线 → 早停无从触发 → 只能退回固定 `max_steps`。要换早停，前提是先切一份 holdout（§3.3 配方）。

> 一句话：epoch 是更好的「默认单位」（自适应、整遍、曝光均匀），`max_steps` 是「固定算力 / 数据量未知 / 飞轮等长」的专用工具；日志里的小数 epoch 是 `max_steps` 倒推的进度比、不是设定值；想按 loss 早停得先有 holdout 的 val loss，train loss 不回升用不了。

### 3.7 动态飞轮实验复盘：采样数才是数据增长主杠杆、holdout pass@1 才是真停止信号 ✅

把 demo 改成「reward 样本数不再创新高就停」的**动态飞轮**（`should_stop_by_reward_count`：当前轮 kept 低于历史中 ≥2 个记录就停）后实测：数据**一路缓慢上涨、跑到第六轮还在 +3/+5**，而不是头一两轮就 +10/+15 再 plateau。读完源码，复盘出两个比「调学习率」重要得多的认知。

**复盘一：单轮提升小，根因是 rollout 退化成 greedy pass@1，不是 LR。** 三处代码叠加锁死了「每轮只能一阶一阶爬」：

| 代码事实 | 位置 | 后果 |
|---|---|---|
| temperature 默认 **0.0（greedy）** | `math_agent.py:140`（`sampling_parameters` 从没设 temperature，`:185`） | 每题只产**唯一确定轨迹**，零探索 |
| 每题每轮只 **enqueue 一次** | `sft_algorithm.py:290` | 单采样，方差大、漏掉「本能做对但这次没采到」 |
| 每轮只训**本轮数据、非累积** | `all_records` 空列表重建 `:320` | 每轮 ~80 条训 3 epoch（≈30 步）= 轻推非跃升 |

greedy + 单采样 = **结构上不可能头轮大跳**：你只能收割「贪心路径自上轮翻对」的那几道题。要回到标准 RAFT/STaR 的「头轮大跳→快速到顶」曲线，**真正的杠杆是采样数（pass@k）而非 LR**：把 temperature 调>0（如 0.7~1.0）+ 每题采 k 次，「k 条里一条对就成 SFT 样本」= pass@k 收割，一次性抓住大批边界题。加大 LR 反而有 catastrophic forgetting 风险（模型被自产同质数据拽偏→下轮 rollout 变差→飞轮反转），代码注释自己都写 `Reduce to 2e-5 for long training runs`。

> 天花板的代码依据：训练集**全部来自模型自己答对的轨迹**（reward 来自 `compute_reward(自答, target)` `math_agent.py:145`→`reward>0` 过滤 `sft_algorithm.py:400`），`target` 只用来打分、**从不作 label 喂训练**（系列05「reward 造标签而非喂答案」）。所以一道题进训练集 ⟺ 它 pass@k>0；模型从不会做的题永远学不到 → **天花板 = 基座 pass@k**，k 越大越能把潜在能力榨出来。

**复盘二：「reward 样本数上涨」测不出过拟合，holdout pass@1 才是干净信号。** 这是这个动态飞轮最大的认知陷阱——`reward_sample_count` 是在**同一批训练题**上量的，它上涨和「模型记住了训练题」无法区分，**停止信号本身被训练集污染**。又因每轮在自产同质数据上反复训（数据小+重复度高），记忆风险实打实。唯一能分辨的办法是**训练宽松 / 验证严格的不对称评测**：

- **训练（收割）**：temperature>0、每题 k 采样 → pass@k，尽量多收正确轨迹；
- **holdout（验证）**：在**从不训练**的留出题上贪心单次 → **pass@1**，贴近部署的「一次解对没见过的题」；
- **判据**：harvest↑ **且** holdout pass@1↑ = 真泛化；harvest↑ **但** holdout pass@1 平/降 = 过拟合 → 停（即系列05 §7.1「SFT 到顶 → 升 RL」触发点）。

落地四步：① 在 `load_math_dataset` 切 train/holdout split（holdout 永不进训练）；② 训练侧加采样（temp>0、k 次）；③ 每轮训完在 holdout 上评 pass@1；④ 把停止判据从「reward 数 plateau」换成「holdout pass@1 plateau」。配套防过拟合：先提数据多样性（temp+pass@k）再谈 epoch、加 replay buffer 掺往轮好轨迹、去重近似轨迹、epoch 保持浅（1~3）、LR 别加。

> 一句话复盘：**数据增长的主杠杆是「每题采样数（pass@k）」不是学习率**（当前 greedy 单采样退化成 pass@1，故慢爬）；**真停止/防过拟合信号是「holdout pass@1」不是训练题上的 reward 数**（后者被污染、测不出记忆）。训练宽松（pass@k）+ 验证严格（pass@1）是这条线的标准姿势。

### 3.8 一根线：APO / SFT / RL 都用 reward 筛选，区别只在「筛什么、优化谁」✅

跑通 SFT 后回头看，会发现 agent-lightning 三条线（系列04 的 APO、本篇的 SFT、系列05 提到的 RL）共享**同一套数据哲学**：`rollout → 算 reward → 按 reward 选择/优化`，消费的都是同一个三元组 `(prompt, response, reward)`（≈ RL 的 `(s, a, r)`）。本篇这条拒绝采样 SFT 是 RAFT/STaR（`reward>0` 过滤 `sft_algorithm.py:400` + reward 排序 `:404` + while 迭代），而 **APO 同样用 reward 筛选**——只是筛的对象和"优化器"不同。

APO 的筛选就发生在 beam search 那一行（系列04 §3）：

```python
sorted_prompts = sorted(candidates, key=lambda x: x.score, reverse=True)  # apo.py:741
selected_prompts = sorted_prompts[:self.beam_width]                       # :742  取 top-k
```

`x.score` 就是 prompt 在一批验证数据上的平均 reward。`sort + [:beam_width]` = **按 reward 排序后留 top-k**，和 SFT 线的 `sort(key=reward) + filter(reward>0)` 是同一个动作。差别在于：

| 维度 | APO（系列04） | RAFT/SFT（本篇） | PPO/GRPO（系列05 RL） |
|---|---|---|---|
| rollout 产物 | 一批 `(prompt, response, reward)` | 同左 | 同左 |
| reward 来源 | `compute_reward`（同一评分函数） | `compute_reward` `math_agent.py:145` | 同左 |
| 筛选动作 | `sort(score)+[:beam_width]` `apo.py:741-742` | `sort(reward)+filter(reward>0)` `:404`/`:400` | reward 算 advantage |
| **筛选对象** | **Prompt**（留高分提示词） | **Trajectory**（留高分轨迹当训练样本） | 用全部样本（含负） |
| **怎么改进** | 高分 prompt 喂 critic 生成更好的——**改文本、冻权重** | 高分轨迹做 SFT——**改权重、不动 prompt** | 策略梯度更新权重 |
| 梯度形态 | 文本梯度（critic 自然语言批评） | 数值梯度（CE loss 反传） | 数值梯度（带 advantage + KL） |

往右走，对 reward 的利用越来越"重"：APO 只用它**排序选择**（参数冻结）、RAFT 用它**硬过滤**（只要正样本）、RL 用它**算连续权重 + 探索 + KL 约束**（正负样本都用）。但入口都是 reward——这正是为什么 agent-lightning 能用**一套 `rollout + reward` 接口同时托起 APO 和 SFT 两条线**：换算法本质只是换"拿到带 reward 的轨迹后，是去选 prompt、还是去选轨迹做梯度"。

> 一句话：三条线是「reward-filtered optimization」的同一个家族，区别只在**优化谁**（APO 优化 prompt、SFT/RL 优化 weights）和**怎么用 reward**（APO 排序、RAFT 硬过滤、RL 算 advantage）；理解了这点，系列04 的 `sorted()[:beam_width]` 和本篇的 `reward>0 + sort` 就是同一招的两种投影。

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

### 4.4 数据清洗与优化：demo 只有 `reward > 0` 一道门 ✅

跑通后容易忽略的一点：**这套 SFT 的「数据清洗」只有一道——`reward > 0.0` 阈值**（§3.2 实测日志 `Keeping X with reward greater than 0.0`）。过了这道门的轨迹**全进、一次 rollout 的两条都进、不做任何 per-record 判断**——不去重、不查表达式质量、不平衡长短、不留 holdout。

**为什么 demo 敢这么省**：

1. **拒绝采样的立场就是「reward 即清洗」**——RAFT/STaR 的论点是好 reward 替代人工 curation，你不手动挑数据，让 reward 当唯一筛子（系列05 §一）。
2. **整条成功轨迹一起进是 A 法的内在要求**——只留 tool_call 轮、扔掉收尾轮，会破坏 ① 轨迹连贯（学会调工具却学不会终止 / 套 `###` 格式）；② `reversed()` 的 reward 回传（per-turn triplet 是其前提，系列05 §2.6）。
3. **GSM-hard 的 grader 零噪声**——二值精确匹配，`reward > 0` 是强过滤，过门即保证最终答案对。

**但 `reward > 0` 抓不住的，正是「没优化没清洗」的代价**：

| 漏掉的 | 后果 |
|--------|------|
| **outcome-only 假阳性**（系列05 §1.2） | 答案对、但表达式绕弯 / 凑巧对 / 补偿性错误 → 照样进训练，强化坏过程 |
| **长短不均**（系列05 §2.6） | 每 rollout 2 条，收尾 trivial 记录占训练槽；长答案轮淹没短 tool_call 轮 |
| **重复轨迹** | 简单题被同套解法解对多次 → 过采样，分布带偏 |

**换到你自己的任务（reward 一旦变弱就必须补的清洗层）**：demo 能省全靠 grader 干净；一旦换成 LLM-judge / 主观分，`reward > 0` 远不够，假阳性会灌进来。要补：

1. **更紧的阈值**——`reward == max` 或 top 分位（连续 reward 时），而非只 `> 0`。
2. **过程 / 质量过滤**——查表达式合理性、惩罚过长、去重；要真正对齐「过程」而非只看「结果」，得上 process reward / PRM（属系列07 RL 那条线，系列05 §7.1 把「对齐过程不只结果」列为该升 RL 的触发条件）。
3. **去重 / 多样性采样**——别让简单题过采样。
4. **长短再平衡**——A 法天然上采样长轨迹，需要时归一。
5. **holdout split**——别把数据全训了，否则没法评 pass@1（§3.3 的坑）。

> 一句话：**框架给的是骨架（rollout 编排 + 那道 reward 门），数据治理得自己补**（呼应系列04 §四）。demo 用「reward 即清洗」演示最小闭环，它成立的全部前提是 GSM-hard 那个零噪声二值 grader；真实任务大概率没这么干净，「优化和清洗」就从可选项变成决定 SFT 成败的主战场。

### 4.5 改造检查清单

| 改什么 | 文件:位置 | 注意 |
|--------|----------|------|
| 数据结构 + 加载 | `math_agent.py` `GsmProblem` / `load_math_dataset` | input 喂模型、target 只喂 grader |
| grader | `math_agent.py` `compute_reward` | 可验证优先；加阈值过滤 |
| agent 逻辑 + 工具 | `math_agent.py` `math_agent` | 工具契约定稳再 SFT |
| 数据清洗 | `sft_algorithm.py:291-295` 筛选逻辑 | demo 只有 `reward>0`；真实任务补阈值收紧 / 去重 / 过程过滤（§4.4） |
| 评测 holdout | 自搭（§3.3） | 留出没训过的题，否则 pass@1 虚高 |
| 基座模型 | `sft_algorithm.py:358` / `hf download` | 换成你要微调的模型 |
| 迭代/超参 | `sft_allinone.py:99-108`、`unsloth_helper.py:63-76` | max_iterations / lr / max_steps 等 |

> 这一节本质就是 [[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]] §六的「四步插槽」在 SFT 上的具象，也是系列08「套到真实 Agent」的预演。

---

## 五、小结

1. **平台硬约束**：agent-lightning 官方只支持 Linux（Ubuntu 22.04+），SFT 例子要 ≥16GB NVIDIA GPU；macOS 跑不了训练，只能装 base 包消 IDE 红线。
2. **环境搭建关键序列**：先装 cu128 的 torch（锁 CUDA ABI）→ vllm → unsloth 栈 → agent 侧 → agentlightning → 隐藏依赖 `huggingface_hub`（`hf`）+ `uv`（`uvx`）。
3. **两个最容易漏的前置**：`hf download unsloth/Qwen3-4B-Instruct-2507 --local-dir models/version_0`（不下会直接报路径不存在）；`uvx` 装好（math_agent 用它起计算器）。
4. **三种跑法**：`math_agent.py` dry-run 验证接线 → `sft_allinone.py` 一键 → `agl store` + runners + algorithm 三进程（调试/分布式）。
5. **改造只动三零件**：数据集（input+target）、grader（reward 设计是真瓶颈，建议加阈值过滤）、agent 逻辑——框架管道一行不改。
6. **实测要点**：A100 80GB 上一键跑通两轮自提升，约 9.5 分钟；留用样本 **80→86**（飞轮转动的直接证据）；train_loss 0.0151→0.0069 只表拟合不表能力；**最关键的实测订正**——本版 demo 的筛选是 `reward > 0` 阈值过滤（日志 `Keeping X with reward greater than 0.0`），不是早先读源码推断的「固定切 50%」。
7. **数据治理是真实任务的主战场**：落库 triplet 的 display 字段对 tool_call 轮有损（要看 token_ids，§3.4）；demo 的清洗只有 `reward>0` 一道门，能成立全靠 GSM-hard 零噪声 grader；真实任务要补阈值收紧、去重、过程过滤 / PRM、holdout split——框架给骨架，数据治理自己补（§4.4）。
8. **仍待补**：v0/v1/v2 在 holdout 上的 pass@1 / pass@8（demo 无内置评测，需用 vLLM serve + math_agent 自搭，且必须用没训过的题）。

> 相关：[[Agent Lightning系列05：SFT路线剖析——reward不喂答案而造标签、拒绝采样微调与自蒸馏真相]]（本篇的原理底座）、[[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]]（脊柱与四步插槽）、[[Agent Lightning系列03：自定义算法与Trainer集成——5个store动作、生产者消费者与一键运行]]（生产者/消费者、一键 vs 三进程）、[[Agent Lightning系列04：APO源码剖析——算法=LLM调用+sorted、虚拟多agent真相与核心使用场景]]、[[Agent Lightning系列01：用APO做Prompt Tuning——Azure实践与beam search算法解析]]
