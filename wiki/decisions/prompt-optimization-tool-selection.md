---
title: "Prompt 优化工具选型——DSPy vs agent-lightning"
created: "2026-06-29"
updated: "2026-06-29"
tags:
  - wiki
  - decision
  - prompt-optimization
  - tool-selection
decision_status: "active"
related_concepts:
  - "[[agent-lightning]]"
  - "[[automatic-prompt-optimization]]"
  - "[[rejection-sampling-finetuning]]"
related_methods: []
---

# Prompt 优化工具选型——DSPy vs agent-lightning

## 背景

当目标是"为 agent 找最优 prompt"时，市面上工具众多（DSPy、TextGrad、AdalFlow、Promptolution、agent-lightning，以及 LangSmith/Humanloop 等平台级方案）。常见误判是：因为 agent-lightning 内置 APO（[[automatic-prompt-optimization]]）算法，就默认它是 prompt 调优的好选择。这个决策要厘清：纯 prompt 优化场景该选哪个，以及 agent-lightning 真正的差异化价值在哪。

## 选项分析

### 选项 A: DSPy（专做 prompt 优化的算法库）

- **优势**：最成熟、社区最大（Stanford 出品），"编程而非提示"声明式定义 pipeline，用 MIPROv2 / BootstrapFewShot / COPRO 等优化器自动搜最优 prompt（也能优化权重），直接覆盖 classifier / RAG / agent loop，MIPROv2 工业界验证过。
- **劣势**：专注 prompt/few-shot 优化，不提供 RL 级 rollout 训练基础设施。
- **适用条件**：主要目标是 prompt 调优、寻找最优 prompt，且明确不碰模型权重微调。

### 选项 B: agent-lightning（method-agnostic 训练框架）

- **优势**：method-agnostic（APO↔RL↔SFT 可换，共享同一份 reward/rollout）+ RL 级 rollout 基础设施；一套 grader 从 prompt 调优复用到权重微调。
- **劣势**：只做 prompt 优化时，method-agnostic 和 RL rollout 这两个最大卖点完全用不上——等于付出"装一个偏 RL 训练框架"的复杂度，却拿不到它真正值钱的部分。
- **适用条件**：客户预期会从 prompt 调优走向权重微调（RL/SFT），需要"一套 reward / rollout 复用到多种优化方法"。

### 选项 C: TextGrad / AdalFlow（文本梯度专用）

- **优势**：TextGrad 与 APO 同一学术思想（LLM 当优化器、自然语言当梯度）但专做这件事，概念清晰；AdalFlow 把 TextGrad 那套统一进 PyTorch-like 框架、偏生产。
- **劣势**：TextGrad 研究级、工程化弱于 DSPy；AdalFlow 仍在上升期。
- **适用条件**：想要"文本梯度"那种和 APO 一模一样的直觉。

## 决策结论

- **选择**：只做 prompt 调优 → **DSPy**；既调 prompt 又预期将来 RL 微调权重 → **agent-lightning**。
- **理由**：agent-lightning 的差异化价值是 method-agnostic + RL rollout 基础设施，纯 prompt 优化场景这两点用不上，应该用专门做 prompt optimization 的成熟工具（DSPy）。
- **放弃理由**：纯 prompt 场景选 agent-lightning = 承担 RL 训练框架的复杂度却不享受其价值；TextGrad/AdalFlow 思想对但工程成熟度不及 DSPy。
- **前提假设**：① 客户是否会走向权重微调，决定 agent-lightning 是否值得提前押注——假设失效（永不微调）则 agent-lightning 永远是错选择；② DSPy 的优化器对目标任务类型（agent loop）适配良好。

## 影响范围

- **受影响的概念**：[[automatic-prompt-optimization]]（APO 只是 agent-lightning 的一个算法槽位，不构成选它的理由）。
- **受影响的方法**：无。

## 验证状态

- **验证方式**：在真实任务上对比 DSPy 与 agent-lightning APO 的 prompt 优化效果与工程成本。
- **当前状态**：部分验证——agent-lightning APO 侧已三轮实跑（系列01），DSPy 侧未做对照实验。
- **验证证据**：三轮实跑得出的工具无关教训反而更关键：真正瓶颈是 reward 设计 + 评估噪声 + 数据量，不是选哪个框架（见下方 Claim）。

## Claims

### Claim: 纯 prompt 调优首选 DSPy，不推荐 agent-lightning

- **来源**：[[Prompt优化工具选型——DSPy、TextGrad、AdalFlow与agent-lightning的决策指南]]
- **首次出现**：2026-06-24
- **最近更新**：2026-06-24
- **置信度**：0.8
- **状态**：active

> 如果主要目标是 prompt 调优、寻找最优 prompt 且明确不碰权重微调，首选 DSPy。agent-lightning 的差异化价值是 method-agnostic（APO↔RL↔SFT 可换）+ RL 级 rollout 基础设施——只做 prompt 优化时这两个最大卖点完全用不上，等于付出"装一个偏 RL 训练框架"的复杂度却拿不到值钱的部分。agent-lightning 只在一种情况值得提前押注：客户预期会从 prompt 调优走向权重微调，需要"一套 reward / rollout 复用到多种优化方法"。一句话：只做 prompt → DSPy；既调 prompt 又要 RL 微调 → agent-lightning。

### Claim: 先解决 reward + 噪声 + 数据量，框架只是引擎不是方向盘

- **来源**：[[Prompt优化工具选型——DSPy、TextGrad、AdalFlow与agent-lightning的决策指南]]
- **首次出现**：2026-06-24
- **最近更新**：2026-06-24
- **置信度**：0.85
- **状态**：active

> 比"选哪个框架"更重要的事：真正的瓶颈是 reward 设计 + 评估噪声 + 数据量。小数据集标准误会盖过真实增益、reward 设错会让框架"忠实地优化噪声"、数据量不足无法可靠确认提升。落地顺序应是先把评测集和 reward 做扎实（降噪、对齐真实目标），再谈用哪个优化器——否则无论 DSPy 还是 agent-lightning 都只是在噪声里挑最大值。

## 关联概念

- [[agent-lightning]] — `constrains` 本决策的核心被评估对象——其差异化价值（method-agnostic + RL rollout）决定了它只在「将走向权重微调」时才该选
- [[automatic-prompt-optimization]] — `uses` agent-lightning 的 APO 是本决策评估的候选算法之一，但 APO 内置不构成选 agent-lightning 的理由
- [[rejection-sampling-finetuning]] — `contrasts` "是否走向权重微调（SFT/RL）"是本决策的关键前提——若会，则 agent-lightning 的 method-agnostic 价值才兑现

## 来源

- [[Prompt优化工具选型——DSPy、TextGrad、AdalFlow与agent-lightning的决策指南]] — 决策结论、工具对比、典型场景路径、真瓶颈
