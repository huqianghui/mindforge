---
title: "学习路径：Agent 自我改进"
created: "2026-11-07"
updated: "2026-11-07"
tags:
  - wiki
  - path
  - self-improvement
  - rsi
  - skillopt
path_id: "agent-self-improvement"
audience: "自己 + CSA 团队"
gap_topics:
  - self-evolving-agent
  - harness
  - agent-memory
signals:
  - "arXiv：recursive self-improvement、prompt / skill optimization、self-evolving agent"
  - "SkillOpt / DSPy / TextGrad / agent-lightning 的 GitHub release"
  - "各家 agent 产品的 memory 与 dreaming 类功能发布"
---

# 学习路径：Agent 自我改进

agent 怎样把经验变成对自身的持久修改？这条路径讲"不改权重或改机制"的那一半：先用 RSI 的框架分清三种"变好"，再看 prompt、skill、harness 三个层次上的优化方法，以及产品里已经落地的记忆与离线整理，最后回到"凭什么说它变好了"。改权重的那一半在 [[rl-post-training]]。

**怎么用**：按站点顺序读，每站对照「算会」自查。第 1 站的框架贯穿全程，后面每一站都可以回头用它定位。

**预计总用时**：约 12~15 小时。

## 第 1 站 · 框架：三种"变好"与分级

- **读**：[[recursive-self-improvement]]、[[RSI系列00：递归自我改进总览]]
- **前置**：无
- **用时**：约 2 小时
- **算会**：
  - 能区分三种"变好"：任务内修正、持久状态改进、改进机制本身被改进，说出只有第三种才是递归
  - 能说出两套五级分级的编号含义为什么不同，以及 APO、SkillOpt、RRSI 为什么大多落在 L3
  - 能复述判断一个自我改进主张的五个问题

## 第 2 站 · prompt 层：APO 与成熟度阶梯

- **读**：[[automatic-prompt-optimization]]、[[prompt-optimization-maturity-ladder]]、[[prompt-optimization-tool-selection]]、[[Agent-Lightning算法深解：APO]]
- **前置**：第 1 站
- **用时**：约 2 小时
- **⚠️ stale**：[[automatic-prompt-optimization]] 9/9、决策页 4/4
- **算会**：
  - 能解释 APO 是"文本梯度 + beam search"：critic 写、editor 改，以及选 beam search 的首要理由是评估成本
  - 能说出 L0 vibe check、L1 LLM-judge、L2 数据闭环的分层依据：回路由谁闭合
  - 能说出 APO 摆动大的主因是评估噪声，而不是选错框架

## 第 3 站 · skill 层：SkillOpt

- **读**：[[skillopt]]、[[SkillOpt系列01：源码篇]]、[[SkillOpt系列04：APO与SkillOpt联合展望]]、[[2026-07-01-SkillOpt]]
- **前置**：第 2 站
- **用时**：约 2.5 小时
- **⚠️ stale**：9 条中 7 条
- **算会**：
  - 能说出 SkillOpt 把 SGD 的哪四个机件搬进文本空间：有界学习率、拒绝记忆、慢权重、meta-learning
  - 能解释"分数当筛子不当梯度"为什么是 SkillOpt 与 RL 的真正分野
  - 能说出快慢两层循环和三个数据切分各自的作用，以及 APO 与 SkillOpt 什么时候该选谁、什么时候都不跑

## 第 4 站 · harness 层：Meta-Harness 与 AutoResearch

- **读**：[[meta-harness]]、[[autoresearch]]、[[hermes-agent]]
- **前置**：第 1 站
- **用时**：约 2 小时
- **⚠️ stale**：三页 16 条全部 stale
- **算会**：
  - 能说出 Meta-Harness 的两层 harness（Platform 与 User），以及完整执行 trace 为什么是不可替代的诊断信号
  - 能说出 AutoResearch 是"受控搜索空间中的自动化爬坡"，它和 Ralph Loop 的核心区别在选择机制
  - 能说出 Hermes 的 skill 自动生成与 Curator 生命周期管理怎么做，以及它的质量检查还缺什么

## 第 5 站 · 产品里的落地：记忆与离线整理

- **读**：[[agent-memory-lifecycle]]、[[GitHub-Copilot系列02：Memory、Dreaming与自我改进]]、[[claude-code-memory-system]]
- **前置**：第 1 站
- **用时**：约 1.5 小时
- **算会**：
  - 能用 RSI 框架定位 Copilot Memory 与 Dreaming：改的只是 harness 的上下文层，横跨 L1 到 L3
  - 能说出 Copilot 的门控是"使用中的投票"，研究方法的门控是"上线前的比较"，各自的代价
  - 能说出记忆适合存背景知识、不适合存行为规则，以及这个结论两家（Claude Code、Copilot）是怎么各自走到的

## 第 6 站 · 离线复用经验：Dream-RSI 与持续学习

- **读**：[[2026-09-22-Dream-RSI]]、[[continual-self-improving-ai]]、[[2026-07-07-LifeSkill]]
- **前置**：第 3、5 站
- **用时**：约 2 小时
- **⚠️ stale**：[[continual-self-improving-ai]] 7/7
- **算会**：
  - 能说出 Dream-RSI 的"做梦"是什么：把探索历史变成可回放的仿真器，候选在上线前就能打分
  - 能对比"Dream-RSI 在梦里挑，Copilot Dreaming 在梦里写"
  - 能说出 LifeSkill 里 skill 用完即消失（内化）的思路，以及它和 SkillOpt 的不同

## 第 7 站 · 凭什么说变好了

- **读**：[[generation-evaluation-separation]]、[[llm-as-a-judge]]、[[recursive-self-improvement]]（五个验证问题）
- **前置**：第 2~6 站
- **用时**：约 1 小时
- **算会**：
  - 能说出生成与评估为什么要分离，以及自评为什么不可信
  - 能对任意一个自我改进方法问出五个问题：反馈是真的吗、是不是偶然得分高、验证集参与学习了吗、收益来自能力还是更多计算、新规则有没有损害旧能力
  - 能给一个产品级的自我改进功能补上"上线前比较"这道门

## 前沿站 · 正在发生的变化

来自知识差距报告的 self-evolving-agent、harness、agent-memory 主题。「算会」统一是：**能说出它改变了上面哪一站的哪条结论**。

- **Harness 递归自我优化进入大厂开源阶段**（2026-10-25，高优先级，建议深挖）：Harness² 权重不动、无监督改 harness、跨任务更新"改进 harness 的方法" → 影响第 1、4 站：这是第一个可能够到 L4 的样本吗？
- **Skill-RL 化浪潮**（2026-09-12）→ 影响第 3 站：skill 优化开始借 RL 的方法，"分数当筛子"的边界会不会被打破
- **多组件 prompt / skill 优化的耦合问题**（2026-07-18，高优先级）→ 影响第 2、3 站：同时优化多个组件时互相干扰
- **Agent memory 第一次有了能直接用的评测结论**（2026-10-25）→ 影响第 5 站：记忆功能终于能被评测检验

## 毕业标准

拿到任意一个"agent 会自我改进"的产品或论文，能在 15 分钟内说出：它改的是哪一层（prompt / skill / harness / 记忆 / 权重）、落在第几级、门控在哪里、改动存在哪、能不能回滚，以及五个验证问题里它答不上的是哪几个。

## 这条路径暴露的缺口

- **stale 集中**：第 2~4 站的方法页几乎全部 stale，优先 `/revalidate skillopt`、`automatic-prompt-optimization`、`meta-harness`
- **缺概念页**：Harness²（递归 harness 优化）还没有独立页，目前只在知识差距报告里
- **决策页**：[[prompt-optimization-tool-selection]] 需要补上"SkillOpt vs Harness² 类方法"的对照
