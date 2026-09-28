---
title: "Harness Quality Gate"
created: "2026-04-11"
updated: "2026-09-28"
tags:
  - wiki
  - concept
  - devops
  - ci-cd
  - harness
  - quality
aliases:
  - "Harness 质量门禁"
  - "Quality Gate"
related:
  - "[[harness-engineering]]"
---

# Harness Quality Gate

## 摘要

Harness 工程质量门禁体系是通过 pre-commit hook + Harness CI pipeline 构建的全链路质量保障方案，涵盖 5 个维度：代码格式 → 架构验证 → 代码检查 → CI 编译/集成测试 → 性能测试。每个维度覆盖 Java、Python、JavaScript/TypeScript 三种主要语言的工具链。

## Claims

### Claim: 质量门禁应覆盖 5 个递进维度——代码格式、架构验证、代码检查、CI 编译、性能测试

- **来源**：[[2026-04-11-周六]]
- **首次出现**：2026-04-11
- **最近更新**：2026-04-12
- **置信度**：0.5
- **状态**：stale

> 核心思路：通过 pre-commit hook + Harness CI pipeline，从 5 个维度构建质量门禁：① 代码格式检查（pre-commit hook）② 架构测试验证（ArchUnit 及同类工具）③ 代码检查器（Lint / Static Analysis）④ CI 编译与集成测试（Testcontainers）⑤ 性能测试。每个维度对应一组多语言工具链。

### Claim: ArchUnit 是 Java 架构测试的标准工具，Python/JS 有对应替代

- **来源**：[[2026-04-11-周六]]
- **首次出现**：2026-04-11
- **最近更新**：2026-04-11
- **置信度**：0.8
- **状态**：stale

> Java 用 ArchUnit（包依赖规则、分层架构约束、命名规范、循环依赖检测），Python 用 import-linter / pytestarch，JavaScript/TypeScript 用 dependency-cruiser / eslint-plugin-boundaries。在 Harness CI 中作为测试 step 执行，失败即阻断 pipeline。

### Claim: 架构质量门禁应扩展为四层体系——从 Lint 到 AI Review

- **来源**：[[Vibe Coding系列11：架构测试全景——从ArchUnit到AI辅助架构Review的工具链实践]]
- **首次出现**：2026-04-23
- **最近更新**：2026-04-23
- **置信度**：0.7
- **状态**：stale

> 四层门禁：Layer 1 代码格式与 Lint（Prettier/ESLint/Ruff）→ Layer 2 架构约束执行（ArchUnit/dependency-cruiser/Tach/Semgrep）→ Layer 3 模块化与复用分析（Code Maat/ArchUnitTS LCOM/jscpd）→ Layer 4 AI 辅助 Review（PR-Agent/oh-my-claudecode/Tanagram）。在 Vibe Coding 时代，Layer 4 和 Baseline MCP Server 是最有价值的新增层。

### Claim: 质量门禁延伸到运行时决策门控——"该不该执行"从布尔开关变成带校准 confidence 的阈值策略，策略函数至少三个输入：校准后概率、错误成本、人工复核成本

- **来源**：[[TypeSafe-Jev：System-One模型、RLCD与校准决策——从聊天模型到软件可直接消费的决策原语]]、[[Computer Use与Browser Use系列八：Jev×Codex实践——把动作判断交给System One模型的受控对照、费用账与skill优先级结论]]
- **首次出现**：2026-09-27
- **最近更新**：2026-09-28
- **置信度**：0.7
- **状态**：active

> 本页此前三条 Claims 都是开发期静态门禁（Lint → 架构约束 → 模块化 → AI Review）。Jev 文把同一"生成与门控分离"思路搬到运行时：生成归 LLM，判断该不该执行归一个专门决策层（[[system-one-model]]），交接点是 confidence 阈值。阈值不能拍脑袋：`if confidence >= 0.98` 的 0.98 要从可靠性表反推（[[confidence-calibration]]），且同一个 0.99 自动推荐 FAQ 够用、自动删生产库不行——所以门控策略 = f(校准后概率, 错误成本, 人工复核成本)，这正是 [[cost-per-task]] 迁栏阈值在单条决策上的形态：AUTO / REVIEW / HUMAN 三档。实践形态（Computer Use 系列八）：执行器入口限制步数与时长、低置信度交回、验收器独立给 `verified_success` 而不直接接受模型 DONE、有 stakes 动作一律人工确认——门禁的通过/失败标准从"代码是否合规"扩展到"这次判断是否值得放行"。

## 冲突与演进

- 2026-04-23：从初始 5 维度线性模型（代码格式→架构验证→代码检查→CI 编译→性能测试）演进为四层嵌套模型（Lint → 架构约束 → 模块化分析 → AI Review），新模型更强调层级递进关系和 AI 辅助层的价值。
- 2026-09-28：从开发期静态门禁（04 月四层模型）延伸到运行时决策门控——注入 Jev 文 + Computer Use 系列八 Claim；页面自 04-23 起首次更新，三条 stale Claims 维持原状态（DevOps 维度无新证据），新增维度为 active。

## 关联概念

- [[harness-engineering]] — `contrasts` 名称类似但不同概念：Harness Quality Gate 是 DevOps 质量门禁，Harness Engineering 是 AI Agent 系统工程范式
- [[generation-evaluation-separation]] — `extends` 门禁是分离原则在"放行与否"这一步的工程化：开发期由 Lint/架构测试/AI Review 判，运行时由带 confidence 阈值的决策层判

## 来源日记

- [[2026-04-11-周六]] — Harness 工程质量门禁体系的完整 5 维度设计
- [[2026-04-12-周日]] — 追踪任务延续
- [[2026-04-23-周四]] — Vibe Coding 系列11 深化：四层架构质量门禁、AI 辅助 Review 层
- [[TypeSafe-Jev：System-One模型、RLCD与校准决策——从聊天模型到软件可直接消费的决策原语]] — 生成与门控分离、confidence 阈值作交接点、阈值带错误成本三输入（2026-09-27）
- [[Computer Use与Browser Use系列八：Jev×Codex实践——把动作判断交给System One模型的受控对照、费用账与skill优先级结论]] — 执行器入口的步数/时长/低置信度交回与独立验收器、有 stakes 动作人工确认（2026-09-27）
