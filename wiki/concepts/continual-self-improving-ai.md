---
title: "Continually Self-Improving AI"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - ai-research
  - entigraph
  - sbp
  - self-improving
aliases:
  - "持续自我改进 AI"
  - "EntiGraph"
  - "SBP"
related:
  - "[[bitter-lesson]]"
  - "[[rag-architecture-comparison]]"
---

# Continually Self-Improving AI

## 摘要

当前 LLM 面临三个根本限制：静态权重、有限人类数据依赖、人类设计的训练算法。EntiGraph 通过实体-关系合成语料 + 持续预训练，用比传统 CPT 小约 10,000 倍的源语料实现接近 RAG 的性能。SBP（Synthesis-Based Pretraining）使用高熵训练目标提升跨文档关系建模能力。EntiGraph + RAG 优于纯 RAG，证明知识内化与检索增强互补而非竞争。

## Claims

### Claim: LLM 面临三个根本限制

- **来源**：[[2026-03-22-Continually-Self-Improving-AI论文精读笔记]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> 静态权重（有限 context 记忆）、有限人类数据（power-law scaling 触顶）、人类设计的训练算法。

### Claim: EntiGraph 用极小源语料实现接近 RAG 的性能

- **来源**：[[2026-03-22-Continually-Self-Improving-AI论文精读笔记]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 通过实体-关系合成语料 + 持续预训练，源语料可比传统 CPT 小约 10,000 倍。

### Claim: EntiGraph + RAG 优于纯 RAG

- **来源**：[[2026-03-22-Continually-Self-Improving-AI论文精读笔记]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 知识内化与检索增强互补而非竞争。

### Claim: SBP 用高熵训练目标提升跨文档关系建模

- **来源**：[[2026-03-22-Continually-Self-Improving-AI论文精读笔记]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：active

> 一个文档映射到多个相关文档，强制模型提炼共享抽象概念。

## 冲突与演进

（暂无）

## 关联概念

- [[bitter-lesson]] — `grounds` 持续自我改进体现"计算胜过人工知识"
- [[rag-architecture-comparison]] — `uses` EntiGraph + RAG 互补关系

## 来源日记

- [[2026-03-22-Continually-Self-Improving-AI论文精读笔记]] — 论文精读
