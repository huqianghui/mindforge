---
title: "个人知识编译工作流"
created: "2026-04-13"
updated: "2026-04-13"
tags:
  - wiki
  - method
  - knowledge-management
  - obsidian
  - llm-wiki
method_type: "workflow"
related_concepts:
  - "[[personal-knowledge-compiler]]"
  - "[[llm-wiki]]"
related_methods: []
---

# 个人知识编译工作流

## 摘要

个人知识编译工作流（PKC Workflow）将日记/笔记/文章通过 LLM 编译为结构化知识库。核心问题是**日记按时间线写但按主题消费**——线性增长没有网络效应，大多笔记"写后即沉"。工作流的核心是让 LLM 充当知识维护者（像 Wikipedia 编辑），定期从日记中提取概念和论断，编译为可复用的 wiki 概念页。

## 适用条件

- **前置依赖**：Obsidian vault（或同类 Markdown 知识库）、Claude Code + 自定义 Agent、wiki 目录结构和模板
- **适用场景**：长期积累的日记/笔记体量超过手动整理能力时
- **不适用场景**：纯项目管理（任务追踪不是知识编译）；内容量太少（< 30 篇笔记直接手动整理更高效）

## 步骤

### Step 1: 日记写入（每日）

- **输入**：当日工作内容、学习笔记、技术决策
- **操作**：按固定四段结构写日记（任务打卡 → 追踪任务 → 今天主任务 → 其他事项）
- **输出**：时间线结构的日记文件（`daily-work-item/YYYY-MM-DD-周X.md`）
- **判断标准**：日记包含具体的技术判断和决策理由，不仅仅是任务清单

### Step 2: 知识提取（每日或按需）

- **输入**：一段时间的日记和文章
- **操作**：运行 `/extract-knowledge` 命令，Agent 从内容中识别技术概念、工具评价、方法论、决策论断
- **输出**：新建/更新的 wiki 概念页，包含结构化 Claims
- **判断标准**：关键概念和论断被提取到 `wiki/concepts/` 中

### Step 3: 知识演进（每周）

- **输入**：现有 wiki 概念页
- **操作**：运行 `/evolve-wiki` 命令，Agent 更新置信度、标记 stale Claims、生成/更新摘要、刷新关联
- **输出**：更新后的概念页，置信度反映最新证据
- **判断标准**：60+ 天未更新的 Claims 被标记为 stale，多次验证的 Claims 置信度提升

### Step 4: 冲突检测（每周或按需）

- **输入**：所有 wiki 概念页的 Claims
- **操作**：运行 `/detect-conflict` 命令，Agent 扫描语义对立的论断
- **输出**：冲突报告，标记 conflicting Claims
- **判断标准**：互相矛盾的 Claims 被标记并提供裁决建议

### Step 5: 人工裁决（按需）

- **输入**：冲突报告 + 自身判断
- **操作**：人工审查 conflicting Claims，决定保留/更新/废弃
- **输出**：裁决后的 Claims 状态更新
- **判断标准**：所有 conflicting Claims 有明确处置

## 决策点

| 条件 | 选择 | 理由 |
|------|------|------|
| 日记量少（< 3 天） | 仅执行 Step 2 | 演进和冲突检测在小样本上意义不大 |
| 首次使用 | 全量提取（Step 2 扫描所有目录） | 建立知识库基线 |
| 常规维护 | Step 2（每日）+ Step 3-4（每周） | 平衡提取频率和维护成本 |

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

## 实践记录

<!-- 在实际项目中应用此方法后，记录结果反馈 -->

（暂无实践记录）

## 关联概念

- [[personal-knowledge-compiler]] — `implements` 此方法的概念定义页
- [[llm-wiki]] — `grounds` LLM Wiki 是此工作流的理论基础

## 关联方法

（暂无）

## 来源

- [[从日记到知识库：Obsidian × oh-my-claudecode × LLM Wiki 的个人知识编译实践]] — PKC 实践文章
