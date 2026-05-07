---
title: Hermes Agent vs OpenClaw 深度技术对比
created: 2026-05-07
tags: [AI-Agent, Hermes, OpenClaw, Multi-Agent, Self-Improving-Agent]
---

# Hermes Agent vs OpenClaw 深度技术对比

## 概述

Hermes Agent（Nous Research）和 OpenClaw 是 2026 年最受关注的两个开源 AI Agent 框架。Hermes 定位为"自我成长的 Agent"，强调持久记忆和自主学习；OpenClaw 定位为"真正能办事的 AI"，强调多 Agent 并行和实用自动化。本文从架构、学习机制、多 Agent 协作等维度进行深度对比，并重点分析四个关键技术细节。

---

## 1. 项目定位对比

| 维度 | Hermes Agent | OpenClaw |
|------|-------------|----------|
| 定位 | 自我改进的自主 Agent | 个人全能助理 |
| 核心理念 | "The agent that grows with you" | "The AI that actually does things" |
| 目标用户 | 专业开发者、AI 研究者 | 广泛开发者、个人用户 |
| 开发组织 | Nous Research 实验室 | 社区基金会（创始人已加入 OpenAI） |
| 实现语言 | Python (MIT) | TypeScript + Swift (MIT) |
| GitHub Stars | 132k+ | 369k+ |

---

## 2. 架构差异

### Hermes Agent：单体自主进程

Hermes 采用**单 Agent 持久进程**架构：一个 AIAgent 对象包含提示构建、LLM Provider、工具调度、持久记忆（SQLite + FTS5）等模块。通过 Gateway 对接 CLI / Telegram / Discord 等 15+ 平台。

```
┌─────────────────────────────────────────┐
│              Hermes Agent               │
│  ┌──────────┐  ┌──────────┐  ┌───────┐ │
│  │ Prompt   │  │ LLM      │  │ Tool  │ │
│  │ Builder  │  │ Provider │  │ Sched │ │
│  └──────────┘  └──────────┘  └───────┘ │
│  ┌──────────┐  ┌──────────┐  ┌───────┐ │
│  │ Memory   │  │ Skill    │  │Curator│ │
│  │ (SQLite) │  │ System   │  │       │ │
│  └──────────┘  └──────────┘  └───────┘ │
└───────────────────┬─────────────────────┘
                    │ Gateway
        ┌───────────┼───────────┐
        CLI      Telegram     Slack
```

### OpenClaw：Gateway + Node 分布式

OpenClaw 采用**控制面 + 执行面分离**的分布式架构：Gateway 管理通讯连接和调度，Agent Node 是实际执行实例。

```
┌─────────────────┐     WebSocket      ┌──────────────┐
│    Gateway      │◄──────────────────►│  Agent Node1 │
│  (控制平面)      │                    │  ┌────────┐  │
│  - 渠道管理     │     WebSocket      │  │LLM进程 │  │
│  - 消息路由     │◄──────────────────►│  └────────┘  │
│  - 心跳调度     │                    │  ┌────────┐  │
│  - WebSocket API │     WebSocket     │  │沙箱环境 │  │
│                 │◄──────────────────►│  └────────┘  │
└─────────────────┘                    │  ┌────────┐  │
     │                                 │  │Memory  │  │
     ▼                                 │  └────────┘  │
┌─────────┐                            └──────────────┘
│WhatsApp │                            ┌──────────────┐
│ Slack   │                            │  Agent Node2 │
│ 微信    │                            └──────────────┘
└─────────┘
```

---

## 3. 深度分析：四个关键问题

### 问题一：Hermes Skill 自动生成的触发条件

Hermes 的 Skill 自动学习是其最核心的差异化能力。根据官方文档和社区实践，触发机制如下：

#### 触发条件

Skill 自动生成并**不是**一个固定 cron 定时任务，而是基于**工具调用计数器**的启发式机制：

- **每 15 次工具调用**（tool calls），Agent 会暂停当前执行流，回顾本次会话中哪些模式"worked"（成功执行的工具链组合）
- 如果检测到可复用的流程模式，自动将其总结为一个 Skill 文件保存到 `~/.hermes/skills/`
- 这是一个**异步后台过程**——Agent 在自己的 prompt cache 中 fork 一个辅助 AIAgent 实例来执行生成，不阻塞当前对话

#### 是否可定制/手动触发？

**可以。** Hermes 提供了多层控制：

| 方式 | 命令/配置 | 说明 |
|------|----------|------|
| 手动创建 | 在 `~/.hermes/skills/` 下新建 `SKILL.md` | 完全手写 Skill，无需 Agent 参与 |
| CLI 管理 | `hermes skills list` / `hermes skills inspect <id>` | 查看、检查已有 Skill |
| 对话中指令 | 直接告诉 Agent "save this as a skill" | Agent 使用 `skill_manage` 工具立即创建 |
| `skill_manage` 工具 | Agent 内置工具，可创建/修改/删除 Skill | 代码级自由度最高 |
| Hub 安装 | `hermes skills install <name>` | 从 agentskills.io 社区安装 |
| 配置阈值 | `config.yaml` 中调整学习 loop 参数 | 可修改触发频率 |

**SKILL.md 的触发条件定义**也支持声明式配置：

```yaml
---
name: research-digest
description: Summarize research papers into structured notes
trigger: "when the user asks to summarize a paper or PDF"
platforms: [macos, linux]
requires_toolsets: [web]
requires_tools: [web_search]
---
```

`trigger` 字段定义 Agent 何时应该自动加载该 Skill（语义匹配），`platforms` / `requires_toolsets` 限定运行条件。

---

### 问题二：生成的 Skill 是否可评估/校验/人工审核？

**可以，且 Hermes 为此设计了专门的 Curator 系统。**

#### Curator：Skill 生命周期管理器

Curator 是一个**后台维护引擎**，专门管理 Agent 自动创建的 Skill 的质量和生命周期：

**状态流转**：`active → stale → archived`

- 跟踪每个 Skill 的**查看次数、使用次数、修补次数**
- 长期未使用的 Skill 会自动标记为 `stale`，最终归档到 `~/.hermes/skills/.archive/`
- **永远不会自动删除**——最坏情况是归档，可随时恢复

**Curator 的触发条件**：

1. 距离上次 Curator 运行超过 `interval_hours`（默认 7 天）
2. Agent 已空闲超过 `min_idle_hours`（默认 2 小时）
3. 在 CLI 启动时或 Gateway 的 cron-ticker 线程中检查

满足条件后，Curator 会 fork 一个辅助 LLM 实例进行审查，提出合并建议或修补 drift。

#### 人工审核命令

```bash
# 查看 Curator 状态（上次运行、统计、LRU 排名）
hermes curator status

# 手动触发审查（后台执行）
hermes curator run

# 同步执行（阻塞等待 LLM 审查完成）
hermes curator run --sync

# 预览模式：只报告不修改（dry-run）
hermes curator run --dry-run

# 手动备份当前 Skill 库
hermes curator backup

# 回滚到某个快照
hermes curator rollback --list    # 列出可用快照
hermes curator rollback --id <ts> # 回滚到指定时间点

# Pin 重要 Skill（永不自动归档）
hermes curator pin <skill-name>

# 恢复已归档的 Skill
hermes curator restore <skill-name>

# 暂停/恢复 Curator
hermes curator pause
hermes curator resume
```

#### Skill Validation（Issue #416，社区进展中）

当前 `skill_manage` 创建 Skill 时**尚缺自动化质量检查**（如 Python 语法验证、YAML 格式校验等）。这是已知的待改进项（GitHub Issue #416），社区正在推进 Skill Linting 功能。

**当前的人工审核最佳实践**：
1. 使用 `hermes curator run --dry-run` 预览 Curator 建议
2. 定期 `hermes skills list` 检查 Skill 目录
3. 直接阅读 `~/.hermes/skills/` 下的 Markdown 文件（人类可读）
4. 使用 `hermes curator pin` 保护验证过的高质量 Skill

---

### 问题三：OpenClaw 多 Agent Node 的任务编排机制

**关键结论：Gateway 不做任务编排。编排由"Orchestrator Agent"（编排者 Agent）负责，它本身也是一个 Agent Node。**

#### 编排模式：Orchestrator Pattern

OpenClaw 的多 Agent 协作采用**分层委托模式**（hierarchical delegation），核心工具是 `sessions_spawn`：

```
┌─────────────────────────────────────────────────┐
│                    Gateway                       │
│   (纯通讯层：消息路由 + 心跳 + WebSocket)         │
│   ⚠️ Gateway 不参与任务编排！                     │
└──────────────────────┬──────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌──────────────────┐      ┌──────────────┐
│ Orchestrator     │      │ Independent  │
│ Agent (主编排者)  │      │ Agent Node   │
│                  │      │ (独立运行)    │
│ 拥有工具：        │      └──────────────┘
│ - sessions_spawn │
│ - sessions_list  │
│ - sessions_result│
│                  │
│ ┌──────────────┐ │
│ │ 分解任务      │ │
│ │ 分发子任务    │ │
│ │ 收集结果     │ │
│ │ 综合报告     │ │
│ └──────────────┘ │
└────────┬─────────┘
         │ sessions_spawn (非阻塞)
    ┌────┼────┬────────┐
    ▼    ▼    ▼        ▼
┌─────┐┌─────┐┌─────┐┌─────┐
│Sub-1││Sub-2││Sub-3││Sub-4│
│搜索 ││分析 ││写作 ││校验 │
└─────┘└─────┘└─────┘└─────┘
```

#### 具体机制

1. **Orchestrator Agent** 是一个普通的 Agent Node，但 system prompt 中被指示为"协调者"角色
2. 它通过 `sessions_spawn` 工具创建子 Agent（Sub-agent），该调用**非阻塞**，立即返回 `{ status: "accepted", runId, childSessionKey }`
3. 子 Agent 在独立 session 中执行任务，完成后结果可通过 `sessions_result` 收集
4. Orchestrator 综合所有子任务结果后输出最终答案

#### 配置示例（`openclaw-team.yaml`）

```yaml
name: research-team
agents:
  coordinator:
    model: claude-3-5-sonnet
    system: |
      You are the research coordinator. Decompose tasks and
      delegate them to specialized subagents in parallel.
      After receiving all results, synthesize a coherent report.
    skills:
      - task-delegation
      - report-synthesis
    subagents:
      - web-scraper
      - data-analyst
      - report-writer
  web-scraper:
    model: gpt-4o-mini
    system: |
      You are the web scraper. Extract structured info from web pages.
    skills:
      - web-search
      - html-parser
    timeout: 30s
  data-analyst:
    model: claude-3-5-sonnet
    skills:
      - data-analysis
      - chart-generation
team:
  coordination_mode: orchestrator
  max_parallel_agents: 3
  timeout: 300s
  shared_memory: true
```

#### Skill-Based Routing（技能路由）

Orchestrator 可以根据子任务所需的 Skill 自动路由到对应的子 Agent：

```yaml
routing_strategy: skill-based
routing_rules:
  - skill: "web-search"
    route_to: "web-scraper"
  - skill: "data-analysis"
    route_to: "data-analyst"
  - skill: "code-execution"
    route_to: "code-runner"
  - skill: ""  # 默认路由
    route_to: "general-assistant"
```

**总结**：OpenClaw 没有一个独立的"Master Agent 调度器"作为基础设施组件。编排逻辑由**用户指定的 Orchestrator Agent**（一个普通 Node）通过 `sessions_spawn` 实现。Gateway 只负责通讯。

---

### 问题四：OpenClaw 的 Agent Node 内是否包含多 Agent / Sub-Agent？

**是的。单个 Agent Node 可以在内部 spawn 多个 Sub-Agent。**

#### Sub-Agent 机制

Sub-Agent 是从一个运行中的会话（parent session）**衍生出的后台 worker**，运行在独立的 session 中：

- 每个 Sub-Agent 有自己的**独立上下文、工具权限、model 配置**
- Sub-Agent 执行完成后，结果 post back 给父 Agent
- 支持使用**不同模型**（如主 Agent 用 Claude Opus，Sub-Agent 用 GPT-4o-mini 降低成本）

#### 嵌套层级（Nested Sub-Agents）

OpenClaw 支持**多层嵌套**：

```json
{
  "agents": {
    "defaults": {
      "subagents": {
        "maxSpawnDepth": 2,        // 允许子Agent再spawn子Agent（默认1）
        "maxChildrenPerAgent": 5,  // 每个session最多5个活跃子Agent
        "maxConcurrent": 8,        // 全局并发上限
        "runTimeoutSeconds": 900   // 超时控制
      }
    }
  }
}
```

**嵌套层级权限**：
| 深度 | 角色 | 权限 |
|------|------|------|
| Depth 0 | Main Agent | 完全工具权限 |
| Depth 1 (orchestrator, 当 maxSpawnDepth >= 2) | 编排者 | 拥有 `sessions_spawn`, `sessions_list`, `sessions_history` |
| Depth 1 (leaf, 当 maxSpawnDepth == 1) | 叶子执行者 | 无 session 工具 |
| Depth 2 | 叶子 worker | 无 session 工具，不能再 spawn |

最大嵌套深度为 5（`maxSpawnDepth` 范围 1-5），推荐 2 层：`Main → Orchestrator → Workers`。

#### 两种多 Agent 模式并存

OpenClaw 实际上支持两种不同的多 Agent 模式，常被混淆：

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| **Persistent Agents**（持久 Agent） | 多个独立 Agent 绑定到不同 Channel，各自运行 | 不同功能域的独立助理 |
| **Sub-Agents**（子 Agent） | 从对话中按需 spawn 的后台 worker | 并行任务处理、降低成本 |

**可以组合使用**：一个 Persistent Orchestrator Agent 处理主对话，同时 spawn 多个 Sub-Agent 并行执行子任务。

#### 单 Node 内的隔离性

虽然多个 Agent / Sub-Agent 运行在同一个 Gateway 进程中，但它们之间是**逻辑隔离**的：
- 各自独立的工作区目录（workspace）
- 各自独立的 Memory 文件
- 各自独立的 Skills 配置
- 各自独立的认证凭证（auth-profiles）

---

## 4. 对比总结

| 维度 | Hermes Agent | OpenClaw |
|------|-------------|----------|
| **学习机制** | 每 15 次工具调用自动总结 Skill；Curator 系统管理生命周期 | Agent 可通过对话自行编写 Skill；无自动学习 loop |
| **Skill 审核** | Curator dry-run + pin/archive + 备份回滚；Validation 待完善 | 依赖社区审核（ClawHub）；曾爆出恶意 Skill 事件 |
| **多 Agent 编排** | 单体为主，通过子代理并行 | Orchestrator Pattern + sessions_spawn 分层委托 |
| **Node 内多 Agent** | 不适用（单进程架构） | 支持 Nested Sub-Agent（最深 5 层，推荐 2 层） |
| **编排角色** | Agent 自身规划和执行 | 用户指定 Orchestrator Agent（非 Gateway） |
| **并行上限** | 由计算资源决定 | maxConcurrent（默认 8）+ maxChildrenPerAgent（默认 5） |

---

## 5. 选型建议

### 选 Hermes Agent 的场景

- 需要 Agent 随时间**自动积累和改进**工作流
- 对 Skill 质量有严格要求（Curator 提供生命周期管理）
- 需要在**安全可控**环境下运行（无远程数据上传、命令审批机制）
- 适合研究型、深度定制型场景

### 选 OpenClaw 的场景

- 需要**多个 Agent 并行协作**完成复杂任务
- 需要集成 50+ 渠道/服务的即用型自动化
- 需要灵活的**分布式部署**（多 Node 跨设备）
- 适合个人生产力、团队自动化场景

### 互补方案

两者并非对立。可以先用 OpenClaw 快速验证 Agent 自动化的价值，再用 Hermes 构建更安全可控、持续进化的专业 Agent 方案。Hermes 甚至提供了 `hermes claw migrate` 迁移工具，方便从 OpenClaw 转移。

---

## 参考来源

- [Hermes Agent 官方文档](https://hermes-agent.nousresearch.com/docs)
- [Hermes Curator 文档](https://hermes-agent.nousresearch.com/docs/user-guide/features/curator)
- [Hermes Creating Skills](https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills)
- [OpenClaw Sub-agents 文档](https://docs.openclaw.ai/tools/subagents)
- [OpenClaw Multi-Agent 深度解析](https://www.meta-intelligence.tech/en/insight-openclaw-multi-agent)
- [LumaDock: How to run multiple OpenClaw agents](https://lumadock.com/tutorials/openclaw-multi-agent-setup)
- [Hermes Agent Guide for PMs](https://www.news.aakashg.com/p/hermes-agent-guide)
- [OpenClaw Design Patterns: Orchestration](https://kenhuangus.substack.com/p/openclaw-design-patterns-part-3-of)
