---
title: "Model-Harness Codesign（模型-Harness 协同设计）"
created: "2026-07-14"
updated: "2026-09-04"
tags:
  - wiki
  - concept
  - agent
  - harness
  - model-harness-codesign
  - product-strategy
aliases:
  - "第一方绑定"
  - "First-Party Binding"
  - "Model-Harness Codesign"
  - "模型-Harness 协同设计"
related:
  - "[[harness-engineering]]"
  - "[[agent-loop-architecture]]"
  - "[[meta-harness]]"
  - "[[reinforcement-learning]]"
---

# Model-Harness Codesign（模型-Harness 协同设计）

## 摘要

当 "Agent = Model + Harness" 成立后，一个战略层问题随之浮现：**模型和 harness 应该由同一方在训练时缝合（第一方绑定），还是由 harness 厂商在推理时逐一适配多个模型（多模型路线）？** 前者的代表是 Claude Code + Claude、Codex/ChatGPT Work + GPT 系列、Gemini CLI + Gemini；后者的代表是 VS Code Copilot、OpenCode。VS Code 官方博客提供了多模型适配成本的第一手证据（per-model prompt × tool × 会话管理的笛卡尔积、必须自建三层评测体系），而第一方绑定的结构性优势在于**对齐发生在训练时**——harness 可作为 RL 环境进入训练分布，第三方永远只能在推理时逆向猜测。这是 Apple（垂直一体化）vs Windows/Android（水平生态）的老故事在 agent 层的重演，两者可能长期共存、各占生态位。

## Claims

### Claim: Agent = Model + Harness——模型是引擎，harness 是整辆车

- **来源**：[[Agent=Model+Harness——从VS Code Copilot博客看第一方绑定与多模型适配的路线之争]]
- **首次出现**：2026-07-08
- **最近更新**：2026-07-14
- **置信度**：0.85
- **状态**：active

> VS Code 官方博客（2026-05-15）："The model is the engine. The harness is the car."——语言模型只会产出文本，不会编辑文件、执行命令、跑测试。Harness 承担三大职责：① Context assembly（模型能看见什么完全由 harness 决定）；② Tool exposure（声明可调用的工具，工具集按请求动态变化）；③ Tool execution（校验参数、真正执行、格式化结果喂回下一轮）。内核是 turn / round / run 三层的 tool-calling 循环，与 Claude Code 的内循环结构几乎一一对应——行业在 harness 架构上已经收敛。

### Claim: 多模型适配成本是 per-model prompt × tool × 会话管理的笛卡尔积——"The harness is the product"

- **来源**：[[Agent=Model+Harness——从VS Code Copilot博客看第一方绑定与多模型适配的路线之争]]
- **首次出现**：2026-07-08
- **最近更新**：2026-07-14
- **置信度**：0.85
- **状态**：active

> VS Code 第一手清单：Claude 系列用 `replace_string_in_file`、GPT 系列用 `apply_patch`；Gemini 需要专门提醒"用 tool-calling 而不是口头描述"；甚至同一家族内部（Claude Sonnet 4 / 4.5 / Opus）都拿到不同 system prompt。每接入一个新模型都要校验 tool schema、重调参数、完整重跑 agent session 评测。VS Code 团队自述 harness 才是他们花掉大部分工程时间的地方。GPT-5.5 发布后还要拉上 OpenAI 花两周、动用生产流量 A/B 才把这一个模型的 prompt 调到位——"A model release is not the end of the tuning loop"。

### Claim: 第一方绑定的结构性优势在训练时对齐——接口层差异可推理时适配，能力层差异不能

- **来源**：[[Agent=Model+Harness——从VS Code Copilot博客看第一方绑定与多模型适配的路线之争]]
- **首次出现**：2026-07-08
- **最近更新**：2026-07-14
- **置信度**：0.8
- **状态**：active

> per-model 差异分两层：**接口层**（tool 格式、prompt 偏好）harness 可以推理时适配；**能力层**（规划深度、工具选择直觉）由训练分布决定，prompt 工程只能缓解不能补齐。第一方组合的优势不在"适配做得快"而在"根本不需要适配"：① 训练分布对齐——拿自家 harness（真实工具集、system prompt、agent loop）作 RL 环境训模型；② 发布节奏同步——模型和 harness 在同一 release train 上联合调优（对照 VS Code 的乙方姿态：依赖 provider 提前给 checkpoint）；③ 零适配矩阵——省下的工程预算投入单一路径深度。"model 厂商向下做 harness，比 harness 厂商向上做 model 容易得多"。

### Claim: ChatGPT Work 发布印证第一方 harness 泛化路线——Codex 从开发者工具变成通用工作 harness

- **来源**：[[2026-07-10-周五]]
- **首次出现**：2026-07-10
- **最近更新**：2026-07-14
- **置信度**：0.85
- **状态**：active

> OpenAI 于 2026-07-08/09 发布 ChatGPT Work：原 Codex 桌面 app 改名 "ChatGPT"，顶部切换器分成 **Work**（Codex 技术 + GPT-5.6 驱动，跨 Gmail/Slack/Drive 执行通用工作任务，对标 Claude Cowork）与 **Codex**（保留开发者 agent 体验）两个模式；ChatGPT classic 保持纯对话形态（GPT-5.5）。产品含义：agent 入口和 chat 入口被拆开，Codex harness 从"开发者工具"泛化为"通用工作 harness"，模型与 harness 深度绑定作为第一方产品推出——这是"每家 lab 都想通了同一件事"（OpenAI/Anthropic/Google 均推第一方 harness）的最新产品级证据。

### Claim: MCP 把工具异构的接入成本转换为治理成本，而治理恰是第一方占优的领域

- **来源**：[[Agent=Model+Harness——从VS Code Copilot博客看第一方绑定与多模型适配的路线之争]]
- **首次出现**：2026-07-08
- **最近更新**：2026-07-14
- **置信度**：0.8
- **状态**：active

> "MCP 降低适配税"的论点要打折扣：MCP 不是免费的，只是把成本换了形态。① Context 膨胀——每个 server 的 JSON schema + description 注入 prompt，工具异构税变成 context 税；② 描述冲突——协议只标准化了"怎么调用"，没有标准化"怎么描述"，多 server 命名撞车（`search`/`fetch`/`query`）使模型选择准确率下降；③ 治理负担转嫁用户（选装、排查、认证、控量）。第一方内置工具集可做训练时对齐 + 统一文案治理，MCP 工具在任何 harness 里都是"客座"待遇。

### Claim: 垂直一体化与水平生态将长期共存——多模型路线的生态位是选择权、路由红利与评测护城河

- **来源**：[[Agent=Model+Harness——从VS Code Copilot博客看第一方绑定与多模型适配的路线之争]]
- **首次出现**：2026-07-08
- **最近更新**：2026-07-14
- **置信度**：0.75
- **状态**：active

> 反方论点至少五个：① 企业采购天然要求 BYOK 和多 provider（渠道属性决定的产品需求）；② 模型竞争红利只有多模型 harness 能兑现（按任务路由）；③ 评测税可转化为护城河（"每个模型在真实工作流里的确切表现"连 model 厂商自己都未必知道）；④ 头部渠道可用流量换 provider 深度合作（GPT-5.5 实验：OpenAI 出 expertise、VS Code 出 harness 数据与生产流量），信息不对称被部分对冲。类比框架：Apple vs Windows/Android 在 agent 层重演。开放问题：随着 agentic RL 把"模型在自家 harness 里训练"变成标配，水平生态能否维持"体验足够接近"——差距拉大则多模型框架被挤压到"企业合规渠道"单一生态位。

### Claim: 多 agent 编排的路线对垒是"显式图 vs 隐式图"——图的运维才是护城河，历史经验站在显式一边

- **来源**：[[Graph Engineering全景解析——编排图、循环网络与类型化知识图的三重含义]]
- **首次出现**：2026-08-07
- **最近更新**：2026-08-16
- **置信度**：0.8
- **状态**：active

> 两家第一方 harness 在多 agent 编排上路线截然相反：**Claude Code dynamic workflows 走显式图**——模型现写 JavaScript 编排脚本由运行时确定性执行，脚本可检查、可 git 提交、可重跑、可断点 resume，人能看到、改、重放整张图；**Codex Multi-agent V2 走隐式图**——图存在于运行时动态委派中（Symphony 规范："给 agent 目标而非严格转移"），且 2026-07 OpenAI 把 agent 间指令**加密**，本地 rollout 历史、trace、父侧审计面全部失去人类可读文本（The Register 报道）。上一轮框架竞争的教训直接适用：AutoGen vs LangGraph 的胜负手不在图的表达力（都能表达），而在生产运行时——LangGraph 赢在 durable execution、类型化状态、human-in-the-loop、可观测性四件与"图"无关的事。**图好画，图的运维才是护城河**；Codex V2 的加密恰在牺牲上一轮的获胜要素，是其战略风险。另一共同新特征：图的作者从开发者变成模型本身（graph-max 技巧、模型现写编排脚本），图从"软件资产"变成"随用随弃的中间产物"——画图成本坍缩到接近零，生命周期从项目级缩到任务级。

### Claim: co-design 下沉到硅层——模型+软件栈+芯片同司联合优化；服务端工具全家桶是第一方绑定的隐性福利

- **来源**：[[OpenAI Jalapeño推理芯片——从ASIC基础到首测数据解读的AI推理硬件全景]]
- **首次出现**：2026-08-26
- **最近更新**：2026-08-30
- **置信度**：0.75
- **状态**：active

> 两条独立证据延伸第一方绑定路线的边界：① **硬件层**（Jalapeño）——模型、推理软件栈（continuous batching/KV Cache/prefill-decode 分离）、芯片架构由 OpenAI 一家联合优化，官方原话 "design the full system together"；头部模型厂商自研 ASIC 成趋势后，co-design 的纵深从 model+harness 拉长到 model+软件栈+硅。② **服务端工具层**（Computer Use 系列六/七实证）——web search、code execution、computer use runtime 都长在第一方服务端：Claude Code 换到 Bedrock/Vertex/Databricks 代理后 `web_search` 声明无人执行、Codex CLI 无 `@oai/sky` runtime；第一方闭环产品"天然自带"这些能力，多模型适配路线省下绑定、付出的是每个服务端工具都要在客户端重新长一遍（Tavily MCP/Orca 补位）。连微软给自家 Copilot agent 层补搜索都走"Tavily+用户自带 key"，坐实了平台不为开放工具层垫付成本的商业逻辑。

### Claim: 搜索挂载点决定覆盖面——挂推理 API 随模型走、挂应用入口只随入口走；能力归属跟请求落点走、不跟产品形态走

- **来源**：[[Computer Use与Browser Use系列七：Web Search与浏览器操作的分界——信息获取三级梯、执行位置与成本转移]]
- **首次出现**：2026-08-30
- **最近更新**：2026-09-04
- **置信度**：0.8
- **状态**：active

> Copilot 同一产品内演示了四种搜索挂载点：`@github #web`（应用层，Bing 执行器钉死在 chat participant 服务端管道，agent 循环够不着）→ "Web Search for Copilot" 扩展（客户端工具层补裂缝，微软自家出品却由 Tavily 驱动、用户自带 key）→ model-native search（推理层，2026-02 起对 GPT-5.x 系启用，agent 循环天然继承）→ Azure Grounding with Bing（执行在服务端、账单在用户侧的第三计费形态）。规律：**挂载点越靠上层覆盖面越窄**，同一产品内部越容易出现"这里有、那里没有"的裂缝；`#web`→Tavily 扩展→model-native 的时间线就是挂载点一路下移、覆盖面扩大的过程。Microsoft Scout 提供第三形态镜像：本地 harness 整体挂靠 GitHub Copilot 闭环（烧 Copilot credits、继承模型目录），web research 开箱即用——与 Codex + Azure 把请求指出闭环、工具随之断供恰成镜像，**能力归属跟请求落点走、不跟产品形态走**在两个方向都成立。

### Claim: 多模型阵营内部按"可分解程度"再分层——插件化/自改源码/SDK 分层/协议标准化四种"可拆"实现

- **来源**：[[Agent Harness五平台对比——DeepSeek Harness、pi、Codex、OpenHands与Goose的架构哲学与场景选择]]
- **首次出现**：2026-08-31
- **最近更新**：2026-09-04
- **置信度**：0.7
- **状态**：active

> 五平台横评给绑定光谱补了第二维：绑定 × 可分解的十字定位。Codex 绑定深 + 不可拆（体验最完整、控制权最少，loop 与 session 存储不可替换）；多模型阵营内部按可分解方式分四型——**dsh** 插件化（Cordis 内核 + capability seams，loop 也是插件，sub-agent seam 五 provider 含 Codex/Claude Code）；**pi** 极简内核可自改（primitives not features，空 system prompt + 四工具，self-modifying 一等公民）；**OpenHands** SDK 分层（agent 逻辑/远程沙箱/接口层解耦，拆的粒度是架构层而非能力件）；**Goose** 协议标准化（extension 即 MCP server，把拆解外包给 MCP/ACP 标准）。选型核心判据不是功能清单，而是"你要对 harness 拥有多大控制权、控制发生在哪一层"。

## 冲突与演进

- 2026-07-08：《Agent=Model+Harness》文章从 VS Code 博客的第一手证据推出"第一方绑定可能是结构性最优组合"的推论，并列出五个反方论点自我制衡。
- 2026-07-10：ChatGPT Work 发布提供产品级印证——OpenAI 把 Codex harness 泛化为通用工作 harness 并与 GPT-5.6 深度绑定，第一方路线从推论变为可观察的行业动向。
- 2026-07-14：建页。评测体系三层（VSC-Bench→PR 门禁→生产 A/B）的工程细节归口 [[harness-engineering]]，门禁演化（选择性→全量评测）归口 [[meta-harness]]，本页聚焦路线之争本身。
- 2026-08-30：注入硅层 co-design（Jalapeño）与服务端工具全家桶（Computer Use 系列六/七）两组证据——第一方绑定的纵深与隐性福利。
- 2026-08-16：注入 Graph Engineering 讨论的显式图 vs 隐式图对垒（Claude workflows 可审计脚本 vs Codex V2 加密委派）——第一方绑定之外的第二条路线分歧轴："图给人看还是给机器看"。
- 2026-09-04：注入两条新维度——搜索挂载点决定覆盖面（系列七 Copilot 四挂载点 + Scout 挂靠闭环镜像，"服务端工具全家桶"Claim 的机制细化）与绑定×可分解十字定位（五平台横评，多模型阵营内部的第二维分层）。

## 关联概念

- [[harness-engineering]] — `extends` 把 harness 从工程实践议题延伸到产品战略层：引擎和车要不要同厂造
- [[agent-loop-architecture]] — `uses` turn/round/run 三层 tool-calling 循环是 harness 的内核结构，VS Code 与 Claude Code 已收敛
- [[meta-harness]] — `contrasts` 选择性评测门禁（人肉标签挑敏感改动）vs 全量评测体制（每个变体都评）；门禁守护 harness vs 门禁驱动 harness
- [[reinforcement-learning]] — `uses` agentic RL 使"模型在自家 harness 里训练"（训练分布对齐）成为第一方优势的技术根基

## 来源日记

- [[Agent=Model+Harness——从VS Code Copilot博客看第一方绑定与多模型适配的路线之争]] — 核心来源：harness 三职责、per-model 适配成本清单、第一方绑定推论、MCP 治理成本、五个反方论点
- [[2026-07-10-周五]] — ChatGPT Work 发布调研：Codex 并入 ChatGPT 桌面 app，Work/Codex 双模式，印证第一方绑定判断
- [[Graph Engineering全景解析——编排图、循环网络与类型化知识图的三重含义]] — 显式图 vs 隐式图路线对垒、"图的运维才是护城河"教训、模型写图的新特征
