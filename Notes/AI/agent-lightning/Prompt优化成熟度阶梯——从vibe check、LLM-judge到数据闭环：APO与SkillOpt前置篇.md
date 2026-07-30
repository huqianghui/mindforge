---
title: Prompt 优化成熟度阶梯——从 vibe check、LLM-judge 到数据闭环：APO 与 SkillOpt 前置篇
created: 2026-07-30
tags:
  - AI
  - prompt-optimization
  - evaluation
  - LLM-as-judge
  - prompt-optimizer
  - agent-lightning
  - SkillOpt
---

# Prompt 优化成熟度阶梯——从 vibe check、LLM-judge 到数据闭环：APO 与 SkillOpt 前置篇

> 本篇是 APO / SkillOpt 系列的**前置篇**，回答一个更早的问题：**当你还没有数据集、没有可验证 reward 时，prompt 该怎么优化？以及积累到多少数据后，才值得迁移到 APO / SkillOpt 这类自动闭环工具？**
>
> 配套阅读：[[Prompt优化工具选型——DSPy、TextGrad、AdalFlow与agent-lightning的决策指南]]（有数据后的工具选型）、[[SkillOpt系列04：APO×SkillOpt联合展望——先探索后精修的两段式管道与选型算账方法]]（两段式管道）。

## 一、先给结论：三层成熟度阶梯

Prompt 优化不是单一工具问题，而是一条随**评估能力**升级的成熟度阶梯：

```
L0 vibe check          L1 模板改写 + LLM-judge         L2 数据集 + 客观 reward 自动闭环
（凭感觉改）      →    （prompt-optimizer 在这层）  →   （APO / SkillOpt / DSPy 在这层）
   无评估                 主观评估、人闭合回路              客观评估、算法闭合回路
```

**每一层的核心差异不在"改写算法"，而在"评估信号的性质"**：

| | L0 vibe check | L1 LLM-judge | L2 数据闭环 |
|---|---|---|---|
| 评估信号 | 人眼看输出，凭感觉 | LLM 按 rubric 主观打分（单条/少量样本） | 数据集级客观 reward（可验证指标） |
| 回路闭合 | 人改人看 | 人看评估结果 → 人决定是否/如何迭代 | 算法自动：评分 → 筛选 → 再生成，无人介入 |
| 收敛依据 | 直觉 | 人的判断 | 分数曲线 |
| 数据前提 | 无 | 无或几条试跑样本 | 几十条起步的标注/可验证数据集 |
| 典型工具 | — | [prompt-optimizer](https://github.com/linshenkx/prompt-optimizer) | agent-lightning APO、SkillOpt、DSPy |

**衔接逻辑**：L1 和 L2 不是竞品，是流水线上下游——L1 负责"冷启动把 prompt 写规范"，L2 负责"有可衡量指标后持续压榨性能"。你在 L1 的人工迭代过程中积累的 bad case 和评估直觉，正是构建 L2 评估集的原材料。

## 二、L1 代表工具：prompt-optimizer 的机制

[prompt-optimizer](https://github.com/linshenkx/prompt-optimizer)（linshenkx，32k+ stars）是 L1 层的典型实现，支持 Web/桌面/Chrome 插件/Docker 四种形态。在线版：[文本提示词优化](https://prompt.always200.com/#/basic/system)、[Prompt Garden 素材库](https://garden.always200.com/#all)。

### 2.1 核心机制：meta-prompt 模板驱动的单次改写

工作流本质是一次"指令化改写"：

```
你的原始 prompt + 选定的优化模板（meta-prompt） → 优化器 LLM → 改写后的 prompt
```

关键点：

- **优化模板不是"被优化的对象"，而是"指挥优化器 LLM 如何改写的指令"**。UI 下拉框显示的只是模板名（如"通用优化"），背后是一份完整的长 meta-prompt——以内置的 `general-optimize` 为例，实际是约 70 行的结构化改写指令，要求优化器按 `Role / Profile / Skills / Rules / Workflows / Initialization` 的固定骨架重组 prompt，并包含"保留 `{{variable}}` 占位符逐字不动"等细节约束。
- **内置模板开箱即用，不需要自己先写模板**。源码 `packages/core/src/services/template/default-templates/` 内置完整模板族：`optimize`（系统提示词：general / analytical / output-format）、`user-optimize`（用户提示词：basic / planning / professional 三档）、`iterate`（定向迭代）、`image-optimize`（文生图）、`evaluation`（评估）等。
- **内置模板只分语言（zh/en），不分模型**。同一个 meta-prompt 会原样发给你选的任何优化模型——Claude 偏好 XML tags、GPT/Gemini 各有官方 prompting 风格，这类模型差异它没有覆盖。要按目标模型定制改写风格，需在"模板管理"里自定义模板。这是它相对粗糙的一点。
- **Prompt Garden 只是素材库**，提供现成 prompt 作为优化起点，本身不参与优化逻辑。

### 2.2 system prompt 优化 vs user prompt 优化

工具区分两个入口，差异在于**优化哪种资产、以及你有没有控制权**：

| | 优化 system prompt | 优化 user prompt |
|---|---|---|
| 优化对象 | AI 的"人格与规则"：角色、能力边界、行为准则、输出格式 | 单次任务指令：把一个具体请求表达得更清楚 |
| 生效范围 | 该应用的**所有**后续请求 | 只影响**这一次**请求 |
| 资产性质 | 长期复用资产，一次投入反复受益 | 一次性，用完即弃 |
| 前提 | 有部署控制权：自己开发 agent/bot/应用 | 无 system prompt 控制权：网页版 chat、别人的产品 |

分工原则：一条要求对每次请求都成立（语气、格式、禁忌）→ 放 system prompt；只对当前任务成立（本次素材、目标）→ 放 user prompt。

**与 L2 的衔接点**：agent 开发中真正值得上 APO/SkillOpt 的是 **system prompt 及 skill/工具描述**——它们是稳定资产，值得用数据集持续压榨；user prompt 优化属于交互场景的即时增强，到 L1 就够，不值得为它建 eval 闭环。

### 2.3 L1 的评估：有评估，但反馈回路靠人闭合

prompt-optimizer 并非没有评估——它内置 `evaluation` 模板族（单提示词按 rubric 评分、优化前后 pair-judge 对比、迭代评估等）。准确的定位是：

- **怎么评**：LLM 按 rubric（清晰度、完整性、结构性、约束明确度等维度）打分写点评，或对两版 prompt 做 pair 对比选优。
- **本质**：拿一条或几条试跑样本，得到"感觉上变好了没有、往哪个方向改"的**定性方向信号**，不是统计上可靠的度量。
- **局限**：噪声大（同一 prompt 多次评分会摆动）、有系统性偏见（judge 偏爱更长更结构化的输出）、覆盖不了输入分布——几条样本上变好，可能在没测到的输入上退化。
- **回路**：评估结果给人看，由人决定是否发起下一轮"定向迭代"（`iterate` 模板）——**人闭合回路**，这是它与 L2 的本质分界。

## 三、什么时候迁移到 L2（APO / SkillOpt）

### 3.1 迁移的两个前提

1. **任务有可量化的成功标准**——能写出 reward 函数（精确匹配、通过率、结构化字段命中、LLM-judge 加多数投票等）。纯品味类任务（文风、语气）很难客观化，可能长期停在 L1。
2. **积累了足够的评估数据**——这是多数人卡住的地方，见下。

### 3.2 数据量参考阈值

结合 APO/SkillOpt 实践经验（APO 摆动的第一大来源就是评估噪声，见 [[automatic-prompt-optimization]]）：

| 数据量 | 建议 |
|---|---|
| < 10 条 | 留在 L1。数据太少，任何自动优化都会过拟合到这几条上，分数摆动无意义 |
| 30 ~ 50 条 | 可以**开始尝试** APO/SkillOpt，但必须做降噪：同 prompt 多次采样取均值、train/val 分开、警惕 val 上的摆动 |
| 100+ 条 | 进入稳定区间：评估噪声被摊薄，优化曲线可信，值得投入完整闭环 |

两条实操建议：

- **降噪优先于扩量**：50 条 × 3 次采样取均值，往往比 150 条 × 1 次更能稳定优化方向——评估噪声是 L2 摆动的第一大不稳定源，这一点对 APO 和后续 RL 都成立。
- **数据从 L1 阶段就开始攒**：在用 prompt-optimizer 人工迭代时，把每个 bad case（输入 + 期望输出/失败原因）随手记下来，这就是未来评估集的种子。到需要 L2 时才从零造数据，成本高得多。

### 3.3 完整迁移路径

```
无数据、冷启动
  │  prompt-optimizer：模板改写把 prompt 写规范
  │  + LLM-judge 定性评估 + 人工定向迭代
  │  （过程中持续收集 bad case → 评估集种子）
  ▼
30~50 条 + 可量化 reward
  │  APO（agent-lightning）/ SkillOpt：数据集驱动自动搜索
  │  先降噪（多次采样取均值），再看优化曲线
  ▼
100+ 条、reward 稳定
  │  完整闭环持续压榨；资产（agent/reward）可沿
  │  APO → SFT → RL 阶梯复用（agent-lightning 主线）
  ▼
```

## 四、小结

- Prompt 优化的分层依据是**评估信号的成熟度**，不是改写算法的花哨程度：vibe check（无评估）→ LLM-judge rubric（主观、人闭环）→ 数据集 reward（客观、自动闭环）。
- prompt-optimizer 与 APO/SkillOpt 是**上下游而非竞品**：前者解决"没数据时把 prompt 写规范"，后者解决"有指标后持续压榨"。
- 迁移时机由数据决定：30~50 条可起步（配合降噪），100+ 条进入稳定区间；**评估集要从 L1 阶段就开始攒**。

## 相关链接

- [prompt-optimizer GitHub](https://github.com/linshenkx/prompt-optimizer) ｜ [在线优化站](https://prompt.always200.com/#/basic/system) ｜ [Prompt Garden](https://garden.always200.com/#all)
- [[Prompt优化工具选型——DSPy、TextGrad、AdalFlow与agent-lightning的决策指南]]
- [[Agent Lightning系列01：用APO做Prompt Tuning——Azure实践与beam search算法解析]]
- [[Agent Lightning系列04：APO源码剖析——算法=LLM调用+sorted、虚拟多agent真相与核心使用场景]]
- [[SkillOpt系列04：APO×SkillOpt联合展望——先探索后精修的两段式管道与选型算账方法]]
- Wiki：[[automatic-prompt-optimization]]、[[generation-evaluation-separation]]
