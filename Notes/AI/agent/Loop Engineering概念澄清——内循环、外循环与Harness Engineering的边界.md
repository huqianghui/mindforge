---
title: Loop Engineering概念澄清——内循环、外循环与Harness Engineering的边界
created: 2026-06-15
tags:
  - loop-engineering
  - harness-engineering
  - agentic-engineering
  - coding-agent
  - verification
---

# Loop Engineering概念澄清——内循环、外循环与Harness Engineering的边界

> 当所有人都在谈"治理、控制、验证的循环"时，Loop Engineering 到底新在哪里？答案藏在两个被混为一谈的高度，和一条被低估的 verifier 谱系里。

## 一、问题：Loop Engineering 是 Harness Engineering 的复述吗？

2026 年，"Loop Engineering（循环工程）"作为新词同时出现在多篇博客和 Coding Agent 产品文案里。但凡熟悉 [[Vibe Coding系列01：全面系统的了解Harness Engineering的来龙去脉|Harness Engineering]] 的人，第一反应几乎都是同一个疑问：

> 我们早就在讲治理、控制、验证的反馈循环了。Loop Engineering 是把这些再强调一遍，还是只是给 Codex 的 `/goal`、Claude Code 的 agentic loop 起了个新名字？

这个疑问是合理的——Loop Engineering 的相当一部分内容**确实是 Harness Engineering 的重新包装**：permissioning、scoped tools、human approval、stop conditions，这些在 Harness 讨论里都是老生常谈。

但它有一个不容易一眼看穿的真正增量。要看清这个增量，必须先拆解一个被普遍混淆的事实：**市面上的"Loop Engineering"其实指着两个完全不同高度的东西**。

## 二、概念澄清：两个被混为一谈的"循环"

对比两篇代表性文章，会发现它们定义的根本不是同一个对象。

### 高度一：内循环（Inner Loop）——单任务的反馈环

[What Is Loop Engineering?](https://kilo.ai/articles/what-is-loop-engineering) 把 Loop Engineering 定义为"设计、运行、改进让 Agent 规划→改代码→观察结果→修正方法直到任务完成的反馈循环"。它的循环单元是**单个 Agent 在单个任务上的迭代**：

```
Intent（定义目标）
  → Context（收集代码/文档/错误）
    → Action（编辑文件/起草方案）
      → Observation（捕获测试结果/编译错误/反馈）
        → Adjustment（更新计划，重复直到完成）
```

这就是经典的 OODA / 控制论负反馈环，落在 Coding Agent 的语境里。它**关心的是单个任务怎么收敛**。

### 高度二：外循环（Outer Loop）——替代人类 prompter 的自治系统

[Loop Engineering](https://addyosmani.com/blog/loop-engineering/)（Addy Osmani）的定义完全不同：Loop Engineering 是"**把自己——那个不断 prompt agent 的人——替换掉**"，转而设计一个能自主发现工作、执行、验证、决定下一步的系统。一句话点题：

> "You design the system that does it instead."（你设计那个替你做这件事的系统。）

它的循环单元是**跨多个任务、按 cadence 自动运行的编排系统**，由五个结构件 + 记忆构成：

| 结构件 | 作用 |
|--------|------|
| **Automations** | 定时发现与三联（triage）：读 CI 失败、open issues、近期 commits，写入 triage inbox |
| **Worktrees** | 隔离的并行执行分支，避免多 Agent 抢同一文件 |
| **Skills** | `SKILL.md` 固化项目知识，每轮调用——"没有 Skill，循环每轮都从零重新推导整个项目" |
| **Plugins/Connectors** | MCP 连外部系统（Linear、Slack、DB、staging API） |
| **Sub-agents** | 拆分 maker 与 checker（起草 vs 验证用不同 Agent） |
| **Memory** | Markdown / Linear board 把状态持久化到对话之外——"模型会忘，仓库不会忘" |

这关心的不是单个任务怎么收敛，而是**人怎么从"按一次次回车的操作员"退到"设计循环的工程师"**。

### 两个高度的关系

它们不是互相竞争的定义，而是**同一棵树的两层**：

```
外循环（自治系统）：发现 → 派发 → 验证 → 集成，按 cadence 自动跑，无人在轮次之间介入
  └── 内循环（单任务反馈环）：Intent → Action → Observation → Adjustment，跑到可验证条件成立
```

外循环编排多个内循环。Kilo 讲的 5 种循环都活在**内循环**这一层；Osmani 的 5 个结构件都活在**外循环**这一层。用户感到"说不清和 Harness 的区别"，正是因为这两个高度被同一个词缝在了一起。

### 外循环 vs Ralph Loop：编排系统 vs 单任务内核

很容易把外循环和 [[AutoResearch概念澄清——与Ralph-Loop和AutoML的本质区别|Ralph Loop]] 混为一谈——两者都"让 AI 自动跑"。但它们根本不在一个层面：**Ralph Loop 是外循环里"单任务执行"那一格的一种实现，外循环是把多个这样的格子编排起来的上层系统**，是被包含关系。

| 维度 | Ralph Loop | Osmani 外循环 |
|------|-----------|--------------|
| **循环单元** | 单任务（一个 prompt 磨到完成） | 跨任务编排（发现→派发→验证→集成） |
| **工作从哪来** | 人喂进来 | 系统自己 triage 发现 |
| **并行性** | 单轨（一个目标反复跑） | 多轨（worktree 隔离并行多任务） |
| **验证机制** | done/not done，无独立打分 | maker/checker 分离，独立模型打分 |
| **状态/记忆** | 无 best state、无回滚 | Memory 跨 cycle 持久化 |
| **类比** | 固定点迭代——找可行解 | 编排系统——管理一串内循环的生命周期 |

关键差异：Ralph Loop **不发现新工作**——任务是人喂进去的，它只负责把这一个磨到 done。外循环的第一步就是**自己发现该干什么**（Automations 扫 CI/issues），这正是"替换掉那个不断 prompt 的人"的核心动作。

```
外循环（Osmani）：发现 → 派发 → 验证 → 集成，按 cadence 自动跑
  └── 内循环（单任务）：跑到可验证条件成立
        ├── 可以是 Ralph Loop（蛮力重试，只看 done/not done）
        ├── 可以是 AutoResearch（带 selection + 回滚的演化搜索）
        └── 可以是 Kilo 的 Compiler/Test/Runtime-Driven loop
```

**核心洞察**：Ralph Loop、AutoResearch、Kilo 的 5 种内循环是**同一层**的东西——都是"单任务怎么收敛"的不同策略，区别在 verifier 强度和有没有 selection 机制（Ralph 无 selection，AutoResearch 有）。外循环高它们一层，不关心单任务用哪种内核收敛，只管**怎么发现任务、隔离派发、独立验证、跨轮记忆**。一句话：**Ralph Loop 是"让 AI 在一个任务上不停干活"，外循环是"让系统自己决定有哪些任务、派给谁、谁来验"——前者是后者的一个可插拔执行内核。**

## 三、对比：Loop Engineering 在概念栈里的位置

把 Loop Engineering 放进 [[Agentic-Engineering——质量与成本的一体化优化|Agentic Engineering 的三层递进]]（Prompt ⊂ Context ⊂ Harness）里，关系就清楚了：

| 层级 | 操作对象 | 维度 | 核心问题 |
|------|---------|------|---------|
| Prompt Engineering | 单轮输入 | 点 | 怎么说 |
| Context Engineering | 进窗口的东西 | 单轮的**空间**维度 | 给模型看什么 |
| Harness Engineering | 单 Agent 的控制装置 | 单 Agent 的运行时 | 让模型在什么机制里干活 |
| **Loop Engineering** | 反馈环 + 自治编排 | 跨轮的**时间**维度 | 反馈如何组织 / 人何时退出 |

### 关键判断：Loop Engineering 横切了 Harness 的边界

这是回答"它和 Harness 到底什么关系"的核心。Loop Engineering 不是 Harness 的同义词，也不是它干净的子集或超集，而是**从"反馈"这个视角横切了 Harness 的内部与上层**：

- **内循环 ⊂ Harness**：[[Claude Code系列07：Harness分层架构——从50万行源码到社区框架的控制论解读|Harness 六层架构]]里的 L6 Eval（评估反馈层）就是内循环的实现。这部分确实是 Harness 的复述，没有新东西。
- **外循环 ⊃ Harness**：外循环把"多个单 Agent + 各自的 Harness"编排成自治系统。这一层在传统 Harness 叙事里是缺位的——Harness 默认有个人在轮次之间盯着，外循环把这个人也抽掉了。

所以诚实的结论是：**Loop Engineering 的一半是 Harness 的反馈子系统（旧），另一半是 Harness 之上的自治编排（新）**。用一句话回答用户的疑问——它既"把治理/控制/验证再强调了一遍"（内循环部分），又"补上了人退出循环后系统怎么自转"（外循环部分）。

## 四、真正的增量：Verifier 谱系与"验证左移"

如果只能记住 Loop Engineering 一个原创洞察，应该是这个：**循环的形状由它的验证信号来源决定**。

Harness 讨论里我们说"评估循环"时，常把 verifier 当成一个**抽象的单一闸门**（"跑一下 verifier"）。Kilo 的 5 种内循环戳破了这个抽象——它们本质不是 5 个场景，而是**按 verifier 强度排序的一条谱系**：

| 内循环类型 | Verifier 信号 | 确定性 | 适用场景 |
|-----------|--------------|--------|---------|
| **Compiler-Driven** | 类型/编译错误 | 最强（确定性、即时） | 迁移、依赖升级、重构 |
| **Test-Driven** | 测试通过/失败 | 强（取决于测试质量，可能 flaky） | Bug 修复、parser 行为、回归防护 |
| **Runtime Debugging** | 日志/堆栈/浏览器输出/HTTP 响应 | 中（需真实执行环境） | 生产故障、需运行时观察的问题 |
| **Product Iteration** | 设计约束/响应式/可访问性检查 | 低-中（需把约束编码） | 文案、UI 状态、边界情况、品牌一致性 |
| **Review-Driven** | 人类评论（区分"要求" vs"建议"） | 最弱（噪声、慢、要人） | PR 反馈吸收 |

```
强 ← 确定性 / 即时 / 可自动 ──────────────── 弱 ← 噪声 / 慢 / 要人 →
Compiler  >  Test  >  Runtime  >  Product  >  Review
```

由此推出两条硬规律：

1. **verifier 越接近确定性 ground truth，循环就能跑得越紧、越能无人值守。** Compiler loop 可以全自动狂跑；Review loop 永远卡在人的速度上。
2. **验证应尽量"左移"。** 把设计约束编码成 test，把 review comment 沉淀成 lint rule，把"人类审美判断"转成"可执行的检查"——目的就是把循环从右侧（要人）推向左侧（可自动），从而缩小外循环里"必须人在环"的瓶颈。

更深一层，这其实是 [[Vibe Coding系列13：控制论如何指导Harness Engineering——用Regulation和Requisite Variety让Vibe Coding变得可控|控制论]]的直接推论：

> **Agent 产出质量的上限 = 它的 verifier 质量的上限。** 控制器（循环）只能调节到它的传感器（verifier）能测准的程度。一个 verifier 噪声大的循环，无论迭代多少次都收敛不到正确解——这就是为什么 Osmani 说"done 是一个声明，不是证明"。

这个"verifier 决定循环形状、并应主动左移"的角度，是普通 Harness 叙事里经常被一笔带过、而 Loop Engineering 真正讲清楚的部分。

## 五、SDLC 各阶段的 Loop 控制对应

用户最关心的实操问题：做一个产品的 vibe coding 时，不同阶段需要不同的 loop。把 SDLC 阶段、主导内循环、verifier、可自治程度对应起来：

| SDLC 阶段 | 主导内循环 | Verifier 信号 | 确定性 | 可自治程度 | 人类角色 |
|-----------|-----------|--------------|--------|-----------|---------|
| **Plan / Triage** | （无传统反馈环） | 需求完整性、优先级判断 | 低 | 低 | **Own**：人定优先级 |
| **Design / Scaffold** | Compiler-Driven | 类型/编译错误 | 高 | 高 | Delegate |
| **Build** | Test-Driven + Compiler | 测试 + 编译 | 高 | 高 | Delegate + Review |
| **Integration / Debug** | Runtime Debugging | 日志/堆栈/HTTP | 中 | 中 | Review |
| **UI / Polish** | Product Iteration | 设计约束/可访问性 | 低-中 | 中（需先把约束编码） | Review |
| **Review / Merge** | Review-Driven | 人类评论 | 低 | 低 | **Own**：人最终签核 |

（Delegate / Review / Own 三档对应 [[Agentic-Engineering——质量与成本的一体化优化|Agentic Engineering]] 的工作框架。）

**核心洞察**：一个产品的生命周期，本质是**一串内循环的切换**，切换依据就是"此刻哪种 verifier 最便宜+最高保真"。两端（Plan 与 Review）verifier 弱、必须人主导；中段（Design→Build→Integration）verifier 强、可大幅自治。所以 Loop Engineering 作为技能，一半是**为每个阶段造对的 verifier**，一半是**判断现在该切到哪个 loop**。

### 外循环如何叠加在 SDLC 之上

Osmani 的 5 个结构件正好覆盖 SDLC 的不同阶段，把"人决定下一步"换成"系统决定、人审结果"：

```
Plan/Triage   ← Automations（定时扫 CI/issues/commits，写 triage inbox）
Build         ← Worktrees（隔离并行）+ Skills（每轮注入项目知识）
Review/Test   ← Sub-agents（maker/checker 分离，独立模型打分而非自评）
Integration   ← Connectors（开 PR、更新 ticket、通知团队）
跨 cycle      ← Memory（state file 记录已尝试/已通过/待办，下一轮接着跑）
```

其中 `/goal` 这类原语就是内循环停止条件的产品化实现：跑到"可验证条件成立"为止（如"test/auth 全过且 lint 干净"），并由**独立模型**给完成度打分——因为"写代码的那个模型给自己批改作业时太手软"。这正是 maker/checker 分离在停止条件上的体现。

## 六、外循环的落地：框架栈与参考架构

Osmani 给的是方法论，但 2026 年社区已经把它补成了**成熟的落地栈**。值得注意的是：OpenAI、Anthropic、Geoffrey Huntley、Horthy、Vasilopoulos **五个独立团队都收敛到同一个发现——"瓶颈是基础设施，不是智能"**。

### 三层框架栈

外循环不是单一框架，而是一个分层栈：底层是单 Agent 自治内核，中层是并行编排器，顶层是高吞吐 swarm 引擎。

| 层 | 代表框架 | 职责 |
|----|---------|------|
| **单任务自治内核** | Ralph（`how-to-ralph-wiggum`、`ralph-tui`）、Codex `/goal`、Claude Code headless | 一个 Agent 把单任务磨到 done/test 通过 |
| **并行编排器（worktree 隔离层）** | Conductor、Crystal、Claude Squad、cmux、Vibe Kanban、`parallel-code`、bernstein | 多 Agent 在隔离 worktree 并行，带 diff viewer + one-click merge |
| **高吞吐 swarm 引擎** | Gas Town + Beads（Steve Yegge）、Intent（Augment，spec-driven） | 管理几十个 Claude Code 实例，解决"记忆丢失 + 协调"问题 |
| **全栈 harness CLI** | Atomic（包 Claude Code/Copilot/OpenCode） | 三层 context + 专精 sub-agent + 持久 research + 编译图执行 |

其中 bernstein 是个干净的范本：**确定性编排器——派发并行 Agent，用测试验证，自动 commit**，正好把 Osmani 的 Worktrees + Sub-agents(checker) + Memory 三件套全落地了。

### 参考架构：把 Osmani 五件套映射成可部署组件

```
┌─ Trigger 层：cron / webhook / CI hook ──────────────┐
│   Automations：定时扫 CI失败/open issues/commits      │
│   → 写入 triage inbox（Beads / Linear board）         │
├─ Dispatch 层：任务队列 + 调度器 ─────────────────────┤
│   每个任务 fork 一个隔离 worktree（Conductor/Crystal） │
│   注入 Skills（SKILL.md）+ Connectors（MCP）          │
├─ Execution 层：单任务自治内核 ───────────────────────┤
│   maker agent 跑内循环（Ralph / /goal）直到可验证条件 │
├─ Verify 层：独立 checker（关键！）───────────────────┤
│   独立模型打分，不让 maker 自评                        │
│   ← 跑测试/编译/lint，失败回滚                         │
├─ Integrate 层：开 PR / 更新 ticket / 通知 ───────────┤
└─ Memory 层：state file 跨 cycle 持久化 ──────────────┘
        （已尝试/已通过/待办 → 下一轮接着跑）
```

### 最佳实践：五团队收敛的四根支柱

1. **Context 架构**：分层、渐进式披露（对应 [[Agentic-Engineering——质量与成本的一体化优化|Skill 分层加载 L0–L3]]）
2. **Agent 专精**：scoped prompt + 受限工具集（maker/checker 分离）
3. **持久记忆**：文件系统支撑，不靠对话历史——"模型会忘，仓库不会忘"
4. **结构化执行**：research → plan → execute → verify

Huntley 自己把 Ralph 提炼成"**3 Phases, 2 Prompts, 1 Loop**"的漏斗：idea → JTBD-aligned specs → 实现计划 → Ralph work loop。**它不是"一个会写代码的循环"，而是前面有规格漏斗收口的循环**——这与"裸 Ralph"的本质区别正在于规格收口。

## 七、保障性与可行性：被 verifier 卡死的边界

### 保障性：五条约束是唯一的护栏

外循环的保障性**完全由 verifier 强度封顶**——这是第四节那条控制论铁律的直接推论（控制器只能调到传感器测得准的程度）。而具体保障手段，恰好就是 [[AutoResearch概念澄清——与Ralph-Loop和AutoML的本质区别|AutoResearch 五条约束]]：

| 保障机制 | 作用 |
|---------|------|
| **单一可变面**（bounded action surface） | 一个任务 = 一个有界改动面，防止乱改 |
| **固定 eval**（独立不可篡改） | verifier 是独立 service，maker 改不了——防 reward hacking |
| **强制预算**（max steps/tokens/cost） | 防跑飞烧钱（"20+ 轮烧 150K token"） |
| **Diff-based 迭代** | 每轮只改一点，可审计可回滚 |
| **自动回滚**（accept/reject gate） | 变差就 revert |

但有个诚实的天花板：Huntley 演示了自治循环能 ship MVP，**但每个循环都有资深工程判断在引导**；OpenAI 的 Carlini 也说"我大部分精力花在设计 Claude 周围的环境——测试、环境、反馈——好让它不靠我也能自我定向"。

> **外循环的保障性不在循环本身，而在你喂给它的 verifier 和约束有多严。** "done 是声明，不是证明"——无人值守的循环会无人值守地犯错。

### 可行性：越靠确定性 ground truth 越能自治

可行性同样是 verifier 谱系的直接推论：

| 可行性 | 场景 | 原因 |
|--------|------|------|
| ✅ **高（已生产可用）** | backlog 清理、依赖升级、迁移、test-driven bug fix | verifier 强（compiler/test），bounded scope |
| ⚠️ **中（需人盯 checker）** | 集成调试、运行时问题 | verifier 中（需真实运行环境） |
| ❌ **低（别全自治）** | UI/审美、架构决策、open-ended 研究 | verifier 弱（约束难编码，或根本编码不了） |

**现实门槛**（决定能不能真上）：① 必须有资深工程判断设计循环和审 PR；② observability + 成本护栏（否则月底账单爆炸）；③ merge 冲突解决——大多数编排器仍把 task alignment、conflict resolution、merge 决策留给人。

## 八、不能忽略的代价：自治不等于免责

Osmani 全文最清醒的部分，是对自治外循环的三个警告——它们是这套方法论的诚实配重：

1. **验证仍然是人工的**：无人值守的循环会无人值守地犯错。拆分 verifier sub-agent 能造更强的信号，但"done 是声明，不是证明"。
2. **理解债（Comprehension Debt）在累积**：代码 ship 得越快，"存在的东西"和"工程师理解的东西"之间的鸿沟越大。
3. **认知投降（Cognitive Surrender）的诱惑**：很容易停止思考、接受循环吐出的任何东西；而循环设计会**放大**这个危险——当你用它来逃避理解、而非加速有理解的工作时。

一句定调：

> "Build the loop. But build it like someone who intends to stay the engineer, not just the person who presses go."
> （造这个循环。但要像一个打算继续当工程师的人那样造它，而不是只当那个按"开始"的人。）

> "Your job is to ship code you confirmed works."（你的职责是 ship 你确认过能跑的代码。）

杠杆点从 prompting 移到了 loop design，但**责任没有转移**。

## 九、结论：回到最初的疑问

| 疑问 | 回答 |
|------|------|
| Loop Engineering 是 Harness 的复述吗？ | 一半是（内循环 = Harness 的 Eval 反馈层），一半不是（外循环 = Harness 之上的自治编排，传统 Harness 缺位） |
| 它有什么真正的增量？ | ① **Verifier 谱系 + 验证左移**：循环形状由验证信号来源决定；② **内/外循环双高度**的显式区分；③ **operator → designer 的角色跃迁**（Osmani 核心） |
| 是和 Codex `/goal`、Claude Code loop 呼应而已吗？ | "呼应"成立但不止于此——`/goal` 是内循环停止条件的产品化实现，Loop Engineering 是把它抽象成方法论，并补上了外循环这一层 |

**一句话总结**：Loop Engineering ≈ Harness Engineering 的时间维度切片 + 一个被低估的洞察（按 verifier 强度组织循环、并主动把验证左移）+ 一次角色跃迁（从 prompt agent 的人，变成设计那个 prompt agent 的系统的人）。它不是新范式，但"verifier 决定循环形状"和"内/外循环双高度"这两个角度，值得补进已有的 Harness 心智模型里。

---

## 参考

- [What Is Loop Engineering?](https://kilo.ai/articles/what-is-loop-engineering) — 内循环视角：5 种按 verifier 分类的反馈循环
- [Loop Engineering](https://addyosmani.com/blog/loop-engineering/)（Addy Osmani）— 外循环视角：替代人类 prompter 的自治系统（5 结构件 + 记忆）
- [Top AI Coding Trends for 2026 — Beyond Vibe Coding](https://beyond.addy.ie/2026-trends)（Addy Osmani）— Gas Town/Beads、Conductor、Vibe Kanban、Agent Skills 生态
- [awesome-agent-orchestrators](https://github.com/andyrewlee/awesome-agent-orchestrators) — 并行编排器与自治 loop runner 清单（bernstein/cmux/crystal/ralph-tui）
- [everything is a ralph loop](https://ghuntley.com/loop) 与 [how-to-ralph-wiggum](https://github.com/ghuntley/how-to-ralph-wiggum)（Geoffrey Huntley）— Ralph 漏斗：3 Phases, 2 Prompts, 1 Loop
- [How to Harness Coding Agents with the Right Infrastructure](https://alexlavaee.me/blog/harness-engineering-why-coding-agents-need-infrastructure) — 四支柱、五团队收敛、Carlini 引用、Atomic CLI
- [9 Open-Source Agent Orchestrators for AI Coding (2026)](https://www.augmentcode.com/tools/open-source-agent-orchestrators) — Intent、Code Conductor、Claude Squad 对比

## 相关笔记

- [[Agentic-Engineering——质量与成本的一体化优化]] — 概念栈母体：Prompt ⊂ Context ⊂ Harness、SDLC 七阶段、Delegate/Review/Own
- [[Vibe Coding系列01：全面系统的了解Harness Engineering的来龙去脉]] — Harness Engineering 总览
- [[Vibe Coding系列13：控制论如何指导Harness Engineering——用Regulation和Requisite Variety让Vibe Coding变得可控]] — verifier 上限 = 控制器上限的控制论依据
- [[Claude Code系列07：Harness分层架构——从50万行源码到社区框架的控制论解读]] — 六层架构与 L6 Eval 反馈层
- [[AutoResearch概念澄清——与Ralph-Loop和AutoML的本质区别]] — 另一篇循环类概念辨析
