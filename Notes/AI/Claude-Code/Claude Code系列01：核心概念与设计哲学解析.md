---
title: Claude Code 系列 01：核心概念与设计哲学解析——从 Agent Loop 到 Harness 工程的实践地图
created: 2026-04-16
tags:
  - AI
  - claude-code
  - agent
  - harness
  - architecture
  - design-philosophy
---

# Claude Code 系列 01：核心概念与设计哲学解析

> 基于 [ShareAI 教程](https://learn.shareai.run/en/)的系统学习、与 [ChatGPT 的讨论](https://chatgpt.com/share/69e0c10c-f858-8322-9b25-b8f4d5d21964)以及日常使用经验，梳理 Claude Code 的核心概念、实现机制、设计权衡，以及贯穿整个系统的设计潜台词。

---

## 0. 贯穿全文的设计潜台词：强模型，弱规则

在深入每个概念之前，需要先理解 Claude Code 的根本设计哲学——这决定了它为什么这样设计，也解释了很多"看起来像 bug"的行为。

### 核心张力

Claude Code 的设计哲学是：

> **"弱结构 + 强模型"**——尽量少设硬性规则，把决策权交给模型

而很多用户（包括我）在追求的是：

> **"强结构 + 可控行为"**——希望系统行为确定、可预测、可复现

**这两者存在根本性张力。** Claude Code 故意选择了前者——它相信一个足够强的模型（Opus 4.6），给它足够的上下文，它自己能做出正确的决策。规则和结构只是"提示增强"，不是"强制约束"。

### 这个选择的后果

- **Memory 不是数据库**，是"有时候会帮你，有时候会背刺你"的提示增强
- **Rules 不是规则引擎**，是"弱条件触发系统"——模型决定是否采纳，而非系统强制执行
- **Skills 不是 API 注册表**，是"按需加载的知识片段"——触发时机由模型判断
- **Hooks 是唯一的确定性控制点**——因为它们绕过模型决策，由代码直接执行

理解了这个潜台词，后面每个概念的设计选择都会变得合理。

---

## 1. Agent Loop：一切的起点

### 实现机制

Agent Loop 是 Claude Code 最底层的核心——整个系统就是一个循环：

```
用户输入 → 组装上下文 → 发送给模型 → 模型返回（文本 or tool_use）
                                          ↓
                                    如果是 tool_use → 执行工具 → 结果写回 messages → 继续循环
                                    如果是 end_turn → 输出给用户 → 等待下一次输入
```

ShareAI 教程（s01）将其精炼为：**"An agent is just a loop: send messages, execute tools, feed results back, repeat."**

关键数据结构是 `LoopState`，包含：
- `messages[]`：完整的对话历史（含工具调用和结果）
- `turn_count`：当前轮次
- `tool_use_context`：工具执行的运行时环境

### 设计要点

**一个请求不是一次模型调用，而是一个多轮运行时过程。** 每次循环可能因为不同原因继续：
- `tool_use`：模型请求调用工具 → 执行后继续
- `max_tokens_recovery`：输出被截断 → 恢复后继续
- `compaction`：上下文超限 → 压缩后继续

### 优缺点

| 优点 | 缺点 |
|------|------|
| 极简架构：新增工具不改循环逻辑 | 单线程：一个 Session 内只有一个循环在运行 |
| 模型自主决策何时调用工具、何时停止 | 循环深度不可控：复杂任务可能消耗大量 token |
| 对话历史完整保留在 messages 中 | messages 无限增长会触发 compaction |

### 使用场景与注意

- **简单任务**：循环通常 1~3 轮（用户问 → 模型读文件 → 模型回答）
- **复杂任务**：可能 10~50+ 轮（规划 → 多次读写 → 测试 → 修复 → 提交）
- **注意**：循环次数越多，上下文累积越大，越容易触发 compaction 导致信息丢失

### 设计潜台词

Agent Loop 的极简性体现了"强模型"理念——**循环本身不做任何智能决策**（不判断该不该调工具、不判断任务是否完成），所有决策权完全交给模型。这是 Claude Code 与传统工作流引擎的根本区别。

---

## 2. Tool Use：模型的"手和脚"

### 实现机制

Tool Use 让模型从"只能说话"变成"能做事"。ShareAI 教程（s02）的核心洞见：**"Adding a tool means adding one handler. The loop never changes."**

工具系统分为两层：

- **Dispatch Map（路由表）**：工具名 → 处理函数的映射，纯查表逻辑
- **Tool Control Plane（控制面）**：决定工具调用如何执行的协调层——权限检查、沙箱隔离、并发控制、结果格式化

内置核心工具：
- `Read` / `Write` / `Edit`：文件操作（带路径安全检查）
- `Bash`：Shell 命令执行（沙箱内）
- `Glob` / `Grep`：文件搜索
- `Agent`（Subagent 工具）：生成子 Agent
- `WebFetch` / `WebSearch`：网络访问
- `LSP`：语言服务器协议集成

### 设计要点

**工具执行的安全模型**是 Claude Code 与裸模型最大的区别之一：
- 所有文件操作经过 `safe_path()` 校验
- Bash 命令在沙箱中执行
- 写操作需要用户确认（Permission System）
- 工具并发安全分区：安全的批量并行，排他的串行执行

### 优缺点

| 优点 | 缺点 |
|------|------|
| 一次 tool_use 可含多个并行调用，效率高 | 模型自行决定调哪个工具——有时会选错 |
| 沙箱隔离保证安全 | 沙箱限制了某些需要 root 权限的操作 |
| 工具描述自动注入系统 Prompt | 工具越多，系统 Prompt 越长，占用上下文 |
| MCP 协议可扩展外部工具 | MCP 工具的质量和稳定性不受平台控制 |

### 使用场景与注意

- **提高工具选择准确性**：在 CLAUDE.md 中明确指定"在 X 场景下用 Y 工具"——这是外层 Harness 的 Guide 控制
- **MCP 工具**：通过 MCP 协议扩展能力（如 Tavily 搜索、Puppeteer 浏览器），但需注意工具描述的质量直接影响模型调用决策
- **注意**：模型可能在不需要工具时也调用工具（过度 read），或在需要时不调用（跳过验证直接回答）——这是"强模型弱规则"设计的直接后果

### 设计潜台词

工具系统的核心设计是**"模型决定用什么工具，系统只负责安全执行"**。系统不会说"你应该先 Read 再 Edit"——这个决策完全由模型做出。Hooks 是唯一能在工具执行前后插入确定性逻辑的机制。

---

## 3. Context 管理与 Compaction：Agent 的"工作记忆"

### 实现机制

模型每次接收的完整输入（即 Context）由多部分组装而成：

```
System Prompt（固定）
  + CLAUDE.md 内容（启动加载）
  + MEMORY.md 索引（启动加载）
  + 匹配的 Rules（条件加载）
  + 活跃的 Skills 注入（按需加载）
  + 对话历史 messages[]（累积）
= 实际发送给模型的 payload
```

当 Context 接近窗口上限（约 200k tokens）时，触发 **Compaction（上下文压缩）**：
- 保留系统 Prompt、最近的关键信息、当前任务上下文
- 压缩/丢弃早期对话轮次
- 生成压缩后的摘要替代原始内容

ShareAI 教程（s06）定义：**"Compaction is the process of shrinking active context while preserving the important storyline and next-step information."**

### 设计要点

Compaction 是一个**有损压缩过程**——它不可避免地会丢失信息。系统的设计目标是"保留行动项，丢弃闲聊"，但模型对"什么是重要的"的判断并不总是准确。

### 优缺点

| 优点 | 缺点 |
|------|------|
| 长 Session 不会因上下文溢出而崩溃 | 有损压缩：早期关键信息可能被丢弃 |
| 对用户透明——自动触发，无需干预 | 压缩后模型可能"忘记"之前的决策和约定 |
| Claude Code 的 compaction 经过大量工程优化 | 无法手动控制哪些信息被保留 |

### 使用场景与注意

- **短任务（< 50k tokens）**：不会触发 compaction，无需担心
- **长任务（100k+ tokens）**：Compaction 几乎必然发生。**关键信息应写入文件（而非只在对话中提及）**——文件是持久的，对话是会被压缩的
- **GSD 的对策**：上下文隔离架构——每个执行单元获得独立的全新上下文窗口，从项目制品而非累积聊天历史构建，直接对抗"上下文腐烂（context rot）"
- **Meta-Harness 的启示**：论文发现 full history via filesystem 远优于压缩摘要（+15.4%）——同样的道理适用于 Claude Code：重要信息写文件，不要只靠 context 保持

### 设计潜台词

Compaction 的存在暗示了一个关键设计假设：**模型的上下文窗口是稀缺资源，必须被精心管理**。这解释了为什么 CLAUDE.md 要保持精简（OpenAI 建议约 100 行做目录）、为什么 Skills 按需加载而非全量注入、为什么 Subagent 使用独立上下文。上下文的每一个 token 都有成本。

---

## 4. Memory 系统：CLAUDE.md / MEMORY.md / Rules

Memory 是 Claude Code 中最容易产生误解的部分。它不是一个"数据库"——它是一组**文件驱动、启动加载、非确定性读取**的提示增强机制。

### 4.1 CLAUDE.md——"唯一真相源"

**机制**：项目根目录的 CLAUDE.md 在每次 Session 启动时**全量加载**到系统 Prompt 中。它是你能确保模型"一定看到"的唯一方式。

**应该放什么**：
- 项目架构概览
- 编码规范和约束
- 关键命令（build/test/deploy）
- Agent 行为指引（"在 X 场景下做 Y"）

**不应该放什么**：
- 所有细节（会膨胀上下文，挤占任务空间）
- 频繁变化的信息（每次改动影响所有 Session）

**设计潜台词**：CLAUDE.md 是 Harness 中最重要的 **Guide（前馈控制）**。OpenAI 的教训：把它当目录（table of contents），不当百科全书。

### 4.2 MEMORY.md——"自动生成的知识 dump"

**机制**：Claude Code 的 auto memory 功能会自动将对话中学到的信息写入 MEMORY.md。它在启动时加载，但：
- 模型**不一定会参考**——只是被注入了 context，不意味着会被使用
- 容易膨胀成"垃圾堆"——不定期清理会充满过时信息

**ChatGPT 讨论的精准定位**：

> MEMORY.md 是一个"自动生成的知识 dump + 初级索引"——不是可靠的长期记忆系统。

**实践建议**：
- 保持 < 200 行
- 定期审查和清理
- 重要信息必须写在 CLAUDE.md，不要只依赖 auto memory

### 4.3 Rules——"弱条件触发系统"

**机制**：Rules 是放在 `.claude/rules/` 目录下的 Markdown 文件，支持通过 `paths:` 字段指定触发条件。

```yaml
# .claude/rules/backend.md
paths:
  - "src/backend/**"
---
Backend 代码必须遵循以下规范...
```

**两种形态**：
- **有条件 Rule**（带 `paths:`）：仅当模型读取/编辑匹配路径的文件时才加载
- **无条件 Rule**（无 `paths:`）：启动时直接加载，等价于 CLAUDE.md 的扩展

**关键现实**（ChatGPT 讨论的核心洞察）：

> **Rule 的触发取决于模型是否去读取了匹配路径的文件——而不是 Rule 本身的存在。**

这意味着：
- ❌ Rule 不支持语义匹配（"backend 相关问题"）
- ❌ Rule 不支持关键词触发
- ❌ Rule 不支持意图识别
- ✅ Rule 只支持：文件路径匹配

**即使路径匹配成功，也不保证模型会遵循 Rule 的内容**——模型可以"看到但不采纳"。

### 优缺点（Memory 系统整体）

| 优点 | 缺点 |
|------|------|
| 零代码配置：写 Markdown 文件即可 | 非确定性：不保证读取、不保证使用 |
| CLAUDE.md 全量加载，覆盖率最高 | Rules 触发依赖模型行为，不可靠 |
| Auto memory 自动学习用户偏好 | MEMORY.md 容易膨胀、过时 |
| 文件驱动：版本化管理方便 | 无法做语义路由——只有路径匹配 |

### 如何提高 Memory 的可靠性

1. **在 CLAUDE.md 中加 trigger**：`When working on backend, ALWAYS read a backend file first` → 强行触发 Rule 加载链
2. **显式指令**：`Read src/backend/api.rs before answering` → 最稳定但不优雅
3. **结合 Skill**：`/backend` → 自动 read + load rule → 最优雅
4. **接受现实**：如果追求确定性行为，需要**自己做 routing**（手动 context injection），而非依赖模型决策

### 设计潜台词

Memory 系统完美体现了"强模型弱规则"——**所有 memory 机制都是"建议"而非"命令"**。系统把信息放到模型面前，但由模型决定是否采纳。这在大多数场景下工作良好（强模型通常能做出正确判断），但在需要严格一致性的场景下会令人抓狂。

---

## 5. Skills：按需加载的专项知识

### 实现机制

Skills 是 Claude Code 的**渐进式知识披露机制**——不在启动时加载所有知识，而是在需要时按需注入。

ShareAI 教程（s05）定义：`SkillRegistry` 管理所有可用 Skills，通过 slash command（`/commit`、`/review-pr` 等）或关键词匹配触发加载。

```
用户输入 "/commit"
→ SkillRegistry 匹配到 commit skill
→ Skill 的完整 Prompt 注入当前上下文
→ 模型按照 Skill 指引执行
```

### 设计要点

Skills 的核心设计是**"廉价发现 + 深度按需加载"**（cheap discovery and deep on-demand loading）：
- 发现阶段：只需要知道 skill 名字和简短描述
- 加载阶段：完整 Prompt 模板、工具指引、工作流步骤全部注入

### 优缺点

| 优点 | 缺点 |
|------|------|
| 节省上下文：不用时不占空间 | 触发依赖模型判断或用户显式调用 |
| 模块化：每个 Skill 独立维护 | Skill Prompt 质量直接影响效果 |
| 可扩展：社区/第三方可贡献 Skills | 多个 Skill 同时加载可能冲突 |
| slash command 提供确定性触发入口 | 自动触发（关键词匹配）不如手动可靠 |

### 使用场景与注意

- **高频工作流**：用 slash command 绑定（`/commit`、`/review-pr`、`/daily`）→ 确定性触发
- **领域知识**：将特定技术栈的规范封装为 Skill → 需要时加载，不需要时不占上下文
- **注意**：Skill 的 Prompt 注入会消耗上下文空间——一个大型 Skill 可能占用数千 tokens

### 设计潜台词

Skills 是对 Context 稀缺性的直接回应——如果上下文无限大，就不需要按需加载。Skills 的存在证明了一个设计约束：**即使 200k tokens 的窗口，也不够装下所有知识**。所以系统选择了"强模型自行判断需要什么知识"的路线，而非"预先装载一切"。

---

## 6. Subagent：隔离的工作者

### 实现机制

Subagent 是一个**一次性的委托工作者**，在独立的上下文窗口中执行子任务。

ShareAI 教程（s04）：**"A subagent runs in a separate context: fresh messages, its own system prompt, its own tool set. When it finishes, only its summary returns to the parent."**

```
主 Agent：需要搜索 10 个文件中的某个模式
    ↓
生成 Subagent（独立上下文 ≈ 200k tokens）
    ↓
Subagent 执行搜索 → 返回摘要
    ↓
主 Agent 继续（上下文未被搜索过程污染）
```

### 关键概念区分

| 概念 | 定义 | 用途 |
|------|------|------|
| **Subagent** | 一次性委托工作者，独立上下文 | 执行子任务后销毁 |
| **Teammate** | 持久的协作者，有身份和收件箱 | 长期协作、多 Agent 团队 |

### 优缺点

| 优点 | 缺点 |
|------|------|
| 独立上下文：不污染主 Agent 的 messages | 启动开销：每次创建新上下文 |
| 可并行：多个 Subagent 同时执行 | 信息损失：只有摘要返回主 Agent |
| 天然的"上下文防火墙" | 无法共享主 Agent 的对话历史 |

### 使用场景与注意

- **代码搜索/探索**：让 Subagent 去搜索，主 Agent 保持干净上下文
- **并行研究**：多个 Subagent 同时调查不同方向
- **注意**：Subagent 返回的摘要是有损的——如果需要完整结果，应让 Subagent 写入文件

### 设计潜台词

Subagent 是对 Compaction 问题的架构级解答——**与其让一个 Agent 的上下文不断膨胀然后压缩，不如让子任务在独立上下文中执行**。GSD 框架将这个理念推到极致：每个执行单元都获得全新的 200k tokens 窗口。HumanLayer 博客称之为"上下文防火墙（context firewall）"——保持主线连贯性的关键设计。

---

## 7. Hooks：唯一的确定性控制点

### 实现机制

Hooks 是 Claude Code 中**唯一绕过模型决策的确定性执行机制**。它们是在特定事件前后自动执行的 Shell 命令。

```json
// settings.json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write",
      "command": "echo 'About to write a file'"
    }],
    "PostToolUse": [{
      "matcher": "Bash",
      "command": "./scripts/lint-check.sh"
    }]
  }
}
```

支持的事件点：
- `PreToolUse` / `PostToolUse`：工具调用前后
- `SessionStart`：Session 启动时
- `UserPromptSubmit`：用户提交输入时

### 设计要点

Hooks 的关键特征是**计算型控制（deterministic）**——由 CPU 执行，不经过模型判断。对应 Martin Fowler 框架中的 **Sensor（反馈控制）**，但它也可以做 Guide（前馈控制）。

### 优缺点

| 优点 | 缺点 |
|------|------|
| 100% 确定性执行——不依赖模型判断 | 只能做简单的 Shell 命令 |
| 可实现质量闸口（lint、test、format） | 配置在 settings.json 中，非项目级 |
| 执行结果可反馈给模型（影响下一轮决策） | Hook 失败会阻断工作流 |

### 使用场景与注意

- **质量闸口**：`PostToolUse` + `Write` → 自动运行 lint/format
- **安全检查**：`PreToolUse` + `Bash` → 检查危险命令
- **自动记录**：`PostToolUse` → 记录每次工具调用的 trace（为 Meta-Harness 式优化积累数据）
- **注意**：Hook 是 Session 级别的配置，不同项目可能需要不同的 Hook 组合

### 设计潜台词

**Hooks 是"强模型弱规则"设计中的安全阀。** Claude Code 把绝大多数决策权交给模型，但通过 Hooks 保留了一个"硬件中断"级别的控制点。这是整个系统中**唯一可以强制执行**的机制——其他一切（Memory、Rules、Skills）都只是"建议"。

---

## 8. Permission System：信任的光谱

### 实现机制

Permission System 控制模型是否被允许执行某个操作，是安全性和效率之间的平衡。

ShareAI 教程（s07）描述了从"完全限制"到"完全自动"的信任光谱：

| 模式 | 行为 | 适合 |
|------|------|------|
| **Ask always** | 每次工具调用都需确认 | 初次使用、敏感操作 |
| **Auto-allow reads** | 读操作自动允许，写操作需确认 | 日常开发（推荐默认） |
| **Auto-allow all** | 所有操作自动允许 | 信任度高的自动化流程 |

### 设计潜台词

Permission System 体现了一个务实的设计——**强模型不意味着盲目信任模型**。即使模型"决定"要删除一个文件，系统仍然可以要求人类确认。这是"强模型弱规则"理念中的平衡点：模型做决策，但高风险决策需要人类审批。

---

## 9. 全景视图：Context 是怎么组装的

把所有概念串起来，一次完整请求的 Context 组装流程如下：

```
Session 启动
    │
    ├── 加载 System Prompt（内置，不可改）
    ├── 加载 CLAUDE.md（全量注入）
    ├── 加载 MEMORY.md（全量注入，但不保证被使用）
    ├── 加载无条件 Rules（直接注入）
    ├── 执行 SessionStart Hooks
    │
用户输入
    │
    ├── 执行 UserPromptSubmit Hooks
    ├── 输入追加到 messages[]
    │
    ├── 检查是否匹配 Skill（slash command / 关键词）
    │   └── 是 → 注入 Skill Prompt
    │
    ├── 组装完整 payload = system + context + messages
    │
    └── 发送给模型 → 进入 Agent Loop
                          │
                          ├── 模型返回 tool_use
                          │   ├── Permission 检查
                          │   ├── PreToolUse Hook
                          │   ├── 如果读取了文件 → 检查是否匹配 Rules → 注入
                          │   ├── 执行工具
                          │   ├── PostToolUse Hook
                          │   └── 结果写回 messages → 继续循环
                          │
                          ├── Context 接近上限 → 触发 Compaction
                          │
                          └── 模型返回 end_turn → 输出给用户
```

---

## 10. 实践总结：何时该信任模型，何时该自己接管

基于以上理解，给出一个实用的决策框架：

| 需求 | 策略 | 用哪个机制 |
|------|------|----------|
| "确保模型知道项目架构" | 写入 CLAUDE.md | Memory（Guide） |
| "确保 backend 代码遵循规范" | 写 Rule + 在 CLAUDE.md 加触发器 | Rules + CLAUDE.md |
| "确保每次提交前运行 lint" | 配置 PostToolUse Hook | Hooks（Sensor，确定性） |
| "复杂任务不要上下文膨胀" | 拆分为 Subagent / 用 GSD 流水线 | Subagent / 开源 Harness |
| "特定工作流需要特定指引" | 封装为 Skill + slash command | Skills（按需 Guide） |
| "严格保证某个行为必须发生" | **只有 Hooks 可以保证** | Hooks |
| "希望模型自行判断最优做法" | 提供足够上下文，信任模型 | 默认行为（强模型） |

**一句话总结**：

> 用 CLAUDE.md 给方向，用 Rules 给建议，用 Skills 给知识，用 Hooks 给约束，用 Subagent 给空间——但始终记住：**除了 Hooks，其他一切都是"建议"，模型有权不采纳**。

---

## 参考资料

1. [ShareAI — Learn Claude Code（19 章节教程）](https://learn.shareai.run/en/)
2. [ChatGPT 讨论：Claude Code Memory 机制](https://chatgpt.com/share/69e0c10c-f858-8322-9b25-b8f4d5d21964)
3. [Meta-Harness: End-to-End Optimization of Model Harnesses](https://arxiv.org/abs/2603.28052)
4. Martin Fowler 网站（Birgitta Böckeler）— Harness 分类框架、Guides vs Sensors
5. HumanLayer Blog — Terminal Bench 2.0、Harness 配置表面分析
6. [ShareAI GitHub — learn-claude-code 教学仓库](https://github.com/shareAI-lab/learn-claude-code)
