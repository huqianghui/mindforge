---
title: "Harness Engineering"
created: "2026-04-13"
updated: "2026-09-04"
tags:
  - wiki
  - concept
  - ai-engineering
  - harness
  - agent
aliases:
  - "驾驭工程"
  - "Harness Engineering"
related:
  - "[[agent-loop-architecture]]"
  - "[[context-engineering]]"
  - "[[claude-code-agent-subagent]]"
---

# Harness Engineering

## 摘要

Harness Engineering（驾驭工程）是 Prompt Engineering 和 Context Engineering 的超集，三者构成同心圆包含关系。核心主张是：Agent 的"智能"来自 model，但"可靠性"来自 harness——外部系统代码（Tools + Knowledge + Observation + Action Interfaces + Permissions）。这一范式在 2026 年初由 OpenAI、Anthropic、Google DeepMind 独立演化趋同，标志着行业共识。

## Claims

### Claim: Harness Engineering 是 Prompt Engineering 和 Context Engineering 的超集

- **来源**：[[Vibe Coding系列01]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：active

> 三者是同心圆包含关系：Prompt（单次措辞）< Context（上下文构建）< Harness（仓库级系统工程）。

### Claim: 三家公司独立演化出同一套 Harness 设计范式

- **来源**：[[Vibe Coding系列01]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：active

> OpenAI、Anthropic、Google DeepMind 在 2026 年初独立演化出同一套 Harness 设计范式，这不是巧合而是行业共识。

### Claim: Agent 的两种典型失败模式是系统设计问题而非模型能力问题

- **来源**：[[Vibe Coding系列01]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> 上下文耗尽（Context Exhaustion）和提前收工（Premature Completion）不是"让模型更努力"能解决的，而是系统设计问题。

### Claim: 级联失败是 Harness Engineering 出现的核心驱动力

- **来源**：[[Vibe Coding系列01]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：active

> 单步 95% 成功率在 10 步串联后只剩 60%（0.95^10 ≈ 0.60），级联失败驱动了 Harness Engineering 的出现。

### Claim: OpenAI 的 Harness Engineering 五大支柱

- **来源**：[[Vibe Coding系列02]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> 仓库即系统记录、分层领域架构、Agent 可读性、黄金准则、垃圾回收。

### Claim: Agent 的智能来自 model，可靠性来自 harness

- **来源**：[[learn-claude-code]]
- **首次出现**：2026-04-13
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：active

> 30 行代码能跑 demo，但从 30 行到生产中间是 12 层 harness 的距离。Harness = Tools + Knowledge + Observation + Action Interfaces + Permissions。

### Claim: "Agent = Model, Not Framework" 是一个工程立场

- **来源**：[[learn-claude-code]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-15
- **置信度**：0.7
- **状态**：stale

> model 是做决策的主体，外部代码只是缰绳。

### Claim: Meta-Harness 论文给出了更精确的 Harness 定义——聚焦信息管道

- **来源**：[[2026-04-16-Meta-Harness论文解读与实践思考]]
- **首次出现**：2026-04-16
- **最近更新**：2026-04-16
- **置信度**：0.8
- **状态**：stale

> 业界主流（LangChain）定义 Harness 为"模型之外的一切"，Meta-Harness 论文精确聚焦为"the code that determines what to store, retrieve, and show to the model"——控制模型输入输出信息流的那层代码。同时揭示实际存在两层 Harness：Platform Harness（平台内置）和 User Harness（用户定制），同一模型换 Harness 可使性能排名跳跃 28 位。

### Claim: Harness 优化可被自动化为搜索问题

- **来源**：[[2026-04-16-Meta-Harness论文解读与实践思考]]
- **首次出现**：2026-04-16
- **最近更新**：2026-04-16
- **置信度**：0.8
- **状态**：stale

> Meta-Harness 将手工 Harness 迭代自动化为 Propose → Evaluate → Log → Repeat 搜索循环。消融实验证明完整执行 trace 访问（50.0%）远优于仅分数（34.6%），原始 trace 是不可替代的诊断信号。

### Claim: 控制论是 Harness Engineering 的理论根基——三层控制模型

- **来源**：[[控制论与科学方法论——从控制论到AI Agent设计方法论]]
- **首次出现**：2026-04-17
- **最近更新**：2026-07-06
- **置信度**：0.85
- **状态**：active

> 所有 Harness 代码可归入三个控制系统：执行系统（L5 Runtime + L4 Execution，"怎么做出来"）、约束系统（L2 Planning + L1 Policy，"不能乱来"）、认知系统（L6 Eval，"从经验学到什么"）。收敛性 = 约束强度 × 反馈频率 / 执行自由度。

### Claim: Claude Code 的 98.7% 代码都是 Harness

- **来源**：[[Claude Code系列07：Harness分层架构——从50万行源码到社区框架的控制论解读]]
- **首次出现**：2026-04-17
- **最近更新**：2026-07-06
- **置信度**：0.9
- **状态**：active

> Claude Code 总代码量 50 万行以上，其中直接调用模型的代码约 6400 行（~1.3%）。社区框架的价值不在于重复执行能力，而在于补足约束系统和认知系统的空白。

### Claim: 多模型 harness 必须自建三层评测体系——离线 benchmark → PR 门禁 → 生产 A/B

- **来源**：[[Agent=Model+Harness——从VS Code Copilot博客看第一方绑定与多模型适配的路线之争]]
- **首次出现**：2026-07-14
- **最近更新**：2026-07-14
- **置信度**：0.85
- **状态**：active

> VS Code 为支撑 per-model 适配矩阵被迫建成三层评测体系：① **VSC-Bench**（离线，选候选）——容器化可复现 workspace 里真正启动 VS Code 实例跑完整 agent session，度量 resolution rate + agent effort + token 效率 + latency 四件套；数据集刻意私有（公开就重蹈 SWE-bench 污染覆辙，私有性正是质量信号的前提）；② **PR 评测门禁**（merge 时，防回归）；③ **生产 A/B**（在线，定胜负）——GPT-5.5 prompt 实验用"10 分钟存活率 / commit 存活率"这类只有真实用户行为能提供的指标，`PRPT_LRG` 以 p95 首次编辑延迟 -9.30%、工具调用 -8.54% 换质量微降 0.44%（p=0.0493），显式量化 trade-off 后拍板。附带发现：xhigh reasoning effort 比 high 更费 token 但解题率反而略低——存在"有效努力甜点"。

### Claim: Agent 行为回归是传统 CI 测不出的新回归类别——今天的门禁靠作者自我申报触发

- **来源**：[[Agent=Model+Harness——从VS Code Copilot博客看第一方绑定与多模型适配的路线之争]]
- **首次出现**：2026-07-14
- **最近更新**：2026-07-14
- **置信度**：0.85
- **状态**：active

> 模型没换、代码没 bug，但改一个工具 description、动一行 system prompt，agent 就可能整体变笨——单元测试全绿、产品体验回归。判断标准不是"改没改 prompt"而是"会不会改变 agent 感知到的世界"：microsoft/vscode#312854 只修终端 shell integration 挂起 bug（加 30 秒定时器）也要过评测门禁，因为终端是 `run_in_terminal` 的行为地基。实证（GitHub API 查证，截至 2026-07）：`~requires-eval-assessment` 标签的 9 个 PR 里 8 个由作者本人手打、仅 1 个由 bot 自动打——本质是**自我申报制**，依赖资深成员的直觉与团队文化。当改 harness 的主力变成 agent，约束需分层：L1 确定性路径规则（保召回）、L2 语义指令（AGENTS.md 自评）、L3 独立 reviewer agent（never self-approve）；成本不对称（漏报=回归上线，误报=多跑一轮评测）决定默认值应是"不确定时打标签"。

### Claim: InkOS 在 AI 小说创作领域独立发现了 Harness Engineering 的核心范式——跨领域验证

- **来源**：[[InkOS深度感想——AI小说创作中的Harness Engineering范式]]
- **首次出现**：2026-04-23
- **最近更新**：2026-04-23
- **置信度**：0.8
- **状态**：stale

> InkOS 的 10 Agent 流水线 + 硬编码词表规则（L1 Hook）+ 7 真相文件（结构化状态持久化）+ 33 维审计检查清单（Evaluative Control）+ 审计-修订循环（反馈闭环）与 Harness Engineering 存在六个结构性同构映射。不同领域（小说 vs 编码），同一规律：AI 的可靠性不来自更强的模型，而来自更好的约束系统。

### Claim: AI Agent 创作存在三种范式——纯多 Agent / Agent+微调 / Harness 驱动

- **来源**：[[InkOS深度感想——AI小说创作中的Harness Engineering范式]]
- **首次出现**：2026-04-23
- **最近更新**：2026-04-23
- **置信度**：0.7
- **状态**：stale

> 范式一（对话驱动）：Terminal Velocity，Agent 通过对话协商，无显式规则，长篇一致性差。范式二（模型驱动）：GOAT Storytelling Agent + 微调模型，推理效率高但泛化受限。范式三（Harness 驱动）：InkOS，10 Agent + 硬编码规则 + 真相文件 + 审计循环，最有前景的方向。

### Claim: V-Model 双轨把"凡可确定性计算的绝不交给 LLM"应用到合规领域

- **来源**：[[Spec Kit系列00：SDD、TDD与V-Model融合——从Red-Green-Refactor到规格与验证双轨演进]]
- **首次出现**：2026-07-20
- **最近更新**：2026-07-21
- **置信度**：0.7
- **状态**：active

> spec-kit-v-model 的 Traceability Matrix 验证由确定性脚本完成而非 LLM——规格覆盖率、层间追溯这类可确定性计算的检查一律走脚本，LLM 只负责起草。这与 Vibe Coding 系列13 的 Harness 原则同构：确定性外壳包住概率性内核。SDD 的模板门禁、phase gate、宪法条款检查也都是 L1/L2 层约束系统在开发方法论上的落地，证明 Harness 工程范式可延伸到合规级软件流程。

### Claim: OpenForge 给出 harness 的正式学术定义——orchestration scaffold，Agent = Model + Harness + Environment 三元结构

- **来源**：[[Foundry Toolbox与Skills深度解析：Prompt Agent与Hosted Agent的Skill支持、执行环境与Harness控制权]]
- **首次出现**：2026-07-30
- **最近更新**：2026-08-04
- **置信度**：0.75
- **状态**：active

> OpenForge 论文（arXiv:2607.21557）把 harness 正式定义为 orchestration scaffold——组织 prompt、管理工具调用、维护交互状态的编排脚手架，并把 Agent 拆成 Model + Harness + Environment 三元：Model 决策、Harness 编排、Environment 提供可执行世界（文件系统、shell、网络）。相比"模型之外的一切"（LangChain）与"信息管道代码"（Meta-Harness），三元结构额外切出 Environment 一层——同一 harness 挂不同 environment（有网/断网容器、真实/沙箱文件系统）行为语义不同，这层区分在托管平台选型时是实打实的约束（如 Responses API shell tool 的 `container_auto` 默认断网）。

### Claim: 选 harness 就是选行为语义——Copilot Studio 三 harness 并存；扩展机制"离模型越近越可移植"

- **来源**：[[Foundry Toolbox与Skills深度解析：Prompt Agent与Hosted Agent的Skill支持、执行环境与Harness控制权]]
- **首次出现**：2026-07-30
- **最近更新**：2026-08-04
- **置信度**：0.75
- **状态**：active

> Copilot Studio 一个产品里并存三种 harness（经典低代码编排、生成式编排、Copilot 运行时），同一 agent 配置换 harness 跑出不同行为——"选 harness 就是选行为语义"的直接产品证据。由此得出跨 harness 可移植性分层：**skill（纯文本指令）与 MCP（协议标准）可移植性高；instructions/system prompt 中等（各平台注入方式不同）；subagent、hook、plugin 可移植性低（深度绑定特定 harness 实现）**。规律一句话："离模型越近越可移植"——离模型近的资产只依赖模型能读文本，离模型远的资产依赖 harness 私有机制。资产投资应优先沉淀在可移植层。

### Claim: Agent framework 是 dev-time 概念，harness 是 run-time 实体——framework 是"造 harness 的工具包"

- **来源**：[[2026-08-10-周一]]
- **首次出现**：2026-08-10
- **最近更新**：2026-08-10
- **置信度**：0.75
- **状态**：active

> Agent framework（LangGraph/CrewAI/AutoGen）提供 loop 原语、状态管理、工具注册等零件，但行为语义的关键决策（system prompt、终止条件、context 压缩）留给开发者——你用 framework 的产出物才是 harness；Claude Code / GitHub Copilot 是决策已做完的**成品 harness**。判别测试：**开箱能否直接完成任务**——Claude Code 装上就能改代码（harness），LangGraph 装上什么都不发生（framework）。三层链条：Framework —(你开发)→ Harness —(部署于)→ Runtime。中间形态是"harness 提取物"：Claude Agent SDK / OpenAI Agents SDK 是把成品 harness 的 loop/compaction/permission 抽成库，framework 形态但内含近完整 harness。两词来自不同部落：harness 流行于 coding agent/评测圈（价值主张"帮模型接触世界"），framework 流行于应用开发圈（价值主张"帮开发者抽象模型"）——方向相反，"Agent = Model, Not Framework" 正是对重 framework 封装路线的立场表态。OpenForge 三元结构里没有 framework 的位置，因为运行期它已消融在 harness 里。

### Claim: Copilot Studio 把 harness 与 runtime 打包出售——选 harness 即选 runtime，依赖管理被扩展点取代

- **来源**：[[2026-08-10-周一]]
- **首次出现**：2026-08-10
- **最近更新**：2026-08-10
- **置信度**：0.8
- **状态**：active

> 微软官方文档（Choose a harness）直接定义 "The harness **is a runtime**"——Copilot Studio 作为全托管 SaaS 把两层打包：创建 agent 时选定 harness 即确定 runtime，无第二决策点，且**创建后不可跨 harness 迁移**。三 harness（GA 名单，2026-08-03）对应的 runtime 实体：Copilot Chat harness=M365 Copilot Chat 同款运行时（无代码执行）；Standard harness=经典 topic/flow 引擎（无代码执行）；GitHub Copilot harness=GitHub Copilot SDK/CLI 运行时（与 Copilot coding agent、Cowork 同源），跑在 Copilot Studio 治理的 secure sandbox，内置 planning/shell/文件操作/URL 抓取/MCP，原生创建编辑 Office/PDF 文件，Copilot Credits 按 usage 计费（含 runtime 用量）。关键推论：托管 runtime 下**你不装依赖**——扩展能力的方式不是 pip/npm 而是 harness 扩展点（MCP、connector、skill）。对照证据：同一 GitHub Copilot 引擎在 GitHub Actions 形态（coding agent）反而允许 `copilot-setup-steps.yml` 自定义环境——同一 harness 挂不同 runtime，环境控制权完全不同，是 OpenForge 三元结构中 Environment 层的活例子。确认托管 sandbox 细节（OS/预装解释器/出站网络）最快路径是建测试 agent 让它自述环境（实测探针），文档往往滞后。

### Claim: Harness 面向 model，Agent Runtime 面向 infra——runtime 是同心圆外侧的正交承载层

- **来源**：[[2026-08-10-周一]]
- **首次出现**：2026-08-10
- **最近更新**：2026-08-10
- **置信度**：0.75
- **状态**：active

> Agentic harness 是包在模型外、决定 Agent"怎么思考和行动"的软件层（loop、system prompt、工具调度、context 管理、permission），优化目标是任务成功率与级联失败率，词源来自 test harness；Agent Runtime 是承载 Agent 进程运行的基础设施层（沙箱生命周期、session 持久化、扩缩容、身份如 Entra Agent ID、多租户隔离），优化目标是 SLA/安全边界/成本，词源来自 language runtime。两个边界测试：① **换模型测试**——换模型需重调的属于 harness，完全不动的属于 runtime；② **谁在焦虑测试**——为"提前收工/上下文爆"焦虑的是 harness 工程师，为"生产安全/崩溃恢复/凭证下发"焦虑的是 runtime 工程师。runtime 不在 Prompt < Context < Harness 同心圆内，而是承载整组同心圆的正交层。补充公式：智能来自 model，可靠性来自 harness，**可运维性来自 runtime**。两者在 agent loop 处有真实重叠：托管 runtime（Foundry Agent Service 等）自带默认 loop，等于把最薄一层 harness 也托管了。

### Claim: 外层 Harness 框架 Skill 化收敛——复杂度没有消失，而是沉到宿主与模型两端

- **来源**：[[Vibe Coding系列14：Harness框架的Skill化收敛——从Agent、Command、Hook全家桶到纯Skill的架构简化]]
- **首次出现**：2026-08-20
- **最近更新**：2026-08-30
- **置信度**：0.8
- **状态**：active

> Superpowers 三版本目录实证（5.0.2 有 agents/commands/hooks 全家桶 → 6.3.0 只剩 14 个 skill + 1 个极简 SessionStart bootstrap hook），GSD/gstack 同步瘦身。四个收敛原因：① 宿主把基础设施内置了（subagent 体系/plan mode/任务列表/原生 hooks/session 持久化），插件再自带就是在 50 万行内层 Harness 上重复建设；② 模型变强后流程挟持的成本收益倒挂；③ skill 是唯一跨 harness 可移植载体（归口 [[harness-portability-spectrum]]）；④ 纯文本维护成本低一个量级。收敛后三层分工：方法论层（插件=纯 skill）/ 基础设施层（宿主 harness）/ 能力层（模型）。**"变简单"是表象，实质是职责归位**——框架竞争维度从"机制精巧"变成"方法论文本质量"（Superpowers 用 eval campaign 微测试每段文字存废）。选型视角随之更新：过去看机制是否完备，现在看 skill 文本质量与实证方法。用户侧值得亲手维护的只剩三类：领域角色 agent（独有领域知识）、安全 hook（独有安全边界）、方法论 skill（工作流偏好）；深嵌套刻意受限（两层半），角色扮演式流水线（BMAD）按机制需求译成扁平星型而非照搬组织树。

### Claim: 编排接入别家 agent 的镜像两式——dsh "loop 内挂 sub-agent" vs OpenHands "loop 外包住执行体"

- **来源**：[[Agent Harness五平台对比——DeepSeek Harness、pi、Codex、OpenHands与Goose的架构哲学与场景选择]]
- **首次出现**：2026-08-31
- **最近更新**：2026-09-04
- **置信度**：0.7
- **状态**：active

> 把别家 harness 纳入自己编排的两条对称路线：**dsh 在 loop 内挂**——sub-agent seam 有五个 provider（in-process spawn、fork、ACP、Codex、Claude Code），把整个外部 harness 挂为 sub-agent 是配置项而非改代码，dsh 的定位因此更像"编排层/胶水"而非直接竞品；**OpenHands 在 loop 外包**——经 ACP 把 Claude Code/Codex/Gemini CLI 接为后端 agent，用自己的编排、持久化、自动化外壳包住别家 harness（订阅额度 session 启动时注入，云端跑完为止）。选平台的核心判据由此明确：不是功能清单，而是"你要对 harness 拥有多大控制权、控制发生在哪一层"——loop 内（能力件级）还是 loop 外（架构层级）。

## 冲突与演进

- 2026-04-16：Meta-Harness 论文对 Harness 给出了比 LangChain 主流定义更窄、更精确的操作性定义，两者并不矛盾但侧重点不同——前者聚焦信息管道，后者泛指"模型之外的一切"。
- 2026-04-17：控制论视角引入，将 Harness Engineering 从工程方法论上溯到控制论理论根基。三套框架（控制论五层 / 六层架构 / 三层控制模型）互补：搭系统用六层，调系统用三层，设计决策回控制论。
- 2026-04-23：InkOS 分析证实 Harness Engineering 范式具有跨领域普适性（从 Coding 扩展到小说创作），核心公式 Agent = Model + Harness 在文学领域同样成立。
- 2026-07-14：VS Code Copilot 博客解读补充两条工程证据：三层评测体系（VSC-Bench→PR 门禁→生产 A/B）与"agent 行为回归"这一传统 CI 盲区。harness 的产品战略层议题（第一方绑定 vs 多模型适配）另建 [[model-harness-codesign]] 页。
- 2026-07-20：SDD/V-Model 提供合规域延伸证据：确定性脚本验证追溯 + 模板门禁，Harness 范式从 Agent 系统扩展到软件开发方法论本身。
- 2026-08-04：从 Foundry Toolbox/Skills 篇补充 OpenForge 正式定义（Model+Harness+Environment 三元）、Copilot Studio 三 harness 产品证据与"离模型越近越可移植"分层——harness 定义谱系现有三档：泛指（LangChain）> 编排脚手架（OpenForge）> 信息管道（Meta-Harness）。
- 2026-08-10：补充 harness 与 Agent Runtime 的正交辨析——harness 面向 model（同心圆内），runtime 面向 infra（承载同心圆的外侧层），给出换模型/谁在焦虑两个边界测试；与 OpenForge 三元结构兼容：runtime 大致对应托管化的 Environment + 部分平台 harness。
- 2026-08-10：Copilot Studio 三 harness GA（2026-08-03，Copilot Chat/Standard/GitHub Copilot）提供"选 harness 即选 runtime"的产品证据，替代此前 preview 期的"经典/生成式/Copilot 运行时"三分——托管平台把 harness 与 runtime 打包出售，依赖管理被 MCP/connector/skill 扩展点取代；skill scripts 的执行环境断层另见 [[skill-runtime]]。
- 2026-08-30：注入系列14 Skill 化收敛 Claim（三层分工格局/四个收敛原因/竞争维度迁移）；"离模型越近越可移植"分层判据升格独立页 [[harness-portability-spectrum]]（原始 Claim 保留本页，判据归口新页）。
- 2026-08-10：补充 framework/harness/runtime 三层链条辨析——framework 是 dev-time 的"造 harness 工具包"，运行期消融在 harness 里；"Agent = Model, Not Framework" Claim（2026-04-13）由此获得新解读：它是 harness 路线对重 framework 封装路线的立场表态。
- 2026-09-04：注入五平台横评的编排接入镜像两式（dsh loop 内挂 / OpenHands loop 外包）与"控制权在哪一层"选型判据；绑定×可分解十字定位归口 [[model-harness-codesign]]，搬家工具市场实证归口 [[harness-portability-spectrum]]。

## 关联概念

- [[bitter-lesson]] — `contrasts` Harness Engineering 是人类知识编码的现代形式，可能面临 Bitter Lesson 挑战
- [[one-person-team]] — `produces` Harness Engineering 是实现一人团队的技术基础
- [[rtk-token-compression]] — `uses` Token 压缩是 Harness 工程的一个环节
- [[harness-quality-gate]] — `contrasts` 名称类似但不同概念：前者是 AI Agent 系统工程范式，后者是 DevOps 质量门禁
- [[cybernetics-harness-design-sheet]] — `produces` 控制论 Design Sheet 是 Harness 设计流程的前置检查工具
- [[online-learning]] — `contrasts` Harness 是外部控制器不改参数，在线学习把控制器写进模型内部改参数；伪在线学习（memory/RAG/reflection）本质仍是 harness
- [[reinforcement-learning]] — `contrasts` Harness 是 LLM Agent 对 RL 学习能力缺失的工程补偿
- [[skill-runtime]] — `constrains` harness + runtime 共同决定 skill 声明的依赖是否被满足，scripts 层可移植性受 runtime 约束

## 来源日记

- [[Vibe Coding系列01]] — Harness Engineering 概念首次系统阐述
- [[Vibe Coding系列02]] — OpenAI 五大支柱详解
- [[learn-claude-code]] — 从 Claude Code 源码理解 Harness 实践
- [[2026-04-16-周四]] — Meta-Harness 论文解读，补充精确 Harness 定义和自动化优化
- [[2026-04-17-周五]] — 控制论视角引入，三层控制模型、Claude Code 98.7% 是 Harness
- [[2026-04-23-周四]] — InkOS 跨领域验证：AI 小说创作中的 Harness Engineering 范式、三种 AI 创作范式总结
- [[Agent=Model+Harness——从VS Code Copilot博客看第一方绑定与多模型适配的路线之争]] — VS Code 三层评测体系、agent 行为回归门禁、`~requires-eval-assessment` 自我申报实证、L1/L2/L3 分层约束
- [[Spec Kit系列00：SDD、TDD与V-Model融合——从Red-Green-Refactor到规格与验证双轨演进]] — V-Model 确定性脚本验证（Harness 范式的合规域延伸）
- [[Foundry Toolbox与Skills深度解析：Prompt Agent与Hosted Agent的Skill支持、执行环境与Harness控制权]] — OpenForge 正式定义、Copilot Studio 三 harness、可移植性分层（2026-07-30）
- [[2026-08-10-周一]] — Harness vs Agent Runtime 正交辨析（面向 model / 面向 infra、两个边界测试）；Copilot Studio 三 harness GA 与"选 harness 即选 runtime"（2026-08-10）
