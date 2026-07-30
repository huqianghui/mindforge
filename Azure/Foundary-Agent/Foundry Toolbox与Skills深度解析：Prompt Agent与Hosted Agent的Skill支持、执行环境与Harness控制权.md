---
title: Foundry Toolbox 与 Skills 深度解析：Prompt Agent 与 Hosted Agent 的 Skill 支持、执行环境与 Harness 控制权
created: 2026-07-30
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
description: 从"给 Agent 添加 skill 后无法发布"的实际困惑入手，梳理 Foundry Skills 的本质（SKILL.md 文本而非可执行代码）、Toolbox 的不可变版本与显式发布机制、两种 skill 交付模式（toolbox MCP Resources 与直接注入）、Prompt Agent 与 Hosted Agent 在 skill 加载上的能力差异，最终落到 Agent=Model+Harness 框架下的控制权分层
---

# Foundry Toolbox 与 Skills 深度解析：Prompt Agent 与 Hosted Agent 的 Skill 支持、执行环境与 Harness 控制权

> 本文源于两个实际困惑的排查（2026-07-30，基于 Microsoft Learn skills/toolbox 官方文档核对）：
> ① 给 Agent 的 toolbox 添加 skill 后为什么无法发布？发布之后再添加是否 work？
> ② Skill 里如果包含 script，它的执行环境（python venv、依赖安装）由谁管理？Prompt Agent 为什么用不了 skill？
> 三类 Agent 的全景对比（Memory/Planner/治理/Voice）见姊妹篇 [[Foundry Agent 全面对比：Prompt Agent、Hosted Agent 与 Workflow Agent 的能力、治理与场景选型]]。

---

## 一、先修正前提：Foundry 的 Skill 是文本，不是可执行代码

理解后面所有问题的钥匙是这一句：**Foundry 的 skill 从头到尾都是被注入上下文的文本，平台不执行 skill 里的任何代码。**

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

也就是说，执行环境永远是 **agent 的**，不是 skill 的。这和 Anthropic 生态里"skill 可以带 scripts/ 目录、由 harness 在本地 bash 执行"的模式不同——Foundry 当前的 Skills API 只做文本的存储、版本化和分发。

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

### 5.1 能力现状

| | Prompt Agent | Hosted Agent |
|---|---|---|
| 模式 A（toolbox 挂 skill） | ❌ **静默无效**——托管运行时处理 MCP tools（`tools/list`/`tools/call`），没有文档表明它会读 MCP Resources 并注入上下文 | ✔️ 自己实现 SEP-2640 client 逻辑，或直接用 Agent Framework 的 `AgentSkillsProvider` |
| 模式 B（直接注入） | ❌ 没有可编程的启动代码，无处读 SKILL.md | ✔️ 启动时读 `skills/` 目录注入（如 Copilot SDK `skill_directories`） |
| 变通 | 手动把 skill instructions 合并进 `instructions` 字段（功能等效，但失去中心化版本管理——skill 的核心价值） | 不需要变通 |

官方文档的信号也一致：功能支持矩阵里"Attach skills to a toolbox"只有 Toolbox 列打勾，**压根没有 prompt agent 这一列**；文档中所有 skill 消费示例（Agent Framework sample、Copilot SDK sample）全部是 hosted agent。

### 5.2 关键澄清：限制点不在"执行环境"，在"谁来加载"

一个容易走偏的推理是："hosted agent 有容器、有 venv、能装依赖，所以能跑 skill；prompt agent 没有执行环境，所以不能。"——**这个因果链不成立**，因为第一节已经说明 skill 是纯文本，加载 skill 只需要"读文本 + 拼进 system prompt"，不需要任何执行环境。

真正的原因是**加载协议的实现权**：skill 加载（SEP-2640 resources 消费 + progressive disclosure 注入）需要 harness 实现相应的 client 逻辑。Hosted agent 的 harness 归你所有，缺什么补什么；Prompt agent 的 harness 是平台的封闭代码，它没实现，你就没有任何注入点。

### 5.3 Agent = Model + Harness：控制权分层

用 Agent=Model+Harness 框架看，这个差异一目了然。**每个 agent 都有 harness**——prompt agent 的 harness 是 Foundry 托管运行时（MCP tools 调用循环、tool approval、thread 管理、content filter、tracing 都在里面），并不弱。区别从来不是"有没有 harness"，而是 **harness 的所有权和可编程性**：

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

## 六、执行环境全景：三类"代码在哪跑"的对照

把"skill 关联的 script 到底在哪执行"放进完整的执行环境版图：

| 执行位置 | 环境定义方式 | 依赖管理 | 隔离性 | 适用 |
|---------|------------|---------|--------|------|
| **Hosted Agent 容器** | Dockerfile（linux/amd64，端口 8088 Responses 协议）或提交 zip 源码由 Foundry 构建 | requirements.txt 等完全自定义；本地 `azd ai agent run` 首次运行装依赖，本地 venv 开发者自理 | per-session VM 级 sandbox，持久文件系统，scale-to-zero | skill 指令中的自定义脚本、任意运行时逻辑 |
| **Code Interpreter（toolbox 工具）** | 平台托管 Python 沙箱 | 不可自定义 | 注意：hosted agent 经 toolbox 使用时**缺少用户级隔离**（文档明示的限制） | 临时计算、数据处理 |
| **外部 MCP / OpenAPI 服务** | 你自己的基础设施 | 完全自管 | 自己负责 | 企业系统集成、重依赖的自定义工具 |

一个实用推论：如果一个 skill 的指令依赖特定 Python 包（比如 pptx 生成），那么消费这个 skill 的 hosted agent 的 **Dockerfile 里就要预装这些包**——skill 与 agent 环境之间的这层隐式契约，目前完全靠人工对齐，平台不做校验。这是"skill 声明依赖 → 平台自动准备环境"这类能力的空白点，也是与 Anthropic skill（可带 scripts 且由 harness 执行）的关键差距。

---

## 七、小结

1. **Skill 是文本不是代码**：SKILL.md 注入上下文，平台不执行任何 skill 内代码；"skill 的执行环境"不存在，执行环境永远是 agent 的（hosted 容器 / Code Interpreter / 外部服务）。
2. **"加了发不了"是设计不是 bug**：toolbox 与 skill 都是不可变版本 + 显式 publish；`skill add` 只产生 draft version，必须 `azd ai toolbox publish` 才生效；发布后再添加照常 work，每次变更再 publish 一次。
3. **Prompt Agent 用不了 skill 的真因是 harness 控制权**：加载 skill 需要 harness 实现 SEP-2640 client 逻辑；prompt agent 的 harness 是平台封闭代码且尚未实现，你没有注入点——不是它缺执行环境。变通只有手动把 skill 文本合入 instructions（失去版本管理价值）。
4. **控制权决定能力边界**：托管 harness 用可编程性换运维省力，新能力必须等平台排期；自有 harness（hosted agent、Claude Code、GitHub Copilot）对开放协议即时跟进。skill 复用是硬需求时，用 Agent Framework 包一层薄 hosted agent 是当前最短路径。
5. **成熟度提醒**：Skills API 与 toolbox skill 挂载均为 preview（`Foundry-Features: Skills=V1Preview`），不支持私网，生产依赖需锁版本评估。

---

## 八、开放问题（待验证/后续讨论）

1. **Prompt Agent 的 skill 支持时间表**：托管运行时何时实现 SEP-2640 resources 消费；实现后 progressive disclosure 的 token 计费策略。
2. **Skill 依赖声明**：SKILL.md 是否会演进出"声明所需包/工具"的元数据，让平台或 harness 自动校验/准备执行环境（对齐 Anthropic skill 的 scripts 能力）。
3. **Portal 发布体验**：portal 侧对含 skill 的 toolbox 版本发布支持是否随 preview 推进补齐；"添加 skill 后无法发布"的具体报错路径值得实测记录。
4. **Skill 治理**：skill 内容直通 system prompt 的注入面，企业场景如何做 skill 内容审查与准入（Prompt Shield 是否覆盖 skill 注入的内容）。
5. **跨项目复用**：skill 与 toolbox 的同项目约束是否会放开；组织级 skill 目录（类似 VS Code Toolkit 预置目录）的治理模型。

---

## 参考

- [Use skills with Microsoft Foundry agents (preview) — Microsoft Learn](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/skills)（2026-07-30 更新版）
- [Toolbox for Microsoft Foundry agents — Microsoft Learn](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/toolbox)
- [Building Agents in Production with Toolbox, Skills, and Tool Search — Microsoft Community Hub](https://techcommunity.microsoft.com/blog/azuredevcommunityblog/building-agents-in-production-with-toolbox-skills-and-tool-search/4537969)
- [Agent Skills 规范](https://agentskills.io)、[MCP Skills 扩展 SEP-2640](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2640)
- [Skills in Toolbox C# sample（Agent Framework + AgentSkillsProvider）](https://github.com/microsoft-foundry/foundry-samples/tree/main/samples/csharp/hosted-agents/agent-framework/foundry-toolbox-mcp-skills)
- [GitHub Copilot SDK skill_directories sample](https://github.com/microsoft-foundry/foundry-samples/tree/main/samples/python/hosted-agents/bring-your-own/invocations/github-copilot)
- 相关笔记：[[Foundry Agent 全面对比：Prompt Agent、Hosted Agent 与 Workflow Agent 的能力、治理与场景选型]]、[[Azure Copilot 生态全景：Skills、MCP Server 与 Copilot Agents 的协作实践]]
