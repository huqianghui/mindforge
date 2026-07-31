---
title: Foundry Toolbox 与 Skills 深度解析：Prompt Agent 与 Hosted Agent 的 Skill 支持、执行环境与 Harness 控制权
created: 2026-07-30
updated: 2026-07-31
tags:
  - azure
  - foundry
  - agent
  - skill
  - toolbox
  - hosted-agent
  - prompt-agent
  - mcp
  - architecture
description: 从"给 Agent 添加 skill 后无法发布"的实际困惑入手，梳理 Foundry Skills 的两条路线（Agents 侧 SKILL.md 纯文本注入 vs Responses API shell tool 的可执行 skill bundle 及 container_auto 环境规格）、Toolbox 的不可变版本与显式发布机制、skill 交付模式、Prompt Agent skill 支持的官方文档矛盾（overview 标 Yes 但三条绑定路径均不通）、两类 agent 的成本模型对比，最终落到 Agent=Model+Harness 框架（harness=编排脚手架，Model→Harness→Environment 分层）下的控制权分层，并给出跨 harness（Claude Code/GitHub Copilot coding agent/container_auto/hosted agent）的 skill 脚本执行环境对照与编写策略，以及 agent 定义元素（skill/MCP/instructions/subagent/hook/plugin）的跨 harness 可移植性分层
---

# Foundry Toolbox 与 Skills 深度解析：Prompt Agent 与 Hosted Agent 的 Skill 支持、执行环境与 Harness 控制权

> 本文源于两个实际困惑的排查（2026-07-30，基于 Microsoft Learn skills/toolbox 官方文档核对）：
> ① 给 Agent 的 toolbox 添加 skill 后为什么无法发布？发布之后再添加是否 work？
> ② Skill 里如果包含 script，它的执行环境（python venv、依赖安装）由谁管理？Prompt Agent 为什么用不了 skill？
> Agent 类型的全景对比（Memory/Planner/治理/Voice）见姊妹篇 [[Foundry Agent 全面对比：Prompt Agent、Hosted Agent 与 Workflow Agent 的能力、治理与场景选型]]。（⚠️ 2026-07-31 加注：该文标题中的第三类 Workflow Agent 已从官方 agent 类型中移除——Workflows 定于 2026-12-01 退役，编排下沉至 Agent Framework/harness + A2A + Skills，详见该文文首更新说明。官方 agent 类型现仅剩本文讨论的 Prompt Agent 与 Hosted Agent 两类。）

---

## 一、先修正前提：Agents 侧的 Skill 是文本，不是可执行代码

理解后面所有问题的钥匙是这一句：**在 Foundry Agents 的 Skills API 交付路径下，skill 从头到尾都是被注入上下文的文本，平台不执行 skill 里的任何代码。**（注意限定词——Responses API 层面另有一条 shell tool 路径，skill 里的脚本真的会在平台容器里执行，见 1.1 节。）

Foundry Skills（preview）遵循 [agentskills.io](https://agentskills.io) 开放规范，一个 skill = `SKILL.md`（YAML front matter + Markdown body）+ 可选的附属资源文件（参考文档、assets）。官方文档对 body 的定义只有一句话："Becomes the skill's injected instructions"——skill 的价值在于**把行为准则（behavioral guidelines）从 agent 代码中解耦出来，中心化版本管理**：升级流程、审查清单、话术约束写一次，多个 agent 复用，改 skill 不用改 agent。

```markdown
---
name: greeting
description: Generate a personalized greeting for the user.
---
# Greeting Skill
You're a friendly greeting assistant.
## Instructions
- Include the user's name if they provided one.
- Keep greetings concise, 1 to 2 sentences.
```

由此推论：**"skill 的执行环境（venv、Python 版本、依赖）"这个问题本身不成立**——skill 不运行，没有执行环境可管。如果 SKILL.md 的指令里写了"运行某个脚本完成 X"，那是 Agent 拿着这段指令去调用**它已有的执行手段**来完成：

| 执行手段 | 环境归属 | 依赖管理 |
|---------|---------|---------|
| Hosted Agent 自己的容器 | 你 | Dockerfile + requirements.txt，完全自定义 |
| Code Interpreter 工具 | 平台托管的共享 Python 沙箱 | 版本与预装包由平台决定，**不可自定义依赖** |
| 外部 MCP server / OpenAPI 服务 | 你自己的服务器 | 完全自管 |

也就是说，执行环境永远是 **agent 的**，不是 skill 的。这和 Anthropic 生态里"skill 可以带 scripts/ 目录、由 harness 在本地 bash 执行"的模式不同——Foundry Agents 侧的 Skills API 只做文本的存储、版本化和分发。

### 1.1 例外路径：Responses API 的 shell tool——skill 脚本真的会执行

上面的"纯文本"结论只对 **Foundry Agents 的 Skills API**（agents 路径）成立。Foundry Models 的 **Responses API** 另有一条 skills 路径（openai 路径），形态完全不同：

- **Skill 是带脚本的文件包**：SKILL.md + `scripts/` + `templates/`，multipart 或 ZIP 上传后得到 `skill_id`，同样有版本管理
- **通过 shell tool 绑定**：skill 以 `skill_reference` 挂进 shell tool 的执行环境
- **脚本真的会跑**：`container_auto` 模式下平台自动管理容器，模型通过 shell 命令实际执行 skill 里的脚本（也可选 local shell 模式在自己机器上执行）

```python
response = openai.responses.create(
    model="gpt-5.5",
    tools=[{
        "type": "shell",
        "environment": {
            "type": "container_auto",
            "skills": [{"type": "skill_reference", "skill_id": "<skill_id>"}],
        },
    }],
    input="Use the csv-insights skill to summarize report.csv.",
)
```

**`container_auto` 的环境规格**（OpenAI shell tool 官方文档）：Debian 12 容器，工作目录 `/mnt/data`，预装 Python 3.11、Node.js 22.16、Java 17、Go 1.23、PHP 8.2、Ruby 3.1；无 `sudo`，不支持交互式 TTY；**默认无出站网络**——出网需组织管理员配置域名 allowlist，并在请求中显式传 `network_policy`。对 skill 作者的直接推论：**skill 里的 python/nodejs 脚本真的会执行**（bundle 整包复制进容器，模型经 shell 命令运行 `scripts/`），但要按这份预装清单写——运行时 `pip install` 默认因断网失败，第三方依赖要么随 bundle 自带（纯文件形式），要么走 network allowlist。

另有 **local shell 模式**：模型只产生 `shell_call`（命令文本），由你在自己控制的运行时执行并回传 stdout/stderr/exit code——环境完全自控，skill 从本地路径挂载（此模式不支持 `skill_reference`）。

**可用范围**：shell tool 是**平台实现的内置工具**，不是"支持 Responses API 就自动有"。OpenAI 平台可用；Azure 侧，Microsoft Learn 已有正式文档（2026-06 上线）给出 Azure OpenAI **v1 endpoint**（`https://<resource>.openai.azure.com/openai/v1/`）的完整用法（示例模型 gpt-5.5），但明确注明 "Skills require an Azure OpenAI API version that supports the shell tool"——依赖 API version 与模型部署支持，并非所有区域/版本无条件可用（更早的 Microsoft Q&A 曾答复 Azure OpenAI 不支持 shell tool，属 rollout 时间差）。其他兼容 Responses API 协议的推理服务（如 vLLM）不带此工具。

这条路径与 Anthropic "skill 带 scripts、由 harness 执行"的模式是对齐的。但注意：**shell tool 目前不在 Foundry agent 的工具目录里**（内置工具与 MCP/OpenAPI/A2A/Toolbox 等自定义工具中均无 shell）——即这条路径当前只能从裸 Responses API 调用走通，不能挂到 prompt agent 的定义上。这是第五节矛盾的关键伏笔。

---

## 二、Skill 的存储与版本机制：Skills API

Skill 通过 Foundry 的 **Skills API**（preview，所有调用需要 `Foundry-Features: Skills=V1Preview` header）中心化存储，版本模型与 toolbox 一致——**不可变版本 + 默认版本指针**：

- 每次更新创建一个新的不可变 `SkillVersion`；父 `Skill` 对象跟踪 `default_version`（生效版本）和 `latest_version`
- 更新流程：创建新版本 → 测试 → 提升为 default——**全程不改任何 agent 代码**
- 创建方式：JSON inline content 或上传含 SKILL.md 的 ZIP（可带附属资源文件）
- 管理入口：REST API、Python/.NET/JS SDK、`azd ai skill` 命令、VS Code Foundry Toolkit（含预置 skill 目录：docx/pptx/xlsx/pdf、canvas-design、doc-coauthoring 等）
- 限制：**不支持私网**——Skills API 无法通过 private endpoint 访问，禁用公网的 Foundry 资源用不了

```bash
azd ai skill create greeting --file ./SKILL.md --no-prompt      # 创建
azd ai skill update greeting --file ./SKILL.md --no-prompt      # 新版本（自动提升为 default）
azd ai skill update greeting --set-default-version v2 --no-prompt  # 仅重指默认版本（可用于回滚）
azd ai skill download greeting --output-dir ./downloaded        # 下载内容
```

---

## 三、两种交付模式：谁负责把 skill 装进上下文

Skill 存在 Foundry 里之后，送达 agent 有两条路，**两条路的加载责任方都在 agent 侧，不在平台**：

### 模式 A：挂载到 Toolbox（MCP Resources，SEP-2640）

Skill 附加到 toolbox 版本后，在 toolbox 的 MCP endpoint 上以 **MCP Resource** 的形式暴露（遵循 MCP 的 Skills 扩展规范 SEP-2640）——注意，**skill 不是 callable tool**，client 不能 `tools/call` 它，而是：

1. `resources/list` —— 启动时发现所有挂载的 skill
2. `resources/read` —— 按需下载 skill 内容

任何支持 MCP Resources 协议的 client——GitHub Copilot、Claude Code、自己写的 agent harness——都能这样消费，不需要 Foundry SDK。Microsoft Agent Framework 提供了现成组件 `AgentSkillsProvider`（`AgentSkillsProviderBuilder.UseMcpSkills`），实现 Agent Skills 的 **progressive disclosure** 三步：

1. **Advertise**：把 skill 的 name + description 注入 system prompt，让模型知道有哪些 skill 可用
2. **Load**：模型判断某个 skill 相关时，才拉取完整 skill body
3. **Read resources**：skill 带附属文档时按需读取

按需加载而非全量注入，控制 token 消耗——这是 Agent Skills 规范的核心设计。

约束：toolbox 引用的 skill 必须在**同一个 Foundry project** 内，不支持跨项目。

### 模式 B：直接注入 Hosted / Local Agent

用 Skills API 把 skill 下载到 agent 项目目录（如 `skills/greeting/SKILL.md`），agent 启动时读取并作为额外 system instructions 注入每个 session。例如 GitHub Copilot SDK 的 `skill_directories` 参数就是干这个的。这条路不需要 toolbox，适合想把特定 skill 版本与 agent 代码打包锁定的场景。

**两种模式的共同点**：平台只负责存储和分发，"读出来、注入上下文"这一步永远由 **agent 自己的 harness 代码**完成。这个共同点正是第五节 Prompt Agent 困境的根源。

---

## 四、Toolbox 的版本发布机制：为什么"添加 skill 后无法发布"

Toolbox 是 Foundry 的工具集合抽象：一组工具（+skill）打包在一个名字下，通过统一的 MCP endpoint 供多个 agent 消费，解决"同一套工具在每个 agent 里重复接线"的 integration sprawl 问题。

### 4.1 不可变版本 + 显式提升

Toolbox 的底层设计与 skill 一致——**immutable versions + explicit promotion**：

```
azd ai toolbox skill add ...        → 创建一个新 draft version（不自动生效）
                                       可通过 /toolboxes/{name}/versions/{id}/mcp 单独测试
azd ai toolbox publish <toolbox> <version_id>
                                    → 把该版本提升为 default_version
消费端 {project_endpoint}/toolboxes/{name}/mcp
                                    → 永远只服务 default_version
```

官方文档的两句关键原话：

> mutating 命令（`skill add/remove`、`connection add/remove`）"always create a new version **without automatically promoting it**"

> "Changes from the imperative `azd` skill commands **don't take effect for MCP clients until you promote** the new version with `azd ai toolbox publish`."

### 4.2 回答两个实际疑问

**"默认添加 skill 后没法发布"**——add 之后拿到的是一个未提升的 draft version，必须显式执行 `azd ai toolbox publish <toolbox> <version_id>` 才生效。这不是 bug，是设计：线上版本（default_version）始终稳定，变更先在独立 endpoint 测试再切换。如果 portal 上发布按钮不可用，很可能叠加了 Skills API 处于 preview 的因素——portal 对 preview 功能（需要 `Foundry-Features: Skills=V1Preview` header）的支持可能滞后于 API。

**"发布之后再添加是否 work"**——work，且机制完全相同：再 add 会生成又一个新 draft version，旧的 default_version 继续对外服务不受影响，再 publish 一次即切换。每次变更都要再 publish 一次。另注意 default_version 不可删除。

### 4.3 Toolbox 不支持任意自定义代码工具

Toolbox 只支持 **12 种预定义 tool 类型**：MCP、Web Search、Code Interpreter、File Search、Azure AI Search、OpenAPI、A2A、Fabric IQ、Tool Search、Work IQ、Browser Automation、Bing Custom Search。**没有"上传一段 Python 当 tool"的入口**。自定义逻辑要进 toolbox，只能先包成 MCP server 或 OpenAPI 服务（环境自管），再作为连接注册进来。

---

## 五、Prompt Agent vs Hosted Agent：谁能用 Skill，为什么

### 5.1 能力现状：官方文档的矛盾信号

先厘清一个容易混淆的分层——**skill 的管理面与消费面是两回事**：

- **管理面**（创建/版本/下载）：REST API、Python/.NET/JS SDK、`azd ai skill` CLI、VS Code Foundry Toolkit 全部可用，**与 agent 类型无关**
- **消费面**（把 skill 绑到 agent 上）：这才是 prompt/hosted 分野所在

消费面上，把三条潜在绑定路径逐一核对（初核 2026-07-30；最近复核 2026-07-31，核验记录见 5.1.1）：

| 路径 | Prompt Agent | Hosted Agent |
|---|---|---|
| 模式 A（toolbox 挂 skill） | ❌ **静默无效**——托管运行时处理 MCP tools（`tools/list`/`tools/call`），没有文档表明它会读 MCP Resources 并注入上下文 | ✔️ 自己实现 SEP-2640 client 逻辑，或直接用 Agent Framework 的 `AgentSkillsProvider` |
| 模式 B（直接注入） | ❌ 没有可编程的启动代码，无处读 SKILL.md | ✔️ 启动时读 `skills/` 目录注入（如 Copilot SDK `skill_directories`） |
| 路径 C（Responses API shell tool，见 1.1） | ⚠️ API 层存在（`skill_reference` 绑定 + `container_auto` 执行），且 prompt agent 底层就是 Responses API——但 **agent 工具目录里没有 shell tool**，无法从 agent 定义挂载 | ✔️ 容器代码可直接调 Responses API，天然可用 |
| 变通 | 手动把 skill instructions 合并进 `instructions` 字段（功能等效，但失去中心化版本管理——skill 的核心价值） | 不需要变通 |

skills 操作文档的信号一致：功能支持矩阵的列是 REST API / Python / .NET / JavaScript / VS Code / Toolbox / Hosted agent，**压根没有 prompt agent 这一列**；所有 skill 消费示例（Agent Framework sample、Copilot SDK sample）全部是 hosted agent。

但这里必须如实记录一个矛盾：**agents overview 的对比表给 Prompt Agent 标了 "Skill support: Yes"**（同时 "Runtime code to maintain: None"）。两份文档同日更新却互相打架。合理的解读是："Yes" 要么是超前于 skills 文档的 roadmap 表述，要么指路径 C 这个 API 层能力——无论哪种，**截至最近核验都不存在一条文档化的具体操作能把 skill 绑到 prompt agent 上**。另外 "Runtime code to maintain: None" 与 skill 支持并不矛盾——它说的是你不用维护 agent 应用代码（harness 归平台），与"平台 harness 是否实现了 skill 加载"是两个正交维度。这个矛盾哪边先收敛，值得跟踪。

### 5.1.1 核验记录（持续更新，后续复查在此追加）

> 每次复核官方文档后在此追加一条记录：核验日期、文档版本、结论是否变化、证据链接。矛盾收敛（任一路径落地或 overview 改标注）时更新本节并同步修订 5.1 表格与小结。

**2026-07-31 复核**（skills how-to 页面版本：2026-07-24 更新）——**结论不变，仍是"宣称有、路径无"**：

- [agents overview 对比表](https://learn.microsoft.com/en-us/azure/foundry/agents/overview) 仍标 `Skill support: Yes | Yes`——只有一行字，无链接、无代码、无绑定说明
- [skills how-to](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/skills) 的 Feature support 矩阵列仍为 REST API / Python / .NET / JavaScript / VS Code / Toolbox / **Hosted agent**，**没有 Prompt agent 列**；交付模式原文仍只有 "Attach to a toolbox" 与 "download directly into a **Hosted or local agent** project"
- 唯一端到端消费示例仍是 hosted agent：GitHub Copilot SDK 样例，`main.py` 用 `skill_directories` 参数从本地 `skills/` 目录读 SKILL.md——前提是自己写加载代码，prompt agent 封闭 harness 无法复刻
- [Responses API shell tool 文档](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/skills) 与 1.1 节代码示例逐项吻合（`container_auto` + `skill_reference`、model `gpt-5.5`、input 原文一致），并确认 local shell 模式存在；shell tool 仍不在 agent 工具目录
- **干扰项排除**：[Use the Microsoft Foundry Skill in coding agents](https://learn.microsoft.com/en-us/azure/foundry/how-to/develop/use-microsoft-foundry-skill) 表格里出现的 "Prompt agent"，是 `microsoft-foundry` 元 skill 帮 GitHub Copilot/Claude Code 等 coding agent **创建** prompt agent，不是 prompt agent **消费** skill——方向相反，不构成反例
- 待决定性验证（区分 roadmap 超前 / 文档错误 / 未文档化路径三种解释）：portal 创建 prompt agent 看有无 skill 挂载入口；或 CreateAgent API 强行传 `skills` 字段看是否报 `invalid_payload`

**2026-07-30 初核**：三条绑定路径逐一核对，均不通，详见 5.1 正文表格。

### 5.2 关键澄清：限制点不在"执行环境"，在"谁来加载"

一个容易走偏的推理是："hosted agent 有容器、有 venv、能装依赖，所以能跑 skill；prompt agent 没有执行环境，所以不能。"——**这个因果链不成立**，因为第一节已经说明 Agents 侧的 skill 是纯文本，加载 skill 只需要"读文本 + 拼进 system prompt"，不需要任何执行环境。（Responses API 路径的 skill 确实需要执行环境，但那条路平台自己用 `container_auto` 就解决了——依然不构成 prompt agent 用不了 skill 的理由。）

真正的原因是**加载协议的实现权**：skill 加载（SEP-2640 resources 消费 + progressive disclosure 注入）需要 harness 实现相应的 client 逻辑。Hosted agent 的 harness 归你所有，缺什么补什么；Prompt agent 的 harness 是平台的封闭代码，它没实现，你就没有任何注入点。

### 5.3 Agent = Model + Harness：控制权分层

先给 harness 一个正式定义。OpenForge RL 论文（arXiv:2607.21557）把 harness 定义为**编排脚手架（orchestration scaffold）**——包在模型外面、把"单次推理"变成"有状态多步过程"的那一层，负责多轮上下文管理、工具调用编排、控制流（subagent、planning、skills）与外部系统接入（MCP、浏览器、GUI），典型实现如 Claude Code、Codex CLI。完整分层是 **Model → Harness → Environment**：模型只生成 token，harness 把生成变成 agent 行为，environment 提供执行与反馈。两条容易混淆的概念边界：

- **Harness 不是语言运行时**。语言运行时（CPython、.NET CLR）执行确定性代码指令，规范是语法标准；harness "执行"的是 LLM 的决策流（发 prompt → 解析 tool call → 调工具 → 结果回填 → 再问模型），规范是**行为契约**——system prompt 结构、工具协议（function calling schema / MCP）、消息格式、终止与人工介入策略。类比：模型 ≈ CPU，harness ≈ 操作系统/调度器，工具与环境 ≈ 外设。harness 本身用什么语言实现是对使用者不可见的细节，同一套 harness 语义可以有多语言实现（Claude Agent SDK 的 Python/TypeScript 版行为契约一致）。
- **Harness 是可插拔的行为引擎**。同样的模型和工具接到不同 harness 上，agent 的行为语义完全不同。Copilot Studio 把这一点做成了显式产品选项——三种 harness 三选一：Copilot Chat Harness（M365 Copilot 定制 / Declarative Agents）、Standard Harness（对话式 AI 与确定性业务流程）、GitHub Copilot Harness（复杂推理、多步规划的自主 agentic loop）。选 harness 就是选 agent 的行为语义，而不是选实现语言。（注意"可插拔"是平台内部承诺，不等于配置跨 harness 可移植——agent 定义各元素的可移植性分层见 6.2。）

用 Agent=Model+Harness 框架看，prompt/hosted 的差异一目了然。**每个 agent 都有 harness**——prompt agent 的 harness 是 Foundry 托管运行时（MCP tools 调用循环、tool approval、thread 管理、content filter、tracing 都在里面），并不弱。区别从来不是"有没有 harness"，而是 **harness 的所有权和可编程性**：

| | Prompt Agent | Hosted Agent |
|---|---|---|
| Harness 是什么 | Foundry 托管运行时（平台代码） | 你自己的容器代码（Agent Framework / Copilot SDK / 裸写） |
| 谁能改 harness | 只有 Microsoft | 你 |
| Skill 加载能力 | 平台没实现 → 你无法补 | 自己写或用现成组件 |
| 新能力跟进速度 | 等平台排期 | 社区规范发布当天就能跟进 |

Claude Code、GitHub Copilot 能直接消费 Foundry toolbox 的 skills，正是因为它们是"别人家的自有 harness"——SEP-2640 是开放协议，**谁的 harness 谁做主**。

### 5.4 托管 harness 为什么迟迟不做：不是难，是平台化顾虑

技术上 `resources/list` + `resources/read` + 拼 system prompt 比 tool calling 循环简单得多。托管运行时不做，更可能是平台功能的配套问题：

1. **计费与上下文膨胀**：progressive disclosure 需要"模型决定何时加载 skill body"的通用策略——全量注入的 token 成本谁扛、按需加载的判断逻辑放哪，多租户运行时要给出一致答案
2. **安全审查面**：skill 是任意自然语言指令，等于给托管 runtime 开一条"第三方内容直通 system prompt"的注入通道。文档里那句 Caution——"Customers are responsible for understanding the behaviors of any skills deployed"——就是这个焦虑的体现
3. **发布节奏**：整套 Skills API 还是 preview，先在"用户自担风险"的 hosted/BYO-harness 侧铺开验证规范，再下沉到托管 runtime，是平台功能的典型 rollout 顺序

---

## 六、执行环境全景："代码在哪跑"的对照

把"skill 关联的 script 到底在哪执行"放进完整的执行环境版图（Foundry 侧四类）：

| 执行位置 | 环境定义方式 | 依赖管理 | 隔离性 | 适用 |
|---------|------------|---------|--------|------|
| **Hosted Agent 容器** | Dockerfile（linux/amd64，端口 8088 Responses 协议）或提交 zip 源码由 Foundry 构建 | requirements.txt 等完全自定义；本地 `azd ai agent run` 首次运行装依赖，本地 venv 开发者自理 | per-session VM 级 sandbox，持久文件系统，scale-to-zero | skill 指令中的自定义脚本、任意运行时逻辑 |
| **Responses API shell 容器（`container_auto`）** | 平台管理的 Debian 12 容器（Python 3.11 / Node 22.16 / Java 17 / Go 1.23 等预装，规格见 1.1） | 镜像不可定制；依赖随 skill bundle 自带，或配 network allowlist 后安装 | 平台容器隔离；**默认无出站网络** | shell tool 挂载的 skill 脚本真实执行 |
| **Code Interpreter（toolbox 工具）** | 平台托管 Python 沙箱 | 不可自定义 | 注意：hosted agent 经 toolbox 使用时**缺少用户级隔离**（文档明示的限制） | 临时计算、数据处理 |
| **外部 MCP / OpenAPI 服务** | 你自己的基础设施 | 完全自管 | 自己负责 | 企业系统集成、重依赖的自定义工具 |

一个实用推论：如果一个 skill 的指令依赖特定 Python 包（比如 pptx 生成），那么消费这个 skill 的 hosted agent 的 **Dockerfile 里就要预装这些包**——skill 与 agent 环境之间的这层隐式契约，目前完全靠人工对齐，平台不做校验。这是"skill 声明依赖 → 平台自动准备环境"这类能力的空白点，也是与 Anthropic skill（可带 scripts 且由 harness 执行）的关键差距。

### 6.1 跨 harness 对照：skill 里到底能放什么脚本

把视野从 Foundry 放大到主流 harness。核心判断链：**harness 有没有 shell/execution tool → shell 连的是什么环境（本地机器 / 固定容器 / 可定制容器）→ 环境里有什么引导器（python/node/uv/npx）→ 脚本按引导器规格写**。skill 里的脚本是被动文本，能不能跑、怎么跑，完全由 harness 下面的执行环境决定：

| Harness | 执行环境 | 你能控制的部分 | 脚本策略 |
|---|---|---|---|
| **Claude Code / Copilot CLI（本地）** | 你的机器 | 一切（装包、换版本、加工具） | 什么都能放。模型靠三条途径知悉环境：SKILL.md/CLAUDE.md 显式声明、主动探测（`which`/`--version`）、报错-修复循环。声明依赖 + 自举式脚本可省掉探测轮次 |
| **GitHub Copilot coding agent（云端）** | GitHub Actions 临时 runner（`ubuntu-latest`，自带 python/node/go 等全套工具链），任务级 ephemeral | [Customizing the development environment for Copilot coding agent](https://docs.github.com/copilot/how-tos/use-copilot-agents/coding-agent/customize-the-agent-environment)：`copilot-setup-steps.yml` 预装依赖、换更大 runner 或自托管 runner | 按 runner 规格写；依赖写进 setup-steps。[防火墙](https://docs.github.com/en/copilot/customizing-copilot/customizing-or-disabling-the-firewall-for-copilot-coding-agent)默认启用 recommended allowlist（可加自定义 host 或关闭），被拦截的请求在 PR 里出 warning |
| **Responses API shell tool（`container_auto`）** | 平台 Debian 12 容器（规格见 1.1） | 几乎不可定制；仅 `network_policy` 可配 | 按预装运行时清单写；第三方依赖随 bundle 自带；默认断网，`pip install` 会失败 |
| **Foundry Hosted Agent** | 你自己的容器 | Dockerfile 全权 | skill 依赖预装进镜像（上表所述隐式契约的人工对齐点） |
| **无 shell tool 的 harness**（Foundry prompt agent、Copilot Studio Chat/Standard Harness） | 无通用执行手段 | 无 | 脚本只有文本价值：作为参考实现让模型照写，或喂给 Code Interpreter（受限于平台沙箱固定预装包） |

**GitHub Copilot coding agent 环境补充**：`copilot-setup-steps.yml` 就是一个**标准 GitHub Actions workflow 文件**——GitHub 没有为 coding agent 发明新的环境定义机制，直接复用了 Actions 基础设施：

```yaml
# .github/workflows/copilot-setup-steps.yml
jobs:
  copilot-setup-steps:          # job 名必须是这个，Copilot 靠它识别
    runs-on: ubuntu-latest      # 换更大 runner / 自托管也在这里
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci             # 预装依赖
```

与普通 CI workflow 的四点差别：

1. **触发方式不同**：不是 push/PR 触发，而是每次派任务时**先跑 setup job，跑完 Copilot 才进场**——setup 阶段归你（确定性脚本），执行阶段归 agent（模型决策）
2. **产物是"热环境"不是镜像**：runner 是 ephemeral 的，每次任务现场重建环境、任务结束即销毁——效果等价于"每次任务前 docker build 一遍"，所以官方建议配 cache（`actions/cache`、`setup-*` 内置缓存）压时间
3. **防火墙只管 agent 阶段**：setup steps 阶段出网不受 Copilot 防火墙限制（`npm ci`/`pip install` 正常），agent 开始干活后出网才走 allowlist——依赖必须在 setup 阶段装完的原因就在这
4. **可当普通 workflow 调试**：改文件 push 后会自动跑一次，也可手动 trigger

另注意会话硬上限 **59 分钟**，不可延长（可用 `timeout-minutes` 调短）。

**易混淆：Copilot Studio 的 GitHub Copilot Harness ≠ coding agent 的环境**。Copilot Studio 新增的 GitHub Copilot Harness（2026-08-03 上线，第三种 agent 构建模式，与 Copilot Chat Harness、Standard Harness 并列）是把 GitHub Copilot 的 agentic loop 经 Copilot SDK 嵌入作引擎（SDK 官方描述："exposes the same engine behind Copilot CLI"）——**harness 同源，environment 不同**：它跑在微软托管的 Copilot Studio / Power Platform 基础设施上，`copilot-setup-steps.yml` 与仓库级防火墙是 GitHub 仓库级配置，对它**不适用**；其执行环境规格（沙箱、脚本执行能力、shell tool 等价物）截至 2026-07-31 尚无公开文档。这正是 Model → Harness → Environment 分层的活例子：**同一个 harness 可以挂在不同 environment 上，环境文档不能跨着引用**。

写"环境自适应" skill 脚本的三条通用策略（按优先级）：

1. **自举式脚本**：依赖解析内置于脚本本身，环境上只需有引导器——Python 用 `uv run` + PEP 723 inline metadata（脚本头部声明依赖，uv 自动建临时环境装包），Node 用 `npx -y` 免安装执行
2. **最低公分母**：能用 bash + 语言标准库解决的不引第三方包，零依赖脚本在任何环境都能跑
3. **显式声明**：SKILL.md 写清 requires 与安装命令，让模型照做而非试错探测

托管沙箱额外两坑：**默认断网**（依赖必须预装进镜像或随 bundle 自带，运行时安装会失败）与**无状态**（每次任务容器可能全新，不能假设上次装过的包还在）。

### 6.2 "harness 可插拔"的边界：agent 定义元素的跨 harness 可移植性

5.3 节说 harness 是可插拔的行为引擎，容易引出一个误读："我定义一份 agent + subagent + skill + hook 的配置，就能从 GitHub Copilot 直接换到 Claude Code 用。"——**不能整体搬**。"可插拔"的本义是**平台内部**的：Copilot Studio 的三种 harness 都是微软自己的，平台保证了 agent 定义与引擎的适配层；它不承诺配置能跨到别家 harness。

用户侧的真实可移植性要按元素拆开看，差异极大——取决于该元素是"开放规范"还是"harness 内部 API 的暴露"：

| 元素 | 可移植性 | 原因 |
|---|---|---|
| **Skill** | ✅ 高，基本直接搬 | 有开放规范 [agentskills.io](https://agentskills.io)（SKILL.md + frontmatter），Claude Code、GitHub Copilot、Foundry、OpenAI 均兼容——目前唯一真正跨 harness 的元素 |
| **MCP server / tool** | ✅ 高 | MCP 是开放协议，server 完全可复用；仅各 harness 的注册配置文件格式略有差异 |
| **Instructions / memory** | 🟡 内容可搬，接线要改 | `CLAUDE.md`（Claude Code）vs `AGENTS.md`（Codex/Copilot 阵营）——内容通用，文件名与加载语义各家不同 |
| **Subagent** | 🟠 低 | 无跨 harness 规范。Claude Code 的 `.claude/agents/*.md` 是私有格式，且语义绑定 harness 能力（独立 context window、工具白名单、model 路由）——prompt 内容可复用，接线必须重写 |
| **Hook** | ❌ 几乎为零 | Hook 挂的是 harness **内部生命周期事件**（PreToolUse、SessionStart 等），事件模型本身就是某个 harness 的实现细节，换 harness 事件就不存在了 |
| **Plugin** | ❌ 私有分发格式 | Plugin 是上述元素的打包（skills + agents + hooks + MCP 配置），但打包格式是 harness 私有的——打包不解决内容物的可移植性 |

判断准则：**离模型越近越可移植，离 harness 引擎越近越不可移植**。Skill 本质是"给模型看的文本 + 给 shell 跑的脚本"，模型和 bash 通用，所以可移植；MCP 是 harness 与外部世界之间的开放协议，双方解耦，所以可移植；subagent/hook 是对 harness **内部控制流**的编程——调用的是引擎私有 API，换引擎自然失效。类比浏览器：skill/MCP 像 HTML/HTTP（标准，处处能用），hook/subagent 像 Chrome 扩展 API（换 Firefox 就要重写）。Agent Skills 和 MCP 相当于这个领域刚形成的"Web 标准"，但只覆盖知识与工具两层；控制流（subagent、hook、plugin）仍在各家私有阶段。

因此"一份 YAML 跨 harness 即插即用"目前不存在。社区的现实解法是**编译式**的：维护一份源定义，用工具生成各 harness 的私有格式（一份 agent 描述 → 分别生成 `.claude/agents/*.md` 与 Copilot custom agent 配置）——内容单源，接线各自编译。

---

## 七、成本模型：调用计费相同，container compute 买的是控制权

overview 对比表给出的成本模型：

| | Prompt Agent | Hosted Agent |
|---|---|---|
| Cost model | Per-call inference + tool usage | Per-call inference + tool usage **+ container compute** |

两个要点：

**"Per-call inference + tool usage" 两者是同一套计费。** 两类 agent 最终都打到同一个 Responses API 上：模型 token 按所选 deployment 的单价计费，工具（web search、code interpreter 等）按各自 meter 计费——同一个模型、同样的调用量，这部分账单没有差别。

但"单价相同"不等于"账单相同"，差异在**消耗量的控制权**：

- **Prompt agent**：每次调用注入什么、注入多少（instructions、tool schemas、对话历史裁剪策略）由平台 harness 决定，你无法优化 token 消耗模式
- **Hosted agent**：harness 是你的代码——上下文裁剪、prompt 缓存、模型路由（简单请求走便宜模型）、按需加载 skill（progressive disclosure 本身就是 token 优化手段）全部可做

**Container compute 是为 harness 控制权付的钱。** 结合第五节的控制权分层：hosted agent 多付的容器费用，买到的正是"改 harness 的权力"——skill 加载能力、token 优化空间、新协议即时跟进，全在这份权力里。scale-to-zero 让这笔钱在低流量场景接近零，但生产负载下是真实成本——选型时的判断标准应是"是否需要 harness 控制权"，而不只是"要不要多付钱"。

---

## 八、小结

1. **Agents 侧 skill 是文本不是代码**：Skills API 交付的 SKILL.md 只注入上下文，平台不执行 skill 内代码；执行环境永远是 agent 的（hosted 容器 / Code Interpreter / 外部服务）。**例外是 Responses API 的 shell tool 路径**——skill 是带 scripts/ 的文件包，python/nodejs 脚本在平台容器（`container_auto`：Debian 12、多语言运行时预装、默认断网）真实执行。shell tool 是平台内置工具而非 Responses API 规范自带：OpenAI 平台可用，Azure OpenAI 经 v1 endpoint 有条件可用（依赖 API version 与模型支持）。
2. **"加了发不了"是设计不是 bug**：toolbox 与 skill 都是不可变版本 + 显式 publish；`skill add` 只产生 draft version，必须 `azd ai toolbox publish` 才生效；发布后再添加照常 work，每次变更再 publish 一次。
3. **Prompt Agent 的 skill 支持是文档级矛盾**：overview 标 "Skill support: Yes"，但三条绑定路径（toolbox 消费 / 直接注入 / shell tool）截至 2026-07-31 复核没有一条文档化可走通（核验记录见 5.1.1）——skills 文档功能矩阵没有 prompt agent 列，shell tool 不在 agent 工具目录。根因是 harness 控制权：加载 skill 需要 harness 实现相应 client 逻辑，平台封闭代码没实现你就没有注入点。变通只有手动把 skill 文本合入 instructions（失去版本管理价值）。
4. **控制权决定能力边界，也决定成本结构**：调用侧计费（inference + tool usage）两类 agent 完全相同；hosted agent 多付的 container compute 买的是"改 harness 的权力"——skill 加载、token 优化、新协议即时跟进。skill 复用是硬需求时，用 Agent Framework 包一层薄 hosted agent 是当前最短路径。
5. **成熟度提醒**：Skills API 与 toolbox skill 挂载均为 preview（`Foundry-Features: Skills=V1Preview`），不支持私网，生产依赖需锁版本评估。

---

## 九、开放问题（待验证/后续讨论）

1. **Prompt Agent 的 skill 支持如何收敛**：overview 已标 Yes 但无绑定路径——是托管运行时实现 SEP-2640 resources 消费，还是把 shell tool 加进 agent 工具目录（路径 C 下沉），哪条先落地；实现后 progressive disclosure 的 token 计费策略。（跟踪方式：定期复核并追加到 5.1.1 核验记录，最近复核 2026-07-31 状态未变；决定性验证靠实测 portal 挂载入口 / CreateAgent API `skills` 字段。）
2. **Skill 依赖声明**：SKILL.md 是否会演进出"声明所需包/工具"的元数据，让平台或 harness 自动校验/准备执行环境（对齐 Anthropic skill 的 scripts 能力）。
3. **Portal 发布体验**：portal 侧对含 skill 的 toolbox 版本发布支持是否随 preview 推进补齐；"添加 skill 后无法发布"的具体报错路径值得实测记录。
4. **Skill 治理**：skill 内容直通 system prompt 的注入面，企业场景如何做 skill 内容审查与准入（Prompt Shield 是否覆盖 skill 注入的内容）。
5. **跨项目复用**：skill 与 toolbox 的同项目约束是否会放开；组织级 skill 目录（类似 VS Code Toolkit 预置目录）的治理模型。
6. **Copilot Studio GitHub Copilot Harness 的执行环境**：2026-08-03 上线后核验其官方文档——托管环境规格、能否执行 skill 脚本、有无 shell tool 等价物、与 coding agent（Actions runner）环境的差异（见 6.1 易混淆提示）。

---

## 参考

- [Use skills with Microsoft Foundry agents (preview) — Microsoft Learn](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/skills)（页面版本 2026-07-24；核验记录见 5.1.1）
- [What are Microsoft Foundry agents? (overview 对比表) — Microsoft Learn](https://learn.microsoft.com/en-us/azure/foundry/agents/overview)
- [Use skills with the Responses API (shell tool) — Microsoft Learn](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/skills)
- [Shell tool guide（container_auto 环境规格与 network_policy）— OpenAI](https://developers.openai.com/api/docs/guides/tools-shell)
- [Skills in the OpenAI API — OpenAI Cookbook](https://developers.openai.com/cookbook/examples/skills_in_api)
- [Customizing the development environment for Copilot coding agent — GitHub Docs](https://docs.github.com/copilot/how-tos/use-copilot-agents/coding-agent/customize-the-agent-environment)
- [Customizing or disabling the firewall for Copilot coding agent — GitHub Docs](https://docs.github.com/en/copilot/customizing-copilot/customizing-or-disabling-the-firewall-for-copilot-coding-agent)
- [About GitHub Copilot cloud agent（Actions 环境、59 分钟会话上限）— GitHub Docs](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent)
- [GitHub Copilot SDK（"the same engine behind Copilot CLI"，Copilot Studio GitHub Copilot Harness 的嵌入通道）](https://github.com/github/copilot-sdk)
- [OpenForge RL: Train Harness-native Agents in Any Environment（harness 正式定义）— arXiv:2607.21557](https://arxiv.org/html/2607.21557v1)
- [Use the Microsoft Foundry Skill in coding agents — Microsoft Learn](https://learn.microsoft.com/en-us/azure/foundry/how-to/develop/use-microsoft-foundry-skill)（易混淆干扰项：元 skill 创建 agent，非 agent 消费 skill）
- [Toolbox for Microsoft Foundry agents — Microsoft Learn](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/toolbox)
- [Building Agents in Production with Toolbox, Skills, and Tool Search — Microsoft Community Hub](https://techcommunity.microsoft.com/blog/azuredevcommunityblog/building-agents-in-production-with-toolbox-skills-and-tool-search/4537969)
- [Agent Skills 规范](https://agentskills.io)、[MCP Skills 扩展 SEP-2640](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2640)
- [Skills in Toolbox C# sample（Agent Framework + AgentSkillsProvider）](https://github.com/microsoft-foundry/foundry-samples/tree/main/samples/csharp/hosted-agents/agent-framework/foundry-toolbox-mcp-skills)
- [GitHub Copilot SDK skill_directories sample](https://github.com/microsoft-foundry/foundry-samples/tree/main/samples/python/hosted-agents/bring-your-own/invocations/github-copilot)
- 相关笔记：[[Foundry Agent 全面对比：Prompt Agent、Hosted Agent 与 Workflow Agent 的能力、治理与场景选型]]、[[Azure Copilot 生态全景：Skills、MCP Server 与 Copilot Agents 的协作实践]]
