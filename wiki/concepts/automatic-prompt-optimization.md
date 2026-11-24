---
title: "自动提示优化（APO, Automatic Prompt Optimization）"
created: "2026-06-29"
updated: "2026-11-24"
tags:
  - wiki
  - concept
  - agent
  - prompt-optimization
  - apo
  - beam-search
  - textual-gradient
aliases:
  - "Text Space Optimization"
  - "文本空间优化"
  - "APO"
  - "Automatic Prompt Optimization"
  - "自动提示优化"
  - "文本梯度"
  - "Textual Gradient"
related:
  - "[[prompt-optimization-tool-selection]]"
  - "[[agent-lightning]]"
  - "[[bitter-lesson]]"
  - "[[generation-evaluation-separation]]"
  - "[[method-agnostic]]"
  - "[[reinforcement-learning]]"
  - "[[rejection-sampling-finetuning]]"
  - "[[skillopt]]"
  - "[[rl-infra-framework-selection]]"
---

# 自动提示优化（APO, Automatic Prompt Optimization）

## 摘要

APO 是一种自动把 prompt 调优的完整优化方法，核心结构是「文本梯度（生成方向）+ beam search（搜索管理）」。它把神经网络训练的"方向+搜索"二分结构搬到离散不可微的 prompt 上：因为 prompt 无法求数值梯度，就让强 LLM 充当"梯度算子"（Critic）用自然语言诊断"哪里错、往哪改"，再让另一个 LLM（Editor）照批评改写——这套思路源自 ProTeGi（Pryzant et al. 2023）。beam search 只承担搜索管理（扩展→打分→剪枝 top-k），APO 选它的首要理由是评估成本：每个候选要在验证集上跑大量贵 rollout，beam_width 把指数爆炸压成线性，又比 greedy 多留缓冲对抗评估噪声。在 agent-lightning 里，APO 是 method-agnostic 阶梯的最低一档（不动权重、最便宜），与 [[rejection-sampling-finetuning]]（RAFT）、RL 共享同一份 grader/reward，只是消费方式不同——APO 用 `sorted()[:beam_width]` 排序选 prompt。

## Claims

### Claim: APO ≠ beam search——是「文本梯度 + beam search」的完整方法

- **来源**：[[Agent-Lightning算法深解：APO]]
- **首次出现**：2026-06-25
- **最近更新**：2026-06-25
- **置信度**：0.9
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（grep/qmd 查 Notes/Azure/paper/wiki 同主题文章；来源文章 2026-06 之后仅有 2026-10-03 去行号的格式改动，无内容修订）；关键词：APO beam search

> 把 APO 等同于 beam search 是层级错位，等于把"梯度下降训练"等同于"Adam 优化器"。APO（Automatic Prompt Optimization）是完整优化方法，含两个本质不同的子机制：① **怎么产生更好候选**——靠文本梯度（Critic 诊断 + Editor 改写），这是生成机制；② **怎么在候选里挑、管理搜索过程**——靠 beam search（维护固定大小候选集，每轮扩展、打分、剪枝），这是搜索策略。beam search 本身不知道"prompt 怎么变好"，只负责"在已生成候选里按分数保留 top-k、决定下一轮从谁出发"。一句话：APO = 文本梯度（生成方向）+ beam search（搜索管理）。

### Claim: 文本梯度 = Critic 写、Editor 改，因 prompt 离散不可微而借 LLM 模拟方向信号

- **来源**：[[Agent-Lightning算法深解：APO]]
- **首次出现**：2026-06-25
- **最近更新**：2026-06-25
- **置信度**：0.85
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（grep/qmd 查 Notes/Azure/paper/wiki 同主题文章；来源文章 2026-06 之后仅有 2026-10-03 去行号的格式改动，无内容修订）；关键词：文本梯度

> 一轮 APO 迭代有四个角色接力，对应神经网络训练：**Evaluator/Judge**（grader 的 model，给数值分，类比判分老师）→ **Critic/Teacher**（gradient_model，看低分轨迹写文本梯度＝自然语言诊断，类比写评语的导师）→ **Editor**（apply_edit_model，按批评改写出新候选，类比按评语改作文）→ **Beam Search**（无模型纯算法，选 top-k）。关键区分：Judge 给"分数"（标量）、Critic 给"方向"（文本），常被混为一谈。Critic 和 Editor 故意分两个模型：Critic 要强推理（诊断难，用更强模型）、Editor 只需会改写（机械，用便宜模型），分离后还能独立约束两个 prompt 注入点。文本梯度的优势是不仅说"错了"还说"为什么错、具体怎么改"——代价是每步都调强模型，比数值梯度贵几个数量级，所以才需要有预算约束的 beam search 控爆炸。

### Claim: APO 选 beam search 的首要理由是评估成本，不是它最优

- **来源**：[[Agent-Lightning算法深解：APO]]
- **首次出现**：2026-06-25
- **最近更新**：2026-06-25
- **置信度**：0.85
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（grep/qmd 查 Notes/Azure/paper/wiki 同主题文章；来源文章 2026-06 之后仅有 2026-10-03 去行号的格式改动，无内容修订）；关键词：beam search 评估成本

> 搜索策略谱系都在解"候选树里找最优节点"，区别在每层保留几个：greedy（留 1，易陷局部最优）、BFS（全留，O(b^d) 爆炸）、DFS（深挖一条，无明确终止深度）、beam search（top-k，O(k·b) 可控）、Tree-of-Thought（带 LLM 自评估，更贵）、Self-Consistency（正交降噪，可叠加）。APO 选 beam search 的首要理由是评估太贵——每个候选要在验证集跑大量 rollout，beam_width 把 BFS 的指数爆炸压成线性；又比 greedy（beam_width=1）多留缓冲，对抗评估噪声（同 prompt 打分可摆动 0.2）的 max-over-noise。进阶方向：把"等额评估+max 选择"升级为 bandit（UCB / Successive Rejects）的"自适应预算分配"，是对症"虚高候选"问题的统计学解药。

### Claim: 真正瓶颈是 reward 设计 + 评估噪声 + 数据量，不是选哪个框架

- **来源**：[[Prompt优化工具选型]]、[[Agent-Lightning系列01：用APO做Prompt-Tuning]]（三轮实跑复盘）
- **首次出现**：2026-06-24
- **最近更新**：2026-06-24
- **置信度**：0.85
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（grep/qmd 查 Notes/Azure/paper/wiki 同主题文章；来源文章 2026-06 之后仅有 2026-10-03 去行号的格式改动，无内容修订）；关键词：reward 设计 评估噪声

> 任何 prompt 优化工具（DSPy/TextGrad/AdalFlow/agent-lightning）都成立的核心教训：真正的瓶颈不是选哪个框架。① **评估噪声**——小数据集（如 29 题）标准误 `SE ≈ sqrt(p(1−p)/N) ≈ 0.09`，会盖过任何小于 0.18 的真实增益；② **reward 设计**——reward 若设错（如让 LLM 对离散任务输出连续 partial score），框架只会"忠实地优化一个噪声"；③ **数据量**——要可靠确认 Δ 提升需 `SE ≤ Δ/2`，想分辨 0.05 增益需 N≈350+，或用多采样 `SE/√k` 等效放大。落地顺序：先把评测集和 reward 做扎实（降噪、对齐真实目标），再谈用哪个优化器——否则只是在噪声里挑最大值。

### Claim: APO 的 critic/editor 元提示词全部用 POML 写成——表示层与优化层正交互补

- **来源**：[[POML深度解析]]
- **首次出现**：2026-07-14
- **最近更新**：2026-07-14
- **置信度**：0.85
- **状态**：stale
- **证据类型**：产品与服务
- **复核**：2026-11-07 待定——依据：依据：POML 元提示词为 agent-lightning 0.x 源码事实，v1.0 官方文档未查到对应说明

> agent-lightning APO 的两个核心 LLM 角色的元提示词不是硬编码字符串，而是随包分发的 `.poml` 文件（`agentlightning/algorithm/apo/prompts/`）：`text_gradient_variant01~03.poml`（3 个 critic 变体）+ `apply_edit_variant01~02.poml`（2 个 editor 变体），每轮迭代 `random.choice` 抽取。POML（微软开源提示词标记语言，"HTML+CSS"范式）的卖点在此全部用上：`<cp for>` 循环按结构块嵌入多条 rollout 实验、`<object data>` 挂深层 JSON traces、`whiteSpace="pre"` 保护被优化 prompt 的原始格式不被模板系统污染（格式本身可能就是被优化的变量——直击 format sensitivity）。另一层面：APO 优化对象 `PromptTemplate` 的 `engine` 字段把 `poml` 与 `jinja`/`f-string` 并列为一等公民（但 `format()` 尚只实现 f-string 路径，声明先行、实现跟进）。哲学上 DSPy 认为人不该写 prompt（prompt 是编译产物）、POML 认为人要像写 HTML 一样写 prompt——两条路线在 agent-lightning 里合流：被优化的 prompt 和优化器自己的 meta-prompt 都可以是 POML。**POML 是表示层（管写得好维护），APO 是优化层（管写得效果好），正交互补**。

### Claim: APO 与 SkillOpt 结构性互补——先探索后精修的两段式管道，衔接接口就是一个文本文件

- **来源**：[[SkillOpt系列04：APO与SkillOpt联合展望]]
- **首次出现**：2026-07-15
- **最近更新**：2026-07-15
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（grep/qmd 查 Notes/Azure/paper/wiki 同主题文章；来源文章 2026-06 之后仅有 2026-10-03 去行号的格式改动，无内容修订）；关键词：APO SkillOpt 两段式

> 两者的强项弱项恰好互补：APO 是并行随机搜索（自由改写 + beam 重排，探索强方差大），擅长初始 prompt 离最优很远时跳出局部邻域找盆地，失败模式是摆动；SkillOpt 是带信任域的 SGD（有界编辑 + 在位者门控，利用强方差小），擅长已在好盆地内时单调精修，失败模式是探索不足。这正是优化领域的经典分工（basin hopping / 大学习率粗训 + 小学习率微调），文本空间没有理由例外。两段式管道机械上零成本：APO 的 `best_prompt.txt` 拷成 SkillOpt 的 `skills/initial.md` 一行 `cp` 完事，前提是评分逐字节兼容 + judge 不换（judge 定义分数量纲）。数据卫生的关键不是"独立同分布"而是**五份互斥切分**（APO train/val + SkillOpt train/val + 最终 test，全同分布但成员互斥）——SkillOpt 的 val 混入 APO 见过的任务会让在位者带虚高分数守擂，系统性错杀好编辑；数据预算约为单段的 1.5–2 倍。**开跑前必须过三个数判断式（δ_remain > 2σ_d/√n 才值得）**——video2frames 实测把账走完的答案是"停"（δ_remain ≤0.02 < δ_min 0.024），管道本身尚未实测，故置信度保守。

### Claim: 评估信号消费强度沿 APO→SFT→RL 阶梯逐级升高——前置评估投资越发不可省略

- **来源**：[[从Evaluator到Reward-Function]]
- **首次出现**：2026-08-03
- **最近更新**：2026-08-03
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（grep/qmd 查 Notes/Azure/paper/wiki 同主题文章；来源文章 2026-06 之后仅有 2026-10-03 去行号的格式改动，无内容修订）；关键词：Evaluator reward 阶梯

> 同一份评估信号在三级阶梯上的消费强度不同：APO 只用它排序候选（`sorted()[:beam_width]`，错了下轮还能纠正）；SFT/RAFT 用它筛数据造标签（错误一次性固化进权重）；RL 把它当逐步梯度信号（错误被反复放大成系统性偏移）。级别越高，评估噪声与偏差的代价越不可逆——所以"先把 judge 做稳"（rubric 锚点、多次采样、盲选校准）的前置投资随阶梯升级从"划算"变成"必须"。这把本页"真正瓶颈是 reward 设计 + 评估噪声"的教训沿阶梯做了梯度化：地基打一次，三层共用。

### Claim: APO 是成熟度阶梯 L2 的起点——迁移两前提：可量化 reward + 30~50 条数据起步

- **来源**：[[Prompt优化成熟度阶梯]]
- **首次出现**：2026-07-30
- **最近更新**：2026-08-04
- **置信度**：0.75
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（grep/qmd 查 Notes/Azure/paper/wiki 同主题文章；来源文章 2026-06 之后仅有 2026-10-03 去行号的格式改动，无内容修订）；关键词：APO 成熟度阶梯

> 在 L0 vibe check → L1 LLM-judge → L2 数据闭环的三层阶梯（见 [[prompt-optimization-maturity-ladder]]）中，APO 属于 L2——算法自动闭合回路的最低门槛工具。迁移到 APO 的两前提：① 任务有可量化成功标准（能写出 reward 函数，纯品味类任务长期停 L1）；② 数据量过阈——< 10 条留 L1、30~50 条可试（必须降噪：多次采样取均值、train/val 分开）、100+ 条稳定。**降噪优先于扩量**：50 条 × 3 采样均值往往优于 150 条 × 1 次。评估集应从 L1 人工迭代阶段就开始攒 bad case。

### Claim: 语感类主观评估的降噪三件套——pairwise 差分、BARS 锚定样例、受控改写实验

- **来源**：[[与AI相处之道二：内容工程师]]
- **首次出现**：2026-07-28
- **最近更新**：2026-08-04
- **置信度**：0.7
- **状态**：active
- **证据类型**：理论（长效）
- **复核**：2026-11-07 长效——依据：库内无矛盾（grep/qmd 查 Notes/Azure/paper/wiki 同主题文章；来源文章 2026-06 之后仅有 2026-10-03 去行号的格式改动，无内容修订）；关键词：pairwise BARS

> 语感/品味类维度天然噪声大，与 APO 摆动是同一问题（评估噪声是第一大不稳定源）的主观评估版。对策：① pairwise 差分代替绝对打分——人类对"A 好于 B"的一致性远高于绝对分数，维度从偏好对中归纳（"把 B 改到 A 最少动什么"）；② BARS 锚定量表——每个维度配分档真实样例 + 边界反例，锚定样例是把 taste 压进 few-shot（规则是对品味的有损压缩，样例保留未显式化的维度）；③ 维度成立的硬检验——多专家独立打分算 Cohen's kappa，一致性低说明维度没操作化好；受控改写实验（只改一个维度看偏好率是否移动）测因果而非相关。

### Claim: reward=None 不是打分失败而是候选模板渲染崩了，危险片段的源头是 gradient model 的批评——输出端和输入端都要堵，加渲染护栏后坏候选几乎零成本

- **来源**：[[Agent-Lightning系列01：用APO做Prompt-Tuning]]
- **首次出现**：2026-06-24
- **最近更新**：2026-11-24
- **置信度**：0.75
- **状态**：active
- **证据类型**：实测经验

> 第一轮 8 个候选里 3 个 `Statuses` 全是 failed、reward 全 None，原因是 agent 用 `str.format` 渲染模板，候选里引入了不存在的占位符（`{needs_mode}`）或字面花括号（JSON 输出示例），渲染直接抛 KeyError，rollout 标 failed，求平均时按 0 算，污染统计。能跑通的候选都是用自然语言描述 JSON 字段、不写裸花括号。第二轮给 edit model 换了严格模板后仍有两个候选崩溃：一个带正则 `^\d{4}-…`（`{4}` 被当成位置参数），一个带整段 JSON 示例——都是 gradient model（gpt-5-mini）在批评里写的原话，edit model 忠实照抄。所以约束要两端都加：gradient 模板和 edit 模板都禁止正则、JSON 示例和新变量；再加渲染护栏，渲染失败直接返回 0 分短路。护栏生效后坏候选 29 条只花 2 秒（真实候选约 28 秒），不再污染统计，只浪费搜索预算。

### Claim: 小数据集上被选出来的"历史最优分"系统性偏高——对带噪声的分数取最大值会把正向噪声选进来；提升幅度小于同一 prompt 重测的摆幅时，不能算赢

- **来源**：[[Agent-Lightning系列01：用APO做Prompt-Tuning]]
- **首次出现**：2026-06-24
- **最近更新**：2026-11-24
- **置信度**：0.75
- **状态**：active
- **证据类型**：实测经验

> 同一个种子 prompt、同样全量 29 题，五次重评是 0.586 / 0.690 / 0.672 / 0.621 / 0.655，极差约 0.10；temperature=0 也消不掉，来源是 agent 带工具调用的整条轨迹不确定，以及 LLM judge 做语义比对时会判错一两题。APO 的机制是"对 beam 冠军全量重评、只在更高时更新 history best"，相当于对噪声取最大值：v2 被选中那次 0.707，下一轮重评 0.503，末轮守不住，回退种子。判断逻辑：v2 号称比种子高 0.017，种子自己重测就摆 0.10，信噪比小于 1，提升不可信。`val_batch_size` 的作用也要分清：每轮选优只用一个 batch，跨轮不可比；小数据集应直接设成数据集大小，大数据集才为省成本取子集，并以全量重评的 history best 为准。顺序是先降噪（扩到 100 条以上、每题多跑几次取均值），再加 `beam_rounds`，否则加轮次只是放大噪声。

### Claim: 文本梯度会把 prompt 越改越详细，但详细不等于更好——批评的方向要对齐 grader 的评判口径，否则过度工程化反而掉分

- **来源**：[[Agent-Lightning系列01：用APO做Prompt-Tuning]]
- **首次出现**：2026-06-24
- **最近更新**：2026-11-24
- **置信度**：0.7
- **状态**：active
- **证据类型**：实测经验

> 第一轮存活的候选都在"过度工程化"：输出 top-3 的 JSON、加打分公式，而 grader 要的是精确选中一个房间，啰嗦的输出反而让 judge 更难对上 `expected_choice`，分数下降，最优始终是种子。种子基线本身不弱（0.655），小数据集加高噪声下空间有限。修法是改 gradient 模板，让批评的方向对齐 reward（精确单选、简洁优先），而不是一味堆细节；或者换一个"啰嗦输出无害"的 grader。这是 reward 设计决定优化方向的一个具体样子。

## 冲突与演进

- 2026-11-24：/extract-knowledge 厚度补抽 [[Agent-Lightning系列01：用APO做Prompt-Tuning]]（此前只列在来源区，没有一条 Claim 以它为出处）——新增渲染崩溃来源、max-over-noise 虚高、详细不等于更好三条；"真正瓶颈"一条补上本文作为实证出处。

- 2026-06-24：从 Azure 实践三轮实跑提炼出"reward+噪声+数据量是真瓶颈"的工具无关教训。
- 2026-06-25：单开算法理论篇，厘清 APO≠beam search 的层级关系、文本梯度的 Critic→Editor 机制、beam search 在搜索谱系中的成本定位。
- 2026-07-14：从 POML 深解补充元提示词实现层证据——critic/editor 提示词全用 POML 写成，是 POML 目前最有分量的生产级落地；确立"表示层/优化层正交"的分工判断。
- 2026-07-16：从 SkillOpt 系列04 补充"探索/精修互补"视角——APO 在 video2frames 100 任务 faceoff 中边缘胜出 SkillOpt（自由改写方差大但探索强，摸到 +0.02 任务天花板），两段式管道与三个数算账方法成形（见 [[pre-run-three-number-accounting]]）。
- 2026-08-03：从 Evaluator→Reward 链路篇补充阶梯视角——APO 是评估信号消费强度最低一档（排序可纠正），噪声代价沿 SFT→RL 逐级不可逆。
- 2026-08-04：从成熟度阶梯前置篇补充"入口视角"——APO 是 L2 起点，迁移两前提与数据阈值成形（[[prompt-optimization-maturity-ladder]]）；从内容工程师篇补充主观评估降噪三件套（pairwise/BARS/受控改写）。
- 2026-11-07：/revalidate 全库复核（证据分类）——长效 8、待定 1

## 关联概念

- [[prompt-optimization-tool-selection]] — `part-of` APO 工具选型的决策页
- [[agent-lightning]] — `part-of` APO 是 agent-lightning `algorithm/` 槽位的内置算法（一等公民），三级阶梯第一级
- [[method-agnostic]] — `part-of` APO 是 method-agnostic 三级阶梯最低一档（不动权重、`sorted()[:beam_width]` 用 reward 排序选 prompt）
- [[rejection-sampling-finetuning]] — `contrasts` 同属 agent-lightning method-agnostic 阶梯，APO 用 reward 排序选 prompt（不动权重）、RAFT 用 reward 筛轨迹做微调（改权重），共享同一份 grader
- [[skillopt]] — `contrasts` 同为文本空间优化，但 APO 优化一次性 prompt、无优化器纪律；SkillOpt 优化持久 skill artifact 且带 validation gate/bounded LR/rejected buffer/slow-meta 四块纪律
- [[generation-evaluation-separation]] — `uses` Judge 打分与 Critic 诊断/生成分离，是生成-评估分离原则的体现
- [[reinforcement-learning]] — `contrasts` APO 把 reward 用于离线 prompt 搜索，RL 把 reward 当梯度信号进 policy gradient
- [[bitter-lesson]] — `implements` APO 是"用算力换 prompt 质量"的搜索方法，呼应算力终将胜出
- [[rl-infra-framework-selection]] — `constrains` 从 APO 升级到 RL 时，APO 摆动的根源（评估噪声）会原样带进 RL，选 agent-lightning 还是 rllm 之前先把 reward / eval 做稳

## 来源日记

- [[Prompt优化工具选型]] — reward/噪声/数据量是真瓶颈、工具对比
- [[Agent-Lightning算法深解：APO]] — APO≠beam search、文本梯度 Critic→Editor、搜索策略谱系对比
- [[Agent-Lightning系列01：用APO做Prompt-Tuning]] — beam search 内核、三参数三阶段、实践踩坑与噪声复盘
- [[POML深度解析]] — APO 元提示词全用 POML 写成（critic/editor 变体文件）、PromptTemplate 三引擎、表示层/优化层正交
- [[SkillOpt系列04：APO与SkillOpt联合展望]] — 探索/精修结构性互补、两段式管道衔接、五份互斥切分、三个数判断式
- [[SkillOpt系列03：提示词调优实战]] — 100 任务配对对决 APO 边缘胜出、三层机制对比（自由改写+相对重排是摆动直接来源）
- [[从Evaluator到Reward-Function]] — 评估信号消费强度 APO→SFT→RL 阶梯、前置评估投资逐级不可省略
- [[Prompt优化成熟度阶梯]] — L2 迁移两前提、数据量阈值、降噪优先于扩量
- [[与AI相处之道二：内容工程师]] — 语感类主观评估降噪三件套（pairwise/BARS/受控改写实验）
