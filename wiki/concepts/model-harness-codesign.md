---
title: "Model-Harness Codesign（模型-Harness 协同设计）"
created: "2026-07-14"
updated: "2026-07-14"
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

## 冲突与演进

- 2026-07-08：《Agent=Model+Harness》文章从 VS Code 博客的第一手证据推出"第一方绑定可能是结构性最优组合"的推论，并列出五个反方论点自我制衡。
- 2026-07-10：ChatGPT Work 发布提供产品级印证——OpenAI 把 Codex harness 泛化为通用工作 harness 并与 GPT-5.6 深度绑定，第一方路线从推论变为可观察的行业动向。
- 2026-07-14：建页。评测体系三层（VSC-Bench→PR 门禁→生产 A/B）的工程细节归口 [[harness-engineering]]，门禁演化（选择性→全量评测）归口 [[meta-harness]]，本页聚焦路线之争本身。

## 关联概念

- [[harness-engineering]] — `extends` 把 harness 从工程实践议题延伸到产品战略层：引擎和车要不要同厂造
- [[agent-loop-architecture]] — `uses` turn/round/run 三层 tool-calling 循环是 harness 的内核结构，VS Code 与 Claude Code 已收敛
- [[meta-harness]] — `contrasts` 选择性评测门禁（人肉标签挑敏感改动）vs 全量评测体制（每个变体都评）；门禁守护 harness vs 门禁驱动 harness
- [[reinforcement-learning]] — `uses` agentic RL 使"模型在自家 harness 里训练"（训练分布对齐）成为第一方优势的技术根基

## 来源日记

- [[Agent=Model+Harness——从VS Code Copilot博客看第一方绑定与多模型适配的路线之争]] — 核心来源：harness 三职责、per-model 适配成本清单、第一方绑定推论、MCP 治理成本、五个反方论点
- [[2026-07-10-周五]] — ChatGPT Work 发布调研：Codex 并入 ChatGPT 桌面 app，Work/Codex 双模式，印证第一方绑定判断
