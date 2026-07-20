---
title: Spec Kit系列00：SDD、TDD与V-Model融合——从Red-Green-Refactor到规格与验证双轨演进
created: 2026-07-20
tags:
  - AI
  - spec-kit
  - SDD
  - TDD
  - v-model
  - vibe-coding
  - coding-agent
---

# Spec Kit系列00：SDD、TDD与V-Model融合——从Red-Green-Refactor到规格与验证双轨演进

> 本文是 Spec Kit 系列的第 00 篇——在进入工具细节（[[Spec Kit系列01：初步整体认识——SDD十命令工作流、Scope粒度与协作扩展]]）之前，先把方法论层面的问题讨论清楚：SDD 到底革了什么命？TDD 在 Coding Agent 时代去哪了？两者如何在 V-Model 中融合？内容基于三个来源：与 ChatGPT 的讨论、Spec Kit 官方方法论文章 [spec-driven.md](https://github.com/github/spec-kit/blob/main/spec-driven.md)，以及社区扩展 [spec-kit-v-model](https://github.com/leocamello/spec-kit-v-model)（后两者已通读原文核对）。

## 一、SDD 的核心主张：Power Inversion（权力反转）

Spec Kit 官方的方法论文章 spec-driven.md 开篇就点明了 SDD 的本质——不是流程改良，而是**权力结构的反转**：

> 几十年来，代码一直是王。规格说明服务于代码——它们是我们搭建的脚手架，一旦"真正的工作"（写代码）开始，就被丢弃。……SDD 反转了这个权力结构：**规格不再服务于代码，代码服务于规格**。

这个反转带来一连串定义上的重写：

- **PRD 不是实现的参考指南，而是生成实现的源头**（the source that generates implementation）；
- **维护软件 = 演进规格**。开发的"通用语（lingua franca）"上移到规格层，代码只是"最后一公里"；
- **Debug = 修复生成了错误代码的规格与计划**；Refactor = 为清晰度重构规格；
- 需求变更不再是干扰，而是常规工作流：改 PRD 里的一个核心需求，受影响的实现计划自动更新、重新生成——开发过程从一次性的 0→1 变成 **0 → 1 → (1', …) → 2 → 3 → N** 的持续再生成。

文章给出了三个"为什么是现在"的理由：AI 能力越过了"自然语言规格可以可靠生成可运行代码"的阈值；系统复杂度指数增长，靠人工维持代码与原始意图的对齐越来越难；变更节奏加速，pivot 成为常态而非例外。

支撑这套主张的不是口号，而是两个具体的工程机制——这也是读原文最大的收获：

### 机制一：模板即约束（Template-Driven Quality）

Spec Kit 的模板不是文档骨架，而是**约束 LLM 行为的结构化 Prompt**。原文列了七种约束手法，最有代表性的三个：

1. **禁止过早进入实现细节**——模板明确要求 "Focus on WHAT users need and WHY / Avoid HOW to implement"，防止 LLM 一上来就写 "用 React + Redux 实现"；
2. **强制不确定性标记**——所有含糊之处必须标 `[NEEDS CLARIFICATION: 具体问题]`，禁止 LLM"合理猜测"。一个"登录系统"不能默认是邮箱密码，必须标注"认证方式未指定：email/password、SSO 还是 OAuth？"；
3. **Checklist 即规格的单元测试**——"No [NEEDS CLARIFICATION] markers remain / Requirements are testable and unambiguous"，强迫 LLM 系统性自查。

用原文的话说：**模板把 LLM 从"创意写手"变成"有纪律的规格工程师"**。

### 机制二：Constitution 的九条条款（Nine Articles）

Constitution 是 SDD 的"架构 DNA"，其中与本文主题直接相关的是两条：

- **Article III：Test-First Imperative（测试优先律令）**——原文用词是 "This is NON-NEGOTIABLE"：任何实现代码写下之前，必须先写单元测试、测试经用户确认、并确认测试处于失败（Red）状态。
- **Article IX：Integration-First Testing**——优先真实环境测试：用真数据库不用 mock、用真实服务实例不用 stub、Contract test 先于实现。

这两条非常关键，因为它们直接回答了下一节的问题。

## 二、TDD 去哪了：不是消失，而是换了位置

初读 spec-driven.md 会有一个疑惑：全文的主线是 `Idea → spec → plan → tasks → implementation`，TDD 的 Red-Green-Refactor 循环几乎没有出现。TDD 被 SDD 抛弃了吗？

结论是：**TDD 没有消失，而是从"流程的起点"移到了"由 Spec 派生的验证层"**。

传统开发中 TDD 是中心——先写测试来定义行为，代码为通过测试而生。Agent 时代的判断变了：**AI 最大的问题不是写不出代码，而是理解错需求（Intent Alignment）**。所以流程的第一等公民从 "How to verify" 变成了 "What to build"：

```text
传统 TDD：        Test → Code → Refactor
Agent 时代：      Spec → Acceptance Tests → Planning → Implementation
                       → Unit / Integration Tests → Repair Loop
```

注意两点：

1. **Test 不再位于最前面，但依然是硬约束**。Spec Kit 的 Constitution Article III 把 TDD 写成 NON-NEGOTIABLE 条款——只是它生效的位置在 implement 阶段（实现纪律），而不是整个流程的入口（需求方法）。测试场景也不再是代码写完后补的，而是**规格的一部分**：原文明确说 "test scenarios aren't written after code, they're part of the specification that generates both implementation and tests"。
2. **测试从"开发者手写的设计工具"变成"从 Spec 自动派生的验证资产"**。Kent Beck 的 TDD 里，写测试的过程本身是设计思考；Agent 时代，设计思考发生在 specify/clarify/plan 阶段，测试是这些思考的可执行投影。

一个不严格但形象的说法：如果 SDD 更准确的展开是 `Spec → Test → Development`，那它其实是 "STD"——只是没有人正式用这个名字。

## 三、Agent 时代的四类 Test-Driven 框架

那么有没有框架在 Agent 时代延续"测试驱动"这条线？讨论中梳理出四类方向（论文名与细节转述自讨论，未逐篇核对原文，此处作为路线图参考）：

### 第一类：Acceptance-Test Driven（最有前景）

代表是 TDDev（"From Runnable to Shippable"）一类工作，流程是：

```text
Requirement → Acceptance Test → Deploy → Browser Agent → Bug Report → LLM Repair
```

核心发现：Agent 最大的短板不是写代码，而是**不会验证 UI、Browser 和 Integration**。所以 **Acceptance Test 比 Unit Test 更重要**——这也解释了为什么收敛中的主流范式把 Acceptance Tests 放在紧随 Spec 之后的位置。

### 第二类：TDAD（Test-Driven Agent Development）

两个有意思的分支：

- **测试驱动 Prompt 生成**：Prompt 不再手写，而是 `Behavior Spec → Generate Tests → Generate Prompt → Run Tests → Repair Prompt`——Prompt 成了被编译的对象，测试驱动的是 Prompt 而不是代码；
- **相关测试选择**：Agent 改完代码后不是 Run All Tests，而是 `AST → Dependency Graph → Relevant Tests → Regression Detection`。这一支还有个反直觉的发现：单纯告诉 Agent "Follow TDD" 效果反而不好，真正有效的是给它足够的上下文（哪些测试受影响）——**Context 比 Procedure 更重要**。这与 [[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移]] 中"上下文工程优先于流程规训"的判断一致。

### 第三类：BDD + Agent

OpenSpec 社区在实验的组合：Gherkin（Given/When/Then）自动生成 Acceptance Test，然后 Agent Coding，纪律是禁止直接改代码——必须走 `Spec → Tests → Code`。本质是 BDD 与 SDD 的结合。

### 第四类：Superpowers——不是 TDD 框架

容易误解的一类。Superpowers 是 **Workflow Orchestrator**（工作流编排器）而非 TDD 方法论：`draft-build-plan → milestones → increments → implementation → quality gates`，quality gates 里跑 lint / unit test / e2e / architecture check。社区常见的组合是 Superpowers + Spec Kit 或 Superpowers + OpenSpec——编排器与规格方法论各管一层（框架组合选型见 [[Vibe Coding系列04：流程框架选择指南——GSD、SpecKit、OpenSpec与Superpowers的组合实践]]）。

综合四类方向，可以看到一个逐渐收敛的主流范式：

```text
Intent（用户意图）
    ↓
Specification（Spec）
    ↓
Executable Specification
    ↓
Acceptance Tests
    ↓
Task Decomposition
    ↓
Coding Agent
    ↓
Verification（Unit / Integration / E2E）
    ↓
Repair Loop
```

## 四、V-Model 融合：从"规格优先"到"规格与验证双轨同步"

顺着这条线，社区扩展 [spec-kit-v-model](https://github.com/leocamello/spec-kit-v-model) 走得更远。它的一句话主张印在 README 最顶端：

> **Every specification paired with its test. Full traceability.**

### 不是 SDD + TDD 的简单拼接

准确的定位是：把经典 V-Model 引入 Spec Kit，让整个流程变成**双轨同步演进（Specification + Verification Together）**。普通 Spec Kit 本质仍是 Specification First——测试在 implementation 之后或作为 quality gate；V-Model 扩展则要求**每产生一个设计规格，同时产生配对的测试规格**：

```text
Requirements        ↔  Acceptance Test
System Design       ↔  System Test
Architecture Design ↔  Integration Test
Module Design       ↔  Unit Test
                Implementation
```

开发一路向下，测试一路向上——这正是航空、汽车、医疗行业用了几十年的经典 V-Model，被 AI 化了。注意它与 TDD 的区别：Kent Beck 的 TDD 关注一个函数/类/模块，测试**先写**；V-Model 关注需求到实现的全链路，测试**同步生成**（不是先写，而是与每层规格成对出现）。

具体到工具层，v0.7.2 提供 **17 个命令、四个 V-Model 层级加实现桥接**：

| 类别 | 命令 |
|------|------|
| Specification | `requirements` · `system-design` · `architecture-design` · `module-design` |
| Test Planning | `acceptance` · `system-test` · `integration-test` · `unit-test` |
| Cross-Cutting | `hazard-analysis` · `impact-analysis` · `peer-review` |
| Verification | `trace` · `test-results` · `audit-report` |
| Bridge to Implementation | `plan` · `tasks` · `implement` |

使用节奏是逐层配对下探：`requirements` → `acceptance` → `trace`，然后 `system-design` → `system-test` → `trace`……每完成一对就跑一次 `trace` 构建追踪矩阵。

### 真正的卖点：Traceability（可追踪性）

V-Model 扩展反复强调 Full Traceability——每条需求到每个测试用例形成完整 ID 链路，且**可反向回溯**：

```text
REQ-001 → SYS-004 → ARCH-007 → MOD-013 → UTP-018 → UTS-026
UTS-026 → MOD-013 → ARCH-007 → …… → REQ-001
```

配套自动生成 5 张 Traceability Matrix（A–D + H），并用**脚本做确定性验证**（覆盖率计算、矩阵生成、缺口检测），而不是靠 AI 自己推断映射是否完整。

这对 AI Coding 的价值在于：Agent 最大的问题不是写不出代码，而是**事后不知道自己为什么写**。Agent 改了一个 Service，可能不知道影响哪些 API、Integration Test、Acceptance Test，于是产生 Requirement Drift / Test Drift / Implementation Drift。V-Model 把这三者全部连接起来，漂移在 trace 阶段被确定性脚本捕获。

### 分工哲学：AI 起草，人类拍板，脚本验证，Git 记账

README 里最凝练的一句话：

> **The AI drafts. The human decides. The scripts verify. Git remembers.**

| 事项 | 谁负责 |
|------|--------|
| 生成需求与测试计划 | AI + 人工评审 |
| 覆盖率计算与矩阵生成 | 确定性脚本 |
| 质量评价 | LLM-as-judge（仅咨询性） |
| 审计追踪 | Git（密码学哈希） |

这个分工与 [[Vibe Coding系列13：控制论如何指导Harness Engineering——用Regulation和Requisite Variety让Vibe Coding变得可控]] 的思路同构：**凡是可确定性计算的绝不交给 LLM**——LLM 负责创造性翻译（规格→结构化需求与测试场景），脚本负责一切可判定的检查。这是把 Harness 工程原则应用到合规领域的样板。

值得注意的还有它的**双模式设计**：Compliant mode 走完整 V-Model 桥接（`v-model.plan → v-model.tasks → v-model.implement`），每步跑 8 阶段验证门（`run-v-model-gate.sh`）、`Implements` 指令幻觉防护和 trace 后置钩子，工件必须带 `**Status**: Approved`；Hybrid mode 允许把 V-Model 产的 tasks.md 喂给核心 `/speckit.implement`——但这**绕过了所有验证门**，README 明确警告：这样的构建**不构成 V-Model 合规证据**，"确定性验证门没有留下记录，因为它们根本没有被调用"。合规不是文档长得像就行，而是验证过程本身留痕。

## 五、三方对比：TDD、Spec Kit 与 Spec Kit V-Model

| | TDD | Spec Kit | Spec Kit V-Model |
|------|------|----------|------------------|
| 驱动方式 | Code-first（测试先于代码） | Spec-first | Spec + Verification 双轨 |
| 测试角色 | Unit Test 为设计工具 | Spec 派生的验证层 | 与每层规格对称演化 |
| 核心循环 | Red-Green-Refactor | Specify → Plan → Tasks → Implement | Requirement ↔ Test 成对生成 |
| 面向对象 | 开发者 | Coding Agent | Agent + 审计 + 合规 |
| Traceability | 很弱 | 一般 | 非常强（确定性矩阵） |

一个值得注意的信号：GitHub 官方没有把 V-Model 做进 Spec Kit Core，而是作为 Community Extension 存在。这说明官方的判断是：`Spec → Plan → Tasks` 是所有项目的默认流程，V-Model 适用于需要严格验证与可追踪性的场景。但从 Agent 发展趋势看，这套思想很可能从合规领域向普通软件开发扩散——因为它解决的是 Agent 的普遍问题（规格、实现、验证三者的一致性），而不仅仅是法规要求。

## 六、行业适用性：从 Safety-Critical 到金融审计

V-Model 扩展官方给出三大受监管行业的配置（`v-model-config.yml` 中 `domain: iec_62304 / iso_26262 / do_178c`）：

| 标准 | 行业 | 用例 |
|------|------|------|
| IEC 62304 | 医疗设备 | 软件安全等级 A/B/C |
| ISO 26262 | 汽车 | ASIL A–D 功能安全 |
| DO-178C | 航空 | DAL A–E 设计保证 |

这三者的共同点：**软件故障可能直接导致人身伤害甚至死亡**（Safety-Critical Systems）——V-Model 正是在这些行业发展起来的。

### 金融行业：没有统一标准，但有一堆"准 V-Model"要求

金融软件的风险不是 Safety Critical，而是金融风险、合规风险、操作风险、网络安全风险、审计风险——会造成金钱损失、监管处罚和声誉损失，但不会让飞机坠毁。所以没有 "DO-178C for Banking" 这样的统一世界标准，取而代之的是一组监管要求，其内核与 V-Model 高度同构：

- **SR 11-7**（美联储/OCC，模型风险管理）：Model Development → Independent Validation → Ongoing Monitoring，本质就是 Specification ↔ Validation 的思想，对风控/信贷/AML/AI 模型适用；
- **ECB TRIM**（欧洲央行，内部模型定向审查）：Requirement / Design / Validation / Traceability / Independent Review——与 V-Model 几乎逐项对应；
- **BCBS 239**（巴塞尔委员会，风险数据聚合）：Data lineage、Traceability、Governance、Auditability——Traceability Matrix 恰好直接满足；
- **PCI DSS**（支付行业）：Requirements → Verification → Evidence → Audit；
- **SOX**（上市公司）：Change Management、Testing、Approval、Evidence Retention——很多银行内部开发流程实际就是为 SOX 审计而设计的。

对银行来说，V-Model 最大的价值不是安全，而是**审计**。监管来问："这个风控规则是谁提的？什么时候上线？验证过哪些场景？哪些测试证明它有效？后来谁改过？"——如果有 Requirement ↔ Design ↔ Test ↔ Deployment 的追踪链，一条链就能回答全部问题。

### 三层采用模型

从 AI Agent 的角度，可以把行业分三层：

1. **必须用**：医疗、汽车、航空、核电、国防——标准本身就要求类似 V-Model；
2. **强烈建议用**：银行、保险、证券、支付、电信——Traceability / Auditability / Compliance 价值极高，卖点是"Agent 生成的代码、测试、设计文档与需求之间形成**可审计的证据链**"，而非"质量更高"；
3. **可选**：SaaS、电商、企业内部工具——Spec Kit + CI/CD + 自动测试通常已经够用，完整 V-Model 是过度工程。

对 Azure AI Foundry + 金融客户（银行、券商）的场景而言，第二层的契合度实际上比互联网公司高得多——模型治理、SOX、内控、审计正是这些客户的日常。

## 七、小结

把这篇方法论讨论压缩成四句话：

1. **SDD 是权力反转**：代码服务于规格，维护软件 = 演进规格；它靠"模板即约束 + Constitution 九条"两个工程机制落地，而不是靠口号；
2. **TDD 换了位置而非消失**：从流程起点（需求方法）移到 Spec 派生的验证层（实现纪律）——Spec Kit Constitution Article III 依然把 Test-First 写成 NON-NEGOTIABLE；
3. **V-Model 是双轨融合**：每层规格与测试规格成对生成、确定性脚本验证追踪矩阵——"AI 起草，人类拍板，脚本验证，Git 记账"；
4. **适用性分层**：Safety-Critical 行业必须用，金融行业强烈建议用（卖点是审计证据链），普通互联网可选。

下一篇（[[Spec Kit系列01：初步整体认识——SDD十命令工作流、Scope粒度与协作扩展]]）进入工具本身：十命令四阶段工作流、Constitution 与 Active Feature 机制、Scope 粒度判断与协作扩展。

## 参考

- [Specification-Driven Development (spec-driven.md)](https://github.com/github/spec-kit/blob/main/spec-driven.md)
- [spec-kit-v-model：V-Model Extension Pack for Spec Kit](https://github.com/leocamello/spec-kit-v-model)
- [github/spec-kit 官方仓库](https://github.com/github/spec-kit)
- [[Spec Kit系列01：初步整体认识——SDD十命令工作流、Scope粒度与协作扩展]]
- [[Vibe Coding系列04：流程框架选择指南——GSD、SpecKit、OpenSpec与Superpowers的组合实践]]
- [[Vibe Coding系列13：控制论如何指导Harness Engineering——用Regulation和Requisite Variety让Vibe Coding变得可控]]
