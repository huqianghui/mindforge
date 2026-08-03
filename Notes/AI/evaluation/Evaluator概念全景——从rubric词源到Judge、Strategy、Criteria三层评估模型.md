---
title: Evaluator 概念全景——从 rubric 词源到 Judge、Strategy、Criteria 三层评估模型
created: 2026-08-03
tags:
  - AI
  - evaluation
  - LLM-as-judge
  - rubric
  - evaluator
---

# Evaluator 概念全景——从 rubric 词源到 Judge、Strategy、Criteria 三层评估模型

> 本篇是 Evaluation 系列的**概念篇**，把 LLM/Agent 评估领域最容易混淆的一组术语——rubric、evaluator、judge、metric、criteria——梳理成一张正交的三层模型。姊妹篇 [[从Evaluator到Reward-Function——评估信号如何变成APO与强化学习的训练信号]] 讨论评估信号如何进入训练闭环。
>
> 配套阅读：[[Prompt优化成熟度阶梯——从vibe check、LLM-judge到数据闭环：APO与SkillOpt前置篇]]（L1 层的 LLM-judge rubric 打分正是本篇讨论的对象）。

## 一、先给结论：三层正交模型

很多 Survey 和产品文档把 evaluator 的分类画成一棵树，但实际上有三个**正交（orthogonal）**的维度，不应放在同一层：

```
Layer 1：Judge（谁来评）
────────────────────────
Human ｜ Rule ｜ Metric ｜ LLM

        ↓

Layer 2：Evaluation Strategy（怎么评）
────────────────────────
Pointwise ｜ Pairwise ｜ Listwise
Reference-based ｜ Reference-free

        ↓

Layer 3：Evaluation Criteria（评什么）
────────────────────────
Rubric ｜ Accuracy ｜ Faithfulness
Groundedness ｜ Helpfulness ｜ Safety ｜ ...
```

三层各自回答一个独立的问题：

| 层 | 问题 | 典型取值 | 换了会怎样 |
|---|------|---------|-----------|
| Layer 1 Judge | **谁**来评（Who） | Human / Rule / Metric / LLM | 换 Judge 不换标准：GPT judge 换成人工，rubric 可以不变 |
| Layer 2 Strategy | **怎么**评（How） | Pointwise / Pairwise / Listwise / Reference-based / Reference-free | 同一个 LLM judge 既能单条打分也能两两比较 |
| Layer 3 Criteria | **评什么**（What） | Accuracy / Faithfulness / Safety…（rubric 是它们的组织形式） | 换一套 rubric，同一个 judge 就从客服评估器变成医疗评估器 |

**Rubric 不在 Layer 1，也不在 Layer 2——它是 Layer 3 的组织形式**：把多个评价维度（Accuracy、Helpfulness、Safety…）连同每个维度的打分等级说明，组合成一套结构化评分标准。这是理解后文所有辨析的钥匙。

## 二、rubric 到底是什么：词源与词性

### 2.1 词源：从红赭石到评分标准

rubric 常被误认为来自 rule，实际词根是拉丁语的"红色"：

```
Latin: ruber（红色）
  ↓
rubrica（red ochre 红赭石 / red writing 红色书写）
  ↓
中世纪手稿：重要标题、法律条文、教会指令用红墨水书写
  ↓
红字标题 → 重要说明 → 指导规则
  ↓
grading guideline（评分规则）
  ↓
rubric（评分细则）
```

发音 **/ˈruː.brɪk/**（英美一致），可拆记为 **ROO + brick**，重音在第一音节。常见误读是按拼写读成 "rub-ric"。

### 2.2 词性：名词，且常作定语

rubric 是**可数名词**（a rubric / the rubric / design a rubric）。"Rubric Evaluator" 中它不是形容词，而是英语常见的**名词作定语（noun adjunct）**——如同 school bus、data engineer：

> rubric evaluator = 一个 evaluator，它使用 rubric。

常见搭配：grading rubric（评分标准）、scoring rubric（评分细则）、rubric-based evaluation（基于评分标准的评估）、follow the rubric（按标准执行）。

### 2.3 与 rule、criterion、metric 的辨析

这四个词的差异是概念混乱的第一来源：

| 词 | 中文 | 含义 | 例子 |
|------|------|------|------|
| rule | 规则 | 单条判定规则，多为二值 | "输出必须是合法 JSON" |
| criterion（复数 criteria） | 评价标准 | 单个评价**维度**，只说评什么 | Accuracy |
| metric | 指标 | 可计算的量化指标 | BLEU、ROUGE、F1、Exact Match、Latency |
| **rubric** | 评分细则 | 维度 + 等级 + 打分说明的**完整体系** | 见下 |

一套 rubric 不仅规定"评什么"，还规定"怎么给分"：

```
Rubric — Accuracy 维度
5 = 完全正确
4 = 基本正确，有轻微遗漏
3 = 部分正确
2 = 大部分错误
1 = 完全错误
```

所以 **rubric ⊃ criteria**：criteria 只是维度清单，rubric 把维度、权重、等级锚点（anchor）组织成可执行、可重复的评分说明书。这正是它对 LLM judge 的价值——同一套 rubric 让 judge 每次都按同一标准打分，把"临时自由发挥"变成"一致、可重复的评价"。

## 三、Layer 1：Judge 的四种实现

按"谁来评"分类，evaluator 有四种实现方式：

```
Evaluator
│
├── Human Evaluator          人工评估（黄金标准，贵且慢）
├── Rule-based Evaluator     确定性规则（JSON 合法性、SQL 可执行、单测通过）
├── Metric-based Evaluator   经典指标（BLEU / ROUGE / F1 / EM / BERTScore）
└── Model-based Evaluator    模型评估
        │
        ├── Reward Model         专门训练的打分模型（PairRM、Prometheus）
        └── LLM-as-a-Judge       通用 LLM 直接当裁判（当前最热门）
```

几个要点：

- **Human 是校准锚点而非日常工具**——所有自动 judge 的终极指标都是 Agreement with Humans（与人工评估的一致率）。
- **Rule 和 Metric 零噪声但覆盖窄**——能用确定性规则评的信号（格式、可执行性、精确匹配）永远优先用规则，这与 [[reward-design-three-inputs]] 中"确定性规则分白送零噪声信号"的原则一致。
- **LLM-as-a-Judge 是 2024 年后的主流方向**——通用 LLM 加一段评估 prompt 即可覆盖开放式任务，代表工作见第六节论文地图。
- **Reward Model 与 LLM Judge 的边界正在模糊**——专训 reward model 走向 rubric 化、可解释化，通用 LLM judge 走向 RL 训练强化（如 J1），两条线在收敛。

## 四、Layer 2：五种评估策略

同一个 judge 可以用不同策略工作：

| 策略 | 机制 | 典型场景 |
|------|------|---------|
| **Pointwise** | 单个答案 → 一个分数 | 生产监控、reward 信号（RL 只认标量） |
| **Pairwise** | 两个答案 → 哪个更好 | 模型对比、偏好数据构造（MT-Bench、Chatbot Arena、DPO 数据） |
| **Listwise** | 多个答案 → 完整排序 | Best-of-N 采样筛选、beam search 剪枝 |
| **Reference-based** | 与标准答案比对 | 数学、代码、有 GT 的封闭任务 |
| **Reference-free** | 无标准答案，直接判质量 | 开放问答、写作、对话 |

两点工程直觉：

1. **Pairwise 比 Pointwise 更符合人类判断的天性**——人比较两个东西比给一个东西打绝对分更稳定，这是 Chatbot Arena 用 Elo 而不用均分的原因；但 pairwise 无法直接喂给需要标量 reward 的训练循环，需要转换（如 Bradley-Terry 模型）。
2. **Reference-based / Reference-free 决定了评估的天花板**——有 GT 就有可验证 reward（RLVR 路线），没有 GT 才需要 rubric + LLM judge 来近似。这条分界线直接决定了下游优化的技术选型，详见姊妹篇。

## 五、最容易混淆的一题：Rubric Evaluator 和 LLM Judge 是并列关系吗

实际讨论中最常见的困惑：有的资料把 evaluator 画成 `Rule / Metric / LLM Judge / Rubric Evaluator` 四个并列项，有的又把 Rubric-based 放在 LLM-as-a-Judge 下面。哪个对？

**答案：这是产品层（Product API）和研究层（Research Taxonomy）两套话语体系。**

### 5.1 研究层：Rubric-based 是 Judge 的一种工作方式

学术 Survey 的标准画法：

```
Evaluator
│
├── Human
├── Rule-based
├── Metric-based
└── LLM-as-a-Judge
        │
        ├── Pointwise
        ├── Pairwise
        ├── Listwise
        ├── Reference-based
        ├── Reference-free
        └── Rubric-based      ← Judge 的一种策略配置
```

Rubric-based 不是另一类 judge，而是 judge 拿着 rubric 工作。更进一步：**rubric 甚至不是 judge 本身，而是 judge 的配置（configuration）**——

```
GPT-5 + Rubric A → Customer Service Evaluator
GPT-5 + Rubric B → Medical Evaluator
```

Judge 没变，换掉 rubric 就得到不同的评估器。

### 5.2 产品层：Rubric Evaluator 是打包好的组件

[Azure AI Foundry 的 Rubric Evaluator](https://learn.microsoft.com/en-us/azure/foundry/concepts/evaluation-evaluators/rubric-evaluators) 是产品术语：一个预配置组件，内部拆开就是——

```
Rubric Evaluator = LLM Judge + Rubric + Prompt Template + Scoring Logic
```

官方文档的机制描述：每套 rubric 包含若干**加权维度（weighted dimensions）**，LLM judge 对每个适用维度打 1~5 分并给出理由，总分按权重加权平均后**归一化到 0~1**。Foundry 把它作为 [Agent 评估的推荐主指标](https://learn.microsoft.com/en-us/azure/foundry/observability/how-to/evaluate-agent)，再配 Groundedness、Safety 等内置 evaluator 补盲区。

所以两种画法都对，只是抽象层次不同：

- **论文**：LLM-as-a-Judge → Rubric-based（方法论）
- **产品**：Rubric Evaluator（可直接调用的评估器，内含一个 LLM judge）

## 六、Layer 3：评价维度全景与输出形式

### 6.1 常见 Criteria 清单

按任务类型聚类（rubric 就是从这里挑维度组装）：

| 类别 | 维度 |
|------|------|
| 通用质量 | Correctness、Accuracy、Completeness、Relevance、Helpfulness、Clarity、Coherence、Consistency |
| RAG 专属 | **Groundedness**（有没有依据）、**Faithfulness**（有没有胡编）、Context Precision / Recall、Hallucination |
| 安全 | Safety、Harmlessness、Toxicity、Bias |
| 指令 | Instruction Following（要求 JSON 却输出散文 → 扣分） |
| Agent 专属 | Tool Correctness（工具选对没）、Planning Quality、Memory Usage、Efficiency（一次能完成的调了五次 → 扣分）、Task Success |

### 6.2 Judge 的输出形式

| 形式 | 例子 | 用途 |
|------|------|------|
| Binary | Yes / No | 门控、过滤 |
| Rating | 1~5 | rubric 逐维打分 |
| Ranking | B > A > C | listwise 排序 |
| Explanation | 分数 + 理由 | 可解释性、审计、textual gradient 的原料 |
| Structured JSON | `{"accuracy":5,"groundedness":4,"reason":"..."}` | 生产环境首选，可程序化消费 |

值得注意：**Explanation 不只是给人看的**——在 APO 的文本梯度机制里，judge 给出的批评文字本身就是优化信号（见 [[Agent Lightning算法深解：APO=文本梯度+Beam Search，以及与其他搜索策略的对比]]）。

## 七、Judge Reliability：2025 年后研究重心的转移

领域的研究重点已经从"怎么让 LLM 打分"转向"**LLM 打的分能不能信**"。主要议题：

| 问题 | 现象 |
|------|------|
| Consistency | 同一答案打十次，分数漂移 |
| Position Bias | pairwise 中答案放左边赢、放右边输 |
| Verbosity Bias | 长答案系统性得高分 |
| Self-Preference | GPT 偏爱 GPT 的输出，Claude 偏爱 Claude |
| Style Bias | 偏爱特定行文风格（markdown、列表化） |
| Prompt Sensitivity | 评估 prompt 措辞微调，分数大变 |
| Calibration | 该打 90 的打 70——分数与真实质量错位 |
| Agreement with Humans | 与人工评估的一致率——所有 judge 的最终裁决指标 |

工程含义：这些偏差就是 [[reward-design-three-inputs]] 里说的 judge 噪声 σ_noise 的具体来源。评估噪声会顺着训练管道放大——APO 摆动的第一大原因是评估噪声而非算法本身（见 [[automatic-prompt-optimization]]），所以"把 judge 做稳"（多次采样取均值、拆分维度降噪、rubric 锚点约束）是评估和优化共同的地基。

## 八、论文地图

按用途选读（均已核实链接）：

| 论文 | 定位 | 适合谁 |
|------|------|--------|
| [A Survey on LLM-as-a-Judge](https://arxiv.org/abs/2411.15594)（Gu et al., 2411.15594） | 核心问题"如何构建可靠的 LLM Judge"：一致性、偏差缓解、可靠性评估 | 关注 judge 可靠性工程 |
| [From Generation to Judgment: Opportunities and Challenges of LLM-as-a-judge](https://arxiv.org/abs/2411.16594)（Li et al., 2411.16594，EMNLP 2025） | 三问框架：What to judge / How to judge / Where to judge，领域地图 | 第一篇入门综述 |
| [LLMs-as-Judges: A Comprehensive Survey on LLM-based Evaluation Methods](https://arxiv.org/abs/2412.05579)（Li et al., 2412.05579） | 五维拆解：functionality / methodology / applications / meta-evaluation / limitations | 关注 Meta-Evaluation（评价 judge 自己） |
| [Evaluation and Benchmarking of LLM Agents: A Survey](https://arxiv.org/abs/2507.21504)（Mohammadi et al., 2507.21504，KDD 2025） | Agent 专属：评估目标 × 评估过程二维分类，含企业级挑战（权限、合规、长时交互） | 做 Agent / Foundry Agent 评估 |
| [Many Voices, One Reward: Multi-Role Rubric Generation for LLM Judging and Reward Modeling](https://arxiv.org/abs/2607.01830)（MRRG, 2607.01830） | 多角色生成 rubric 再聚合，rubric 本身的构造方法 | 关注 rubric 怎么来（连接姊妹篇） |

## 九、小结

1. **三层正交**：Judge（谁评）× Strategy（怎么评）× Criteria（评什么）互相独立组合，绝大多数概念混乱来自把三层压成一层。
2. **rubric 是 Layer 3 的组织形式**：维度 + 等级 + 打分说明的结构化评分细则；它是 judge 的配置而非 judge 本身——换 rubric 不换 judge，就得到新的评估器。
3. **产品术语 ≈ 研究方法的打包**：Rubric Evaluator（Azure Foundry 等）= LLM Judge + Rubric + Prompt Template + Scoring Logic。
4. **可靠性是当前主战场**：position/verbosity/self-preference 等偏差与校准问题，决定评估信号能否进一步充当训练信号——这正是姊妹篇 [[从Evaluator到Reward-Function——评估信号如何变成APO与强化学习的训练信号]] 的主题。
