---
title: Agent Lightning 系列 08：RL 实战篇——example 选型、calc_x 跑通 VERL 训练与 tinker 等框架
created: 2026-06-30
tags: [agent-lightning, reinforcement-learning, VERL, calc_x, GRPO, hands-on, azure, gpu, cuda, vllm, rollout, ray, tinker, example-selection, practice]
---

# Agent Lightning 系列 08：RL 实战篇——example 选型、calc_x 跑通 VERL 训练与 tinker 等框架

> [[Agent Lightning系列07：强化学习与VERL入门——RL基础、三大框架架构对比与agent-lightning的选型逻辑]] 把 RL 这一级的**理论与选型逻辑**讲透了：RL 与 SFT 的本质差异、VERL 是什么、为什么 agent-lightning 绑定 VERL。本篇是它的**实战配套**——真正在 GPU 上把仓库里的 RL 例子跑起来。
>
> 阶梯 APO → SFT → RL 走到最后一级：APO 见系列 01～04，SFT 实战见 [[Agent Lightning系列06：SFT实战篇——从Azure GPU VM到跑通unsloth拒绝采样微调]]，本篇接 RL 实战。
>
> **本篇是「边跑边写」的活文档**：✅ 标记已验证可执行的内容，⏳ 标记等真实运行结果回填的占位。后续对不同 example 的选择与对比、新训练框架（如 tinker）的实践，都持续并入本文。

---

## 〇、本篇定位与覆盖范围

agent-lightning 仓库里跟 RL 相关的 example 不止一个，训练后端也不止 VERL 一家。本篇要解决的是从「理论懂了」到「真的跑起来」之间的全部工程问题，并且做成一份可持续扩展的实战地图：

1. **example 选型**——仓库里有哪些 RL 例子，差异在哪，第一个该跑哪个（§一）；
2. **承接关系**——RL 的 calc_x 和系列 06 跑过的 SFT 例子 unsloth 是什么关系（§二）；
3. **环境与硬件**——复用哪台 VM、为什么要独立环境、依赖差异（§三）；
4. **运行手册**——calc_x 从装依赖到跑通完整训练的分步 runbook（§四）；
5. **配置剖析**——calc_x 默认用的算法与超参（§五）；
6. **实测记录**——真实运行的指标与踩坑，持续回填（§六）；
7. **其他 example 与框架**——spider / chartqa 差异、tinker 等新后端，持续扩展（§七）。

---

## 一、example 选型：仓库里有哪些 RL 例子

agent-lightning 的 `examples/` 目录下，**真正用 VERL 跑权重微调的 RL 例子有 3 个**，外加一个走不同训练后端的 tinker：

| 例子 | 任务 | Agent 框架 | 训练后端 | 依赖/难度 | GPU |
|------|------|-----------|---------|----------|-----|
| **calc_x** | 数学推理（调计算器） | AutoGen + MCP | VERL | 最轻，最经典的 VERL RL 入门例，有 debug/`--ci-fast` 模式 | 1×40GB |
| **spider** | Text-to-SQL | LangGraph + LangChain | VERL | 中等，依赖 langchain 全家桶，模型小（Qwen2.5-Coder-1.5B） | 1×40GB |
| **chartqa** | 图表视觉问答（多模态） | LangGraph | VERL | 最重，锁死 vLLM 0.10.2，易踩 flash-attn/CUDA 坑，多步自我修正 | 1×40GB |
| **tinker** | RL（通用） | — | **Tinker 托管服务** | 后端不同，不需本地 GPU，但要 Tinker 服务访问权限 | 无需本地 GPU |

> 注意区分：tinker 不是 VERL 路线。它把训练委托给 Tinker 这个托管训练服务，对应系列 07 §六提到的「替代方案」思路里偏 serving / 托管的一支。本系列先把 VERL 主线（calc_x）跑通，tinker 留到 §七单独展开。

### 1.1 为什么第一个跑 calc_x

三个 VERL 例子都至少要 1 张 40GB GPU，选 calc_x 作为首跑的理由：

- **最经典最轻**：AutoGen + MCP 计算器 + VERL，依赖面最小，是 VERL RL 的标准入门例；
- **有冒烟模式**：`--ci-fast` 可只跑 1 step、`calc_agent.py` 可纯 debug，便于分阶段验证，不必一上来就赌完整训练；
- **承接 SFT**：和系列 06 跑过的 unsloth 同属「数学 + 计算器」任务域，心智模型直接迁移（详见 §二）；
- **契合系列 07 计划**：系列 07 末尾的「系列 08：在 GPU 环境真正跑通一次 RL 权重微调」正是 calc_x 这一跑。

---

## 二、calc_x 与 unsloth（SFT）的承接关系

系列 06 跑通的 SFT 例子是 `examples/unsloth`（GSM-hard 数学数据集 + OpenAI Agents SDK + MCP 计算器 + LoRA/4bit 拒绝采样）。一个自然的问题：RL 的 calc_x 和它是承接关系吗？

**结论：路线/概念上是，而且是最自然的承接；代码/数据上不是 turnkey 串联。** 拆开讲：

### 2.1 同一条优化阶梯的相邻两级

系列 02/05/07 反复讲的阶梯是 **APO → SFT → RL**：

- `unsloth` = **SFT 那一级**（系列 06 已跑通，fork 里留有 `sft_data_iter0~5`）；
- `calc_x` = **RL 那一级**（VERL）。

往上爬一级，概念上完美衔接。

### 2.2 同一个任务域（数学 + MCP 计算器）

这是 calc_x 比 spider/chartqa 更「承接」的根本原因——任务结构和 reward 逻辑几乎一样，最适合做「同一任务上 SFT 和 RL 差在哪」的对比：

| 维度 | unsloth（系列 06 的 SFT） | calc_x（本篇的 RL） |
|------|------|------|
| 任务 | GSM-hard 数学题 | Calc-X 数学题 |
| 工具 | MCP 计算器 | MCP 计算器 |
| reward | 数学答案对不对 | 数学答案对不对 |
| Agent 框架 | OpenAI Agents SDK | **AutoGen** |
| 训练后端 | 无 VERL，16GB | **VERL + Ray，40GB** |
| 算法 | SFT（拒绝采样 + LoRA） | RL（GRPO 改权重） |

### 2.3 默认不是直接串联：三处断点

- **Agent 框架换了**：OpenAI Agents SDK → AutoGen；
- **数据集换了**：GSM-hard → Calc-X（都是数学，但不同文件）；
- **默认 calc_x 从基座 Instruct 模型起步**（`Qwen/Qwen2.5-1.5B-Instruct`），不吃 unsloth 产出的 LoRA。

### 2.4 进阶：真正的技术串联（SFT → RL 冷启动同一 checkpoint）

如果要把两级真正串起来，就是系列 07 §2.2 讲的冷启动配置：把 unsloth 的 LoRA merge 进基座 → 设成 calc_x 的初始 policy。`train_calc_agent.py` 的 `train()` 入参里预留了一组 LoRA 钩子（`lora` / `lora_rank` / `lora_adapter_path`）——但要注意**这组参数其实身兼两职，别混为一谈**：

- **`lora` / `lora_rank`——RL 自己省显存的训练方式开关**（与 SFT 无关）：VERL 的 actor 既能全参微调，也能只训一个低秩 adapter。`lora=True` 让 GRPO 的策略更新只作用在 LoRA adapter 上、冻结 base 权重。1.5B 全参在 80GB 上够跑，但更大模型（7B/14B）只训 LoRA 能大幅省显存与优化器状态。
- **`lora_adapter_path`——承接 SFT 产物的冷启动入口**：它让 RL **加载一个已训好的 LoRA adapter 当初始 policy**，正是把 SFT 的产出接进来的钩子（`unsloth 的 LoRA adapter → lora_adapter_path → calc_x 以它为起点接着 GRPO`）。比从裸 Instruct 基座起步收敛更快更稳。
- **`--model`——与上者分工**：`--model` 是换**整个 base 模型**（HF id 或已 merge 好的全参 checkpoint 路径）；`lora_adapter_path` 是 base 不变、**叠一个 adapter** 上去。两条路对应两种串联：要么把 SFT 的 LoRA `merge` 进 base 再用 `--model` 指过去，要么不 merge、直接 `lora_adapter_path` 挂上。

这是进阶玩法、手动配置，不是默认；且 unsloth 出的是 LoRA adapter，走 `--model` 那条需先 merge。本篇主线先走默认（三个都不传，`lora=False`，从裸 `Qwen2.5-1.5B-Instruct` 全参起步），冷启动串联留作后续实验（⏳ 待补）。

---

## 三、环境与硬件

### 3.1 复用系列 06 的 A100 80GB VM

calc_x/VERL 要求至少 1 张 40GB GPU。系列 06 实测用的那台 `agent-lighting-vm` 是 **A100 80GB PCIe**——对 1.5B 模型 + VERL 绰绰有余，直接复用，无需新开机器。

### 3.2 第一原则：别污染 unsloth 那套环境

SFT 的 venv 里有 `unsloth/bitsandbytes/trl`，calc_x 要装 `verl`，两者依赖会打架。**务必新建独立 venv**，这是避免「装完跑起来 CUDA error / 依赖冲突」的关键。

### 3.3 依赖差异：已有的 vs 需加的

系列 06 那台 VM 已装好 `torch 2.8.0+cu128` 和 `vllm 0.10.2`，calc_x 在新 venv 里主要**需要补**：

- `flash-attn`（VERL 要）
- `verl==0.5.0`（RL 后端）
- `autogen-agentchat` / `autogen-ext[openai]` / `mcp>=1.10.0`（calc_x 例子专属）
- `uv`（`uvx` 起 mcp-server-calculator 用）
- `agentlightning` 本身：在新 venv 里走 **fork 源码 editable 安装**（`pip install -e .`），**不从 PyPI 装**——需要 0.3.1，而 PyPI 最新只有 0.3.0

---

## 四、运行手册（calc_x runbook）

> 在 `agent-lighting-vm`（A100 80GB）上按顺序执行。每步标注了基于源码和系列 06 经验预判的坑。✅ 表示步骤已对照源码确认可执行，⏳ 表示等实测回填结果。

> **执行原则（重要，实测教训）**：**不要用 `pip install verl vllm ...` 手工拼环境**。手工 pip 会让 resolver 把 `cupy`/`opencv-python-headless`/`numpy` 解析到更新版本，与 `verl` 锁定的版本冲突（典型现象：`pip install ray[cgraph]` 拉入 CuPy → `cupy-cuda12x` → `numpy>=2`，连锁炸链）。这个例子最稳的方式是 **「CI 复现模式」**：以 repo 根目录的 `uv.lock` + 官方 CI workflow 的 dependency groups 为**唯一事实来源**，用 `uv sync --frozen` 复现环境——`--frozen` 只按 lockfile 已解析好的版本装，不让 resolver 重新解析/升级。

### 步骤 0 — 从干净环境开始（不沿用被污染的 venv）✅

```bash
cd ~/agent-lightning            # fork 的 clone 路径，按实际改
# 先备份当前 freeze，便于回滚/对比
python -m pip freeze > requirements-before-clean.txt 2>/dev/null || true
# 删除旧环境，避免 pip 残留包继续污染依赖解析
rm -rf .venv .venv-calcx
```

> **避开 `azureml_py38` 之类的 base 环境**：agent-lightning 官方要求 **Python 3.10+**（CI 矩阵用 3.10/3.12/3.13），Python 3.8 不行。推荐对齐 stable CI 路线用 **Python 3.12**。

### 步骤 1 — uv sync --frozen 复现 CI 环境 ✅

命令来自 `.github/workflows/examples-calc-x.yml`（CI 对 Calc-X 的 dependency sync）。stable 路线（Python 3.12）：

```bash
cd ~/agent-lightning
python -m pip install -U uv          # 机器没有 uv 才需要
uv python install 3.12               # 对齐 stable CI

# 用 lockfile 冻结安装，不让 resolver 自己升级
uv sync --python 3.12 --frozen --no-default-groups --extra verl \
    --group dev \
    --group experiment \
    --group agents \
    --group torch-gpu-stable

source .venv/bin/activate
# 防止后续 uv run 自动重 sync 破坏冻结
export UV_LOCKED=1
export UV_NO_SYNC=1
```

这条命令一次性把全部依赖按 `uv.lock` 锁定版本装齐——**手工 pip 装的那些全可删**，因为：

- `--extra verl` + `--group torch-gpu-stable`：torch（stable + cu128 子组）、`flash-attn>=2.8.3`、`tensordict`、`verl`、vllm 全由 lockfile 锁定；
- `--group agents`：含 `autogen` 子组（autogen-agentchat / autogen-ext[openai] / mcp），calc_x 专属依赖已覆盖，不用单独 pip 装；
- `--group experiment`：含 `gdown`（下数据用）、`random-word`；
- `agentlightning` 本体：`uv sync` 直接从 repo 源码装（即本仓库 0.3.1），自然满足「要 0.3.1 而 PyPI 只有 0.3.0」——无需再 `pip install -e .` 或从 PyPI 升级。

> **legacy / latest 路线**：CI 里 Python 3.10=legacy（`--group torch-gpu-legacy`）、3.13=latest（仍用 `torch-gpu-stable`）。除非要复现特定矩阵，默认走上面的 3.12 stable。

验证：

```bash
python -c "import torch, verl, agentlightning; print(agentlightning.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0))"
# 期望：0.3.1 True <GPU 型号>
```

### 步骤 2 — 数据集 + MCP 计算器 ✅

> **本 fork 已内置数据（克隆即用）**：上游 README 仍写「去 Google Drive 下载」，但本 fork（`huqianghui/agent-lightning`）已把 `calc-x-data.zip` 和解压后的 `data/` 一并提交进 `examples/calc_x/`，**克隆下来直接就有 `data/train.parquet`/`test.parquet`，无需再下载**。下面的 gdown/unzip 仅作「upstream 全新克隆」或「data/ 被误删需恢复」时的路径保留。fork 的 calc_x README 的 Dataset 段也已相应改为「数据已随示例提供」。
>
> 已确认 `data/` 平铺布局（无嵌套）：`train.parquet`(1.79 MB) / `test.parquet`(109 KB) / **`test_mini.parquet`(8.5 KB，迷你集，适合 `--ci-fast` 冒烟)**。

**README 官方写法 vs headless VM 写法（恢复路径）**：calc_x 上游 README 的「Dataset」一节只写了「从 Google Drive 链接手动下载 `calc-x-data.zip` → `unzip calc-x-data.zip -d data`」——它假设你在有浏览器的机器上点链接下。在**无浏览器的 A100 VM** 上，用 `gdown`（README 没写但等价，file id 就是 README 那个 Drive 链接里的 id）。`gdown` 已由步骤 1 的 `experiment` 组装好：

```bash
cd examples/calc_x
# 用 .venv 里的 python -m gdown（不依赖 gdown CLI 是否在 PATH），传裸 file id：
/home/azureuser/agent-lightning/.venv/bin/python -m gdown 1FQMyKLLd6hP9dw9rfZn1EZOWNvKaDsqw -O calc-x-data.zip
unzip calc-x-data.zip -d data
ls data/    # 应看到 train.parquet / test.parquet
```

> **实测坑 1：`gdown` CLI 不在系统 python**。系统 python 没装 gdown，但仓库 `.venv`（uv sync 的 `experiment` 组）里有。**用 `.venv/bin/python -m gdown` 跑**最稳——`python -m gdown` 走 `__main__` 入口，不依赖 `gdown` 命令是否在 PATH。
>
> **实测坑 2：这个 build 的 gdown CLI 不认 `--fuzzy`**（usage 里没有该参数，传了报 `unrecognized arguments: --fuzzy`）。`--fuzzy` 只在「丢完整 Drive URL、要 gdown 从 URL 抠 file id」时才需要；**直接传裸 file id 就不需要 fuzzy**（如上）。真要从完整 URL 走 fuzzy，用 Python API（API 支持 `fuzzy=`，CLI 不支持）：
>
> ```bash
> /home/azureuser/agent-lightning/.venv/bin/python -c "import gdown; gdown.download(url='https://drive.google.com/file/d/1FQMyKLLd6hP9dw9rfZn1EZOWNvKaDsqw/view?usp=sharing', output='calc-x-data.zip', quiet=False, fuzzy=True)"
> ```
>
> **最终兜底**：Drive 配额/确认页持续失败，就本地浏览器下载后 `scp` 到 VM。

验证 MCP 计算器（系列 06 踩过 `uvx`/`uv` 的坑）：

```bash
uvx mcp-server-calculator --help    # 预热拉包，避免训练时首次拉包卡住
python tests/test_mcp_calculator.py
```

> **绝对不要再执行这些**（手工拼环境的典型炸点）：`pip install verl` / `pip install vllm` / `pip install ray[cgraph]` / `pip install -U opencv-python-headless` / `pip install -U cupy-cuda12x` / `pip install -U numpy`。尤其 `ray[cgraph]` 的 cgraph extra 会拉入 CuPy，连带把 numpy 顶到 >=2，与 verl 锁定版本冲突。要装的都在上面的 dependency groups 里，按组走。

### 步骤 3 — debug 跑通 agent（不上 GPU 训练）✅

**`calc_agent.py` 是什么**：它是 Calc-X 例子里真正的 **rollout 逻辑本体**——训练时每个 runner 最终执行的就是 `calc_agent(task, llm)`：接一道数学题 → 调 LLM → 由 LLM 自行决定是否调用 MCP 计算器 → 按答案与 ground truth 算 reward。理解这点很关键：系列 07 说的「rollout 占 80~90% 时间」，占的就是这段逻辑的反复执行。

**debug 模式（`python calc_agent.py`）≠ 训练**：它**不起** VERL / Ray / GPU 训练循环，只在本地构造两道简单题，单跑这条「AutoGen + LLM + MCP 计算器」rollout 链路，验证它本身通不通。所以这步是「先把 rollout 单元验通，再交给步骤 4 的 VERL 去大规模跑」的分阶段验证。

> **别被 `legacy_*` 文件带偏**：calc_x 目录里另有 `legacy_calc_agent.py` / `legacy_calc_agent_debug.py` / `legacy_train.sh` 三个文件，它们是 **Agent Lightning v0.1 旧 API**（`LitAgent` + `training_rollout_async` + `fit_v0`）的实现，主要供 CI 做旧 API 回归测试；且 legacy debug 还硬读 `OPENAI_BASE_URL`、**没有**新版 `calc_agent.py` 的 Azure OpenAI 兼容逻辑。本篇走 v0.2+ 主流程（`calc_agent.py` + `train_calc_agent.py`），这三个 legacy 文件**完全跳过**——除非专门要验证 v0.1 兼容性。

先验证这条链路通。README 给了两套环境变量，按后端二选一：

```bash
# 方式 A：OpenAI 兼容端点
export OPENAI_API_KEY=<你的key>
export OPENAI_API_BASE=<你的endpoint>     # OPENAI_API_BASE 或 OPENAI_BASE_URL 都认
export OPENAI_MODEL=<可选，模型名>

# 方式 B：Azure OpenAI（本次实测走这条）
export AZURE_OPENAI_ENDPOINT=<你的Azure端点>
export AZURE_OPENAI_API_KEY=<你的key>
export AZURE_OPENAI_API_VERSION=<API版本>   # 或 OPENAI_API_VERSION
export AZURE_OPENAI_DEPLOYMENT=<部署名>

python calc_agent.py
```

> **坑**：README 明说「环境没配好会无限 hang」。若卡住，多半是 MCP 计算器没起来（回步骤 2）或端点不通。

### 步骤 4 — 起 Ray + 冒烟训练（1 step）✅

> **Ray 在这里干什么**：Ray 是个通用分布式计算框架（pip 包 `ray==2.55.1`），运行时是常驻 daemon——`ray start --head` 起一个 head 节点（GCS 控制存储 + dashboard + raylet 调度器），和训练脚本是两个独立进程；`train_calc_agent.py` 启动时自动连上这个本地集群。**所以必须先起 Ray、再跑训练**。它正是系列 07 讲的 **rollout/training 解耦**的执行底座：把 `n_runners=10` 个 rollout runner（跑 `calc_agent` + vLLM）和 FSDP training worker（GRPO 更新）都调度成 Ray actor，并在两者间搬数据（轨迹/reward ↔ 新权重）。
>
> **单机无需跨机配置**：本例单机单卡，`ray start --head` 起的是 localhost 单节点「集群」，分布式通信全在本机进程间走共享内存/本地 TCP，不用配 head/worker 地址或端口。`--dashboard-host=0.0.0.0` 只是把 dashboard 暴露给 VM 外浏览器看。
>
> **为什么叫 `restart_ray.sh` 不是 start**：脚本先 `ray stop --force --grace-period 60` 杀残留 Ray 进程（RL 跑完常留僵尸 actor 占着 GPU 显存）→ `ps aux` 确认停干净 → `env RAY_DEBUG=legacy HYDRA_FULL_ERROR=1 VLLM_USE_V1=1 ray start --head` 起全新 head。三个环境变量分别是：vLLM v1 引擎、让 VERL 的 Hydra 配置报完整栈、旧版调试器。每次跑前清旧状态、释放显存。
>
> **边界（重要，别混淆两种「smoke」）**：Ray 只在**训练阶段**需要。步骤 3 的 `python calc_agent.py` debug 是纯本地 rollout 链路验证，**不需要 Ray**；从本步起，任何 `train_calc_agent.py`（哪怕 `--ci-fast` 只 1 step）都真走 VERL 训练，**必须先 `restart_ray.sh` 起 Ray**。

先解决 wandb（默认 logger 含 wandb，没配会卡）：

```bash
export WANDB_MODE=disabled        # 不用 wandb；想用则 export WANDB_API_KEY=xxx
```

起 Ray，再跑 `--ci-fast`（只 1 step，验证全链路）：

```bash
bash ../../scripts/restart_ray.sh
python train_calc_agent.py --ci-fast --train-file data/train.parquet --val-file data/test.parquet
```

这步过了，说明 **VERL → vLLM rollout → MCP 工具调用 → GRPO 更新** 整条链路通。

### 步骤 5 — 完整训练（2 epochs）⏳

```bash
python train_calc_agent.py --train-file data/train.parquet --val-file data/test.parquet 2>&1 | tee calcx_run.log
```

盯这几个指标（正好实测验证系列 07 §5.3 的健康判断点）：

- **`val_before_train` 的初始 accuracy**（RL 前的基线）；
- **reward 曲线**是否上升、是否发散；
- **GPU 利用率**（rollout / training 是否互相空转）；
- **rollout 吞吐**（系列 07 说 rollout 占 80~90% 时间，实测看是不是）。

---

## 五、calc_x 配置剖析

从 `train_calc_agent.py` 的 `verl_default_config()` 读出的默认配置，理解它正好印证系列 07 的若干结论：

| 配置项 | 值 | 说明 / 与系列 07 的呼应 |
|--------|-----|------|
| `algorithm.adv_estimator` | `grpo` | GRPO，无 critic、无 KL（系列 07 §1.3：GRPO 用组内相对优势省显存） |
| `actor_rollout_ref.rollout.n` | 4 | 每个 prompt 采 4 个样本组成 GRPO 组 |
| `data.train_batch_size` | 32 | |
| `data.max_prompt_length` / `max_response_length` | 4096 / 2048 | |
| `rollout.gpu_memory_utilization` | 0.6 | vLLM 显存占比 |
| `rollout.tool_call_parser` | `hermes` | 解析模型发出的 function-call（计算器工具用，与系列 06 同款 hermes） |
| `actor.optim.lr` | 1e-6 | |
| `actor.fsdp_config` | param + optimizer offload | 省显存（系列 07 §5.3 谈到的显存管理） |
| `model.path` | `Qwen/Qwen2.5-1.5B-Instruct` | 默认基座，1.5B，80GB 上很宽裕 |
| `trainer.n_gpus_per_node` | 1 | 单卡 |
| `trainer.val_before_train` | True | 训练前先评一次，拿到 RL 基线 |
| `trainer.total_epochs` | 2 | |
| `n_runners`（CLI 默认） | 10 | rollout 并行 runner 数 |

CLI 关键开关：`--ci`（minimal，20 step）、`--ci-fast`（1 step 冒烟）、`--model`（覆盖基座）、`--lora`/`--lora-adapter-path`（冷启动串联 SFT 的钩子）、`--llm-proxy`（tracing）。

> **`--ci` / `--ci-fast` 是布尔开关，不跟数字（易踩的坑）**：两者都是 argparse 的 `action="store_true"`，写上即 `True`、不写即 `False`，**后面不能跟也不需要跟数字**（写 `--ci-fast 1` 会被当多余位置参数报错）。「20 step / 1 step」是**代码内置写死**的：`if ci or ci_fast` 分支里设 `total_epochs=1` + `total_training_steps=20`，`--ci-fast` 再隐含 `--ci` 并把 step 上限砍到 1。三档对照——不传任何开关＝`total_epochs=2` 跑满（完整训练）；`--ci`＝20 step；`--ci-fast`＝1 step 冒烟。真正跟值的是 `--train-file`/`--val-file`（parquet 路径）、`--model`（HF id/路径）、`--n-runners`（默认 10）这类 `type=str/int` 的参数。

### 5.1 运行时架构：配置从哪来、actor 怎么拉起、请求怎么流转

跑 calc_x 时只手动做了两件事——`bash scripts/restart_ray.sh` 起 Ray head、`python train_calc_agent.py` 起训练。但日志里冒出 vLLM、LiteLLM、rollout runner、training worker 一堆 actor，代码里却看不到显式启动。**它们都是 `train_calc_agent.py` 之后由 Agent Lightning + VERL 自动拉起的**。这一节把链路接起来，作为后面 debug 的地图。

**先厘清 `restart_ray.sh` 的角色**：它只启动 Ray head，并把 `RAY_DEBUG=legacy HYDRA_FULL_ERROR=1 VLLM_USE_V1=1` 注入 Ray 进程环境——**它不配置模型，也不直接启动 vLLM / LiteLLM**。模型、vLLM rollout、LiteLLM proxy 全部由训练脚本交给 VERL（Hydra 配置）后自动创建。

**① 配置在哪里（带锚点）**：

| 配置项 | 位置 | 值 |
|--------|------|-----|
| vLLM backend 开关 | `train_calc_agent.py:55` | `actor_rollout_ref.rollout.name = "vllm"` |
| vLLM tool-call 解析 | `train_calc_agent.py:64` | hermes |
| 默认模型 | `train_calc_agent.py:89` | `Qwen/Qwen2.5-1.5B-Instruct` |
| 模型 CLI 覆盖 | `train_calc_agent.py:263` | `--model` |
| LiteLLM proxy 本体 | `llm_proxy.py:1007` | `LLMProxy`（**不是 calc_x 手写启动的**） |
| vLLM 地址注册进 LiteLLM | `daemon.py:457` | `AgentModeDaemon` 把 vLLM server 地址注册成 model list |
| LiteLLM backend 名 | `daemon.py:463` | `hosted_vllm/<model>` |
| 给 agent 用的 LLM resource | `daemon.py:519` | runner 从 store 拿到的 `main_llm` |

> **LiteLLM 不是你启动的 actor**，是 OpenAI-compatible 请求路径里的客户端/代理库。日志里 `model=hosted_vllm/Qwen/Qwen2.5-1.5B-Instruct` + `Cannot connect to host 10.0.0.4:<port>` 就是这条映射：`agent → LiteLLM proxy → hosted_vllm/Qwen/... → vLLM backend http://10.0.0.4:<port>/v1/`。

**② 训练流程（完整链路）**：

```
restart_ray.sh
  └─ ray start --head                       # 只起 head，注入 VLLM_USE_V1=1 等环境

train_calc_agent.py
  ├─ load train/val parquet
  ├─ build VERL config（verl_default_config()）
  ├─ agl.VERL(config)
  └─ agl.Trainer(...).fit(calc_agent, ...)

Trainer
  ├─ 默认 ClientServerExecutionStrategy
  ├─ 启动 LightningStore server
  ├─ 启动 n_runners 个 runner 进程
  └─ algorithm 侧运行 VERL.run()

VERL.run()
  ├─ agentlightning.verl.entrypoint.run_ppo()
  ├─ Ray TaskRunner actor
  ├─ VERL Ray workers: ActorRolloutRefWorker / CriticWorker
  └─ vLLM async rollout server            # ← 日志里的 vLLMHttpServer

AgentLightningTrainer.fit()
  ├─ AgentModeDaemon.start()
  ├─ set_up_data_and_server(..., async_rollout_manager.server_addresses)  # daemon.py:590
  ├─ LiteLLM LLMProxy 注册 vLLM backend   # daemon.py:457/463
  └─ store 里 enqueue rollouts + main_llm resource

Runner
  ├─ 拉取 rollout
  ├─ 执行 @agl.rollout 的 calc_agent()    # calc_agent.py:105
  ├─ AutoGen OpenAIChatCompletionClient 请求 llm.endpoint  # calc_agent.py:78/88
  ├─ LiteLLM proxy 转发到 vLLM
  ├─ MCP calculator tool
  ├─ emit_reward
  └─ spans/triplets 回到 VERL PPO 训练
```

> **关键认识**：训练时 agent 用的 LLM **不是** `calc_agent.py` 里 `_llm_from_env()` 那个外部 `OPENAI_BASE_URL`（那是步骤 3 debug 用的），而是 **runner 从 store 拿到的 `main_llm` resource**——指向 VERL 内部拉起的 vLLM server。这就是为什么步骤 3（外部 Azure 端点）能通、但步骤 4（内部 vLLM）连不上：两条 LLM 链路完全不同。

**③ vLLM server 地址的来源**：rollout 连的 `backend_llm_server_addresses`（即 `10.0.0.4:<port>`）**由 VERL trainer 侧创建 vLLM async server 后，通过 `set_up_data_and_server(..., server_addresses, ...)` 传进 daemon**（`daemon.py:590`），再注册给 LiteLLM。也就是说 **VERL 已认定 server 在该端口、并把地址交给了 litellm**——当前的 `Cannot connect` 报错，本质是「地址已注册、但那个 vLLM actor 的 HTTP server 没在该端口真正 listen」。

---

## 六、实测记录（持续回填）

> ⏳ 本节随真实运行逐步填入：各步骤的输出、耗时、报错与解法、reward/accuracy 曲线、GPU 利用率与 rollout 吞吐。

- ✅ **步骤 1 环境准备（已跑通，版本已锁定核对）**：在 `agent-lighting-vm`（A100 80GB）上用 `uv sync --frozen` 复现 CI 环境成功，独立 venv（`.venv`）装齐全部依赖，未再触发此前手工 pip 的 cupy/numpy 冲突——印证「以 uv.lock + CI groups 为唯一事实来源」的可行性。环境已随 `uv.lock` 与 `requirements-before-clean.txt` 提交到 fork（`huqianghui/agent-lightning`）。stable 路线（`torch-gpu-stable`）锁定的核心版本：

  | 包 | uv.lock 锁定版本（frozen 装的） |
  |----|------|
  | agentlightning | **0.3.1**（源码装，非 PyPI 的 0.3.0） |
  | torch | 2.8.0+cu128 |
  | verl | ⚠️ **0.8.0**（`torch-gpu-stable` 组 pin `verl>=0.6.0`，lockfile 只有 0.5.0/0.8.0 → 解析到 0.8.0；**但 0.8.0 删了 `fsdp_workers`，真跑训练必崩，见下方步骤 4-b 踩坑，最终钉到 0.7.0**） |
  | vllm | 0.10.2 |
  | flash-attn | 2.8.3.post1 |
  | ray | 2.55.1 |
  | tensordict | 0.9.1 |
  | numpy | 2.2.6 |
  | autogen-agentchat / -ext / -core | 0.7.0 |
  | mcp | 1.27.2 |
  | gdown | 6.1.0 |

  > **frozen vs 污染前对比**：`uv.lock` 是多变体锁定（torch 同时锁了 2.7.0 legacy + 2.8.0+cu128 stable，vllm 锁了 0.9.2/0.10.2/0.11.0，flash-attn 锁了 2.8.1/2.8.3.post1），`--frozen` 按所选 group 取 stable 这一组、不重新解析。对照 `requirements-before-clean.txt`（手工 pip 污染后的 freeze）：彼时 `ray==2.56.0`、`numpy==1.26.4`、外加 resolver 顺手拉进来的 `cupy-cuda12x==14.1.1` / `opencv-python-headless==4.13.0.92`——正是这些「自由解析」的版本和 verl 锁定冲突，`uv sync --frozen` 从根上避免。
- ✅ **Azure OpenAI 适配（已验证）**：debug 后端接 Azure OpenAI（README 规定变量：`AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_API_KEY` / `AZURE_OPENAI_API_VERSION` 或 `OPENAI_API_VERSION` / `AZURE_OPENAI_DEPLOYMENT`）。步骤 3 debug 两题全对，证明 Azure 端点 + 部署名 + api-version 配置正确、整条 LLM 调用链路通。⏳ 仅余：具体部署名/api-version 取值（非必要，可后补）。
- ✅ **步骤 2 数据集 + MCP 计算器（已跑通）**：
  - **数据**：`gdown` 下载成功（`calc-x-data.zip` ≈ 1.67 MB）。实测两个坑——① 系统 python 没 gdown，得用 `.venv/bin/python -m gdown`（走 `__main__` 入口，不依赖 CLI 在 PATH）；② 这个 **gdown 6.1.0 的 CLI 不认 `--fuzzy`**，直接传裸 file id 即可（`--fuzzy` 是 Python API 参数，CLI 没有）。已把 `data/` + zip 提交进 fork，后续克隆即用。`data/` 平铺布局：`train.parquet`(1.79 MB)/`test.parquet`(109 KB)/`test_mini.parquet`(8.5 KB)。
  - **MCP 计算器**：`python tests/test_mcp_calculator.py` 通过，输出 `31415926 * 11415789 = 358637582455614`（结果正确，确认 `uvx` + mcp-server-calculator 链路通，训练时不会因 MCP 没起来而 hang）。
- ✅ **步骤 3 debug agent（已跑通，rollout 闭环验证）**：`python calc_agent.py` 两道题全解对、reward 全 1.0，没有 hang。完整最小闭环跑通：
  ```
  Azure OpenAI → AutoGen AssistantAgent → MCP calculator tool → answer extraction → evaluate() → agl.emit_reward()
  ```
  实际输出：
  ```
  Processing request of type ListToolsRequest
  Processing request of type CallToolRequest
  answer: 180  ground_truth: 180  reward: 1.0
  answer: 16.0 ground_truth: 16   reward: 1.0
  ```
  `CallToolRequest` 出现 = LLM 确实发起了 calculator tool call、MCP workbench 把 `uvx mcp-server-calculator` 调起来了；reward=1.0 = `evaluate()` + `agl.emit_reward()` 正常。这一步等于提前确认了 Azure OpenAI 环境变量、LLM client 创建、AutoGen 运行、MCP 调用、tool call、reward 计算、rollout emit reward 全链路无误——可放心进步骤 4 让 VERL 大规模跑。
- ✅ **步骤 4-a Ray head 起来 + dashboard 确认（已验证）**：`bash ../../scripts/restart_ray.sh` 在 A100 80GB VM 上正常起 head——`ray stop` 先报「Did not find any active Ray processes」（环境干净、无僵尸 actor 占显存），`ray start --head` 输出「Ray runtime started.」、Local node IP `10.0.0.4 (Head)`、dashboard 在 `10.0.0.4:8265`。
  - **headless VM 看 dashboard**：VM 无浏览器，用 **VS Code Remote-SSH 的 PORTS 面板手动 Add Port `8265`**（Ray 自动转发的是 12316/12358 等内部端口，8265 不会被自动识别），转发后本地浏览器开 `localhost:8265`。另两条路：本地 `ssh -L 8265:127.0.0.1:8265 azureuser@<VM公网IP>` 隧道；或纯命令行 `ray status` / `curl -s http://127.0.0.1:8265/api/version`（不依赖浏览器）。
  - **dashboard 实测健康信号**（Cluster 页）：`Node Statistics: TOTAL x1 / ALIVE x1`；节点 `agent-lighting-vm` State `ALIVE`、`10.0.0.4 (Head)`；**GRAM `869MiB/81920MiB`** 坐实是 A100 80GB（81920 MiB≈80GB）、训练前几乎空着；`GPU [0]: 0.0%` = GPU 已被 Ray 纳管且空闲；`ray::DashboardAgent`/`RuntimeEnvAgent`/多个 `ray::IDLE` 全 ALIVE（系列 07 讲的 head=GCS+dashboard+raylet daemon + 预热待命的 worker 进程池）。
  - **`ray status` 二次坐实（不依赖浏览器）**：`Active: 1 node`、`Recent failures: (no failures)`、`Resources: 0.0/24.0 CPU、0.0/1.0 GPU、0B/146.21GiB memory`——单节点活着、GPU 已纳管且空闲。命令行这两行（Active 1 node + GPU `/1.0`）就足以确认 head 健康，无需开 dashboard。
  - **无害提示**：脚本末尾偶现 `Y: command not found`——Ray 的 usage-stats 提示有 10s 自动确认，那个 `Y` 是提示跳过后落到 shell 的游离输入，不影响 Ray。
- ⚠️ **步骤 4-b 冒烟训练的最大踩坑：`uv sync --frozen` 的 stable 路线装出 verl 0.8.0，真跑训练必崩（本次最耗时的一个坑）**。`--ci-fast` 一启动就报：
  ```
  ModuleNotFoundError: No module named 'verl.workers.fsdp_workers'
  ```
  报错出在 `agentlightning/verl/entrypoint.py:128`：
  ```python
  from verl.workers.fsdp_workers import ActorRolloutRefWorker, AsyncActorRolloutRefWorker, CriticWorker
  ```
  - **根因链**：`torch-gpu-stable` 组在 `pyproject.toml` 里 pin 的是 `verl>=0.6.0`，而 `uv.lock` 里 verl 只有 **0.5.0 和 0.8.0**（没有 0.6.0/0.7.0）→ `--frozen` 下 `>=0.6.0` 只能解析到 **0.8.0** → **verl 0.8.0 删除了 `verl.workers.fsdp_workers` 模块**，而 agentlightning 0.3.1 的 entrypoint 仍 import 它 → 必崩。
  - **实测各版本 `fsdp_workers.py` 是否存在**（curl verl 各 tag 该文件）：**v0.5.0 / v0.6.0 / v0.7.0 都有（HTTP 200），v0.8.0 已删（404）**。即 agentlightning 0.3.1 兼容 verl ≤0.7.0。
  - **为什么 CI 抓不到**：CI 的 `examples-calc-x.yml` 也走 `--group torch-gpu-stable`，但 **CI 机器没有 GPU、从不真起 VERL 训练循环**，这条 import 在 CI 里根本不执行——只有在 A100 上真跑训练才触发。所以这是「lockfile + group pin 配置 bug」，靠 CI 绿灯发现不了。
  - **最终解法（钉 verl 0.7.0，保住新栈，优于整体降级 legacy）**：不走 `torch-gpu-legacy`（那是 verl 0.5.0 + torch 2.7.0 + vllm 0.9.2 整套降级），而是**把 verl 钉在「仍保留 `fsdp_workers` 的最高版本」0.7.0**，同时保住 stable 的新栈（torch 2.8.0 / vllm 0.11.0 / flash-attn 2.8.3.post1）。跑通的对齐版本（见 fork 的 `requirements-freeze-calcx-aligned.txt`）：
    | 包 | 版本 |
    |----|------|
    | **verl** | **0.7.0**（最高仍带 `fsdp_workers`） |
    | torch / torchvision / torchaudio | 2.8.0 / 0.23.0 / 2.8.0 |
    | vllm | 0.11.0 |
    | flash-attn | 2.8.3.post1 |
    | transformers | 4.57.1 |
    | tensordict | 0.10.0 |
    | ray | 2.55.1 |
    | litellm | 1.90.0 |
    | autogen-* | 0.7.5 |
    | mcp | 1.28.1 |
    | numpy | 2.2.6 |
  - **验证修复**：`python -c "import verl; print(verl.__version__)"` 应为 `0.7.0`；`python -c "from verl.workers.fsdp_workers import ActorRolloutRefWorker; print('OK')"` 应打 `OK`。
  - **方法论留痕**：这个坑教训是——`uv sync --frozen` 保证「按 lockfile 装」，但**不保证「装出来的组合能跑」**：当某个 dependency group 的版本约束（`verl>=0.6.0`）与 lockfile 实有版本（只有 0.8.0 满足）撞上「上游删了 API」时，frozen 也救不了。排查要分层卡点（①verl 版本+能否 import fsdp_workers → ②torch/vllm/flash-attn 能否 import → ③Ray 起来 → ④冒烟），每层过了再往下，不要「改一处就重跑整段长 log」。
- ⏳ 步骤 4-b 续：verl 0.7.0 修好后，`--ci-fast` 1 step 是否真正跑通（vLLM 加载 Qwen2.5-1.5B-Instruct、reward 是否打出、dashboard 的 Actors/Jobs 是否出现 rollout runner 与 training worker）；
- ⏳ 步骤 5 完整训练：初始 val accuracy、reward 曲线、总耗时、GPU 利用率、rollout 占比。

---

## 七、其他 example 与训练框架（持续扩展）

> 本节随对其他例子和后端的实践逐步展开。

### 7.1 spider（Text-to-SQL，VERL）⏳

LangGraph + LangChain，模型用 `Qwen2.5-Coder-1.5B-Instruct`。比 calc_x 多 langchain 全家桶依赖，任务更贴近真实业务（数据库查询）。待跑后补差异与坑。

### 7.2 chartqa（多模态图表问答，VERL）⏳

LangGraph，多步自我修正（observe → extract → calculate → check → refine），锁死 vLLM 0.10.2，易踩 flash-attn/CUDA 坑。多模态是它和前两个的根本差异。待跑后补。

### 7.3 tinker（Tinker 托管训练后端）⏳

不走 VERL，把训练委托给 Tinker 托管服务，不需本地 GPU 但要服务访问权限。对应系列 07 §六「替代方案」里偏托管/serving 的一支。重点对比：与 VERL 路线在 rollout/training 解耦、成本、可控性上的差异。待实践后展开。

---

## 八、小结与系列衔接

1. **example 选型**：VERL RL 例子有 calc_x / spider / chartqa 三个，tinker 走 Tinker 托管后端；首跑选 calc_x——最轻、有冒烟模式、承接 SFT、契合系列 07 计划；
2. **承接关系**：calc_x 与 unsloth 同属「数学 + 计算器」任务域，是优化阶梯 SFT → RL 的相邻两级，概念上完美承接；但默认不串联（框架/数据/起点都不同），真串联需走 `--lora`/`--model` 冷启动钩子；
3. **环境关键**：复用 A100 80GB VM，但必须建独立 venv 避免污染 unsloth 栈；依赖在已有 torch/vllm 基础上补 flash-attn + verl + autogen；
4. **runbook**：venv → VERL 依赖 → 数据集 + MCP → debug agent → `--ci-fast` 冒烟 → 完整训练，分阶段验证；
5. **配置印证理论**：calc_x 默认 GRPO + 组内 n=4 + FSDP offload + hermes tool parser，正好把系列 07 的「GRPO 省显存」「rollout 是瓶颈」「工具调用解析」落到可观测的实测上。

> 相关：[[Agent Lightning系列07：强化学习与VERL入门——RL基础、三大框架架构对比与agent-lightning的选型逻辑]]（本篇的理论底座）、[[Agent Lightning系列06：SFT实战篇——从Azure GPU VM到跑通unsloth拒绝采样微调]]（SFT 实战，本篇的承接对象）、[[Agent Lightning系列05：SFT路线剖析——reward不喂答案而造标签、拒绝采样微调与自蒸馏真相]]、[[Slime vs VERL 深度架构对比——数据流哲学、组件选型与训练推理栈分层]]、[[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]]
