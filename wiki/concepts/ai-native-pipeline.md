---
title: "AI-Native Development Pipeline"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - concept
  - ai-native
  - pipeline
  - figma
  - superpowers
aliases:
  - "AI-Native 五层开发 Pipeline"
  - "五层 Pipeline"
related:
  - "[[framework-selection]]"
  - "[[harness-engineering]]"
---

# AI-Native Development Pipeline

## 摘要

AI-Native 五层开发 Pipeline 不是工具的串联而是思维模式的转换。核心流程：Design AI（Figma，回答"长什么样"）→ Spec AI（Superpowers Brainstorm，回答"做什么为什么做"）→ Coding AI（OpenSpec Spec-Delta，回答"这次改什么"）→ Testing AI → Review AI。从 Figma 直接让 AI 写代码效果差的根因是设计稿只有"像素级信息"而缺少"需求级信息"。

## Claims

### Claim: 从 Figma 直接让 AI 写代码效果差

- **来源**：[[Vibe Coding系列03]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> 根因：AI 拿到的是"像素级信息"，缺的是"需求级信息"——设计稿本身不包含足够信息让 AI 写出好代码。

### Claim: 五层 Pipeline 是思维模式的转换

- **来源**：[[Vibe Coding系列03]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> Figma 回答"长什么样"（视觉层），Brainstorm 回答"做什么为什么做"（需求层），Spec-Delta 回答"这次改什么"（变更层）。

### Claim: 每阶段输出的 context 类型完全不同

- **来源**：[[Vibe Coding系列03]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> Design AI → Spec AI → Coding AI → Testing AI → Review AI，每个阶段产出的信息类型（视觉/需求/变更/测试/审查）各不相同。

## 冲突与演进

（暂无）

## 关联概念

- [[framework-selection]] — `uses` Pipeline 各阶段对应不同框架
- [[harness-engineering]] — `implements` Pipeline 是 Harness Engineering 的具体工作流实现
- [[ai-native-five-layer-pipeline]] — `produces` 实施方法：五层流水线的详细步骤和决策点

## 来源日记

- [[Vibe Coding系列03]] — AI-Native 开发实践
