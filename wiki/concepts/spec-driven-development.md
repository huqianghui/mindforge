---
title: "Spec-Driven Development（SDD）"
created: "2026-07-21"
updated: "2026-07-21"
tags:
  - wiki
  - concept
  - methodology
  - ai-coding
aliases:
  - "SDD"
  - "规格驱动开发"
related:
  - "[[spec-kit]]"
  - "[[generation-evaluation-separation]]"
  - "[[harness-engineering]]"
---

# Spec-Driven Development（SDD）

## 摘要

Spec-Driven Development（规格驱动开发）是 AI 时代的开发方法论：规格（Spec）成为第一等公民，代码是规格的实现产物——即"Power Inversion"（权力反转，代码服务于规格而非规格服务于代码）。SDD 通过模板约束 AI 生成、Constitution 固化项目原则（Test-First 不可协商）、并与 TDD/V-Model 融合形成"规格轨 + 验证轨"双轨演进。核心分工是"AI 起草，人类拍板，脚本验证，Git 记账"。

## Claims

### Claim: SDD 的核心是 Power Inversion——代码服务于规格

- **来源**：[[Spec Kit系列00：SDD、TDD与V-Model融合——从Red-Green-Refactor到规格与验证双轨演进]]
- **首次出现**：2026-07-20
- **最近更新**：2026-07-21
- **置信度**：0.8
- **状态**：active

> 传统开发中规格是给代码打工的临时文档，写完即弃；SDD 反转权力关系：规格是持久的第一等公民，代码是从规格生成的产物，规格变更驱动代码再生成。这是 spec-driven.md 官方文档的核心论点。

### Claim: 模板即约束——SDD 用七种模板手法把方法论编译进 AI 工作流

- **来源**：[[Spec Kit系列00：SDD、TDD与V-Model融合——从Red-Green-Refactor到规格与验证双轨演进]]
- **首次出现**：2026-07-20
- **最近更新**：2026-07-21
- **置信度**：0.8
- **状态**：active

> SDD 不靠说教靠模板结构约束 AI 行为：强制章节、`[NEEDS CLARIFICATION]` 标记（禁止 AI 猜测）、检查清单门禁、宪法条款引用、阶段门（phase gate）、反过度设计条款、可执行验收标准。方法论以模板为载体被"编译"进每次生成。

### Claim: Constitution 是项目级不可变原则，Test-First 不可协商

- **来源**：[[Spec Kit系列00：SDD、TDD与V-Model融合——从Red-Green-Refactor到规格与验证双轨演进]]
- **首次出现**：2026-07-20
- **最近更新**：2026-07-21
- **置信度**：0.8
- **状态**：active

> Spec Kit 的 Constitution 九条中 Article III（Test-First）标注 NON-NEGOTIABLE：任何实现必须先有失败的测试。TDD 在 SDD 中不是消失而是换位——从开发者手动红绿重构，变成写进宪法由流程强制、由 AI 执行的结构性约束。

### Claim: V-Model 双轨——每层规格配对测试规格，用确定性脚本验证追溯

- **来源**：[[Spec Kit系列00：SDD、TDD与V-Model融合——从Red-Green-Refactor到规格与验证双轨演进]]
- **首次出现**：2026-07-20
- **最近更新**：2026-07-21
- **置信度**：0.7
- **状态**：active

> spec-kit-v-model 扩展把 SDD 与 V-Model 融合：左轨规格分解（需求→架构→详设）每层配对右轨测试规格，Traceability Matrix 由确定性脚本（非 LLM）验证覆盖率。其 Compliant 模式含 8 阶段验证门，Hybrid 模式绕过验证门则不构成合规证据。金融行业（SR 11-7 / ECB TRIM / BCBS 239 / PCI DSS / SOX）的准 V-Model 要求是此扩展的现实需求来源。

### Claim: SDD 的角色分工是"AI 起草，人类拍板，脚本验证，Git 记账"

- **来源**：[[Spec Kit系列00：SDD、TDD与V-Model融合——从Red-Green-Refactor到规格与验证双轨演进]]
- **首次出现**：2026-07-20
- **最近更新**：2026-07-21
- **置信度**：0.7
- **状态**：active

> 四方分工：AI 负责起草规格与代码（生成），人类负责判断与批准（评估），确定性脚本负责验证追溯（凡可确定性计算的不交给 LLM），Git 负责审计追踪（每次拍板留痕）。这是 [[generation-evaluation-separation]] 在规格/合规域的实例，也符合 [[harness-engineering]] 的确定性外壳原则。

### Claim: 行业采用呈三层模型

- **来源**：[[Spec Kit系列00：SDD、TDD与V-Model融合——从Red-Green-Refactor到规格与验证双轨演进]]
- **首次出现**：2026-07-20
- **最近更新**：2026-07-21
- **置信度**：0.6
- **状态**：active

> 第一层轻量 spec 提示（多数个人开发者）、第二层结构化 SDD 工作流（spec-kit 等工具用户）、第三层合规级双轨（受监管行业，V-Model 扩展）。采用深度由外部约束（监管/协作规模）而非个人偏好驱动。

## 冲突与演进

（暂无）

## 关联概念

- [[generation-evaluation-separation]] — `grounds` "AI 起草，人类拍板"的分工由生成-评估分离原则提供理论基础
- [[harness-engineering]] — `grounds` "确定性脚本验证、不交给 LLM"是 Harness 工程原则在方法论层的应用

## 来源日记

- [[Spec Kit系列00：SDD、TDD与V-Model融合——从Red-Green-Refactor到规格与验证双轨演进]] — SDD/TDD/V-Model 融合方法论（2026-07-20）
- [[Spec Kit系列01：初步整体认识——SDD十命令工作流、Scope粒度与协作扩展]] — SDD 在 spec-kit 中的工程落地（2026-07-20）
