---
title: "SkillOpt（文本空间 skill 优化器）"
created: "2026-07-01"
updated: "2026-07-07"
tags:
  - wiki
  - concept
  - skill-optimization
  - text-space-optimization
  - agent-skill
  - prompt-optimization
aliases:
  - "SkillOpt"
  - "文本空间优化器"
  - "Text-Space Optimizer"
  - "skill 训练"
related:
  - "[[automatic-prompt-optimization]]"
  - "[[rejection-sampling-finetuning]]"
  - "[[reinforcement-learning]]"
  - "[[skill-runtime]]"
  - "[[advantage-function]]"
---

# SkillOpt（文本空间 skill 优化器）

## 摘要

SkillOpt 把 **agent skill 当作 frozen agent 的可训练外部状态 `s`**（类比权重 θ），用"像训权重一样训 skill"的循环把一份 `best_skill.md`（300~2000 tokens）优化出来，部署时零额外模型调用。它的核心贡献不是发明文本优化，而是**第一次把 weight-space SGD 的可复现纪律完整搬进文本空间**：有界学习率（edit budget）、拒绝记忆（rejected-edit buffer）、慢权重（slow-update field）、learning-to-optimize（meta_skill）、validation 门控（严格改进才接受）。适用现实约束是——闭源前沿模型改不了权重、开源模型训练又贵，于是把"可训练性"转移到一段文本上。整个优化**冻结模型、纯 API 调用、不用 GPU**，两类模型分工：optimizer_model（贵、低频、写编辑）vs target_model（便宜、高频、跑 rollout）。它与 [[automatic-prompt-optimization]]（TextGrad/GEPA 家族）的分野在于：APO 优化的是一次性 prompt，SkillOpt 优化的是持久可复用的 skill artifact 且带整套优化器纪律。

## Claims

### Claim: SkillOpt 把 SGD 四大机件搬进文本空间——有界 LR / 拒绝记忆 / 慢权重 / meta-learning

- **来源**：[[2026-07-01-SkillOpt]]
- **首次出现**：2026-07-01
- **最近更新**：2026-07-01
- **置信度**：0.9
- **状态**：active

> 四大机件逐一对标深度学习优化器：① **textual learning rate `L_t`**＝每步最多几条编辑（离散代理步长，不是 token 数/edit distance/语义距离），默认 4、cosine 衰减到 2；消融显示"有界 vs 无界"才是分水岭（有界预算 85~87，无界改写掉到 84.6），"要有界且界得适中"而非"越紧越好"。② **rejected-edit buffer**＝负样本记忆/动量，候选没过门则把被拒编辑追加进 buffer 供同 epoch 后续反射避坑，**epoch 末清空**（短命）。③ **slow-update field**＝慢权重/双时间尺度，epoch 末做纵向 diff 写进 skill 文档里 markup 围栏的受保护区，step 级快编辑改不动它，随成品出厂。④ **meta skill `m_meta`**＝learning-to-optimize，summarize"编辑模式本身"（哪类改法有效），prepend 到未来 optimizer prompt，**不出厂**。`m_meta` 改的是 optimizer 的 context 不是权重——optimizer 本身也冻结。

### Claim: 快慢两层循环 + 三个 split——step 级接受门用 D_sel，epoch 末诊断用 D_tr

- **来源**：[[2026-07-01-SkillOpt]]
- **首次出现**：2026-07-01
- **最近更新**：2026-07-01
- **置信度**：0.9
- **状态**：active

> SkillOpt 是一快一慢两层嵌套循环。**快层（step）**：每步 propose ≤`L_t` 条编辑 → 在 held-out `D_sel` 过接受门 → 收/退。**慢层（epoch 末）**：在 `D_tr` 重采样上对比"上一版 skill vs 当前版 skill"做四分类纵向诊断（improvements/regressions/persistent failures/stable successes）→ 写 slow-field / meta → **该候选仍要过 `D_sel` 接受门**才落地。两个关键澄清：① 慢层读的是"快层的净结果"（新旧 skill 行为差），不是"快层的编辑过程"；② gate 在两层都有，慢层不是"绕过验证的特权写入"，而是"换个信息源再 propose 一次，纪律照旧"。三个 split：`D_tr`（跑 rollout/反射提编辑）、`D_sel`（held-out 接受门）、`D_test`（最终评测不参与优化）。

### Claim: 分数当"筛子"不当"梯度"——这才是 SkillOpt 与 RL 的真正分野

- **来源**：[[2026-07-01-SkillOpt]]
- **首次出现**：2026-07-01
- **最近更新**：2026-07-01
- **置信度**：0.85
- **状态**：active

> 常见误解是"SkillOpt 用 ground truth、RL 用 reward"——但 verifier↔judge 是评分手段的正交选择，不构成框架级分野（agent-lightning 的 calc_x 恰用 ground-truth 可验证 reward，SkillOpt 也把 reward-free/preference-driven gate 列为未来工作）。**真正的区别在"分数拿去干什么"**：SkillOpt 把分数当**选择/门控信号**（bundle 级比较是否严格超过当前，ties rejected，accept/reject 一份候选 skill），类比 model selection / early stopping；RL 把 reward 当**梯度信号**（算 advantage → PPO/GRPO 更新权重），类比反向传播。前者离散 accept/reject 改文本，后者连续参数更新——这才是两条路。这条也把 SkillOpt 归入**拒绝采样谱系**：与 [[rejection-sampling-finetuning]]（RAFT）同源"打分筛选、只留改进"，区别只是 RAFT 筛**样本**、SkillOpt 筛**编辑**；而"打分做梯度"的 RL 是另一族。

### Claim: 代码骨架 = environment-agnostic 的六阶段主循环，接新任务只写 EnvAdapter

- **来源**：[[SkillOpt源码篇：主要模块拆解与六阶段执行流剖析]]
- **首次出现**：2026-07-01
- **最近更新**：2026-07-01
- **置信度**：0.85
- **状态**：active

> `engine/trainer.py:ReflACTTrainer.train()` 是唯一"发动机"，编排六阶段流水线（ROLLOUT→REFLECT→AGGREGATE→SELECT→UPDATE→EVALUATE），但**不认识任何 benchmark**——所有 rollout/reflect/数据加载通过 `EnvAdapter` 接口回调。想接新任务不改 trainer，只写一个 adapter（`build_train_env`/`build_eval_env`/`rollout`/`get_task_types` 四个 abstract 方法）。这与 agent-lightning "method-agnostic + 换算法只换槽位"同构，区别是这里换的是 **environment** 不是 algorithm。两类模型两条独立后端通道：`chat_optimizer()`（REFLECT/AGGREGATE/SELECT/SLOW_UPDATE/META/REWRITE）走 optimizer_model；`chat_target()`（ROLLOUT/EVALUATE 的 sel-rollout）走 target_model。三大 memory 代码落点各异：rejected-buffer 活在内存变量、slow-update 嵌入 skill 文档围栏、meta_skill 存独立 JSON。⚠️ force-accept 模式下 slow_update 只改 `current_skill` 不改 `best_skill`，所以最终产物可能不含 slow_update 内容——除非经 gated 验证真涨了分。

### Claim: 冒烟配置只验证"管路通"不验证"效果"——sel 太小时真帮到也显示打平被拒

- **来源**：[[SkillOpt快速上手：AML+Azure OpenAI跑通SearchQA最小实验]]
- **首次出现**：2026-07-01
- **最近更新**：2026-07-01
- **置信度**：0.85
- **状态**：active

> SearchQA 单步干净冒烟跑（`--limit 8 --train_size 8 --num_epochs 1`，total_steps=1）：baseline `hard=0.5000`，STEP1 skill 从 104 字涨到 1891 字，却 EVALUATE **REJECT** `0.5000<=0.5000`（打平也拒），best 仍是初始 skill。逐条按 id 对齐 baseline 与 candidate 的 8 条 sel，发现 **8 条 hard 值全部一模一样**——1783 字新增对这批 sel 边际效果精确为零。三个叠加根因：① 编辑来自不相交的 train 8 条，泛化不到 sel 的错题；② 只跑 1 步（等于一次梯度更新）；③ sel=8 门太粗（分辨率 1/8=0.125 一档，微小改动跨不过 ties-rejected 门槛）。结论：`1 步 + 8 train + 8 sel` 三重太小，注定原地打平——它验证的是**管路通**（六段全跑/gate 严格/token 会花），不是**效果**。三味药缺一不可（更大 train + 更多 epoch/步 + 更大 sel），其中 **sel 太小最关键**——sel 不放大，就算真帮到了也照样显示打平被拒。此外印证：有界 LR（SELECT 恒 ≤budget）、接受门严格改进/ties-rejected、reflect 是耗时/token 主瓶颈（占 wall 的 60~73%）。

## 冲突与演进

- 2026-07-01：从 SkillOpt 论文精读 + 源码拆解 + AML 实战三条线首次建页。论文提供机制原理（四大机件/三 split/快慢循环），源码篇提供 environment-agnostic 骨架与 memory 代码落点，实战篇提供"冒烟只测管路不测效果"的关键经验教训。

## 关联概念

- [[automatic-prompt-optimization]] — `contrasts` TextGrad/GEPA（APO 家族）优化一次性 prompt、无优化器纪律；SkillOpt 优化持久 skill artifact 且凑齐 validation gate/bounded LR/rejected buffer/slow-meta 四块无短板
- [[rejection-sampling-finetuning]] — `contrasts` 同属拒绝采样谱系"打分筛选、只留改进"，RAFT 筛**样本**、SkillOpt 筛**编辑**；validation-gated 接受 ≈ 选择族而非梯度族
- [[reinforcement-learning]] — `contrasts` SkillOpt 把分数当选择/门控信号（accept/reject 改文本），RL 把 reward 当梯度信号（advantage 更新权重）——离散筛选 vs 连续参数更新
- [[skill-runtime]] — `uses` skill 是"执行前塞进 agent context 的自然语言"，SkillOpt 优化的正是这层可复用外部状态
- [[agent-lightning]] — `contrasts` 权重级（policy/θ，需 GPU/可训练模型）vs 文本级（context/外部状态，冻结/可迁移）的互补层，可叠加（先 RL 练强原生能力，再用 SkillOpt 配可迁移 playbook）
- [[method-agnostic]] — `contrasts` environment-agnostic 是 method-agnostic 的环境侧孪生（换环境 vs 换算法）
- [[advantage-function]] — `contrasts` SkillOpt 把分数当离散门控信号（accept/reject），RL 把 advantage 当连续梯度信号——分数用法的两条路

## 来源日记

- [[2026-07-01-SkillOpt]] — 论文精读：四大机件、三 split、快慢两层循环、选择门 vs 梯度、与竞品"缺哪块"式对比
- [[SkillOpt源码篇：主要模块拆解与六阶段执行流剖析]] — 8 包职责、六阶段代码映射、EnvAdapter 契约、三 memory 代码落点、optimizer/target 双通道
- [[SkillOpt快速上手：AML+Azure OpenAI跑通SearchQA最小实验]] — AML CPU + Azure OpenAI runbook、`--limit N --train_size N` 成对踩坑、冒烟只测管路的深挖
