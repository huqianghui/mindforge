---
title: Spec Kit系列01：初步整体认识——SDD十命令工作流、Scope粒度与协作扩展
created: 2026-07-20
tags:
  - AI
  - spec-kit
  - SDD
  - vibe-coding
  - coding-agent
---

# Spec Kit系列01：初步整体认识——SDD十命令工作流、Scope粒度与协作扩展

> 本文是 Spec Kit 系列的第一篇，目标是建立对 [github/spec-kit](https://github.com/github/spec-kit) 的整体认识：它的工作流设计、关键机制（Constitution、Active Feature）、Scope 与 Task 的粒度判断，以及面向团队协作的扩展（Worktree 并行、taskstoissues）。内容基于与 ChatGPT 的深入讨论整理，关键机制已对照 spec-kit 官方仓库源码验证。后续系列会与 GSD、OpenSpec、Superpowers 等开源框架做横向比较（框架组合选型可先参考 [[Vibe Coding系列04：流程框架选择指南——GSD、SpecKit、OpenSpec与Superpowers的组合实践]]）。

## 一、Spec Kit 是什么：把 AI Coding 从一句 Prompt 变成结构化流程

Spec Kit 是 GitHub 官方的 **Spec-Driven Development（SDD，规格驱动开发）** 工具包。它的核心主张是：不要让模型在一次对话中同时完成需求分析、架构设计和编码，而是把 AI Coding Agent 的工作拆成多个阶段，每个阶段有明确的输入、输出和检查点。

```text
Idea → specify（需求）→ plan（设计）→ tasks（拆解）→ implement（编码）→ converge（收敛）
```

它的价值不在于更强的代码生成能力，而在于**将 Agent 的工作流程结构化**——先明确需求，再设计方案，再拆解任务，最后实现并验证。这种分阶段流程能减少上下文混乱、降低需求漂移，本质上是一种 Harness 工程实践（参见 [[Vibe Coding系列01：全面系统的了解Harness Engineering的来龙去脉]]）。

Spec Kit 是 **Agent 无关（agent-agnostic）** 的：同一套 `/speckit.*` 命令可以在 Claude Code、Cursor、Codex、Gemini CLI 等不同 Agent 中使用，所有状态都落在项目目录的 `.specify/` 和 `specs/` 中，不绑定任何一家的记忆机制。

## 二、完整工作流：十个命令、四个阶段

最初的主线是五个命令，当前版本扩展为十个，多出来的部分都是**编码前的质量门（Quality Gates）**。按软件工程生命周期分为四个阶段：

```text
Governance（治理，项目级，一次）
    constitution
Design（设计，Feature 级）
    specify → clarify → plan
Verification（验证，Feature 级）
    checklist → tasks → analyze
Execution（执行，Feature 级）
    implement → converge（→ taskstoissues 可选）
```

| 命令 | 核心问题 | 输出 | 软件工程对应 |
|------|----------|------|--------------|
| `/speckit.constitution` | 项目必须遵守什么？ | `.specify/memory/constitution.md` | Engineering Principles / Governance |
| `/speckit.specify` | 要做什么？（What） | `specs/NNN-feature/spec.md` | Requirements / PRD |
| `/speckit.clarify` | 有没有歧义？ | 更新 `spec.md` | Requirements Review |
| `/speckit.plan` | 怎么做？（How） | `plan.md` | Architecture / Technical Design |
| `/speckit.checklist` | 需求是否完整、可验证？ | `checklist.md` | Requirements QA |
| `/speckit.tasks` | 如何拆解执行？ | `tasks.md` | WBS / Sprint Planning |
| `/speckit.analyze` | 文档之间是否一致？ | 分析报告 | Design Review / Traceability |
| `/speckit.implement` | 按任务实现 | 源代码 + 任务状态 | Development |
| `/speckit.converge` | 代码与需求最终一致？ | 追加遗漏任务 | Gap Analysis / Definition of Done |
| `/speckit.taskstoissues` | 任务如何分发给团队？ | GitHub Issues | Sprint Planning（可选） |

几个容易误解的命令值得单独说明。

### checklist：需求文档的单元测试

`checklist` 检查的不是代码，而是 **Spec 本身的质量**——官方称之为 "Unit tests for English"。它会生成 Security / Accessibility / Performance 等维度的检查清单，验证需求有没有遗漏、矛盾或无法验证的表述。

### analyze vs converge：检查文档 vs 检查代码

这两个命令最容易混淆，区别在检查对象：

- **analyze**：跨工件一致性分析，对象是**文档**（Constitution / Spec / Plan / Tasks 四者是否一致）。比如 Constitution 要求必须写 Unit Test 而 Plan 里没有，或 Spec 要求 Dark Mode 而 Tasks 里没有对应任务——它在写代码之前发现这些断裂。**不写代码。**
- **converge**：对象是**代码 + 文档**。它比对 Spec/Plan/Tasks 与当前代码，发现"Spec 要求 Password Reset 但代码没实现"这类遗漏时，不直接写代码，而是把遗漏**追加为新任务**写回 `tasks.md`，然后你再跑 `implement`，循环直到没有剩余任务。

### converge 为什么不叫 coverage

`converge`（收敛）与 `coverage`（覆盖率）词源完全无关：converge = con-（一起）+ vergere（拉丁语"朝某方向弯曲"），即"汇聚、趋同"；coverage = cover + -age，即"覆盖范围"。Spec Kit 选 converge 是有意的——最后一步不是统计覆盖率指标，而是让 Spec、Plan、Tasks、Code 四者**不断迭代直到彼此一致、不再产生新差异**，这正是优化算法里"收敛"的含义。它强调的是一致性和终止状态（达到 Definition of Done），而非覆盖比例。

## 三、关键机制一：Constitution 是项目记忆，不是 Agent 记忆

`.specify/memory/constitution.md` 里的 "memory" 容易误导——它不是 LLM 的长期记忆，只是 Spec Kit 定义的**项目记忆文件**。它能否生效，完全依赖 `/speckit.*` 命令是否主动把它读进上下文：所有 speckit 命令都会加载 Constitution，但如果你跳过命令直接对 Agent 说 "Implement login API"，Agent 完全可能根本没看它。

官方不用 `AGENTS.md` / `CLAUDE.md` 承载 Constitution，是为了保持 agent-agnostic：换 Agent 不用迁移规则，所有命令统一读固定路径。但这带来一个实践问题——约束强度不同：

```text
Agent Rules（AGENTS.md / CLAUDE.md）   ← System Prompt 层，Agent 每次启动必读
─────────────────────────────────────
Constitution（.specify/memory/）       ← Workflow 层，只在 speckit 命令中生效
```

因此更稳健的做法是**分两层**：

- 永远必须遵守的硬规则（Always use uv / Never modify migrations manually / Always write tests）放 `AGENTS.md` 或 `CLAUDE.md`，保证即使有人跳过 speckit 流程直接改代码也生效；
- 项目治理层面的架构原则（DDD、CQRS、Observability、Accessibility、License 约束）放 Constitution，供 SDD 各阶段引用。

这个"约束放在哪一层就有哪一层的强制力"的问题，与 PKC 中 Memory 提权到 CLAUDE.md 的逻辑同构——需要的约束力超过所在层级能提供的约束力时，就是层级错配。

## 四、关键机制二：Active Feature——隐式的"当前工程"

Spec Kit 维护一个"当前 Active Feature"，后续命令不需要重复指定 Feature ID：

1. `/speckit.specify` 自动取下一个编号（如 `001-agent-chat`），创建 `specs/001-agent-chat/spec.md`，并把当前 Feature 记入 `.specify/feature.json`（键为 `feature_directory`，此机制已在官方仓库 `scripts/bash/common.sh` 源码中确认）；
2. 之后的 `plan` / `tasks` / `implement` 读取 feature.json，自动作用到当前 Feature；
3. 再次 `specify` 创建新 Feature 时，Active Feature 自动切换。

要回头修改旧 Feature，可以用环境变量显式指定：`SPECIFY_FEATURE=001-agent-chat`（源码中优先级高于 feature.json）。

这个设计像 IDE 的 Current Project——避免每条命令都带 Feature ID 导致 Agent 写错目录。但它也有隐忧：当项目积累到几十个 Feature 时，"当前到底在哪个 Feature"这个全局状态变得隐式，容易误操作。对大型团队而言，显式指定（Explicit Context）通常比依赖全局状态更安全、更利于自动化流水线——这是目前对 Spec Kit 的一点保留意见。

## 五、使用模型：Constitution 一次，Feature 循环

真实项目不是"一个项目走一轮流程就结束"，而是：

```text
Project
  constitution（一次，之后很少改）
  Feature 001: specify → clarify → plan → [checklist] → tasks → analyze → implement → converge
  Feature 002: （同上）
  Feature 003: （同上）
  ...
```

这正好匹配渐进式迭代开发（GSD 式的 Stage 划分）：一开始想不清所有功能，先做基础能力，再一个个叠加。每个新 Stage 带来**新的独立用户能力**时，就从新的 `/speckit.specify` 开始一轮；已完成的 Feature Spec 作为历史事实保留（类似 Git Commit，而不是不断覆盖的 PRD），`specs/` 目录越来越长是正常现象。

两种情况**不需要**重新 specify：

- **实现遗漏**（如 Auth 忘了 Refresh Token）：跑 `converge` 补任务再 `implement`；
- **纯技术变更**（如 Postgres 换 Cosmos DB，需求没变）：从 `plan` 开始改，Spec 不动。

实际使用频率也不均匀：constitution 一次，specify/clarify/plan 每 Feature 一次，tasks/analyze/implement/converge 高频，checklist 偶尔。

## 六、Scope 与 Task 粒度：最重要的实践判断

### 一个 Spec 应该多大

划分标准不是 "一个 Stage = 一个 Spec"，而是 **"一个 User Value = 一个 Spec"**。判断方法：这个功能拿掉后产品还能不能独立运行？Agent Chat 和 Agent Memory 是两个 Feature（没有 Memory 产品仍能跑）；用户登录和 OAuth 登录通常是一个 Feature（同一个用户价值）。

把 "Build Agent Platform" 整个塞进一个 Spec，会得到 80 页 spec.md 和 300 个 tasks，基本失控。正确的拆法是 `001-agent-chat`、`002-memory`、`003-rag`、`004-evaluation` 这样的独立 Feature——Spec Kit 的一个 Spec 对应 Jira 语境里的 **Feature，而不是 Epic**。

经验区间：一个 Spec 生成 **20~80 个 Tasks** 比较合理；少于 20 个可能只是 Bug Fix，超过 100 个大概率 Scope 太大该拆。时间上，一个 Spec 最好能在一个开发周期（几天到两周）内完成，并且完成后能向用户展示一个明确的新能力。

### 一个 Task 应该多大

Task 不是函数级步骤（"Create file / Add import"太细，那是 Agent 的执行 step），也不是完整系统（"Implement Complete RAG System"太粗，Context 会爆炸）。最准确的定义：

> **Task ≈ 一个可以独立验证、独立提交 PR 的技术工作单元**，通常涉及 1~5 个文件，约等于 30 分钟到 4 小时的人类开发量，或者说一次 Claude Code / Codex 能稳定完成的工作。

以 Voice Agent 为例，合理的拆分是 "Implement Speech Input Pipeline / Implement GPT-Realtime Session Manager / Implement Audio Streaming Layer / Implement VAD / Add Integration Tests" 这样的粒度。

## 七、协作扩展一：Spec Kit + Git Worktree 并行开发

单工作目录 + 多 Feature 切换，会让 Active Feature 状态混乱、Agent 上下文互相污染。Worktree 提供了天然映射：

> **一个 Feature 对应一个 Branch，一个 Branch 对应一个 Worktree，一个 Worktree 对应一个 Agent Session。**

```bash
git worktree add ../agent-memory feature/002-memory
git worktree add ../agent-rag feature/003-rag
```

每个 Worktree 有独立的 Git Branch、独立的 Agent Session、独立的 Active Feature；Terminal A 里的 Agent 只看 `002-memory`，Terminal B 只看 `003-rag`，互不干扰。对 Agent Coding 来说，这直接提高成功率——Agent 最怕的就是 Memory、RAG、Chat 三个任务的上下文混在同一个会话里（参见 [[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移]] 中的 Context 爆炸问题）。

一个关键纪律：**Spec 是共享设计资产，Code 是 Feature Branch 资产**。正确流程是 Spec 相关阶段（specify → clarify → plan → tasks）在主干完成并 commit，然后才创建 Branch + Worktree 进入 implement；如果让 Spec 和 Code 一起在多个 Worktree 里各自演化，最终 Spec 与实现会不一致，`specs/` 目录也会合并冲突。

```text
Constitution → Feature Spec → Analyze → Commit Spec
    → Create Branch → Create Worktree → Implement → Converge → PR
```

## 八、协作扩展二：taskstoissues——从本地任务到多 Agent Work Queue

[`/speckit.taskstoissues`](https://github.com/github/spec-kit/blob/main/templates/commands/taskstoissues.md) 是非主线命令：把 `tasks.md` 同步成 GitHub Issues。它不在 Core Workflow 里，因为一个 Agent 没有 GitHub 也能走完整个 SDD 流程——Tasks → Issues 属于项目管理，不是代码生成的必需步骤。

三种使用场景：

1. **单人开发：不用。** tasks.md → implement 足够，Issue 只增加维护成本；
2. **小团队（3~8 人）：推荐。** tasks → taskstoissues → Assign → Implement，接入 Milestone、Label、Project Board、Code Review 等 GitHub 项目管理体系；
3. **多 Agent 并行：最有价值。** 现在越来越多 Agent（GitHub Copilot Coding Agent、Devin、OpenHands、Codex）的工作模式是 "Issue → Agent → PR" 而不是 "Prompt → Agent"。此时 Issues 天然成为 **Work Queue**：Issue 51 分给 Claude、Issue 52 分给 Codex、Issue 53 分给 Copilot，最后统一 Merge。

结合 Worktree，可以形成完整的可追踪链路，一个 Task 成为从需求到交付的最小可追踪单元（Traceable Unit）：

```text
Spec → Tasks → GitHub Issue → Branch → Worktree → Agent Session → PR
```

简单说：**implement 适合"一个 Agent 一次性完成整个 Feature"，taskstoissues 适合"多人或多 Agent 协作、把 Feature 拆成可独立执行的工作项"**——企业团队中后者更贴合现有 GitHub 开发流程。这也是 Spec Kit 与 GitHub 原生工程体系（Issues、Projects、Actions、Copilot Coding Agent）衔接的关键节点。

## 九、安装：为什么推荐 uv

```bash
uv tool install specify-cli
```

`uv` 不是硬依赖——`pip` / `pipx` 也能装。推荐 `uv tool install` 的原因是 **Tool Isolation**：Spec Kit 是 CLI 工具（像 git / gh / kubectl），不是 Python library。`pip install` 会把它装进当前激活的环境（系统 Python、conda、项目 venv……删掉 venv 工具就没了）；`uv tool install` 则创建独立环境、只暴露 `~/.local/bin/specify` 可执行文件，与 `pipx` 理念一致。此外 `specify self upgrade` 会检测安装方式，uv tool 安装的升级路径最顺。这是工程实践上的推荐，不是技术上的硬性依赖。

## 十、小结与系列展望

Spec Kit 的整体认识可以压缩成四句话：

1. **流程结构化**：十命令四阶段，用 clarify / checklist / analyze 三个编码前质量门尽早发现歧义、遗漏和不一致，用 converge 保证 Spec 与 Code 最终收敛一致；
2. **状态显式化**：Constitution（项目原则）、spec/plan/tasks（Feature 工件）、feature.json（当前 Feature）全部落盘在项目目录，agent-agnostic；
3. **粒度纪律**：一个 User Value 一个 Spec（20~80 Tasks），一个 Task 一个可独立提 PR 的工作单元（1~5 文件）；
4. **协作放大**：Feature = Branch = Worktree = Agent Session 的并行模型，加上 taskstoissues 把 tasks 变成多 Agent Work Queue。

后续系列计划：与 GSD、OpenSpec、Superpowers 等开源流程框架的横向比较（定位差异、组合方式、适用场景），以及在实际项目中跑通完整 SDD 流程的实践记录。

## 参考

- [github/spec-kit 官方仓库](https://github.com/github/spec-kit)
- [taskstoissues 命令模板](https://github.com/github/spec-kit/blob/main/templates/commands/taskstoissues.md)
- [[Vibe Coding系列04：流程框架选择指南——GSD、SpecKit、OpenSpec与Superpowers的组合实践]]
- [[Vibe Coding系列01：全面系统的了解Harness Engineering的来龙去脉]]
