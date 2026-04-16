---
title: Claude Code 系列 05：记忆全景——从 Session 到 Memory 的六层持久化体系
created: 2026-04-13
tags:
  - claude-code
  - memory
  - persistence
  - ai-agent
  - tool
---

# Claude Code 系列 05：记忆全景——从 Session 到 Memory 的六层持久化体系

## 为什么需要理解 Claude Code 的记忆机制？

Claude Code 不是一个"用完即走"的 CLI 工具。它有一套完整的分层记忆系统——从单次对话的上下文，到跨 Session 的持久化记忆，再到组织级别的强制策略。理解这些层次，才能让 Claude Code 真正成为"有记忆的协作者"，而不是每次都从零开始的陌生人。

本文基于实际使用经验，梳理 Claude Code 的全部持久化机制，按照**从上到下的优先级顺序**逐层展开。

---

## 六层架构总览

```
强制层   Settings（硬规则，客户端机械执行）
指导层   CLAUDE.md + Rules（行为指导，Claude 阅读并遵循）
记忆层   Auto Memory（Claude 自主积累的知识笔记）
会话层   Session Transcripts（对话历史，支持续接和回溯）
扩展层   Skills / Agents / Commands / MCP（按需加载的能力模块）
状态层   ~/.claude.json（应用级配置、OAuth、信任决策）
```

每一层解决不同的问题，加载时机不同，持久性也不同。下面逐层拆解。

---

## 第一层：Settings（强制配置层）

Settings 是**机械执行**的硬规则——不依赖 Claude 的"理解"，由客户端直接强制。典型用途：权限控制、Hooks、环境变量、模型选择。

### 四级优先级

| 优先级 | 范围 | 路径 | 共享范围 |
|--------|------|------|----------|
| 最高 | 系统级（Managed） | macOS: `/Library/Application Support/ClaudeCode/managed-settings.json` | 所有用户 |
| 高 | 本地级 | `.claude/settings.local.json` | 仅自己（gitignored） |
| 中 | 项目级 | `.claude/settings.json` | 团队（提交到 git） |
| 低 | 用户级 | `~/.claude/settings.json` | 仅自己 |

**关键设计**：数组类型的配置（如 `permissions.allow`）跨层**合并**，标量类型（如 `model`）取**最具体**的值。

### 实际应用

```json
// .claude/settings.local.json — 个人本地配置
{
  "permissions": {
    "allow": ["Read", "Glob", "Grep"]
  },
  "env": {
    "TAVILY_API_KEY": "tvly-xxx"
  }
}
```

Settings 是唯一能配置 **Hooks** 的地方——Hooks 是自动化行为的基础（"每次提交前运行 lint"、"每次编辑后验证"），由 Harness 执行而非 Claude。

---

## 第二层：CLAUDE.md + Rules（指导层）

CLAUDE.md 是给 Claude 读的**行为指导**——不是强制执行，而是 Claude 理解后尽力遵循的规则。这是大多数用户接触最多的记忆机制。

### 五级加载顺序

| 范围 | 路径 | 特点 |
|------|------|------|
| 系统级 | `/Library/Application Support/ClaudeCode/CLAUDE.md` | 不可排除 |
| 用户级 | `~/.claude/CLAUDE.md` | 所有项目生效 |
| 项目级 | `./CLAUDE.md` 或 `.claude/CLAUDE.md` | 团队共享，提交到 git |
| 嵌套级 | `<subdir>/CLAUDE.md` | 子目录特定，按需加载 |
| 本地级 | `./CLAUDE.local.md`、`<subdir>/CLAUDE.local.md` | 个人覆盖，gitignored |

**加载机制**：Claude 从工作目录向上遍历目录树，每层加载 `CLAUDE.md` + `CLAUDE.local.md`。**所有文件全量拼接加载到 Context，不是覆盖关系**——类似 CSS 层叠，冲突时"后出现的优先"。项目根目录的 CLAUDE.md 在 Context 压缩后仍保留；嵌套的不保留（但 Claude 读到该子目录的文件时会重新加载）。

```
managed CLAUDE.md（系统级）
  + ~/.claude/CLAUDE.md（用户级）
    + ./CLAUDE.md（项目级）
      + CLAUDE.local.md（本地级）
        → 全部拼接，每次请求都在 Context 中消耗 token
```

### Context 消耗参考

CLAUDE.md **每次请求**都完整存在于 Context 中。官方文档的参考 token 消耗：

| 项目 | 约占 token |
|------|-----------|
| 系统提示 | ~4,200 |
| `~/.claude/CLAUDE.md` | ~320 |
| 项目 CLAUDE.md | ~1,800 |
| Auto Memory 索引 | ~680 |
| Skill 描述（仅一行摘要） | ~450 |
| 环境信息 | ~280 |

官方建议 CLAUDE.md **不超过 200 行**——文件越长，消耗越多，指令遵循度也会下降。HTML 注释（`<!-- -->`）会在注入前被剥离以节省 token。

### Import 机制

CLAUDE.md 支持 `@path/to/file` 语法导入其他文件（最多 5 层嵌套），**启动时内联展开**——等效于把引用文件的内容直接粘贴进来，因此 `@` 导入的内容同样全量占用 Context。相对路径以包含 import 的文件为基准解析，首次遇到外部 import 时会弹出审批对话框。

**注意**：`@import` 是全量展开，不是按需加载。如果引用了大文件，会显著增加 Context 占用。

### Rules 目录——模块化替代方案

当 CLAUDE.md 变得太长时，可以拆分为 Rules 目录：

| 范围 | 路径 |
|------|------|
| 用户级 | `~/.claude/rules/*.md`（递归） |
| 项目级 | `.claude/rules/*.md`（递归） |

Rules 文件有两种加载模式：

| 类型 | 加载时机 | 压缩后 |
|------|---------|--------|
| **无 `paths:` 的 Rule** | 启动时加载，等同 CLAUDE.md | 从磁盘重新注入 |
| **有 `paths:` 的 Rule** | Claude 读到匹配文件时才加载 | **丢失**，下次匹配时重新加载 |

```yaml
# .claude/rules/api-conventions.md
---
paths: src/api/**
---
API 开发必须使用 RESTful 风格...
# ↑ 只有 Claude 读到 src/api/ 下的文件时才加载——这是"按需语义组装"的雏形
```

### 最佳实践

CLAUDE.md 的黄金法则：**精简行为规则 + 引用详细文档**。因为 CLAUDE.md 每次对话都加载，占用宝贵的上下文窗口。详细的格式规范、工作流程应放在 agent 文件或项目文档中，CLAUDE.md 只保留摘要和引用。

```markdown
## Key Rules
**Formatting details** → see `.claude/agents/obsidian-agent.md`
- Images: `![alt](relative-path)`. **Never** use `![[filename.png]]`.
- Language: Chinese body, English terms.
```

---

## 第三层：Auto Memory（记忆层）

这是 Claude Code 最独特的机制——**Claude 自主写的笔记**，跨 Session 持久化。

> **关键区别**：CLAUDE.md 是**全量加载**（每次请求都在 Context），Memory 是**索引加载 + 按需读取**——两者加载策略完全不同。

### 存储位置

| 文件 | 路径 | 加载方式 |
|------|------|----------|
| 索引文件 | `~/.claude/projects/<project-path>/memory/MEMORY.md` | 启动时加载前 200 行 / 25KB |
| 主题文件 | `~/.claude/projects/<project-path>/memory/<topic>.md` | 按需读取 |

`<project-path>` 由 git 仓库根目录派生（路径中 `/` 替换为 `-`），同一 repo 的所有 worktree 共享同一个 memory 目录。

### 记忆类型

Auto Memory 按 frontmatter 的 `type` 字段分类：

| 类型 | 用途 | 示例 |
|------|------|------|
| `user` | 用户角色、偏好、知识背景 | "用户是 AI 工程师，偏好架构约束" |
| `feedback` | 用户对工作方式的纠正或确认 | "不要在测试中 mock 数据库" |
| `project` | 项目进展、目标、截止日期 | "merge freeze 从 4/5 开始" |
| `reference` | 外部系统的指针 | "bugs 在 Linear INGEST 项目跟踪" |

### 什么不该存

- 代码结构、文件路径（读代码就能得到）
- Git 历史（`git log` 是权威来源）
- CLAUDE.md 中已有的规则
- 临时任务状态

### Subagent 专属记忆

Agent 定义文件中配置 `memory:` 字段，可获得独立于主 Memory 的记忆空间：

| 范围 | 路径 | 共享 |
|------|------|------|
| `memory: project` | `.claude/agent-memory/<agent-name>/MEMORY.md` | 提交到 git |
| `memory: local` | `.claude/agent-memory-local/<agent-name>/MEMORY.md` | gitignored |
| `memory: user` | `~/.claude/agent-memory/<agent-name>/MEMORY.md` | 跨项目 |

每个 Subagent 启动时加载自己的 MEMORY.md 前 200 行。这对于需要跨 Session 追踪状态的 Agent（如知识提取器追踪已处理的日记）非常有价值。

### 实用技巧

1. **创建符号链接**方便浏览：`ln -s ~/.claude/projects/<encoded-path>/memory .claude/memory`
2. Memory 文件是纯 Markdown，可以手动编辑、删除
3. `/memory` 命令可开关 Auto Memory
4. 环境变量 `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` 可全局禁用

---

## 第四层：Session Transcripts（会话层）

每次对话的完整记录——所有消息、工具调用、返回结果，逐条写入 JSONL 文件。

### 存储位置

```
~/.claude/projects/<project-path>/<session-uuid>.jsonl
~/.claude/projects/<project-path>/<session-uuid>/   # 附加数据（plans、tasks）
```

### 生命周期

| 行为 | 说明 |
|------|------|
| 写入 | 实时写入，对话过程中持续追加 |
| 续接 | `claude --continue`（续接最近 Session）或 `--resume`（选择历史 Session） |
| 分叉 | `claude --fork-session <id>`（从某个 Session 分叉新对话） |
| 回溯 | 按两次 Esc 可回退到上一步 |
| 清理 | `cleanupPeriodDays` 设置（默认 30 天，最少 1 天） |
| 禁用 | `--no-session-persistence`（仅非交互模式） |

### 体积参考

一个活跃项目（如本 Obsidian vault）30 天内可能积累 100+ 个 Session 文件，总计 50-100MB。这些文件是 Claude Code 的"长期记忆骨架"——Auto Memory 是从中提炼的摘要，Session Transcript 是完整原始记录。

---

## 第五层：Skills / Agents / Commands（扩展层）

按需加载的能力模块，不占用启动上下文（只有描述在启动时加载，完整内容在调用时展开）。

### 对比

| 类型 | 项目级路径 | 用户级路径 | 特点 |
|------|-----------|-----------|------|
| **Skills** | `.claude/skills/<name>/SKILL.md` | `~/.claude/skills/<name>/SKILL.md` | 最新机制，支持 frontmatter 触发条件 |
| **Agents** | `.claude/agents/<name>.md` | `~/.claude/agents/<name>.md` | Subagent 定义，支持独立工具集和记忆 |
| **Commands** | `.claude/commands/<name>.md` | `~/.claude/commands/<name>.md` | 遗留机制，被 Skills 逐步替代 |
| **Output Styles** | `.claude/output-styles/<name>.md` | `~/.claude/output-styles/<name>.md` | 控制输出格式和风格 |

Skills 和 Commands 名称冲突时，Skills 优先。

### MCP Servers

外部工具连接，配置位置取决于共享范围：

| 范围 | 路径 |
|------|------|
| 团队共享 | `.mcp.json`（项目根目录，提交到 git） |
| 个人全局 | `~/.claude.json` 内 `mcpServers`（user scope） |
| 个人项目 | `~/.claude.json` 内 `mcpServers`（local scope） |
| 组织级 | `managed-mcp.json`（系统目录） |

---

## 第六层：App State（状态层）

### `~/.claude.json`

全局应用状态文件，包含：

- OAuth Session 和认证信息
- 主题和 UI 偏好（`theme`、`terminalProgressBarEnabled`）
- Editor 模式（vim/emacs）
- 个人 MCP Servers 定义
- 项目信任决策（哪些项目允许自动执行）
- 各种缓存

通过 `/config` 命令管理，通常不需要手动编辑。

### `~/.claude/keybindings.json`

自定义键绑定，启动时读取，编辑后热加载。通过 `/keybindings` 命令管理。

---

## 层次间的关系

理解这六层之间的**区别和协作**是关键：

| 维度 | Settings | CLAUDE.md | Auto Memory | Session | Extensions |
|------|----------|-----------|-------------|---------|------------|
| **谁写** | 用户/管理员 | 用户/团队 | Claude | 系统自动 | 用户/团队 |
| **执行方式** | 客户端强制 | Claude 理解遵循 | Claude 按需回忆 | 支持续接回溯 | 调用时展开 |
| **生命周期** | 永久 | 永久 | 永久（可手动删除） | 默认 30 天 | 永久 |
| **上下文占用** | 不占用 | 每次加载 | 索引每次加载 | 不占用 | 描述加载，内容按需 |
| **共享方式** | 分级 | 分级 | 仅本机 | 仅本机 | 分级 |

### 选择哪一层？

```
需要团队统一遵守的规则      → CLAUDE.md（提交到 git）
需要个人偏好但不想影响团队   → CLAUDE.local.md 或 settings.local.json
需要跨 Session 记住的上下文  → Auto Memory（让 Claude 自动写，或手动编辑）
需要 Agent 有独立的记忆空间  → Subagent memory（frontmatter 配置）
需要强制执行的权限/行为      → Settings（hooks、permissions）
需要可复用的工作流           → Skills / Commands
需要按文件类型加载不同规则   → Rules 目录（paths: frontmatter）
```

---

## 加载机制深度解析

### CLAUDE.md vs Memory：两种截然不同的加载策略

| 维度 | CLAUDE.md | Auto Memory |
|------|-----------|-------------|
| **启动加载** | 全文加载，始终在 Context | MEMORY.md 前 200 行/25KB 加载 |
| **主题/详细内容** | `@import` 启动时全量展开 | 主题文件**不加载**，Claude 用 Read 工具按需读取 |
| **每次请求消耗** | 每次都在 Context 中 | 索引在 Context，主题文件不在 |
| **支持 `@import`** | 支持（最多 5 层） | **不支持**——按需加载通过 Claude 自主判断 + Read 工具 |
| **压缩后** | 从磁盘重新注入 | 从磁盘重新注入 |

### Context 压缩（Compaction）存活规则

当对话接近 Context 上限时，Claude Code 会压缩早期消息。不同类型的持久化内容在压缩后行为不同：

| 文件类型 | 压缩后行为 |
|----------|-----------|
| 项目根 CLAUDE.md | **从磁盘重新注入** |
| `~/.claude/CLAUDE.md` | **从磁盘重新注入** |
| MEMORY.md 索引 | **从磁盘重新注入** |
| 无 `paths:` 的 Rules | **从磁盘重新注入** |
| 子目录 CLAUDE.md | **丢失**——下次读到该目录文件时重新加载 |
| 有 `paths:` 的 Rules | **丢失**——下次匹配文件时重新加载 |
| Skill 描述列表 | **丢失**——不重新注入 |
| 已调用的 Skill 正文 | **重新注入**，但有上限（5K/skill，25K 总计，最旧的先丢弃） |

**关键启示**：如果某条规则必须在长对话中持续生效，不要用 `paths:` scoped rule 或子目录 CLAUDE.md——放到项目根 CLAUDE.md 或无 scope 的 rule 中。

### Skills vs CLAUDE.md：加载方式根本不同

| 维度 | CLAUDE.md | Skills |
|------|-----------|--------|
| 启动时 | **全文**加载 | 只加载**一行描述**（~450 tokens 总计） |
| 使用时 | 始终在 Context | 调用时才展开全文 |
| 压缩后 | 从磁盘重新注入 | 描述丢失，已调用正文有上限保留 |
| 设计理念 | 常驻指导 | 按需扩展 |

Skills 的设计就是为了解决 CLAUDE.md 全量加载的 Context 压力——把不常用的工作流封装为 Skill，只在需要时展开。

### 设计哲学：为什么是拼接而不是语义组装？

多层 CLAUDE.md 全量拼接看起来"笨"，为什么不用 LLM 智能合并去重？

**核心原因：确定性优于智能性。**

如果用 LLM 来"语义合并"多层 CLAUDE.md，会引入不确定性——哪条规则该保留、哪条该丢弃、冲突怎么裁决，这些判断本身就消耗 token 且可能出错。拼接是最简单、最可预测的策略：你写了什么就加载什么，不会被"智能地"丢掉。类比 CSS 层叠规则。

**实际上不会太多层**——大多数用户只用 1-2 层（项目级 + 偶尔用户级），系统级 managed 仅企业部署。子目录 CLAUDE.md 按需加载不占启动 Context。

**当前机制的局限**：

1. **没有去重能力**——用户级和项目级都写"使用中文回复"会重复加载
2. **没有条件加载**——所有无 `paths:` 的内容无差别加载
3. **`@import` 是全量展开**——引用大文件会显著增加 Context 占用

**理想模型应该是**：

```
启动加载：   最小行为规则摘要（~50 行）
按需加载：   Claude 判断需要时，读取详细规则文件
压缩后：     核心规则重新注入，详细规则按需重新读取
```

这恰好是 **Auto Memory 的设计思路**（索引 + 按需），但 CLAUDE.md 系统还没做到这一步。好消息是 Rules + `paths:` frontmatter 已经是这个方向的雏形。

**当前最优实践**：手动实现这个理想模型——CLAUDE.md 精简到行为规则摘要（~100 行），详细内容通过 reference 指向 agent 文件和项目文档，Claude 需要时自行读取。这在当前机制下兼顾了确定性和效率。

---

## 实践建议

### 1. 用符号链接让 Memory 可见

Memory 的默认路径很深（`~/.claude/projects/<encoded-path>/memory/`），创建符号链接方便浏览和编辑：

```bash
ln -s ~/.claude/projects/-Users-xxx-myproject/memory .claude/memory
```

### 2. CLAUDE.md 保持精简

CLAUDE.md 每次对话都完整加载，占用上下文窗口。原则：**行为规则摘要 + 引用详细文档**。把格式规范、工作流程放在 agent 文件或项目文档中。

### 3. 善用 Subagent Memory

对于需要跨 Session 追踪进度的 Agent（如知识提取器、代码审查器），配置 `memory: project` 或 `memory: local`，让它们有独立的记忆空间。

### 4. 定期清理 Memory

Auto Memory 可能积累过时信息。定期检查 `.claude/memory/` 下的文件，删除不再准确的记忆。Claude 也会在发现记忆与当前状态冲突时主动更新。

### 5. 区分"指导"和"强制"

- 希望 Claude **尽力遵循**的规则 → CLAUDE.md
- 需要**机械执行**的行为 → Settings Hooks
- 例如："提交前运行 lint"用 Hook 更可靠，"代码风格偏好"用 CLAUDE.md 更灵活

---

## 总结

Claude Code 的记忆系统是一个精心设计的分层架构——从硬性的 Settings 到柔性的 CLAUDE.md，从 Claude 自主积累的 Memory 到完整的 Session 记录。理解每一层的**写入者、执行方式、生命周期和共享范围**，才能让这套系统为你的工作流最大化服务。

对于个人知识管理场景（如 Obsidian + PKC），最重要的三层是：
1. **CLAUDE.md** — 定义知识库的架构规则和 Agent 路由
2. **Auto Memory** — 让 Claude 记住你的偏好、项目上下文和反馈
3. **Agents + Skills** — 封装可复用的知识工作流（提取、维护、检测、查询）

这三层协同，让 Claude Code 从"每次重新认识你"变成"每次继续上次的工作"。
