---
title: Vibe Coding 系列06：GSD 项目规模分级实践——从快速脚本到超大规模的 Context 策略演进
created: 2026-03-28
tags:
  - vibe-coding
  - GSD
  - context-engineering
  - spec-driven-development
  - best-practices
---

# Vibe Coding 系列06：GSD 项目规模分级实践——从快速脚本到超大规模的 Context 策略演进

> GSD（Get Stuff Done）是当前 Vibe Coding 领域最成熟的 Spec-Driven Development 框架，但"一套流程打天下"是 anti-pattern。本文将项目按规模分为四级，逐级拆解 GSD 的命令组合、Context 策略、驱动模式与补偿方案，并回答一个关键设计问题：**为什么 GSD 没有 Code Review 节点？**

---

## 一、规模分级定义

| 级别 | 代号 | 典型特征 | 文件规模 | Phase 数 | 示例 |
|------|------|----------|----------|----------|------|
| L1 | **简单**（Simple） | 单文件 / 脚本级，需求明确 | 1-3 文件 | 0-1 | CLI 工具、数据处理脚本、配置生成器 |
| L2 | **一般**（Normal） | 多文件模块级，有明确边界 | 5-20 文件 | 3-8 | REST API、单页应用、Obsidian 插件 |
| L3 | **复杂**（Complex） | 多模块 / 多服务，存在集成风险 | 20-100 文件 | 8-20+ | 微服务系统、全栈应用、AI Agent 平台 |
| L4 | **超大规模复杂**（Ultra-Large） | 跨团队 / 跨仓库，多里程碑 | 100+ 文件 | 20+ / 多 Milestone | 企业级平台、多端协同系统 |

**判断原则**：不是按代码行数，而是按**需要同时保持在 Context 中的关联信息量**来定级。一个 50 行的 LangGraph 编排文件可能比 500 行的 CRUD 接口更"复杂"，因为它的依赖图更密集。

---

## 二、四级规模的 GSD 策略矩阵

### 2.1 L1 简单——跳过仪式，直接执行

**核心原则**：GSD 的价值在于对抗 Context Rot，但 L1 项目一个 Context 窗口就能装下全部信息，不存在 Context Rot 问题。此时 GSD 的仪式感就是纯开销。

**推荐命令**：

```
# 方式 A：最快路径——一句话搞定
/gsd:fast "写一个 Python 脚本，读取 CSV 并输出 JSON"

# 方式 B：需要一点结构但不值得走全流程
/gsd:quick --full "创建一个 Obsidian 日记模版生成器"
```

**配置**：

| 维度 | L1 策略 |
|------|---------|
| GSD 命令 | `/gsd:fast` 或 `/gsd:quick` |
| Research | 关闭（`workflow.research: false`） |
| Plan Check | 关闭 |
| Granularity | 不适用（单任务） |
| Model Profile | `budget`（Sonnet 全程） |
| 驱动模式 | **Prompt-Driven**——直接描述需求，AI 一次生成 |
| State 管理 | 无需 `.planning/` 目录 |
| Code Review | 人工肉眼扫一遍即可 |
| 质量保障 | 运行一次确认输出正确 |

**何时升级到 L2**：当你发现需要"先想清楚再写"（即需要 Spec），或者单次 Prompt 无法覆盖全部需求时。

---

### 2.2 L2 一般——标准五步循环

**核心原则**：这是 GSD 的"甜蜜点"（Sweet Spot）。项目足够复杂需要结构化，但又没复杂到触发 Context 上限。完整的五步循环刚好匹配。

**推荐命令序列**：

```
/gsd:new-project              # 1. 初始化：交互式 Q&A → PROJECT.md + REQUIREMENTS.md + ROADMAP.md
/gsd:discuss-phase 01         # 2. 澄清：锁定偏好 → CONTEXT.md
/gsd:plan-phase 01            # 3. 规划：研究 + 生成原子任务 → PLAN.md（XML 结构）
/gsd:execute-phase 01         # 4. 执行：Subagent 并行 + 原子 Git 提交
/gsd:verify-work 01           # 5. 验证：逐项确认 → UAT.md
# 循环 phase 02, 03, ...
/gsd:complete-milestone       # 归档 + Tag 发布
```

**配置**：

| 维度 | L2 策略 |
|------|---------|
| GSD 命令 | 完整五步循环 |
| Research | Level 1（单次库查询）或 Level 2（完整研究） |
| Plan Check | 开启（默认） |
| Granularity | `standard`（默认） |
| Model Profile | `balanced`（Planning: Opus, Execution: Sonnet） |
| 驱动模式 | **Spec-Driven**——GSD 的 discuss → plan → execute 就是 SDD |
| State 管理 | 标准 `.planning/` 目录结构 |
| Code Review | `/gsd:review`（跨 AI peer review） |
| 质量保障 | verify-work + 手动测试 |

**L2 的关键实践**：

1. **每个 PLAN.md 控制在 2-3 个原子任务**——确保单个 Executor Subagent 在 200K 窗口的 50% 以内完成
2. **discuss-phase 不要跳过**——这一步的 CONTEXT.md 是后续所有 Plan 的"决策锚点"，省掉它会导致每个 Phase 都在重新理解需求
3. **Gap Closure 三级策略**：
   - L1 Fix：`verify-work` 失败 → `plan-phase --gaps` → `execute-phase --gaps-only`（覆盖 90% 问题）
   - L2 Fix：`/gsd:debug "描述"`（隔离调试 Subagent）
   - L3 Fix：退出 GSD，使用 Superpowers systematic-debugging

---

### 2.3 L3 复杂——精细粒度 + Brownfield + TDD 补偿

**核心原则**：L3 项目的关联信息量开始超过单个 Context 窗口。GSD 的 Subagent 隔离机制此时发挥关键作用——每个 Executor 拿到的是"切片"而非全貌。但 GSD 本身的 Planning Context 也会膨胀，需要主动管理。

**推荐命令序列**：

```
# 如果是已有项目（Brownfield）
/gsd:map-codebase             # 0. 扫描现有代码 → STACK.md, ARCHITECTURE.md, CONVENTIONS.md, CONCERNS.md

/gsd:new-project --auto       # 1. 初始化（--auto 减少交互轮次）
/gsd:discuss-phase 01 --analyze  # 2. assumptions 模式：先读代码再问问题
/gsd:plan-phase 01 --reviews  # 3. 规划 + Plan Check（3 轮验证）
/gsd:execute-phase 01         # 4. Wave 并行执行
/gsd:verify-work 01           # 5. 验证

# Phase 间可以调整粒度
/gsd:insert-phase 03          # 插入紧急修复 Phase
/gsd:add-phase                # 追加新发现的 Phase

# Milestone 级管理
/gsd:audit-milestone          # 检查所有 Requirements 是否交付
/gsd:complete-milestone       # 归档
/gsd:new-milestone "v2"       # 开始下一个版本周期
```

**配置**：

| 维度 | L3 策略 |
|------|---------|
| GSD 命令 | 完整五步 + Brownfield 扫描 + Milestone 管理 |
| Research | Level 2-3（深度研究，4 路并行：stack / features / architecture / pitfalls） |
| Plan Check | 开启 + 8 维度验证循环（最多 3 轮） |
| Granularity | `fine`（更多、更小的 Phase） |
| Model Profile | **混合策略**——关键 Phase 用 `quality`（全 Opus），常规用 `balanced`，UI 修饰用 `budget` |
| 驱动模式 | **Spec-Driven + Test-Driven 混合**（见下文） |
| State 管理 | 完整 `.planning/` + Workstreams（并行工作流） |
| Code Review | `/gsd:review --phase N --all` + Superpowers code-reviewer |
| 质量保障 | Nyquist Validation + verify-work + Superpowers TDD |

**L3 的关键实践**：

**1）Spec-Driven 与 Test-Driven 的分工**

GSD 本身是 Spec-Driven：`discuss → plan → execute` 就是从 Spec 到实现的管线。但 L3 项目需要 TDD 作为补偿：

```
┌─────────────────────────────────────────────────────┐
│  GSD Spec-Driven（宏观）                             │
│  REQUIREMENTS.md → PLAN.md → Execute                 │
│       ↓                                              │
│  Superpowers TDD（微观）                             │
│  在 Execute 阶段内部：test-first → implement → pass  │
└─────────────────────────────────────────────────────┘
```

- **GSD 管 WHAT**（做什么）——Spec 定义需求和验收标准
- **Superpowers 管 HOW**（怎么做）——TDD 确保每个实现单元正确
- **不是二选一，而是嵌套**：GSD 的 Executor Subagent 在执行时调用 Superpowers 的 TDD 循环

**2）Workstreams 并行**

```
/gsd:workstreams create "auth"      # 创建认证工作流
/gsd:workstreams create "data"      # 创建数据层工作流
/gsd:workstreams switch "auth"      # 切换到认证
/gsd:plan-phase 01                  # 在 auth 命名空间下规划
/gsd:workstreams complete "auth"    # 完成并合并
```

Workstreams 为每条工作流创建独立的 `.planning/` 命名空间，避免多条线的 Context 交叉污染。

**3）Model Profile 混合**

```json
{
  "profiles": {
    "phase_overrides": {
      "01-auth": "quality",       // 认证模块用全 Opus
      "02-data-model": "balanced", // 数据模型用默认
      "08-ui-polish": "budget"     // UI 修饰用 Sonnet
    }
  }
}
```

---

### 2.4 L4 超大规模复杂——GSD 的边界与补偿架构

**核心原则**：L4 是 GSD 的能力边界。GSD 采用"全量 Context 拼接"（Full Context Concatenation）——所有 PLAN、CONTEXT、RESEARCH 文件在 Review/Planning 时被完整加载到一个 Context 中。当 Phase 数超过 20、文件数超过 100 时，Planning Context 本身就会触发 Context Rot。

**GSD 的 L4 局限性**（来自[[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移]]的分析）：

| 问题 | 表现 |
|------|------|
| Context 线性增长 | Plan 文件数 × 平均大小 → 快速逼近窗口上限 |
| 无选择性加载 | 即使只需 1 个 Plan，所有 Plan 都会被加载 |
| Document-Centric | 模型被迫同时解析文档结构和业务逻辑 |

**L4 的 GSD 补偿策略**：

```
┌──────────────────────────────────────────────────────────┐
│  L4 = GSD 内核 + 外部补偿层                               │
│                                                           │
│  [1] State Layer        ← GSD .planning/ 目录（不变）      │
│  [2] Granularity Layer  ← fine 粒度 + 严格 Plan 尺寸控制  │
│  [3] Selection Layer    ← 🔴 GSD 缺失，需外部补偿          │
│  [4] Execution Layer    ← GSD Subagent Wave 执行（不变）   │
└──────────────────────────────────────────────────────────┘
```

**Selection Layer 补偿方案**：

| 方案 | 做法 | 适用场景 |
|------|------|----------|
| **Multi-Project Workspaces** | `/gsd:new-workspace` 为每个子系统创建隔离仓库 | 跨仓库项目 |
| **Milestone 切分** | 每个 Milestone ≤ 8 Phase，完成后归档清除 Context | 长周期项目 |
| **Workstreams 隔离** | 每条 Workstream 独立 `.planning/` 命名空间 | 多团队并行 |
| **MCP + Router** | 外挂 Selection Layer，按 query 选择性加载 Context | 技术前沿方案 |
| **Threads 持久化** | `/gsd:thread "auth-decisions"` 跨 Session 知识持久化 | 长期架构决策 |

**推荐命令序列（L4 增强）**：

```
# Workspace 级隔离
/gsd:new-workspace                 # 为子系统创建独立 Worktree

# Milestone 级规划
/gsd:new-project                   # Milestone v1.0
/gsd:plan-phase 01 --reviews       # 规划 + 3 轮验证
...
/gsd:audit-milestone               # v1.0 所有 Requirements 验收
/gsd:complete-milestone            # 归档（清除已完成 Phase 的 Context 负担）
/gsd:new-milestone "v2.0"          # 开始新周期

# Thread 持久化关键决策
/gsd:thread "api-contracts"        # 跨 Session 保留 API 约定
/gsd:thread "arch-decisions"       # 跨 Session 保留架构决策

# 跨 AI Review
/gsd:review --phase 07 --all       # 用 Codex / GitHub Copilot 做 Peer Review
```

**配置**：

| 维度 | L4 策略 |
|------|---------|
| GSD 命令 | 全部命令 + Workspace + Milestone 循环 + Thread |
| Research | Level 3（深度研究） |
| Plan Check | 开启 + 严格 8 维度验证 |
| Granularity | `fine` + 手动控制每个 PLAN.md ≤ 2 个任务 |
| Model Profile | `quality` 为主（L4 项目对质量的需求远超成本节约） |
| 驱动模式 | **Spec-Driven + Test-Driven + Review-Driven 三层** |
| State 管理 | Workspace 隔离 + Milestone 归档 + Thread 持久化 |
| Code Review | `/gsd:review` + Superpowers code-reviewer + 人工 Review |
| 质量保障 | Nyquist Validation + TDD + CI/CD + 跨 AI Peer Review |

---

## 三、为什么 GSD 没有 Code Review 节点？

这是理解 GSD 设计哲学的关键问题。

### 3.1 GSD 的设计选择：验证优于审查

GSD 的五步循环是：`discuss → plan → execute → verify → ship`。注意 **verify**（验证）不等于 **review**（审查）：

| 维度 | Verify（GSD 内置） | Code Review（GSD 缺失） |
|------|---------------------|------------------------|
| 关注点 | **功能是否正确交付** | **代码质量是否达标** |
| 检查对象 | 需求 → 交付物的映射 | 代码风格、架构、可维护性 |
| 执行者 | GSD Verifier Agent | 需要外部工具 |
| 时机 | Phase 完成后 | 代码提交前/后 |

GSD 的创建者做了一个明确的**关注点分离**决策：

> **GSD 管"做对的事"（Do the Right Thing），不管"把事做对"（Do the Thing Right）。**

- GSD 保证：你写的代码**解决了正确的问题**（Spec → Implementation → Verification 的闭环）
- GSD 不保证：你写的代码**质量足够高**（命名规范、架构整洁、性能优化）

### 3.2 技术原因：Context 预算分配

Code Review 需要**同时**看到：
1. 被 Review 的代码（可能很长）
2. 相关的上下文代码（依赖、调用方）
3. 项目的编码规范和架构约定
4. Spec 中的原始需求（判断是否过度实现）

这四块信息量很大。如果 GSD 把 Code Review 做进 Executor 或 Verifier 的 Context 中，会严重挤占它们的核心工作所需的 Context 预算。

GSD 的选择是：**把 Code Review 推给外部工具，保持自身的 Context 精简**。

### 3.3 实践方案：GSD + Superpowers 的 Review 分工

```
┌──────────────────────────────────────────────────────┐
│  GSD 内部                                             │
│  ┌────────┐   ┌────────┐   ┌─────────┐   ┌────────┐ │
│  │Discuss │ → │ Plan   │ → │Execute  │ → │Verify  │ │
│  └────────┘   └────────┘   └─────────┘   └────────┘ │
│                                  │                    │
│                                  ↓                    │
│                          Superpowers TDD              │
│                         （微观代码质量）               │
└──────────────────────────────────────────────────────┘
                                  ↓
┌──────────────────────────────────────────────────────┐
│  GSD 外部（Ship 之前）                                │
│  ┌────────────────┐   ┌───────────────────────┐      │
│  │/gsd:review     │   │Superpowers            │      │
│  │ (跨 AI Review) │   │ code-reviewer          │      │
│  └────────────────┘   └───────────────────────┘      │
│  ┌────────────────┐                                   │
│  │ 人工 Code Review│ ← L3/L4 项目必须                  │
│  └────────────────┘                                   │
└──────────────────────────────────────────────────────┘
```

- **L1**：不需要 Review，跑通即可
- **L2**：`/gsd:review` 做一轮跨 AI 审查即可
- **L3**：`/gsd:review` + Superpowers code-reviewer + 人工抽检关键模块
- **L4**：三层全开 + CI/CD 自动化 Review + 跨团队人工 Review

### 3.4 `/gsd:review` 的定位

`/gsd:review` 是 GSD v2 新增的命令，但它本质上是一个**外挂**而非核心循环的一部分：

- 它调用外部 AI（Codex、GitHub Copilot）做 Peer Review
- 不在 verify-work 之后自动触发，需要手动调用
- 输出的是 Review 报告，不会自动生成修复 Plan

这进一步印证了 GSD 的设计哲学：**Review 是可选的质量增强，不是必需的交付门控**。

---

## 四、规模策略速查表

| 维度 | L1 简单 | L2 一般 | L3 复杂 | L4 超大规模 |
|------|---------|---------|---------|-------------|
| **入口命令** | `/gsd:fast` | `/gsd:new-project` | `/gsd:map-codebase` + `new-project` | `new-workspace` + `new-project` |
| **Phase 数** | 0-1 | 3-8 | 8-20 | 20+ / 多 Milestone |
| **Granularity** | — | standard | fine | fine + 手动控制 |
| **Research Level** | 0 | 1-2 | 2-3 | 3 |
| **Plan Check** | 关闭 | 开启 | 开启 + 3 轮 | 开启 + 严格 |
| **Model Profile** | budget | balanced | 混合（per-phase） | quality 为主 |
| **驱动模式** | Prompt | Spec-Driven | Spec + TDD | Spec + TDD + Review |
| **Context 策略** | 单窗口 | Subagent 隔离 | Subagent + Workstream | Workspace + Milestone 归档 + Thread |
| **Code Review** | 无 | `/gsd:review` | review + Superpowers + 人工 | 三层全开 + CI/CD |
| **Gap Closure** | 直接修 | L1 Fix | L1-L3 Fix | L1-L3 + 跨团队协调 |
| **GSD 充分性** | ✅ 完全够用 | ✅ 完全够用 | ⚠️ 需要 Superpowers 补偿 | 🔴 需要外部 Selection Layer |

---

## 五、实践建议

### 5.1 规模升级信号

当出现以下信号时，应考虑升级到下一级策略：

- **L1 → L2**：发现需要"先想清楚再写"，单次 Prompt 无法覆盖全部需求
- **L2 → L3**：Phase 间出现频繁的依赖冲突；verify-work 失败率 > 30%；需要 Brownfield 分析
- **L3 → L4**：Milestone 内 Phase 数 > 15；Planning Context 超过 100K tokens；多人/多仓库协作

### 5.2 规模降级信号

过度仪式化同样有害：

- **L3 → L2**：所有 Phase 一次通过 verify，Research 结果几乎未被引用
- **L2 → L1**：整个项目只有 1-2 个 Phase，discuss 阶段没有需要澄清的问题
- **通用**：Token 开销 > 实际代码量的 5 倍时，考虑降级

### 5.3 GSD 的边界认知

GSD 不是万能的：

1. **GSD 不管代码质量**——需要 Superpowers TDD + Code Reviewer 补偿
2. **GSD 不管 Context Selection**——L4 项目需要外挂 Router / MCP / Skill Runtime
3. **GSD 不管运维部署**——需要 CI/CD + IaC 工具链补偿
4. **GSD 是单人框架**——多人协作需要 Git 工作流 + PR 流程补偿

理解这些边界，才能在正确的规模层级上选择正确的工具组合。

---

## 六、规模是动态的——Workflow 渐进式变迁策略

项目规模不是立项时一锤定音的。一个 L1 脚本可能长成 L3 平台，一个看似 L3 的项目可能在架构澄清后发现只需 L2 就够。**在错误的规模层级上坚持错误的 Workflow，比选错技术栈更致命**——因为它决定了你和 AI 的协作效率。

### 6.1 为什么规模会漂移？

| 漂移方向 | 典型触发场景 |
|----------|-------------|
| **向上漂移**（更常见） | 需求蔓延（"加个管理后台"）；集成复杂度被低估；从 MVP 到生产级的跨越 |
| **向下漂移** | 技术选型后大量复用现有库；需求澄清后砍掉 60% 功能；架构重构后模块解耦 |

**关键认知**：规模漂移不是失败，是正常的项目演化。问题不在于漂移本身，而在于**Workflow 没有跟着漂移**。

### 6.2 变迁触发器——何时该动？

不要等到 Context Rot 已经严重到无法工作才升级。以下是可量化的早期信号：

**L1 → L2 触发器**：

| 信号 | 检测方式 | 阈值 |
|------|----------|------|
| 单次 Prompt 拆成多轮 | 你开始说"接着上次" | 连续 3 次 |
| 需要回看之前的决策 | 你在翻聊天记录 | 出现即触发 |
| 文件数超出预期 | `ls \| wc -l` | > 5 个文件 |

**变迁操作**：

```bash
# 从裸 Claude Code 迁入 GSD
/gsd:new-project                    # 初始化 .planning/ 目录
# GSD 会交互式提问，把你脑中的隐性知识固化到 PROJECT.md + REQUIREMENTS.md
# 已有代码不需要重写——GSD 管的是 State，不是 Code
```

**L2 → L3 触发器**：

| 信号 | 检测方式 | 阈值 |
|------|----------|------|
| verify-work 失败率升高 | UAT.md 中 No 的比例 | > 30% |
| Phase 间依赖冲突 | execute 时报错引用不存在的模块 | 连续 2 个 Phase |
| Plan 越写越大 | 单个 PLAN.md 任务数 | > 5 个任务 |
| 需要理解现有代码才能继续 | discuss-phase 问的全是"现有代码怎么做的" | 出现即触发 |

**变迁操作**：

```bash
# Step 1: 扫描现有代码，补全 Brownfield 信息
/gsd:map-codebase                   # → STACK.md, ARCHITECTURE.md, CONVENTIONS.md, CONCERNS.md

# Step 2: 调整配置
/gsd:settings
# granularity: standard → fine
# workflow.research: true（如果之前关了）
# model profile: balanced → 关键 phase 用 quality

# Step 3: 引入 Superpowers TDD（如果还没用）
# 在 CLAUDE.md 或 .cursorrules 中加入 Superpowers 集成指令

# Step 4: 对当前 Phase 重新规划（不需要从头来）
/gsd:plan-phase <当前N> --reviews   # 用 fine 粒度重新拆分

# Step 5: 建立 Code Review 节点
# 在每个 Phase 的 verify 之后加一步：
/gsd:review --phase <N>
```

**L3 → L4 触发器**：

| 信号 | 检测方式 | 阈值 |
|------|----------|------|
| Planning 阶段 AI 变"笨" | plan-phase 遗漏明显需求 | Plan Check 连续 3 轮仍不过 |
| `.planning/` 目录膨胀 | `du -sh .planning/` | > 500KB |
| Session 恢复变慢 | `/gsd:resume-work` 耗时 | 肉眼可感的延迟 |
| 多人需要同时工作 | 团队 > 1 人 | 出现即触发 |
| Milestone 内 Phase 失控 | ROADMAP.md 中的 Phase 数 | > 15 |

**变迁操作**：

```bash
# Step 1: 立即归档当前进度——这是最关键的一步
/gsd:complete-milestone             # 归档已完成内容，释放 Context 负担

# Step 2: 建立 Milestone 节奏
/gsd:new-milestone "v2.0"          # 新 Milestone ≤ 8 Phase

# Step 3: 用 Workspace 隔离子系统（如果是多仓库）
/gsd:new-workspace                  # 独立 Worktree

# Step 4: 建立 Thread 持久化关键决策
/gsd:thread "api-contracts"         # API 约定跨 Session 留存
/gsd:thread "arch-decisions"        # 架构决策跨 Session 留存
/gsd:thread "tech-debt"             # 技术债务记录

# Step 5: 对未完成的 Phase 按新粒度重新拆分
/gsd:plan-milestone-gaps            # 识别未交付的 Requirements
# 手动将大 Phase 拆为多个小 Phase
/gsd:insert-phase <N>              # 插入拆分后的新 Phase
```

### 6.3 变迁原则——平滑迁移而非推倒重来

**原则一：只变 Workflow，不变 Code**

GSD 的状态全部在 `.planning/` 目录中，代码本身不受影响。从 L2 升级到 L3 不需要重构代码，只需要：
- 调整 `config.json` 中的粒度和研究级别
- 补全缺失的 State 文件（如 Brownfield 扫描结果）
- 引入新的质量保障工具（Superpowers TDD、Code Review）

**原则二：向前变迁，不回溯已完成的 Phase**

已经 verify 通过的 Phase 不需要用新策略重新执行。变迁只影响**当前和未来的 Phase**：

```
Phase 01 ✅ (L2 策略完成)
Phase 02 ✅ (L2 策略完成)
Phase 03 🔄 ← 发现需要升级到 L3
  ↓ 变迁点：从这里开始用 L3 策略
Phase 03 (重新 plan，用 fine 粒度)
Phase 04 (L3 策略)
Phase 05 (L3 策略)
```

**原则三：先加监控，后改流程**

不确定是否需要升级时，先加一些轻量级的监控手段：

```bash
/gsd:stats                          # 查看项目统计仪表盘
/gsd:health                         # 检查 .planning/ 完整性
/gsd:audit-uat                      # 验证债务追踪
/gsd:list-phase-assumptions <N>     # 查看 Claude 的假设（假设越多 = 信息越不足 = 可能需要升级）
```

如果这些指标正常，就不需要升级。**过早升级和过晚升级都有害**。

**原则四：Milestone 是天然的变迁窗口**

Milestone 切换是最佳的 Workflow 变迁时机：

```
Milestone v1.0 (L2 策略)
  Phase 01-08 → complete-milestone → 归档
                                      ↓
Milestone v2.0 (升级到 L3 策略)       ← 干净的起点
  /gsd:map-codebase                   ← 扫描 v1.0 的成果
  /gsd:new-milestone "v2.0"
  config: granularity=fine, profile=mixed
```

在 Milestone 边界变迁的好处：
- `.planning/` 中的已完成 Phase 已归档，不会污染新策略
- 可以重新评估 REQUIREMENTS.md，砍掉不再需要的功能
- 团队可以在回顾会上对齐新的协作模式

### 6.4 变迁路径全景图

```
L1 ─── /gsd:new-project ──→ L2 ─── map-codebase + fine ──→ L3 ─── complete-milestone ──→ L4
       (加入 State)              (加入 Research/TDD)             (加入 Workspace/Thread)
                                                                          │
  ↑                          ↑                            ↑               │
  └── 降级：删 .planning/ ──┘── 降级：standard + budget ──┘               │
                                                                          │
                                                      ┌──────────────────┘
                                                      ↓
                                              超出 GSD 边界？
                                              加入 Selection Layer
                                              (MCP + Router + Skill Runtime)
```

### 6.5 反模式：常见的变迁错误

| 反模式 | 症状 | 正确做法 |
|--------|------|----------|
| **推倒重来** | "我们从 L1 升到 L3，把代码全部重写" | 只变 Workflow，不变 Code |
| **恐惧升级** | "GSD 太重了，还是手动 Prompt 吧" | L1→L2 的成本极低，只需 `new-project` 一条命令 |
| **跳级升级** | 直接从 L1 跳到 L4 | 每次只升一级，让团队适应新流程 |
| **不降级** | 项目已简化但仍跑 L3 全流程 | Token 开销 > 5x 代码量时果断降级 |
| **Phase 中途变迁** | 在 execute-phase 执行到一半时改策略 | 完成当前 Phase 的 verify 后再变迁 |
| **只升工具不升认知** | 加了 Superpowers 但不写测试 | 每次升级配套一轮团队/个人学习 |

---

## 七、关联阅读

- [[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移]]——四层架构与 Granularity Layer
- [[Vibe Coding系列02：架构师视角的AI Harness Engineering最佳实践]]——State Layer 与 Harness Engineering
- [[Vibe Coding系列04：流程框架选择指南——GSD、SpecKit、OpenSpec与Superpowers的组合实践]]——GSD 与其他框架的组合实践
