---
title: "数据飞轮（Data Flywheel）"
created: "2026-09-28"
updated: "2026-09-28"
tags:
  - wiki
  - concept
  - finops
  - self-improvement
  - reward-design
aliases:
  - "data flywheel"
  - "工程数据飞轮"
  - "三层嵌套循环"
  - "飞轮效应"
related:
  - "[[cost-per-task]]"
  - "[[continual-self-improving-ai]]"
  - "[[prompt-optimization-maturity-ladder]]"
  - "[[reinforcement-learning]]"
  - "[[bitter-lesson]]"
  - "[[skillopt]]"
  - "[[generation-evaluation-separation]]"
---

# 数据飞轮（Data Flywheel）

## 摘要

数据飞轮的经典画法是一个圈：使用产生数据，数据改进模型，模型改进带来更多使用。它回答的是**"为什么会越转越快"**——经济学与组织层面的描述，主语是产品或公司，默认人在环里（标注、评估、决定投资），积累的是数据与资本，时间常数以季度计。与它形状相同但主语不同的是 RSI（递归自我改进，见 [[continual-self-improving-ai]]）：回答"谁在推轮子、能不能把人拿掉"，主语是一个 agent 系统。一句话骨架："**数据飞轮是 RSI 的宏观影子，RSI 是数据飞轮去掉人之后的样子**"。

本页把两者放回同一张图：**三层嵌套循环**——外圈经济飞轮（OpenAI《Building abundant intelligence》：成本下降→更多工作值得开展→采用带来收入与反馈→再投资）、中圈工程数据飞轮（使用洞见/遥测 → 评估 → 优化 → 部署，人还在环中，优化手段沿 [[prompt-optimization-maturity-ladder]] L0→L2 升级）、内圈 RSI（中圈的自动化版本，agent 对自身历史 replay 与策略选择）。三层之所以能嵌套不脱节，是因为 [[cost-per-task]] 在每层都能读：外圈读作单位经济学、中圈读作评估目标（reward = 成功率 / 成本）、内圈读作 RSI 的优化对象。而三层循环全部运行在"任务已选定"的前提下——金字塔底层 doing the right task 的杠杆大于飞轮与 RSI 本身。

## Claims

### Claim: 数据飞轮与 RSI 不是并列概念而是同一循环的两个视角，用三个维度拉开——人在不在环里、积累的是什么、时间常数

- **来源**：[[FinOps系列02：数据飞轮与RSI——三层嵌套循环与一个贯穿指标]]
- **首次出现**：2026-09-25
- **最近更新**：2026-09-28
- **置信度**：0.7
- **状态**：active

> 重叠的是形状（用产出改进产出者），不重叠的是主语和机制。① 人在不在环里：飞轮默认在（标注/评估/投资方向由人做，人是飞轮的一个部件），RSI 目标是不在（agent 用自身轨迹当 replay simulator）；② 积累的是什么：飞轮积累数据与资本（需存储/治理/合规），RSI 积累能力本身（skill、搜索策略、prompt 配方，数据只是中间产物），[[skillopt]] 的 `best_skill.md` 就是这种资产的具体形态，所以 RSI 比飞轮"轻"；③ 时间常数：飞轮以季度计需用户规模驱动，RSI 以小时/天计单系统内可闭环——转速差两到三个数量级，慢圈给快圈方向与预算，快圈给慢圈证据，因此两者是嵌套不是替代。

### Claim: 三层嵌套循环——外圈经济飞轮 / 中圈工程数据飞轮 / 内圈 RSI；关系是供给不是替代

- **来源**：[[FinOps系列02：数据飞轮与RSI——三层嵌套循环与一个贯穿指标]]
- **首次出现**：2026-09-25
- **最近更新**：2026-09-28
- **置信度**：0.65
- **状态**：active

> 外圈（OpenAI 口径）决定预算从哪来往哪投；中圈以 GitHub Copilot / Copilot Studio / AI Foundry usage insights 为遥测入口，经评估（判成功算成本）进优化（prompt 改写 → APO → SFT → RL，对应成熟度阶梯 L0→L2，每上一级人的参与从"人改人看"退到"人定评估集、算法闭合回路"），部署回生产——Azure 博客所谓 continuous optimization 即这一圈的平台化；内圈是中圈的自动化版本，Dream-RSI 三阶段直接映射（探索产生历史 → 历史变 replay simulator 离线回放 → dreaming 选更好的探索策略），比中圈快两个数量级因为省掉人的响应时间与真实 rollout。供给关系：外圈给中圈预算方向，中圈给内圈评估集与 reward 定义，内圈给中圈成功率提升证据，中圈给外圈"哪些工作已值得开展"的答案。（作者综合框架，单系列，置信度中等）

### Claim: 反直觉接口——可验证 reward 最充足的恰是"Too bad to be useful"栏；飞轮路线是先让人在右栏当验证器，成功率越过阈值后任务迁栏

- **来源**：[[FinOps系列02：数据飞轮与RSI——三层嵌套循环与一个贯穿指标]]
- **首次出现**：2026-09-26
- **最近更新**：2026-09-28
- **置信度**：0.7
- **状态**：active

> 右栏（报税 accept/reject、数据录入对源单据、QA 测试结果、保险理赔结论）有 ground truth；左栏开放式生成（研究报告、代码风格、对话质量）没有，只能靠 [[llm-as-a-judge]] 做主观评估，难驱动 RL/RSI。路线四步：① 右栏先把人放进环里当验证器（第二项很高，但每次人工复核都是带标签样本，成熟度 L1 阶段的 bad case 是 L2 评估集种子）→ ② 样本到位后中圈优化有客观 reward，成功率上升 → ③ 越过阈值 `(1 − 成功率) × 错误成本 < 人工复核成本` 去掉复核划算，任务右栏迁左栏 → ④ 释放人力转向下一批右栏任务。slide 是快照，飞轮讲快照怎么随时间变；OpenAI"成本下降就有更多工作值得开展"落到工程上就是迁栏，让它成立的不是 token 降价而是成功率越过阈值。"哪些任务能进内圈 RSI"的判据 = "哪些任务写得出验证器"（RLVR 式信号；主观分在离线回放里无法重新获得）。

### Claim: 安全阀——评估门控独立于优化目标；两本账分家；先把 reward 做稳再让轮子转快

- **来源**：[[FinOps系列02：数据飞轮与RSI——三层嵌套循环与一个贯穿指标]]
- **首次出现**：2026-09-25
- **最近更新**：2026-09-28
- **置信度**：0.75
- **状态**：active

> 把任务完成花费直接当内圈优化目标会 Goodhart：agent 学到省钱但降质（少验证、缩输出、模糊情况直接宣告完成），生产方看 cost 在降、接收方看错误成本在升，只是暴露有延迟——RLHF 的 reward hacking 是同一问题最著名实例，reward 含主观分风险就跟着进来。三条对策：① 监控与评估不是优化的附属而是内圈的刹车，评估器不能与被优化策略共享目标函数（[[generation-evaluation-separation]]）；② 两本账分家（[[reward-design-three-inputs]]：验收分逐字节不动，优化 reward 单设可拆 judge/约束饱和/加确定性规则）；③ 客户侧 APO 摆动主因是评估噪声而非算法，同一 reward 进 RL/RSI 后噪声仍是第一大不稳定源——扩大评估集、同 prompt 多次采样取均值、拆 judge 降分母噪声，要在加速内圈之前完成。结论：FinOps 的"监控、评估"环节不是成本中心，是内圈可以安全加速的前提。

### Claim: 金字塔底层——三层循环都压在"做对的任务"上；中圈资产按可能被清零折旧，评估集与验收标准最抗归零

- **来源**：[[FinOps系列02：数据飞轮与RSI——三层嵌套循环与一个贯穿指标]]
- **首次出现**：2026-09-26
- **最近更新**：2026-09-28
- **置信度**：0.65
- **状态**：active

> slide《How can that be possible?》四层金字塔 algorithms < compute < data < doing the right task，越底层杠杆越大。对齐：algorithms = 内圈 RSI 与中圈 APO→SFT→RL（最小，在给定任务上提几个点）；compute = 外圈算力投资与 token 价格（传统 FinOps 盯住的那层）；data = 中圈积累的评估集与轨迹（决定优化有没有原料）；doing the right task = [[cost-per-task]] 的两变量分桶与"成功由接收方定义"（决定上面三层有没有意义）。警告：RSI 只能在给定任务上让策略变好、飞轮只能在给定任务上积累数据，都不能纠正任务选错；Goodhart 在此视角就是"任务定义错了"的症状。两个例子：FLAN lesson（instruction tuning 六千引用，事后看最优用量为零——算法层投入被更底层变化整体抹掉）；Bitterest lesson（GPT-2 时代没做 RLHF 不是缺算法算力，是没人把"按人类偏好对齐"当要做的任务，"doing the right task"在 LLM 史上只发生过约一次半）。推论：预算与杠杆成正比——花在选任务与定义成功上的时间不应少于 token 压缩与优化算法；中圈的 prompt 配方/skill 文本/微调数据在模型换代后都可能归零，要按"可能被清零"折旧，评估集与接收方判定标准最不易归零应优先投资。（把 [[bitter-lesson]]"通用方法+算力胜过领域知识"再推一层：连方法都不是关键）

## 冲突与演进

- 2026-09-28：建页。前身是 2026-09-20 harvest 裁决"不建页"（通用商业术语 + 引用均在具身系列内部，L2→L4 飞轮裂缝素材归 [[world-model]] 与 [[reinforcement-learning]]），复核阈值"非具身系列独立深入引用"被 FinOps 系列 02 整篇专论命中，解除 HOLD 建页。具身域"L2→L4 数据飞轮裂缝"（L2 数据学的是 human driving distribution 而非"我该怎么开"，须插入 World Model+Simulation+RL 环节）已作 Claim 收入 [[reinforcement-learning]]，本页不重复，视为本页"飞轮不能纠正任务/分布选错"论断在自驾域的先例。
- RSI 本身不独立建页（维持 2026-09-23 裁决），作 [[continual-self-improving-ai]] 的别名与 Claims；本页只收"飞轮 vs RSI"的对照关系与三层循环框架。
- 待深入（系列 02 自列）：中圈到内圈的迁移阈值（L1→L2 有 30~50/100+ 条数据阈值，L2→RSI 是否有类似阈值或取决于 replay coverage）；人从环里退出的顺序（标注/评估/决策三角色哪个先退）；RSI 在 coding agent 之外右栏任务的 replay 可用性；三层之间的预算传递。

## 关联概念

- [[cost-per-task]] — `uses` 任务完成花费是贯穿三层循环的同一把刻度（单位经济学 / 评估目标 / RSI 优化对象），也是迁栏阈值的来源
- [[continual-self-improving-ai]] — `contrasts` RSI 是飞轮去掉人之后的样子：同一循环形状，主语从产品/公司换成 agent 系统，积累从数据资本换成能力本身，时间常数差两到三个量级
- [[reinforcement-learning]] — `uses` 内圈 RSI 几乎只能建立在 RLVR 式可验证信号之上；RLHF 式主观分对应左栏、在离线回放中无法重新获得
- [[bitter-lesson]] — `extends` 金字塔 doing the right task 把 Bitter Lesson 再推一层：飞轮与 RSI 都不能纠正任务选错
- [[skillopt]] — `uses` `best_skill.md` 是 RSI 积累"能力本身"这类资产的具体形态；bad-case mining 是中圈到内圈的同一循环

## 关联方法

- [[prompt-optimization-maturity-ladder]] — `uses` 中圈优化手段沿 L0→L2 逐级上升，人的参与逐级后退；L1 用 RLHF 式主观分、L2 才有机会接 RLVR 式客观分
- [[reward-design-three-inputs]] — `uses` 两本账分家与"确定性规则分白送零噪声信号"是内圈安全阀的具体做法

## 来源日记

- [[2026-09-25-周五]] — 主任务讨论：RSI 与数据飞轮重叠的处理（同一循环两视角、三维度、三层嵌套、贯穿指标、Goodhart 警告）
- [[2026-09-26-周六]] — 追加：右栏迁左栏路线、RLHF/RLVR 两栏对应、金字塔底层与 FLAN lesson；系列 02 成文
- [[FinOps系列02：数据飞轮与RSI——三层嵌套循环与一个贯穿指标]] — 全部五条 Claims 的来源专论
- [[2026-09-22-Dream-RSI-递归自我改进论文初读]] — 内圈 RSI 三阶段循环（探索 / replay simulator / dreaming）的机制参照
