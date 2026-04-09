---
title: Coding Agent时代的代码复用——从架构约束到Plugin协作的实践指南
created: 2026-04-09
tags: [claude-code, code-reuse, architecture, superpowers, gstack, compound-engineering, modular, vibe-coding]
---

# Coding Agent时代的代码复用——从架构约束到Plugin协作的实践指南

## 一、问题：Coding Agent 天生爱造轮子

Coding Agent（Claude Code、Codex、Cursor 等）有一个结构性问题：**每次会话倾向于从头实现功能，而非复用已有代码**。

Addy Osmani（Google Chrome 团队）总结了这个现象：

> 让 LLM 生成大量代码，结果就像"10 个互不沟通的开发者在写同一个项目"——重复逻辑、命名不一致、没有统一架构。

这不是 agent 的能力问题，而是 **agent 缺乏项目全局视角**——它看到的是当前会话的上下文，不是项目的架构蓝图。

## 二、现有 Plugin 能解决吗？

先澄清一个常见误区：市面上最火的三个 Claude Code 框架——Superpowers、gstack、Compound Engineering（CE）——**没有一个直接解决代码复用问题**。

| 框架 | 核心定位 | 解决的问题 | 与代码复用的关系 |
|------|---------|-----------|----------------|
| **Superpowers** | 思考与流程层 | 怎么想、怎么计划、怎么 review | 间接：plan/review 阶段可以加复用检查 |
| **gstack** | 执行与外部世界层 | 怎么跑浏览器、QA、ship、部署 | 无直接关系 |
| **Compound Engineering** | 知识复利 | 沉淀经验避免重复踩坑 | 是**知识复用**，不是**代码复用** |

### CE 与 Claude Code Memory 的重叠

CE 的核心机制 `/ce:compound` 生成 `docs/solutions/*.md` 文档，下次 agent 启动时读取。这和 Claude Code 的 `.claude/memory/` 机制高度重叠：

| 维度 | CE `docs/solutions/` | Claude Code Memory |
|------|---------------------|-------------------|
| 存储 | 项目内，可 git 共享 | `.claude/memory/`，通常个人 |
| 触发 | 手动 `/ce:compound` | 自动或 "记住这个" |
| 价值 | 团队共享经验 | 个人跨项目记忆 |

**结论**：单人开发场景下 CE 与 Claude Code memory 基本等价。团队场景下 CE 有"经验进版本库"的优势。但两者都是**经验/知识复用**，不是代码级的组件复用。

## 三、代码复用的真正解法——四层防线体系

既然没有银弹框架，那就用架构约束 + 文档 + 流程来构建防线。核心思路：

> **不是让 agent 自己学会复用，而是用架构约束让它"不得不复用"。**

### 第一层：CLAUDE.md 架构约束（最关键，投入产出比最高）

Agent 每次会话都会读 CLAUDE.md。在其中显式声明组件目录和复用规则：

```markdown
## 架构约束

### 组件复用规则（强制）
1. 写任何新功能前，必须先搜索 `src/shared/` 和 `src/components/` 是否有可复用的组件
2. 禁止在 feature 目录内重新实现已存在于 shared/ 的功能
3. 如果需要修改共享组件，必须确保不破坏其他使用方
4. 新增的通用 utility 必须放入 shared/utils/，不允许散落在 feature 目录

### 项目目录结构
src/
  shared/           ← 公共组件和 utility，所有 feature 复用
    components/     ← UI 组件（Button, DataTable, Modal 等）
    hooks/          ← 通用 hooks（useApi, useAuth, useDebounce 等）
    utils/          ← 工具函数（format, validate, parse 等）
    types/          ← 共享类型定义
  features/         ← 按 feature 垂直切分
    billing/        ← billing 相关的所有代码
    auth/           ← auth 相关的所有代码

### 新增代码检查清单
- [ ] 搜索 shared/ 是否有类似功能
- [ ] 如果有，直接 import 使用
- [ ] 如果没有但有复用价值，先抽取到 shared/ 再使用
- [ ] 禁止 copy-paste 已有逻辑
```

### 第二层：FEATURE.md——每个模块声明依赖边界

参考 [AI Coding Agents Are Failing — And Your Architecture Is the Reason](https://medium.com/@nitinsgavane/ai-coding-agents-are-failing-and-your-architecture-is-the-reason-a57ec11d20ce) 提出的做法：

在每个 feature 目录放一个 FEATURE.md，agent 进入该目录时第一时间知道"该复用什么"：

```
src/features/billing/
  ├── FEATURE.md          ← agent 读这个了解边界和依赖
  ├── billing.service.ts
  ├── billing.controller.ts
  └── billing.test.ts
```

FEATURE.md 示例：

```markdown
# Billing Feature

## 依赖的共享组件
- `shared/utils/currency.ts` — 货币格式化，禁止自行实现
- `shared/components/DataTable` — 表格展示
- `shared/hooks/useApi` — API 调用封装
- `shared/types/payment.ts` — 支付相关类型定义

## 本模块对外暴露的接口
- `billing.service.ts` 中的 `BillingService` 类
- 其他 feature 通过 `shared/` 中的接口消费，不直接 import 本目录

## 禁止事项
- 不要在本模块内重新实现货币格式化
- 不要绕过 useApi 直接调用 fetch
```

### 第三层：Superpowers 流程中嵌入复用检查

Superpowers 的 brainstorm → plan → execute → review 流程中，可以在两个关键节点插入复用检查：

**节点 1：brainstorming 阶段**

在 CLAUDE.md 中加入 brainstorm 约束：

```markdown
## Brainstorm 约束
在 brainstorm 时，必须包含以下分析：
1. 列出本次任务可复用的已有组件（搜索 shared/ 目录）
2. 如果不能复用，说明为什么
3. 本次新增的代码中，哪些有复用价值，是否应抽取到 shared/
```

**节点 2：code review 阶段**

Superpowers 的 `requesting-code-review` 会新开 reviewer 上下文。在 CLAUDE.md 中声明 review 检查项：

```markdown
## Code Review 复用检查项（强制）
reviewer 必须检查以下内容：
- [ ] 是否引入了与 shared/ 中已有功能重复的代码
- [ ] 新增的 utility 函数是否应提取到 shared/
- [ ] 是否有跨 feature 的直接 import（应通过 shared/ 中转）
- [ ] 是否有 copy-paste 的迹象（相似度 > 70% 的代码块）
```

### 第四层：自定义 Skill（可选进阶）

如果前三层仍不够，可以写一个专门的 skill：

```markdown
---
name: check-reuse
description: 在实现新功能前检查可复用的已有组件
---

在实现任何新功能前执行以下步骤：

1. **搜索已有组件**
   - grep 项目 shared/ 目录，列出所有可用的组件、hooks、utils
   - 搜索与本次任务关键词相关的函数名/类名

2. **复用评估**
   - 明确回答：本次任务是否可以复用已有代码
   - 如果可以，给出具体的 import 路径和使用方式
   - 如果不能，说明为什么（功能差异、接口不匹配等）

3. **抽取评估**
   - 本次新写的代码中，哪些是通用逻辑
   - 是否应该抽取到 shared/ 供其他 feature 复用
   - 如果是，给出建议的文件名和放置位置

4. **输出复用清单**
   - 复用了哪些已有组件
   - 新增了哪些共享组件
   - 标注为什么没有复用（如果选择不复用）
```

## 四、Agent-Friendly 的项目结构——Vertical Slice 架构

传统的水平分层（controllers/services/repositories）对 agent 很不友好，因为一个功能散落在多个目录中，agent 容易顾此失彼。

**推荐：按 feature 垂直切分**

```
# ❌ 水平分层（agent 不友好）
src/
  controllers/
    userController.ts      # billing? auth? 混在一起
    billingController.ts
  services/
    userService.ts         # 800 行，6 个关注点
    billingService.ts
  repositories/
    userRepository.ts
    billingRepository.ts

# ✅ 垂直切分（agent 友好）
src/
  shared/                  # 公共组件，强制复用
    components/
    hooks/
    utils/
    types/
  features/
    billing/               # billing 所有代码在一起
      FEATURE.md           # 边界和依赖声明
      billing.service.ts
      billing.controller.ts
      billing.repository.ts
      billing.test.ts
    auth/
      FEATURE.md
      auth.service.ts
      auth.controller.ts
      auth.test.ts
```

这种结构的好处：
- Agent 在一个 feature 内工作时，**上下文天然聚焦**
- `shared/` 目录是唯一的复用入口，**边界清晰**
- 每个 `FEATURE.md` 声明依赖，**agent 进入即知该复用什么**
- Code review 时很容易检查"是否绕过了 shared/"

## 五、组合实践——完整工作流

结合 Superpowers + gstack + 四层防线的完整开发流程：

```
[需求]
  ↓
brainstorming（Superpowers）
  + 列出可复用组件清单           ← 第三层：brainstorm 约束
  ↓
writing-plans（Superpowers）
  + plan 中标注复用哪些 shared/ 组件
  ↓
(可选) /plan-eng-review（gstack）
  + 检查架构设计是否合理         ← 是否应抽取新的 shared 组件
  ↓
executing-plans + TDD（Superpowers）
  + 实现前先跑 /check-reuse      ← 第四层：自定义 skill
  + 参考 FEATURE.md 的依赖声明   ← 第二层：模块边界
  ↓
/browse 或 /qa（gstack）
  + 真实环境验证
  ↓
verification-before-completion（Superpowers）
  ↓
requesting-code-review（Superpowers）
  + 检查重复代码和复用情况        ← 第三层：review 检查
  ↓
/ship → /land-and-deploy（gstack）
```

## 六、总结——核心原则

| 原则 | 具体做法 |
|------|---------|
| **声明 > 约定** | CLAUDE.md 中写清楚复用规则，不依赖 agent 自觉 |
| **边界 > 自由** | FEATURE.md 声明每个模块的依赖和禁止事项 |
| **检查 > 信任** | brainstorm 和 review 两个阶段都加复用检查 |
| **结构 > 说教** | 用 vertical slice + shared/ 目录结构，让复用路径物理上清晰 |
| **少层 > 多层** | 优先用 CLAUDE.md + FEATURE.md（零成本），不够再加 skill |

**一句话总结**：

> Coding Agent 不会主动复用代码，但你可以通过 **CLAUDE.md 约束 + FEATURE.md 边界 + Vertical Slice 架构 + Review 拦截** 四层防线，让它"不得不复用"。这不需要新框架——需要的是好的架构设计。

## 参考资料

- [AI Coding Agents Are Failing — And Your Architecture Is the Reason](https://medium.com/@nitinsgavane/ai-coding-agents-are-failing-and-your-architecture-is-the-reason-a57ec11d20ce)
- [My LLM coding workflow going into 2026](https://addyosmani.com/blog/ai-coding-workflow/) — Addy Osmani
- [Claude Code 双插件最佳搭配：superpowers 当大脑，gstack 当手脚](https://mp.weixin.qq.com/s/ShJ6ogkcI-6qZtFY--XcTA)
- [深入对比 Gstack、Superpowers 和 Compound Engineering 三个最火的 AI Coding 工具](https://mp.weixin.qq.com/s/_hqzV6vGuBf2-95DfQyR2w)
- [A Claude Code Skills Stack: How to Combine Superpowers, gstack, and GSD Without the Chaos](https://dev.to/imaginex/a-claude-code-skills-stack-how-to-combine-superpowers-gstack-and-gsd-without-the-chaos-44b3)
- [Claude Code Project Structure Best Practices](https://uxplanet.org/claude-code-project-structure-best-practices-5a9c3c97f121) — Nick Babich
