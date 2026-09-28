---
title: "任务完成花费（Cost per Task）"
created: "2026-09-28"
updated: "2026-09-28"
tags:
  - wiki
  - concept
  - finops
  - agent-evaluation
  - roi
aliases:
  - "cost per task"
  - "每任务成本"
  - "每成功任务成本"
  - "cost-per-successful-task"
  - "AI FinOps 任务口径"
related:
  - "[[data-flywheel]]"
  - "[[confidence-calibration]]"
  - "[[generation-evaluation-separation]]"
  - "[[model-routing]]"
  - "[[hybrid-inference-framework-selection]]"
  - "[[azure-copilot-ecosystem]]"
  - "[[reward-design-three-inputs]]"
---

# 任务完成花费（Cost per Task）

## 摘要

任务完成花费是 AI FinOps 的度量刻度从 **token 价格**转向**"完成一项任务花多少钱"**之后的核心对象。它把一项由 AI 完成的任务的真实成本拆成三项——`模型调用成本 + 人工验证成本 + (1 − 成功率) × 错误成本`——其中只有第一项随 token 降价而下降。供给方（OpenAI《Building abundant intelligence》）已把度量口径改成"让多少有用工作成为可能"，使用方需要一个对应的刻度来判断"哪些工作值得开展"，这就是任务完成花费。

它同时是一个**分类工具**：AI 好用与不好用的分界不是行业而是两个变量——验证成本（人能否当场判对错）× 错误成本（可逆还是不可逆）。至少一个变量便宜的任务落在"Too good to be true"栏（第一项主导，token 便宜即真便宜）；两个都贵的任务落在"Too bad to be useful"栏（第三项主导，token 降价十倍总成本几乎不动）。迁栏阈值 `(1 − 成功率) × 错误成本 < 人工复核成本` 决定何时去掉人在环里的复核才划算。这一刻度贯穿 [[data-flywheel]] 的三层嵌套循环，并在 [[confidence-calibration]] 进入后把"人工验证"这一项再拆一层（复核 100% → 复核被标记部分）。

## Claims

### Claim: 任务完成花费 = 模型调用 + 人工验证 + (1 − 成功率) × 错误成本；token 价格只影响第一项

- **来源**：[[FinOps系列01：从token价格到任务完成花费——指标转向与AI使用边界]]
- **首次出现**：2026-09-25
- **最近更新**：2026-09-28
- **置信度**：0.75
- **状态**：active

> 三项分别是：模型调用成本（token×单价 + 工具/检索/外部 API，传统 AI FinOps 唯一盯住的一项）、人工验证成本（不随 token 降价下降，只随任务可验证性变化）、错误成本期望值（由任务性质决定，可逆≈0，不可逆可能远大于前两项之和）。右栏任务 95% 成功率听起来不低，但对报税/数据录入意味着人仍要复核 100%（不知道哪 5% 错），第二项不降反升。Agentic Engineering 文观察到的"过度节省 token 导致 agent 质量下降触发更多重试反而更贵"，用此公式看是"压第一项压过头，第三项涨回来"。供给方口径来源：OpenAI CFO 2026-07-31 原话 "not simply … lower token prices … measure our progress by how much useful work it makes possible"。（讨论整理 + 官方博文核订）

### Claim: AI 好用与不好用的分界不是行业而是两个变量——验证成本 × 错误成本；"无人在环"与"要求可靠性"是同一件事

- **来源**：[[FinOps系列01：从token价格到任务完成花费——指标转向与AI使用边界]]
- **首次出现**：2026-09-26
- **最近更新**：2026-09-28
- **置信度**：0.7
- **状态**：active

> TypeSafe 创始人演讲 slide《LLMs: what's the deal?》两栏中 Customer Service 同时出现，左栏多一个限定词 "w/o decisions"——同一行业有没有"决策"就跨了栏，说明分界不在行业。左栏共性：至少一个变量便宜（Copilot/Coding agent 验证便宜可回滚；Slop 错了没人在意）；右栏共性：两个都贵（报税/保险/数据录入要专业复核且不可逆）。训练侧解释：主流模型用 RLHF 优化成"辅助者"，左栏是训练目标的投影；右栏需要客观对错信号，是 RLVR 的领域（见 [[reinforcement-learning]]）。迁栏阈值 `(1 − 成功率) × 错误成本 < 人工复核成本` 随成功率提升向右上移动，覆盖越来越多任务。（演讲为 Jev 产品预热，讲者立场已注明）

### Claim: ROI 必须站在接收方算——"成功"的判定归接收方，验收口径与优化口径分开

- **来源**：[[FinOps系列01：从token价格到任务完成花费——指标转向与AI使用边界]]
- **首次出现**：2026-09-26
- **最近更新**：2026-09-28
- **置信度**：0.75
- **状态**：active

> 生产方视角："返回了结果、没报错、token 很少"=完成得很便宜；接收方视角："能不能直接用、改的时间是否比自己写还长"才是完成。slide 把 Slop/Spam 放在 Too good to be true 栏正是警告：站生产方它最便宜，站接收方价值为负。工程含义两条：① 成功判定归接收方不归生成方——与 [[generation-evaluation-separation]] 同一原则；② 验收分逐字节不动作历史可比业务口径，优化用 reward 单独设计——[[reward-design-three-inputs]] 的"两本账"在 FinOps 语境同样成立；不分家的后果是 Goodhart（cost per task 直接当 RSI 目标会学到省钱但降质：少验证、缩输出、模糊情况直接宣告完成，错误暴露有延迟）。

### Claim: 度量最小单位是任务不是调用；使用洞见只给第一项；分桶后策略分叉；任务选择杠杆大于任何优化手段

- **来源**：[[FinOps系列01：从token价格到任务完成花费——指标转向与AI使用边界]]、[[FinOps系列03：落地提纲——从使用洞见到优化、监控、评估闭环（活文档）]]
- **首次出现**：2026-09-26
- **最近更新**：2026-09-28
- **置信度**：0.65
- **状态**：active

> 任务级最小字段集七个：task_id / scenario_bucket（两变量坐标位置，至少左右两桶建议四象限）/ model_cost / success（接收方判定）/ verify_minutes / error_cost_est / reversible。GitHub Copilot、Copilot Studio、AI Foundry 的 usage insights 只能给第一项（用量在哪），成功率与验证成本要自己补（价值在哪）；Copilot Cowork 的 Copilot Credits 是唯一原生 task 粒度的数据源但仍只是第一项。分桶后策略分叉：左栏压 token（上下文裁剪/[[model-routing]]/输出压缩），右栏提成功率（评估→优化→监控闭环），两桶混算平均得到"AI 很便宜但没人敢用"与"AI 很有用但算不出 ROI"并存的假象。第四推论：两变量图是"哪些任务该做、成功由谁判定"的操作界面，排在 token 压缩与优化算法之前——对应金字塔 algorithms < compute < data < doing the right task（见 [[data-flywheel]]、[[bitter-lesson]]）。开放问题：verify_minutes 无自动记录手段（代理：输出被修改比例 / 生成到提交间隔）；右栏错误成本是尾部分布，期望值低估风险，或需分位数/风险溢价。（提纲级，待核实项多，置信度偏低）

### Claim: Copilot → Cowork → Super App 是人在环里位置的三次后移；微软定价已按此分档，但按量计费 ≠ 按结果计费

- **来源**：[[FinOps系列01：从token价格到任务完成花费——指标转向与AI使用边界]]
- **首次出现**：2026-09-26
- **最近更新**：2026-09-28
- **置信度**：0.7
- **状态**：active

> 三阶段不是三种产品：Copilot=人逐条接受/拒绝（token/建议级验证，第二项单次极小次数极多，无进入条件）→ Cowork=agent 完成整个任务人按任务审阅（task 级，进入条件"审阅比自己做便宜"）→ Super App=多 agent 自主运行人只处理例外（outcome 级，进入条件即迁栏阈值）。每后移一次换一种验证形态并要求成功率越过新阈值，所以产品路线图与飞轮是同一件事。微软定价确认分界：M365 Copilot 席位 $30/用户/月不变覆盖辅助档；Copilot Cowork 2026-06-16 GA 转按量，Copilot Credits 按任务四项输入（模型/上下文检索/工具调用/运行时长）轻中重三档；GitHub Copilot 同年按量；Autopilot 待核实。关键：Credits 计量的是任务消耗的算力，**失败与重试同样计费**——账单给分子，成功任务数要使用方自己补，使用方 FinOps 由此从可选变必需。C 端式采用指标（活跃/会话/留存）只能当先行指标，Cowork 启用后必须切换到任务口径。"自动化做不到是否只能走辅助"：辅助不是备选而是入口（人当验证器、每次接受/修改都是带标签样本），但高错误成本不可逆任务终态可能长期停在"agent 干活、人签字"。（Computerworld 报道核订；"Office 商业账户 4.5 亿 / Copilot 付费渗透 <7%"为二手数据未核实）

### Claim: 实践对照——Jev 判断层压低的是第一项与时间，成功率与错误成本那一项要靠验收器、置信度门控与人工确认守住

- **来源**：[[Computer Use与Browser Use系列八：Jev×Codex实践——把动作判断交给System One模型的受控对照、费用账与skill优先级结论]]、[[Codex Desktop系列07：用Jev做Auto模型与推理强度路由——七模型与effort的判断设计、与规则匹配和轻量LLM路由的区别、性能准确缓存的平衡]]
- **首次出现**：2026-09-27
- **最近更新**：2026-09-28
- **置信度**：0.7
- **状态**：active

> 系列八受控对照：只换判断模型，每次任务费用（公开价估算）减少 90~96%、耗时减少 58~66%，成功率两组均 4/4——但结论写成"条件默认"而非"优先选择"，因为只在低错误成本任务上验证了第一项；有 stakes 的动作（付款/删除/不可撤销提交）任一执行器都走人工确认，"错误成本主导，与判断模型无关"。Codex 系列07 的路由链把任务完成花费拆到正确粒度：绑定按任务不按调用、切换算总账不比单价（缓存账算例：B 单价便宜五倍，历史 10 万 token 读取仍贵一倍）、缓存以 usage 为证不以配置推断；Azure 实际费率为空时**禁止纯成本降档、不报告节省金额**——这是"缺失字段不补 0"纪律（见 [[generation-evaluation-separation]]）在 FinOps 上的体现。两篇是本页公式的首批工程实践。

## 冲突与演进

- 2026-09-28：建页。前身是 2026-09-04 HOLD 的 `cost-per-successful-task`（当时单篇六层降本文口径，Claim 并入 [[hybrid-inference-framework-selection]]），复核阈值"第 2 次实践落地"被 FinOps 系列 01~03（独立系列专论）+ Computer Use 系列八费用账 + Codex 系列07 缓存账三处命中，解除 HOLD 升格建页。两变量分界（验证成本 × 错误成本）与 Copilot/Cowork/Super App 阶段模型按"避免碎片化"作页内 Claims 收入，不独立建页。
- 与 [[three-layer-token-optimization]] / [[model-routing]] 的关系：那两页是"左栏第一项"的优化手段，本页给出它们的适用边界（右栏任务 token 层手段几乎无效）。

## 关联概念

- [[generation-evaluation-separation]] — `extends` "成功判定归接收方、验收口径与优化口径分开"是分离原则在 FinOps 度量上的延伸——判分的一方不能是写答案的一方
- [[model-routing]] — `constrains` 路由只优化第一项、只对左栏任务有效；切换模型须算缓存总账而非比单价
- [[three-layer-token-optimization]] — `constrains` token 压缩手段的适用边界：右栏任务第三项主导，压第一项过头会让第三项涨回来
- [[hybrid-inference-framework-selection]] — `grounds` 该决策页"选型口径升级为每成功任务成本"Claim 的理论展开（三项公式 + 分桶）
- [[azure-copilot-ecosystem]] — `grounds` Copilot → Cowork → Super App 分档定价（席位 vs Copilot Credits）的解释框架：人在环位置后移
- [[bitter-lesson]] — `extends` 金字塔 algorithms < compute < data < doing the right task 把 Bitter Lesson 再推一层：连方法都不是关键，关键是选对任务

## 关联方法

- [[reward-design-three-inputs]] — `uses` 两本账分家（验收分不动、优化 reward 单设）是防 cost per task 被 Goodhart 的手段

## 来源日记

- [[2026-09-25-周五]] — 主任务"FinOps 新指标 ROI——不是 token 价格而是任务完成花费"讨论起点（OpenAI 博文、三类使用洞见、RSI 与飞轮重叠）
- [[2026-09-26-周六]] — 追加讨论：slide 两栏与两变量分界、成本公式、ROI 站接收方；FinOps 系列三篇成文 + 微软定价分档补充
- [[FinOps系列01：从token价格到任务完成花费——指标转向与AI使用边界]] — 公式、两变量分界、四条度量推论、Copilot→Cowork→Super App 映射与微软定价
- [[FinOps系列03：落地提纲——从使用洞见到优化、监控、评估闭环（活文档）]] — 三类数据源能给/缺什么、七字段、推进顺序、开放问题（活文档，多为待核实）
- [[Computer Use与Browser Use系列八：Jev×Codex实践——把动作判断交给System One模型的受控对照、费用账与skill优先级结论]] — 费用账按模型归属、"条件默认"结论与公式一致
- [[Codex Desktop系列07：用Jev做Auto模型与推理强度路由——七模型与effort的判断设计、与规则匹配和轻量LLM路由的区别、性能准确缓存的平衡]] — 任务级绑定、缓存切换总账、价格为空禁止成本降档
