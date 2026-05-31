---
title: Agentic Engineering——质量与成本的一体化优化
created: 2026-05-31
tags:
  - agentic-engineering
  - harness-engineering
  - token-optimization
  - finops
  - coding-agent
---

# Agentic Engineering——质量与成本的一体化优化

> Harness Engineering 驱动的任务成功率提升——以 GitHub Copilot / Codex 跨平台最佳实践为例

## 一、问题：Agent 时代的成本与质量困境

2026 年，Coding Agent 全面进入 CLI + 多工具协作阶段。Claude Code、Codex CLI、GitHub Copilot Agent 三大平台同时发力，开发者从"补全式"辅助迈入"自主编程"新范式。然而，随着 GitHub Copilot UBB（Usage-Based Billing）按量计费于 2026/06/01 正式生效，以下场景已从"体验问题"变成"真金白银的成本问题"：

- **账单突然翻倍**：上月 $800，这月 $2,400——什么都没改，为什么贵了这么多？
- **Agent 跑飞 20+ 轮**：一个简单 Bug Fix，Agent 陷入循环烧掉 150K tokens，最后还是人工修复
- **成功率随步骤骤降**：单步 95% 准确 → 20 步级联仅 36%（0.95^20）
- **MCP 工具全开白烧 Token**：15 个 MCP Server、187 个工具，每步注入 17K schema tokens，72% 完全没用过
- **上下文腐化**：Session 超过 50% 容量后，模型开始"忘记"早期指令，输出质量断崖下降
- **不知道钱花在哪里**：没有 Token 归因 → 无法优化，月底才发现超支

### 成本快速估算

以 50 人团队为例：

```
50 开发者 × 8 次 Agent/天 × 40K tokens/次
= 每日 1600 万 tokens
= 每月 3.52 亿 tokens
Sonnet 模型: ~$1,760/月（仅 Agent 模式）
```

**核心洞察**：Token = 钱。更少 Token = 更快响应 + 更少上下文污染 + 更高任务成功率。优化 Token 不仅是省钱，更是提升质量。

## 二、概念辨析：Agentic Engineering vs Harness Engineering

在深入优化方案之前，需要厘清两个容易混淆的概念：

**Agentic Engineering（智能体工程）** 是一个学科/领域——关注如何构建可靠、高效、可治理的 Agent 系统。它涵盖从质量保障、成本优化到组织级 FinOps 的完整实践体系。出发点是：模型能力已跨过门槛，核心挑战从"让模型更强"转向"让系统更稳"。

**Harness Engineering（驾驭工程）** 是 Agentic Engineering 中的核心技术方法论——具体解决"如何控制 Agent 运行"的问题。Harness 是包裹在 Agent 外部的控制系统，负责上下文管理、工具编排、评估循环、安全护栏等运行时机制。

两者关系：

```
Agentic Engineering（学科）
├── Harness Engineering（技术方法论）—— HOW：怎么控制 Agent
│   ├── Context 管理（输入什么、何时清理）
│   ├── 工具编排（用什么、怎么调）
│   ├── 评估循环（谁判断好坏）
│   └── 安全护栏（边界在哪）
├── FinOps（组织能力）—— WHO：谁来治理成本
│   ├── 可见性与归因
│   ├── 预算与策略
│   └── 持续运营循环
└── 质量工程（系统可靠性）—— WHAT：保障什么指标
    ├── 任务成功率
    ├── 级联失败防护
    └── 上下文腐化防治
```

简言之：**Agentic Engineering 是"做什么"，Harness Engineering 是"怎么做"**。本文的技术优化部分（六大工具、SDLC 实战）属于 Harness Engineering 范畴；组织级 FinOps 则属于 Agentic Engineering 的更广视角。

## 三、根因：为什么需要 Agentic Engineering

### 四个结构性原因

1. **模型能力质变**：已跨过复杂任务执行门槛，问题从"能不能做"变为"做得稳不稳"
2. **任务形态升级**：从单轮 Prompt 到长流程任务，持续运行小时级 + 跨工具协作
3. **系统可靠性问题**：单步 95% 准确率，20 步级联仅 36% 成功率——模型强不等于系统可靠
4. **竞争格局转移**：GPT/Claude/Gemini 能力差距缩小，差异来自 orchestration/memory/tool use

**这不是模型问题，而是系统工程问题。**

### 两大失败模式

| 失败模式 | 表现 | 根因 |
|---------|------|------|
| 上下文耗尽 | Context Window 100% 耗尽，任务中断进度全部丢失 | 上下文越长越容易"提前收工" |
| 提前宣布完成 | 模型高估完成度，没有外部验证机制纠正 | 天然倾向夸大成果 |

### 上下文腐化的科学解释

- **Lost in the Middle**：模型偏向上下文开头和结尾的 token，中间信息容易丢失
- **Recency Bias**：当 >50% token 时，模型偏向上下文末尾
- **能填满上下文窗口，不代表你应该这么做**

## 四、解决框架：从 Prompt 到 Harness 的三层递进

```
Prompt ⊂ Context ⊂ Harness
```

| 层级 | 核心问题 | 类比 |
|------|---------|------|
| L1 Prompt Engineering | 怎么说——措辞和构建提示词 | 驾驶员下达的一个转向指令 |
| L2 Context Engineering | 给模型看什么——背景信息、文档、代码 | GPS 导航地图与路况信息 |
| L3 Harness Engineering | 让模型在什么机制里干活——工具调用、权限控制、循环反馈 | 整辆车的控制与安全系统 |

Harness 不是 Agent/Prompt/Workflow，而是一组持续回答以下问题的系统：

1. 任务如何被定义（Spec / Plan）
2. 状态如何被保存（Artifact / Files）
3. 上下文如何被控制（Delta / Reset）
4. 谁来判断好不好（Eval / Review Agent）
5. 跑偏后怎么修（Feedback → Spec/Rule）

## 五、六层架构：Harness Engineering 的分层实现

```
L1 Policy（规则与红线层）→ 定义不可逾越边界
L2 Planning（规划与拆解层）→ 任务分解、依赖管理
L3 Skills（能力注册层）→ 模块化注册、组合编排
L4 Execution（执行引擎层）→ 步骤执行、回滚机制
L5 Runtime（运行时状态层）→ 状态追踪、资源隔离
L6 Eval（评估反馈层）→ 独立评估、质量门禁
```

## 六、Harness 六大优化工具详解

### 工具 1：Instructions & Prompts——始终生效的规则层

#### Persistent Instructions

写什么：项目不可协商的规则和约束、Agent 反复犯的错误、输出精简指令（"be concise"）。

原则：保持极度精简，不要用 AI 生成这些指令，频繁迭代维护。

#### Scoped Instructions

按 glob 模式匹配文件路径，自动注入对应指令。例如：

```yaml
---
applyTo: "**/*.ts"
---
使用 strict TypeScript；禁止 any；错误用 Result<T> 模式处理
```

每条文件 < 500 tokens，精准投递 = 更少 token 浪费 + 更高指令遵循率。

#### Prompt Files

可复用的任务模板，Chat 面板输入 `#` 即可引用。团队通过 Git 共享标准化工作流模板，减少每次手写 prompt 的 token。

#### Copilot Memory

跨会话记忆，Agent 自动积累并复用项目知识。减少"每次重新解释项目背景"的 token 开销。

#### 非英语 Token 效率

中文环境优化策略：**Instructions 用英文 + 输出可中文 + 代码/变量始终英文**。英文 prompt 比中文效率高 1.5–3 倍。

### 工具 2：Caveman & RTK——输出压缩 + CLI 过滤

#### Caveman：LLM 输出压缩（平均 65% 节省）

通过 Prompt Engineering 让 LLM 在生成阶段自主压缩输出——不是代码后处理，而是模型直接生成简洁回复。

六档压缩级别：
- **Lite**：删填充词，保留完整句式
- **Full（默认）**：删冠词，片段句，短同义词
- **Ultra**：极致缩写（DB/auth/fn），箭头因果
- **Wenyan-Lite/Full/Ultra**：文言文模式，80-90% 字符减少

适用场景：代码问答 + PR 审查 + 长期项目持久记忆压缩。不适合：深度推理 + 教学文档。

#### RTK（Rust Token Killer）：CLI 输出透明压缩

问题：30 分钟 Session 的 CLI 输出累计约 210K tokens——溢出 200K Context Window。

RTK 四大策略：

| 策略 | 效果 | 示例 |
|------|------|------|
| Smart Filtering | -97% | git push 150→5 tokens |
| Grouping | -85% | ESLint 逐行→按规则分组 |
| Truncation | -95% | cat 1295 行: 10,176→504 tokens |
| Deduplication | -90% | 重复日志 ×347→1 行 |

核心：Rust 实现 / 67+ 命令专用过滤 / 对 Agent 完全透明 / 零配置即装即用。

### 工具 3：Skills & MCP——按需加载能力

#### Skill：跨平台开放标准

将指令 + 脚本 + 资源封装为文件夹结构，Agent 按需加载执行专业任务。

ScaleKit 基准验证：
- 工具调用减少 -33%
- 响应延迟降低 -33%
- 任务成功率 100%
- Token 投入仅 +800 tokens
- 成本 $3.2/月（万次操作）——**基准全场最高 ROI**

分层加载机制避免 Schema 膨胀：

| 层级 | 内容 | 触发时机 |
|------|------|---------|
| L0 始终加载 | 系统指令 | 每次会话 |
| L1 项目加载 | CLAUDE.md / copilot-instructions | 打开项目时 |
| L2 按需加载 | Skill 关键词触发 | 意图识别时 |
| L3 动态加载 | MCP 工具运行时发现 | 首次调用时 |

**核心理念**：API 会变，Skill 不变。把易变知识从模型权重转移到可维护的 SKILL.md，Agent 永远用最新的正确写法。

#### MCP 审计：从 187 工具削减到 52

规则：**当前任务不需要的工具就停用——每个闲置 Server 在每个 step 都消耗 token。**

实际案例：
- Before：15 MCP Servers, 187 tools, 265,500 tokens/agent task
- After：3 MCP Servers, 50 tools, 75,000 tokens/agent task
- 结果：**-72% schema 开销**

最佳实践：按工作区单独设定 MCP（后端不需要 Figma，前端不需要 DB schema）。

### 工具 4：Custom Agents & Sub-Agents——任务隔离

#### Custom Agent

将角色定义、工具集、行为规则封装为可复用的 Agent 定义：
- 角色专精：预定义系统提示
- 工具精简：只暴露所需工具
- 行为一致：固定工作流程
- Context 可控：独立 Prompt 不污染主会话

#### Sub-Agent

将复杂任务分解为独立子 Agent：
- Context 隔离：每个子 Agent 只加载相关 Context
- 并行执行：总时间 = 最长子任务时间
- 失败隔离：子任务失败不影响其他，可独立重试

### 工具 5：Plugin Profile——Context 管理的终极开关

Plugin 是可安装、可开关的扩展包（Skills + MCP + Hooks + Agents + LSP）。

**核心价值**：Enable/Disable = Context 开关。禁用插件 → 其所有组件不加载到 Context → 零 token 消耗。

Token 节省示例：10 个未用插件 = 浪费 5K-15K tokens/轮。

原则：只 Enable 当前任务需要的插件 → 最小化系统消息 token 占用 → 最大化留给代码上下文的空间。

### 工具 6：Model Routing——大小模型分工

| 模式 | Token 消耗 | 适用场景 |
|------|-----------|---------|
| Ask Mode | ~500-2K | 问题/解释/知识查询 |
| Plan Mode | ~1K-4K | 方案设计/精准范畴 |
| Agent Mode | ~15K-50K | 多文件重构/建功能 |

多模型混用策略：
- 语法查询 / 简单问答 → Haiku（0.33x）
- 一般实现 / 重构 → Sonnet（1x）
- 架构决策 / 安全审计 → Opus（3x）

**两阶段工作流**：深度推理模型 Plan（Opus）→ 一般模型实现（Sonnet/Haiku）= 最佳成本曲线。

#### MCP 代理本地模型（CodexSaver 方案）

昂贵模型负责判断，廉价/本地模型负责执行：
- 60% 流量路由到廉价模型
- 整体成本降低 48-70%
- 验证失败自动回退

## 七、SDLC 七阶段实战——Harness 工具组合串联

### 工作框架：Delegate → Review → Own

- **Delegate（委派给 Agent）**：可行性分析、脚手架搭建、测试生成、文档撰写
- **Review（人工审核）**：架构对齐、安全合规、测试质量
- **Own（人类拥有决策权）**：优先级决策、新抽象、生产环境最终签核

### 各阶段推荐配置

| 阶段 | 模型 | Plugin/Tools | Skill | 优化策略 |
|------|------|-------------|-------|---------|
| Plan | Opus | linear + github MCP | /planning | Caveman Full |
| Design | Sonnet | figma + typescript-lsp | /scaffold | RTK (npm create) |
| Build | Sonnet | github + lsp + RTK | /code-gen | Caveman Ultra + RTK |
| Test | Haiku→Sonnet | testing + coverage | /test-gen | RTK Failure Focus |
| Review | Opus→Sonnet | github PR + pr-review | /review-pr | Caveman Review |
| Document | Haiku | docs plugin | /changelog | 关闭压缩（需详尽） |
| Deploy | Haiku→Opus | sentry + monitoring | /deploy | RTK (docker logs) |

### 关键洞察

- **RTK 的 "Failure Focus"** 对 Test 阶段价值最大：100 个用例全过 → 25,000 tokens 变 5 tokens
- **Review 阶段** Caveman 天然适配——评论必须简短高信号
- **Document 阶段**是 Caveman 的例外——需要关闭压缩
- **Deploy 阶段** MCP 直连日志系统避免 `tail -200 logs` 的 token 爆炸

## 八、FinOps for AI——从个人能力到组织能力（Agentic Engineering 的组织视角）

技术优化是个人能力，FinOps 让它变成组织能力。100+ 人的团队需要：可见性 → 归因 → 预算 → 治理 → 持续循环。

### Inform → Optimize → Operate 循环

| 阶段 | 核心动作 |
|------|---------|
| **Inform** | Token Dashboard、Session 级消耗追踪、Schema/Context/Output 拆分、异常检测 |
| **Optimize** | RTK/Caveman 部署、Plugin Profile、Model Routing、MCP 审计、Skill 沉淀 |
| **Operate** | Token 预算制度、Managed Plugin 强制策略、月度 Review、最佳实践推广 |

### GitHub 自用案例实测

GitHub Agentic Workflows 团队通过 API Proxy 日志 + Auditor/Optimizer Workflow + MCP 裁剪 + CLI 替代，实现持续 40-62% ET 降低：

- Auto-Triage Issues：**-62%**（109 runs, 7.8M ET saved）
- Smoke Claude：**-59%**（MCP 裁剪 + Haiku 切换）
- Security Guard：**-43%**（相关性门控跳过 LLM）

**核心洞察**："最廉价的 LLM 调用 = 你不需要发起的那个"。

### AI FinOps 的特殊性

- 计费粒度极细（token-level），支出增长极快（UBB 模式）
- 开发者行为直接影响成本（prompt 写法、模型选择、工具启用）
- Agent 自主决策链带来不可预测性（5-25 步 × 每步成本不同）
- 质量与成本强耦合：过度节省 → Agent 质量下降 → 更多重试 → 反而更贵

## 九、ROI 总结与行动建议

### 组合实施效果

| 优化手段 | 单独效果 | 作用层 |
|---------|---------|--------|
| Plugin Disable | 省 5-15K/轮 | 门禁层：不需要的不进门 |
| RTK CLI 过滤 | 省 89% CLI | 输入层：进来的先过滤 |
| Caveman 输出压缩 | 省 65% 回复 | 输出层：出去的先精简 |
| Model Routing | 省 60% 费用 | 模型层：杀鸡不用牛刀 |
| MCP 直连 | 省粘贴 token | 连接层：不手动搬运信息 |

**综合效果：同等质量下 Token 消耗降低 70-85%，50 人团队月度节省 $1,200-1,500。**

### 七步快速行动

1. 压缩 copilot-instructions.md（10 min）
2. 在 prompt 结尾加上输出限制（1 min）
3. 检查并停用未用的 MCP Server（15 min）
4. 预设使用 Ask Mode（习惯养成）
5. 预设使用 Auto 模型（1 min）
6. 建立 applyTo scoped 指令（15 min）
7. 建立每月审查节奏（持续）

---

**结论**：Agentic Engineering 是一个系统工程学科，解决的核心问题是"如何让 Agent 在生产环境中既可靠又经济"。其中，**Harness Engineering 提供技术方法论**（六层架构、六大工具、SDLC 工具组合），解决"怎么控制 Agent"；**FinOps 提供组织能力**（Inform → Optimize → Operate 循环），解决"谁来治理成本"。两者共同作用，实现质量与成本的一体化优化。

Agent ROI = Value of Agent Output / Token Cost——提升分子（质量，Harness 的职责）和降低分母（成本，FinOps 的职责）必须同时进行，因为它们在 Agent 系统中是强耦合的：过度节省 token 会导致质量下降、更多重试、反而更贵。
