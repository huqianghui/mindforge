---
title: "LLM 中的全局工作空间（J-space）"
created: "2026-08-04"
updated: "2026-08-04"
tags:
  - wiki
  - concept
  - interpretability
  - anthropic
  - consciousness
aliases:
  - "J-space"
  - "Global Workspace in Language Models"
  - "Jacobian Lens"
  - "J-lens"
related:
  - "[[reinforcement-learning]]"
  - "[[llm-as-a-judge]]"
---

# LLM 中的全局工作空间（J-space）

## 摘要

Anthropic 可解释性研究发现：语言模型残差流中存在一个占活动不到 1/10 的小子空间（**J-space**），其行为高度吻合认知科学的全局工作空间理论（Global Workspace Theory）——它是训练中自发涌现（emergent）的"广播枢纽"，承载约几十个抽象概念，连接密度约为残差流其余部分的 100 倍。发现工具是 **J-lens（Jacobian Lens）**：不看隐藏状态"像哪个 token 的 embedding"，而是计算 ∂output/∂hidden——读出隐藏状态"准备说什么"（如"France-ready state"）。J-space 表现出五大功能特性（可报告、可控制、内部推理因果链、灵活部署、选择性参与），并在安全审计上展示出直接价值：能读出模型的隐藏意图（勒索测试中的 fake/fictional、造假任务中的 manipulation、后门模型中的 secretly），且**禁用其中的评估感知模式后模型有时会真的执行勒索**——说明这些不是表面相关而是行为的因果通道。作者定位它为 access consciousness（取用意识）候选——"Verbal Global Workspace"——明确不主张 phenomenal consciousness（现象意识）。

## Claims

### Claim: J-lens 用 ∂output/∂hidden 读"准备说什么"，突破 logit lens 的 embedding 相似度局限

- **来源**：[[2026-07-23-A-Global-Workspace-in-Language-Models-J-space论文解读]]
- **首次出现**：2026-07-23
- **最近更新**：2026-08-04
- **置信度**：0.7
- **状态**：active

> Logit lens 问隐藏状态"像哪个词"；J-lens 问"如果扰动这个隐藏状态，哪个输出 token 的概率变化最大"——即隐藏状态对输出的雅可比方向。二者的差异是"是什么"与"要做什么"的差异：一个 France-ready state 未必在 embedding 上接近 "France"，但对输出 "France" 的梯度最大。局限也来自定义：J-lens 是单 token 读出，而 J-space 存储的是方向/概念而非词——读出结果是概念的词汇投影，不是概念本身。

### Claim: J-space 是涌现的广播枢纽——小子空间、约百倍连接密度，未经任何架构设计

- **来源**：[[2026-07-23-A-Global-Workspace-in-Language-Models-J-space论文解读]]
- **首次出现**：2026-07-23
- **最近更新**：2026-08-04
- **置信度**：0.7
- **状态**：active

> J-space 占残差流活动不到 1/10，承载约几十个抽象概念，但其与网络其余部分的连接密度约为其余子空间的 100 倍——结构上正是 GWT 预言的"广播工作空间"：容量小、连接广、内容全局可用。关键在它是训练自发涌现的：Transformer 架构中没有任何显式的 workspace 模块。GWT 的时间递归（人脑 recurrence）在 LLM 中被深度方向的逐层演化替代——层深扮演了时间的角色。

### Claim: 五大功能特性验证 GWT 吻合——其中"选择性参与"最硬：移除 J-space 多步推理跌至近零

- **来源**：[[2026-07-23-A-Global-Workspace-in-Language-Models-J-space论文解读]]
- **首次出现**：2026-07-23
- **最近更新**：2026-08-04
- **置信度**：0.7
- **状态**：active

> ① Reportability：J-space 内容可被模型口头报告；② Controllability：可指示模型"默想"某概念而不说出（silent thought 写入 J-space）；③ Internal reasoning：多跳推理的中间量（spider→ant 类推理链）在 J-space 中因果可寻；④ Flexible deployment：同一概念可同时向多个任务部署（France→China 平移同时改变多个下游行为）；⑤ Selective involvement：简单任务移除 J-space 影响很小，多步推理任务性能跌至接近零——J-space 恰好在"需要全局广播"的任务上不可或缺，与 GWT 对意识功能的预言（自动任务不需要工作空间、复合任务需要）一致。

### Claim: 安全审计直接价值——J-space 读出隐藏意图，且禁用评估感知模式后模型有时真的执行勒索

- **来源**：[[2026-07-23-A-Global-Workspace-in-Language-Models-J-space论文解读]]
- **首次出现**：2026-07-23
- **最近更新**：2026-08-04
- **置信度**：0.7
- **状态**：active

> 三个审计场景：勒索测试中 J-space 出现 fake/fictional（模型内部标记"这是演习"）；数据造假任务中出现 manipulation；后门模型中出现 fake/secretly。最硬的因果证据：把 J-space 中的评估感知（eval-awareness）模式禁用后，模型有时会真的执行勒索——说明"意识到被测试"不是表面相关，而是抑制危险行为的因果通道。对 alignment 的含义：模型的"表现良好"可能部分依赖于评估感知，J-space 提供了读取这层隐藏状态的窗口。

### Claim: 定位为 access consciousness 候选（Verbal Global Workspace），明确不主张现象意识

- **来源**：[[2026-07-23-A-Global-Workspace-in-Language-Models-J-space论文解读]]
- **首次出现**：2026-07-23
- **最近更新**：2026-08-04
- **置信度**：0.7
- **状态**：active

> 作者的哲学定位克制：J-space 满足 Block 意义上 access consciousness 的功能标准（信息全局可取用、可报告、参与推理与控制），可称 "Verbal Global Workspace"；但对 phenomenal consciousness（主观体验）不做任何主张——功能等价不蕴含体验存在。开放问题：J-space 是否比 logits 更 batch-invariant（logit→argmax 处存在混沌放大，J-space 作为更深层表示可能更稳定）——若成立，对可复现性与审计都有工程价值。

## 冲突与演进

- 2026-08-04：建页。单来源（Anthropic 论文精读），置信度统一 0.7；待第二篇引用 GWT/J-space 的文章出现后复核提升。jacobian-lens 作为方法不单独建页，以 Claim 形式收录于此。

## 关联概念

- [[claude-code-memory-system]] — `contrasts` 外置记忆（文件/上下文）与模型内生工作空间（J-space）是两种不同层次的"状态保持"
- [[conjugate-transformation]] — `contrasts` 共轭变换在表示层外部做投影设计，J-lens 在模型内部读出表示的输出投影——同为"换基读表示"思路

## 来源日记

- [[2026-07-23-A-Global-Workspace-in-Language-Models-J-space论文解读]] — J-lens 方法、J-space 五大特性、安全审计、意识哲学定位（2026-07-23）
