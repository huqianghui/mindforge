---
title: "Agent Harness"
created: "2026-11-16"
updated: "2026-11-16"
tags:
  - wiki
  - concept
  - agent
  - harness
  - agent-runtime
aliases:
  - "Harness"
  - "agentic harness"
  - "Agent = Model + Harness"
  - "编码 harness"
  - "coding harness"
related:
  - "[[codex-desktop-architecture]]"
  - "[[harness-engineering]]"
  - "[[agent-framework]]"
  - "[[agent-runtime]]"
  - "[[harness-portability-spectrum]]"
  - "[[model-harness-codesign]]"
  - "[[agent-session-control-plane]]"
  - "[[agent-sandbox]]"
---

# Agent Harness

## 摘要

`Agent = Model + Harness`。Harness 是把模型变成能干活的 agent 的那套软件：agent loop、工具路由、上下文管理、权限、重试与验证。它是**运行期的实体**——用 framework 搭出来（LangGraph 写完 loop、规划、工具调用和审批就得到一个 harness），或者拿别人搭好的成品（Claude Code、Codex、GitHub Copilot、OpenCode、Pi）。

Harness 面向模型，决定 agent 怎么思考和行动；framework 面向开发者，是造 harness 的材料（[[agent-framework]]）；runtime 面向基础设施，把 harness 当成一个被托管、可替换的进程（[[agent-runtime]]）。三者常被混用，本页讲 harness 是什么、归谁、和另外两层的边界在哪；怎么把 harness 做好（评测、控制论、五大支柱）归 [[harness-engineering]]，资产换 harness 能否存活归 [[harness-portability-spectrum]]，第一方绑定还是多模型归 [[model-harness-codesign]]，平台怎么从外面驱动 harness 归 [[agent-session-control-plane]]。

## Claims

### Claim: OpenForge 给出 harness 的正式学术定义——orchestration scaffold，Agent = Model + Harness + Environment 三元结构

- **来源**：[[Foundry-Toolbox与Skills解析]]
- **首次出现**：2026-07-30
- **最近更新**：2026-09-12
- **置信度**：0.8
- **状态**：active

> OpenForge 论文（arXiv:2607.21557）把 harness 正式定义为 orchestration scaffold——组织 prompt、管理工具调用、维护交互状态的编排脚手架，并把 Agent 拆成 Model + Harness + Environment 三元：Model 决策、Harness 编排、Environment 提供可执行世界（文件系统、shell、网络）。相比"模型之外的一切"（LangChain）与"信息管道代码"（Meta-Harness），三元结构额外切出 Environment 一层——同一 harness 挂不同 environment（有网/断网容器、真实/沙箱文件系统）行为语义不同，这层区分在托管平台选型时是实打实的约束（如 Responses API shell tool 的 `container_auto` 默认断网）。

### Claim: Agent framework 是 dev-time 概念，harness 是 run-time 实体——framework 是"造 harness 的工具包"

- **来源**：[[2026-08-10-周一]]
- **首次出现**：2026-08-10
- **最近更新**：2026-08-10
- **置信度**：0.75
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾：qmd search 关键词命中的仅为来源文章与本页自身（Notes/ wiki/ paper/ book/），无更新文章反驳

> Agent framework（LangGraph/CrewAI/AutoGen）提供 loop 原语、状态管理、工具注册等零件，但行为语义的关键决策（system prompt、终止条件、context 压缩）留给开发者——你用 framework 的产出物才是 harness；Claude Code / GitHub Copilot 是决策已做完的**成品 harness**。判别测试：**开箱能否直接完成任务**——Claude Code 装上就能改代码（harness），LangGraph 装上什么都不发生（framework）。三层链条：Framework —(你开发)→ Harness —(部署于)→ Runtime。中间形态是"harness 提取物"：Claude Agent SDK / OpenAI Agents SDK 是把成品 harness 的 loop/compaction/permission 抽成库，framework 形态但内含近完整 harness。两词来自不同部落：harness 流行于 coding agent/评测圈（价值主张"帮模型接触世界"），framework 流行于应用开发圈（价值主张"帮开发者抽象模型"）——方向相反，"Agent = Model, Not Framework" 正是对重 framework 封装路线的立场表态。OpenForge 三元结构里没有 framework 的位置，因为运行期它已消融在 harness 里。

### Claim: Harness 面向 model，Agent Runtime 面向 infra——runtime 是同心圆外侧的正交承载层

- **来源**：[[2026-08-10-周一]]
- **首次出现**：2026-08-10
- **最近更新**：2026-08-10
- **置信度**：0.75
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾：qmd search 关键词命中的仅为来源文章与本页自身（Notes/ wiki/ paper/ book/），无更新文章反驳

> Agentic harness 是包在模型外、决定 Agent"怎么思考和行动"的软件层（loop、system prompt、工具调度、context 管理、permission），优化目标是任务成功率与级联失败率，词源来自 test harness；Agent Runtime 是承载 Agent 进程运行的基础设施层（沙箱生命周期、session 持久化、扩缩容、身份如 Entra Agent ID、多租户隔离），优化目标是 SLA/安全边界/成本，词源来自 language runtime。两个边界测试：① **换模型测试**——换模型需重调的属于 harness，完全不动的属于 runtime；② **谁在焦虑测试**——为"提前收工/上下文爆"焦虑的是 harness 工程师，为"生产安全/崩溃恢复/凭证下发"焦虑的是 runtime 工程师。runtime 不在 Prompt < Context < Harness 同心圆内，而是承载整组同心圆的正交层。补充公式：智能来自 model，可靠性来自 harness，**可运维性来自 runtime**。两者在 agent loop 处有真实重叠：托管 runtime（Foundry Agent Service 等）自带默认 loop，等于把最薄一层 harness 也托管了。

### Claim: Harness 不单列一层——Framework 是材料、Harness 是成品，Runtime 把它当作可替换的进程托管

- **来源**：[[Agent基础设施系列01：三层划分与自建路线]]、[[Agent基础设施系列04：Framework层与三层串联]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.75
- **状态**：active

> 用 LangGraph 写完 loop、规划、工具调用、审批就得到一个 harness；Claude Code、Codex 是别人搭好的 harness。最好的佐证来自 Runtime 一侧：kagent 的 Agent 资源有 Harness 字段，可选自带 Go / Python ADK、Claude Code、Codex 或自定义镜像；Agent Substrate 声明"适配任何 framework 或 harness"。Harness Engineering 是贯穿 Framework 与 Runtime 的工程方法，不是一个部署层次。与 [[harness-engineering]] 已有的"framework 是 dev-time 工具包、harness 是 run-time 实体""Harness 面向 model、Runtime 面向 infra"两条 Claim 一致，这里补的是 Runtime 视角的证据。

### Claim: harness 按"归谁、能不能改"分三类，选 framework 还是直接选 harness 看任务形态——harness SDK 把能干活的 agent 放进应用，framework 让你用 agent 搭出应用

- **来源**：[[Agent基础设施系列04：Framework层与三层串联]]、[[GitHub-Copilot系列01：产品全景与竞争格局]]
- **首次出现**：2026-11-02
- **最近更新**：2026-11-04
- **置信度**：0.7
- **状态**：active

> 三类：代码框架自己搭（MAF / LangGraph / ADK / OpenAI Agents SDK / Dapr Agents，产物是镜像、质量归你）；现成 harness 拿来即用（Claude Code / Codex / GitHub Copilot / OpenHands / Goose 等，本身执行 shell 与代码，适合整个放进沙箱）；平台托管 harness 不能改（Foundry Prompt Agent、Copilot Studio 大部分 harness；Foundry Prompt Agent 现可在默认 harness 与 Microsoft Copilot harness 之间选，但两者都由平台托管）。直接选 harness 适合开放式多步工作、单 agent 能独立做完、团队无力调 loop 与上下文；用 framework 适合流程要确定可审计、多 agent 有明确交接与 human-in-the-loop、对延迟与单次成本敏感、要标准化端点便于迁移 runtime。最实用的是组合：framework 搭外层确定性流程，需要"自己想办法干完"的一步交给 harness。harness 的三种用法：交互式、嵌入应用（Copilot SDK 经 JSON-RPC 驱动 CLI server 模式、Claude Agent SDK）、整个当沙箱里的工作负载（kagent AgentHarness、Substrate actor）。经验：模型已定先看第一方 harness；要多模型、开源、可改转向 OpenCode / OpenHands，接受能力损耗。微软把 Copilot harness 做成跨产品复用的底座（进入 Foundry），是"harness 产品化"的实例。

### Claim: Copilot Studio 把 harness 与 runtime 打包出售——选 harness 即选 runtime，依赖管理被扩展点取代

- **来源**：[[2026-08-10-周一]]
- **首次出现**：2026-08-10
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 修订——依据：Microsoft Learn Harnesses in Copilot Studio https://learn.microsoft.com/en-us/microsoft-copilot-studio/harnesses-overview ；GA 公告 https://www.microsoft.com/en-us/copilot/blog/copilot-studio/new-and-improved-github-copilot-harness-agent-skills-and-richer-context

> **现行结论（2026-11-07 修订）**：三 harness 名单仍属实（Copilot Chat / Standard / GitHub Copilot，后者 2026-08-03 GA），但官方文档现称"四种 harness"（另有 Customer Conversation harness）；"Copilot Chat harness 对应无代码执行"等细节应对照最新文档；正文应补第四种
>
> 以下为原记录：
> 微软官方文档（Choose a harness）直接定义 "The harness **is a runtime**"——Copilot Studio 作为全托管 SaaS 把两层打包：创建 agent 时选定 harness 即确定 runtime，无第二决策点，且**创建后不可跨 harness 迁移**。三 harness（GA 名单，2026-08-03）对应的 runtime 实体：Copilot Chat harness=M365 Copilot Chat 同款运行时（无代码执行）；Standard harness=经典 topic/flow 引擎（无代码执行）；GitHub Copilot harness=GitHub Copilot SDK/CLI 运行时（与 Copilot coding agent、Cowork 同源），跑在 Copilot Studio 治理的 secure sandbox，内置 planning/shell/文件操作/URL 抓取/MCP，原生创建编辑 Office/PDF 文件，Copilot Credits 按 usage 计费（含 runtime 用量）。关键推论：托管 runtime 下**你不装依赖**——扩展能力的方式不是 pip/npm 而是 harness 扩展点（MCP、connector、skill）。对照证据：同一 GitHub Copilot 引擎在 GitHub Actions 形态（coding agent）反而允许 `copilot-setup-steps.yml` 自定义环境——同一 harness 挂不同 runtime，环境控制权完全不同，是 OpenForge 三元结构中 Environment 层的活例子。确认托管 sandbox 细节（OS/预装解释器/出站网络）最快路径是建测试 agent 让它自述环境（实测探针），文档往往滞后。

### Claim: 编排接入别家 agent 的镜像两式——dsh "loop 内挂 sub-agent" vs OpenHands "loop 外包住执行体"

- **来源**：[[Agent-Harness五平台对比]]
- **首次出现**：2026-08-31
- **最近更新**：2026-09-04
- **置信度**：0.7
- **状态**：stale
- **证据类型**：产品与服务
- **复核**：2026-11-07 待定——依据：dsh 与 OpenHands ACP 能力为产品细节，本轮未查

> 把别家 harness 纳入自己编排的两条对称路线：**dsh 在 loop 内挂**——sub-agent seam 有五个 provider（in-process spawn、fork、ACP、Codex、Claude Code），把整个外部 harness 挂为 sub-agent 是配置项而非改代码，dsh 的定位因此更像"编排层/胶水"而非直接竞品；**OpenHands 在 loop 外包**——经 ACP 把 Claude Code/Codex/Gemini CLI 接为后端 agent，用自己的编排、持久化、自动化外壳包住别家 harness（订阅额度 session 启动时注入，云端跑完为止）。选平台的核心判据由此明确：不是功能清单，而是"你要对 harness 拥有多大控制权、控制发生在哪一层"——loop 内（能力件级）还是 loop 外（架构层级）。

### Claim: harness 的职责边界——单轨执行器不含搜索编排：并行候选、分支比较、预算分配在 harness 之外

- **来源**：[[2026-09-22-Dream-RSI]]
- **首次出现**：2026-09-22
- **最近更新**：2026-09-25
- **置信度**：0.6
- **状态**：active

> Claude Code/OpenCode 这代 harness 提供 loop、session、context 压缩、记忆、权限、沙箱——是**单轨执行器**；探索决策（试哪个方案、开几个分支、给每支多少预算）隐式混在 LLM 的逐步决定里，plan mode 是权限门不是搜索。Dream-RSI 把探索编排做成 harness 之外的显式一层（可编程 exploration policy）——"控制权在哪一层"判据的新数据点：搜索/编排是尚未被现有 harness 吸收的职责，当前只能靠外层脚本（fan-out + pick-the-winner）承担。（论文初读，置信度留低）

### Claim: Claude Code 的设计潜台词是"强模型、弱规则"——loop 不做决策、Memory / Rules / Skills 都只是递到模型面前的建议，hooks 是唯一绕过模型的确定性控制点，permission 留给高风险动作的人工确认

- **来源**：[[Claude-Code系列01：核心概念与设计哲学]]、[[Claude-Code系列05：六层记忆体系]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-16
- **置信度**：0.75
- **状态**：active
- **证据类型**：理论（长效）

> Claude Code 刻意选"弱结构 + 强模型"：规则和结构只是提示增强而不是强制约束。后果逐项看——Memory 不是数据库、Rules 是模型决定是否采纳的"弱条件触发"、Skills 的触发时机由模型判断、loop 本身不判断该不该调工具或是否完成；只有 hooks 由代码直接执行，是整个系统里唯一能强制的机制；permission 是"模型做决策、高风险由人批"的平衡点。追求"强结构 + 可控行为"的用户会和这个选择持续冲突，很多"像 bug"的行为（规则没被遵守、skill 没触发）都出在这里。对 harness 设计的含义：要确定性的地方用代码（hook、外部门禁），不要指望在提示层写更多规则。Memory 的 framing 证据见 [[claude-code-memory-system]]。

## 冲突与演进

- 2026-11-16：独立建页。本页 8 条 Claim 全部从既有页搬来，原文与置信度不变：7 条来自 [[harness-engineering]]（定义、与 framework / runtime 的边界、三类归属、托管平台打包、编排接入、职责边界），1 条来自 [[agent-infra-three-layers]]（不单列一层）。[[harness-engineering]] 保留"怎么把 harness 做好"的工程方法类 Claim。
- harness 定义谱系三档：泛指"模型之外的一切"（LangChain）> 编排脚手架（OpenForge）> 信息管道（Meta-Harness），见 [[harness-engineering]] 与 [[meta-harness]]。

## 关联概念

- [[codex-desktop-architecture]] — `part-of` 具体实现：Codex Desktop 的架构拆解
- [[harness-engineering]] — `grounds` 把 harness 做好的工程方法
- [[claude-code-memory-system]] — `part-of` 一个具体 harness 的记忆与指令加载机制
- [[agent-framework]] — `contrasts` framework 是开发期材料，harness 是运行期成品
- [[agent-runtime]] — `contrasts` harness 面向模型，runtime 面向基础设施；runtime 把 harness 当可替换进程托管
- [[agent-session-control-plane]] — `uses` "harness 的 harness"：控制面经适配器驱动多种编码 CLI
- [[agent-sandbox]] — `constrains` 多租户平台上 harness 自身也当不可信，整个放进沙箱免确认运行
- [[harness-portability-spectrum]] — `extends` 资产换 harness 能否存活；harness 与 runtime 是否绑死看"是不是平台自己的代码"
- [[model-harness-codesign]] — `extends` 第一方绑定 vs 多模型适配
- [[copilot-studio-harness-selection]] — `uses` Copilot Studio 四种 harness 的选型
- [[meta-harness]] — `extends` harness 优化被自动化为搜索问题

## 来源日记

- [[Claude-Code系列01：核心概念与设计哲学]] — 强模型弱规则、hooks 是唯一确定性控制点
- [[Agent=Model+Harness]] — Harness 的职责、per-model 差异与评测体系
- [[Foundry-Toolbox与Skills解析]] — OpenForge 定义、Copilot Studio harness 产品证据
- [[2026-08-10-周一]] — framework / harness / runtime 三层链条与两个边界测试
- [[Agent-Harness五平台对比]] — 编排接入别家 harness 的两种方式
- [[Agent基础设施系列01：三层划分与自建路线]] — harness 不单列一层
- [[Agent基础设施系列04：Framework层与三层串联]] — 三类归属、何时直接选 harness
- [[AKS-Agent-Runtime系列02：Harness放在沙箱内还是沙箱外]] / [[AKS-Agent-Runtime系列03：控制面怎么驱动编码Harness]] — 编码 harness 进沙箱与被控制面驱动
