---
title: Claude Code 扩展三剑客：Command、Skill 与 Agent 的区别与协作
created: 2026-03-16
tags: [AI, claude-code, command, skill, agent, extension, architecture]
---

# Claude Code 扩展三剑客：Command、Skill 与 Agent 的区别与协作

Claude Code 的扩展体系由三个核心概念构成：**Command**、**Skill** 和 **Agent**。它们各有不同的定位和使用场景，但又可以相互配合形成完整的工作流。本文将深入解析三者的本质区别、配置方式、触发机制、权限模型，以及它们如何协作。

---

## 1. 三者的定义与本质区别

### Command：快捷入口

Command 是一个 **prompt 模板**，本质上是为"常见操作"提供一个快捷入口。用户在 Claude Code 中输入 `/command-name` 即可触发，`$ARGUMENTS` 占位符会被用户输入的参数替换后，作为 prompt 发送给当前 session。

**核心特征**：

- 不改变当前 session 的行为模式
- 不创建新的 context window
- 只是一段 prompt 的快捷方式
- 运行在主 session 的 context 中，共享所有对话历史和工具权限

### Skill：知识注入

Skill 是一段 **领域知识和行为指导**，以 Markdown 文件的形式存在。当 Claude Code 判断当前任务与某个 Skill 相关时，会自动将该 Skill 的内容加载到 context 中，指导 AI 的行为方式。

**核心特征**：

- 被动触发，AI 根据 `description` 判断是否需要加载
- 注入的是"知识"和"行为规范"，不是简单的 prompt
- 可以包含工作流、模板引用、脚本调用
- 通过 plugin 机制支持分发和生态共建

### Agent：独立角色

Agent 是一个 **独立的 AI 角色定义**，拥有自己的 system prompt、可用工具列表、隔离策略等。被调用时会启动一个全新的 context window（即 subagent），独立完成任务后将结果摘要返回给主 session。

**核心特征**：

- 拥有独立的 context window，与主 session 完全隔离
- 可以限制工具权限（只给 Read/Grep，不给 Write/Bash）
- 可以指定不同的模型（Opus/Sonnet/Haiku）
- 支持 worktree 文件隔离和持久记忆

---

## 2. 一张表看清三者的区别

| 维度 | Command | Skill | Agent |
|---|---|---|---|
| **本质** | Prompt 模板 | 知识/行为注入 | 独立 AI 角色 |
| **存放路径** | `.claude/commands/` | `~/.claude/skills/`、插件 `skills/` | `.claude/agents/`、`~/.claude/agents/` |
| **文件格式** | `.md`（纯 prompt） | `SKILL.md`（frontmatter + markdown） | `.md`（frontmatter + system prompt） |
| **触发方式** | 用户主动输入 `/name` | AI 自动判断加载 | 主 session 调用 `Agent()` 工具 |
| **Context** | 共享主 session | 注入主 session | 独立 context window |
| **工具权限** | 继承主 session | 继承加载方的权限 | 可在 frontmatter 中限制 |
| **模型** | 主 session 模型 | 主 session 模型 | 可指定不同模型 |
| **对话历史** | 可见全部历史 | 可见全部历史 | 看不到主 session 历史 |
| **适用场景** | 常用操作快捷方式 | 领域知识、规范、工作流 | 独立任务、角色分工、并行执行 |

---

## 3. 配置文件结构对比（含真实示例）

### 3.1 Command 示例

以本项目的 `/obsidian` command 为例：

**文件路径**：`.claude/commands/obsidian.md`

```markdown
使用 obsidian-agent 处理以下 Obsidian vault 操作请求：

$ARGUMENTS

请调用 Agent 工具，subagent_type 设为 "obsidian-agent"，
将用户的请求原文传递给 obsidian-agent 执行。
obsidian-agent 了解 vault 的所有格式约定和目录结构，
可以处理日记管理、任务追踪、笔记创建、内容关联、导出等操作。
```

**结构解析**：

- 没有 frontmatter，纯 Markdown 内容即 prompt 模板
- `$ARGUMENTS` 是唯一的占位符，运行时被用户输入替换
- 这个 Command 的作用是"桥接"——把用户请求转发给 `obsidian-agent`

### 3.2 Skill 示例

#### 用户级 Skill

**文件路径**：`~/.claude/skills/hello-world/SKILL.md`

```markdown
---
name: hello-world
description: A simple skill that should be used to respond to a user
  when the user enter the phrase "hello world".
license: MIT
---

# hello world

用ASCII的内容回答用户的问候...

## workflow

1. Run the [script](./script/systemInfo.js) to obtain system information.
2. Respond with the [template](./template/template.md)
```

**结构解析**：

- **frontmatter**：`name`（标识符）、`description`（AI 用来判断是否加载的依据）、`license`
- **markdown body**：行为指导，可以引用同目录下的脚本和模板
- Skill 目录是一个自包含的单元，可以包含脚本、模板等资源

#### 插件级 Skill

**文件路径**：`~/.claude/plugins/marketplaces/obsidian-skills/skills/obsidian-cli/SKILL.md`

```markdown
---
name: obsidian-cli
description: Interact with Obsidian vaults using the Obsidian CLI
  to read, create, search, and manage notes, tasks, properties,
  and more...
---

# Obsidian CLI

Use the `obsidian` CLI to interact with a running Obsidian instance.

## Command reference

Run `obsidian help` to see all available commands...

## Common patterns

obsidian read file="My Note"
obsidian create name="New Note" content="# Hello"
obsidian daily:read
obsidian tasks daily todo
...
```

**结构解析**：

- 与用户级 Skill 格式完全相同
- 区别在于来源：通过 plugin 机制安装，不需要手动创建
- `description` 很详细，帮助 AI 准确判断何时加载

### 3.3 Agent 示例

**文件路径**：`.claude/agents/obsidian-agent.md`

```markdown
---
name: obsidian-agent
description: |
  Obsidian vault 专属助手。处理日记管理、任务追踪、
  笔记创建、内容关联、导出等所有 Obsidian 相关操作。
tools: Read, Write, Edit, Glob, Grep, Bash, WebFetch
---

# Obsidian Vault 专属助手

你是一个专门管理 Obsidian vault 的助手...

## Vault 基本信息
- **Vault 路径**：`/Users/.../obsidian-daily`
- **日记目录**：`daily-work-item/YYYY-MM-DD.md`
...

## 日记格式规范
...（完整的格式约定、任务标记规范、链接风格等）

## 操作原则
1. **先读后改**：操作前先读取目标文件
2. **精准编辑**：用 Edit 工具做最小改动
3. **保持一致**：严格遵循格式约定
...
```

**结构解析**：

- **frontmatter**：
  - `name`：agent 标识符，调用时使用
  - `description`：描述 agent 职责，AI 可据此自动选择
  - `tools`：**显式限制可用工具列表**（这是 Skill 没有的能力）
  - 还可以设置 `model`、`isolation`、`background`、`memory` 等
- **markdown body**：成为 subagent 的 system prompt，定义其"人格"和行为规范

---

## 4. 使用方式与触发机制

### 4.1 Command 的触发

```
用户在 Claude Code 中输入：
  /obsidian 创建今天的日记

Claude Code 处理流程：
  1. 找到 .claude/commands/obsidian.md
  2. 将 $ARGUMENTS 替换为 "创建今天的日记"
  3. 将替换后的完整 prompt 发送给当前 session
  4. 主 session 执行（在这个例子中，会调用 obsidian-agent）
```

Command 查找优先级：

| 优先级 | 来源 | 路径 |
|---|---|---|
| 1（最高） | 项目级 | `.claude/commands/*.md` |
| 2 | 用户级 | `~/.claude/commands/*.md` |

### 4.2 Skill 的触发

Skill 的触发是 **AI 自主判断**的，不需要用户显式调用：

```
用户输入："帮我在 Obsidian 中创建一个笔记"

Claude Code 内部流程：
  1. 扫描所有已注册的 Skill
  2. 读取每个 Skill 的 description
  3. 判断 "obsidian-cli" Skill 与当前请求高度相关
  4. 自动将该 Skill 的 SKILL.md 内容加载到 context
  5. AI 按照 Skill 中的指导执行操作
```

Skill 的三个来源：

| 来源 | 路径 | 说明 |
|---|---|---|
| 用户级 | `~/.claude/skills/*/SKILL.md` | 用户自己创建 |
| 项目级 | `.claude/skills/*/SKILL.md` | 项目内定义 |
| 插件级 | `~/.claude/plugins/.../skills/*/SKILL.md` | 通过 marketplace 安装 |

### 4.3 Agent 的触发

Agent 通常不由用户直接触发，而是由主 session 通过 `Agent` 工具调用：

```
主 session 调用：
  Agent(subagent_type="obsidian-agent",
        prompt="创建 2026-03-16 的日记，从昨天延续未完成的追踪任务")

Claude Code 平台执行：
  1. 找到 .claude/agents/obsidian-agent.md
  2. 创建全新的 context window
  3. 将 .md body 设为 system prompt
  4. 将 prompt 参数设为初始 user message
  5. 加载 CLAUDE.md（重新加载）
  6. subagent 独立执行
  7. 返回最终摘要给主 session
```

Agent 查找优先级：

| 优先级 | 来源 |
|---|---|
| 1（最高） | `--agents` CLI 参数 |
| 2 | `.claude/agents/*.md`（项目级） |
| 3 | `~/.claude/agents/*.md`（用户级） |
| 4（最低） | 插件 `agents/*.md` |

---

## 5. 工具权限与 Context 隔离

这是三者最核心的架构差异。

### Command：无隔离

```
┌──────────────────────────────────┐
│         主 Session               │
│  ┌─────────────────────────┐     │
│  │ /obsidian 创建今天的日记   │     │
│  │                         │     │
│  │ = 一段普通的 prompt      │     │
│  │ 共享所有 context         │     │
│  │ 共享所有工具权限          │     │
│  └─────────────────────────┘     │
└──────────────────────────────────┘
```

### Skill：知识注入，无隔离

```
┌──────────────────────────────────┐
│         主 Session               │
│                                  │
│  已有对话历史 + 工具权限          │
│         +                        │
│  ┌─────────────────────────┐     │
│  │ Skill 内容（自动注入）     │     │
│  │ obsidian-cli 的命令参考   │     │
│  │ 变成 context 的一部分     │     │
│  └─────────────────────────┘     │
│                                  │
│  AI 现在"知道"如何用 CLI 了      │
└──────────────────────────────────┘
```

### Agent：完全隔离

```
主 Session Context              Subagent Context
┌────────────────────┐      ┌────────────────────┐
│ 完整对话历史        │      │ agent .md body      │
│ 所有工具权限        │      │ CLAUDE.md（重新加载）│
│ Skill 内容         │  ->  │ prompt 参数         │
│ ...               │ 仅传  │                    │
│                   │ prompt│ tools: 仅限声明的    │
│                   │      │ 无对话历史           │
└────────────────────┘      │ 无主 session context │
         ^                  └──────────┬─────────┘
         |                             |
         └── 仅返回最终摘要文本 ─────────┘
```

关于 Agent 的 Context 隔离机制，在 [[Claude Code的Agent与Subagent架构解析——以Superpowers为例]] 中有更深入的分析。核心结论是：**Context 完全隔离是刻意的架构决策**，目的是保护主 session 的 context window、保证 subagent 的专注性、支持多 subagent 并行。

---

## 6. 三者如何协作：以 /obsidian 为例

这是一个完整的 Command -> Agent 协作链路：

```
                用户输入
                  │
                  ▼
    ┌──────────────────────────┐
    │  /obsidian 创建今天的日记  │    ← Step 1: Command 触发
    └──────────┬───────────────┘
               │
               ▼ $ARGUMENTS 替换
    ┌──────────────────────────┐
    │ 主 Session 收到完整 prompt │    ← Step 2: prompt 注入主 session
    │ "使用 obsidian-agent      │
    │  处理以下请求：            │
    │  创建今天的日记"           │
    └──────────┬───────────────┘
               │
               ▼ 主 session 遵照 prompt 指示
    ┌──────────────────────────┐
    │ Agent(                    │    ← Step 3: 调用 Agent 工具
    │   subagent_type=          │
    │     "obsidian-agent",     │
    │   prompt="创建今天的日记"   │
    │ )                        │
    └──────────┬───────────────┘
               │
               ▼ 全新 context window
    ┌──────────────────────────┐
    │ obsidian-agent subagent   │    ← Step 4: subagent 独立执行
    │                          │
    │ system prompt:           │
    │   obsidian-agent.md body │
    │   (vault 路径、格式规范、  │
    │    任务标记、链接约定...)   │
    │                          │
    │ tools:                   │
    │   Read, Write, Edit,     │
    │   Glob, Grep, Bash,      │
    │   WebFetch               │
    │                          │
    │ 执行：                    │
    │   1. 读取昨天的日记        │
    │   2. 提取未完成追踪任务     │
    │   3. 按模板创建今天的日记   │
    │   4. 返回执行摘要          │
    └──────────┬───────────────┘
               │
               ▼ 摘要返回
    ┌──────────────────────────┐
    │ 主 Session 收到结果        │    ← Step 5: 结果回到主 session
    │ "已创建 2026-03-16.md，   │
    │  延续了 5 条追踪任务"       │
    └──────────────────────────┘
```

### 为什么不直接用 Command 完成？

可以。完全可以把 `obsidian-agent.md` 的所有内容直接写在 Command 里，让主 session 执行。但这样做的问题是：

| 问题 | 直接在 Command 中执行 | 通过 Agent 执行 |
|---|---|---|
| Context 占用 | 大量格式规范占据主 session context | 规范在 subagent 中，不影响主 session |
| 专注性 | 主 session 可能被其他对话干扰 | subagent 只看到 vault 相关信息 |
| 可复用性 | Command 只能在当前项目用 | Agent 可被任何 session/command 调用 |
| 工具限制 | 无法限制工具权限 | 可精确控制可用工具 |

---

## 7. Agent 与 Subagent 的深层架构

Agent 在文件系统中定义时叫 "agent"，被 `Agent` 工具调用运行时叫 "subagent"。**这是同一个东西的两面，没有两个独立概念**。

关于 Agent/Subagent 架构的完整分析，参见 [[Claude Code的Agent与Subagent架构解析——以Superpowers为例]]，以下是关键要点的提炼：

### 7.1 Context 完全隔离

Subagent 启动时获得的 context：

| 内容 | 是否包含 |
|---|---|
| 自己的 system prompt（.md body） | 是 |
| 项目的 CLAUDE.md | 是（重新加载） |
| parent 传入的 prompt | 是 |
| parent 的对话历史 | 否 |
| parent 的系统提示 | 否 |
| parent 的 Skill 内容 | 否（需显式声明） |

返回时，parent 只拿到**最终摘要文本**，中间过程不进入 parent context。

### 7.2 不支持嵌套

Subagent 不能再调用 Agent 工具派发新的 subagent。架构是严格的两层结构：

```
主 Session
  ├── Subagent A（不能再派发 subagent）
  ├── Subagent B
  └── Subagent C
```

### 7.3 Frontmatter 可选字段

```yaml
---
name: my-agent              # 标识符
description: |              # 职责描述
  当...时使用此 agent
model: sonnet               # 指定模型（opus/sonnet/haiku）
tools: [Read, Grep, Glob]   # 限制可用工具
isolation: worktree          # git worktree 文件隔离
background: true             # 后台运行
memory: project              # 持久记忆（user/project/local）
---
```

### 7.4 三种经典 Subagent 角色

以 Superpowers 插件为例（详见 [[Claude Code的Agent与Subagent架构解析——以Superpowers为例]] 第 3 节）：

| 角色 | 实现方式 | 特点 |
|---|---|---|
| **implementer** | `Agent(subagent_type="general-purpose", prompt=动态模板)` | 每个 task 的 prompt 不同 |
| **spec-reviewer** | `Agent(subagent_type="general-purpose", prompt=动态模板)` | "不信任 implementer"的角色对抗 |
| **code-reviewer** | `Agent(subagent_type="code-reviewer")` | 固定 system prompt，专用 agent 定义 |

这种设计揭示了一个重要原则：**不是所有角色都需要独立的 agent 定义**。当 prompt 是动态生成的，用 `general-purpose` + prompt 模板更灵活；当 prompt 相对固定，才需要创建独立的 agent 定义文件。

---

## 8. Skill 的分发生态：Plugin 机制

Skill 最强大的特性是支持 **plugin 化分发**。用户可以通过 marketplace 安装他人共享的 Skill，无需手动配置。

### 8.1 Plugin 结构

以 `obsidian-skills` 插件为例：

```
~/.claude/plugins/marketplaces/obsidian-skills/
  .claude-plugin/
    plugin.json             ← 插件元数据
  skills/
    obsidian-cli/           ← Skill: CLI 交互
      SKILL.md
    obsidian-markdown/      ← Skill: Markdown 格式
      SKILL.md
    obsidian-bases/         ← Skill: Bases 功能
      SKILL.md
    json-canvas/            ← Skill: Canvas 格式
      SKILL.md
    defuddle/               ← Skill: 内容解析
      SKILL.md
```

### 8.2 Plugin 配置文件

**`plugin.json`**：

```json
{
  "name": "obsidian",
  "version": "1.0.1",
  "description": "Create and edit Obsidian vault files including
    Markdown, Bases, and Canvas.",
  "author": {
    "name": "Steph Ango",
    "url": "https://stephango.com/"
  },
  "repository": "https://github.com/kepano/obsidian-skills",
  "license": "MIT",
  "keywords": ["obsidian", "markdown", "bases", "canvas", "pkm", "notes"]
}
```

### 8.3 Skill 的三层来源

```
优先级从高到低：

1. 项目级 Skill     .claude/skills/*/SKILL.md
   └── 项目专属，覆盖同名的用户级和插件级

2. 用户级 Skill     ~/.claude/skills/*/SKILL.md
   └── 个人定制，如 hello-world、pptx、frontend-slides

3. 插件级 Skill     ~/.claude/plugins/.../skills/*/SKILL.md
   └── 社区共享，通过 marketplace 安装
       如 obsidian-cli、obsidian-markdown
```

这种分层设计让 Skill 具备了完整的"开发 -> 分享 -> 安装 -> 覆盖定制"链路。

---

## 9. 最佳实践与选型建议

### 9.1 选型决策树

```
你需要做什么？
  │
  ├── 需要一个快捷方式来触发常用操作？
  │   └── 用 Command
  │       例：/obsidian、/review、/deploy
  │
  ├── 需要让 AI "知道"某个领域的知识和规范？
  │   └── 用 Skill
  │       例：Obsidian CLI 用法、代码规范、API 文档
  │
  ├── 需要独立执行任务、限制权限、或并行处理？
  │   └── 用 Agent
  │       例：代码审查员、文档生成器、测试执行器
  │
  └── 需要组合使用？
      └── Command（入口）-> Agent（执行）+ Skill（知识）
```

### 9.2 实用建议

**Command 的最佳实践**：

- 保持简短，只做"路由"——决定用哪个 Agent 或执行什么操作
- 用 `$ARGUMENTS` 保持灵活性
- 命名要直观：`/obsidian`、`/review`、`/deploy`

**Skill 的最佳实践**：

- `description` 要写清楚——这是 AI 判断是否加载的唯一依据
- 内容要聚焦——一个 Skill 解决一个领域的问题
- 利用目录结构组织资源（脚本、模板、示例）
- 考虑发布为 plugin 供他人使用

**Agent 的最佳实践**：

- 明确限制 `tools`——最小权限原则
- system prompt 中写清楚角色定位和行为规范
- 对于只读任务（审查、分析），不要给 Write/Bash 权限
- 需要文件隔离时用 `isolation: worktree`
- 需要跨 session 学习时用 `memory` 字段

### 9.3 三者的组合模式

| 模式 | 组合方式 | 适用场景 |
|---|---|---|
| **快捷路由** | Command -> Agent | 常用操作的标准化入口 |
| **知识增强** | Skill 注入 + 主 session 执行 | 需要领域知识但不需要隔离的任务 |
| **知识 + 隔离** | Agent（声明 skills 依赖） | 需要领域知识且需要独立 context |
| **多角色协作** | 主 session + 多个 Agent 并行 | 实现、审查、测试的角色分工 |
| **用户友好入口** | Command -> 主 session 判断 -> Agent or 直接执行 | 统一入口，智能路由 |

---

## 10. 总结

```
┌──────────────────────────────────────────────────────────────────┐
│                         Claude Code 扩展体系                      │
│                                                                  │
│  ┌──────────┐   ┌──────────────┐   ┌───────────────────────┐    │
│  │ Command   │   │    Skill     │   │       Agent           │    │
│  │           │   │              │   │                       │    │
│  │ 快捷入口   │──→│  知识注入     │   │  独立角色              │    │
│  │ /name     │   │  自动加载     │   │  隔离 context          │    │
│  │ 模板替换   │   │  领域规范     │   │  受限工具              │    │
│  │           │   │  plugin 分发  │   │  可选 worktree/memory  │    │
│  └──────────┘   └──────────────┘   └───────────────────────┘    │
│       │                │                       │                 │
│       │   Command 可以触发 Agent                  │                 │
│       └──────────────────────────────────────────┘                │
│                        │                                         │
│              Skill 可被注入 Agent 或主 Session                     │
│                                                                  │
│  三者不是竞争关系，而是互补关系：                                      │
│    Command = 怎么触发                                              │
│    Skill   = 知道什么                                              │
│    Agent   = 谁来做                                                │
└──────────────────────────────────────────────────────────────────┘
```

**一句话总结**：Command 是"怎么触发"，Skill 是"知道什么"，Agent 是"谁来做"。三者结合，构成了 Claude Code 完整的扩展和自动化体系。

---

## 相关文章

- [[Claude Code的Agent与Subagent架构解析——以Superpowers为例]] — Agent/Subagent 架构的深层分析
- [[AI-Native开发实践：从Figma设计到Superpowers Brainstorm再到Spec-Delta工作流]] — 五层 AI pipeline 中的实践应用

## 参考资料

- Claude Code Commands 文档：[custom-slash-commands.md](https://docs.anthropic.com/en/docs/claude-code/custom-slash-commands)
- Claude Code Subagents 文档：[sub-agents.md](https://docs.anthropic.com/en/docs/claude-code/sub-agents)
- Claude Code Skills 文档：[skills.md](https://docs.anthropic.com/en/docs/claude-code/skills)
- Obsidian Skills 插件：[kepano/obsidian-skills](https://github.com/kepano/obsidian-skills)
