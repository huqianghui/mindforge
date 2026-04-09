---
title: learn-claude-code——打开 Coding Agent 黑盒
created: 2026-03-21
tags: [AI, claude-code, agent, harness-engineering, open-source, coding-agent, architecture]
---

# learn-claude-code——打开 Coding Agent 黑盒

## 一句话结论

**Model 决定了 agent 能飞多高，但 Harness 决定了它飞向哪里、能不能安全着陆。** learn-claude-code 项目用 12 个渐进式 Python 实现证明了这一点：一个 30 行的 while 循环就是 agent 的本体，其余一切都是"缰绳"。

---

## 1. 一个挑衅性的论断——"Agent = Model, Not Framework"

[learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) 是一个开源教学项目，通过逆向工程和源码分析，将 Claude Code 的内部架构拆解为 12 个渐进式 Python 实现。项目开篇抛出了一个挑衅性的宣言：

> "Every one of these milestones shares the same truth: the 'agent' is never the surrounding code. The agent is always the model."

这不是一个学术定义，而是一个**工程立场**——它主张：model（Claude）才是做决策的主体，外面包裹的代码只是"缰绳"（harness），用来给 model 提供工具、知识和行动接口。

项目将这种工程哲学总结为一个公式：

```
Harness = Tools + Knowledge + Observation + Action Interfaces + Permissions
```

换句话说：你不需要复杂的 framework 来"编排" agent——你需要的是一套精心设计的 harness，让 model 自己决定做什么、怎么做。

这个观点当然有争议（我们在第 5 节会详细辩论），但它提供了一个极好的分析框架：**把 Claude Code 从"一个产品"拆解为"一个 model + 若干 harness 层"，逐层理解每一层解决了什么问题。**

这正是 learn-claude-code 的 12 个 session 要做的事——从一个 30 行的 while 循环开始，每次加一层 harness，直到还原出一个完整的 Coding Agent 系统。

---

## 2. Agent Loop——30 行代码的真相

### 核心模式：一个循环就够了

Session 01 揭示了整个 agent 系统最核心的秘密——**Agent Loop 只需要 30 行 Python**：

```python
messages = [{"role": "user", "content": task}]

while True:
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        system="You are a coding agent. Use bash to solve tasks.",
        messages=messages,
        tools=[bash_tool]
    )

    # 收集 assistant 回复
    messages.append({"role": "assistant", "content": response.content})

    # 如果 model 没有调用工具，任务完成
    if response.stop_reason != "tool_use":
        break

    # 执行工具调用，将结果回灌
    for block in response.content:
        if block.type == "tool_use":
            result = execute_bash(block.input["command"])
            messages.append({
                "role": "user",
                "content": [{"type": "tool_result", "tool_use_id": block.id, "content": result}]
            })
```

就这么多。**"One loop & Bash is all you need"**——model 接收消息、决定是否调用工具、观察结果、再决定下一步。这个循环就是 agent 的全部"本体"。

### Dispatch Map——加工具不改循环

Session 02 引入了 Tool Dispatch 模式。关键设计：**添加新工具只需要往 dispatch map 里加一行，agent loop 本身一字不改**：

```python
TOOL_HANDLERS = {
    "bash":       lambda **kw: run_bash(kw["command"]),
    "read_file":  lambda **kw: run_read(kw["path"], kw.get("limit")),
    "write_file": lambda **kw: run_write(kw["path"], kw["content"]),
    "edit_file":  lambda **kw: run_edit(kw["path"], kw["old_text"], kw["new_text"]),
}
```

同时引入了 **path sandboxing**——`safe_path()` 函数通过 `path.is_relative_to(WORKDIR)` 确保所有文件操作不会逃逸出工作目录。这是 harness 的第一个安全约束。

### 30 行 vs 生产版

对比 Claude Code 的实际实现，核心循环是一样的——都是 `while stop_reason == "tool_use"`。区别在于：

| 维度 | 教学版（30 行） | Claude Code 生产版 |
|---|---|---|
| 工具数量 | 1（bash） | 20+（Read/Write/Bash/Glob/Grep/Agent/LSP...） |
| 安全机制 | 命令黑名单 | 多层权限模型 + user confirmation |
| Context 管理 | 无 | 自动压缩 + token 估算 |
| 错误处理 | 基础 try/catch | 重试、超时、输出截断 |
| 知识加载 | 硬编码 system prompt | CLAUDE.md + Skills + Memory |

**这张表的核心信息是：agent 的"智能"来自 model，agent 的"可靠性"来自 harness。** 30 行代码能跑 demo，但从 30 行到生产，中间是 12 层 harness 的距离。

---

## 3. 从循环到系统——12 Sessions 的渐进式解构

learn-claude-code 的 12 个 session 可以按复杂度分为三个梯队：

| 梯队 | Sessions | 解决的问题 | 对应 Claude Code 机制 |
|---|---|---|---|
| **基础层** | S01-S03 | Agent 能做什么 | Agent Loop / Tool Dispatch / TodoWrite |
| **隔离层** | S04-S06 | Agent 怎么管理注意力 | Subagent / Skill Loading / Context Compression |
| **协作层** | S07-S12 | 多个 Agent 怎么协同 | Task System / Background / Teams / Protocols / Autonomous / Worktree |

### 基础层（S01-S03）：让 Agent 能做事

- **S01 Agent Loop**：前面已详述——while 循环 + bash 工具
- **S02 Tool Dispatch**：dispatch map 模式 + path sandboxing
- **S03 TodoWrite**：引入任务追踪，model 在执行前先列 plan，**强制同一时间只有一个任务处于 in_progress 状态**。当 model 连续 3 轮没有调用 todo 工具时，系统自动注入提醒消息——这是 harness 的"行为纠偏"能力的第一次展现

### 隔离层（S04-S06）：让 Agent 管好注意力

**S04 Subagent** 是最关键的架构课之一。核心洞察：

> **"Process isolation gives context isolation for free."**

Parent agent 维持持久的 `messages=[...]`，child agent 从空的 `messages=[]` 开始。两者之间的交互极其克制：

```
Parent                          Child (Subagent)
┌──────────────────┐           ┌──────────────────┐
│ 完整对话历史       │   仅传    │ 空白 context      │
│ 所有工具调用记录    │ ──────→  │ 只有 prompt 参数   │
│ 全量 system prompt │  prompt  │ 独立 system prompt │
└────────┬─────────┘           └────────┬─────────┘
         │                              │
         │    ←── 仅返回最终摘要文本 ──────┘
         │         （中间过程全部丢弃）
```

更精妙的是**工具分层**：child 只能用基础工具（bash / read / write / edit），不能调用 `task` 工具——这防止了 subagent 递归生成 subagent 的失控行为。这和 Claude Code 的实际设计完全一致（参见 [[Claude Code的Agent与Subagent架构解析——以Superpowers为例]]）。

**S05 Skill Loading** 实现了**两层按需加载**——system prompt 中只放简短的 skill 摘要（~100 tokens/skill），完整内容通过 `load_skill()` 工具在需要时才加载（~2000 tokens）。这是 Context Engineering 的经典模式：**不要预加载所有知识，让 model 自己决定什么时候需要什么知识。**

**S06 Context Compression** 是 harness 工程最精彩的部分——三层压缩策略：

| 层级 | 触发条件 | 机制 | 信息损失 |
|---|---|---|---|
| **Micro-compact** | 每轮自动执行 | 将 3 轮之前的工具结果替换为 `"[Previous: used {tool_name}]"` | 低（只丢细节） |
| **Auto-compact** | token 估算 > 50K | 全量对话存档到 `.transcripts/`，LLM 生成摘要替代原文 | 中（保留关键决策） |
| **Manual compact** | Model 主动调用 `compact` 工具 | 同 auto-compact | 中 |

这三层策略的设计哲学是：**context window 是最稀缺的资源，harness 的核心职责之一就是帮 model 管理这个资源。** 生产中的 Claude Code 也遵循类似的分层压缩逻辑。

### 协作层（S07-S12）：让多个 Agent 协同工作

| Session | 核心机制 | 关键设计 |
|---|---|---|
| **S07 Task System** | 持久化 task DAG（`.tasks/*.json`） | blockedBy/blocks 依赖关系，完成一个 task 自动解锁下游 |
| **S08 Background Tasks** | Daemon 线程 + 异步通知 | 长时间命令（npm install / pytest）不阻塞 agent 主循环 |
| **S09 Agent Teams** | JSONL message bus（`.team/inbox/*.jsonl`） | 每个 agent 有独立收件箱，drain-on-read 消费模式 |
| **S10 Team Protocols** | Shutdown / Plan Approval FSM | UUID 关联请求-响应，防止中途终止未完成操作 |
| **S11 Autonomous Agents** | 自主任务认领 + idle 轮询 | `threading.Lock` 原子认领，5s 轮询间隔，60s idle 超时 |
| **S12 Worktree Isolation** | `git worktree add` 文件隔离 | 控制平面（`.tasks/`）vs 执行平面（`.worktrees/`），event sourcing 审计日志 |

从 S07 到 S12，系统从"一个 agent 做一件事"演进到"多个 agent 在隔离的文件空间中自主认领和执行任务"。这对应了 Claude Code 从单 session 到 subagent 并行、再到 worktree 隔离的完整架构光谱。

---

## 4. Harness 公式拆解——五个维度的工程对照

项目的 harness 公式 `Harness = Tools + Knowledge + Observation + Action Interfaces + Permissions` 不是抽象口号，每个维度都有具体的工程实现。以下是教学版与生产版的对照：

| Harness 维度 | learn-claude-code 教学实现 | Claude Code 生产实现 |
|---|---|---|
| **Tools** | dispatch map + 4 基础工具 + path sandboxing | 20+ 工具（Read/Write/Bash/Glob/Grep/Agent/LSP...）+ MCP 扩展 |
| **Knowledge** | Skill Loading 两层按需加载（S05） | CLAUDE.md 层级加载 + Skills + Memory 持久化 + Hook 注入 |
| **Observation** | 工具结果直接回灌 messages | 工具输出 + 错误信息 + context compression + token 估算 |
| **Action Interfaces** | JSON schema 工具定义 | Structured tool_use API + 子类型化 agent 调度 |
| **Permissions** | 路径白名单 + 命令黑名单 | 多层权限模型（auto-allow / ask / deny）+ user confirmation |

这张表的启示是：**harness 的每个维度在教学版中都有最简实现，生产版只是在同一框架上做了深度增强。** 架构是一样的，差别在于工程深度。

这也印证了 [[Vibe Coding系列02：架构师视角的AI Harness Engineering最佳实践]] 中提出的观点：Harness Engineering 的核心不是发明新概念，而是在五个已知维度上做到足够深——Tool 要安全、Knowledge 要按需、Observation 要压缩、Interface 要结构化、Permission 要分层。

---

## 5. "Model IS the Agent" 辩论——一个必要的纠偏

learn-claude-code 的核心立场是 "Agent = Model"。看完 12 个 session 的技术实现后，有必要对这个论断做一次严肃的辩论。

### 正方："Agent = Model" 的合理性

项目的论据是有力的：

1. **决策全在 model**——规划、工具选择、错误修复、任务分解，都是 model 在做
2. **harness 是被动的**——dispatch map 不做决策，只做执行；path sandboxing 不做判断，只做约束
3. **同一个 harness + 不同 model = 完全不同的 agent 能力**——换一个弱 model，harness 不变，但 agent 表现天差地别

这些都是事实。从这个角度看，说"model 就是 agent"确实有道理。

### 反方：生产环境讲的是另一个故事

但如果你在生产环境部署过 AI agent，你会知道另一面：

| 组件 | 重要性占比 | 说明 |
|---|---|---|
| Model | ~30% | 决定能力上限，但**往往是最容易替换的层** |
| Tools & Integration | ~30% | 没有工具的 model 只能"说"不能"做" |
| Orchestration / Harness | ~40% | 重试逻辑、超时控制、成本管理、安全边界——这些不是"智能"，但决定了**系统能否上线** |

**Benchmark 世界和生产世界的根本区别**：在 benchmark 中，工具完美可用、环境完全可观测、没有延迟和成本——这让 model 看起来无所不能。但在生产中，API 会挂、context window 会溢出、工具返回脏数据、用户给出模糊需求。这些都需要 harness 来兜底。

### 更深层的问题：Transformer 的结构性局限

Transformer 是一个**无状态函数**——给定输入，产生输出，权重在推理时不更新。它没有真正的持续学习能力、没有长期记忆、没有在线适应。

这意味着 agent 所需的"记忆"、"经验积累"、"行为调整"，**全部依赖外部系统**——vector DB、episodic memory、context compression、CLAUDE.md 里的指令。这些外部系统就是 harness。

如果 model 真的"就是" agent，那它应该能自己管理记忆、自己学习新技能。但现实是：**当前的 LLM agent 是"假装在学习"——model 本身不变，变的是 harness 提供的 context。**

### 辩证结论

更准确的说法不是 "Agent = Model"，而是：

```
Agent = Model × (Tools + Memory + Environment + Constraints)
```

这是一个**乘法关系**——model 是核心乘数，但乘数为零则一切为零。没有 Tools，model 只能"说"；没有 Memory，model 每次从零开始；没有 Constraints，model 会产生危险操作。

**Harness 的本质定义是：对概率系统的确定性约束器。** Model 是概率性的（每次输出都有随机性），harness 是确定性的（权限边界、路径白名单、超时限制不会随机变化）。生产级 agent 需要两者的结合。

---

## 6. 三层模型——Spec / Harness / Infra 的工程分野

在"Model vs Agent"的辩论之上，可以进一步抽象出一个三层架构模型：

```
┌─────────────────────────────────────────────────────────┐
│                    Spec Layer                           │
│           定义"什么是正确的"                                │
│     OpenSpec / Superpowers brainstorm / baseline spec   │
│     test cases / acceptance criteria                    │
├─────────────────────────────────────────────────────────┤
│                   Harness Layer                         │
│           确保"按正确的方式执行"                            │
│     CLAUDE.md / Skills / Agent definitions              │
│     Context compression / Permissions / Tool dispatch   │
├─────────────────────────────────────────────────────────┤
│                    Infra Layer                          │
│           提供"在哪里运行"                                 │
│     API hosting / Token billing / Model routing         │
│     Container orchestration / CI/CD                     │
└─────────────────────────────────────────────────────────┘
```

三层的职责边界：

| 层 | 核心问题 | 产出物 | 负责人 |
|---|---|---|---|
| **Spec** | 做什么？ | 需求文档、测试用例、验收标准 | 产品/架构师 |
| **Harness** | 怎么控制？ | CLAUDE.md、Skills、Agent 定义、权限配置 | Harness Engineer |
| **Infra** | 在哪里跑？ | 部署配置、计算资源、监控告警 | 平台/SRE |

这个三层模型揭示了一条清晰的**工程演进路线**：

```
Prompt Engineering        →  Context Engineering     →  Harness Engineering
（优化 model 的输入）        （设计 model 的环境）        （控制 model 的行为）
```

- **Prompt Engineering** 关注"怎么写 prompt 让 model 输出更好"——是输入级优化
- **Context Engineering** 关注"怎么组织 context window 里的信息"——是环境级设计
- **Harness Engineering** 关注"怎么用工具、权限、协议约束 model 的行为边界"——是系统级控制

learn-claude-code 的 12 个 session 几乎全部落在 **Harness Layer**：

| Session | 层级 | 说明 |
|---|---|---|
| S01-S02 | Harness（Action Interfaces） | Agent Loop + Tool Dispatch |
| S03 | Harness（Observation） | TodoWrite 行为追踪 |
| S04 | Harness（Permissions + Isolation） | Subagent context 隔离 |
| S05 | Harness（Knowledge） | Skill 按需加载 |
| S06 | Harness（Observation） | Context 三层压缩 |
| S07-S08 | Harness（Action Interfaces） | Task DAG + Background Tasks |
| S09-S12 | Harness（Action + Permissions） | 多 Agent 协作协议 |

**这证明了 Coding Agent 的核心工程不在 model 层（模型能力由 Anthropic 提供），也不在 infra 层（基础设施由云平台提供），而在 harness 层——这是开发者/架构师需要深度投入的地方。**

---

## 7. 从教学到生产——三个核心启示

learn-claude-code 是教学项目，但它揭示的模式对生产有直接指导意义。

### 启示一：Context 是最稀缺的资源

S06 的三层压缩策略不是"优化"，而是"生存"——不压缩，agent 读 30 个文件后就 context overflow 了。

生产中的对策是一脉相承的：

```
CLAUDE.md 分层加载      ← 不要在 system prompt 里塞所有信息
Skill 按需加载          ← 摘要在前，完整内容按需展开
Subagent context 隔离   ← 每个子任务一个干净的 context
三层压缩策略             ← 旧信息逐步降级，关键决策保留
```

**设计 harness 的第一原则：像管理内存一样管理 context——分配、回收、分层、隔离。**

### 启示二：隔离是扩展的前提

S04 的核心洞察 "Process isolation gives context isolation for free" 在生产中同样成立。Claude Code 的 subagent 从空白 context 启动、独立执行、只返回摘要——这不是"限制"，而是"保护"。

隔离的价值链：

```
Context 隔离（S04 Subagent）  → 每个 agent 只看自己需要看的
文件系统隔离（S12 Worktree）   → 多个 agent 同时改代码不冲突
执行隔离（S08 Background）    → 长任务不阻塞主循环
```

**没有隔离就没有并行，没有并行就无法扩展。**

### 启示三：协作需要协议，而非共享

S09-S10 设计的 JSONL message bus 和 FSM protocols 传递了一个反直觉的信息：**多 agent 之间不应该共享 context，而应该通过结构化消息通信。**

这和微服务架构的理念一致——"share nothing, communicate through APIs"。在 agent 世界里：

- 共享 context = 紧耦合 → 一个 agent 的噪音污染另一个 agent 的判断
- 消息通信 = 松耦合 → 每个 agent 独立决策，通过协议协同

Claude Code 的实际设计也遵循这一原则：subagent 之间零共享，主 agent 通过 prompt 分发任务、收集摘要。

---

## 8. 总结

### 核心 Takeaways

1. **Agent 的本体确实极简**——一个 `while stop_reason == "tool_use"` 循环，~30 行 Python，这就是 agent 的全部"决策引擎"
2. **但 30 行不能上生产**——从 30 行到 Claude Code，中间是 12 层 harness 的工程距离：安全约束、context 管理、任务调度、隔离机制、协作协议
3. **Harness 不是 framework**——Framework 提供能力（"你能做什么"），Harness 提供约束（"你不能做什么、应该怎么做"）。Harness 是**对概率系统的确定性约束器**
4. **"Agent = Model" 是趋势判断，不是架构定义**——Model 会持续吸收简单的规划和路由能力，但跨系统编排、可靠性工程、安全边界永远是 harness 的领地
5. **工程演进路径清晰**：Prompt Engineering → Context Engineering → Harness Engineering，从优化输入到设计环境再到控制行为
6. **learn-claude-code 的真正价值**：不是教你造一个 Claude Code，而是教你理解"缰绳"的设计哲学——当你理解了每一层 harness 解决什么问题，你就能为自己的 agent 设计合适的缰绳

**打开黑盒之后你会发现，里面不是一个复杂的引擎，而是一个简单的引擎 + 一套精心设计的缰绳系统。理解这套缰绳，就是理解 Coding Agent 工程的全部。**

---

## 相关文章

- [[Claude Code的Agent与Subagent架构解析——以Superpowers为例]] — Subagent 的 context 隔离架构深度解析
- [[Claude Code扩展三剑客：Command、Skill与Agent的区别与协作]] — Command / Skill / Agent 三层扩展体系
- [[Vibe Coding系列02：架构师视角的AI Harness Engineering最佳实践]] — Harness Engineering 的实践框架与五大支柱
- [[Vibe Coding系列03：AI-Native开发实践——从Figma设计到Superpowers Brainstorm再到Spec-Delta工作流]] — 五层 AI pipeline 全景

## 参考资料

- [learn-claude-code GitHub](https://github.com/shareAI-lab/learn-claude-code) — Claude Code 逆向工程与教学项目
- [ChatGPT 讨论：Model vs Agent 辩论](https://chatgpt.com/share/69be14db-1ec8-8010-9130-111d936b969f) — 六轮深度对话
- [ChatGPT 讨论：Agent 与 Model 的关系](https://chatgpt.com/share/69be14f4-0624-8010-9529-96f2be2b9ef2) — 生产视角的反思
