---
title: "Prompt 优化成熟度阶梯：L0 vibe check → L1 LLM-judge → L2 数据闭环"
created: "2026-08-04"
updated: "2026-08-04"
tags:
  - wiki
  - method
  - prompt-optimization
  - evaluation
  - decision-framework
method_type: "decision-framework"
related_concepts:
  - "[[automatic-prompt-optimization]]"
  - "[[skillopt]]"
  - "[[llm-as-a-judge]]"
related_methods:
  - "[[pre-run-three-number-accounting]]"
---

# Prompt 优化成熟度阶梯：L0 vibe check → L1 LLM-judge → L2 数据闭环

## 摘要

回答一个比"选哪个优化工具"更早的问题：**还没有数据集、没有可验证 reward 时，prompt 该怎么优化？积累到多少数据后才值得迁移到 APO/SkillOpt 这类自动闭环工具？** 核心判断：prompt 优化的分层依据是**评估信号的成熟度**，不是改写算法的花哨程度——L0 vibe check（无评估、人改人看）→ L1 模板改写 + LLM-judge（主观评估、人闭合回路，代表工具 prompt-optimizer）→ L2 数据集 + 客观 reward 自动闭环（算法闭合回路，APO/SkillOpt/DSPy）。L1 与 L2 不是竞品而是流水线上下游：L1 负责冷启动把 prompt 写规范，L2 负责有可衡量指标后持续压榨；L1 人工迭代中积累的 bad case 就是 L2 评估集的种子。

## 适用条件

- **前置依赖**：无——本方法正是为"从零起步"设计的入口决策框架
- **适用场景**：任何需要系统化改进 prompt/skill/agent instructions 的场景；判断当前该停留在哪一层、何时迁移
- **不适用场景**：纯品味类任务（文风、语气）很难客观化，可能长期停在 L1，不必强行上 L2

## 步骤

### Step 1: 判定当前层级

- **输入**：现有评估手段
- **操作**：对照三层特征——无评估凭感觉（L0）；LLM 按 rubric 主观打分、人决定是否迭代（L1）；数据集级客观 reward、算法自动"评分→筛选→再生成"（L2）
- **输出**：当前层级定位
- **判断标准**：看**回路由谁闭合**（人 vs 算法）与**评估信号性质**（直觉/主观定性/客观可验证）

### Step 2: L0→L1——用模板改写工具把 prompt 写规范

- **输入**：原始 prompt
- **操作**：用 L1 工具（如 prompt-optimizer：meta-prompt 模板驱动单次改写 + `evaluation` 模板定性评估 + `iterate` 定向迭代）；区分 system prompt（长期资产，值得反复优化）与 user prompt（一次性，L1 够用）
- **输出**：结构规范的 prompt + 若干轮人工迭代记录
- **判断标准**：prompt 有清晰的角色/规则/工作流结构；同时**开始随手记录 bad case**（输入 + 期望输出/失败原因）

### Step 3: 攒评估集（在 L1 阶段就开始）

- **输入**：L1 迭代中的 bad case
- **操作**:持续收集"输入 + 期望输出/失败原因"对，作为未来评估集种子
- **输出**：评估集雏形
- **判断标准**：到需要 L2 时不必从零造数据

### Step 4: 判定迁移时机（两前提 + 数据量阈值）

- **输入**：任务性质 + 已积累数据量
- **操作**：核对两前提——① 任务有可量化成功标准（能写出 reward 函数）；② 数据量过阈值（见决策点表）
- **输出**：迁移/暂缓决定
- **判断标准**：两前提同时满足才迁移；数据 30~50 条可试跑但必须降噪

### Step 5: L1→L2——接入自动闭环并降噪

- **输入**：评估集 + reward 函数
- **操作**：接入 APO（agent-lightning）/SkillOpt/DSPy；**降噪优先于扩量**——同 prompt 多次采样取均值、train/val 分开、警惕 val 摆动
- **输出**：数据集驱动的自动优化闭环
- **判断标准**：优化曲线可信（噪声被摊薄）；资产可沿 APO → SFT → RL 阶梯复用

## 决策点

| 条件 | 选择 | 理由 |
|------|------|------|
| 数据 < 10 条 | 留在 L1 | 任何自动优化都会过拟合到这几条上，分数摆动无意义 |
| 数据 30~50 条 + 可量化 reward | 可试 L2，必须降噪 | 同 prompt 多次采样取均值、train/val 分开 |
| 数据 100+ 条 | 稳定区间，投入完整闭环 | 评估噪声被摊薄，优化曲线可信 |
| 纯品味类任务（文风、语气） | 长期停留 L1 | 成功标准难客观化，写不出可靠 reward |
| 优化对象是 user prompt | 到 L1 为止 | 一次性资产，不值得为它建 eval 闭环 |
| 优化对象是 system prompt / skill / 工具描述 | 值得上 L2 | 稳定资产，一次投入反复受益 |

## Claims

### Claim: 分层依据是评估信号的成熟度，不是改写算法——核心差异在"回路由谁闭合"

- **来源**：[[Prompt优化成熟度阶梯——从vibe check、LLM-judge到数据闭环：APO与SkillOpt前置篇]]
- **首次出现**：2026-07-30
- **最近更新**：2026-08-04
- **置信度**：0.75
- **状态**：active

> L0 无评估（人改人看）、L1 主观评估（LLM 按 rubric 打分，人看结果决定是否迭代——人闭合回路）、L2 客观评估（数据集 reward，算法自动"评分→筛选→再生成"——算法闭合回路）。L1 的评估是拿几条试跑样本得到"定性方向信号"，不是统计上可靠的度量：噪声大（同 prompt 多次评分摆动）、有系统性偏见（judge 偏爱更长更结构化的输出）、覆盖不了输入分布。"人闭合 vs 算法闭合"是 L1/L2 的本质分界。

### Claim: L1 与 L2 是流水线上下游而非竞品——bad case 从 L1 就开始攒

- **来源**：[[Prompt优化成熟度阶梯——从vibe check、LLM-judge到数据闭环：APO与SkillOpt前置篇]]
- **首次出现**：2026-07-30
- **最近更新**：2026-08-04
- **置信度**：0.75
- **状态**：active

> L1（prompt-optimizer 类）解决"没数据时把 prompt 写规范"，L2（APO/SkillOpt/DSPy）解决"有指标后持续压榨"。L1 人工迭代中的每个 bad case（输入 + 期望输出/失败原因）随手记下来就是未来评估集的种子——到需要 L2 时才从零造数据，成本高得多。

### Claim: 迁移两前提——可量化 reward + 数据过阈值（<10 留 L1 / 30-50 可试 / 100+ 稳定）

- **来源**：[[Prompt优化成熟度阶梯——从vibe check、LLM-judge到数据闭环：APO与SkillOpt前置篇]]
- **首次出现**：2026-07-30
- **最近更新**：2026-08-04
- **置信度**：0.75
- **状态**：active

> 前提一：任务有可量化成功标准（精确匹配、通过率、结构化字段命中、LLM-judge 加多数投票等）；前提二：数据量——< 10 条留在 L1（自动优化会过拟合）；30~50 条可开始尝试但必须降噪（多次采样取均值、train/val 分开）；100+ 条进入稳定区间。**降噪优先于扩量**：50 条 × 3 次采样取均值往往比 150 条 × 1 次更能稳定优化方向——评估噪声是 L2 摆动的第一大不稳定源，对 APO 和后续 RL 都成立。

### Claim: prompt-optimizer 是 L1 典型实现——meta-prompt 模板驱动单次改写，模板分语言不分模型

- **来源**：[[Prompt优化成熟度阶梯——从vibe check、LLM-judge到数据闭环：APO与SkillOpt前置篇]]
- **首次出现**：2026-07-30
- **最近更新**：2026-08-04
- **置信度**：0.75
- **状态**：active

> 工作流是"原始 prompt + 优化模板（meta-prompt）→ 优化器 LLM → 改写后 prompt"的一次指令化改写。优化模板不是被优化对象，而是指挥优化器如何改写的指令（如 `general-optimize` 约 70 行结构化改写指令，按 Role/Profile/Skills/Rules/Workflows 骨架重组）。内置模板只分语言（zh/en）不分模型——Claude 偏好 XML tags、GPT/Gemini 各有官方风格，这类差异未覆盖，是它相对粗糙的一点。区分 system prompt（长期资产、影响所有请求、需部署控制权）与 user prompt（一次性）两个优化入口。

## 实践记录

（暂无——阶梯本身是从 APO/SkillOpt 实践反推的前置框架，L2 段实践见 [[automatic-prompt-optimization]] 与 [[skillopt]] 的实测记录）

## 关联概念

- [[automatic-prompt-optimization]] — `uses` L2 层的代表工具；"评估噪声是第一大不稳定源"的教训是阈值设计依据
- [[skillopt]] — `uses` L2 层工具（持久 skill artifact 优化），与 APO 同层不同强项
- [[llm-as-a-judge]] — `uses` L1 层的评估机制（rubric 主观打分、pair-judge 对比）
- [[generation-evaluation-separation]] — `implements` 三层阶梯是"评估能力决定优化能力"原则的成熟度展开

## 关联方法

- [[pre-run-three-number-accounting]] — `extends` 到达 L2 后开跑前的算账判断式（σ_d / δ_min / δ_remain）
- [[reward-design-three-inputs]] — `extends` L2 的 reward 怎么设计：三份输入与两本账分家

## 来源

- [[Prompt优化成熟度阶梯——从vibe check、LLM-judge到数据闭环：APO与SkillOpt前置篇]] — 三层阶梯、迁移阈值、prompt-optimizer 机制、system/user prompt 分工（2026-07-30）
