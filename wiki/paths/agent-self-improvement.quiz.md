---
title: "题库：Agent 自我改进"
created: "2026-11-07"
updated: "2026-11-07"
tags:
  - wiki
  - path
  - quiz
path_id: "agent-self-improvement"
---

# 题库：Agent 自我改进

配合 [[agent-self-improvement]] 使用，按站点分组。题型：**场景**、**辨析**、**解释**。答案是参考要点，说出主要意思即可。

## 第 1 站 · 框架：三种"变好"与分级

### Q1 · 场景

**问**：一个数据分析 agent：①修正 SQL 后重跑得到正确报告；②从多次失败里提炼出"关联前先查键唯一性"写进 skill，下次继续用；③优化器发现"只追加规则会越来越冗余"，把自己的优化策略改成比较成败轨迹、每次少改，并且新策略真的支配了后续轮次。三者各属于哪种"变好"？

**答**：① 任务内修正（经验不进后续运行）；② 持久状态改进（权重不变也算持续收益）；③ 改进机制本身被改进——只有这一种才是递归自我改进。

**出处**：[[recursive-self-improvement]]

### Q2 · 解释

**问**：阿里综述的五级分级是什么？关键区分在哪？

**答**：L1 人工改进 → L2 辅助改进（AI 给候选、人验证应用）→ L3 程序化自我改进（机制固定）→ L4 有界递归（限定领域内改写自身机制）→ L5 通用递归（跨领域）。关键不在能不能"建议"改进，而在能否提出、应用、验证并最终修订改进机制。

**出处**：[[recursive-self-improvement]]

### Q3 · 辨析

**问**："APO、SkillOpt 名字里有 self-improvement，所以是递归自我改进。"对吗？

**答**：不对。它们的反思提示词、编辑规则、接受门控都由人设计，改进机制是固定的，按阿里分级属于 L3。方法名不能代替"运行时机制是否真的被改写"的证据。

**出处**：[[recursive-self-improvement]]

### Q4 · 解释

**问**：判断一个自我改进主张，要问哪五个问题？

**答**：反馈是真的吗（能对账、测试就别靠流畅的报告）；是不是偶然得分高（重复运行报波动）；验证集有没有参与搜索（要留未参与选择的测试集）；收益来自能力还是更多计算（报调用数、token、时延）；有没有损害旧能力（跑回归）。

**出处**：[[recursive-self-improvement]]

## 第 2 站 · prompt 层：APO 与成熟度阶梯

### Q1 · 辨析

**问**："APO 就是 beam search。"对吗？

**答**：不对，是层级错位。APO 是完整方法，有两个子机制：文本梯度（Critic 诊断 + Editor 改写）负责产生更好的候选，beam search 只负责在候选里挑、管理搜索过程。

**出处**：[[automatic-prompt-optimization]]

### Q2 · 解释

**问**：一轮 APO 迭代有哪四个角色？Judge 和 Critic 的区别是什么？

**答**：Evaluator / Judge 打分 → Critic 看低分轨迹写文本梯度（自然语言诊断）→ Editor 按批评改写出新候选 → beam search 选 top-k。Judge 给的是分数（标量），Critic 给的是方向（文本）。

**出处**：[[automatic-prompt-optimization]]

### Q3 · 解释

**问**：APO 为什么选 beam search？

**答**：首要理由是评估太贵——每个候选都要在验证集上跑大量 rollout，beam_width 把 BFS 的指数爆炸压成线性，又比 greedy 不容易陷入局部最优。

**出处**：[[automatic-prompt-optimization]]

### Q4 · 场景

**问**：29 道题的验证集上，新 prompt 比旧 prompt 高了 0.1。能说明变好了吗？

**答**：不能。小数据集的标准误约 sqrt(p(1−p)/N) ≈ 0.09，会盖过小于约 0.18 的真实增益。要先降噪：多次采样取均值、扩大评估集，降噪优先于扩量。

**出处**：[[automatic-prompt-optimization]]

## 第 3 站 · skill 层：SkillOpt

### Q1 · 解释

**问**：SkillOpt 把 SGD 的哪四个机件搬进了文本空间？

**答**：有界的文本学习率（每步最多几条编辑，默认 4、cosine 衰减到 2）、被拒编辑缓冲（负样本记忆，供后续反射避坑）、慢权重（epoch 末的纵向诊断写入慢字段）、meta-learning。消融显示"有界 vs 无界"才是分水岭。

**出处**：[[skillopt]]

### Q2 · 辨析

**问**："SkillOpt 和 RL 的区别是一个用 ground truth、一个用 reward。"对吗？

**答**：不对。verifier 还是 judge 是评分手段的选择，不构成框架级分野。真正的区别在分数拿去干什么：SkillOpt 把分数当筛子（门控是否严格超过当前版本，打平也拒），RL 把它当梯度。

**出处**：[[skillopt]]

### Q3 · 场景

**问**：冒烟配置跑了一轮 SkillOpt，skill 从 104 字涨到 1891 字，结果被拒了。说明新 skill 没用吗？

**答**：不一定。冒烟配置只验证管路通，不验证效果——选择集太小（比如 8 条）时，真帮到了也可能显示打平被拒。要用足够大的选择集再判断。

**出处**：[[skillopt]]

### Q4 · 解释

**问**：APO 摆动大、SkillOpt 稳定，原因只是 SkillOpt 多了门控吗？

**答**：不只。是三层机制叠加：搜索结构（APO 并行候选整体重排，SkillOpt 单谱系增量演进）、编辑幅度（APO 可整篇重写，SkillOpt 每步有界小改）、接受机制（SkillOpt 挑战者必须在验证集上胜过在位者）。而且门控不消灭噪声，只是换了表现形式。

**出处**：[[skillopt]]

## 第 4 站 · harness 层：Meta-Harness 与 AutoResearch

### Q1 · 解释

**问**：Meta-Harness 对 harness 的定义和业界主流有什么不同？

**答**：主流说 harness 是"模型之外的一切"，太宽；Meta-Harness 聚焦为"决定存什么、取什么、给模型看什么的那层代码"，也就是控制模型输入输出的信息管道。

**出处**：[[meta-harness]]

### Q2 · 解释

**问**：为什么说完整执行 trace 是不可替代的诊断信号？

**答**：消融实验里，只给分数 34.6%，加 LLM 摘要 34.9%（几乎没提升），给完整原始 trace 50.0%。LLM 摘要恢复不了丢失的因果信息。

**出处**：[[meta-harness]]

### Q3 · 解释

**问**：Ralph Loop 和 AutoResearch 的核心区别是什么？

**答**：选择机制：Ralph Loop 只有 done / not-done（不动点迭代）；AutoResearch 有分数比较、历史最佳和回滚（进化搜索）。

**出处**：[[autoresearch]]

### Q4 · 解释

**问**：AutoResearch 的五约束设计模式是什么？

**答**：单一可变面、固定评估、强制预算、diff 迭代、自动回滚。满足全部五条，就能在任意领域安全地做 autonomous agent 实验。

**出处**：[[autoresearch]]

## 第 5 站 · 产品里的落地：记忆与离线整理

### Q1 · 场景

**问**：用 RSI 分级给 GitHub Copilot 的记忆系统定位：用户说"记住……"、Dreaming 开 PR 改 instructions、Memory 自己写入并投票淘汰，各是哪一级？

**答**：用户明示是 L1；AI 开 PR、人审合并是 L2；自己发现、写入、核对、投票淘汰是 L3。整理策略、投票规则、过期机制都是设计好的，运行中不被修改，所以到不了 L4。

**出处**：[[recursive-self-improvement]]、[[agent-memory-lifecycle]]

### Q2 · 解释

**问**：同在 L3，研究方法和产品的分界在哪？

**答**：门控位置：研究方法（SkillOpt、RRSI、Dream-RSI）上线前先在同批任务上和旧版本比较；产品（Copilot Memory）先上线，靠使用中的 citations 核对和投票来评估。后者务实，但"验证集是否参与学习"等几个问题答不上来。

**出处**：[[recursive-self-improvement]]

### Q3 · 辨析

**问**："把规则写进 agent 的记忆里，它就会一直遵守。"对吗？

**答**：不对。记忆是以"可能相关、酌情参考"的方式提供给模型的，核对也是模型的判断；必须遵守的规则要写进 instructions / CLAUDE.md 这类指令文件，记忆适合存背景知识和会变的事实。

**出处**：[[claude-code-memory-system]]、[[agent-memory-lifecycle]]

### Q4 · 辨析

**问**："Dreaming 改坏了，关掉就能回滚。"对吗？

**答**：不对。关掉不撤销已做的改动，能回滚的只有走 PR、合进 git 的那部分。离线整理的回滚是不对称的。

**出处**：[[agent-memory-lifecycle]]

## 第 6 站 · 离线复用经验：Dream-RSI 与持续学习

### Q1 · 解释

**问**：Dream-RSI 的"做梦"指什么？

**答**：把已经发生的探索历史变成可回放的仿真器，候选的探索策略在里面离线打分，胜者才上线——不花真实执行成本就能比较候选。

**出处**：[[2026-09-22-Dream-RSI]]、[[recursive-self-improvement]]

### Q2 · 解释

**问**："Dream-RSI 在梦里挑，Copilot Dreaming 在梦里写"是什么意思？

**答**：Dream-RSI 的离线阶段用来评估、挑选候选策略；Copilot Dreaming 的离线阶段用来整理、改写记忆和指令，产出改动，但不在梦里评估这些改动。

**出处**：[[recursive-self-improvement]]

### Q3 · 解释

**问**：LifeSkill 对 skill 生命周期的观点和主流有什么不同？

**答**：主流把 skill 当持久外部资产，一直检索注入上下文；LifeSkill 主张 skill 应"用完即消失"：用 skill 成功完成任务后，把 skill 从输入里移除，再用这条成功轨迹训练，让 agent 成为技能而不是依赖技能。

**出处**：[[continual-self-improving-ai]]

### Q4 · 解释

**问**：持续学习为什么可能是 hybrid 架构最优？

**答**：非参数方法（如 JitRL，不改参数、即时低成本）负责短期适应，参数化方法（如 LifeSkill，改权重、能内化新能力）负责长期沉淀；前者积累的经验恰好可以当后者的训练数据。

**出处**：[[continual-self-improving-ai]]

## 第 7 站 · 凭什么说变好了

### Q1 · 解释

**问**：为什么"怎样挑选改进"越来越比"怎样生成改进"重要？

**答**：候选生成越来越便宜，决定系统能否积累能力的是：怎么判断改动值得接受、怎么保留负面经验、怎么发现瓶颈已经从 prompt 转到数据或模型、怎么衡量单位预算的提升。

**出处**：[[recursive-self-improvement]]

### Q2 · 场景

**问**：一篇论文说它的 harness 自我改进在演化集上提升了 14 分，分布外只提升 4.7 分。你怎么读这个差距？

**答**：差距本身说明"优化集越来越好"不等于能力提升，存在过拟合（编码 benchmark 特定模式、追逐评估噪声、累积无用复杂度）；要重点看分布外结果和成本，而且数字是论文自报。

**出处**：[[recursive-self-improvement]]（Claim「RRSI 把 harness 自我改进的过拟合拆成三种耦合行为」）

### Q3 · 场景

**问**：同样的 100 道无污染测试题上，APO 小胜基线，SkillOpt 反而略低于基线，但 SkillOpt 的训练过程很稳定。怎么理解？

**答**：机制稳不等于效果赢：SkillOpt 的门控在验证集上过拟合了，增益没有泛化；评分、目标、judge 都对齐的配对比较才是可信的结论，而且要看任务天花板。

**出处**：[[skillopt]]

### Q4 · 解释

**问**：要证明一个"改进优化器"本身变好了，递归层面还要多问什么？

**答**：改进后的优化器与原优化器，在相同起点、相同预算、独立任务上，谁能产生更好的后继系统。

**出处**：[[recursive-self-improvement]]
