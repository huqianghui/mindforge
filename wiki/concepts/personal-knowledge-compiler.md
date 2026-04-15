---
title: "Personal Knowledge Compiler"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - knowledge-management
  - obsidian
  - omc
aliases:
  - "个人知识编译器"
  - "PKC"
related:
  - "[[llm-wiki]]"
  - "[[notion-as-ai-layer]]"
---

# Personal Knowledge Compiler

## 摘要

个人知识编译器（PKC）是将日记/笔记/文章通过 LLM 编译为结构化知识库的实践。核心洞察：日记按时间线写但按主题消费，存在根本性结构错配。Karpathy 的 LLM Wiki 模型将 LLM 视为知识维护者（像 Wikipedia 编辑）而非问答者——"RAG = search, LLM Wiki = writing a book"。

## Claims

### Claim: 日记存在写入与消费的结构错配

- **来源**：[[从日记到知识库：Obsidian × oh-my-claudecode × LLM Wiki 的个人知识编译实践]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 日记按时间线写但按主题消费，线性增长没有网络效应，大多笔记"写后即沉"。

### Claim: LLM Wiki 模型——LLM 是维护者不是问答者

- **来源**：[[从日记到知识库：Obsidian × oh-my-claudecode × LLM Wiki 的个人知识编译实践]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> "RAG = search, LLM Wiki = writing a book"。Karpathy 模型。

### Claim: 知识碎片化问题及解法

- **来源**：[[从日记到知识库：Obsidian × oh-my-claudecode × LLM Wiki 的个人知识编译实践]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.6
- **状态**：active

> OMC Wiki（.omc/wiki/）与 Obsidian vault（Notes/）并存导致同一概念可能存在两处。解法：将 LLM Wiki 概念直接整合到 Obsidian vault 的 wiki/ 目录。

### Claim: PKC 四层知识模型——Concept/Method/Decision/Typed Relations

- **来源**：[[2026-04-13-周一]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> PKC 从单一概念层演进为四层模型：Concept（What）→ Method（How）→ Decision（Why）→ Typed Relations（How connected）。每层解决不同类型的知识问题：概念页记录声明式知识，方法页记录步骤化过程知识，决策页记录选型论证，8 种类型化关联记录知识间的语义关系。当前规模：40 concepts + 8 methods + 4 decisions + ~160 claims。

### Claim: 五项高维度改进构成 PKC 持续演进机制

- **来源**：[[2026-04-13-周一]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> 实践反馈闭环（方法→实践→置信度回写）、知识成熟度模型（6维度×4级别）、Why/决策层、类型化关联（8种）、跨切面查询（6种查询类型）——五项改进将 PKC 从"提取→记录"升级为"提取→验证→演进→查询"的完整知识管理循环。

### Claim: 知识图谱可视化让 PKC 从文本走向交互式图谱

- **来源**：[[2026-04-15-周三]]
- **首次出现**：2026-04-15
- **最近更新**：2026-04-15
- **置信度**：0.7
- **状态**：active

> 通过 Python 导出脚本（wiki → JSON）+ React 力导向图（react-force-graph-2d），PKC 的 53 个节点、141 条关联、180 条 Claims 可在浏览器中交互式浏览。部署到 GitHub Pages 后可随时访问，不依赖本地环境。这是 PKC 从"编译知识"到"可视化知识生态"的关键一步。

## 冲突与演进

（暂无）

## 关联概念

- [[llm-wiki]] — LLM Wiki 是 PKC 的理论基础
- [[notion-as-ai-layer]] — Notion 在知识管理中的替代方案
- [[personal-knowledge-compiler-workflow]] — 实施方法：日记到知识库的编译工作流

## 来源日记

- [[从日记到知识库：Obsidian × oh-my-claudecode × LLM Wiki 的个人知识编译实践]] — PKC 实践文章
- [[2026-04-13-周一]] — 四层知识模型演进、五项高维度改进实施
