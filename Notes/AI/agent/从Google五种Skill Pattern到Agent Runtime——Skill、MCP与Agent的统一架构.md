---
title: 从Google五种Skill Pattern到Agent Runtime——Skill、MCP与Agent的统一架构
created: 2026-03-24
tags: [AI, Agent, Skill-Pattern, MCP, Google-ADK, Context-Engineering, Agent-Runtime]
---

# 从Google五种Skill Pattern到Agent Runtime——Skill、MCP与Agent的统一架构

## 引言

在 AI Agent 生态快速演进的今天，一个核心问题浮出水面：**如何把 prompt + tools 变成可复用的 Agent 能力模块？**

Google 在 ADK（Agent Development Kit）/ Antigravity / Skills 实践中，社区已经收敛出 **5 类稳定可复用的 Skill Pattern**。这套模式不是"标准教科书"（Google 官方尚未正式发布统一文档），但它的工程价值已经被大量实践验证。

本文将从三个层次展开：

1. **Skill Pattern = 能力模块**（what you can do）—— 5 种认知模式的拆解
2. **Agent Pattern = 运行机制**（how you do it）—— 吴恩达 Agent 模式与 Skill 的关系
3. **统一架构**—— 把 Agent / MCP / Skill 映射成 5 种 Pattern 的组合架构

## 一、核心概念澄清：Skill ≠ Tool

首先打掉一个关键误区：

| 概念 | 本质 | 特点 |
|------|------|------|
| **Tool** | 函数（deterministic） | 确定性执行，无认知过程 |
| **Skill** | 认知模式（cognitive pattern） | 带策略的行为模板，可复用的"思考+执行结构" |

> **Skill 本质是"可复用的认知架构"，而不是"工具调用的封装"。**

这一观点与 Google 内部提出的 **Skill = Cognitive Pattern** 完全一致（参考 [Beyond Tool Use: Implementing Cognitive Patterns with Google Antigravity Skills](https://medium.com/google-cloud/beyond-tool-use-implementing-cognitive-patterns-with-google-antigravity-skills-c0eea90fa430)）。

更进一步，从上下文工程（Context Engineering）的视角看：

| 类型 | 本质 | 在 Context 中的位置 |
|------|------|---------------------|
| **Spec** | 数据 | 输入区（input） |
| **Rule** | 约束 | 头部（system prompt） |
| **Skill** | 执行逻辑 | 尾部（靠近生成位置，attention 优势） |

Skill 的核心价值不是"让模型更聪明"，而是 **"让模型看到正确的信息"**——它是上下文的动态加载器。

## 二、五种 Skill 设计模式详解

![五种 Skill 设计模式概览](skill-patterns-overview.png)

### 1. Tool Wrapper（工具封装型）

**本质**：把工具 / 最佳实践封装成"知识 + 规则"

- **结构**：instructions（怎么用）+ references（规则文档）
- **不做**：流程控制、结构化输出
- **适用场景**：SDK 使用规范、框架 best practices（React / FastAPI / SQL）
- **对应人类能力**：📚 知识

> 这是最基础的 Skill，本质还是 prompt + docs，但它是其他 pattern 的基石。

### 2. Generator（生成器模式）

**本质**：模板填充器——输入 → 按固定结构输出

- **结构**：assets/（模板）+ references/（质量规则）
- **输出**：强结构化
- **适用场景**：API 文档生成、PR 描述、技术报告、Terraform / YAML 生成
- **对应人类能力**：✍️ 表达

> **核心价值：把 LLM 的不稳定 → 压成确定结构。**

### 3. Reviewer（审查器模式）

**本质**：评估系统（Evaluation Engine）

- **结构**：checklist（检查什么）+ protocol（怎么检查）
- **输出**：issue list + severity 分级
- **适用场景**：Code review、安全审计、Prompt 评估、合规检查
- **对应人类能力**：🔍 批判

> **核心 insight：检查规则 ≠ 执行逻辑。** 换 checklist → Skill 直接复用。

### 4. Inversion（反转 / 访谈模式）

**本质**：强制 Agent **先问清楚再做事**

- **结构**：多阶段提问 + gate（不允许提前执行）
- **适用场景**：需求分析、架构设计前、prompt 收集、产品定义
- **对应人类能力**：❓ 提问

> 大部分 Agent 最大问题："胡乱假设 + 直接生成"。Inversion 就是解决这个问题的关键模式。

### 5. Pipeline（流水线模式）

**本质**：显式多阶段执行流程

- **结构**：Step 1 → Step 2 → Step 3，每步都有 gate，可插入 Reviewer / Generator
- **适用场景**：数据处理 pipeline、文档生成流程、自动化运维、CI/CD agent
- **对应人类能力**：⚡ 执行

> **核心价值：防止 LLM 跳步骤、偷懒、幻觉推进。**

## 三、三层控制模型

这五种 Pattern 并非平行关系，可以抽象为**三层控制 + 一层基础**：

| 层级 | 模式 | 解决的问题 |
|------|------|------------|
| **Level 0：补基础能力** | Tool Wrapper | 知识 / 工具接入 |
| **Level 1：控制输出** | Generator + Reviewer | LLM 输出不稳定 |
| **Level 2：控制输入** | Inversion | 需求不清 + 幻觉假设 |
| **Level 3：控制流程** | Pipeline | 多步骤任务失控 |

真实系统永远是混合模式：

```
Pipeline
 ├── Inversion（补信息）
 ├── Generator（生成）
 └── Reviewer（检查）
```

> **单一 Pattern 没意义，组合使用才是关键。**

## 四、Skill Pattern vs Agent Pattern——两套体系的本质区别

这是本文最核心的观点：

![Skill Pattern 与 Agent Pattern 的关系](skill-vs-agent-pattern.png)

> **Skill Pattern = 能力模块（what you can do）**
> **Agent Pattern = 运行机制（how you do it）**

| 维度 | Skill Pattern | Agent Pattern |
|------|---------------|---------------|
| 关注点 | Agent 具备什么认知能力 | Agent 如何运行 |
| 性质 | 静态（能力定义） | 动态（行为控制） |
| 类比 | 厨师的技能（刀工、火候） | 做菜的流程（备料→炒→装盘） |
| 来源 | Google ADK 社区总结 | 吴恩达 Agent 设计模式 |

### 吴恩达四种 Agent 模式回顾

吴恩达提出的四种 Agent 设计模式：

1. **Tool Use**——调用外部工具
2. **Planning**——先规划再执行
3. **Reflection**——生成后自我评估和修正
4. **Multi-Agent**——多 Agent 协作

这四种模式本质是 **"运行机制 / execution loop"**，而非能力定义。

### 关键映射：Agent Pattern = Skill Pattern 的"时间展开"

| Agent Pattern | Skill 组合解构 |
|---------------|----------------|
| **Tool Use** | Tool Wrapper + Generator |
| **Planning** | Generator（生成 plan）+ Pipeline（执行） |
| **Reflection** | Generator + Reviewer 的循环 |
| **ReAct** | Generator + Tool + Feedback Loop |
| **Multi-Agent** | 多 Skill + Context 隔离 |

> **Agent Pattern = Skill Pattern 的时间展开（temporal composition）**

也就是说，Agent 不是"多轮 Generator"那么简单，而是：

```
Agent = Generator
      + 状态（state）
      + 反馈（feedback）
      + 控制流（control flow）
```

| 维度 | Generator（单次） | Agent（多轮） |
|------|-------------------|---------------|
| 是否有状态 | ❌ | ✅ |
| 是否有反馈 | ❌ | ✅ |
| 是否可修正 | ❌ | ✅ |
| 是否可规划 | ❌ | ✅ |

### ReAct vs Reflection 的区别

这里需要特别澄清一个常见混淆：

| 维度 | ReAct（推理+行动） | Reflection（反思） |
|------|---------------------|---------------------|
| 是否用工具 | ✅ | ❌ |
| 是否依赖环境 | ✅ | ❌ |
| 是否自我评估 | ❌（弱） | ✅（强） |
| Loop 驱动力 | 外部反馈 | 内部 critique |
| Skill 组合 | Inversion + Tool Wrapper + Loop | Generator + Reviewer + Loop |
| 一句话 | 和世界交互 | 和自己较劲 |

## 五、Agent / MCP / Skill 的统一架构

现在把三者统一：

![Agent / MCP / Skill 统一架构](agent-mcp-skill-unified-architecture.png)

### 三层架构模型

```
┌─────────────────────────────────┐
│  Layer 1：Skill（能力层）        │  Generator / Reviewer / Inversion / ...
├─────────────────────────────────┤
│  Layer 2：Loop（运行模式层）     │  ReAct / Reflection / Planning / Multi-Agent
├─────────────────────────────────┤
│  Layer 3：System（系统层）       │  Context + Memory + Tool + Orchestration
└─────────────────────────────────┘
```

### 执行流程

```
User Input
    ↓
[Intent Router]          ← 决定用哪些 Skill
    ↓
[Agent Loop Controller]  ← 吴恩达 Agent Pattern 在这里
    ↓
[Skill Layer]            ← 5 种 Skill Pattern 在这里
    ↓
[MCP / Tools Layer]      ← 真正执行
    ↓
[Environment / External Systems]
```

### 各层职责

| 层级 | 组件 | 职责 | 类比 |
|------|------|------|------|
| 决策入口 | Intent Router | 任务理解、Skill 选择 | 前台调度 |
| 控制层 | Agent Loop Controller | 控制 ReAct / Reflection / Planning 循环 | OS Scheduler |
| 能力层 | Skill Layer | 5 种 Pattern 的具体执行 | 业务逻辑 |
| 执行层 | MCP / Tool Layer | 调用外部 API / 系统 | Syscall |
| 环境层 | External Systems | 数据库、API、文件系统 | 硬件 |

### 关键理解

- **Skill = 决策层**——决定"何时、为何"调用
- **MCP = 执行层**——真正"如何"执行
- **Agent Loop = 控制层**——决定"以什么节奏"运行

## 六、完整 MCP + Skill Runtime 设计

把上述架构进一步展开为 production 级设计：

### 六大核心模块

#### 1. Skill Registry（注册中心）

类似 npm registry / Docker Hub——存储所有 Skill，支持版本、标签和语义检索。

```yaml
# Skill 注册规范
name: code-reviewer
pattern: reviewer          # 5 种 pattern 之一
description: "Code quality and security review"
version: "1.2.0"
tags: ["code", "security", "review"]
input_schema: { type: "code_diff" }
output_schema: { type: "issue_list" }
```

#### 2. Skill Orchestrator（调度器）

根据任务动态选择和组合 Skill，是最核心的模块之一。

- 简单版：规则路由
- 高级版：LLM 自动 planning + 动态 pipeline 生成

#### 3. Agent Loop Engine（运行引擎）

执行 ReAct / Reflection / Planning 循环，融合多种 Agent Pattern。

```
Plan → Act → Observe → Reflect → Replan
```

#### 4. Memory 系统

| 层次 | 用途 | 实现 |
|------|------|------|
| Short-term | 当前任务上下文 | 内存 / Context Window |
| Long-term | 历史经验和知识 | 向量数据库 |
| Episodic | 具体事件记录 | 结构化存储 |

> **Memory = 提供上下文，而不是存数据。**

#### 5. MCP Tool Layer（工具执行层）

标准化的外部系统接口，每个 Tool 通过 MCP 协议暴露为可调用单元。

#### 6. Evaluation & Feedback（评估系统）

决定系统"是否可用"的核心——包括自动评分、人工反馈和 reward model。

> **没有 Evaluation = 你不知道 Agent 在变好还是变坏。**

### 组合示例：技术方案生成 + 自动 Review

```
用户输入："帮我生成一个 AI infra 架构并检查质量"

Orchestrator 选择 Skill：
  → Inversion + Generator + Reviewer + Tool Wrapper

执行流程：
  Inversion（补充需求信息）
    ↓
  Generator（生成架构方案）
    ↓
  Reviewer（评估质量）
    ↓  score < 阈值 → 触发 Reflection
  Tool Wrapper（调用验证工具）
    ↓
  Final Output
```

### Production 必备增强

| 增强项 | 说明 |
|--------|------|
| **Skill Graph** | 不是线性 pipeline，而是 DAG（有向无环图） |
| **并行执行** | 无依赖的 Skill 并发运行 |
| **Budget 控制** | Token / 延迟 / 成本预算 |
| **Guardrails** | 幻觉检测、工具误用防护、无限循环终止 |
| **State 管理** | 历史记录、工具结果、错误追踪 |

## 七、总结与展望

### 一句话总结

> **Skill = 能力（静态） × Agent Pattern = 行为（动态） × System = 状态 → 完整 Agent**

### 实用决策框架

| 需求 | 选择 |
|------|------|
| 需要结构化输出 | → Generator |
| 需要质量评估 | → Reviewer |
| 需求不清楚 | → Inversion |
| 多步骤流程 | → Pipeline |
| 接入外部工具 | → Tool Wrapper |

**永远组合用，不要单用。**

### 未来趋势

1. **Skill 自动组合**（Auto-composition）—— Agent 自动拼 Pipeline
2. **Skill 市场化**（类似 npm）—— Skill Registry 生态
3. **Skill → MCP / API 化**—— Skill 成为远程可调用单元
4. **Skill Graph + Dynamic Composition**—— Skill 自动组合、Loop 自动生成、Agent 不再写死

### 正确的落地路线

1. 用 **5 Patterns 定义能力结构**
2. 用 **Context Engineering 控制效果**
3. 用 **Tool / MCP 执行落地**

> 传统软件：逻辑写死。Agent 系统：逻辑是"被调度出来的"。

## 参考资料

- [Beyond Tool Use: Implementing Cognitive Patterns with Google Antigravity Skills](https://medium.com/google-cloud/beyond-tool-use-implementing-cognitive-patterns-with-google-antigravity-skills-c0eea90fa430)
- [知乎：Skill 在上下文工程中的位置与作用](https://zhuanlan.zhihu.com/p/2017716306569348763)
- [Comprehensive Analysis of Agent Cognitive Frameworks](https://boardor.com/blog/ai-agent-comprehensive-analysis-of-7-cognitive-frameworks-and-code-implementation)
- [[Claude Code系列03：Agent、Subagent与Teammate架构解析——从一次性委派到长期协作]]
- [[Claude Code系列04：扩展三剑客——Command、Skill与Agent的区别与协作]]
