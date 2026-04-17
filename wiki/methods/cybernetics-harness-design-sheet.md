---
title: "控制论 Harness Design Sheet"
created: "2026-04-17"
updated: "2026-04-17"
tags:
  - wiki
  - method
  - cybernetics
  - harness-engineering
  - agent
  - design-tool
method_type: "quality-gate"
related_concepts:
  - "[[cybernetics-agent-design]]"
  - "[[harness-engineering]]"
related_methods:
  - "[[ai-native-five-layer-pipeline]]"
  - "[[harness-five-dimension-quality-gate]]"
---

# 控制论 Harness Design Sheet

## 摘要

基于控制论五层设计维度，每次设计 Agent 时强制填写的检查表。确保设计者在写 prompt 或代码之前，先回答五个控制论核心问题：可能性空间是否定义？共轭变换是否设计？负反馈是否可计算？探索是否有逃逸机制？控制能力是否充分？

## 适用条件

- **前置依赖**：理解控制论五层概念（可能性空间、共轭变换、负反馈、探索、控制能力）
- **适用场景**：设计新的 Agent / Harness 系统时，作为设计前的必填检查表
- **不适用场景**：简单的单步 prompt 调用；已有成熟框架的微调

## 步骤

### Step 1: 定义可能性空间（Problem Framing）

- **输入**：业务需求或任务描述
- **操作**：明确 State（当前状态空间）、Action（可执行动作空间）、Goal（目标状态空间）
- **输出**：三元组定义（State / Action / Goal）
- **判断标准**：能否用一句话描述"Agent 从什么状态出发、能做什么、要达到什么目标"

### Step 2: 设计共轭变换（Representation Layer）

- **输入**：Step 1 的三元组
- **操作**：设计 L（世界→模型的编码方式）和 L⁻¹（模型→世界的解码方式）
- **输出**：编解码方案（text / JSON / embedding / AST 等）
- **判断标准**：变换是否保留了任务所需的关键信息？是否有信息损失导致 Agent "看不到"必要上下文？

### Step 3: 定义负反馈系统（Control Loop）

- **输入**：Step 1 的 Goal 定义
- **操作**：定义 error function（`error = goal - current_state`）、选择反馈粒度（binary / scalar / structured）、设定反馈频率
- **输出**：error 定义 + 反馈频率 + 收敛判断标准
- **判断标准**：error 是否可计算？反馈是否足够频繁以防 drift？

### Step 4: 设计探索机制（Exploration）

- **输入**：Step 3 的反馈系统
- **操作**：定义探索触发条件（连续 N 次失败？error 不再下降？）、探索方式（retry / branch / strategy shift）、逃逸策略
- **输出**：触发条件 + 探索方式 + 逃逸阈值
- **判断标准**：是否至少有一个 escape 机制？Agent 不会在死循环中无限重试？

### Step 5: 评估控制能力（Control Capacity）

- **输入**：Steps 1-4 的全部设计
- **操作**：检查 `控制能力 = 信息 × 工具 × 反馈 × 表示` 四个因子是否充分
- **输出**：四因子评估结果 + 是否可收敛的判断
- **判断标准**：如果任何因子严重不足，系统不可能收敛——需要在启动前补足

## 决策点

| 条件 | 选择 | 理由 |
|------|------|------|
| error 不可计算 | 暂停，重新定义 Goal | 没有 error function 就没有系统 |
| 共轭变换信息损失严重 | 换编码方式或增加信息通道 | 表示错误 > 推理错误 |
| 无逃逸机制 | 增加 strategy shift 触发条件 | 避免死循环 |
| 控制能力四因子某项为零 | 该项补足后再启动 | 任何因子为零则系统不可收敛 |

## Claims

### Claim: 不建模可能性空间，不要写 Agent

- **来源**：[[控制论与科学方法论——从控制论到AI Agent设计方法论]]
- **首次出现**：2026-04-17
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> 控制论第一步不是行动而是定义可能性空间。99% 的人忽略了这一步，直接写 prompt。

### Claim: 先设计 L（共轭变换），再写 prompt

- **来源**：[[控制论与科学方法论——从控制论到AI Agent设计方法论]]
- **首次出现**：2026-04-17
- **最近更新**：2026-04-17
- **置信度**：0.8
- **状态**：active

> "不要问用什么 prompt，要问世界是怎么被编码的。" Prompt 是共轭变换的产物，不是设计的起点。

## 实践记录

<!-- 待首次实践后填写 -->

## 关联概念

- [[cybernetics-agent-design]] — `implements` 本方法是控制论五层的实践落地工具
- [[harness-engineering]] — `uses` Harness Design Sheet 是 Harness 设计流程的前置检查

## 关联方法

- [[ai-native-five-layer-pipeline]] — `contrasts` 五层 Pipeline 是工程结构视角，Design Sheet 是控制论设计维度视角
- [[harness-five-dimension-quality-gate]] — `extends` 质量门禁关注运行时检查，Design Sheet 关注设计时检查

## 来源

- [[控制论与科学方法论——从控制论到AI Agent设计方法论]] — 第四节 Harness Design Sheet
