---
title: "三层 Token 优化策略"
created: "2026-04-30"
updated: "2026-04-30"
tags:
  - wiki
  - method
  - token-optimization
  - claude-code
  - LLM
  - cost-optimization
method_type: "layered-strategy"
related_concepts:
  - "[[caveman-token-compression]]"
  - "[[rtk-token-compression]]"
  - "[[context-engineering]]"
related_methods: []
---

# 三层 Token 优化策略

## 摘要

AI Coding Agent 的 token 消耗来自三个方向：LLM 回复（output）、工具命令输出（input）、对话历史累积（context window）。三层 Token 优化策略通过在每一层部署专门工具——Caveman（输出层）、RTK（中间层）、/compact（输入层）——实现全链路 token 压缩，三者作用于完全不同的数据流，可同时启用互不干扰。

以一次 30 分钟 Claude Code 会话估算：无优化 ~130,900 tokens → 三层联合优化 ~28,586 tokens（总节省 ~78%）。

## 适用条件

- **前置依赖**：使用 Claude Code 或类似 AI Coding Agent；需安装 RTK（Rust binary）和 Caveman（Skill 插件）
- **适用场景**：日常开发（问答+命令执行混合场景）、长期项目频繁新建会话、token 成本敏感的团队
- **不适用场景**：需要深度推理的复杂任务（应关闭 Caveman）、纯对话无命令执行（RTK 无效）、教学/文档撰写（Caveman 不适合）

## 步骤

### Step 1: 部署 Layer 1——/compact（对话历史压缩）

- **输入**：累积的对话历史
- **操作**：使用 Claude Code 内置 `/compact` 命令将冗长对话压缩为摘要，保留决策链条和关键上下文
- **输出**：压缩后的对话上下文
- **判断标准**：简单 Bug 修复 -93%，新功能开发 -73%，模块创建 -79%

### Step 2: 部署 Layer 2——RTK（工具输出压缩）

- **输入**：shell 命令原始输出（git status、cat、test runner 等）
- **操作**：安装 RTK（`brew install rtk && rtk init --global`），通过 PreToolUse Hook 透明拦截命令输出，执行智能过滤/分组/截断/去重
- **输出**：压缩后的命令输出（~80% 节省）
- **判断标准**：`rtk gain` 查看 token 节省统计

### Step 3: 部署 Layer 3——Caveman（LLM 输出压缩）

- **输入**：LLM 回复内容
- **操作**：安装 Caveman Skill，SessionStart Hook 自动注入风格约束规则；选择压缩级别（Lite/Full/Ultra）
- **输出**：精简的 LLM 回复（平均 -65%）
- **判断标准**：状态栏 badge 显示 [CAVEMAN] 模式

### Step 4: 压缩记忆文件（一次性优化）

- **输入**：CLAUDE.md 等项目记忆文件
- **操作**：`/caveman:compress CLAUDE.md`，Python 脚本 + Claude API 重写为精简格式
- **输出**：压缩后的记忆文件（平均 -46%），原始文件备份为 `.original.md`
- **判断标准**：每次新会话自动节省记忆文件 token 消耗

## 决策点

| 条件 | 选择 | 理由 |
|------|------|------|
| 需要深度推理（复杂架构/算法） | 关闭 Caveman，RTK 保持 | Caveman 可能损害推理性能，RTK 不影响推理质量 |
| 纯对话无命令执行 | 仅用 Caveman | RTK 在无 shell 命令时无法发挥作用 |
| 调试定位问题 | 先关 Caveman 再查 RTK tee 日志 | 获取完整未过滤信息 |
| 已有简洁指令的结构化任务 | 用精简版 Caveman 规则（85 tokens） | 完整规则 552 tokens 可能抵消边际收益 |

## Claims

### Claim: 三层优化覆盖 token 消耗全链路，联合节省 ~78%

- **来源**：[[Caveman与RTK对比——两种互补的LLM Token优化方案]]
- **首次出现**：2026-04-30
- **最近更新**：2026-04-30
- **置信度**：0.7
- **状态**：active

> 30 分钟会话估算：LLM 输出 12,000→4,200（Caveman -65%）、命令输出 118,000→23,900（RTK -80%）、记忆文件 900→486（compress -46%），总计 130,900→28,586（-78%）。RTK 绝对节省量最大（命令输出占总量 ~90%），Caveman 在纯对话场景不可替代。

### Claim: RTK 的绝对节省量远大于 Caveman

- **来源**：[[Caveman与RTK对比——两种互补的LLM Token优化方案]]
- **首次出现**：2026-04-30
- **最近更新**：2026-04-30
- **置信度**：0.7
- **状态**：active

> 命令输出在总 token 中占比最大（~90%），RTK 对此压缩 ~80%。Caveman 仅压缩 LLM 回复和记忆文件，绝对量较小。但在不涉及命令执行的纯对话场景中，RTK 无效而 Caveman 是唯一手段。

## 实践记录

### Practice: 2026-04-30 — Caveman + RTK 叠加测试

- **应用场景**：在 Claude Code 中同时启用 Caveman Full + RTK，进行日常开发
- **实际结果**：成功
- **偏差与调整**：按标准步骤执行，无偏差
- **经验教训**：两者互不干扰，可放心叠加使用
- **置信度影响**：初步验证，维持 0.7

## 关联概念

- [[caveman-token-compression]] — `uses` Layer 3 输出层优化工具
- [[rtk-token-compression]] — `uses` Layer 2 中间层优化工具
- [[context-engineering]] — `implements` 三层优化是 Context Engineering 的成本控制实践
- [[harness-engineering]] — `part-of` Token 优化是 Harness 工程的效率环节

## 关联方法

（暂无直接关联方法）

## 来源

- [[2026-04-28-周二]] — 首次研究 Caveman 与 RTK
- [[2026-04-30-周四]] — 叠加测试，产出对比文章
- [[Caveman与RTK对比——两种互补的LLM Token优化方案]] — 系统性对比与联合使用分析
