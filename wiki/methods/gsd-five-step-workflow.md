---
title: "GSD 五步开发工作流"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - method
  - gsd
  - superpowers
  - workflow
method_type: "workflow"
related_concepts:
  - "[[three-layer-plugin-architecture]]"
  - "[[framework-selection]]"
related_methods:
  - "[[ai-native-five-layer-pipeline]]"
  - "[[gsd-project-scale-selection]]"
  - "[[code-reuse-four-layer-defense]]"
---

# GSD 五步开发工作流

## 摘要

GSD（Get Stuff Done）五步工作流是使用 GSD + Superpowers 进行 Vibe Coding 的标准执行流程。五个阶段：Init（初始化）→ Clarify（澄清需求）→ Plan（制定计划）→ Execute（执行编码）→ Verify（验证交付）。配合三级缺陷修复升级机制（L1 自动修复 → L2 针对性调试 → L3 外部协助），确保交付质量。

## 适用条件

- **前置依赖**：GSD 插件已安装、Superpowers 已配置、CLAUDE.md 路由规则已设置
- **适用场景**：L2 级项目（多文件模块，Context 需要管理）
- **不适用场景**：L1 级项目（GSD 是纯开销）；L4 级超大项目（需要手动拆分）

## 步骤

### Step 1: Init（初始化）

- **输入**：项目目录
- **操作**：运行 GSD init，生成项目 Spec 文件和初始 Context
- **输出**：`spec.md` + `.gsd/` 目录结构
- **判断标准**：Spec 文件准确描述项目当前状态

### Step 2: Clarify（澄清需求）

- **输入**：用户需求描述 + 现有 Spec
- **操作**：GSD 引导用户明确需求边界、优先级、验收标准
- **输出**：结构化需求文档，附带验收条件
- **判断标准**：需求无歧义，每条需求都有明确的"完成"定义

### Step 3: Plan（制定计划）

- **输入**：结构化需求 + 现有代码
- **操作**：GSD 生成执行计划——拆分任务、确定顺序、预估影响范围
- **输出**：分步执行计划，每步标注修改文件和预期输出
- **判断标准**：计划覆盖所有需求，步骤间依赖关系清晰

### Step 4: Execute（执行编码）

- **输入**：执行计划
- **操作**：按计划逐步执行编码，每步完成后更新 Spec 状态
- **输出**：代码变更 + 更新后的 Spec
- **判断标准**：每步代码变更通过基础编译，Spec 状态与实际一致

### Step 5: Verify（验证交付）

- **输入**：完成的代码变更
- **操作**：运行 Superpowers verify 流程——测试、code-review、复用检查
- **输出**：验证报告（测试结果 + 审查意见）
- **判断标准**：所有测试通过，无 P0/P1 审查问题

## 决策点

| 条件 | 选择 | 理由 |
|------|------|------|
| Verify 发现 L1 缺陷（格式/lint） | Agent 自动修复，重新 Verify | 自动化处理，无需人工介入 |
| Verify 发现 L2 缺陷（逻辑错误） | 针对性调试，修复后重新 Verify | 需要 Agent 理解上下文做针对性修复 |
| Verify 发现 L3 缺陷（架构问题） | 升级到人工或回到 Step 2 重新 Clarify | Agent 无法独立解决架构级问题 |

## Claims

### Claim: 三层定位——GSD/Superpowers/gstack

- **来源**：[[Vibe Coding系列08]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：active

> GSD 管"做对的事情"，Superpowers 管"做事情的方法对"，gstack 管"做完能交付"。

### Claim: 必须用 CLAUDE.md 声明式路由消除 skill 匹配歧义

- **来源**：[[Vibe Coding系列09]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：active

> Claude Code 遇到泛指令时按路由表查表执行而非随机匹配。

## 实践记录

<!-- 在实际项目中应用此方法后，记录结果反馈 -->

（暂无实践记录）

## 关联概念

- [[three-layer-plugin-architecture]] — `uses` 三层架构是此工作流的框架基础
- [[framework-selection]] — `implements` 框架选型决定是否使用此工作流

## 关联方法

- [[ai-native-five-layer-pipeline]] — `part-of` 五层 Pipeline 是更宏观的流程，GSD 五步对应其 Step 3
- [[gsd-project-scale-selection]] — `uses` 规模分级决定是否采用 GSD 五步
- [[code-reuse-four-layer-defense]] — `uses` 四层防线可嵌入 Step 5 Verify 流程

## 来源

- [[Vibe Coding系列04]] — GSD + Superpowers 组合实践
- [[Vibe Coding系列08]] — 三层架构与定位分析
