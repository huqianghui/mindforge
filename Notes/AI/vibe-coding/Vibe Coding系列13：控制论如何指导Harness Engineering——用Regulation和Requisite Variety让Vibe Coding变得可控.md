---
title: Vibe Coding 系列13：控制论如何指导 Harness Engineering——用 Regulation 和 Requisite Variety 让 Vibe Coding 变得可控
created: 2026-05-07
tags:
  - harness-engineering
  - cybernetics
  - regulation
  - vibe-coding
  - requisite-variety
  - feedback-loop
  - claude-code
  - system-design
---

> 控制论（Cybernetics）是一门研究"如何在不确定性中维持目标状态"的科学。当我们用它来指导 Harness Engineering 的设计，Vibe Coding 就从"随缘编程"变成了系统化的工程实践。本文展示这条链路：**控制论原理 → Harness Engineering 设计方法 → Vibe Coding 中的具体落地**。

---

## 一、为什么需要控制论视角

### 1.1 现代 Agent 的核心问题不是智能，而是 Regulation

2026 年的 Coding Agent 已经具备：

- 规划能力（planning）
- 代码生成（code generation）
- 工具使用（tool use）
- 记忆检索（memory retrieval）

但它们依然会：

| 失控模式 | 本质 |
|---------|------|
| Drift（漂移） | 偏离目标状态 |
| Hallucination（幻觉） | 错误的状态反馈 |
| Runaway Loop（失控循环） | 正反馈放大偏差 |
| Over-act（过度行动） | 响应超出扰动量 |
| Context Collapse（上下文崩塌） | 状态信息丢失 |

这些问题的共同本质是：**系统无法在扰动下维持目标状态**——这正是控制论中 Regulation 的核心问题。

### 1.2 Regulation ≠ Optimization

这是 AI 系统设计中最大的认知误区：

| 维度 | Optimization（优化） | Regulation（调节） |
|------|---------------------|-------------------|
| 核心目标 | 找到最优解 | 在变化中维持可接受行为 |
| 假设前提 | 目标已定义，环境相对稳定 | 环境持续扰动，目标可能漂移 |
| 追求 | 最小 loss / 最大 reward | Robustness / Stability / Bounded behavior |
| 典型方法 | Gradient descent, RL | Feedback loop, Error correction |
| 哲学 | 到达终点 | 维持航向 |

Vibe Coding 场景中，我们面对的不是一个静态优化问题（"生成最好的代码"），而是一个动态调节问题（"在持续交互中保持项目朝正确方向演进"）。

---

## 二、控制论核心概念与 Harness 的对应

### 2.1 词源：从舵手到校准

| 概念 | 词源 | 核心意象 |
|------|------|---------|
| **Cybernetics** | 希腊语 kybernetes = 舵手 | 驾驶复杂系统 |
| **Regulation** | 拉丁语 regula = 尺子, regere = 校正 | 维持稳定 |

Cybernetics 研究的是**方法论**——如何通过信息、反馈、适应来驾驭复杂系统。Regulation 是其中的**核心目标**——让系统在扰动下维持期望状态。

映射到 Harness Engineering：

- **Cybernetics** = Harness Engineering 的理论框架
- **Regulation** = Harness 要实现的目标
- **Harness** = Regulation 的具体工程实现

### 2.2 Ashby 必要多样性定律（Law of Requisite Variety）

W. Ross Ashby 在《An Introduction to Cybernetics》中提出：

$$V_R \geq V_D$$

> Regulator（调节器）的行为复杂度，必须大于或等于 Disturbance（扰动）的复杂度。否则系统无法稳定。

翻译成 Harness Engineering 语言：

> **你的 Harness 机制的"丰富度"，必须匹配 LLM 行为的"不确定性"。**

这解释了为什么简单的 `system prompt` 不够——LLM 的行为空间（variety）远大于一条 prompt 能约束的范围。你需要多层 regulation 机制来匹配它的不确定性：

```
LLM 行为多样性（扰动） >> 单条 Prompt 约束力（调节器）
                         ❌ 系统不可控

LLM 行为多样性（扰动） ≤  多层 Harness 约束力（调节器）
                         ✅ 系统可控
```

### 2.3 关键概念映射表

| 控制论概念 | Harness Engineering 对应 |
|-----------|------------------------|
| Regulated Variable（被调节量） | 需求对齐度、UI 一致性、代码质量 |
| Disturbance（扰动） | LLM 的随机性、上下文漂移、需求变更 |
| Feedback（反馈） | 测试结果、用户审查、CI 输出 |
| Regulator（调节器） | Planner / Critic / Evaluator / Tests |
| Set Point（目标值） | 需求文档、设计稿、架构约束 |
| Error Signal（偏差信号） | Test failure / Lint error / 人工否决 |
| Actuator（执行器） | Coding Agent / Editor / Tool Use |

---

## 三、Regulation-First 设计方法

### 3.1 先定义 Regulated Variables，再设计 Harness

传统做法是直接跳到工具和流程——"用什么框架？加什么 Lint？"。

控制论视角的正确顺序是：

```
1. 定义 Regulated Variables   → 我们到底要维持什么稳定？
2. 识别 Disturbances         → 什么力量在把它拉离目标？
3. 设计 Feedback Channels    → 怎么观测偏差？
4. 实现 Regulators           → 怎么校正偏差？
5. 构建 Harness              → 以上四步的工程化封装
```

**如果你在第 1 步没有把目标弄清楚，后面的 Harness 没有意义。**

### 3.2 Vibe Coding 中真正的 Regulated Variables

在实际的 Claude Code + Vibe Coding 实践中，什么才是我们本质上要 regulate 的？

经过大量项目实践，答案是**两个核心被调节量**：

| # | Regulated Variable | 本质 | 观测方式 |
|---|-------------------|------|---------|
| 1 | **需求对齐度** | 系统做的事 = 用户想要的事 | 需求澄清、验收标准 |
| 2 | **功能可见性** | 用户能在 UI 上"看见"功能正确工作 | UI 设计对齐、视觉验证 |

其他所有工程手段——架构设计、模块划分、Unit Test、E2E Playwright 测试——都是**服务于这两个核心 Regulated Variables 的 Regulator（调节器）**，而不是独立目标。

```
┌─────────────────────────────────────────────────┐
│              Regulated Variables                  │
│  ┌─────────────────┐  ┌──────────────────────┐  │
│  │  需求对齐度      │  │  功能可见性（UI）     │  │
│  └────────┬────────┘  └──────────┬───────────┘  │
│           │                      │               │
├───────────┼──────────────────────┼───────────────┤
│           │    Regulators        │               │
│  ┌────────▼────────┐  ┌─────────▼──────────┐   │
│  │ 需求澄清流程    │  │ UI 设计稿 / Mockup  │   │
│  │ Spec 文档       │  │ Screenshot 对比    │   │
│  │ 验收标准定义    │  │ 视觉回归测试       │   │
│  └────────┬────────┘  └─────────┬──────────┘   │
│           │                      │               │
│  ┌────────▼──────────────────────▼──────────┐   │
│  │         Implementation Regulators         │   │
│  │  • 架构设计 → 保证可维护/可扩展          │   │
│  │  • 模块划分 → 保证关注点分离             │   │
│  │  • Unit Test → 保证单元行为正确          │   │
│  │  • E2E Test → 保证端到端功能可见         │   │
│  │  • CI/CD → 保证持续集成不退化            │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 3.3 为什么是这两个，而不是代码质量

一个关键洞察：**代码质量不是 Regulated Variable，而是 Regulator**。

| 候选目标 | 是 Regulated Variable 吗？ | 理由 |
|---------|--------------------------|------|
| 需求对齐度 | ✅ 是 | 用户最终关心的 |
| UI 功能可见性 | ✅ 是 | 用户能直接感知的 |
| 代码质量 | ❌ 不是 | 是维持前两者的手段 |
| 测试覆盖率 | ❌ 不是 | 是观测偏差的工具 |
| 架构一致性 | ❌ 不是 | 是降低扰动的结构设计 |

把手段当目标，是工程中最常见的 regulation 失败模式——你优化了测试覆盖率，但用户要的功能没做对。

---

## 四、多层 Regulation 层级架构

### 4.1 从 Multi-Agent 到 Regulation Hierarchy

很多所谓的"多智能体架构"，本质上不是"多个智能体合作"，而是**多层调节层级**：

```
Human（人类）
  └─ regulate → Evaluator（评估器）
       └─ regulate → Planner（规划器）
            └─ regulate → Executor（执行器）
                 └─ regulate → Model Output（模型输出）
```

每一层的职责：

| 层级 | 角色 | Regulates | Feedback 来源 |
|------|------|-----------|--------------|
| Human | 最终裁决者 | Evaluator 的判断 | 直觉、业务知识 |
| Evaluator | 质量关卡 | Planner 的方案 | 验收标准、测试结果 |
| Planner | 策略决策者 | Executor 的行为 | 架构约束、模块规范 |
| Executor | 动作执行者 | Model 的输出 | Lint、Type Check、Unit Test |

这不是"Agent Society"——这是**控制层级**。

### 4.2 Claude Code 中的实际 Regulation 层级

在使用 Claude Code 做 Vibe Coding 的实际流程中：

```
┌────────────────────────────────────────────────────┐
│  Layer 0: 人类（需求定义 + 最终验收）               │
│  → 定义 Set Point：我要什么功能                     │
├────────────────────────────────────────────────────┤
│  Layer 1: 需求澄清 Regulator                       │
│  → 工具：PRD / User Stories / Acceptance Criteria   │
│  → 反馈：人类确认"是的，这就是我要的"               │
├────────────────────────────────────────────────────┤
│  Layer 2: UI 设计 Regulator                         │
│  → 工具：Figma / Mockup / Screenshot               │
│  → 反馈：人类确认"是的，这看起来对"                 │
├────────────────────────────────────────────────────┤
│  Layer 3: 架构 Regulator                            │
│  → 工具：Architecture Doc / Module Boundaries       │
│  → 反馈：架构测试 / Dependency Check                │
├────────────────────────────────────────────────────┤
│  Layer 4: 实现 Regulator                            │
│  → 工具：Unit Test / E2E / Type Check / Lint        │
│  → 反馈：CI 绿灯 / Test Pass                       │
├────────────────────────────────────────────────────┤
│  Layer 5: 运行时 Regulator                          │
│  → 工具：Monitoring / Error Tracking / Rollback     │
│  → 反馈：异常告警 / 用户反馈                        │
└────────────────────────────────────────────────────┘
```

**关键洞察**：Layer 1 和 Layer 2 是本质的 Regulation（定义目标），Layer 3-5 是派生的 Regulation（保护目标）。

---

## 五、Requisite Variety 在 Vibe Coding 中的实践含义

### 5.1 为什么"简单 Prompt"控不住复杂项目

回到 Ashby 定律：$V_R \geq V_D$

LLM 在 Vibe Coding 中的扰动来源（$V_D$）：

| 扰动来源 | 多样性量级 |
|---------|-----------|
| 模型生成的随机性 | 高 |
| 上下文窗口限制 | 中 |
| 需求理解偏差 | 高 |
| 工具调用错误 | 中 |
| 架构决策歧义 | 高 |
| 多文件交互副作用 | 高 |

如果你的 Regulator 只有一条 system prompt（$V_R$ 极低），必然无法匹配这些扰动的多样性。

### 5.2 增加 Requisite Variety 的工程手段

要让 $V_R \geq V_D$，你需要**多种不同类型**的 Regulation 机制：

| Regulation 机制 | 对抗的扰动 | 实现方式 |
|----------------|-----------|---------|
| CLAUDE.md / Rules | 行为漂移 | 每次对话加载的持久约束 |
| Spec 文档 | 需求理解偏差 | 明确的验收标准 |
| UI 设计稿 | 功能对齐漂移 | 视觉化的目标锚点 |
| 架构约束文档 | 结构性退化 | 模块边界 + 依赖规则 |
| Unit Test | 单元行为偏差 | 自动化回归检测 |
| E2E Test (Playwright) | 端到端功能退化 | 用户视角的完整验证 |
| Type System | 接口约束违反 | 编译期错误信号 |
| Lint / Format | 代码风格漂移 | 静态分析 |
| Human Review | 高层目标偏离 | 人类判断力 |
| Memory / Wiki | 上下文丢失 | 持久化知识存储 |

每一种机制覆盖不同类型的扰动。它们共同构成足够的 Requisite Variety 来 regulate LLM 行为。

### 5.3 一个实用判断标准

> 当你发现 Agent 在某个方面反复出错（regulation failure），问自己：
> **"我的 Harness 中，有没有一个 Regulator 专门对付这种扰动？"**
>
> 如果没有——加一个。如果有但不够——增加它的 variety。

---

## 六、从一阶控制到二阶控制

### 6.1 控制论的两次转向

| 阶段 | 核心问题 | 类比 |
|------|---------|------|
| 一阶控制论 | 观察者如何控制系统 | 恒温器、PID 控制器 |
| 二阶控制论 | 观察者本身也是系统的一部分 | 自我调节、递归反馈 |

一阶 Harness = 人类用固定规则约束 Agent

二阶 Harness = Harness 本身能自我演化

### 6.2 Vibe Coding 中的二阶 Regulation

在长期项目中，你会发现：

- Spec 文档需要随项目演进而更新
- 测试策略需要随复杂度增加而调整
- CLAUDE.md 需要随实践经验而迭代
- 架构约束需要随规模变化而重构

这意味着你不仅在 regulate 代码，你还在 **regulate 你的 regulation 机制本身**——这就是二阶控制。

```
Meta-Regulator（人类 + 经验积累）
  └─ regulate → Regulation Mechanisms（Harness 本身）
       └─ regulate → Agent Behavior（LLM 输出）
            └─ produce → Code / UI / System
```

实践中的二阶 Regulation 体现：

| 机制 | 一阶（固定） | 二阶（自适应） |
|------|-----------|--------------|
| 约束文档 | 写一次不改 | 每个 Sprint 回顾更新 |
| 测试策略 | 固定覆盖率目标 | 根据失败模式动态调整 |
| Agent 配置 | 固定 Prompt | Memory 驱动的渐进式学习 |
| 架构 | 一次性设计 | 随复杂度演进重构 |

---

## 七、实践框架：Regulation-Driven Vibe Coding

### 7.1 项目启动清单

在写第一行代码之前，用控制论视角完成：

```markdown
## Regulation Design Document

### 1. Regulated Variables（我要维持什么稳定？）
- [ ] 核心功能需求（列出 3-5 个必须对齐的功能目标）
- [ ] 用户体验目标（列出关键 UI/UX 验收点）

### 2. Disturbances（什么会把它拉偏？）
- [ ] 模型理解偏差风险点
- [ ] 技术复杂度风险点
- [ ] 需求模糊区域

### 3. Feedback Channels（怎么发现偏了？）
- [ ] 自动化反馈（测试、Lint、Type Check）
- [ ] 人工反馈（Review 节点、验收时机）

### 4. Regulators（怎么纠正？）
- [ ] 需求层：Spec + Acceptance Criteria
- [ ] 设计层：UI Mockup + Screenshot Baseline
- [ ] 架构层：Module Boundaries + API Contract
- [ ] 实现层：Test Suite + CI Pipeline
```

### 7.2 工作流：Regulation Loop

每一个 Vibe Coding 迭代都是一个 Regulation Cycle：

```
         Set Point（目标状态）
              │
              ▼
    ┌─── Comparator ◄──── Feedback ◄────┐
    │    （对比偏差）      （观测结果）     │
    │         │                           │
    │         ▼                           │
    │    Error Signal                     │
    │    （偏差信号）                      │
    │         │                           │
    │         ▼                           │
    │    Regulator                        │
    │    （校正动作）                      │
    │         │                           │
    │         ▼                           │
    └──► Agent Action ──► System ─────────┘
         （执行修改）     （项目状态）
```

具体实践：

1. **设定目标** — 用需求文档 + UI 设计明确 Set Point
2. **Agent 执行** — Claude Code 生成代码
3. **观测反馈** — 运行测试、检查 UI、Review 代码
4. **计算偏差** — 实际结果 vs 期望结果
5. **校正动作** — 修改 Prompt / 补充约束 / 人工介入
6. **循环迭代** — 直到偏差在可接受范围内

### 7.3 失败诊断：当 Regulation 失败时

当项目"失控"时，用控制论框架诊断：

| 症状 | 可能的 Regulation 失败 | 修复方向 |
|------|---------------------|---------|
| Agent 做的不是我要的 | Regulated Variable 未明确定义 | 补充 Spec / Acceptance Criteria |
| 功能做对了但 UI 不对 | 缺少视觉层 Feedback | 加 UI 设计稿 / Screenshot 对比 |
| 改一个地方坏了别处 | 缺少结构性 Regulator | 加模块边界 + 回归测试 |
| 越改越乱 | Variety 不足 | 增加 Regulation 机制种类 |
| 约束本身过时了 | 缺少 Meta-regulation | 定期回顾更新 Harness |

---

## 八、总结：五个控制论原则

| # | 原则 | 实践含义 |
|---|------|---------|
| 1 | **先定义 Regulated Variable** | 在写 Harness 前，想清楚"我到底要维持什么稳定" |
| 2 | **Regulation ≠ Optimization** | 不追求最优代码，追求持续可控的演进 |
| 3 | **Requisite Variety** | Harness 的丰富度必须匹配 LLM 行为的不确定性 |
| 4 | **需求和 UI 是本质目标** | 架构/测试/Lint 是手段，不是目的 |
| 5 | **二阶 Regulation** | Harness 本身也需要迭代演进 |

---

## 参考资源

- W. Ross Ashby,《An Introduction to Cybernetics》(1956) — 必要多样性定律的原始来源
- Stafford Beer,《Brain of the Firm》(1972) — 组织控制论的经典
- Norbert Wiener,《Cybernetics》(1948) — 控制论奠基之作
- [OpenAI: Harness Engineering](https://openai.com/index/harness-engineering/) (2026) — Harness 概念的行业定义
- [Anthropic: Harness Design for Long-Running Apps](https://www.anthropic.com/engineering/harness-design-long-running-apps) (2026) — 长时任务的 Harness 设计

---

## 系列导航

- 上一篇：[[Vibe Coding系列12：测试环境即代码——从Testcontainers到Ephemeral Environment的Harness实践]]
- 系列索引：[[README#Vibe Coding 系列]]
