---
title: "Personal Knowledge Compiler"
created: "2026-04-13"
updated: "2026-08-16"
tags:
  - wiki
  - concept
  - knowledge-management
  - obsidian
  - omc
aliases:
  - "个人知识编译器"
  - "PKC"
related:
  - "[[llm-wiki]]"
  - "[[notion-as-ai-layer]]"
---

# Personal Knowledge Compiler

## 摘要

个人知识编译器（PKC）是将日记/笔记/文章通过 LLM 编译为结构化知识库的实践。核心洞察：日记按时间线写但按主题消费，存在根本性结构错配。Karpathy 的 LLM Wiki 模型将 LLM 视为知识维护者（像 Wikipedia 编辑）而非问答者——"RAG = search, LLM Wiki = writing a book"。

## Claims

### Claim: 日记存在写入与消费的结构错配

- **来源**：[[从日记到知识库：Obsidian × oh-my-claudecode × LLM Wiki 的个人知识编译实践]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> 日记按时间线写但按主题消费，线性增长没有网络效应，大多笔记"写后即沉"。

### Claim: LLM Wiki 模型——LLM 是维护者不是问答者

- **来源**：[[从日记到知识库：Obsidian × oh-my-claudecode × LLM Wiki 的个人知识编译实践]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> "RAG = search, LLM Wiki = writing a book"。Karpathy 模型。

### Claim: 知识碎片化问题及解法

- **来源**：[[从日记到知识库：Obsidian × oh-my-claudecode × LLM Wiki 的个人知识编译实践]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-15
- **置信度**：0.7
- **状态**：stale

> OMC Wiki（.omc/wiki/）与 Obsidian vault（Notes/）并存导致同一概念可能存在两处。解法：将 LLM Wiki 概念直接整合到 Obsidian vault 的 wiki/ 目录。

### Claim: PKC 四层知识模型——Concept/Method/Decision/Typed Relations

- **来源**：[[2026-04-13-周一]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.8
- **状态**：stale

> PKC 从单一概念层演进为四层模型：Concept（What）→ Method（How）→ Decision（Why）→ Typed Relations（How connected）。每层解决不同类型的知识问题：概念页记录声明式知识，方法页记录步骤化过程知识，决策页记录选型论证，8 种类型化关联记录知识间的语义关系。当前规模：40 concepts + 8 methods + 4 decisions + ~160 claims。

### Claim: 五项高维度改进构成 PKC 持续演进机制

- **来源**：[[2026-04-13-周一]]
- **首次出现**：2026-04-13
- **最近更新**：2026-04-13
- **置信度**：0.7
- **状态**：stale

> 实践反馈闭环（方法→实践→置信度回写）、知识成熟度模型（6维度×4级别）、Why/决策层、类型化关联（8种）、跨切面查询（6种查询类型）——五项改进将 PKC 从"提取→记录"升级为"提取→验证→演进→查询"的完整知识管理循环。

### Claim: 知识图谱可视化让 PKC 从文本走向交互式图谱

- **来源**：[[2026-04-15-周三]]
- **首次出现**：2026-04-15
- **最近更新**：2026-04-15
- **置信度**：0.7
- **状态**：stale

> 通过 Python 导出脚本（wiki → JSON）+ React 力导向图（react-force-graph-2d），PKC 的 53 个节点、141 条关联、180 条 Claims 可在浏览器中交互式浏览。部署到 GitHub Pages 后可随时访问，不依赖本地环境。这是 PKC 从"编译知识"到"可视化知识生态"的关键一步。

### Claim: 一个维护良好的 wikilink vault 已经是 80% 的 GraphRAG 索引——实体消解从构造上解决、索引成本为零

- **来源**：[[Graph Engineering全景解析——编排图、循环网络与类型化知识图的三重含义]]
- **首次出现**：2026-08-07
- **最近更新**：2026-08-16
- **置信度**：0.8
- **状态**：active

> The AI Operator（2026-07-21）的核心洞察：GraphRAG 抽取管道花掉的大部分工程预算，是在恢复 wikilink 免费给你的东西。① **实体消解从构造上解决**——写下 `[[ADR-007]]` 的瞬间消解就完成了，零模糊合并、零复合误差（对照自动抽取：判定 "Dr. John Smith"/"J. Smith"/"John" 同一节点的错误率沿跳数乘法复合，每跳 95% 准确率 5 跳链只剩 77% 可信）；② **索引成本为零**——图在写入时构建，没有"每 chunk 一次 LLM 调用"的账单（对照 Microsoft GraphRAG 单个大型企业数据集约 33,000 美元索引估算，其修正版 LazyGraphRAG 把索引成本降到 0.1% 印证：便宜的结构图 + 查询时聪明遍历拿到大部分价值）。Graphiti（arXiv 2501.13956）的双时间线方案（"facts expire, not die"——新信息矛盾旧边时不删除而是关闭有效区间）正是 PKC Claims 的 outdated/stale 生命周期语义的图数据库实现。

### Claim: PKC 站在全球空白的 gap 中——typed edges + 时间演替都在做，缺的是类型化边 linter 与 typed vs untyped 检索 eval

- **来源**：[[Graph Engineering全景解析——编排图、循环网络与类型化知识图的三重含义]]
- **首次出现**：2026-08-07
- **最近更新**：2026-08-16
- **置信度**：0.75
- **状态**：active

> 截至 2026 年 7 月全世界没人做过的两样：① **类型化边的 linter**（校验未知类型、悬空目标、缺失逆关系、矛盾环）——零工具（The AI Operator 作者一周后在 obsidian-second-brain 补了 linter，eval 仍空缺）；② **类型化 vs 非类型化检索的对照 eval**——没有任何已发表证据证明 typed links 可度量地改善 agent 回答，零命中。现有工具全缺一条腿：Basic Memory 类型是自由字符串无校验、Breadcrumbs 有真图工程但无 AI 接口、Penfield 把图路由进自家云。本 vault 的 8 种类型化关系 + Claims 置信度/生命周期恰好站在 gap 里，差的正好是那两块——关系类型校验器（现靠 agent 自觉遵守 schema；08-08 hygiene 报告 grounds 反向三轮三中，正是缺 linter 的实证）与检索质量 eval。这两项是 PKC 的候选差异化工作项。旁证（loop-weekly 08-09）：Karpathy LLM Wiki 社区插件与 obsidian-wiki 同周上架，PKC 进入"有竞品可对照"阶段，linter + eval 是当前仍独有的差异化点。

## 冲突与演进

- 2026-08-16：Graph Engineering 讨论把 PKC 置入 GraphRAG 坐标系——wikilink vault=80% 图索引、PKC 位于 linter+eval 全球空白 gap 中。4 月的基础 Claims 维持 stale，等 PKC 系列新文复核。

## 关联概念

- [[llm-wiki]] — `implements` PKC 是 LLM Wiki 的实践方法论
- [[notion-as-ai-layer]] — `contrasts` Notion 在知识管理中的替代方案

## 来源日记

- [[从日记到知识库：Obsidian × oh-my-claudecode × LLM Wiki 的个人知识编译实践]] — PKC 实践文章
- [[2026-04-13-周一]] — 四层知识模型演进、五项高维度改进实施
- [[Graph Engineering全景解析——编排图、循环网络与类型化知识图的三重含义]] — wikilink vault=80% GraphRAG 索引、实体消解从构造上解决、linter+eval 全球空白 gap
