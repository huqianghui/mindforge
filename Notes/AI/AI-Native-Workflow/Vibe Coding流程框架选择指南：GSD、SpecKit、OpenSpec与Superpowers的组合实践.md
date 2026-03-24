---
title: Vibe Coding 流程框架选择指南：GSD、SpecKit、OpenSpec 与 Superpowers 的组合实践
created: 2026-03-20
tags: [vibe-coding, GSD, speckit, openspec, superpowers, claude-code, AI-native, workflow, spec-driven-development]
---

# Vibe Coding 流程框架选择指南：GSD、SpecKit、OpenSpec 与 Superpowers 的组合实践

> 一人团队如何选择和组合 AI 编程流程框架，在效率与规范之间取得平衡

---

## 一、问题：Vibe Coding 之后怎么办？

Vibe Coding（凭感觉编程）让 AI 快速产出代码，但随着项目复杂度增长，缺乏规范的开发很快失控——上下文遗忘、需求漂移、质量退化。

社区的应对方案是引入**流程协议框架**，但选项众多：[GSD](https://github.com/gsd-build/get-shit-done)、[SpecKit](https://github.com/speckit/speckit)、[OpenSpec](https://github.com/fission-ai/openspec)、[Superpowers](https://github.com/jessed/superpowers)……它们解决的问题层面不同，组合方式也各异。

**核心区分**：规范驱动框架（GSD / SpecKit / OpenSpec）解决"做什么"，方法论框架（Superpowers）解决"怎么做"。两者互补，不可互替。

> 本文聚焦于框架选型和组合策略。关于 Superpowers Brainstorm + OpenSpec Spec-Delta 的具体工作流，详见 [[AI-Native开发实践：从Figma设计到Superpowers Brainstorm再到Spec-Delta工作流]]；关于 Harness Engineering 和 One Person Team 的方法论，详见 [[架构师视角的AI Harness Engineering最佳实践]]。

---

## 二、四大框架定位一览

![AI 编程框架定位图](../../../asset/framework-positioning-map.png)

| 框架 | 一句话定位 | 核心理念 | GitHub |
|------|-----------|---------|--------|
| **GSD** | 轻量级规范驱动 + 子代理执行 | 分阶段拆解项目，每个任务在独立上下文中完成，防止上下文衰减 | [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) |
| **SpecKit** | 企业级全流程规范框架 | 以"项目宪法"为核心，5-6 个阶段严格顺序推进，强审计 + 合规 | [speckit/speckit](https://github.com/speckit/speckit) |
| **OpenSpec** | 敏捷轻量的增量规范工具 | 最小必要流程（提案→细化→实施→归档），一个 spec.md 贯穿始终 | [fission-ai/openspec](https://github.com/fission-ai/openspec) |
| **Superpowers** | AI 工程实践技能包 | 为 AI 注入 TDD、系统化调试、Code Review 等工程师习惯 | [jessed/superpowers](https://github.com/jessed/superpowers) |

**关键认知**：GSD / SpecKit / OpenSpec 三者功能高度重叠（都管"做什么"），只能**三选一**；Superpowers 管"怎么做"，几乎**必选**搭配。

---

## 三、GSD + Superpowers：一人团队的五步工作流

GSD + Superpowers 是目前社区最推荐的个人开发者组合——GSD 提供宏观的项目管理骨架，Superpowers 在每个任务的微观层面注入工程护栏。

![GSD + Superpowers 五步协作工作流](../../../asset/gsd-superpowers-workflow.png)

### 五步流程

| 步骤         | 命令                     | 做什么                                       | 产出物                                   |
| ---------- | ---------------------- | ----------------------------------------- | ------------------------------------- |
| **1. 初始化** | `/gsd:new-project`     | 交互问答收集需求和约束                               | PROJECT.md、REQUIREMENTS.md、ROADMAP.md |
| **2. 澄清**  | `/gsd:discuss-phase N` | GSD 主动提问，澄清需求细节                           | CONTEXT.md（背景知识库）                     |
| **3. 规划**  | `/gsd:plan-phase N`    | 研究方案，生成原子任务清单                             | XML 格式的任务列表（含动作 + 验证步骤）               |
| **4. 执行**  | `/gsd:execute-phase N` | 子代理并行完成任务 + **Superpowers 自动介入**          | 代码 + 原子 Git Commit                    |
| **5. 验证**  | `/gsd:verify-work N`   | 自动测试 + 手动确认 + **Superpowers Code Review** | 验收报告 + Tag 发布                         |

### GSD 与 Superpowers 的分工

| 维度 | GSD 负责 | Superpowers 负责 |
|------|---------|-----------------|
| **规划** | 需求收集、阶段划分、任务拆解 | — |
| **脑暴** | `/gsd:discuss-phase`（产出 CONTEXT.md） | Brainstorming 技能（仅在非 GSD 项目启用） |
| **执行** | 子代理调度、并行波次管理 | TDD 循环（先写测试再写代码） |
| **调试** | — | Systematic Debugging（四步法定位修复） |
| **审查** | — | Requesting Code Review（GSD 缺失此环节） |
| **发布** | `/gsd:complete-milestone`（归档 + Tag） | — |
| **文档** | 自动生成 PROJECT/REQUIREMENTS/ROADMAP 等 | 内嵌工程准则，不产出项目文档 |

### 上下文隔离机制

GSD 的核心优势在于**上下文管理**：每个子任务在独立的 200K token 上下文窗口中执行，避免长对话导致的 AI"遗忘"。这与 Claude Code 的 Agent/Subagent 架构天然契合——详见 [[Claude Code的Agent与Subagent架构解析——以Superpowers为例]]。

> **效率参考**：社区用户反馈，使用 GSD 后 8 小时完成了相当于 2-3 天的工作量。但 GSD 的上下文开销约为实际编码内容的 4 倍，建议使用高配额的 AI 服务。

---

## 四、框架核心对比矩阵

### 4.1 关键维度对比

| 维度 | GSD | SpecKit | OpenSpec | Superpowers |
|------|-----|---------|---------|-------------|
| **流程权重** | 中等 | 重量级 | 轻量级 | 无独立流程 |
| **SDLC 覆盖** | 完整（需求→发布） | 完整（宪法→实现） | 局部（单次变更循环） | 仅实现阶段 |
| **核心文档** | PROJECT / REQUIREMENTS / ROADMAP / STATE / CONTEXT | Constitution / Spec / Plan / Tasks | proposal / spec / design / tasks（单目录） | 内嵌工程准则，无项目文档 |
| **任务执行** | 子代理并行（波次调度） | 分阶段顺序执行 | `/opsx:apply` 单次应用 | 子代理 TDD 循环 |
| **Git 集成** | 自动原子 Commit + 里程碑 Tag | 建议 Commit / PR | `/opsx:sync` 合入主分支 | 任务完成后提示合并 |
| **上下文管理** | 每任务独立上下文（核心优势） | 依赖阶段文档传递 | 依赖 spec.md 传递 | 继承宿主上下文 |
| **学习成本** | 中 | 高 | 低 | 低 |
| **Token 开销** | 高（~4x） | 高 | 低 | 中 |
| **平台兼容** | Claude Code / Codex / Copilot | Claude Code / Copilot Chat | Claude / Cursor | Claude Code / Cursor / Codex |

### 4.2 企业级能力对比

| 能力 | GSD | SpecKit | OpenSpec | Superpowers |
|------|-----|---------|---------|-------------|
| **合规审计** | ⭐⭐⭐ STATE.md 跟踪决策 | ⭐⭐⭐⭐ 宪法 + 阶段门控 | ⭐⭐ 变更记录归档 | ⭐ 无审计功能 |
| **需求管理** | ⭐⭐⭐ 自动生成需求文档 | ⭐⭐⭐⭐ 多层规范链条 | ⭐⭐ 单文件规范 | — |
| **版本发布** | ⭐⭐⭐ 自动归档 + Tag | ⭐⭐ 建议 PR | ⭐⭐ sync 命令 | — |
| **测试保障** | ⭐⭐ 验证步骤 | ⭐⭐⭐ 宪法强制测试 | ⭐ 依赖外部 | ⭐⭐⭐⭐ TDD 内置 |
| **Code Review** | — | ⭐⭐ 阶段检查 | ⭐ 依赖外部 | ⭐⭐⭐⭐ 多维度审查 |

---

## 五、场景驱动的组合选择指南

![Unified Workflow 路由逻辑](../../../asset/framework-conflict-routing.png)

| 场景 | 推荐组合 | 理由 |
|------|---------|------|
| **新项目 — 大型/高复杂度** | SpecKit + Superpowers | 完整阶段门控 + 宪法合规；SP 补充 TDD 和 Code Review |
| **新项目 — 中等规模/个人** | **GSD + Superpowers**（首推） | GSD 提供完整生命周期但比 SpecKit 轻量；SP 补充缺失的 Code Review |
| **新项目 — 原型/MVP** | OpenSpec + Superpowers | 零学习成本，一个 spec.md 快速迭代；SP 提供质量保障 |
| **存量项目 — 增量迭代** | OpenSpec + Superpowers | 无需重建规范体系，提案→应用模式持续迭代 |
| **存量项目 — 纳入规范** | GSD（`/gsd:map-codebase`扫描）+ Superpowers | 先扫描生成初始文档，再按 GSD 流程继续开发 |
| **短期任务 / 一次性脚本** | 仅 Superpowers | 无需规范文档，直接 Brainstorm → TDD → 交付 |
| ❌ **不推荐** | 多个规范框架并用（如 GSD + SpecKit） | 功能重叠导致重复规划、子代理冲突、文档混乱 |

### 选择决策树

```
项目类型？
├── 新项目
│   ├── 大型/合规要求高 → SpecKit + Superpowers
│   ├── 中等规模        → GSD + Superpowers ⬅ 一人团队首推
│   └── 小型/原型       → OpenSpec + Superpowers
├── 存量项目
│   ├── 增量迭代        → OpenSpec + Superpowers
│   └── 需规范化管理    → GSD (map-codebase) + Superpowers
└── 简单任务           → Superpowers Only
```

---

## 六、多框架冲突规避策略

### 6.1 冲突来源

GSD、SpecKit、OpenSpec **功能高度重叠**（都生成规范和任务计划），同时启用会导致：

- **重复规划**：多套独立的设计文档（GSD 写 `.planning/`，SpecKit 写 `.specify/`）
- **子代理冲突**：GSD 和 Superpowers 都会调起子代理执行任务，嵌套使用会混乱
- **脑暴互斥**：GSD 的 `discuss-phase` 和 Superpowers 的 `brainstorming` 做同一件事

### 6.2 Unified Workflow 路由规则

社区的 [Unified Workflow](https://github.com/mattjaikaran/unified-workflow) 技能通过检测 `.planning/` 目录自动路由：

| 规则 | GSD 项目（`.planning/` 存在） | 非 GSD 项目 |
|------|------------------------------|------------|
| **需求澄清** | `/gsd:discuss-phase` → CONTEXT.md | Superpowers brainstorming |
| **任务规划** | `/gsd:plan-phase` → XML 任务列表 | Superpowers writing-plans |
| **任务执行** | `/gsd:execute-phase`（GSD 子代理） | Superpowers subagent-driven-dev |
| **调试** | Superpowers systematic-debugging | Superpowers systematic-debugging |
| **Code Review** | Superpowers requesting-code-review | Superpowers requesting-code-review |
| **规划存储** | `.planning/` 目录 | `docs/plans/` 目录 |

### 6.3 冲突规避核心原则

| 原则 | 说明 |
|------|------|
| **规范框架只选一个** | GSD / SpecKit / OpenSpec 三选一，绝不并用 |
| **Superpowers 始终启用** | 它是工程护栏，与任何规范框架互补 |
| **规划存储分离** | GSD 用 `.planning/`，Superpowers 用 `docs/plans/`，互不写入对方目录 |
| **脑暴阶段互斥** | GSD 项目用 `discuss-phase`，非 GSD 项目用 Superpowers brainstorming |
| **执行模型互斥** | "谁规划谁执行"——GSD 规划的任务由 GSD 子代理执行 |
| **调试和审查不互斥** | Superpowers 的 debugging 和 code-review 在任何场景下都可先行介入 |

---

## 七、与已有工作流的整合

本文介绍的框架选型，与之前文章中的实践是**层级递进**关系：

```
层级四：流程协议框架选择（本文）
  ↓ 选定 GSD / SpecKit / OpenSpec 之一
层级三：Harness Engineering 方法论
  ↓ 将工程智慧编码为 AI 可读规则
层级二：Design → Brainstorm → Spec-Delta 工作流
  ↓ Figma → Superpowers → OpenSpec 三阶段
层级一：Claude Code Agent / Subagent 执行架构
  ↓ 独立上下文窗口中完成每个任务
```

| 层级 | 关注点 | 对应文章 |
|------|--------|---------|
| 流程协议框架 | 选哪个框架、怎么组合 | 本文 |
| Harness Engineering | 人类驾驭、AI 执行的方法论 | [[架构师视角的AI Harness Engineering最佳实践]] |
| Design→Spec→Code | Figma 到代码的三阶段转换 | [[AI-Native开发实践：从Figma设计到Superpowers Brainstorm再到Spec-Delta工作流]] |
| Agent 执行架构 | Claude Code 如何调度子代理 | [[Claude Code的Agent与Subagent架构解析——以Superpowers为例]] |
| 扩展机制 | Command / Skill / Agent 的区别 | [[Claude Code扩展三剑客：Command、Skill与Agent的区别与协作]] |

### 实际整合示例：GSD + Superpowers + 已有工作流

在 yoga-guru-copilot-platform 项目中，完整的 AI 开发流水线为：

```
Figma 设计 → Superpowers Brainstorm → GSD 项目初始化
                                        ↓
                                  GSD discuss-phase（融合 Brainstorm 产出）
                                        ↓
                                  GSD plan-phase → 任务列表
                                        ↓
                                  GSD execute-phase
                                   + Superpowers TDD
                                   + OpenSpec Spec-Delta（增量变更记录）
                                        ↓
                                  GSD verify-work
                                   + Superpowers Code Review
                                        ↓
                                  GSD complete-milestone → Tag 发布
```

---

## 八、社区进阶资源

| 资源 | 说明 |
|------|------|
| [Unified Workflow](https://github.com/mattjaikaran/unified-workflow) | GSD + Superpowers 路由技能，自动判断使用哪个框架 |
| [Claude-Stack Plugin](https://github.com/claude-stack/plugin) | 18 个工具融合为 `/s:` 前缀的超级插件（new → ship） |
| [Claude Code Config Pack](https://github.com/claude-config-pack) | 31 个 GSD 命令 + 16 个 Superpowers 技能的统一配置包 |
| GSD `/gsd:quick` 模式 | 简单任务的快速通道，跳过完整的阶段式流程 |
| [参考文章：GSD + Superpowers 组合实践](https://mp.weixin.qq.com/s/UhvxfQzHkekyl9F_YQIM2w) | 中文社区推荐的 GSD 入门与实践指南 |

---

## 总结

**一句话原则**："规范框架管做对的事情，Superpowers 保证做事情的方法对。"

对于一人团队的实际选择：

- **大多数情况**：GSD + Superpowers——兼顾完整生命周期和工程质量
- **快速迭代**：OpenSpec + Superpowers——最小流程开销
- **高合规需求**：SpecKit + Superpowers——企业级严谨度
- **绝不做的事**：同时启用多个规范框架
