---
title: Vibe Coding 系列08：GSD + Superpowers + gstack 三层插件架构——从定位争议到组合实践
created: 2026-04-09
tags: [gsd, superpowers, gstack, compound-engineering, claude-code, plugin-architecture, vibe-coding, harness-engineering]
---

# Vibe Coding 系列08：GSD + Superpowers + gstack 三层插件架构——从定位争议到组合实践

> 本文是 Vibe Coding 系列的第八篇。在前七篇中，我们分别讨论了 Harness Engineering 的来龙去脉、架构师实践、五层 AI Pipeline、框架选择、大项目困局、规模分级和代码复用。本文聚焦一个实操问题：**GSD、Superpowers、gstack 三个插件如何组合？冲突点在哪里？怎么解决？**

## 一、起因——一篇文章引发的定位争议

微信公众号文章 [Claude Code 双插件最佳搭配：superpowers 当大脑，gstack 当手脚](https://mp.weixin.qq.com/s/ShJ6ogkcI-6qZtFY--XcTA) 提出了一个流行的心智模型：

> "如果说 superpowers 是方法论，那 gstack 就是工具箱"

这个说法看起来简洁，但有两个问题：

### 问题一："方法论 vs 工具箱"是伪二分

实际上 Superpowers 和 gstack **都是 skill/tool 集合 + workflow 编排的混合体**，差别在于重心不同：

| 维度 | Superpowers | gstack |
|------|------------|--------|
| skill 数量 | 很多（brainstorm, plan, TDD, debug, review, verify, shitpost 等） | 也不少（browse, qa, ship, canary, careful, freeze, guard 等） |
| workflow 编排 | **强**——有明确阶段流转（brainstorm → plan → execute → review → verify） | **弱**——工具间有松散关联（qa → ship → deploy），但没有强制流程 |
| 核心价值 | **流程纪律**——确保不跳步骤 | **外部世界连接**——确保能操作浏览器、部署、发布 |

更准确的定位：

- **Superpowers** = **workflow-first 的 skill 集合**——看起来像工具箱（一堆 `/sp:xxx` 命令），但价值在于它规定了"先 brainstorm 再 plan 再 execute"这个流程纪律
- **gstack** = **tool-first 的执行层**——也有流程（qa → ship → deploy），但价值在于每个工具本身的能力（真实浏览器、canary 部署等）

用一个光谱来理解：

```
纯方法论文档 ←→ workflow框架(Superpowers) ←→ 工具集合(gstack) ←→ 纯CLI命令
     ↑                    ↑                         ↑                 ↑
  没有代码            流程是核心                工具是核心           没有编排
  只有理念            工具服务于流程            流程连接工具         各自独立
```

这也解释了为什么两者能互补——Superpowers 的流程中缺少"与外部世界交互"的工具，gstack 的工具集缺少"工程方法论纪律"的编排。不是方法论 + 工具箱，而是 **强编排的工具集 + 强能力的工具集**。

### 问题二：完全忽略了 GSD

那篇文章只讨论 Superpowers + gstack 的二元组合，但在我的实践中，GSD（Get Stuff Done）才是外层骨架——它管 spec、phase、state、context isolation，Superpowers 和 gstack 都嵌套在 GSD 的执行阶段内部。

在 [[Vibe Coding系列04：流程框架选择指南——GSD、SpecKit、OpenSpec与Superpowers的组合实践]] 中，我们已经论证了这个分层关系：

> **规范框架管"做对的事情"，Superpowers 保证"做事情的方法对"。**

gstack 要加进来，就是第三层——**确保"做完的事情能交付"**。

## 二、三层插件架构

### 2.1 定位模型

```
┌─────────────────────────────────────────────┐
│  GSD（外层循环）                              │
│  "做对的事情"——Spec + Phase + State + Context │
│                                             │
│  ┌─────────────────────────────────────────┐ │
│  │  Superpowers（内层循环）                  │ │
│  │  "做事情的方法对"——Engineering Practices  │ │
│  │  brainstorm → plan → TDD → review       │ │
│  │                                         │ │
│  │  ┌─────────────────────────────────────┐ │ │
│  │  │  gstack（执行层）                    │ │ │
│  │  │  "做完能交付"——External World        │ │ │
│  │  │  browse / qa / ship / deploy        │ │ │
│  │  └─────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

三层各自的职责边界：

| 层级 | 插件 | 核心问题 | 管理什么 | 不管什么 |
|------|------|---------|---------|---------|
| **外层** | GSD | 做对的事情 | Spec、Phase 流转、State 持久化、Context 隔离 | 怎么写代码、怎么测试、怎么部署 |
| **中层** | Superpowers | 做事情的方法对 | Brainstorm、Plan、TDD、Debug、Code Review | Spec 管理、Phase 状态、浏览器操作、部署 |
| **内层** | gstack | 做完能交付 | 浏览器 QA、Ship、Deploy、Canary、安全护栏 | 需求分析、架构设计、代码质量 |

### 2.2 映射到四层架构

在 [[Vibe Coding系列02：架构师视角的AI Harness Engineering最佳实践]] 和 [[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移]] 中，我们提出了四层扩展架构。三个插件的映射关系：

```
State Layer        ← GSD（.planning/ 目录、phase 状态、spec 文件）
                     + Superpowers（brainstorm/plan 输出）
Granularity Layer  ← GSD（spec 拆分、phase 划分、workstream）
                     + Superpowers（TDD 粒度、review 粒度）
Selection Layer    ← 🚫 三者都缺失（最大瓶颈，待补全）
Execution Layer    ← Superpowers（TDD、debug、verify）
                     + gstack（browse、qa、ship、deploy）
```

结论与之前文章一致：**Selection Layer 是最大缺口**。三个插件加在一起仍然是"全量 context 拼接"模式，大项目必然会碰到 context 爆炸问题。

### 2.3 信息流

完整的三层信息流：

```
[需求/Issue]
    ↓
GSD: /gsd:discuss → /gsd:plan
    ↓ 生成 .planning/ specs
GSD: /gsd:start (进入 phase)
    ↓
Superpowers: /sp:brainstorming
    + 列出可复用组件清单 ← 代码复用第三层检查
    ↓
Superpowers: /sp:writing-plans
    + plan 中标注复用哪些 shared/ 组件
    ↓
(可选) gstack: /plan-eng-review 或 /plan-ceo-review
    + 检查架构设计是否合理
    ↓
Superpowers: /sp:executing-plans + /sp:tdd
    ↓ 实现完成
gstack: /browse 或 /qa
    + 真实浏览器环境验证
    ↓
Superpowers: /sp:verification-before-completion
    ↓
Superpowers: /sp:requesting-code-review
    + 检查重复代码和复用情况 ← 代码复用第三层检查
    ↓
GSD: /gsd:verify-work
    ↓ 通过
gstack: /ship → /land-and-deploy
    ↓ (可选)
gstack: /canary
    ↓
GSD: /gsd:finish (归档 phase，进入下一个)
```

## 三、五个冲突点与解决策略

GSD、Superpowers、gstack 三者有五个功能重叠区域，如果不处理会导致混乱。

### 冲突 1：Brainstorming 阶段

| 工具 | 机制 | 输出 |
|------|------|------|
| GSD `/gsd:discuss` | 需求澄清 + spec 草稿 | `.planning/specs/` |
| Superpowers `/sp:brainstorming` | 深度头脑风暴 | 结构化分析（不持久化） |

**解决**：**分层嵌套，不替代**。GSD discuss 在外层处理"做什么"（需求→spec），Superpowers brainstorm 在内层处理"怎么做"（spec→实现方案）。

```
/gsd:discuss → 产出 spec（做什么）
    ↓ 进入 phase
/sp:brainstorming → 基于 spec 深度分析（怎么做）
```

### 冲突 2：Plan 编写

| 工具 | 机制 | 输出 |
|------|------|------|
| GSD `/gsd:plan` | Phase + workstream 规划 | `.planning/plans/` |
| Superpowers `/sp:writing-plans` | 详细实现计划 | 任务分解（不持久化） |
| gstack `/plan-eng-review` | 计划评审 | Review 意见 |

**解决**：**三步串联**。

```
/gsd:plan → 粗粒度 phase 规划（骨架）
    ↓
/sp:writing-plans → 细粒度实现计划（肌肉）
    ↓
/plan-eng-review → 外部视角审查（体检）
```

### 冲突 3：执行阶段

| 工具 | 机制 |
|------|------|
| GSD `/gsd:do-work` | 按 spec 执行当前 phase |
| Superpowers `/sp:executing-plans` + `/sp:tdd` | TDD 驱动实现 |

**解决**：**Superpowers 嵌套在 GSD 内部**。在 [[Vibe Coding系列06：GSD项目规模分级实践——从快速脚本到超大规模的Context策略演进]] 中已经论证：

> GSD 管"Do the Right Thing"（功能正确性），Superpowers 管"Do the Thing Right"（代码质量）。

GSD 的 `/gsd:do-work` 是 phase 级别的执行框架，Superpowers 的 TDD 是 task 级别的工程方法。

### 冲突 4：验证阶段

| 工具 | 验证维度 |
|------|---------|
| GSD `/gsd:verify-work` | Spec 符合性（功能正确吗？） |
| Superpowers `/sp:verification-before-completion` | 工程质量（代码好吗？） |
| gstack `/qa` | 真实环境（用户能用吗？） |

**解决**：**三层验证递进**。

```
Superpowers verify → 代码质量检查（静态）
    ↓
gstack /qa → 真实浏览器验证（动态）
    ↓
GSD verify-work → Spec 符合性验证（功能完整性）
```

在 [[Vibe Coding系列01：全面系统的了解Harness Engineering的来龙去脉]] 中，我们将此称为 **Generation-Evaluation Separation**——生成和评估必须分离，且评估应该多层递进。

### 冲突 5：并行派发

| 工具 | 并行机制 |
|------|---------|
| GSD `/gsd:workstreams` | Workstream 级别并行（L3+） |
| Superpowers `/sp:parallel-dispatch` | Worktree 级别并行 |

**解决**：**规模决定谁主导**。

- L1-L2（小项目）：不需要并行，或用 Superpowers parallel-dispatch 即可
- L3（复杂项目）：用 GSD workstreams 做 phase 级并行，Superpowers 在每个 workstream 内部做 task 级并行
- L4（超大项目）：GSD workstreams + 外部 Selection Layer

## 四、安全维度——gstack 的差异化亮点

在三个插件中，**gstack 是唯一把代码安全设计作为一等公民显式暴露为命令的**。GSD 和 Superpowers 的安全策略都是隐式的——通过 spec 验证和 code review 间接保障，但没有专门的安全机制。

### 4.1 安全能力对比

| 安全维度 | GSD | Superpowers | gstack |
|---------|-----|------------|--------|
| **文件保护** | 无 | 无 | `/freeze` — 冻结关键文件，防止 agent 误改配置、密钥、核心模块 |
| **操作确认** | 无 | 无 | `/careful` — 进入谨慎模式，每步变更都需要确认 |
| **安全边界** | 无 | 无 | `/guard` — 显式声明安全边界，agent 不得越界 |
| **部署安全** | 无 | 无 | `/canary` — 金丝雀发布，灰度验证后再全量 |
| **代码审查** | `/gsd:verify-work`（功能级） | `/sp:requesting-code-review`（质量级） | 无独立 review，但 `/careful` 模式本身就是 review-before-act |

### 4.2 为什么安全需要显式化

Coding Agent 的一个常见事故模式：

```
Agent 修改代码 → 顺手改了 .env / config / 权限文件 → 测试通过（测试没覆盖配置）→ 部署上线 → 事故
```

GSD 和 Superpowers 无法防止这类问题，因为它们的验证机制（spec 验证、code review）关注的是**功能正确性和代码质量**，不关注**哪些文件不该碰**。

gstack 的 `/freeze` 直接解决了这个问题：

```markdown
## gstack 安全配置示例

### 冻结清单（/freeze 触发时自动应用）
- .env / .env.* — 环境变量，绝不能被 agent 修改
- config/production.* — 生产配置
- package-lock.json / yarn.lock — 锁文件，防止依赖漂移
- Dockerfile / docker-compose.yml — 容器定义
- .github/workflows/ — CI/CD 流水线
- CLAUDE.md — agent 自身的约束文件（agent 不应该修改自己的规则）
```

### 4.3 安全在三层架构中的位置

安全不是单独一层，而是**贯穿三层的横切关注点**：

```
┌─────────────────────────────────────────────────────┐
│  Safety Rail（gstack /freeze + /careful + /guard）    │
│  ┌─────────────────────────────────────────────────┐ │
│  │  GSD → Superpowers → gstack                     │ │
│  │  spec    engineering    execution               │ │
│  └─────────────────────────────────────────────────┘ │
│  安全护栏在每一层的每个动作之前都生效                    │
└─────────────────────────────────────────────────────┘
```

实际工作流中，安全护栏应该在**进入 GSD phase 之前就激活**：

```
gstack: /freeze（冻结关键文件）
    ↓
gstack: /guard（声明安全边界）
    ↓
GSD: /gsd:start（进入 phase）
    ↓
... 正常三层工作流 ...
    ↓
gstack: /careful（部署前切换谨慎模式）
    ↓
gstack: /canary（金丝雀发布）
```

### 4.4 对其他框架的启示

gstack 的安全设计暴露了 GSD 和 Superpowers 的一个盲区：**它们假设 agent 只会改"该改的"文件**。

这个假设在 L1-L2 小项目中通常成立（文件少、结构简单），但在 L3-L4 项目中就很危险了。建议的补充措施：

- **在 CLAUDE.md 中增加"禁止修改"清单**——即使不用 gstack，也可以通过约束文件实现类似 `/freeze` 的效果
- **在 Superpowers code review 中增加"敏感文件变更检查"**——reviewer 应该特别关注配置文件、密钥文件、锁文件的变更
- **在 GSD verify-work 中增加"安全验证"**——除了 spec 符合性，还要检查是否有意外的文件变更

这也是为什么在三层架构中 gstack 不仅仅是"最内层的执行工具"——它的安全护栏能力是**覆盖所有层的基础设施**。

## 五、与前六篇文章的观点验证

### 5.1 一致之处（四个验证）

**验证 1：分离关注点原则**

那篇文章的核心观点——Superpowers 管思考、gstack 管执行——与我们在 [[Vibe Coding系列04：流程框架选择指南——GSD、SpecKit、OpenSpec与Superpowers的组合实践]] 中的结论一致：

> 规范框架和方法论框架**互补不互斥**。

**验证 2：Independent Reviewer**

文章推荐使用 Superpowers 的 code-review 开新上下文做 reviewer。这正是 [[Vibe Coding系列02：架构师视角的AI Harness Engineering最佳实践]] 中 Generation-Evaluation Separation 的实践：

> 生成者和评估者必须用不同的上下文，避免自我确认偏差。

**验证 3：Evidence-First**

文章强调"先看证据再行动"（gstack `/browse` 验证）。这与 [[Vibe Coding系列01：全面系统的了解Harness Engineering的来龙去脉]] 中 Verification Mechanisms 模块的思路一致。

**验证 4：gstack 填补 Ops 空白**

gstack 的 `/ship`、`/land-and-deploy`、`/canary` 确实填补了 GSD 和 Superpowers 都没有的 CI/CD 最后一公里。这是新增价值，不是重叠。

### 5.2 分歧之处（四个修正）

**修正 1：不能忽略 GSD**

文章只讨论 Superpowers + gstack 二元组合，但缺少外层的 spec 管理和 phase 状态。在 L2+ 项目中，没有 GSD 的 spec 驱动，Superpowers 的 brainstorm 和 plan 会缺乏锚点——你在 brainstorm 什么？plan 什么？必须有 spec 作为输入。

**修正 2：缺乏 Context 管理视角**

文章没有讨论 context 预算问题。在 [[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移]] 中我们已经论证：

> 所有当前框架的结构性缺陷是 **context = state**，大项目必然爆炸。

三个插件叠加使用时，context 消耗是叠加的。必须有 Granularity Layer 的粒度控制（spec ≤ 150 行、plan ≤ 10 tasks/phase、代码模块 ≤ 400 行）来约束。

**修正 3：删除策略过于激进**

文章建议"删掉不需要的代码比维护更好"。这在小项目没问题，但在大项目中，代码删除的 blast radius 需要评估。在 [[Vibe Coding系列07：Coding Agent时代的代码复用——从架构约束到Plugin协作的实践指南]] 中我们强调的 FEATURE.md 边界声明，恰恰是为了防止 agent 随意删除被其他模块依赖的代码。

**修正 4：过度信任 Superpowers 的 Review**

文章说"让 Superpowers review 代码"就够了。但 Superpowers 的 review 是文本级的（看代码写得好不好），缺少：
- Spec 符合性验证（GSD `/gsd:verify-work` 的职责）
- 真实环境验证（gstack `/qa` 的职责）
- 架构约束检查（CLAUDE.md 中的复用规则）

Review 必须是多层的，不能只靠一个插件。

## 六、Compound Engineering（CE）的位置

在讨论三层架构时，还需要澄清 Compound Engineering 的定位。

### 6.1 CE 解决的不是代码复用

CE 的核心机制 `/ce:compound` 会启动 6 个 subagent，从完成的工作中提取经验，生成 `docs/solutions/*.md`。这是**知识/经验复用**，不是**代码组件复用**。

详细分析见 [[Vibe Coding系列07：Coding Agent时代的代码复用——从架构约束到Plugin协作的实践指南]]。

### 6.2 CE 与 Claude Code Memory 的重叠

| 维度 | CE `docs/solutions/` | Claude Code Memory `.claude/memory/` |
|------|---------------------|--------------------------------------|
| 存储 | 项目内，可 git 共享 | `.claude/memory/`，通常个人 |
| 触发 | 手动 `/ce:compound` | 自动或"记住这个" |
| 价值 | 团队共享经验 | 个人跨项目记忆 |

**结论**：单人开发场景下两者基本等价。团队场景下 CE 有"经验进版本库"的优势。

### 6.3 CE 在三层架构中的位置

CE 不在三层的任何一层——它是**正交的知识层**，在所有层之上运作：

```
┌─ Knowledge Layer（CE）──── 经验沉淀 + 知识复利 ─┐
│                                                │
│  GSD  → Superpowers → gstack                   │
│  spec    engineering    execution               │
│                                                │
└─── 每个层的教训都可以被 CE 捕获和复用 ──────────┘
```

## 七、规模适配——不同项目怎么选

在 [[Vibe Coding系列06：GSD项目规模分级实践——从快速脚本到超大规模的Context策略演进]] 中，我们定义了 L1-L4 四级规模。三层插件在不同规模下的配置：

| 规模 | GSD | Superpowers | gstack | CE |
|------|-----|------------|--------|-----|
| **L1（1-3文件）** | 不需要（`/gsd:fast` 或直接写） | 可选（verify 就够） | 不需要 | 不需要 |
| **L2（5-20文件）** | 标准五步 | brainstorm + plan + review | `/qa` 验证 | 可选 |
| **L3（20-100文件）** | Workstream + 细粒度 spec | 完整流程 + TDD + parallel-dispatch | `/qa` + `/ship` + `/careful` | 推荐 |
| **L4（100+文件）** | Milestone + Thread + 外部 Selection | 完整流程 | 完整工具链 | 强烈推荐 |

**关键原则**：规模越小，层数越少。L1 不需要三层架构，直接用 Superpowers 甚至裸 Claude Code 就够了。过度工程化是反模式——在 [[Vibe Coding系列01：全面系统的了解Harness Engineering的来龙去脉]] 中我们已经警告过：

> Harness 必须是可撕掉的。过度工程化的 harness 在模型升级后变成死重。

## 八、CLAUDE.md 路由规则

要让三个插件协同工作而不冲突，关键在 CLAUDE.md 中写清楚路由规则。以下是实践模板：

```markdown
## 插件协作规则

### 三层分工
- GSD 管 spec 和 phase 状态（做对的事情）
- Superpowers 管工程方法（做事情的方法对）
- gstack 管外部世界交互（做完能交付）

### Phase 内工作流
在 GSD phase 执行阶段，按以下顺序使用：
1. Superpowers brainstorm → 分析怎么做
2. Superpowers writing-plans → 细化实现计划
3. (可选) gstack plan-eng-review → 计划评审
4. Superpowers executing-plans + TDD → 实现
5. gstack /qa → 真实环境验证
6. Superpowers verification → 工程质量检查
7. Superpowers code-review → 代码审查
8. GSD verify-work → spec 符合性验证
9. gstack /ship → 交付

### 冲突解决
- 需求级别的讨论用 GSD discuss，不用 Superpowers brainstorm
- 实现级别的分析用 Superpowers brainstorm，不用 GSD discuss
- 验证分三层：Superpowers verify（代码质量）→ gstack qa（真实环境）→ GSD verify-work（spec 符合性）
- 并行：L2 以下用 Superpowers parallel-dispatch，L3+ 用 GSD workstreams
```

## 九、总结——系列文章的完整拼图

经过八篇文章，我们形成了一个完整的 Vibe Coding 实践体系：

| # | 篇目 | 核心问题 | 核心答案 |
|---|------|---------|---------|
| 1 | [[Vibe Coding系列01：全面系统的了解Harness Engineering的来龙去脉]] | Harness Engineering 是什么？ | 设计 AI 运行机制，而非教 AI 如何回答 |
| 2 | [[Vibe Coding系列02：架构师视角的AI Harness Engineering最佳实践]] | 架构师怎么做？ | 五层文档 + 四层架构 + Bitter Lesson |
| 3 | [[Vibe Coding系列03：AI-Native开发实践——从Figma设计到Superpowers Brainstorm再到Spec-Delta工作流]] | 端到端怎么串？ | 五层 AI Pipeline：Design → Spec → Coding → Testing → Review |
| 4 | [[Vibe Coding系列04：流程框架选择指南——GSD、SpecKit、OpenSpec与Superpowers的组合实践]] | 选哪个框架？ | GSD + Superpowers 是默认组合 |
| 5 | [[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移]] | 大项目为什么崩？ | Context = State 是结构性缺陷，需要 Selection Layer |
| 6 | [[Vibe Coding系列06：GSD项目规模分级实践——从快速脚本到超大规模的Context策略演进]] | 不同规模怎么调？ | L1-L4 四级分类 + 动态迁移策略 |
| 7 | [[Vibe Coding系列07：Coding Agent时代的代码复用——从架构约束到Plugin协作的实践指南]] | Agent 造轮子怎么办？ | 四层防线：CLAUDE.md + FEATURE.md + Review + Skill |
| 8 | **本文** | 三个插件怎么组合？ | 三层嵌套 + 安全护栏：GSD → Superpowers → gstack |

**一句话总结**：

> GSD 管"做什么"，Superpowers 管"怎么做"，gstack 管"怎么交付"——三者是嵌套关系而非并列关系。不要在同一层面上比较它们，要按规模选择需要几层，然后在 CLAUDE.md 中写清楚路由规则。

## 参考资料

- [Claude Code 双插件最佳搭配：superpowers 当大脑，gstack 当手脚](https://mp.weixin.qq.com/s/ShJ6ogkcI-6qZtFY--XcTA)
- [深入对比 Gstack、Superpowers 和 Compound Engineering 三个最火的 AI Coding 工具](https://mp.weixin.qq.com/s/_hqzV6vGuBf2-95DfQyR2w)
- [A Claude Code Skills Stack: How to Combine Superpowers, gstack, and GSD Without the Chaos](https://dev.to/imaginex/a-claude-code-skills-stack-how-to-combine-superpowers-gstack-and-gsd-without-the-chaos-44b3)
- [obra/superpowers](https://github.com/obra/superpowers) — Superpowers GitHub 仓库
- [gstack-ai/gstack](https://github.com/gstack-ai/gstack) — gstack GitHub 仓库
- [get-stuff-done](https://github.com/get-stuff-done/get-stuff-done) — GSD GitHub 仓库
