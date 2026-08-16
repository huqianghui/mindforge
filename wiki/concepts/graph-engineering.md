---
title: "Graph Engineering"
created: "2026-08-16"
updated: "2026-08-16"
tags:
  - wiki
  - concept
  - graph-engineering
  - loop-engineering
  - multi-agent
  - orchestration
  - knowledge-graph
aliases:
  - "Graph Engineering"
  - "图工程"
related:
  - "[[loop-engineering]]"
  - "[[model-harness-codesign]]"
  - "[[personal-knowledge-compiler]]"
  - "[[wiki-over-rag-for-personal-knowledge]]"
---

# Graph Engineering

## 摘要

Graph Engineering（图工程，2026 年 7 月因 Peter Steinberger 一条 290 万浏览的推爆火）是一个**一词三义**的伞形概念：① 编排图（把多 agent 系统设计成显式图——LangGraph/AutoGen 的既有地盘，不新）；② 循环之图（自我改进循环互相监督约束的网络——Carlos Perez 的定义，[[loop-engineering]] 的自然延伸）；③ 图结构知识与记忆（类型化节点 + 类型化边，agent 可遍历——名词新、实质有十年积累）。真正的增量有三：**图的作者从开发者变成模型本身**（画图成本坍缩到零，图从软件资产变成随用随弃的中间产物）、**设计单位从单循环升级为带锚点的循环网络**、**知识层的 typed edges + 时间演替**。何时用有明确判据：任务有 3+ 个互相独立的验证步骤 + 复杂条件路由才上图；单轮通过率 <50% 时图比循环更贵。

## Claims

### Claim: graph engineering 一词裂成三个互相竞争的含义，只有"知识图"含义有十年研究与独立基准背书

- **来源**：[[Graph Engineering全景解析——编排图、循环网络与类型化知识图的三重含义]]
- **首次出现**：2026-08-07
- **最近更新**：2026-08-16
- **置信度**：0.85
- **状态**：active

> 2026-07-18 Steinberger 发推 "Are we still talking loops or did we shift to graphs yet?"（本意是嘲讽名词跑步机：prompt→context→loop→graph engineering），48 小时内词义分裂为三：① 编排图——类型化节点、条件转移、checkpoint，**不新**，LangGraph/AutoGen/Temporal 既有地盘；② 循环之图——自我改进循环互相监督的网络（Perez），新视角但最抽象；③ 图结构知识记忆——GraphRAG/Graphiti，名词新实质不新（Foundation Capital 2025-12 已以 "context graphs" 命名同一事物，Gartner 预测 2028 年过半企业 agent 系统用图基上下文，SAP 已出货）。词源考据：最早书面使用是 Josh Simmons 2026-07-04 博客；热度中混有伪造内容（"Stanford + Anthropic 310 万美元研究"不存在，系 engagement bait）。三个含义中只有③背后有可用工具和经受过独立评测的基准数字。

### Claim: 与 LangGraph 时代的本质区别是图的作者从开发者变成模型——画图成本坍缩到零，图的生命周期从项目级缩到任务级

- **来源**：[[Graph Engineering全景解析——编排图、循环网络与类型化知识图的三重含义]]
- **首次出现**：2026-08-07
- **最近更新**：2026-08-16
- **置信度**：0.8
- **状态**：active

> LangGraph 时代的图是开发者在设计时手写、编译、部署的静态持久图——图是软件资产，进版本库上生产。新范式的图是**模型在运行时针对当前任务现写的一次性编排脚本**：graph-max 技巧（Alex Kotliarskyi，2026-07-22——纸上画张工作流草图发给 Codex "写个 code mode 脚本实现并运行"，没有第三步）；Claude Code dynamic workflows（模型现写 JavaScript 编排脚本，运行时确定性执行）。不是图的表达能力变强了，而是画图的成本坍缩到接近零，图从"软件资产"变成"随用随弃的中间产物"。定位判据（Anthropic 文档与社区共识）：普通 session 处理小而顺序的任务，subagent 提供几个独立视角，**当编排本身需要可重复时才用 workflow**。

### Claim: 何时上图的判据——3+ 个独立验证步骤 + 复杂条件路由；治理五要点以可观测性为不可妥协项

- **来源**：[[Graph Engineering全景解析——编排图、循环网络与类型化知识图的三重含义]]
- **首次出现**：2026-08-07
- **最近更新**：2026-08-16
- **置信度**：0.75
- **状态**：active

> Flowtivity 2×2 决策矩阵：简单任务低并发→单循环（别过度工程）；简单任务高并发→并行循环；复杂任务低并发→分段循环 + checkpoint；只有**复杂任务 + 高并发**才是 graph engineering 的地盘。经验法则：任务有 3 个以上互相独立的验证步骤 + 复杂条件路由。治理要点：① 从 3~5 节点起步（20 节点 50 边的图比线性循环更难 debug，先在纸上画——画图动作强迫想清边条件）；② 可观测性不可妥协（每个 agent 输入输出可查、图可重放、失败可归因——Codex 加密争议是现成反面教材）；③ 循环网络四件套（优化循环配反指标监督、reference 有 owner 且由慢循环治理、冲突有显式仲裁层、独立审计循环）；④ 必须有锚点；⑤ 知识图侧两个专属坑——实体消解是项目坟场（错误率沿跳数乘法复合：每跳 85% 准确率 5 跳链只剩 44%，multi-hop 遍历实际是掷硬币）、时间维度必须建模（Graphiti 双时间线 "facts expire, not die"）。何时不用：简单顺序任务、单轮通过率低（成本爆炸）、简单事实查询（图只添冗余）、自动抽取实体质量不过关。

### Claim: 成本红线与失败模式的量化边界（归口详见 loop-engineering / wiki-over-rag 两页）

- **来源**：[[Graph Engineering全景解析——编排图、循环网络与类型化知识图的三重含义]]
- **首次出现**：2026-08-07
- **最近更新**：2026-08-16
- **置信度**：0.75
- **状态**：active

> 本页作三含义的索引归口，量化论断分散在关联页：① 成本红线（单轮通过率 <50% 时并行图比顺序循环贵、盯 cost per successful completion）→ 详见 [[loop-engineering]]；② 单循环四死法与拓扑解法、锚点论（ungrounded vs grounded 才是持久的轴）→ 详见 [[loop-engineering]]；③ 显式图 vs 隐式图路线对垒（Claude workflows 可审计脚本 vs Codex Multi-agent V2 加密委派，"图的运维才是护城河"）→ 详见 [[model-harness-codesign]]；④ 图 vs 向量胜负域独立基准（multi-hop/时间推理/跨语料赢、简单查找不赢、混合永远赢过纯图）→ 详见 [[wiki-over-rag-for-personal-knowledge]]；⑤ wikilink vault=80% GraphRAG 索引、PKC 站在 linter+eval 全球空白 gap 中 → 详见 [[personal-knowledge-compiler]]。

## 冲突与演进

- 2026-08-07：《Graph Engineering全景解析》成文，三含义拆分 + 考据（含伪造内容甄别）。
- 2026-08-16：建页（用户裁决突破单篇门槛：与 loop-engineering 直接衔接 + 全文即深度专文）。本页定位为三含义的伞形索引页，量化论断已分散注入 loop-engineering / model-harness-codesign / personal-knowledge-compiler / wiki-over-rag 四页，本页不重复收录，以第 4 条 Claim 作路由。typed-edges 原子概念挂候选等第 2 篇引用。

## 关联概念

- [[loop-engineering]] — `extends` 含义②（循环之图）是 loop engineering 的自然延伸：设计单位从单循环升级为带锚点的循环网络（Perez 文标题即 "From Loop Engineering to Graph Engineering"）
- [[model-harness-codesign]] — `uses` 含义①（编排图）的两条实现路线（Claude 显式 vs Codex 隐式）是第一方 harness 的路线分歧新轴
- [[personal-knowledge-compiler]] — `grounds` 含义③（类型化知识图）为 PKC 提供 GraphRAG 坐标系定位：wikilink vault 已是 80% 图索引，缺 linter + eval
- [[wiki-over-rag-for-personal-knowledge]] — `grounds` 图 vs 向量胜负域的独立基准数字为该决策补充"按问题类型路由"的支撑

## 来源日记

- [[Graph Engineering全景解析——编排图、循环网络与类型化知识图的三重含义]] — 核心来源：词源考据、三含义拆分、模型写图、决策矩阵、治理要点、GraphRAG 基准综述
- [[2026-08-07-周五]] — graph engineering 研究成文记录
