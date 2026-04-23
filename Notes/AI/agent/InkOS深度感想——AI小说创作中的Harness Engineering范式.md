---
title: InkOS 深度感想——AI 小说创作中的 Harness Engineering 范式
created: 2026-04-23
tags:
  - AI
  - agent
  - harness-engineering
  - AI-writing
  - multi-agent
  - inkos
  - control-theory
---

# InkOS 深度感想——AI 小说创作中的 Harness Engineering 范式

> 从 InkOS 的多智能体小说创作流水线出发，发现它与 Harness Engineering 在控制论层面的深层同构——**约束即能力，结构即自由**。

---

## 一、核心感想：InkOS 不是一个写作工具，是一个 Harness

读完 InkOS 的深度分析后，最强烈的感受是：**这不是一个"AI 写小说"的工具，而是一个完整的 AI 写作 Harness**。

在 [Vibe Coding 系列01](../vibe-coding/Vibe%20Coding系列01：全面系统的了解Harness%20Engineering的来龙去脉.md) 中，我们建立了 Harness Engineering 的核心公式：

```
Agent = Model + Harness
Harness = Tools + Knowledge + Observation + Action Interfaces + Permissions
```

InkOS 的 10 个 Agent 流水线完全符合这个公式。模型本身（GPT-4 / Claude）只是"引擎"，而 InkOS 构建的规则系统、真相文件、审计循环、模式配置——这些才是真正的 Harness。没有这套 Harness，LLM 写长篇小说就是"一个人开着法拉利上没有路标的荒漠"——动力充沛，但很快迷路。

这让我想到 [Claude Code 系列07](../Claude-Code/Claude%20Code系列07：Harness分层架构——从50万行源码到社区框架的控制论解读.md) 中那个令人震撼的比例：**Claude Code 50 万行代码中，98.7% 是 Harness，只有 1.3% 是模型调用**。InkOS 虽然没有这个量级的代码，但其设计哲学完全一致——**绝大部分工程量都花在了"如何控制模型"而不是"如何调用模型"上**。

---

## 二、六个结构性对应：InkOS 与 Harness Engineering 的同构映射

深入对比后，InkOS 的设计与 Harness Engineering 的核心模块之间存在惊人的一一对应关系：

### 2.1 硬编码规则 ↔ CLAUDE.md / Rules / Hooks

| InkOS | Harness Engineering |
|-------|-------------------|
| HEDGE_WORDS、TRANSITION_WORDS 词表 | CLAUDE.md 中的行为规则 |
| 疲劳词黑名单（"delve""tapestry"等） | `.claude/rules/` 中的硬性约束 |
| 11 条硬性校验规则（元叙事检测、章节号检测） | Hook（L1 确定性约束，100% 强制执行） |
| 写作模式标签（canon/au/ooc/cp） | Permission Mode / Profile 配置 |

这是**最本质的对应**。InkOS 的开发者和 Harness Engineering 的实践者得出了同一个结论：

> **对 AI 的约束不能只靠提示词（Prompt），必须硬编码为可执行的规则。**

在 [记忆提权协议](../../.claude/rules/memory-promotion.md) 中，我们将约束分为三级：L1 Hook（100%）、L2 CLAUDE.md（~90%）、L3 Memory（~60%）。InkOS 的词表检测就是 L1 级别——完全不依赖 LLM 判断，纯规则执行，确定性 100%。而其 33 维审计检查清单是 L2 级别——通过结构化 prompt 让 LLM 按清单逐项检查，约束力高但仍依赖模型理解。

**启发**：写作领域的"AI 腔"检测（套话密度、转折词频次）本质上就是 Coding 领域的 Linter。InkOS 证明了 Linter 思维不仅适用于代码，也适用于文学创作。

### 2.2 真相文件 ↔ 结构化状态持久化

| InkOS | Harness Engineering |
|-------|-------------------|
| 7 个真相文件（角色位置、物品账本、伏笔列表、关系矩阵、时间线） | GSD 的 phase state / Spec 文件 |
| Zod Schema 校验世界状态 | TypeScript 类型系统约束 Agent 输出 |
| Observer Agent 提取事实 → Reflector Agent 生成 JSON 差分 | Agent 执行后输出结构化 artifact |
| 不可变更新（每章追加，不覆盖历史） | Git commit 的不可变追加特性 |

这是解决"LLM 遗忘"问题的同一策略：**不信任模型的内部记忆，用外部结构化存储作为 Single Source of Truth**。

在 [Claude Code 系列05](../Claude-Code/Claude%20Code系列05：记忆全景——从Session到Memory的六层持久化体系.md) 中，我们分析了六层持久化体系。InkOS 的真相文件对应的是最高层——**项目级结构化知识**，类似于我们 PKC 中的 wiki 概念页和 Claims 体系。

InkOS 的创新在于它实现了**自动化的状态结算**：每章写完后，Observer 自动提取事实，Reflector 自动生成差分更新。这比 Coding Agent 领域目前的实践更自动化——在 Claude Code 中，大部分状态更新仍需人工触发（手动更新 CLAUDE.md、手动保存 Memory）。

**启发**：Coding Agent 可以借鉴 InkOS 的"State Settlement"模式——每完成一个 phase，自动提取本阶段的关键决策和状态变化，结构化存储到项目文件中。

### 2.3 多 Agent 流水线 ↔ Subagent / Teammate 架构

| InkOS | Harness Engineering |
|-------|-------------------|
| Planner → Composer → Architect → Writer（创意阶段） | Plan Mode → Spec → Execute |
| Observer → Reflector（状态结算阶段） | Verify → Artifact Generation |
| Normalizer → Auditor → Reviser（质量审校阶段） | Review → QA → Fix Loop |
| 10 个串联 Agent，各司其职 | oh-my-claudecode 的 team pipeline（architect → executor → verifier） |

两者都采用了**关注点分离**的设计——不让一个 Agent 包打天下，而是让每个 Agent 专注于一个职责。

但有一个关键差异：**InkOS 的 Agent 是严格串联的**（上一个完成才能执行下一个），而 Coding Agent 领域（如 oh-my-claudecode 的 team 模式）支持并行协作。这反映了两个领域的本质区别——小说创作是严格线性的（第 N 章必须在第 N-1 章之后），而代码开发天然支持模块化并行。

### 2.4 审计-修订循环 ↔ Verify Loop / QA Gate

| InkOS | Harness Engineering |
|-------|-------------------|
| Auditor 30+ 维度检查 | Superpowers 的 verify 步骤 |
| Reviser 定向修复 → 重新提交 Auditor | ralph-loop 的 verify-fix-verify 循环 |
| 达到迭代上限或全部通过才退出 | ultraqa 的 test-verify-fix-repeat |
| 人工审核关口（超出 AI 修复能力时暂停） | Permission Gate / Human-in-the-Loop |

这是**控制论中的反馈闭环**——输出经过评估，评估结果驱动修正，修正后再次评估。在 [系列07](../Claude-Code/Claude%20Code系列07：Harness分层架构——从50万行源码到社区框架的控制论解读.md) 中，我们将此类机制归入"三层控制系统"的第二层：Evaluative Control（评估性控制）。

InkOS 的 33 维审计清单是一个值得学习的实践：**把模糊的"检查质量"拆解为可枚举的具体检查项**。这比笼统地告诉 AI"请检查一致性"有效得多——后者给了模型太多自由裁量空间，容易遗漏。

### 2.5 温度分层 ↔ 创造性与确定性的分治

InkOS 在不同阶段使用不同的温度参数：

- **创意阶段** temperature ~0.7（高创造性，鼓励新颖表达）
- **状态结算阶段** temperature ~0.3（低创造性，追求事实准确）

这与 Harness Engineering 的理念高度一致。在 [系列01](../vibe-coding/Vibe%20Coding系列01：全面系统的了解Harness%20Engineering的来龙去脉.md) 中提到的"约束率系统"（Constraint-Rate Systems）——**通过增加约束反而提升 Agent 性能**——在这里体现为：状态提取阶段降低温度 = 增加确定性约束 = 提升事实准确率。

**启发**：在 Coding Agent 中，我们也应该对不同任务使用不同策略——Brainstorm 阶段允许模型自由发散，但 Code Review、Test Verification 阶段应该更保守、更严格。这不是"一个模型配一个温度"的问题，而是**流程编排中的动态约束调节**。

### 2.6 题材 Profile ↔ 项目 Spec / Context Profile

| InkOS | Harness Engineering |
|-------|-------------------|
| LitRPG / 玄幻 / 仙侠等题材预设 | 项目 Spec（技术栈、架构风格、编码规范） |
| 每种题材的节奏规则、审核侧重点 | GSD 的项目规模分级（script → large → massive） |
| Fanfic 模式（canon/au/ooc/cp） | 开发模式（greenfield / legacy / refactor） |
| 用户选择模式 → 自动应用对应规则集 | 用户选择项目类型 → 加载对应 CLAUDE.md + Rules |

两者都是**配置驱动的行为切换**——通过一个高层选择，自动激活一整套下游规则。

---

## 三、更深层的共鸣：约束即能力

InkOS 和 Harness Engineering 在哲学层面共享同一个核心洞察：

> **对 AI 施加正确的约束，不是限制它的能力，而是释放它的能力。**

没有词表检测的 AI 写出充满"似乎""或许"的模糊文本；没有真相文件的 AI 在第 15 章忘记第 8 章的剧情；没有审计循环的 AI 对自己的错误浑然不觉。

同样，没有 CLAUDE.md 的 Coding Agent 每次对话重新发明轮子；没有 Hook 的 Agent 可能提交敏感文件到 Git；没有 Verify Loop 的 Agent 宣称任务完成但测试全部失败。

InkOS 的成功（31 章、45 万字、全部通过审计）证明了这条路径的可行性：**用工程化的显式约束，将 LLM 的泛化能力转化为特定领域的可靠产出**。

---

## 四、AI Agent 创作范式总结

综合 InkOS 分析和之前的调研（Terminal Velocity、GOAT Storytelling Agent、AutoGen Book Writer），AI Agent 写作领域目前呈现三种范式：

### 范式一：纯多 Agent 协作（对话驱动）

- **代表**：Terminal Velocity（10 个 AI Agent 自主创作）、AutoGen Book Writer
- **特点**：Agent 之间通过对话协商剧情走向，无显式规则约束
- **优势**：实现简单，创意自由度高
- **局限**：长篇一致性差，风格不稳定，质量依赖模型能力天花板

### 范式二：Agent + Workflow + 微调（模型驱动）

- **代表**：GOAT Storytelling Agent + GOAT-70B-Storytelling
- **特点**：用专门微调的写作模型 + 轻量 workflow 编排
- **优势**：模型层面内化了写作风格，推理效率高
- **局限**：微调成本高，泛化能力受限，长篇记忆问题未根本解决

### 范式三：多 Agent + 显式规则 + 结构化状态（Harness 驱动）

- **代表**：InkOS
- **特点**：10 Agent 流水线 + 硬编码规则词表 + 7 真相文件 + 33 维审计 + 审计-修订循环
- **优势**：长篇一致性强，风格可控，质量有保障，支持人机协同
- **局限**：架构复杂，多次 LLM 调用成本高，规则维护需要持续投入

**核心判断**：范式三（Harness 驱动）是目前最有前景的方向。它与 Coding Agent 领域的 Harness Engineering 趋势完全一致——**不是靠更强的模型，而是靠更好的系统设计来提升 Agent 的可靠性**。

---

## 五、对 PKC（个人知识编译器）的启发

InkOS 的设计对我们的 PKC 知识系统也有直接启发：

1. **自动化状态结算**：每次知识提取后，自动生成结构化的"知识差分"（新增了哪些 Claims、更新了哪些置信度、发现了哪些冲突），而不是只存原始文本
2. **多维审计清单**：将"知识质量检查"拆解为可枚举的具体检查项（Claims 是否有 evidence、关联类型是否正确、置信度是否合理），而非笼统的"检查质量"
3. **Linter 思维**：可以为 wiki 页面建立类似 InkOS 词表检测的规则——如检测"可能""也许"等低置信度措辞在 Claims 中的出现频率，自动标记需要强化 evidence 的断言

---

## 六、一句话总结

InkOS 用 10 个 Agent + 硬编码规则 + 真相文件，在小说创作领域独立发现了 Harness Engineering 的核心范式。**不同领域，同一规律：AI 的可靠性不来自更强的模型，而来自更好的约束系统。**

---

## 参考

- [InkOS GitHub](https://github.com/Narcooo/inkos) — AI 多代理自主创作小说框架
- [Terminal Velocity](https://github.com/Lesterpaintstheworld/terminal-velocity) — 10 AI Agent 自主创作
- [GOAT Storytelling Agent](https://github.com/GOAT-AI-lab/GOAT-Storytelling-Agent) — Agent + 微调模型
- [Vibe Coding 系列01](../vibe-coding/Vibe%20Coding系列01：全面系统的了解Harness%20Engineering的来龙去脉.md) — Harness Engineering 全景
- [Claude Code 系列07](../Claude-Code/Claude%20Code系列07：Harness分层架构——从50万行源码到社区框架的控制论解读.md) — Harness 分层架构与控制论解读
