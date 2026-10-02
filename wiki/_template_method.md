---
title: "{{method_name_english}}"
aliases:
  - "{{method_name_chinese}}"
created: "{{date}}"
updated: "{{date}}"
tags:
  - wiki
  - method
  - "{{topic_tag}}"
method_type: "{{pipeline | decision-framework | layered-strategy | workflow | quality-gate | architecture-pattern}}"
related_concepts:
  - "[[related-concept]]"
related_methods:
  - "[[related-method]]"
---

# {{method_name_english}}（{{method_name_chinese}}）

## 摘要

{{1-2 段描述：这个方法解决什么问题、适用场景、核心思路}}

## 适用条件

- **前置依赖**：{{需要先具备什么}}
- **适用场景**：{{什么时候用}}
- **不适用场景**：{{什么时候不用}}

## 步骤

### Step 1: {{step_name}}

- **输入**：{{input}}
- **操作**：{{what to do}}
- **输出**：{{output}}
- **判断标准**：{{how to know this step is done}}

### Step 2: {{step_name}}

- **输入**：{{input}}
- **操作**：{{what to do}}
- **输出**：{{output}}
- **判断标准**：{{how to know this step is done}}

<!-- 重复 Step 块添加更多步骤 -->

## 决策点

<!-- 如果方法包含分支决策，在此描述条件和路径选择；纯线性流程可留空 -->

| 条件 | 选择 | 理由 |
|------|------|------|
| {{condition}} | {{choice}} | {{why}} |

## Claims

### Claim: {{claim_statement}}

- **来源**：[[source]]
- **首次出现**：{{YYYY-MM-DD}}
- **最近更新**：{{YYYY-MM-DD}}
- **置信度**：{{0.0-1.0}}
- **状态**：{{active / conflicting / outdated / stale}}

> {{supporting evidence, quote, or reasoning}}

<!-- 重复上述 Claim 块添加更多论断 -->

## 实践记录

<!-- 每次在实际项目中应用此方法后，记录结果反馈 -->

### Practice: {{YYYY-MM-DD}} — {{项目/场景名}}

- **应用场景**：{{在什么项目/任务中使用了此方法}}
- **实际结果**：{{成功 / 部分成功 / 失败}}
- **偏差与调整**：{{实际执行与标准步骤的差异，做了哪些调整}}
- **经验教训**：{{学到了什么，下次会怎么改}}
- **置信度影响**：{{此次实践是否应该提升/降低相关 Claims 的置信度}}

## 关联概念

- [[concept]] — `relation-type` {{关系描述}}

<!-- relation-type: implements / grounds / extends / constrains / contrasts / part-of / uses / produces -->

## 关联方法

- [[method]] — `relation-type` {{关系描述}}

## 来源

- [[source-article-or-diary]] — {{提及上下文摘要}}
