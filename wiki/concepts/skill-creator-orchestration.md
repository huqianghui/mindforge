---
title: "Skill Creator & Orchestration"
created: "2026-04-13"
updated: "2026-11-24"
tags:
  - wiki
  - concept
  - skill
  - orchestration
  - claude-code
aliases:
  - "Skill Creator"
  - "智能编排层"
related:
  - "[[skill-runtime]]"
  - "[[claude-code-extension-system]]"
  - "[[presentation-preparation]]"
---

# Skill Creator & Orchestration

## 摘要

融合多个 Skill 的正确架构是"编排层而非合并层"——不复制子 skill 代码，而是作为智能编排层通过 Decision Framework 做路由。Skill 跨平台兼容性是事实标准，同一份 SKILL.md 可在 Claude Code、Chat API、OpenAI Codex、Gemini CLI 等多个 AI Agent 中使用。

## Claims

### Claim: 融合 Skill 的正确架构是编排层而非合并层

- **来源**：[[用Skill-Creator打造CSA演示工具|使用Skill-Creator融合多个PPT Skill]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.8
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-07 确认——依据：作者的 Skill-Creator 融合实测，库内无后续修订；编排层思路与 Claude Code 官方「plugin 打包多 skill」一致 Claude Code 官方文档 Plugins https://code.claude.com/docs/en/plugins

> 不复制子 skill 代码，而是作为智能编排层通过 Decision Framework 做路由。

### Claim: Explore Agent 自动分析比人手动对比更全面

- **来源**：[[用Skill-Creator打造CSA演示工具|使用Skill-Creator融合多个PPT Skill]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-07 确认——依据：作者单次实测数字（5 skill、38 次调用），无外部更新来源，库内无矛盾

> 5 个 skill、38 次工具调用约 2 分钟，尤其对工具链细节（如 CJK 字体处理差异）的挖掘更全面。

### Claim: Skill 跨平台兼容性是事实标准

- **来源**：[[Claude-Code系列06：Plugin生态与开发]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.6
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：Claude Code 官方文档 Skills https://code.claude.com/docs/en/skills 引用 agentskills.io 跨产品通用技能规范；Superpowers 发布说明提到 Agentskills compliance https://github.com/obra/superpowers/blob/main/RELEASE-NOTES.md

> 同一份 SKILL.md 不仅能在 Claude Code 中运行，也可在 Chat API、OpenAI Codex、Gemini CLI 等其他 AI Agent 中使用。

### Claim: PPT 生成 skill 从单一编排层演进成按规模调度的 sub-agent 架构——小于 5 页编排器自己做完，5~10 页把逐页构建和评审修复交给 sub-agent，10 页以上编排器只做协调、构建并行；风格先锁进一份契约，评审独立且最多两轮

- **来源**：[[用Skill-Creator打造CSA演示工具]]
- **首次出现**：2026-03-23
- **最近更新**：2026-11-24
- **置信度**：0.6
- **状态**：active
- **证据类型**：实测经验

> 初版是一个编排层加参考文件，eval 和实际使用发现 10 页以上的 deck 单一编排器效率不足。演进后是 7 个 sub-skill（智能编排、Azure 架构图、手绘图、HTML 幻灯片、OOXML 级 PPT、模板填充、基于文件的规划）和 6 个按需调度的 sub-agent：调研、出图、逐页构建（可并行）、合并、7 个维度的评审、按评审报告定向修复。流程是规划（每页或每章一个任务）→ 定风格（颜色、字体、版式写进 style contract）→ 执行（调研、出图、构建尽量并行）→ 合并 → 评审与修复。三种编排模式覆盖常见场景：先出图再组装（客户架构方案）、先调研再组织叙事再出图组装（内部技术分享）、分析模板占位符后填充（活动或公司品牌模板）。这个 skill 是 [[presentation-preparation]] 讨论流程的下游：内容和结构想清楚之后，才交给它生成幻灯片。

### Claim: 多格式产出时，中间格式按每一页的内容选，不强行匹配最终格式，再由合并步骤统一；所有中间产物写到磁盘，组装前可以随时检查和改

- **来源**：[[用Skill-Creator打造CSA演示工具]]
- **首次出现**：2026-03-23
- **最近更新**：2026-11-24
- **置信度**：0.6
- **状态**：active
- **证据类型**：实测经验

> 简单要点、英文内容、纯图表页直接生成 pptx，没有转换开销；中文为主的页用 HTML（中日韩字体渲染更好），带语法高亮的代码块和复杂多列布局也用 HTML（原生代码渲染、CSS 布局灵活）；合并步骤负责把混合格式归一化到目标格式。每个演示文稿在输出目录下建一个工作区：任务计划（带勾选框，可以调顺序）、进度日志、风格契约（改它就能改外观）、调研发现（建页前先审）、图表清单与图片（可以预览或换成自己的）。中间产物落盘的价值是人能在最终组装前介入，而不是只拿到一个成品再整体返工。

## 冲突与演进

- 2026-11-24：/extract-knowledge 厚度补抽第二批：用 Skill-Creator 打造 CSA 演示工具 +2（按规模调度的 sub-agent 架构、按页选中间格式与可检查的中间产物）。
（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——确认 3

## 关联概念

- [[skill-runtime]] — `extends` Skill Creator 构建的是 Skill Runtime 的编排层
- [[claude-code-extension-system]] — `part-of` Skill 是 Claude Code 扩展体系的核心组件
- [[presentation-preparation]] — `contrasts` 上游讨论内容与结构，本页的 skill 是下游生成幻灯片

## 来源日记

- [[用Skill-Creator打造CSA演示工具|使用Skill-Creator融合多个PPT Skill]] — Skill 融合实践
- [[Claude-Code系列06：Plugin生态与开发]] — 跨平台兼容性
