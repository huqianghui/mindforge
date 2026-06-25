---
title: Agent Lightning 系列 01：用 APO 做 Prompt Tuning——Azure 实践与 beam search 算法解析
created: 2026-06-24
tags: [agent-lightning, APO, prompt-tuning, prompt-optimization, beam-search, azure-openai, microsoft, agent, RL]
---

# Agent Lightning 系列 01：用 APO 做 Prompt Tuning——Azure 实践与 beam search 算法解析

> 不调一个模型参数，只优化 prompt——从一个能跑通的 room selector 例子，拆开 APO 的 beam search 内核

---

## 〇、为什么从 APO 入手

[Agent Lightning](https://github.com/microsoft/agent-lightning) 是微软开源的 Agent 训练框架，主打"**几乎零代码改动**"地优化任意 Agent（兼容 LangChain、OpenAI Agent SDK、AutoGen、CrewAI、Microsoft Agent Framework，甚至无框架裸写）。它支持一组优化方法：

- **APO（Automatic Prompt Optimization）**——只优化 prompt，不动权重（`algorithm/` 内置）
- **VERL**——强化学习微调权重（需要 GPU + PyTorch + vLLM）（`algorithm/` 内置）
- **SFT（Supervised Fine-tuning）**——监督微调（**非内置算法类**，走「自定义算法扩展点」实现，官方示例在 `examples/unsloth/`、`examples/azure/`）

> ⚠️ 一个常见误解的澄清：`agentlightning.algorithm` 包里**只内置了 APO 和 VERL 两个一等公民算法**（`algorithm/__init__.py` 仅 export 这两个 + `Baseline`/`FastAlgorithm` 工具类）。SFT **不是**和它俩并列的内置算法，而是用「继承 `Algorithm` + 实现 `run()`」的自定义算法机制接 Unsloth/Azure 微调实现的示例。框架真正"自带"的算法是 APO（prompt）与 VERL（RL 权重）。详见 [[Agent Lightning系列02：框架全景与脊柱拆解——9大模块与method-agnostic设计]] §五。

本系列从 **APO** 开始，原因很简单：它是**最轻的一条路**——纯 Python + 调 LLM API，CPU 即可跑，没有 GPU/CUDA 依赖。它和 fine-tuning 的本质区别是：

| 维度 | Prompt Tuning（APO） | Fine-tuning（VERL/SFT） |
|------|---------------------|------------------------|
| 改什么 | prompt 模板文本 | 模型权重 |
| 硬件 | CPU 即可 | GPU（CUDA） |
| 产物 | 一段更好的 prompt 字符串 | 一个新的权重 checkpoint |
| 成本 | 只有 API 调用费 | GPU 机时 + API |
| 可移植 | 换模型直接复用 | 绑定具体模型 |

> 一句话：APO 是"让一个强模型当优化器，反复诊断并改写你的 prompt，用验证集打分挑最优"——梯度是**文本**，不是数值。

---

## 一、实践：在 Azure 上把例子跑起来

### 1.1 环境

官方只支持 **Linux**（Ubuntu 22.04+），macOS/Windows 不支持（除非 WSL2）。本次实践在 **Azure Machine Learning 的 Linux VM** 上通过 SSH 操作，环境天然合规。

```bash
conda create -n agl python=3.11 -y && conda activate agl
pip install --upgrade "agentlightning[apo]" "openai>=2.0"
```

`[apo]` extra 会拉入 [POML](https://github.com/microsoft/POML)（微软的 prompt 标记语言，APO 用它管理 gradient/edit 的模板）；APO 还要求 **OpenAI Python SDK ≥ 2.0**。

> ⚠️ 上面装的是 PyPI 正式版 **0.3.0**，跑通基础流程够用。但若要用到「最佳实践」里的自定义模板参数（`apply_edit_prompt_files`），**必须改成源码 editable 安装**（得 0.3.1-dev）——详见「实践 1」开头的版本前提说明。

### 1.2 示例：room selector（会议室预订 Agent）

`examples/apo/` 下的 `room_selector.py` 是一个用 function calling 选会议室的 Agent：给定时间、人数、设备需求、无障碍要求，从 7 个房间里选最优。它故意用一个**极简 baseline prompt**和**弱模型**（`gpt-4.1-nano`），这样 prompt 优化的提升才看得出来。

打分用一个独立的 judge 模型（`gpt-4.1-mini`，结构化输出 0~1 分），对比 Agent 输出与标准答案。数据集 `room_tasks.jsonl` 给出每个场景的 `expected_choice`。

### 1.3 关键改动：把 OpenAI client 换成 Azure

示例默认用公有 `OpenAI()` / `AsyncOpenAI()`，用 **Azure OpenAI** 必须换成 `AzureOpenAI` / `AsyncAzureOpenAI`。一共涉及 **2 个文件**。

**环境变量**（AzureOpenAI client 会自动读这 3 个）：

```bash
export AZURE_OPENAI_ENDPOINT="https://<你的资源名>.openai.azure.com/"
export AZURE_OPENAI_API_KEY="<你的 key>"
export OPENAI_API_VERSION="2025-04-01-preview"   # gpt-5 系列需要较新的 api-version
```

**文件 1 `room_selector_apo.py`**（训练入口）：

```python
from openai import AsyncAzureOpenAI            # 原来是 AsyncOpenAI

openai_client = AsyncAzureOpenAI()             # 无参数即可，读 env

algo = APO[RoomSelectionTask](
    openai_client,
    gradient_model="gpt-5-mini",               # 你的 deployment 名
    apply_edit_model="gpt-4.1-mini",           # 你的 deployment 名
    val_batch_size=10, gradient_batch_size=4,
    beam_width=2, branch_factor=2, beam_rounds=2,
    _poml_trace=True,
)
```

**文件 2 `room_selector.py`**（Agent + judge 共用一个 client）：

```python
from openai import AzureOpenAI                 # 原来是 OpenAI

client = AzureOpenAI()                          # room_selector() 里，原来是 OpenAI()
model = "gpt-4.1-nano"                           # = 你的 deployment 名
# grader 里：model="gpt-4.1-mini"               # = 你的 deployment 名
```

> ⚠️ Azure 的 `model=` 参数填的是 **deployment 名**，不是模型名。把 deployment 命名成和模型同名，就不用再改这两行。

### 1.4 推荐的 Azure OpenAI Deployment

APO + 这个例子总共用到 **4 个模型角色**（实际建 3 个 deployment，`gpt-4.1-mini` 复用）：

| 角色 | 参数 | 推荐模型 | 为什么 |
|------|------|---------|--------|
| Agent（被优化对象） | `room_selector.py` 的 `model` | **gpt-4.1-nano** | 每条 rollout 都调，要便宜快；故意用弱模型才显出优化效果 |
| Judge（打分器） | grader 的 `model` | **gpt-4.1-mini** | 打分要稳定，temperature=0 |
| Gradient（写"文本梯度"/批评） | APO `gradient_model` | **gpt-5-mini**（默认） | 优化器核心，需要强推理诊断 prompt 哪里差 |
| Apply-edit（按批评改写） | APO `apply_edit_model` | **gpt-4.1-mini**（默认） | 按批评生成新 prompt |

> 想更省：把 `gradient_model` 也设成 `gpt-4.1-mini`，只建 2 个 deployment 先跑通，效果略弱。

### 1.5 运行与验证

```bash
cd agent-lightning/examples/apo
python room_selector.py          # Step 0：先验证 Agent+reward 链路（单条 rollout）
python room_selector_apo.py      # Step 1：正式跑 APO 优化
```

验证 prompt tuning 是否生效，看 `apo.log`：

1. **验证分提升**——每轮 beam round 的 validation score 应随轮次上升或持平（seed → round1 → round2）
2. **prompt 被改写**——最优 prompt 应明显比 baseline 更长更具体（baseline 只有一句话，优化后会逼近源码注释里的 "Oracle Prompt"：带 hard constraints + tie-break 评分规则）
3. **不碰权重**——全程无 GPU、无 torch、无 checkpoint，只有 API 调用 + `apo.log`（+ `_poml_trace=True` 时的 `pomltrace/` 目录）

---

## 二、算法：APO 的 beam search 内核

APO 把"找最优 prompt"建模成 **beam search with textual gradients**（带文本梯度的束搜索）。核心数据结构是一个大小为 `beam_width` 的候选 prompt 集合（beam），迭代 `beam_rounds` 轮。

### 2.1 三个核心参数

| 参数 | 默认 | 含义 |
|------|------|------|
| `beam_width` | 4 | beam 里保留的 top prompt 数 |
| `branch_factor` | 4 | 每个父 prompt 派生几个新候选 |
| `beam_rounds` | 3 | 迭代几轮 |
| `gradient_batch_size` | 4 | 算梯度时，父 prompt 在多少条训练样本上跑 |
| `val_batch_size` | 16 | 每个候选在多少条验证样本上打分 |

### 2.2 一个 beam round = 三个阶段

源码 `run()` 主循环每轮做三件事：

**阶段 1 — 取父 prompt**（`_sample_parent_prompts`）
从当前 beam 取 `beam_width` 个父 prompt（数量不足则循环复用）。

**阶段 2 — 派生候选**（`_generate_candidate_prompts`）
对**每个父 prompt × 每个 branch**做一次"求梯度 + 改写"：

1. 父 prompt 在一批训练数据（`gradient_batch_size` 条）上跑 rollout
2. `gradient_model` 看这些结果写一段批评（**textual gradient**，即"哪里做错了、为什么"）
3. `apply_edit_model` 按批评改写出一个新 prompt

→ 每轮新增候选 = `beam_width × branch_factor`

> 这里的 "gradient" 不是数值梯度，而是**自然语言的诊断**——这是 APO 类算法（源自 ProTeGi / "Automatic Prompt Optimization with Gradient Descent"）的核心 idea：用 LLM 模拟"梯度下降"的方向信号。`TraceToMessages` adapter 负责把 rollout 的 OpenTelemetry spans 转成 messages 喂给 gradient_model。

**阶段 3 — 评分选优**（`_evaluate_and_select_beam`）
把 `旧 beam + 新候选` 全部在一批验证数据（`val_batch_size` 条）上跑 rollout 打分，按分排序取 top-`beam_width` 进入下一轮。历史最优 prompt 全程被跟踪（`get_best_prompt()` 取回）。

### 2.3 调用次数（用本次实践参数：bw=2, bf=2, gbs=4, vbs=10, rounds=2）

| 项 | 公式 | 单轮 |
|----|------|------|
| Agent rollout（求梯度阶段） | `bw × bf × gbs` = 2×2×4 | **16** |
| 优化器 LLM 调用 | `bw × bf × 2`（gradient+edit） | **8**（4 批评 + 4 改写） |
| Agent rollout（验证阶段） | `(bw + bw×bf) × vbs` = 6×10 | **60** |

> ⚠️ **1 次 agent rollout ≠ 1 次 API 调用**：本例 1 次 rollout 内部 ≈ 2 次 `gpt-4.1-nano`（首轮 + tool 调用后）+ 1 次 `gpt-4.1-mini` judge ≈ **3 次 API 调用**。

**整个训练（rounds=2）总量**：

- 种子 prompt 初始验证（`run_initial_validation=True`）：`1 × vbs` = 10 rollout
- 2 个正式 round：`(16+60) × 2` = 152 rollout + 16 优化器调用
- **合计 ≈ 162 rollout（≈ 486 次 nano/mini 调用）+ 16 次优化器调用**

### 2.4 成本直觉：三个参数是乘法关系

`beam_width`、`branch_factor`、`beam_rounds` 对调用量是**乘法叠加**的——验证阶段是 `(bw + bw×bf) × vbs × rounds`。想搜得更广更准就加大它们，但成本会快速膨胀。调参策略：

- **先小后大**：用 `bw=2, bf=2, rounds=2` 跑通验证链路，确认分数会涨，再放大
- **省钱优先**：缩小 `val_batch_size`（验证阶段是大头）、把 `gradient_model` 降级
- **质量优先**：加大 `beam_rounds`（让搜索多迭代几代）比盲目加大 `branch_factor` 更划算

---

## 三、实践踩坑：一次"负结果"运行的复盘

首次实跑（`bw=2, bf=2, rounds=2, gbs=4, vbs=10`，验证集 29 条）**APO 没能超过 baseline**——种子 prompt v0 基线 0.655，两轮下来 "Best prompt **not** updated"，最优始终是 v0。这个负结果信息量很大，记三个坑。

### 坑 1：reward = None 不是打分失败，是 prompt 渲染崩了

日志里 v1、v2、v8 的 `Statuses` 是 `Counter({'failed': 10})`、reward 全 `None`。根因不是 judge，而是**模板渲染直接抛异常**：Agent 用 `prompt_template.format(**task_input)` 渲染，而 task_input 只有 6 个 key（`date / time / duration_min / attendees / needs / accessible_required`），engine 是 `f-string`。这三个候选引入了渲染会炸的内容：

| 版本 | 致命内容 | 报错 |
|------|---------|------|
| v1 | `Needs: {needs} (mode: {needs_mode})`——多了 `{needs_mode}` | `KeyError: needs_mode` |
| v2 | 输出 schema 里有字面量花括号 `{ "best_choice": {...} }` | `.format()` 把 `{` 当占位符 → KeyError/ValueError |
| v8 | `{timezone}`、`{max_results}`、`{max_retries}` + JSON 示例的字面 `{` | KeyError |

渲染异常 → rollout 标 `failed` → 无 reward span → `find_final_reward` 返回 `None` → 求平均按 0 处理。对照能跑通的 v0/v3/v4/v5/v6/v7：它们都**用自然语言描述 JSON 字段**，不写裸 `{}`、不引入新 `{var}`，所以没炸。

> **本质**：`apply_edit_model`（gpt-4.1-mini）改写时不知道"模板只能用那 6 个占位符、且禁止裸花括号"这条硬约束，把 JSON schema 示例直接塞进了模板。

### 坑 2：同一 prompt 分数在 0/1 间摆动——是噪声，不是 bug

单条 task 的 reward 来自 judge（0~1，可给 0.3/0.7/0.8 部分分），但**同一 prompt 多次评估分数不同**有两个来源：

- **(a) 每轮验证批次不同（大头）**：`val_batch_size=10` 但验证集 29 条，每轮 `next(val_iterator)` 取**不同的 10 条**。所以 v0 在 Round 1 batch = 0.900，Round 2 另一批 = 0.500，本就不可比。
- **(b) temp=0 仍非确定性（噪声）**：v0 在**完整 29 条**上 Round0=0.655 → Round1=0.614 → Round2=0.655，同 prompt 同题同温度仍抖动，个别 task reward 翻转。gpt-4.1-nano 带 tool call + judge 在 temp=0 下也不保证逐 token 确定。

**为什么 APO 反而没提升**：① 3/8 候选渲染失败直接计 0；② 存活候选都在"过度工程化"（输出 top-3 JSON + scoring formula），而 grader 要的是**精确选中单个房间**，啰嗦的 JSON 输出反而让 judge 更难对上 `expected_choice`，分数下降。基线本就不弱（0.655），APO 在小数据集 + 高噪声下空间有限。

### 坑 3：最优 prompt 跑完就丢了——示例脚本不打印

`get_best_prompt()` 能取最优模板（`apo.py:245`），但示例 `main()` **没有调用它**，`trainer.fit()` 跑完结果就丢了。两种取法：

- **从 `apo.log` 读**：grep `Seed prompt baseline score:` / `Beam leader score:` / `Best prompt updated|not updated`，history best = 其中最大值（本次 = v0 = 0.655）。
- **改脚本取**：在 `trainer.fit(...)` 后加

```python
best = algo.get_best_prompt()              # 返回最优 PromptTemplate
print(best.template)
print("best score:", algo._history_best_score)   # 分数是私有字段，只能这样读
```

> 注意"最后的 prompt" ≠ "最优 prompt"：Round 2 结束时 beam 是 `[v0, v6]`，但 beam leader 在全集重评后最优仍是 v0。

### 调优建议

1. **`val_batch_size` = 数据集大小（29）**——消除"每轮换批次"的不可比，分数才有意义（验证阶段开销变大，但信号可信）
2. **约束 edit model**——用 `apply_edit_prompt_files` 自定义改写模板，明确"只能用固定占位符集、禁止裸花括号"，从源头消灭 v1/v2/v8 类 None
3. **扩大数据集 + 加大 `beam_rounds`**——小数据集噪声大、基线已不弱时，APO 收益有限；或换一个"啰嗦输出无害"的 grader

> **教训**：APO 的"文本梯度"会让 prompt 越改越详细，但**详细 ≠ 更好**——必须让改写约束匹配 reward 的评判口径（这里是"精确单选"），否则过度工程化反而掉分。

---

## 最佳实践：把踩坑变成可复用的修法

前面三个坑都有对应的工程化修法。这里把它们整理成可直接照抄的代码级最佳实践。

### 实践 1：约束 edit model——根治 reward=None（治本）

> ⚠️ **版本前提（坑中坑）**：`apply_edit_prompt_files`（以及 `gradient_prompt_files`）这两个参数**还没进入任何 PyPI 正式发布版**。
> - 它引入于 commit `bfb94a87`（2026-01-12，PR #443 "Make APO templates configurable via constructor arguments"）。
> - 而 PyPI 最新正式版仍是 **0.3.0**（2025-12-24 上传，**早于该提交 19 天**）。所以直接 `pip install "agentlightning[apo]"` 装到的 0.3.0 **没有这个参数**，传进去会报 `TypeError: __init__() got an unexpected keyword argument 'apply_edit_prompt_files'`。
> - **必须从源码做 editable 安装**才能用：
>   ```bash
>   cd /home/azureuser/agent-lightning      # 克隆下来的仓库根目录
>   pip uninstall -y agentlightning          # 先卸掉 PyPI 的 0.3.0
>   pip install -e .                         # 装本地源码 → agentlightning-0.3.1
>   ```
>   装完版本号会变成 `0.3.1`（dev），此时才支持自定义模板参数。验证：`python -c "import agentlightning; print(agentlightning.__version__)"` 应为 `0.3.1`。

**问题定位到代码行**：崩溃发生在 `room_selector.py:153` 的 `prompt_template.format(**task["task_input"])`——这是 rollout 函数体的**第一个动作**，在任何 LLM 调用之前。`task_input` 只有 6 个 key，模板里多一个 `{变量}` 就 `KeyError`、多一对裸 `{}` 就 `ValueError`。因为这行与输入数据无关，所以同一坏模板跑 10 条任务 = `Counter({'failed': 10})` 全挂，一次 LLM 都没调到。

**真因**：`apply_edit_model` 自由改写时引入了非法占位符/裸花括号。而默认的 `apply_edit_variant01.poml` 只说了一句 "Preserve placeholder variables inside curly brackets"，**没禁止新增占位符、也没禁止裸花括号**——这就是漏洞。

**修法：自定义一份更严格的 POML 顶替默认文件**。在 `examples/apo/` 下新建 `apply_edit_strict.poml`：

```xml
<poml>
    <p>Revise the given prompt template using the critique
   as constraints and improvement guide.</p>
    <cp caption="Revision Rules">
      <list listStyle="decimal">
        <item>Rewrite or restructure the prompt if the
  critique implies it.</item>
        <item>Prioritize mechanism-first phrasing: define
  what to do, then how to do it.</item>
        <item><b>The ONLY allowed placeholders are exactly
   these six, written with single curly brackets: {date},
  {time}, {duration_min}, {attendees}, {needs},
  {accessible_required}. You MUST NOT invent, rename, add,
   or remove any placeholder. Never introduce names like
  {needs_mode}, {timezone}, {max_results}, etc.</b></item>
        <item><b>You MUST NOT write any other literal
  curly bracket. If you need to show a JSON example or
  output schema, describe it in plain words (e.g. "return
        a JSON object with a best_choice field"). Do NOT write
        literal double opening or closing curly braces.</b></item>
        <item><b>The result MUST be renderable by Python
  str.format with exactly those six keys. Mentally verify
  this before answering.</b></item>
      </list>
    </cp>
    <output-format>
      Return only the improved prompt template, with the
  six placeholders intact and no other curly brackets. No
  explanations, headers, or introductory text.
    </output-format>
    <human-msg>
      <cp caption="Prompt Template">
        <text whiteSpace="pre">{{ prompt_template
  }}</text>
      </cp>
      <cp caption="Critique">
        <text whiteSpace="pre">{{ critique }}</text>
      </cp>
    </human-msg>
  </poml>
```

> **两种花括号别混淆**（POML 的坑）：`{{ prompt_template }}` / `{{ critique }}` 是**双花括号**，是 POML/Jinja 的变量注入位（`poml.poml(context={...})` 会替换），必须原样保留；规则文字里的 `{date}` 等是**单花括号**，在 POML 里就是普通字面文字，正好用来给编辑模型示意"合法占位符长这样"。

**挂载到训练入口**（`room_selector_apo.py`），注意参数类型是 `List[Path]`，必须用 `Path()` 包，不能传裸字符串：

```python
from pathlib import Path

algo = APO[RoomSelectionTask](
    openai_client,
    apply_edit_prompt_files=[
        Path(__file__).parent / "apply_edit_strict.poml",   # 同目录，跨机器不用改
    ],
    ...
)
```

源码 `self.apply_edit_prompt_files = apply_edit_prompt_files or APPLY_EDIT_PROMPT_FILES`（`apo.py:152`）——传进去就**完全顶替**默认的两个 variant；每次 apply edit 时 `random.choice(...)`（`apo.py:361`），列表里只放这一个文件就保证每次都用严格版。

### 实践 2：渲染护栏——兜底（约束模型是软保证，~90%）

约束模型偶尔仍会违规，所以在 `room_selector.py:153` 加一道护栏，让坏模板得 0 分被 beam search 自然淘汰，而不是崩成 None 污染统计：

```python
try:
    user_message = prompt_template.format(**task["task_input"])
except (KeyError, ValueError, IndexError):
    return 0.0   # 渲染失败直接 0 分，不抛异常
```

「约束 edit model（治本）+ 渲染护栏（兜底）」双保险，从此告别 `failed:10` / reward=None。

### 实践 3：`val_batch_size` 的正确设法——不是越大越好，看数据集规模

`val_batch_size` 只控制一处评分，理解它就知道何时该设成数据集大小：

| 评分处 | 用多少数据 | 作用 |
|---|---|---|
| `_evaluate_and_select_beam`（`apo.py:719`） | **一个 batch**（`val_batch_size` 条） | 每轮给候选排序选 top `beam_width` |
| `_update_best_prompt`（`apo.py:777`） | **全量 `val_dataset`** | 给 beam 冠军重打分，定 `_history_best_score` |

- **轮内公平**：`val_batch = next(iterator)` 取一批，该轮所有候选**共用同一批**打分，候选间可比。
- **跨轮不公平**：下一轮 `next()` 取**不同的**批次，round1 的 0.6 和 round2 的 0.5 不在同一批数据上算 → 不可比。这就是分数 0/1 摆动、"Best prompt not updated" 的来源。
- **最优分有兜底**：`_update_best_prompt` 始终用全量 `val_dataset` 给冠军打分，所以 `_history_best_score` 可信、不受 batch 噪声影响。

**结论——按数据集规模分两种策略**：

- **数据集小（如本例 29 条）→ `val_batch_size` 设成等于数据集**。此时用 sub-batch **没有任何成本好处**，只会白白引入"每轮看不同子集"的噪声。设满 → 每轮都用全部数据 → 跨轮可比 → beam 选择稳定 → 摆动消失。
- **数据集大（几百上千条）→ 不该设成全量**。每轮成本 = `候选数 × val_batch_size × 每条 rollout 的 LLM 调用`，全量太贵太慢。此时**故意用 batch < dataset 省成本**，代价是接受跨轮噪声；最佳实践是 batch 设得足够大（统计稳定），并清楚"真正的最优看全量重评的 `_history_best_score`，别拿轮内候选分当绝对真值"。

> 一句话：`val_batch_size` 是为**大数据集省成本**而存在的采样旋钮。小数据集直接拉满到数据集大小换稳定性；大数据集再调小它控成本。

### 实践 4：取回最优 prompt——示例脚本不打印，必须手动加

`trainer.fit()` 跑完结果就丢了，在其后补：

```python
best = algo.get_best_prompt()                       # 最优 PromptTemplate（apo.py:245）
print(best.template)
print("best score:", algo._history_best_score)      # 私有字段，只能这样读
```

### 归因速查表：失败到底怪谁

| 现象 | 模型问题？ | 数据问题？ | 随机性？ | 真因 |
|------|:---:|:---:|:---:|------|
| `failed:10` + reward=None | ❌ 没调到模型 | ❌ 数据完整 | ❌ 确定性崩溃 | **edit model 生成非法模板**（约束 + 护栏） |
| 同 prompt 分数 0/1 摆动 | ❌ | 部分 | ✅ 评估抽样 + temp=0 噪声 | **`val_batch_size` < 数据集**（设满） |
| APO 没超过 baseline | ❌ | 部分 | 部分 | **改写约束没匹配 grader 评判口径**（对齐目标 + 扩数据） |

---

## 四、第二轮实跑复盘：瓶颈从「渲染」转到「噪声」

应用上面的最佳实践（`val_batch_size=29` 设满 + `apply_edit_strict.poml` + 渲染护栏 + 打印 `get_best_prompt()`）后重跑，结果**首次超过 baseline**，但更深的问题浮出水面。

### 4.1 这次确实赢了 baseline——但要打个问号

| prompt | 关键分数 | 备注 |
|--------|---------|------|
| v0 种子 | 0.621（全量基线） | 多次跑在 0.62~0.67 区间 |
| v2 | R1 选优 0.652 → **全量重评 0.707** | history best，超过基线 |
| v6 | R2 选优 0.562 → 全量重评 0.586 | < 0.707，"Best prompt not updated" |
| v7 / v8 | **0.000** | 渲染崩溃（见 4.3） |

末轮 `Best prompt not updated. Current score: 0.586 vs. history best: 0.707`，最终最优 = v2 = **0.707**。

### 4.2 修正认知：渲染护栏已生效，坏候选几乎零成本

第一轮我以为坏候选"白白浪费 29 次 rollout"——**看时间戳，这个判断是错的**：

- v7：29 条只用 **2 秒**；v8：同样 **2 秒**
- 对比真实跑的 v6：**28 秒**

2 秒跑完 29 条 = 渲染阶段直接崩、`return 0.0` 短路，**根本没调到 LLM**。这正是「实践 2 渲染护栏」起作用——坏模板被秒判 0 分、被 beam search 干净淘汰，相比第一轮的 `failed:10` + None 污染统计是实质改善。**护栏到位后，渲染崩溃不再是成本问题，只是浪费搜索预算的问题。**

### 4.3 新发现①：非法内容的源头是 gradient model，不是 edit model

v7/v8 用的确实是 `apply_edit_strict.poml`，却还是崩了：

| 候选 | 致命内容 | 来自哪里 |
|------|---------|---------|
| v7 | `^\d{4}-\d{2}-\d{2}$`（正则量词 `{4}`/`{2}` 被 `str.format` 当成位置参数索引 → `Replacement index 4 out of range`） | gradient 批评**原话**："date matches `^\d{4}-\d{2}-\d{2}$`" |
| v8 | `{distance_m}` + 一大段字面 JSON 示例 `{ "id":... }` | gradient 批评里**直接给了完整 JSON schema 示例** |

**关键**：不是 edit model 凭空发明，是 **gradient model（gpt-5-mini）在批评里写了正则和 JSON schema，edit model 忠实地抄了进去**。`apply_edit_strict.poml` 只约束"输出端"，没拦住"照抄批评里的危险片段"——危险内容在**输入端的批评里就已存在**。round 2 四个候选里两个直接死在渲染，等于一半搜索预算空转。

### 4.4 新发现②（更严重）：`best=0.707` 很可能是 max-over-noise 选出来的虚高

**同一个 prompt、同样全量 29 条**，分数在剧烈摆动：

| prompt | 多次全量评估 | 摆幅 |
|--------|-------------|------|
| **v2** | R1 重评 **0.707** → R2 重评 **0.503** | **0.20** |
| **v0** | 0.672 / 0.621 / 0.552 | **0.12** |

v2 在全集上一次 0.707、一次 0.503，差 0.2——已经设满 29 条，**这不是批次问题，而是 temp=0 仍不确定性**（tool call + judge 不保证逐 token 确定）。后果：

- **beam 选择有一半靠运气**，谁进 beam 一定程度是噪声驱动。
- **`best score: 0.707` 被高估**：APO 的机制是"对 beam 冠军全量重评、只在更高时更新 history best"——这是**对噪声取最大值**，天然上偏。0.707 是 v2 的一次幸运高抽，下一轮就回落到 0.503。
- **诚实结论：APO 还没稳健赢过种子**。v0 在 0.55~0.67，v2 的真实水平大概也在这个带内，0.707 落在噪声里。

> 教训升级：第一轮的教训是"详细 ≠ 更好"；第二轮的教训是**"小数据集下，被选出来的最优分本身就有上偏，别把 history best 当真实增益"**。先降噪，再谈优化——否则加 `beam_rounds` 只是放大噪声。

#### 4.4.1 「噪声」与「虚高」到底是什么——以及怎么判断

这两个词是统计上相关但不同的概念，值得拆开讲清楚，因为它们是"小数据集做 APO 不靠谱"的根因。

**噪声（noise）：同一个东西重复测量，结果却不一样的"不该有的波动"。**

被测量的是"某个 prompt 的真实能力"——理想情况下它应该是个固定值。但实测中，种子 v0 一字未改、同一批 29 题，多次全量重评得到：

```
0.586 / 0.690 / 0.672 / 0.621 / 0.655   →  极差 ≈ 0.10
```

这 0.10 不代表 prompt 变好变坏，而是测量本身的随机抖动。来源有两个，**temp=0 也消不掉**：
1. **Agent 端**：选房间要 tool call，调用顺序/参数解析/上下文截断都有非确定性；temp=0 只压住 token 采样，压不住整条 agent 轨迹。
2. **Judge 端**：评分是 LLM（gpt-4.1-mini）做**语义比对**而非字符串相等，同一份输出这次判匹配、下次判不匹配是常事。29 题里错判一两条，得分就跳 0.03~0.07，叠加即 ±0.10。

**虚高（max-over-noise inflation）：从一堆带噪声的测量值里挑最大的，挑出来的值会系统性偏高——不是因为它真的最好，而是因为它"运气最好"。**

这是纯数学现象，跟 APO 的机制直接绑定。每个候选的分数 = 真实能力 + 随机噪声；当 beam search 专挑"分数最高"的，等于专挑"真实能力 + 噪声 恰好都偏高"的那个，**正向噪声被主动选了进来**。就像让 100 个能力相同的人各扔一次骰子、挑出 6 点那个宣布"最强"，下次重扔必然回归均值。v2 就是活教材：被选中那次 0.707、重评打回 0.503，APO 末轮全量复评守不住，于是 `Best prompt not updated. Current score: 0.690 vs. history best: 0.690`，回退种子。

**怎么判断（不是凭感觉，是三条证据）：**

| 证据 | 数据 | 说明什么 |
|------|------|---------|
| 同 prompt 重测摆动 | v0 五次：0.586~0.690 | 噪声幅度 ≈ ±0.10 |
| 被选中值 vs 重评值落差 | v2：0.707 → 0.503 | "虚高"存在，落差(0.20) > 真实增益 |
| 最终没守住 | `not updated, 0.690 vs 0.690` | 0.707 是假信号，回退种子 |

**判断逻辑链**：若一个 prompt 的"提升幅度" < 同一 prompt"重测的摆动幅度"，该提升就无法与噪声区分。v2 号称比种子高 `0.707−0.690=0.017`，而种子自己重测就摆 0.10——**信噪比 < 1**，提升不可信。三轮连起来：负结果 → 0.707（虚高）→ 回退种子，诚实结论是 **APO 在这个 29 题噪声 benchmark 上还没稳健赢过种子**。

#### 4.4.2 那到底多少数据才"够"——有没有定论

没有放之四海皆准的魔法数字，但有可计算的下界。核心不是"多少条"，而是**"让评估噪声小于你期望的真实增益"**。

**① 用统计公式估下界。** 每道题的对错可近似看成伯努利试验，N 条数据集的得分**标准误（SE，Standard Error，标准误差）**：

```
SE ≈ sqrt( p·(1−p) / N )

  SE  = Standard Error，"标准误"，衡量"用 N 条样本估出来的均值，
        围绕真实均值会随机抖动多大"。它就是前面说的"噪声幅度"的量化。
  p   = 当前 prompt 的真实准确率（本例≈0.65）
  N   = 数据集条数
  注：SE ≠ 标准差(SD)。SD 描述单条样本的离散；SE = SD/√N，
      描述"均值"的不确定度——所以 N 越大，SE 越小。
```

代入本例 p≈0.65、N=29：`SE ≈ sqrt(0.65×0.35/29) ≈ 0.089`——和**实测摆动 ±0.10**（v0 五次重评 0.586/0.690/0.672/0.621/0.655，极差 0.10）几乎吻合，反过来印证了"噪声 ≈ ±0.1"不是拍脑袋。想把噪声压到不同水平，需要的 N：

| 数据量 N | 评估噪声 SE | 最小可分辨增益(MDE) |
|---------|------------|-------------------|
| ~29（现状） | ±0.09 | >0.18 才显著（几乎分辨不出） |
| ~90 | ±0.05 | >0.10 |
| ~250 | ±0.03 | >0.06 |
| ~570 | ±0.02 | >0.04 |

经验法则：**要可靠地确认 Δ 的提升，单次评估噪声 SE 应 ≤ Δ/2**（两个带误差的均值要拉开 ≈2 个 SE 才算显著）。你若指望 APO 带来 5 个点（0.05）的真实提升，就需要 SE≤0.025，对应 **N≈350+**。

**用一句话串起整条因果链**：数据量少 → 随机摆动大 → 看不清小收益；反过来，数据量多 → 随机摆动小 → 连小收益也能量化出来。

为什么"数据少摆动就大"？得分 = 对的题数 ÷ 总题数，题少时**单题错判对总分的冲击被放大**：
- **29 题**：错判 1 道，分数就跳 `1/29 ≈ 0.034`；judge 在边界上抖动两三道，±0.10 就出来了。
- **290 题**：同样抖动两三道，只影响 `3/290 ≈ 0.01`。基数大，单题随机翻转被"稀释"，总分自然稳。

这正是 `SE ≈ sqrt(p(1−p)/N)` 里分母带 N 的直觉来源：N 越大，分母越大，摆动越小。

然后是关键的第二步——**摆动小了，小收益才"露得出来"**。假设某新 prompt 真实比种子好 0.05：
- 在 29 题上（噪声 ±0.09）：0.05 完全淹没在噪声里，分不清"真的好 0.05"还是"这次抽高了"——这就是 v2 那个 0.707 的下场；
- 在 250 题上（噪声 ±0.03）：0.05 明显大于噪声，重测几次都稳稳高出来，才能确信"是真本事"。

所以扩数据**不是让 prompt 变好**（prompt 好坏是它自己的事，跟评估无关），而是**让"测量仪器"变精密**，把原本被噪声盖住的真实增益显影出来。**数据是你的尺子，题越多刻度越细**；29 条的尺子刻度太粗（0.18），量不出 0.05 这种细小提升，必须换更长的尺子（更多数据）。

> **澄清一个易误读点：第三列"最小可分辨增益（MDE，Minimum Detectable Effect）"越小越好，不是"收益变小"。**
> 它的含义是"这套数据**最少**能稳稳看出多大的提升"。N 越大 → 这个门槛越低 → 仪器越灵敏，连 0.04 这种小提升都能从噪声里揪出来。这跟"数据越多收益越小"是两码事，**不矛盾**：
> - 它不是说"真实增益变小了"——prompt 的真实好坏跟你用多少题评估无关；
> - 它说的是"你这把尺子的最小刻度变细了"。29 条的尺子最小刻度是 0.18（粗），250 条的最小刻度是 0.06（细）。
> - 类比：用厨房秤（精度 5g）称不出一粒米的差别，换成实验室天平（精度 0.001g）就能。天平能"分辨更小的差异"是能力增强，不是"称出来的东西变轻了"。
> 所以"数据越多 → MDE 越小"恰恰是**好事**：你能确认的真实增益门槛越来越低，APO 哪怕只带来 0.05 的提升也能被可靠捕捉，而不会像 29 条那样被 ±0.09 的噪声整个吞掉。

**② 多采样是 N 的"等效放大器"。** 不一定非要扩题。同一题同一 prompt 评 k 次取平均，等效噪声按 `SE/√k` 下降。29 题各评 4 次 ≈ 116 次评估，等效噪声从 0.09 降到 ~0.045——成本和扩到 116 题相当，但省去造新题的麻烦。**数据难造时优先多采样，数据好造时优先扩题**（扩题还顺带覆盖更多分布）。

**③ 落到本例的实操建议：**
- **最低门槛 100+ 题**（SE≈0.05），才谈得上分辨 0.1 量级的 prompt 改动；
- **想严肃做 APO 调优，250~500 题**（SE≈0.02~0.03），让 APO 选出的"最高分"大概率是真本事；
- **数据卡死在 29 条**：那就老老实实**每个候选多采样 3~5 次取均值**，并且**把 history best 当"参考"而非"定论"**，绝不拿 0.707 这种单次高抽汇报成果。

一句话收口：**"够不够"不取决于条数，取决于 `SE ≤ 期望增益/2` 是否成立**；29 条的 SE≈0.09，注定盖过任何小于 0.18 的真实提升，所以它从一开始就不是一个能做 prompt tuning 的尺度。

### 4.5 治本动作：改造 gradient 模板（`gradient_prompt_files`）

光收紧 edit 端不够，必须**同时约束 gradient 端**。`gradient_prompt_files` 与 `apply_edit_prompt_files` 对称（同样从源码 0.3.1 起支持），默认是 3 个 variant（`text_gradient_variant01/02/03.poml`），`random.choice` 每次随机挑一个。

**Step 1 — 定位默认模板**：

```bash
python -c "import agentlightning, pathlib; print(pathlib.Path(agentlightning.__file__).parent / 'algorithm/apo')"
# 该目录下能看到 text_gradient_variant01.poml 等
```

**Step 2 — 以现有 variant 为基底复制**（务必保留它的 `{{ ... }}` Jinja 注入点——那是喂 rollout 轨迹的变量，名字不能改），新增下面两个 block：

```bash
cp <上面路径>/text_gradient_variant01.poml examples/apo/text_gradient_strict.poml
```

```xml
<cp caption="Optimization Objective (what the grader actually rewards)">
  <list listStyle="decimal">
    <item>The agent is graded ONLY on exactly matching one expected
      room id. There is no credit for extra fields, JSON schema,
      ranking, alternatives, or internal checks.</item>
    <item>Brevity helps: verbose JSON / multi-room output makes it
      HARDER for the judge to match the single expected choice, and
      lowers the score. Prefer critiques that improve single-choice
      accuracy, NOT critiques that add output structure.</item>
    <item>Do NOT suggest adding output schemas, top-3 lists,
      confirmation prompts, debug fields, or embedded unit tests.</item>
  </list>
</cp>

<cp caption="Critique Output Constraints (the critique is copied into a str.format template)">
  <list listStyle="decimal">
    <item>The downstream prompt is rendered by Python str.format and
      may use ONLY these six placeholders: {date}, {time},
      {duration_min}, {attendees}, {needs}, {accessible_required}.</item>
    <item>NEVER write a regular expression containing brace
      quantifiers like \d{4} or {2}. Describe formats in plain words
      (e.g. "date in YYYY-MM-DD form"), never with regex.</item>
    <item>NEVER include a literal JSON example or any other text
      containing { or } characters. Describe data shapes in words.</item>
    <item>NEVER propose new placeholder variables (e.g. {distance_m},
      {timezone}, {max_results}). They will crash rendering.</item>
  </list>
</cp>
```

**Step 3 — 挂载，替换掉 3 个默认 variant**（传进去就**完全顶替**默认，列表里只放严格版即可保证每次梯度都用它）：

```python
from pathlib import Path

algo = APO[RoomSelectionTask](
    openai_client,
    gradient_prompt_files=[
        Path(__file__).parent / "text_gradient_strict.poml",
    ],
    apply_edit_prompt_files=[
        Path(__file__).parent / "apply_edit_strict.poml",
    ],
    ...
)
```

**为什么两端都要改**：

| 模板 | 角色 | 约束 |
|------|------|------|
| `text_gradient_strict.poml` | **源头**：别产出正则/JSON/新变量；别推过度工程化；对齐 grader 口径 | 上面两个 block |
| `apply_edit_strict.poml` | **兜底**：即使批评里有，改写时也不许照抄 | 已有 + 补"不得逐字复制 critique 中的正则/JSON" |

> ⚠️ 优先级：**Optimization Objective 那块（对齐 grader 口径）比"防渲染崩"更重要**——它直接攻击 4.4 的根因"越优化越啰嗦反而掉分"。防崩只是省搜索预算，对齐口径才可能真正把分数推上去。

### 4.6 第二轮的行动清单（按优先级）

1. **先降噪**：扩数据集（29 → 100+）是最直接的降方差手段；若框架支持，每个 task 多跑 k 次取均值。把 0.707 当"乐观上界"，别当真实增益。
2. **对齐 gradient 到 grader**：上面的 `text_gradient_strict.poml`，让"文本梯度"的方向对齐 reward（精确单选、简洁优先），而不是一味堆细节。
3. **双向堵渲染**：gradient 端 + edit 端同时禁正则/JSON/新变量；渲染护栏已生效，保留。
4. **最后才加 `beam_rounds`**：信号 > 噪声之后，加迭代才有意义。

---

## 五、为什么还需要 agent-lightning：框架 vs 手搓

跑完三轮会冒出一个很自然的疑问：reward（`room_selection_grader`）、批评模板（`text_gradient_strict.poml`）、改写模板（`apply_edit_strict.poml`）、seed prompt、数据集——**主要元素全是我自己定义的**，那为什么还要这个框架？自己把这几个组件串起来不行吗？

这其实戳到了框架类工具的本质：**你定义的是"领域知识"，框架拥有的是"算法 + 基础设施"，这是一次控制反转（inversion of control）。**

### 5.1 你提供的 vs 框架拥有的

你写的那几个组件，全是**"什么算好"的静态零件**：grader 定义"什么叫选对"、gradient 模板定义"怎么批评失败的 prompt"、edit 模板定义"拿到批评后怎么改写"、seed+数据集定义"优化的起点和评测集"。但把这些静态零件变成一个**能自我迭代的优化循环**，中间那套动态的算法和执行机制，才是 agent-lightning 干的活：

| 你以为简单、其实要自己写对的部分 | 框架替你做了 |
|---|---|
| **beam search 主循环** | 维护 `beam_width` 个候选、每轮 `branch_factor` 扩展、`beam_rounds` 迭代、跨轮剪枝选优 |
| **history-best 簿记** | "对 beam 冠军全量重评、只在严格更高时才更新 best"——就是 §4.4 那套防虚高逻辑，自己写第一次大概率踩 max-over-noise 坑 |
| **rollout 执行 harness** | 把 N 题并行跑、收集 (输入,输出,reward) 三元组、处理超时/重试/并发 |
| **错误归类** | 渲染崩→reward=None（failed）vs 跑通选错→0.0（succeeded）的区分是 runner 做的 |
| **gradient↔edit 接线** | 自动挑低分样本 → 喂 gradient 模板生成批评 → 批评喂 edit 模板改写 → 产出新候选 |
| **POML variant 插拔** | `gradient_prompt_files`/`apply_edit_prompt_files` 传 list、`random.choice` 每次随机选一个 variant |
| **日志/可复现** | `apo.log`、beam leader score、run 工件，跨轮可对比 |

自己 DIY，这些全得手写，且容易写错。

### 5.2 真正的"杀手级"理由：方法无关（method-agnostic）

这才是它叫 "Lightning"（借 PyTorch Lightning 命名哲学）的意义——设计目标不是"做 APO"，而是**把"agent 执行"与"优化方法"解耦**：

> 同一份 `room_selection_grader` + 同一个 agent + 同一个数据集，今天插进 **APO**（调 prompt、不动权重），明天想真的微调模型权重，**换一个 trainer 槽位**插进 **RL（GRPO/PPO）或 SFT** 即可，rollout harness 和 reward 函数**一行不用改**。

手动串联的版本是**焊死的**：为 APO 写的循环，换成 RL 微调权重时 rollout/reward/数据加载全得重写。框架抽象出这一层后，**reward 和 rollout 是资产，优化算法是可插拔的策略**——这是相对"手搓脚本"最大的结构性价值。

### 5.3 诚实的另一面：对简单实验，便利性是"中等"

不吹它。对**一次性的、简单的 APO 实验**：beam search + 文本梯度，自己手写 ~200 行能跑通，框架省的是"写对 + 调试"的时间，不是"从不可能到可能"。

更关键的是——**这个问题最难的部分，框架一点忙都帮不上**：
- 它不会帮你设计 reward（`room_selection_grader` 的"partial + be critical"本身就是个噪声制造机）；
- 它不会帮你降噪（29 题 SE≈0.09 是数据集的事）；
- 它不会帮你决定数据量。

**这次三轮没赢过种子，根因全在"你的组件"里（reward 设定 + 数据量），不在框架里。** 框架把循环跑得很顺，但循环优化的目标本身是歪的——它忠实地优化了一个噪声。

### 5.4 结论：什么时候值得用

**框架的价值不在"替你定义好坏"，而在"替你把好坏变成一个可迭代、可复现、可换方法的优化引擎"。** 值得用，如果满足任一条：

1. **会切换优化方法**（APO 今天、RL/SFT 明天）——不可替代之处；
2. 想白嫖 **RL 级别的 rollout 基础设施**（并行、重试、错误归类）；
3. 要**可复现、可对比**的实验管理，或将来要**上规模**（几百上千题）。

反之，只是一次性调个 prompt、且确定不碰权重微调——手搓 200 行脚本反而更轻、更透明，框架是杀鸡用牛刀。

---

## 六、小结与系列展望

本篇把 APO 这条"不调权重的 prompt tuning"路线从**实践**（Azure OpenAI 接线、deployment 选型、跑通验证）到**算法**（beam search + 文本梯度、调用次数与成本），再到**两轮真实复盘**（负结果 + 调优后超基线但被噪声困住）走通了一遍。核心认知：

1. APO = 让强模型当优化器，用**自然语言梯度**反复改写 prompt，验证集打分做 beam search
2. Azure 接入的关键就两处：`OpenAI→AzureOpenAI`、`model=` 填 deployment 名
3. 成本由 `bw × bf × rounds × vbs` 主导，先小规模验证再放大
4. **APO 不保证提升**：改写的约束必须匹配 reward 的评判口径，否则"越改越详细"反而掉分
5. **非法模板的源头是 gradient model**：批评里写的正则/JSON 会被 edit model 照抄进模板 → 必须 `gradient_prompt_files` + `apply_edit_prompt_files` **两端同时约束**
6. **小数据集下 history best 会虚高**：对噪声取最大值天然上偏，同一 prompt 全量重评能摆动 0.2；**先降噪（扩数据/多采样）再谈优化**，否则加 rounds 只是放大噪声

**系列后续计划**（待实践后补）：

- 系列 02：自定义算法与 Trainer 集成（`apo_custom_algorithm.py`，store/algorithm/runner 三件套）
- 系列 03：VERL 路线——真正微调权重的 RL 训练（GPU 环境）
- 系列 04：把 APO 套到自己的真实 Agent 上（换数据集 + reward 函数 + agent 逻辑）

> 相关：[[Agentic-Engineering——质量与成本的一体化优化]]、[[从Google五种Skill Pattern到Agent Runtime——Skill、MCP与Agent的统一架构]]
