---
title: Claude Code 系列 07：Harness 分层架构
created: 2026-04-17
tags:
  - AI
  - claude-code
  - harness
  - harness-engineering
  - architecture
  - control-theory
  - gsd
  - superpowers
  - gstack
---

# Claude Code 系列 07：Harness 分层架构

> 基于 [Claude Code 源码解读](https://zhuanlan.zhihu.com/p/2022442135182406883) 的数据分析，以及本系列前六篇和 Vibe Coding 系列的积累，重新审视一个核心问题：**Claude Code 已经是一个 50 万行的成熟 Harness，为什么社区框架依然层出不穷？它们各自在控制 AI 的哪一部分？**

---

## 0. 一个令人震撼的比例：6400 vs 500000+

源码分析揭示了一个惊人的事实：

- Claude Code 的总代码量：**50 万行以上**
- 其中直接调用模型（LLM API）的代码：**约 6400 行**
- 比例：模型调用代码仅占 **~1.3%**

这意味着什么？

> **98.7% 的代码都是 Harness。**

在 [系列 02](Claude-Code系列02：learn-claude-code.md) 中我们已经建立了核心公式：

```
Agent = Model + Harness
Harness = Tools + Knowledge + Observation + Action Interfaces + Permissions
```

但 50 万行 harness 代码在做的事情，远比这个公式暗示的更丰富——它包含了完整的 Agent Loop 运行时、多级 Agent 协作机制、上下文管理、权限控制、Plan 模式、Session 持久化……这些在 [系列 01](Claude-Code系列01：核心概念与设计哲学.md) 到 [系列 06](Claude-Code系列06：Plugin生态与开发.md) 中已经逐一拆解。

那么问题来了：**Claude Code 已经提供了如此庞大的 Harness，为什么社区还在疯狂造轮子？**

---

## 1. 内层 Harness 与外层 Harness——一个被忽略的分层

关键 insight 是：**不是所有 Harness 都在同一个层次。**

Claude Code 的 50 万行代码是"内层 Harness"（Inner Harness），而 GSD、Superpowers、gstack 等社区框架是"外层 Harness"（Outer Harness）。它们解决的问题截然不同：

### 1.1 内层 Harness——"让 AI 能做事"

Claude Code 的 harness 聚焦于**执行基础设施**：

| 能力 | 对应机制 | 系列文章 |
|------|---------|---------|
| 工具调用与循环 | Agent Loop + Tool Dispatch | [系列 01](Claude-Code系列01：核心概念与设计哲学.md) |
| 安全边界 | Permission System + Sandbox | [系列 01](Claude-Code系列01：核心概念与设计哲学.md) |
| 多 Agent 协作 | Subagent + Teammate 架构 | [系列 03](Claude-Code系列03：Agent、Subagent与Teammate.md) |
| 扩展机制 | Command / Skill / Agent | [系列 04](Claude-Code系列04：Command、Skill与Agent.md) |
| 记忆与上下文 | 六层持久化体系 | [系列 05](Claude-Code系列05：六层记忆体系.md) |
| 插件生态 | Plugin Protocol + MCP | [系列 06](Claude-Code系列06：Plugin生态与开发.md) |

这些都是"底层管道"——你不需要知道 Agent Loop 怎么实现，就像你不需要知道 TCP/IP 怎么握手。

### 1.2 外层 Harness——"让 AI 做对事"

社区框架解决的是**工程纪律与认知约束**：

| 能力 | Claude Code 提供了吗？ | 社区框架怎么补 |
|------|---------------------|-------------|
| Spec 驱动开发 | 有 Plan 模式，但非强制 | GSD 强制 spec → phase → execute |
| 流程纪律 | 无，模型自行决策 | Superpowers 规定 brainstorm → plan → execute → review → verify |
| 状态持久化 | Session + Memory（弱结构） | GSD 的 phase state 是结构化、可回溯的 |
| 质量门禁 | 无内置 gate | Superpowers 的 verify + gstack 的 qa |
| 外部世界交互 | Bash + MCP（原子操作） | gstack 的 browse / ship / canary（完整流程） |
| 反馈闭环 | 无内置 eval 循环 | GSD 的 phase review + Superpowers 的 verify loop |

用一句话概括两层的关系：

> **内层 Harness 提供了"能做什么"的能力边界，外层 Harness 规定了"该怎么做"的行为规范。**

这也解释了为什么社区框架可以如此快速地涌现——它们不需要重写 Agent Loop 或 Tool Dispatch，只需要通过 CLAUDE.md、Skill、Hook 这些扩展点，在 Claude Code 的执行层之上**叠加约束层**。

---

## 2. 三层控制系统——比六层工程模型更本质的视角

在 [Vibe Coding 系列](../vibe-coding/Vibe-Coding系列01：Harness-Engineering的来龙去脉.md) 中，我们使用过一个六层工程模型来分析 Harness：

```
L1 Policy → L2 Planning → L3 Skills → L4 Execution → L5 Runtime → L6 Eval
```

这个模型回答的是："一个 Agent 系统**需要哪些模块**？"——它是结构视角。

但在实际设计和调优 Harness 时，更有用的问题是："AI 的行为**被什么控制**？"——这是控制论视角。从这个角度看，所有 Harness 代码可以归入三个控制系统：

### 2.1 执行系统（Execution System）

**"AI 怎么把事情做出来"**

对应六层模型的：L5 Runtime + L4 Execution

核心职责：
- Tool 调用与结果回灌
- Agent Loop 生命周期
- Context 组装与管理
- Sandbox 与安全边界

**代表**：Claude Code 内层 Harness（50 万行的主战场）

### 2.2 约束系统（Constraint System）

**"AI 做事时不能乱来"**

对应六层模型的：L2 Planning + L1 Policy

核心职责：
- Spec / Plan / Rule / Policy 的定义与执行
- 阶段门禁（Phase Gate）
- 权限边界与行为规范
- 流程编排与状态管理

**代表**：GSD（spec + phase + state）、Superpowers（workflow discipline）

### 2.3 认知系统（Cognition System）

**"AI 从经验中学到什么"**

对应六层模型的：L6 Eval（以及 L3 Skills 的一部分）

核心职责：
- 结果评估与质量反馈
- 经验积累与模式识别
- 失败分析与策略调整
- 知识编译与复用

**代表**：目前最薄弱的一层——只有 Eval 和 Memory 的雏形

### 2.4 为什么控制论视角更重要？

| 维度 | 六层工程模型 | 三层控制系统 |
|------|------------|------------|
| 回答的问题 | 系统需要哪些模块？ | 谁在控制谁？ |
| 隐含假设 | 线性执行 L1→L6 | 闭环反馈 |
| 设计导向 | 模块完整性 | 系统收敛性 |
| 失败模式 | "模块都有但不收敛" | "闭环打通但模块缺失" |

关键区别：

**六层模型暗示线性流水线**——Policy 产出 Plan，Plan 驱动 Execution，Execution 产出结果，Eval 评估结果。这在简单任务中成立，但在复杂项目中，现实是一个**闭环控制过程**：

```
Cognition（认知/学习）
    ↓ 输出策略
Constraint（约束/规划）
    ↓ 指导执行
Execution（执行/工具调用）
    ↓ 产出结果
Eval（评估/反馈）
    ↺ 反馈回 Constraint / Cognition
```

这解释了一个常见现象：为什么"按六层模型搭了完整的系统，但 AI 还是会 drift"——因为没有 feedback loop，系统是"能跑"但不"收敛"。

---

## 3. 框架覆盖地图——谁在控制什么？

有了三层控制模型，可以精确定位每个框架的贡献：

```
             Execution     Constraint     Cognition
             (执行)        (约束)          (认知)
            ┌──────────┬──────────────┬───────────┐
Claude Code │ ████████ │ ░░           │           │
            ├──────────┼──────────────┼───────────┤
GSD         │ ██       │ ████████     │ ██        │
            ├──────────┼──────────────┼───────────┤
Superpowers │          │ ██████       │ ░░        │
            ├──────────┼──────────────┼───────────┤
gstack      │ ████     │ ██           │           │
            ├──────────┼──────────────┼───────────┤
OMC         │ ██       │ ████         │ ████      │
            └──────────┴──────────────┴───────────┘
             ████ = 核心覆盖  ██ = 部分覆盖  ░░ = 有雏形
```

### 逐一解读

**Claude Code**：执行系统的霸主。Agent Loop、Tool Dispatch、Subagent/Teammate、MCP——执行层几乎无可替代。但约束系统只有弱形式（Plan 模式是建议而非强制，Memory 是"有时帮你有时背刺你"的提示增强，正如 [系列 01](Claude-Code系列01：核心概念与设计哲学.md) 的分析）。认知系统几乎空白。

**GSD**：约束系统的骨架。Spec 驱动、Phase 状态机、Context 隔离——它强制 AI "按章办事"。同时通过 phase review 提供了认知系统的雏形。（详见 [Vibe Coding 系列 04](../vibe-coding/Vibe-Coding系列04：流程框架选择指南.md) 和 [系列 06](../vibe-coding/Vibe-Coding系列06：GSD项目规模分级.md)）

**Superpowers**：约束系统的流程纪律。Brainstorm → Plan → Execute → Review → Verify 的强制工作流，确保 AI 不跳步骤。（详见 [Vibe Coding 系列 08](../vibe-coding/Vibe-Coding系列08：三层插件架构.md)）

**gstack**：执行系统的外部延伸。真实浏览器（browse）、Canary 部署（ship）、QA 自动化——它解决的是"AI 能触达外部世界"的问题。

**Oh-My-ClaudeCode（OMC）**：比较独特的定位——它既扩展约束层（Ralph Loop 的自检闭环、Autopilot 的自治模式），也是认知层的主要实验场（Memory System、Session History、自进化循环）。

### 关键发现

> **社区框架的真正价值不在于重复 Claude Code 的执行能力，而在于补足约束系统和认知系统的空白。**

这也是 [系列 01](Claude-Code系列01：核心概念与设计哲学.md) 中"强模型 vs 强规则"张力的延续——Claude Code 选择了"弱规则 + 强模型"，社区框架选择了"在强模型之上加强规则"。两者不是替代关系，而是互补关系。

---

## 4. Skills 层——最容易被误解的"能力注入点"

在六层工程模型中，L3 Skills 看起来是一个独立的能力注册层。但从控制论视角看，它实际上横跨三个系统：

| Skill 类型 | 控制论归属 | 例子 |
|-----------|----------|------|
| Tool 封装 | Execution | `gstack:browse`、`gstack:ship` |
| Workflow Skill | Constraint | `sp:brainstorm`、`sp:plan`、`gsd:phase` |
| Agent Role Skill | Cognition | `omc:ralph`（自检闭环）、`omc:self-improve`（自进化） |

这意味着：**Skills 不是一个稳定的层，而是向三个控制系统注入能力的"通道"。**

这解释了为什么 Claude Code 的 Skill 机制（[系列 04](Claude-Code系列04：Command、Skill与Agent.md)）设计得如此灵活——它不预设 Skill 该做什么，而是提供一个通用的注入接口，让社区自行决定注入到哪个控制层。

---

## 5. 评估框架的三个元问题

有了三层控制模型，评估任何 AI 框架时不要问"它有多少层"或"它有多少功能"，而是问三个元问题：

### Q1：它在控制 AI 的哪一部分？

```
Execution?  → 它让 AI 能做更多事情（新工具、新接口）
Constraint? → 它让 AI 做事更规范（流程、规则、门禁）
Cognition?  → 它让 AI 从经验中学习（评估、反馈、进化）
```

如果一个框架声称"全覆盖"，大概率是"哪个都不深"。

### Q2：它有没有 Feedback Loop？

这是区分"线性工具链"和"控制系统"的关键。

- **无 feedback**：Policy → Plan → Execute → 完。（一次性 AI）
- **有 feedback**：Execute → Eval → 调整 Constraint → 重新 Execute。（可收敛 AI）

GSD 的 phase review、Superpowers 的 verify loop、OMC 的 Ralph Loop 都是 feedback 机制。**Eval 层是整个系统最重要但最被忽视的部分。**

### Q3：它能不能收敛？

收敛意味着：系统运行越久，行为越稳定、越符合预期。

- **不收敛的系统**：每次运行结果不可预测，同样的 prompt 可能产出完全不同的结果
- **能收敛的系统**：通过 Constraint + Eval + Memory，系统逐渐积累"什么有效、什么无效"的知识

目前大部分框架的组合在"能跑"和"能收敛"之间还有很大的差距。

---

## 6. 个人 Harness 定制实践——从控制论出发

基于以上分析，如果要为自己的工作流定制 Harness，建议的优先级不是"从底层搭起"，而是**从约束和反馈开始**：

### 6.1 第一步：Constraint 先行

不要先写工具或 prompt，先定义你的工程纪律：

```markdown
# 你的 CLAUDE.md 应该回答：
1. 做事之前必须做什么？（spec? brainstorm? 读已有代码?）
2. 什么条件下可以开始写代码？（plan 被确认? spec 被 review?）
3. 什么条件下可以说"完成"？（测试通过? verify 通过? PR 被 review?）
```

这些规则本身就是约束系统。Claude Code 会通过 system prompt 加载这些规则——虽然不是"硬约束"，但在 Opus 4.6 这个级别的模型上，**结构化的 CLAUDE.md 是性价比最高的约束机制**。

### 6.2 第二步：Eval/Feedback 尽早接入

> 没有 Eval，系统不会进化。

实践入口：
- **Hook**：在 `PostToolUse`、`PostCommit` 等时机加入自动检查（[系列 01](Claude-Code系列01：核心概念与设计哲学.md) 中 Hook 是"唯一的确定性控制点"）
- **Skill 化的 verify 流程**：参考 OMC 的 `/verify` skill，在每次任务完成后自动执行验证
- **Memory 反馈**：将成功/失败的经验写入 Memory，让后续 session 能复用

### 6.3 第三步：选择性叠加外层框架

根据你的场景选择：

| 你的需求 | 推荐组合 |
|---------|---------|
| 个人小项目，快速迭代 | Claude Code + CLAUDE.md 约束 |
| 中型项目，需要流程纪律 | + Superpowers（workflow 编排） |
| 团队协作，需要状态管理 | + GSD（spec + phase + state） |
| 需要部署/浏览器交互 | + gstack（外部世界连接） |
| 需要自治和自检闭环 | + OMC（Ralph Loop + Autopilot） |

**不要一次全装。** 从最小约束开始，观察 AI 在哪里 drift，然后针对性地加约束。这比"搭一个完美架构然后发现不适合自己"要高效得多。

### 6.4 个人经验：从实际痛点倒推

以我自己的 Obsidian 知识库管理为例：

1. **Constraint**：CLAUDE.md 中定义了文件结构规则、链接格式、Agent 路由——这些就是约束系统
2. **Execution**：Agent Loop + Obsidian Agent + Knowledge Extractor——这些是执行系统
3. **Cognition**：Wiki 的 Claim-based Schema + 置信度演进 + 冲突检测——这是认知系统的雏形

这个三层结构不是一次设计出来的，而是在反复使用中逐步"生长"出来的。每次发现 AI 行为不符合预期，就追问"缺的是约束还是反馈？"，然后在对应层加机制。

---

## 7. 总结——两个公式

### 工程公式（结构视角）

```
个人 Harness = Claude Code（执行层）
             + 社区框架（约束层）
             + 自定义 Eval（认知层）
```

### 控制论公式（动力学视角）

```
系统收敛性 = Constraint（约束强度）× Eval（反馈频率）
             ÷ Execution 自由度
```

前者告诉你"需要哪些模块"，后者告诉你"系统能不能越用越稳"。

**六层工程模型是系统的结构图，三层控制模型是系统的动力学。** 搭系统用前者，调系统用后者。

---

## 延伸阅读

- [Claude Code 系列 01：核心概念与设计哲学](Claude-Code系列01：核心概念与设计哲学.md)——"强模型 vs 弱规则"的设计张力
- [Claude Code 系列 02：learn-claude-code](Claude-Code系列02：learn-claude-code.md)——Harness 公式的来源
- [Vibe Coding 系列 01：Harness Engineering 的来龙去脉](../vibe-coding/Vibe-Coding系列01：Harness-Engineering的来龙去脉.md)——Harness 概念的完整梳理
- [Vibe Coding 系列 08：GSD + Superpowers + gstack 三层插件架构](../vibe-coding/Vibe-Coding系列08：三层插件架构.md)——社区框架组合实践
