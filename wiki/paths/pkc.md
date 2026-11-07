---
title: "学习路径：个人知识编译（PKC）"
created: "2026-11-07"
updated: "2026-11-07"
tags:
  - wiki
  - path
  - pkc
  - llm-wiki
  - knowledge-management
path_id: "pkc"
audience: "自己 + CSA 团队"
gap_topics:
  - pkc-competitors
  - loop-engineering
  - wiki-health
  - rag-retrieval
  - agent-memory
signals:
  - "GitHub Trending：LLM wiki、知识图谱、代码知识图谱（graphify 等）"
  - "arXiv：graph RAG、knowledge compilation、agent memory"
  - "Claude Code / Obsidian 生态的 memory 与插件发布"
---

# 学习路径：个人知识编译（PKC）

这条路径讲的就是这个知识库本身：为什么不用 RAG 而用"编译式"的 wiki，知识怎么存成可演进的 Claim，记忆和规则分别放哪，循环怎么让它保持鲜活，以及它和图、企业级方案的关系。学完能自己搭一套，也能给客户讲清个人知识库和企业知识库的分界。

**怎么用**：按站点顺序读，每站对照「算会」自查。这条路径的很多结论在你的日常操作里每天都在验证，可以边用边对照。

**预计总用时**：约 10~12 小时。

## 第 1 站 · 问题：日记写入与消费的错配

- **读**：[[personal-knowledge-compiler]]、[[PKC系列01：从日记到知识库]]
- **前置**：无
- **用时**：约 1.5 小时
- **⚠️ stale**：10 条中 9 条（基础论述，变化慢）
- **算会**：
  - 能说出日记"写入与消费结构错配"指什么，以及知识碎片化的三种表现
  - 能说出 LLM Wiki 模型的核心：LLM 是维护者，不是问答者
  - 能说出 PKC 的四层知识模型：Concept / Method / Decision / Typed Relations

## 第 2 站 · 选择：编译式 wiki 而不是 RAG

- **读**：[[wiki-over-rag-for-personal-knowledge]]、[[llm-wiki]]、[[rag-architecture-comparison]]
- **前置**：第 1 站
- **用时**：约 1.5 小时
- **⚠️ stale**：三页 13 条全部 stale；决策页最后一条（图与向量的胜负域）是近期的
- **算会**：
  - 能说出编译式知识与检索式知识为什么是不同范式，不适合强行合并
  - 能说出图赢在哪（multi-hop、时间推理、跨语料）、不赢在哪（简单查找），以及"混合永远赢过纯图"
  - 能说出个人级（qmd）与企业级（Foundry IQ、AI Search + 图数据库）方案的分界

## 第 3 站 · 存储：不存事实，只存论断

- **读**：[[claim-based-schema]]、`wiki/index.md` 的「Schema 说明」一节
- **前置**：第 2 站
- **用时**：约 45 分钟
- **算会**：
  - 能说出"不存事实只存论断"的设计哲学，以及一条 Claim 有哪些字段（来源、置信度、状态、复核）
  - 能说出 Claim 的生命周期：active / stale / conflicting / outdated，以及各自怎么流转
  - 能说出置信度由什么决定，以及为什么"按日期标 stale"之后还需要"按证据复核"

## 第 4 站 · 流程：从日记到概念页

- **读**：[[personal-knowledge-compiler-workflow]]、[[PKC系列02：个人知识编译器进化]]
- **前置**：第 3 站
- **用时**：约 1.5 小时
- **算会**：
  - 能说出一篇文章进 wiki 的完整链路：harvest 入队 → extract 建页或注入 Claim → HOLD 账本防复捞 → 图谱导出
  - 能说出原子概念建页的三条判据，以及"宁缺勿滥"为什么重要
  - 能说出什么样的东西不该进 wiki（私人内容、未脱敏的项目信息）

## 第 5 站 · 记忆与规则：放哪一层

- **读**：[[claude-code-memory-system]]、[[Claude-Code系列05：六层记忆体系]]、[[Harness实践：从Memory失效到记忆治理]]、[[agent-memory-lifecycle]]
- **前置**：第 1 站
- **用时**：约 1.5 小时
- **算会**：
  - 能说出 Claude Code 六层记忆各自的职责
  - 能解释一条写在 memory 里的行为规则为什么会被忽略，以及"背景知识留 memory、行为规则提权到 CLAUDE.md 或 hook"的三级约束强度
  - 能对比文件记忆与后端记忆的取舍：可见可回滚 vs 团队共享与自动遗忘

## 第 6 站 · 鲜活：内循环与外循环

- **读**：[[loop-engineering]]、[[Loop-Engineering概念澄清]]、[[Loop-Engineering实践：知识库外循环]]
- **前置**：第 4 站
- **用时**：约 1.5 小时
- **⚠️ stale**：[[loop-engineering]] 15/15
- **算会**：
  - 能说出外循环的最小内核：自动发现 + workflow + 重复 + 跨轮记忆，以及"自动发现是分水岭"
  - 能说出这个库的几个循环各管什么：每日收割、周六保鲜、周日复核、周日复盘与雷达
  - 能说出为什么改知识本身的结论（修订、退役）要留给人裁决，确认类才自动写回

## 第 7 站 · 图：知识图的三种含义

- **读**：[[graph-engineering]]、[[enterprise-ontology]]
- **前置**：第 2 站
- **用时**：约 1.5 小时
- **⚠️ stale**：[[enterprise-ontology]] 7/7
- **算会**：
  - 能说出 graph engineering 一词的三种含义（编排图、循环网络、类型化知识图），以及只有哪一种有独立基准背书
  - 能说出何时值得上图：3 个以上独立验证步骤加复杂条件路由
  - 能说出企业 Ontology（Fabric IQ、Palantir）把数据从"可查询"升级到"可推理、可行动"指什么

## 前沿站 · 正在发生的变化

来自知识差距报告的 pkc-competitors、loop-engineering、wiki-health、rag-retrieval、agent-memory 主题。「算会」统一是：**能说出它改变了上面哪一站的哪条结论**。

- **代码库与知识库图谱化、主动记忆注入**（2026-07-18，高优先级，建议深挖）：graphify 等代码知识图谱项目（日记追踪任务里已有调研任务）→ 影响第 2、7 站
- **PKC 竞品热度验证**（2026-09-06）→ 影响第 1 站：同类方案的取舍
- **Loop Engineering 工具化**→ 影响第 6 站：外循环能不能从 markdown 当数据库换成专用状态机
- **方法页瓶颈与 stale 页处理**（wiki-health，连续 4 期）→ 影响第 3、6 站：今天新增的 `/revalidate` 和学习路径就是对这一条的回应
- **Agent memory 第一次有了能直接用的评测结论**（2026-10-25）→ 影响第 5 站

## 毕业标准

能在 20 分钟内给一个团队讲清：个人知识库为什么用编译式 wiki、知识怎么存、怎么保持鲜活、记忆和规则放哪、什么时候需要图，以及它和企业级知识库（Foundry IQ、Fabric IQ）的分界。

## 这条路径暴露的缺口

- **stale 集中**：基础页几乎全部 stale，但多为方法论，变化慢；可以借这次写学习路径的机会做一轮 `/revalidate pkc`
- **缺新机制的页**：`/revalidate`、学习路径、主题推荐都还没有进 wiki，等运行一段时间再写成 PKC 系列 03
- **竞品对照**：graphify、langchain openwiki 等的对照 Claim 还没补（日记里的知识差距任务已列出）
