---
title: Vibe Coding 系列01：全面系统的了解 Harness Engineering 的来龙去脉
created: 2026-04-02
tags:
  - harness-engineering
  - context-engineering
  - AI-native
  - claude-code
  - openspec
  - superpowers
  - GSD
  - agent-architecture
  - vibe-coding
  - best-practices
---

# Vibe Coding 系列01：全面系统的了解 Harness Engineering 的来龙去脉

> 从概念溯源到行业共识，从六大核心模块到开源工具生态，从最佳实践到风险警示——一篇文章读懂 AI Agent 时代最重要的工程方法论。

---

## 一、为什么会出现 Harness Engineering

### 1.1 四大驱动力

2025—2026 年是 Harness Engineering 诞生的关键拐点。四股力量同时汇聚，让"怎么驾驭 AI Agent"从一个小众话题变成行业核心议题：

| 驱动力 | 量化指标 | 说明 |
|--------|---------|------|
| **模型能力** | 92% | 模型足够强，但系统跟不上——瓶颈不在模型，在环境 |
| **长时任务** | 78% | 模型开始执行跨小时级任务，需要系统级支撑能力 |
| **级联失败** | 64% | 单步 95% 成功率，10 步串联后只剩 60%——0.95^10 ≈ 0.60 |
| **商业化** | 85% | 模型大规模进入生产环境，"能跑"和"跑得可靠"是两回事 |

### 1.2 两种典型失败模式

当 Agent 真的开始连续跑几个小时，两种失真模式反复出现：

1. **上下文耗尽（Context Exhaustion）** — Agent 跑到一半，上下文窗口耗尽，任务中断，所有进度丢失
2. **提前收工（Premature Completion）** — Agent 只完成了部分工作，就自信满满地宣布"Done!"

这两个问题都不是"让模型更努力"能解决的。它们是**系统设计问题**，需要系统工程的方法来应对。

### 1.3 为什么是现在

OpenAI 在 2026 年 2 月发布了 [Harness Engineering](https://openai.com/index/harness-engineering/) 博客，正式把这个概念推到行业聚光灯下。Anthropic 在 2026 年 3 月跟进了 [Harness Design for Long-Running Apps](https://www.anthropic.com/engineering/harness-design-long-running-apps)。Google DeepMind 在 Gemini 的数学证明工作中独立发展出了几乎相同的架构模式。

三家公司独立演化出同一套设计范式——这不是巧合，而是行业共识。

---

## 二、什么不是 Harness Engineering

在理解"是什么"之前，先厘清"不是什么"。

### 2.1 汽车比喻：Prompt vs Context vs Harness

理解三者关系最直观的方式是**汽车比喻**：

- **Prompt Engineering** = "右转"（单次指令）
- **Context Engineering** = 给模型一张地图（让它理解环境）
- **Harness Engineering** = 整辆车（方向盘、刹车、车道边界、警示灯）

三者是**同心圆包含关系**：

```
┌─────────────────────────────────┐
│        Harness Engineering       │  → 模型在什么机制中运作
│   ┌─────────────────────────┐   │
│   │    Context Engineering   │   │  → 如何提供上下文
│   │   ┌─────────────────┐   │   │
│   │   │ Prompt Engineering│  │   │  → 告诉模型什么
│   │   └─────────────────┘   │   │
│   └─────────────────────────┘   │
└─────────────────────────────────┘
```

| 层级 | 核心问题 | 作用域 | 生命周期 | 优化目标 |
|------|---------|--------|---------|---------|
| Prompt Engineering | 怎么措辞 | 单次 prompt | 一次对话 | 单个回答质量 |
| Context Engineering | 怎么提供上下文 | 一次会话/任务 | 跨多次交互 | AI 理解深度 |
| Harness Engineering | 模型在什么机制中运作 | 整个仓库/项目 | 项目全生命周期 | AI 自主开发的质量、效率和可控性 |

### 2.2 "新瓶装旧酒"吗？

一个合理的质疑是：这不就是 DevOps + 测试框架换了个名字？

确实，Harness Engineering 大量借鉴了已有实践：

| 已有概念               | 重叠度 | Harness Engineering 的增量  |
| ------------------ | --- | ------------------------ |
| Test Harness（测试框架） | 中   | 从测试工具扩展到全生命周期控制系统        |
| CI/CD Pipeline     | 高   | 不只跑构建，还要向 Agent 回传诊断信号   |
| Task Scheduling    | 中   | 不只调度，还要管理 Agent 的状态和上下文  |
| Sandbox Isolation  | 高   | 不只隔离执行环境，还要隔离 Agent 的上下文 |
| Observability      | 高   | 不只给人看，更要给 Agent 看        |

但 Harness Engineering 也带来了**四个真正的新贡献**：

1. **约束率系统（Constraint-Rate Systems）** — 通过增加约束反而提升 Agent 性能
2. **以约束驱动改进（Constraint-for-Improvement）** — 每次 Agent 犯错就编码修复，形成闭环
3. **生成-评估分离（Generation-Evaluation Separation）** — 做事和判断必须拆开
4. **代码库即知识图谱（Codebase-as-Knowledge-Graph）** — 仓库从代码仓库变成 Agent 的认知基础

**结论**：就像 DevOps 重组了开发和运维，Harness Engineering 正在重组 Agent 系统的构建和运营。

---

## 三、什么是 Harness Engineering

### 3.1 定义

**Harness Engineering = 不是教模型怎么回答，而是设计模型在怎样的机制中工作。**

"Harness" 这个词来源于马具——人类不需要自己跑，而是通过缰绳（harness）控制马的方向和速度。在 AI Agent 语境中，Harness Engineering 是指：**将人类的工程智慧、架构决策和品质标准编码为机器可读的规则和约束，使 AI Agent 能够在这些"缰绳"的引导下自主执行高质量的开发工作。**

八大核心能力：任务分解、上下文管理、工具编排、权限设定、状态交接、验证机制、错误恢复、人类升级。

### 3.2 概念溯源

- **2025 年 11 月**：Anthropic 发布 "Effective Harnesses for Long-Running Agents"（v1），首次系统性讨论长时 Agent 的控制架构
- **2026 年 1 月**：Mitchell Hashimoto 为这类实践命名为 "Harness Engineering"
- **2026 年 2 月**：OpenAI 发布 Codex 团队的实践报告，在行业中推广这一概念
- **2026 年 3 月**：Anthropic 发布 v2 版本，从双 Agent 进化到三 Agent 架构；Google DeepMind 在 Gemini 数学证明中展示了独立演化出的相同模式

三家的角色分工：**Anthropic 先行实践，Mitchell 概念命名，OpenAI 行业推广**。

### 3.3 三大支柱

在 OpenAI "零手写代码"目标下，Harness Engineering 立足于三大支柱：

**支柱一：Context Engineering（上下文工程）** — 维护代码知识，动态启用上下文。AGENTS.md 是 Agent 的"目录"而非"百科全书"；日志、指标、链路暴露给 Agent，而不仅仅暴露给人。

**支柱二：Architectural Constraints（架构约束）** — 自定义 linter、结构测试、强制编码规范。不依赖 Agent 的"自律"，而是机械化强制执行。OpenAI 用固定六层架构（Types → Config → Repo → Service → Runtime → UI）和 Providers 接口来约束横切关注点。

**支柱三：Garbage Collection（垃圾回收）** — 后台 Agent 定期扫描偏差、更新质量等级、发起针对性重构 PR。这些 PR 大部分一分钟内就能审完。

### 3.4 自改进闭环

Harness Engineering 最核心的理念可以用一个四步闭环概括：

```
Agent 遇到困难 → 识别缺失能力 → 编写修复代码 → Harness 改进
                    ↑                                    │
                    └────────────────────────────────────┘
```

**核心原则**："不是更努力地尝试，而是追问缺了什么——然后让 Codex 自己修复。"

> "每次 Agent 犯一个错，就把修复方式写进配置文件，让它下次别再犯。Harness 不是设计出来的，是长出来的。" — Anthropic 工程博客

---

## 四、Harness Engineering 的演化路径

### 4.1 Anthropic：从双 Agent 到三 Agent

**2025 年 11 月（v1）——双 Agent 架构**：

```
初始化 Agent（Session 1）          编码 Agent（Session 2, 3, ...）
  建立环境                            确认位置 → 读取进度
  扩展需求                            审查 checklist → 运行测试
  生成配置文件 + Git 基线    →        循环迭代直到完成
```

**2026 年 3 月（v2）——三 Agent 架构**：

```
Planner（规划者）→ Generator（生成者）→ Evaluator（评估者）
  扩展需求            实现代码              交互式验证（Playwright）
  只管交付物          执行任务              独立打分
  不管实现细节        不自我评价            严格检查清单
```

关键升级：**执行和判断被拆到两个独立主体上**。这解决了 Agent 自我评估的系统性缺陷——Agent 生成代码后天然倾向于夸自己，就像学生自己给自己打分一样不可靠。

三个设计决策：
1. 规划只管**交付物**，不管实现细节
2. 执行和判断**拆到两个主体**上
3. 验收协议**物化成文件**，不靠口头对齐

### 4.2 OpenAI：Codex 团队的极限实验

OpenAI Codex 团队做了一个极端实验：**给自己设了一个强约束——不手写代码**。3 人起步，5 个月扩到 7 人，产出了约 1 行人工代码、1,500 个合并 PR、每人每天 3.5 个 PR。

Codex 现在能端到端跑完的完整流程：

1. 验证代码库当前状态
2. 复现一个已上报的 Bug
3. 录制一段演示故障的视频
4. 实现修复
5. 通过驱动应用来验证修复
6. 录制第二段视频，演示问题已解决
7. 开一个 PR
8. 回应 Agent 和人类的反馈
9. 检测并修复构建失败
10. 只在需要人类判断时才上报
11. 合并改动

注意：**这不是"未来展望"，原文用的是现在时态。**

他们的关键洞察："早期进展慢，不是因为 Codex 不够强，而是因为环境定义得不够清楚。"

### 4.3 Google DeepMind：独立演化出相同模式

Google DeepMind 在 Gemini 数学证明工作中发展出了"三组件 Agentic Harness"：

```
Generator（提出解法和证明策略）
    ↓
Verifier（检查逻辑缝隙并修复）
    ↓
Reviser（纠正 Verifier 发现的错误）
    ↑_____________________________|
         47 次迭代直到验证通过
```

### 4.4 行业共识：独立演化 → 同一设计

对比三家的架构，模式惊人地一致：

| Anthropic | Google DeepMind | 角色 |
|-----------|----------------|------|
| Planner | — | 需求分解 |
| Generator | Generator | 方案生成 |
| Evaluator | Verifier + Reviser | 独立验证 |

**生成-评估分离 = 行业共识。** 三家公司独立演化出了同一个设计原则——做事的和判断的不能是同一个 Agent。

### 4.5 Harness 必须匹配模型能力

一个关键洞察来自 Anthropic：**Harness 复杂度必须随模型能力调整**。

Opus 4.6 发布后，之前为 Sonnet 4.5 设计的上下文重置机制变得多余——更强的模型自动消除了上下文焦虑行为。**过度工程化的 Harness 在模型升级后会变成死重。**

这意味着 Harness 必须是**可拆卸的**——每次模型升级时，应该重新评估哪些模块还有必要保留。

---

## 五、六大核心模块

Harness Engineering 的具体实施可以拆解为六大模块：

### 5.1 模块一：Context Engineering（上下文工程）

| 子组件 | 做什么 | 代表实践 |
|--------|--------|---------|
| 项目指令文件 | Agent 启动知识库 | AGENTS.md / CLAUDE.md |
| 动态上下文注入 | 从日志、指标、链路实时获取信息 | OpenTelemetry 集成 |
| 上下文隔离 | Agent 运行在"上下文防火墙"后 | Subagent 独立上下文 |
| 上下文压缩 | 窗口满时自动剥离无关信息 | 三层压缩策略 |

OpenAI 的公理：**"Agent 无法访问的 = 不存在的。"**

在实际项目中，文档必须**索引化、分层化**——如在 [[Vibe Coding系列02：架构师视角的AI Harness Engineering最佳实践]] 中提出的五层文档架构：

| 文档层级 | 文件 | 职责 |
|---------|------|------|
| 操作层 | CLAUDE.md | HOW — 怎么做 |
| 配置层 | config.yaml | WHAT — 技术栈决策 |
| 规格层 | specs/*.md | WHAT — 系统行为规格 |
| 计划层 | plans/*.md | WHEN — 执行计划 |
| 变更层 | Delta Specs | CHANGE — 增量变更 |

**关键原则：Non-overlap** — 每层只回答一个问题，避免信息矛盾。

### 5.2 模块二：Tool Orchestration（工具编排）

| 子组件 | 做什么 | 关键原则 |
|--------|--------|---------|
| 精选工具集 | 少即是多——精心策展，去掉冗余 | 更少工具 = 更少步骤 = 更少 token = 更高成功率 |
| MCP 协议集成 | 统一工具接口——文件系统、API、外部服务统一协议 | 标准化降低 Agent 认知负担 |
| 沙箱隔离 | 执行环境与生产隔离 | 像 Stripe devbox 模型 |

### 5.3 模块三：Verification Mechanisms（验证机制）

| 子组件 | 做什么 | 代表实践 |
|--------|--------|---------|
| 确定性约束 | Linter、结构测试、pre-commit | 机械化验证，不依赖判断 |
| 生成-评估分离 | 独立 Evaluator | Anthropic 三 Agent 模式 |
| 自动化评审循环 | 多 Agent 代码评审管线 | Agent-to-Agent review |

OpenAI 的实践："自定义 linter 的错误消息被设计为向 Agent 上下文注入修复指令。" 当文档不够时，把规则提升为代码强制执行。

### 5.4 模块四：State Management（状态管理）

```
Session 启动（不依赖 LLM）
    → 进度追踪（feature list, TODO）
        → Git 检查点（增量 commit, 快照）
            → 检查点恢复（失败时回滚到最近已知良好状态）
```

Google DeepMind 在 Gemini 3 中引入了 "Thought Signatures"——加密的推理状态表示，能在跨 Session 间恢复精确的推理链条。这代表了状态管理的前沿方向。

### 5.5 模块五：Observability（可观测性）

| 指标类型 | 覆盖率 | 核心价值 |
|---------|--------|---------|
| 执行追踪 | 85% | 知道 Agent 做了什么 |
| 质量打分 | 72% | 知道做得怎么样 |
| 异常检测 | 91% | 知道什么时候出了问题 |

关键洞察：**反馈归因** — 失败模式被追溯到 Harness 缺陷，驱动持续改进。不是"模型不行"，而是"Harness 缺了什么"。

### 5.6 模块六：Human-in-the-Loop（人类升级）

三个触发问题："删除数据库？" / "扣钱？" / "给客户发邮件？" — **都必须要求人类确认**。

人类仍然在循环中，但站在了更上游的抽象层：
- 设优先级
- 把用户反馈翻译成验收标准
- 判断哪里需要规则、工具、或约束升级
- 在确实需要 judgment 的地方接管

---

## 六、开源工具在 Harness Engineering 中的地位与实践

Harness Engineering 不只是理论——它需要具体的工具来落地。当前开源生态中，GSD、OpenSpec、Superpowers 三者构成了 Harness Engineering 的工具层。正如在 [[Vibe Coding系列04：流程框架选择指南——GSD、SpecKit、OpenSpec与Superpowers的组合实践]] 中总结的：**规范驱动框架（GSD / OpenSpec）解决"做什么"，方法论框架（Superpowers）解决"怎么做"，两者互补不可互替。**

### 6.1 GSD（Get Stuff Done）——Phase Pipeline 型 Harness

[GSD](https://github.com/gsd-build/get-shit-done) 是当前最成熟的 Spec-Driven Development 框架。它在 Harness Engineering 六大模块中的覆盖情况：

| Harness 模块 | GSD 的实现 | 强度 |
|-------------|-----------|------|
| Context Engineering | `.planning/` 目录 + Phase 文件 + PLAN/CONTEXT/RESEARCH 拼接 | ★★★★ |
| State Management | Phase 进度追踪 + 任务清单 `[x]` | ★★★★ |
| Verification | `/gsd:verify-work` 功能验证 | ★★★ |
| Tool Orchestration | Subagent 隔离执行 | ★★★ |
| Observability | Phase 完成度追踪 | ★★ |
| Human-in-the-Loop | Phase 间人工审查点 | ★★ |

**GSD 的核心价值**：将项目按规模分级（L1-L4），提供从快速脚本到超大规模项目的分级 Context 策略。如 [[Vibe Coding系列06：GSD项目规模分级实践——从快速脚本到超大规模的Context策略演进]] 所述：

| 级别 | 文件规模 | Phase 数 | Context 策略 |
|------|---------|---------|-------------|
| L1 简单 | 1-3 | 0-1 | 单窗口，无需 `.planning/` |
| L2 一般 | 5-20 | 3-8 | Subagent 隔离 |
| L3 复杂 | 20-100 | 8-20 | Subagent + Workstreams |
| L4 超大 | 100+ | 20+ | Workspace + Milestone 归档 |

**GSD 的 Harness 局限**：GSD 采用"全量上下文拼接"模式——所有 plan 文件一次性加载。正如 [[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移]] 中指出的，这构建了优秀的 **State Layer**，但缺乏 **Selection Layer**——当 Phase 超过 20 个时，planning context 本身会触发 Context Rot。

**GSD 的设计哲学**：GSD 有意不包含 Code Review 节点——它只管 "Do the Right Thing"（功能验证），不管 "Do the Thing Right"（代码质量）。Code Review 被外包给 Superpowers 的 `code-reviewer` 技能。这是职责分离的体现。

### 6.2 OpenSpec——Delta-Based Spec Lifecycle Harness

[OpenSpec](https://github.com/fission-ai/openspec) 在 Harness Engineering 中扮演**变更层**角色——引入时间维度，实现增量推理。

| Harness 模块 | OpenSpec 的实现 | 强度 |
|-------------|----------------|------|
| Context Engineering | `Spec(base) + Delta(change) → 当前状态`，不需要每次全量加载 | ★★★★★ |
| State Management | `.openspec.yaml` 元数据 + 变更归档 | ★★★★ |
| Verification | `proposal.md` → `design.md` → `tasks.md` 三步审查 | ★★★★ |

**OpenSpec 工作流**：`/opsx:propose` → `/opsx:apply` → `/opsx:archive`

每个变更包含完整的三步结构：
```
changes/2026-03-05-project-infrastructure/
├── .openspec.yaml    # 元数据
├── proposal.md       # WHY — 为什么要变更
├── design.md         # HOW — 技术设计
└── tasks.md          # WHAT — 任务清单 [x]
```

**实战数据**（ragflow-skill-orchestrator-studio 项目）：22 个 spec 文件，37 个归档变更，7 天完成——平均每天约 5 个变更。

**OpenSpec 在 Harness 中的独特价值**：它最接近 Git 的增量思维。基线 spec 保持稳定，所有修改以 delta 形式追加，天然支持审计追溯。这正是 Harness Engineering 所倡导的——**知识版本化、变更可追溯**。

### 6.3 Superpowers——Skill-Driven Engineering Practice Harness

[Superpowers](https://github.com/obra/superpowers) 不是 spec 框架——这个区分很重要。它是**工程实践技能包**，为 AI Agent 注入 TDD、系统化调试、Code Review 等工程师习惯。

| Harness 模块 | Superpowers 的实现 | 强度 |
|-------------|-------------------|------|
| Verification | `requesting-code-review` + `systematic-debugging` | ★★★★★ |
| Tool Orchestration | `dispatching-parallel-agents` | ★★★★ |
| Context Engineering | `brainstorming`（苏格拉底式需求分析） | ★★★★ |
| State Management | `writing-plans` + `subagent-driven-development` | ★★★ |

**六大核心技能**：

| 技能 | 在 Harness 中的角色 |
|------|-------------------|
| `brainstorming` | **需求分析层** — 苏格拉底式提问，弥合设计到代码的鸿沟 |
| `writing-plans` | **计划层** — 结构化拆解任务 |
| `subagent-driven-development` | **执行层** — 独立上下文中执行各子任务 |
| `systematic-debugging` | **错误恢复层** — 系统化定位和修复问题 |
| `requesting-code-review` | **验证层** — 独立 Agent 评审代码质量 |
| `dispatching-parallel-agents` | **编排层** — 并行执行无依赖任务 |

**Brainstorm 是整个 AI-Native 开发流程中 ROI 最高的环节**——它强制进行系统性需求分析，避免 Agent 在模糊需求下"凭感觉编程"。如在 [[Vibe Coding系列03：AI-Native开发实践——从Figma设计到Superpowers Brainstorm再到Spec-Delta工作流]] 中论述的，Brainstorm 阶段连接了 Figma 设计和代码实现之间的鸿沟。

**实战数据**（yoga-guru-copilot-platform 项目）：使用 Superpowers 的 baseline spec + delta specs + phase plans，2 天产出 40 个 commit。

### 6.4 三者组合：完整的 Harness 工具栈

**核心规则**：GSD / OpenSpec 二选一（都管"做什么"），Superpowers 必选搭配（管"怎么做"）。

推荐组合策略：

| 项目类型 | 推荐组合 | 理由 |
|---------|---------|------|
| 大型 / 合规要求 | SpecKit + Superpowers | 强审计 + 工程护栏 |
| 中型 / 个人项目 | **GSD + Superpowers**（推荐） | 轻量管理 + 完整工程实践 |
| 快速原型 | OpenSpec + Superpowers | 增量演进 + 灵活迭代 |
| 遗留代码改造 | OpenSpec + Superpowers | Delta 模式天然适合渐进改造 |

### 6.5 工具的 Harness 定位：四层架构视角

从 [[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移]] 中提出的四层架构来看：

```
State Layer（状态层）       → GSD .planning/ / OpenSpec specs/ + changes/
Granularity Layer（粒度层） → Spec ≤150 行 MD / Plan ≤10 任务/Phase / Code ≤400 行/文件
Selection Layer（选择层）   → 【当前缺口】— 所有工具都缺这一层
Execution Layer（执行层）   → Superpowers subagent-driven-development
```

GSD、OpenSpec、Superpowers 都构建了优秀的 State Layer，但都缺乏 Selection Layer——无法根据当前任务动态选择只加载相关的 context。这是当前 Harness 工具生态的**最大瓶颈**。

---

## 七、架构师视角的 Harness Engineering 实践

### 7.1 架构师角色蜕变：One Person Team

如在 [[Vibe Coding系列02：架构师视角的AI Harness Engineering最佳实践]] 中详细论述的，Harness Engineering 正在重塑架构师的角色。传统 7 人团队的角色——Senior CSA、产品设计师、前端设计、前端开发、后端开发、数据库设计、项目经理——正在被掌握 AI 编排能力的单个架构师所替代。

核心技能从手动编码转向：

| 传统技能 | AI 时代新技能 |
|---------|-------------|
| 手动编码 | Prompt Engineering |
| 设计评审 | AI Orchestration |
| SQL 编写 | Skill/Flow Design |
| 会议协调 | Context Engineering |
| Sprint 计划 | Quality Validation |

### 7.2 架构师先验知识编码

Harness Engineering 的核心价值在于：**将架构师的隐性知识显性化，编码为 AI Agent 可执行的规则**。

两个实际项目中的关键实践：

**技术栈选型（config.yaml）** — 技术决策不能交给 AI，因为它们需要对业务需求、团队能力和生态系统有深入理解。

**编码规范与陷阱清单（CLAUDE.md）** — 不是泛泛的最佳实践，而是在实际开发中踩过的坑。例如：
- `ruff check` ≠ `ruff format`——两个命令必须分别运行
- `httpx.Client` 必须用 `with` 上下文管理器，否则泄漏 TCP 连接
- Pydantic datetime ≠ str——序列化需要显式处理

**这些陷阱被编码在 CLAUDE.md 中，意味着 AI Agent 再也不会犯同样的错误。**

### 7.3 五层 AI Pipeline

从架构师视角，完整的 AI-Native 开发是一条五层 Pipeline：

```
Design Layer（设计层）  → Figma AI / Design Agent
    ↓
Spec Layer（规格层）    → Superpowers Brainstorm / OpenSpec
    ↓
Change Layer（变更层）  → Spec-Delta 增量变更
    ↓
Code Layer（代码层）    → Claude Code / Cursor / Copilot
    ↓
Verify Layer（验证层）  → Playwright E2E + Superpowers Code Review
```

Harness Engineering 是贯穿这五层的"操作系统"——它定义了每一层的边界、接口、验证标准和升级路径。

---

## 八、最佳实践

### 8.1 核心原则：约束 Agent 的解空间反而提升性能

这是 Harness Engineering 最反直觉的洞察：**更多约束 = 更多自主权**。

**Vercel 案例**：移除 80% 的工具后，Agent 的表现反而提升了。更少的工具 = 更少的步骤 = 更少的 token = 更高的成功率。

### 8.2 Stripe Minions：隔离 + MCP + 工具矩阵

Stripe 的 Minions 系统展示了企业级 Harness 的标杆：
- **隔离 Devbox**：文件系统隔离、无互联网访问、只读挂载
- **MCP 协议**：统一 400+ 内部工具的接口
- **工具矩阵**：代码搜索、Git 操作、CI/CD、数据库、日志系统、监控——总计 3000+ 工具

### 8.3 Manus 的教训：没人能一次做对

Manus 团队用 6 个月、5 次完整重写才达到生产质量。**Harness 成熟度需要反复迭代**——这不是设计的失败，而是 Harness "长出来"而非"设计出来"的本质决定的。

### 8.4 实用行动路径

对于普通团队，不需要追求"零行人工代码"。更现实的渐进路径：

**立即做**（本周）：
1. 创建 AGENTS.md / CLAUDE.md——把口头约定、聊天结论、关键设计决策沉到文件中
2. 写短、写成目录，不要写成百科全书
3. 积累陷阱清单——每次踩坑就加一条

**中期做**（本月）：
4. 建立确定性验证——linter + 结构测试 + 可观测性
5. 把日志、指标、链路暴露给 Agent，不只暴露给人
6. 把架构边界编码成规则，不全靠 senior review 兜底

**长期做**（本季度）：
7. 模块化 Harness 架构——支持模型版本无关的迁移
8. 建立持续垃圾回收机制
9. 引入 GSD / OpenSpec + Superpowers 工具组合

---

## 九、风险与局限

### 9.1 风险一：概念膨胀

Martin Fowler 的讽刺："我大概可以屏住呼吸等到有人把一个简单的 prompt-based code review Agent 也叫做 Harness。"

从 AGENTS.md（窄）到完整生产运营系统（宽），"Harness" 这个词的精确度正在被稀释。

### 9.2 风险二：过度工程化

Harness 复杂度必须匹配模型能力。Opus 4.6 自动消除了之前为 Sonnet 4.5 设计的 context-reset workaround。**过度工程化的 Harness 在模型升级后变成死重。**

OpenAI 的立场：**"Harness 必须是可拆卸的（tearable）"**。

### 9.3 风险三：证据薄弱

三家公司（OpenAI、Anthropic、LangChain）各自报告的都是**自家产品的实验结果**，全部标记着"利益冲突"警告。独立学术验证严重不足——没有经过同行评审的 arXiv 论文，缺乏"复现成功指标"。

### 9.4 风险四：可复现性鸿沟

OpenAI 的百万行代码示例有特定前提条件：
- **空仓库起步**——没有遗留代码
- **专有 Codex 工具**——OpenAI 内部工具链
- **AI 专家工程团队**——不是普通开发者

这些条件切换到"普通工程团队 + 不同工具 + 不同代码库 + 不同团队背景"后，可复现性**完全未验证**。

OpenAI 自己也承认："这套行为高度依赖这个特定仓库的结构和工具链，不应假设它可以不经类似投入就直接复制到别的项目。"

### 9.5 风险五：多 Agent 风险放大

基于 Anthropic BrowseComp 的发现：更多 Harness = 更多 token 使用 + 更多并行探索 = 意外污染率上升。

| 模式 | 非目标注入率 |
|------|------------|
| 单 Agent | 0.24% |
| 多 Agent | 0.87% |

**3.6 倍的风险放大**。性能放大器同时也是风险放大器。

---

## 十、Harness Engineering 的未来

### 10.1 两种可能性

**可能性一：成为 AI 时代的 DevOps** — 核心知识体系，不可或缺的工程学科。就像 DevOps 重组了开发和运维一样，Harness Engineering 重组 Agent 系统的构建和运营。

**可能性二：成为被遗忘的过渡概念** — 被下一代模型淘汰，像许多早期技术一样昙花一现。

### 10.2 Bitter Lesson 视角

从 [[Vibe Coding系列02：架构师视角的AI Harness Engineering最佳实践]] 中的分析来看，手工精调的路由终将被更强模型吸收，但三种元能力始终存活：

1. **定义问题** — 模型擅长解题，不擅长选题
2. **设计约束** — 约束是人类判断力的编码
3. **跨域迁移** — 将一个领域的 Harness 经验迁移到另一个领域

### 10.3 当下的结论

OpenAI 的这段话最值得记住：

> "Harness Engineering 要求你做的那些事——文档、测试、编码化的架构决策、快速反馈回路——一直都是正确的。过去三十年的软件工程书都在推荐。大多数人跳过了，因为跳过的代价是缓慢而弥散的。
>
> 但到了 Agent 时代，跳过的代价变得即时且剧烈：Agent 会以机器的速度，全天候地复制你的每一个坏习惯。"

**Harness Engineering 不是新发明——它是旧纪律在新时代的强制执行。**

---

## 参考资料

- [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/) — OpenAI, 2026.02
- [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps) — Anthropic, 2026.03
- [[Vibe Coding系列02：架构师视角的AI Harness Engineering最佳实践]] — 从两个实战项目总结的架构师方法论
- [[Vibe Coding系列04：流程框架选择指南——GSD、SpecKit、OpenSpec与Superpowers的组合实践]] — 开源工具选型指南
- [[Vibe Coding系列06：GSD项目规模分级实践——从快速脚本到超大规模的Context策略演进]] — GSD 四级规模分级策略
- [[Vibe Coding系列03：AI-Native开发实践——从Figma设计到Superpowers Brainstorm再到Spec-Delta工作流]] — 五层 AI Pipeline 工作流
- [[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移]] — Context 爆炸问题与四层架构
