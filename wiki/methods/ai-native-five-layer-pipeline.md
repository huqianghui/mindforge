---
title: "AI-Native 五层开发流水线"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - method
  - ai-native
  - pipeline
  - figma
  - superpowers
method_type: "pipeline"
related_concepts:
  - "[[ai-native-pipeline]]"
  - "[[harness-engineering]]"
  - "[[framework-selection]]"
related_methods:
  - "[[gsd-five-step-workflow]]"
---

# AI-Native 五层开发流水线

## 摘要

AI-Native 五层开发 Pipeline 将软件开发拆解为 5 个 AI 驱动的阶段，每个阶段有独立的 AI 工具和明确的输入输出。核心思路不是"用 AI 替代人写代码"，而是**让每个阶段产出下一阶段所需的 context 类型**——从视觉信息逐步转化为需求信息、变更信息、测试信息和审查信息。直接从 Figma 设计稿让 AI 写代码效果差，因为设计稿只有"像素级信息"而缺少"需求级信息"。

## 适用条件

- **前置依赖**：Figma（或同类设计工具）、Superpowers（或同类 Spec AI）、Claude Code（或同类 Coding Agent）、Playwright（或同类 Testing AI）
- **适用场景**：中大型项目的功能开发，尤其是有设计稿驱动的前端/全栈开发
- **不适用场景**：L1 级脚本/单文件项目（直接用 Coding AI 即可）；纯后端 API 开发（无设计稿输入）

## 步骤

### Step 1: Design AI（设计层）

- **输入**：产品需求、用户故事
- **操作**：使用 Figma 等设计工具生成 UI 设计稿
- **输出**：视觉层信息——页面布局、交互流程、组件样式
- **判断标准**：设计稿覆盖所有用户故事的核心页面

### Step 2: Spec AI（需求层）

- **输入**：设计稿 + 产品需求
- **操作**：使用 Superpowers Brainstorm 将设计稿转化为结构化需求文档
- **输出**：需求层信息——功能规格、业务逻辑、验收标准
- **判断标准**：需求文档回答了"做什么"和"为什么做"，不仅仅是"长什么样"

### Step 3: Coding AI（变更层）

- **输入**：需求文档 + 现有代码库
- **操作**：使用 OpenSpec Spec-Delta 生成增量代码变更
- **输出**：变更层信息——代码 diff、新增文件、修改记录
- **判断标准**：代码变更符合需求文档，通过基础编译

### Step 4: Testing AI（测试层）

- **输入**：代码变更 + 需求文档
- **操作**：使用 Playwright 等工具自动生成和执行测试
- **输出**：测试层信息——测试用例、覆盖率报告、失败清单
- **判断标准**：关键路径测试通过，覆盖率达标

### Step 5: Review AI（审查层）

- **输入**：代码变更 + 测试结果
- **操作**：使用 Superpowers code-reviewer 进行代码审查
- **输出**：审查层信息——代码质量评估、改进建议、安全扫描结果
- **判断标准**：无 P0/P1 问题，代码质量达标

## 决策点

| 条件 | 选择 | 理由 |
|------|------|------|
| L1 级项目（单文件/脚本） | 跳过 Step 1-2，直接 Step 3 | 不存在 Context Rot，Spec 是纯开销 |
| 无设计稿的后端项目 | 跳过 Step 1，从 Step 2 开始 | 后端需求可直接用文本描述 |
| 需求明确且简单 | 跳过 Step 2，从 Step 3 开始 | 需求级信息已足够清晰 |

## Claims

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

## 实践记录

<!-- 在实际项目中应用此方法后，记录结果反馈 -->

（暂无实践记录）

## 关联概念

- [[ai-native-pipeline]] — `implements` 此方法的概念定义页
- [[harness-engineering]] — `implements` Pipeline 是 Harness Engineering 的具体工作流实现
- [[framework-selection]] — `uses` Pipeline 各阶段对应不同框架选型

## 关联方法

- [[gsd-five-step-workflow]] — `uses` GSD 五步工作流是 Step 3 的详细实施方法

## 来源

- [[Vibe Coding系列03]] — AI-Native 开发实践：从 Figma 到 Spec-Delta 工作流
