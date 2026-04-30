---
title: "Caveman Token Compression"
created: "2026-04-30"
updated: "2026-04-30"
tags:
  - wiki
  - concept
  - token-compression
  - prompt-engineering
  - claude-code
  - LLM
  - skill
aliases:
  - "Caveman"
  - "Caveman Skill"
related:
  - "[[rtk-token-compression]]"
  - "[[context-engineering]]"
  - "[[harness-engineering]]"
  - "[[brevity-constraints]]"
---

# Caveman Token Compression

## 摘要

Caveman 是一个面向 40+ AI 编程代理的对话压缩技能插件（Skill），通过精心设计的系统提示规则让 LLM 在同一次推理中直接生成简洁回复——删除冠词、填充词、客套话，仅保留技术实质内容。其本质不是后处理过滤器，而是**工程化的 Prompt Engineering 方案**：利用 LLM 自身的指令遵循能力，在零额外 API 调用的前提下实现输出 token 平均 65% 的压缩。

Caveman 的创新在于三个层面：(1) "人设 + 结构化规则"比简单的"请简洁回答"效果好得多；(2) Hook 系统将 Prompt Engineering 持久化为跨会话的自动化能力；(3) caveman-compress 一次压缩记忆文件，多次受益。但其适用边界需注意：在需要深度推理的复杂任务上，简洁约束可能损害性能。

## Claims

### Claim: Caveman 输出压缩零额外 API 调用，平均节省 65% output tokens

- **来源**：[[Caveman深度解析——LLM Token压缩的Prompt Engineering之道]]
- **首次出现**：2026-04-28
- **最近更新**：2026-04-30
- **置信度**：0.7
- **状态**：active

> Caveman 通过 SessionStart Hook 将风格约束规则注入系统提示，LLM 在同一次推理中直接生成简洁回复。官方基准：Explain React re-render bug 1180→159 tokens（-87%），Fix auth middleware 704→121（-83%），平均 1214→294 tokens（-65%）。但独立测试（Kuba Guzik）在已有简洁指令的基线下，实际节省仅 13%--21%。

### Claim: Caveman 六档压缩级别覆盖从温和到极致的场景

- **来源**：[[Caveman深度解析——LLM Token压缩的Prompt Engineering之道]]
- **首次出现**：2026-04-30
- **最近更新**：2026-04-30
- **置信度**：0.8
- **状态**：active

> Lite（删填充词保冠词）/ Full（删冠词、片段句、短同义词）/ Ultra（极致缩写、箭头因果）/ Wenyan-Lite / Wenyan-Full / Wenyan-Ultra。文言文模式利用古文高信息密度进一步压缩。

### Claim: Auto-Clarity 安全阀在高风险场景自动恢复详细输出

- **来源**：[[Caveman深度解析——LLM Token压缩的Prompt Engineering之道]]
- **首次出现**：2026-04-30
- **最近更新**：2026-04-30
- **置信度**：0.7
- **状态**：active

> 安全警告、不可逆操作确认、多步骤序列、用户疑惑时自动退出简化模式。但退出判断仍依赖 LLM 自身，不存在确定性触发器。

### Claim: Caveman 通过三重防线解决长对话中的风格回退问题

- **来源**：[[Caveman深度解析——LLM Token压缩的Prompt Engineering之道]]
- **首次出现**：2026-04-30
- **最近更新**：2026-04-30
- **置信度**：0.7
- **状态**：active

> 第一层：规则文本持续性声明（"ACTIVE EVERY RESPONSE"）；第二层：UserPrompt Hook 每轮输出 per-turn reinforcement；第三层：.caveman-active 状态文件跨轮次通信。

## 冲突与演进

- 2026-04-30：首次系统研究。官方宣称 75% 节省与独立测试 13%--21% 存在差异——取决于基线是否已有简洁指令。

## 关联概念

- [[rtk-token-compression]] — `contrasts` Caveman 压缩 output tokens（LLM 回复），RTK 压缩 input tokens（工具输出），两者互补
- [[brevity-constraints]] — `grounds` 论文 arXiv:2604.00025 为 Caveman 的"简洁约束可提升准确率"提供学术背书
- [[context-engineering]] — `implements` Caveman 是 Context Engineering 在输出侧的实践
- [[harness-engineering]] — `part-of` Token 压缩是 Harness 工程的优化环节
- [[skill-pattern]] — `implements` Caveman 是 Skill Pattern 的典型实例——通过 SessionStart Hook 注入能力

## 来源日记

- [[2026-04-28-周二]] — 首次研究 Caveman 与 RTK 对比
- [[2026-04-30-周四]] — 安装试用 Caveman，产出深度解析文章
- [[Caveman深度解析——LLM Token压缩的Prompt Engineering之道]] — 完整机制分析
- [[Caveman与RTK对比——两种互补的LLM Token优化方案]] — 系统性对比
