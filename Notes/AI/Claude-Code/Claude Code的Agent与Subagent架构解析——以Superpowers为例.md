---
title: Claude Code 的 Agent 与 Subagent 架构解析——以 Superpowers 为例
created: 2026-03-15
tags: [AI, claude-code, agent, subagent, superpowers, vibe-coding, architecture]
---

# Claude Code 的 Agent 与 Subagent 架构解析——以 Superpowers 为例

## 一句话结论

Claude Code 里 **agent 和 subagent 是同一个东西的两面**——在 `.claude/agents/` 目录定义时叫 "agent"，被 `Agent` 工具调用运行时叫 "subagent"。没有两个独立概念。

---

## 1. 定义与运行

### 文件系统：`agents/` 目录

```
.claude/agents/          ← 项目级
~/.claude/agents/        ← 用户级
插件目录/agents/          ← 插件级（如 Superpowers）
```

每个 `.md` 文件 = 一个 agent 定义，格式统一：

```markdown
---
name: my-reviewer
description: |
  当代码审查需要时使用这个 agent...
model: sonnet
tools: [Read, Grep, Glob]        # 可选：限制可用工具
isolation: worktree               # 可选：git worktree 隔离
background: true                  # 可选：后台运行
memory: project                   # 可选：持久记忆
---

你是一个高级代码审查员...（这段 markdown 成为 subagent 的 system prompt）
```

### 运行时：Agent 工具调用

```
主 session 调用：
  Agent(subagent_type="my-reviewer", prompt="审查 auth 模块")

等价于启动一个 subagent：
  - 全新 context window
  - system prompt = my-reviewer.md 的 markdown body
  - 初始 user message = prompt 参数的内容
```

### 四个来源，统一机制

| 优先级 | 来源 | 说明 |
|---|---|---|
| 1（最高） | `--agents` CLI 参数 | 临时的 session 级别 |
| 2 | `.claude/agents/*.md` | 项目级 |
| 3 | `~/.claude/agents/*.md` | 用户级 |
| 4（最低） | 插件 `agents/*.md` | 如 Superpowers 的 `code-reviewer` |

同名时高优先级覆盖低优先级。

---

## 2. Context 隔离——这是最关键的架构决策

### 核心事实：Context 完全隔离，不可配置为共享

```
主 Session 的 Context Window          Subagent 的 Context Window
┌──────────────────────────┐      ┌──────────────────────────┐
│ 完整 Claude Code 系统提示   │      │ agent .md 的 markdown body│
│ 用户对话历史               │      │ （不含主 session 的系统提示）│
│ 工具调用记录               │  ──→ │ CLAUDE.md（重新加载）       │
│ CLAUDE.md                │ 仅传  │ prompt 参数（task 描述）    │
│ MCP servers              │ prompt│                          │
│ ...                      │      │ ❌ 无对话历史              │
└──────────────────────────┘      │ ❌ 无主 session 上下文     │
         ↑                        └──────────────────────────┘
         │                                    │
         └────── 仅返回最终摘要文本 ──────────────┘
```

**具体来说，subagent 启动时拿到的 context：**

| 内容 | 是否包含 |
|---|---|
| 自己的 system prompt（.md body） | ✅ |
| 项目的 CLAUDE.md | ✅ 重新加载 |
| 基本环境信息（工作目录等） | ✅ |
| parent 传入的 prompt | ✅ |
| parent 的对话历史 | ❌ 完全没有 |
| parent 的系统提示 | ❌ 完全没有 |
| parent 的工具调用记录 | ❌ 完全没有 |
| parent 的 Skill 内容 | ❌ 需在 frontmatter 中显式声明 `skills` |

**subagent 返回时，parent 拿到的：**

| 内容 | 说明 |
|---|---|
| 最终摘要文本 | subagent 的 last assistant message |
| agent ID | 用于后续 resume |
| ❌ 中间过程 | 不进入 parent context |

### 为什么不可共享 context？

这是 **刻意的架构决策**，不是缺陷：

1. **保护主 session 的 context window**。如果 subagent 的所有中间工具调用、文件读取、推理过程都回灌到主 session，context 会迅速爆满
2. **保证 subagent 的专注性**。没有历史包袱，subagent 只看到它需要看到的东西
3. **支持并行**。多个 subagent 不会互相污染 context

### 唯一的 context 注入手段：Hook

通过 `SubagentStart` hook，可以在 subagent 启动时注入额外 context：

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SubagentStart",
    "additionalContext": "遵循安全审计规范..."
  }
}
```

但这是 **一次性注入**，不是持续共享。

### 持久记忆：memory 字段

`memory` 字段提供跨 session 的持久化，但不是实时共享：

| scope | 路径 | 用途 |
|---|---|---|
| `user` | `~/.claude/agent-memory/<name>/` | 跨项目学习 |
| `project` | `.claude/agent-memory/<name>/` | 项目级记忆 |
| `local` | `.claude/agent-memory-local/<name>/` | 不入版本控制 |

两个同名 subagent 会读写同一个 memory 目录，但不同名的 subagent 之间没有共享机制。

---

## 3. 以 Superpowers 为例：Subagent 的三种角色

Superpowers 的 `subagent-driven-development` skill 定义了三种 subagent 角色，但只有一个是自定义 agent 定义：

### 实际结构

```
superpowers/
  agents/
    code-reviewer.md              ← 唯一的自定义 agent 定义
  skills/
    subagent-driven-development/
      SKILL.md                    ← 指导主 agent 的 Markdown 指令
      implementer-prompt.md       ← prompt 模板（不是 agent 定义）
      spec-reviewer-prompt.md     ← prompt 模板（不是 agent 定义）
      code-quality-reviewer-prompt.md  ← prompt 模板
```

### 三种角色的调用方式

| 角色 | 实现方式 | 为什么 |
|---|---|---|
| **implementer** | `Agent(subagent_type="general-purpose", prompt=填好的模板)` | 每个 task 的 prompt 不同，必须动态生成 |
| **spec-reviewer** | `Agent(subagent_type="general-purpose", prompt=填好的模板)` | 同上 |
| **code-reviewer** | `Agent(subagent_type="superpowers:code-reviewer")` | prompt 相对固定，可以做成 agent 定义 |

### 驱动机制

整个 Superpowers **没有一行可执行代码**，纯粹是 prompt engineering：

```
SKILL.md 加载到主 agent context
  → 主 agent 读到："为每个 task 用 Agent 工具派发 subagent"
    → 主 agent 读取 implementer-prompt.md
      → 填入 task 具体内容
        → 调用 Agent(subagent_type="general-purpose", prompt="...")
          → Claude Code 平台创建新 context window
            → subagent 独立执行
              → 返回摘要给主 agent
```

**prompt 模板中写明了调用方式：**

```markdown
# implementer-prompt.md
Task tool (general-purpose):
  description: "Implement Task N: [task name]"
  prompt: |
    You are implementing Task N...
```

这里的 `Task tool (general-purpose)` 就是告诉主 agent：用 `Agent` 工具，类型选 `general-purpose`。

---

## 4. Vibe Coding 与 Subagent 模式的真实关系

### Vibe Coding 就是一个人

Vibe Coding 的本质是：**一个人 + AI，通过自然语言描述需求，AI 生成代码**。不存在"多人"的场景。

所谓"多 agent"不是"多人"，而是 **一个人指挥多个 AI 角色**：

```
你（一个人）
  └── 主 Claude Code session
        ├── implementer subagent（角色：写代码的）
        ├── reviewer subagent（角色：审代码的）
        └── debugger subagent（角色：调 bug 的）
```

这些全是 AI 角色。"多 agent"是 AI 内部的分工，不是人的分工。

### "大项目"的真正挑战不是人多，而是 Context 不够

在 Vibe Coding 中，"大项目"的困难来自：

| 挑战 | 根因 |
|---|---|
| 单次 context window 装不下全部代码 | token 限制（200K） |
| AI 改一个地方忘了另一个地方 | context 丢失 |
| 改 A 模块影响了 B 模块 | 缺乏全局视野 |

Superpowers 的 subagent 模式试图用 **"缩小每个 agent 的关注范围"** 来解决这个问题。

### 但 Subagent 模式的代价很高

| 问题 | 说明 |
|---|---|
| **Context 完全断裂** | 每个 subagent 不知道其他 subagent 做了什么 |
| **需要极其详细的 Plan** | 因为 subagent 没有上下文，所以 plan 必须写到代码级别 |
| **Plan 生成消耗大量 token** | 光写 plan 就要消耗大量 context |
| **协调开销** | 主 agent 需要大量精力协调多个 subagent 的结果 |
| **文件冲突风险** | 多个 subagent 同时改同一个文件会冲突（除非用 worktree） |

---

## 5. Subagent 模式 vs Git Worktree：哪个才是正确答案？

### 先搞清楚：这两个不是同一层面的东西

```
Subagent = context 隔离（AI 的注意力怎么分配）
Worktree = 文件系统隔离（代码怎么不冲突）
```

它们可以组合使用：

| 组合 | 含义 |
|---|---|
| Subagent + 无 worktree | context 隔离，但共享文件系统（有冲突风险） |
| Subagent + worktree | context 隔离 + 文件隔离（最安全） |
| 无 Subagent + worktree | 主 session 在 worktree 中工作（常规分支开发） |

### Claude Code 原生支持 `isolation: "worktree"`

在 Agent 工具或 agent frontmatter 中设置：

```yaml
---
name: feature-builder
isolation: worktree
---
```

效果：
1. 启动时自动 `git worktree add` 创建隔离副本
2. subagent 在副本中工作，不影响主分支
3. 完成后无变更则自动清理，有变更则保留

### Superpowers 的 `using-git-worktrees` skill 是什么？

是一个 **纯 prompt 指令**，教主 agent 手动执行 `git worktree add/remove`。和 Claude Code 原生的 `isolation: worktree` 相比：

| 维度 | 原生 `isolation: worktree` | Superpowers skill |
|---|---|---|
| 实现 | Claude Code 平台自动执行 | prompt 指导 agent 手动执行 |
| 生命周期管理 | 自动创建/清理 | 需要 agent 自己记得清理 |
| 与 subagent 集成 | 原生集成 | 需要配合其他 skill |
| 可靠性 | 高（平台保证） | 中（依赖 AI 正确执行） |

### 所以，"大项目"到底该怎么做？

**我的观点：对于 Vibe Coding（一个人 + AI），subagent 模式大多数情况下是 over-engineering。**

原因：

```
Subagent 模式的前提假设：
  "执行 agent 很弱，需要极其详细的指令"

Vibe Coding 的现实：
  "你在用 Opus/Sonnet 这种强模型，它完全能理解高层需求"
```

**更合理的分层策略：**

| 项目规模 | 推荐方式 | 原因 |
|---|---|---|
| 小（<10 文件） | 直接 coding | 强模型一个 context 搞定 |
| 中（10-50 文件） | worktree 分支隔离 + 强模型直接 coding | 用 worktree 保护主分支，但不需要拆 subagent |
| 大（50+ 文件） | OpenSpec delta + worktree | 用 spec delta 描述要改什么（需求级），用 worktree 隔离改动，强模型直接实现 |
| 超大 / 多模块 | 按模块分 worktree + 每模块一个 session | 每个模块独立 session，各有自己的 context |

### 关键洞察：真正解决"大项目"问题的不是 subagent，而是好的 spec

```
❌ 大项目 → 拆成 subagent → 每个 subagent 执行详细 plan
   问题：plan 太重、context 断裂、协调复杂

✅ 大项目 → 用 OpenSpec 管理需求 → 每次 delta 聚焦一个变更 → 强模型直接实现
   优势：context 友好、人可 review、增量可控
```

OpenSpec delta 的方式把"大项目"变成了一系列"小变更"，每个小变更都在强模型的 context 能力范围内。这比拆 subagent 更务实。

---

## 6. 什么时候 Subagent 模式才真正有价值？

### 场景一：真正需要并行的独立任务

```
3 个测试文件同时失败，原因各不相同
  → 并行派发 3 个 subagent，各修各的
  → 用 worktree 隔离避免冲突
```

这是 Superpowers 的 `dispatching-parallel-agents` skill 的正确使用场景。

### 场景二：需要不同"人格"的 AI 角色

```
写代码的 agent → 自由发挥
审代码的 agent → 严格审查（有"不信任 implementer 报告"的 system prompt）
```

Superpowers 的 spec-reviewer prompt 中有一段很精彩的设计：

> **CRITICAL: Do Not Trust the Report**
> The implementer finished suspiciously quickly. Their report may be incomplete, inaccurate, or optimistic. You MUST verify everything independently.

这种"角色对抗"只能通过 subagent 的 context 隔离实现——如果在同一个 context 里，AI 不会"不信任自己"。

### 场景三：降低成本的混合模型策略

```
设计/审查 → Opus（贵但强）
机械实现 → Haiku（便宜且快）
```

通过 subagent 的 `model` 字段可以为不同角色指定不同模型，这在大量 task 时能显著降低成本。

---

## 7. 总结：一张图看清全貌

```
┌─────────────────────────────────────────────────────────────────┐
│                    你（Vibe Coding，一个人）                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  主 Claude Code  │
                    │   Session       │
                    │ (唯一的顶层 agent)│
                    └───┬────┬────┬──┘
                        │    │    │
            ┌───────────┘    │    └───────────┐
            ▼                ▼                ▼
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │  Subagent A   │  │  Subagent B   │  │  Subagent C   │
   │ (implementer) │  │ (reviewer)    │  │ (debugger)    │
   │               │  │               │  │               │
   │ 独立 context   │  │ 独立 context   │  │ 独立 context   │
   │ ❌ 不能嵌套     │  │ ❌ 不能嵌套     │  │ ❌ 不能嵌套     │
   │ ❌ 不共享状态   │  │ ❌ 不共享状态   │  │ ❌ 不共享状态   │
   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
          │                 │                 │
          │    可选：isolation: worktree       │
          │    每个 subagent 有独立的文件副本     │
          └─────────────────┴─────────────────┘
```

### 核心 Takeaways

1. **Agent = Subagent**，同一个东西的两面。没有 `.claude/subagents/` 目录。
2. **Context 完全隔离，不可配置为共享**。这是刻意的架构决策，不是缺陷。
3. **Vibe Coding 是一个人** + 多个 AI 角色，不存在"多人"场景。
4. **"大项目"的真正解法不是 subagent，而是好的需求管理**（OpenSpec delta）。
5. **Subagent 的真正价值**：并行独立任务、角色对抗（reviewer 不信任 coder）、混合模型降成本。
6. **Worktree 是文件隔离，Subagent 是 context 隔离**，两者正交，可组合使用。
7. **对于强模型 + 单人的 Vibe Coding，直接用强模型 + OpenSpec delta + worktree 分支隔离，比 subagent 模式更务实。**

---

## 参考资料

- Claude Code Subagents 文档：[sub-agents.md](https://code.claude.com/docs/en/sub-agents.md)
- Claude Code Hooks 文档：[hooks.md](https://code.claude.com/docs/en/hooks.md)
- Superpowers GitHub：[obra/superpowers](https://github.com/obra/superpowers)
- Superpowers subagent-driven-development Skill 源码：[SKILL.md](https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/SKILL.md)
- 相关文章：[[Vibe Coding系列03：AI-Native开发实践——从Figma设计到Superpowers Brainstorm再到Spec-Delta工作流]]
