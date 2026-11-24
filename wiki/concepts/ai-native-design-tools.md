---
title: "AI-Native Design Tools"
created: "2026-04-13"
updated: "2026-11-24"
tags:
  - wiki
  - concept
  - design
  - pencil
  - excalidraw
  - draw-io
aliases:
  - "AI 原生设计工具"
related:
  - "[[ai-native-pipeline]]"
---

# AI-Native Design Tools

## 摘要

AI-Native 设计工具正在改变设计-开发协作模式。Pencil 的核心差异化在于通过原生 MCP 将设计画布暴露给 Claude Code，实现"AI 在画布上设计，人类微调"（vs Figma 的"人类设计，AI 辅助"）。Excalidraw（手绘草图风格）和 Draw.io（专业工程风格）互补——推荐工作流是"先用 Excalidraw 快速草图，再用 Draw.io 出正式架构图"。

## Claims

### Claim: Pencil 通过 MCP 实现 AI 主导设计

- **来源**：[[Pencil设计工具上手指南]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-07
- **置信度**：0.7
- **状态**：active
- **证据类型**：产品与服务
- **复核**：2026-11-07 确认——依据：Pencil 是 MCP 驱动的设计画布，Claude Code 通过 MCP 读写 .pen：paralect pen.dev 页 https://www.paralect.com/stack/pen-dev ；daily.dev Pencil 01 https://daily.dev/posts/pencil-01-vibe-design-with-pencil-and-claude-code-znlvofrea（均为第三方，官方文档站未取到，置信度不宜上调）

> Figma 用 plugin 式 AI 集成（人类设计、AI 辅助），Pencil 暴露设计画布给 Claude Code via native MCP，实现"AI designs on canvas, human fine-tunes"。

### Claim: Excalidraw 与 Draw.io 互补

- **来源**：[[在Obsidian中绘制Azure架构图]]
- **首次出现**：2026-04-13
- **最近更新**：2026-11-24
- **置信度**：0.4
- **状态**：active
- **证据类型**：实测经验
- **复核**：2026-11-24 降级——依据：库内现行配图规范（流程、时间线类用动态 SVG，架构与关系图默认 Excalidraw）与 2026-09-23 移除 draw.io MCP 的记录；原推荐是 2026-04 的工作流

> **现行结论（2026-11-24 降级）**："先用 Excalidraw 草图、再用 Draw.io 出正式图"是 2026-04 的做法。现在文章配图的做法是：流程、管线、时间线用带动画的 SVG，架构图与关系图默认用 Excalidraw，Draw.io 的 MCP 已于 2026-09-23 移除（弹窗打扰），只在本地保留，需要 Azure 官方图标时另用架构图 skill。两者"互补"作为一般判断仍可参考，但不再是这里的推荐流程。
>
> 原记录：推荐工作流："sketch quickly with Excalidraw first, then produce formal architecture diagrams with Draw.io"。

### Claim: AI 在画布上设计要有"操作、截图、对照"的闭环——先读画布状态、设计指南和可用组件，再批量操作、截图验证、重复；生成代码时沿用项目已有的框架与样式方案，颜色走 CSS 变量，并用截图对照设计稿

- **来源**：[[Pencil设计工具上手指南]]
- **首次出现**：2026-03-17
- **最近更新**：2026-11-24
- **置信度**：0.65
- **状态**：active
- **证据类型**：实测经验

> 典型流程：读编辑器状态 → 取设计指南与风格标签 → 列出可复用组件 → 批量设计操作 → 对目标节点截图验证 → 重复后两步直到满意。设计稿能被 AI 稳定操作，靠的是结构化的设计系统：节点有类型和唯一 id，可复用组件用引用实例化并通过子节点覆盖改内容，slot 预留插入点，颜色、间距走设计变量（`$--primary` 一类）。从设计到代码五步：读出设计帧里的组件实例、取每个可复用组件的完整结构、逐个转成组件文件、截图对比设计稿与渲染结果、再组装成页面。原则：用项目已有的框架（React 就出 React）和样式方案（优先 Tailwind，不写内联样式），颜色用 `var(--primary)` 而不是写死色值，文本、图标、间距精确还原，SVG 要取完整路径几何。截图验证是这条链里的反馈环节，少了它 AI 只能凭结构描述猜效果。

### Claim: Figma 与 Pencil 是分工不是替代——团队协作、精细视觉和设计系统维护留在 Figma，AI 快速出原型和"设计到代码"交给 Pencil，Claude Code 同时连两边的 MCP 做设计资产的双向流转

- **来源**：[[Pencil设计工具上手指南]]
- **首次出现**：2026-03-17
- **最近更新**：2026-11-24
- **置信度**：0.6
- **状态**：active
- **证据类型**：实测经验

> Figma 是人主导设计、AI 辅助（插件加 Figma MCP），文件在云端；Pencil 是 AI 生成设计、人微调，文件是本地加密的 `.pen`，只能经 MCP 读写，内置设计到 React 的链路。配合方式：Figma 做品牌视觉、复杂交互和团队评审；从 Figma 取关键组件的设计上下文，在 Pencil 里重建，再用 AI 批量生成页面变体；Claude Code 作为桥同时连接两个 MCP。一个副作用是 `.pen` 是加密格式，普通文本工具打不开，版本管理和审阅只能经过 Pencil 本身。

## 冲突与演进

- 2026-11-24：/revalidate——"Excalidraw 与 Draw.io 互补"降级 0.6 → 0.4（现行配图做法已变）。
- 2026-11-24：/extract-knowledge 厚度补抽 Pencil 上手指南：新增"画布设计闭环与设计到代码原则""Figma 与 Pencil 分工"两条；其余是操作语法速查，属手册内容不抽。
（暂无）
- 2026-11-07：/revalidate 全库复核（证据分类）——确认 1、待定 1

## 关联概念

- [[ai-native-pipeline]] — `part-of` 设计工具是 AI-Native Pipeline 的第一层

## 来源日记

- [[Pencil设计工具上手指南]] — Pencil 实践
- [[在Obsidian中绘制Azure架构图]] — 绘图工具对比
