---
title: "Context Engineering"
created: "2026-04-13"
updated: "2026-11-24"
tags:
  - wiki
  - concept
  - context
  - ai-engineering
  - mcp
aliases:
  - "Context Engineering"
  - "上下文工程"
related:
  - "[[model-context-protocol]]"
  - "[[context7]]"
  - "[[cybernetics-agent-design]]"
  - "[[harness-engineering]]"
  - "[[claude-code-memory-system]]"
  - "[[rag-architecture-comparison]]"
---

# Context Engineering

## 摘要

Context Engineering 是从 Prompt Engineering 的正式演进——Prompt Engineering 关注"对模型说什么"，Context Engineering 治理"模型响应时知道什么"。LLM 性能限制很少源于模型本身缺陷，更多是不完整、不一致或不相关的上下文造成的。成熟 AI 系统架构应有 Context Engineering Layer（认知核心）和 Tool Interaction Layer（MCP 服务器），两者各司其职。Context Engineering 是"操作系统"，MCP 是"USB-C 接口"。

## Claims

### Claim: LLM 性能限制通常是上下文问题而非模型缺陷

- **来源**：[[Context-Engineering-vs-Model-Context-Protocol]]、[[02-Context-Engineering]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（查过：wiki/ paper/ Notes/ 中同主题页与来源文章 git log，2026-04 后仅有标题精简/链接格式类改动，无反向结论）

> LLM performance limitations are rarely due to inherent model flaws -- they are a direct consequence of incomplete, inconsistent, or irrelevant context.

### Claim: Context Engineering 是 Prompt Engineering 的正式演进

- **来源**：[[Context-Engineering-vs-Model-Context-Protocol]]、[[01-Defining-the-Modern-AI-Interaction-Paradigm]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（查过：wiki/ paper/ Notes/ 中同主题页与来源文章 git log，2026-04 后仅有标题精简/链接格式类改动，无反向结论）

> Prompt engineering 关注"说什么"，CE 治理"模型知道什么"。企业采用驱动了这一转变。

### Claim: Context window 应被视为 LLM 的"RAM"

- **来源**：[[Context-Engineering-vs-Model-Context-Protocol]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（查过：wiki/ paper/ Notes/ 中同主题页与来源文章 git log，2026-04 后仅有标题精简/链接格式类改动，无反向结论）

> 模型的整个推理工作记忆，用正确信息填充它是核心架构挑战。

### Claim: Context Engineering 是"操作系统"，MCP 是"USB-C 接口"

- **来源**：[[04-A-Comparative-Framework]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（查过：wiki/ paper/ Notes/ 中同主题页与来源文章 git log，2026-04 后仅有标题精简/链接格式类改动，无反向结论）

> CE 整体管理 LLM 的 context window，MCP 提供标准化外部工具/数据接口。两者互补而非竞争。

### Claim: MCP 标准化为未来 AI "App Store" 生态奠基

- **来源**：[[05-Strategic-Implications-and-Future-Outlook]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 修订——依据：官方 MCP Registry 已于 2025-09-08 以 preview 上线（open catalog + API，DNS 命名空间校验），迄今文档仍标 preview：https://blog.modelcontextprotocol.io/posts/2025-09-08-mcp-registry-preview ；https://modelcontextprotocol.io/registry/about

> **现行结论（2026-11-07 修订）**：官方 MCP Registry 已存在但仍为 preview，且为公开服务器元数据目录；『Agent 无需人类预先配置地动态发现』仍属愿景，不是现状
>
> 以下为原记录：
> Agent 将动态发现、配置和使用全球 MCP 注册表中的能力，无需人类预先配置。

### Claim: AI 的可持续竞争优势来自上下文环境而非模型本身

- **来源**：[[05-Strategic-Implications-and-Future-Outlook]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-15
- **置信度**：0.8
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（查过：wiki/ paper/ Notes/ 中同主题页与来源文章 git log，2026-04 后仅有标题精简/链接格式类改动，无反向结论）

> 优势不来自对某个基础模型的访问，而来自围绕它构建的卓越、专有的 context-rich 环境。

### Claim: 把上下文当一条供应链来看——取料、加工、库存、即时检索、最后装配五段，任何一段出问题都会传到输出，最后一段的提示模板补不了前面的过期数据或错误检索

- **来源**：[[02-Context-Engineering]]
- **首次出现**：2025-08-17
- **最近更新**：2026-11-16
- **置信度**：0.6
- **状态**：active
- **证据类型**：理论（长效）

> 五段：① 取料——文档、数据库、外部 API、用户历史等原始来源；② 加工——分块、生成向量、补元数据；③ 库存——向量库等知识存储，要像仓库一样管"变质"（更新、过期、版本）；④ 即时检索——查询到来时按相关性取最相关的块，是质量控制点；⑤ 装配——按提示模板把检索结果与系统指令、对话历史、工具定义拼进上下文窗口。用处在于定位问题：答错时先问是哪一段坏了，而不是一律改提示词。本库"编译一次、持续维护"的 wiki 相当于把③做重、④做轻（见 [[personal-knowledge-compiler]]）。文章为英文综述（2025-08），偏概念框架，未附实测。

### Claim: 上下文压缩是否有损，取决于任务状态存在哪里——进度已经落在外部环境里的任务几乎无损，状态只在上下文里的任务越压越差，而且压缩不只会漏信息，还会改写信息

- **来源**：[CompAct-Bench: A Benchmark for Working-Context Compaction in Long-Horizon Agent Tasks](https://arxiv.org/abs/2611.25673)、[You don't need long context](https://arxiv.org/abs/2611.05306)
- **首次出现**：2026-11-23
- **最近更新**：2026-11-23
- **置信度**：0.65
- **状态**：active
- **证据类型**：理论

> CompAct-Bench 从 200 条压缩前三次都能做对的成功轨迹出发，在执行到 25%、50%、75% 处插入压缩边界，让 12 个前沿模型各自压缩前面的上下文，再由同一个执行器从对应的环境状态接着做。压缩后平均准确率掉到 56.7%，最好的 Claude Opus 5 也只有 68.5%。损失不均匀：搜索类（BrowseComp）随边界后移从 52.9% 降到 42.6%、34.6%，编码类（SWE-bench）反而从 64.0% 升到 72.7%、86.1%——编码的进度已经写进代码仓库，仓库充当了外部记忆，压缩丢的是历史而不是状态；搜索的证据只在上下文里。失败有两条路：信息被漏掉时 agent 重复做已做过的事直到预算耗尽；信息被改写（把待定的证据写成结论、把已有的进展弄丢）时 agent 提前结束。另一篇 You don't need long context 的结论是频繁压缩几乎不掉精度，甚至每做一个动作就压一次，Claude Opus 4.5 在 SWE-bench Verified 上持平、Terminal-Bench 上高 4.6 个百分点，GPT 5.6 Sol 分别低 2.0 和 3.3 个百分点；它测的正是状态落在环境里的软件工程类任务，所以和 CompAct-Bench 不矛盾。该文还给出压缩的动机：开源前沿模型上越靠后的 token 生成越贵，最多差 7 倍。两篇都是外部论文结论，没有在自己的 harness 上复测。

### Claim: 压缩照做、另存一份只追加的完整日志、需要细节时 grep 回来——比纯摘要和观察遮蔽准确得多，token 开销多数情况下接近

- **来源**：[Forget Freely, Grep Later: Lossless, Index-Free Memory for Long-Horizon LLM Agents](https://arxiv.org/abs/2611.25123)
- **首次出现**：2026-11-23
- **最近更新**：2026-11-23
- **置信度**：0.6
- **状态**：active
- **证据类型**：理论

> GrepMem 把有损的上下文摘要和无损的轨迹日志配在一起：日志是 agent 全部历史的纯文本、只追加，agent 只多一个 `grep_history` 工具按正则取回细节，不需要 embedding、检索索引或额外模型。用强化学习在五种上下文管理策略下训练 Qwen3.5-9B 对比：ContextBench 上准确率 95%~97%，SUPO 式摘要和观察遮蔽最多 21%；BCP-Multi 上比 SUPO 高 8.8 个百分点、比 MemGPT 高 7.0。token 开销：比 SUPO 在 BCP-Multi 多 6%、ContextBench 多 19%，只有 MemGPT 的 29%；例外是 AMA-Bench stream，token 是 SUPO 的 2.3 倍、每条轨迹调 grep 约 19 次，准确率只略高。优势最大的场景是"上下文窗口之外的精确细节后面还要用"。证据是一篇论文、一个 9B 模型，置信度留在 0.6；它和上一条一起说明，压缩的问题可以用"不删原件、只换工作集"来缓解，这与 [[claude-code-memory-system]] 里"压缩后哪些指令从磁盘重新注入"是同一个思路。

### Claim: Claude Code 的上下文按固定顺序组装，长任务里压缩几乎必然发生——要长期有效的信息写进文件，不要只留在对话里

- **来源**：[[Claude-Code系列01：核心概念与设计哲学]]
- **首次出现**：2026-04-16
- **最近更新**：2026-11-24
- **置信度**：0.7
- **状态**：active
- **证据类型**：实测经验

> 实际发给模型的是：固定系统提示 + 启动加载的 CLAUDE.md + MEMORY.md 索引 + 按条件加载的 rules + 按需注入的 skill + 累积的对话历史。接近窗口上限时自动压缩：保留系统提示、近期关键信息和当前任务，早期轮次被摘要替代，是有损的，用户也无法手动指定保留哪些。短任务（5 万 token 以内）基本不触发；10 万以上几乎必然发生，压缩后模型可能忘掉之前的决定和约定。对策是关键信息写文件——文件持久，对话会被压缩。这和本页"压缩是否有损取决于任务状态存在哪里"是同一件事的工程做法：把状态挪到外部环境里，压缩丢的就只是历史；[[meta-harness]] 的消融（分数加 LLM 摘要 34.9%，给完整原始轨迹 50.0%）也说明摘要补不回丢掉的因果信息。压缩的存在也解释了为什么 CLAUDE.md 要精简、skill 按需加载、subagent 用独立上下文。

### Claim: 上下文能填满不代表应该填满——长会话有两种失败：上下文耗尽丢掉进度、模型高估完成度提前收工；对策是分层加载、按工作区裁剪 MCP、把插件开关当上下文开关

- **来源**：[[Agentic-Engineering：质量与成本一体化]]
- **首次出现**：2026-05-31
- **最近更新**：2026-11-24
- **置信度**：0.6
- **状态**：active
- **证据类型**：理论

> 原因是注意力不均：模型偏向上下文开头和结尾，中间的信息容易丢；用量超过一半后更偏向末尾，早期指令被"忘掉"。"提前宣布完成"的根因是没有外部验证纠正模型对完成度的高估。对策有三类：一是分层加载——系统指令始终加载、项目指令打开项目时加载、skill 按关键词触发、MCP 工具首次调用时动态发现；二是按工作区裁剪 MCP，文中案例从 15 个 server、187 个工具、每个任务约 26.5 万 token 降到 3 个 server、50 个工具、约 7.5 万 token，schema 开销少 72%（后端不需要设计稿工具，前端不需要数据库 schema）；三是插件的启用与禁用就是上下文开关，禁用后其中的 skill、MCP、hooks、agents 都不进上下文。数字是文中引用的案例，不是我自己的测量。与 [[mcp-vs-cli]] 里"tool search 延迟加载缓解了膨胀"是同一问题的两种解法。

## 冲突与演进

- 2026-11-24：/extract-knowledge 厚度补抽 Agentic Engineering：新增"上下文腐化的两种失败与三类对策"一条。
- 2026-11-24：/extract-knowledge 厚度补抽 Claude Code 系列 01：新增"上下文组装顺序与关键信息写文件"一条，与压缩适用条件那条互相印证。
- 2026-11-23：知识差距分析 2026-11-23 落实，新增上下文压缩两条（CompAct-Bench + You don't need long context；GrepMem），三篇均已读全文；两篇"压缩是否有损"的结论表面相反，按"任务状态存在哪里"统一。
- 2026-11-07：/revalidate 全库复核（证据分类）——长效 5

## 关联概念

- [[model-context-protocol]] — `uses` MCP 本身的定义与 runtime 落点
- [[harness-engineering]] — `part-of` Context Engineering 是 Harness Engineering 的子集
- [[context7]] — `uses` Context7 是 Context Engineering 的文档层工具
- [[cybernetics-agent-design]] — `implements` Context 管理是共轭变换（表示层设计）的工程实践
- [[claude-code-memory-system]] — `uses` 压缩后从磁盘重新注入指令，与"压缩 + 完整日志按需取回"同一思路
- [[rag-architecture-comparison]] — `part-of` 供应链里"即时检索"那一段的架构选择，含 agentic 检索

## 来源日记

- [[00-Full-Article]] / [[Context-Engineering-vs-MCP-MOC]] — Context Engineering vs MCP 全文与章节导航
- [[01-Defining-the-Modern-AI-Interaction-Paradigm]] — 从 prompt engineering 到上下文的演进动因
- [[02-Context-Engineering]] — 定义、技术工具箱、上下文供应链
- [[03-Model-Context-Protocol]] — MCP 架构与三种原语（MCP 本身的论断归口待建的 MCP 页）
- [[98-Conclusion]] — 学科与协议互补：CE 是认知架构、MCP 是标准化的神经系统
- [[Context-Engineering-vs-Model-Context-Protocol]] — CE vs MCP 关系辨析
- [[04-A-Comparative-Framework]] — 操作系统与 USB-C 比喻
- [[05-Strategic-Implications-and-Future-Outlook]] — 战略展望
- [[Claude-Code系列01：核心概念与设计哲学]] — 上下文组装顺序、压缩的触发与对策
- [[Agentic-Engineering：质量与成本一体化]] — 上下文腐化、分层加载与 MCP 裁剪
