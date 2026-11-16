---
title: "Context Engineering"
created: "2026-04-13"
updated: "2026-11-16"
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

## 冲突与演进

（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——长效 5

## 关联概念

- [[model-context-protocol]] — `uses` MCP 本身的定义与 runtime 落点
- [[harness-engineering]] — `part-of` Context Engineering 是 Harness Engineering 的子集
- [[context7]] — `uses` Context7 是 Context Engineering 的文档层工具
- [[cybernetics-agent-design]] — `implements` Context 管理是共轭变换（表示层设计）的工程实践

## 来源日记

- [[00-Full-Article]] / [[Context-Engineering-vs-MCP-MOC]] — Context Engineering vs MCP 全文与章节导航
- [[01-Defining-the-Modern-AI-Interaction-Paradigm]] — 从 prompt engineering 到上下文的演进动因
- [[02-Context-Engineering]] — 定义、技术工具箱、上下文供应链
- [[03-Model-Context-Protocol]] — MCP 架构与三种原语（MCP 本身的论断归口待建的 MCP 页）
- [[98-Conclusion]] — 学科与协议互补：CE 是认知架构、MCP 是标准化的神经系统
- [[Context-Engineering-vs-Model-Context-Protocol]] — CE vs MCP 关系辨析
- [[04-A-Comparative-Framework]] — 操作系统与 USB-C 比喻
- [[05-Strategic-Implications-and-Future-Outlook]] — 战略展望
