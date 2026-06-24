---
title: Agent Lightning 系列 01：用 APO 做 Prompt Tuning——Azure 实践与 beam search 算法解析
created: 2026-06-24
tags: [agent-lightning, APO, prompt-tuning, prompt-optimization, beam-search, azure-openai, microsoft, agent, RL]
---

# Agent Lightning 系列 01：用 APO 做 Prompt Tuning——Azure 实践与 beam search 算法解析

> 不调一个模型参数，只优化 prompt——从一个能跑通的 room selector 例子，拆开 APO 的 beam search 内核

---

## 〇、为什么从 APO 入手

[Agent Lightning](https://github.com/microsoft/agent-lightning) 是微软开源的 Agent 训练框架，主打"**几乎零代码改动**"地优化任意 Agent（兼容 LangChain、OpenAI Agent SDK、AutoGen、CrewAI、Microsoft Agent Framework，甚至无框架裸写）。它支持一组算法：

- **APO（Automatic Prompt Optimization）**——只优化 prompt，不动权重
- **VERL**——强化学习微调权重（需要 GPU + PyTorch + vLLM）
- **SFT（Supervised Fine-tuning）**——监督微调

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

## 四、小结与系列展望

本篇把 APO 这条"不调权重的 prompt tuning"路线从**实践**（Azure OpenAI 接线、deployment 选型、跑通验证）到**算法**（beam search + 文本梯度、调用次数与成本），再到**一次真实的负结果复盘**走通了一遍。核心认知：

1. APO = 让强模型当优化器，用**自然语言梯度**反复改写 prompt，验证集打分做 beam search
2. Azure 接入的关键就两处：`OpenAI→AzureOpenAI`、`model=` 填 deployment 名
3. 成本由 `bw × bf × rounds × vbs` 主导，先小规模验证再放大
4. **APO 不保证提升**：改写的约束必须匹配 reward 的评判口径，否则"越改越详细"反而掉分；小数据集 + 低 `val_batch_size` 噪声大，先把评估做稳再谈优化

**系列后续计划**（待实践后补）：

- 系列 02：自定义算法与 Trainer 集成（`apo_custom_algorithm.py`，store/algorithm/runner 三件套）
- 系列 03：VERL 路线——真正微调权重的 RL 训练（GPU 环境）
- 系列 04：把 APO 套到自己的真实 Agent 上（换数据集 + reward 函数 + agent 逻辑）

> 相关：[[Agentic-Engineering——质量与成本的一体化优化]]、[[从Google五种Skill Pattern到Agent Runtime——Skill、MCP与Agent的统一架构]]
