---
title: 知识差距分析报告 2026-10-25
created: 2026-10-25
tags:
  - knowledge-gap
  - wiki-maintenance
stats:
  concepts: 117
  methods: 22
  decisions: 8
  claims: 806
  maturity: 2.47
github_trending_date: 2026-10-25
arxiv_query_date: 2026-10-25
huggingface_query_date: 2026-10-25
baseline: 2026-10-19-gap-analysis
trends:
  - topic: harness
    title: 'Harness 递归自我优化进入大厂开源阶段'
    priority: high
    action: deep
    signals: [github, arxiv, hf]
    nodes: [recursive-self-improvement, harness-engineering]
  - topic: agent-memory
    title: 'Agent memory 第一次有了能直接用的评测结论'
    priority: high
    action: deep
    signals: [arxiv, github, hf]
    nodes: [claude-code-memory-system]
  - topic: voice-agent
    title: '全双工语音前台与后台 agent 有了真实部署'
    priority: medium
    action: claim
    signals: [arxiv]
    nodes: [cascaded-vs-e2e-voice]
  - topic: agent-eval
    title: 'Coding agent 评测走向真实工作状态'
    priority: medium
    action: overview
    signals: [arxiv]
  - topic: local-inference
    title: '本地 coding agent 的小激活 MoE 与 harness 即插即用'
    priority: medium
    action: overview
    signals: [hf, github]
    nodes: [model-routing]
  - topic: industry-watch
    title: 'AI clean-room 软件克隆潮'
    priority: low
    action: watch
    signals: [github]
  - topic: agent-safety
    title: 'agentic misalignment 评测'
    priority: low
    action: watch
    signals: [arxiv]
  - topic: multi-agent
    title: 'MAS 网络拓扑与共识'
    priority: low
    action: watch
    signals: [arxiv]
---

# 知识差距分析报告（2026-10-25）

> 基线对比：[[2026-10-19-gap-analysis]]（6 天前）。这期间 wiki 净增 4 个概念页（[[a2a-protocol]] / [[a2ui-protocol]] / [[recursive-self-improvement]] / [[global-secure-access]]）、25 条 Claims，方法与决策页没有变化。原则不变：**wiki 缺失不等于知识盲区**，按重要性排序，只报值得关注的新发展。外部信号三路采集（GitHub / arXiv / HuggingFace，均 2026-10-25）。

## 一、内省总览（维度 1-3）

### 总体统计

| 指标 | 10-19 基线 | 本期 | 变化 |
|---|---|---|---|
| 概念 / 方法 / 决策 | 113 / 22 / 8 | 117 / 22 / 8 | +4 / 0 / 0 |
| Claims 总数 | 781 | 806 | +25 |
| Claim 状态 | active 370 / stale 411 | active 395 / stale 411 | **stale 一条没动**，新增全是 active |
| 单来源概念 | 32/113 | 24/117 | 改善（口径见下） |
| 低置信 Claims（≤0.5） | 16 | 15 | 持平 |
| 孤立概念 | 0 | 0 | `terminal-multiplexer-for-ai` / `intelligent-dictation` 有入链但仍**无出链到概念页** |
| 加权成熟度 | 2.29 | 2.47 | 统计脚本本期重写，**绝对值不可直接对比**，分类排序可比 |

**口径说明**：本期脚本把"来源数"取 `## 来源日记` 条目数与 Claim `来源` 字段去重 wikilink 数中的较大值，比上期宽；"方法覆盖"按概念页内任一处链接到方法页计。所以 2.47 比 2.29 高的主要是口径差，不代表一周内成熟度跳升。

### 分类成熟度（Claims 加权）

| 分类 | 概念 | Claims | 成熟度 | 链到方法页的概念数 | 与上期相比 |
|---|---|---|---|---|---|
| AI FinOps 与经济学 | 2 | 11 | 2.75 | 2 | 排序不变 |
| 语音与实时交互 | 14 | 110 | **2.71** | 6 | 仍是最成熟的大分类 |
| LLM 推理与训练 | 16 | 107 | 2.61 | 7 | 不变 |
| AI Agent 理论与架构 | 38 | 250 | 2.55 | 9 | +1 页（recursive-self-improvement） |
| Azure 与云平台 | 4 | 25 | 2.43 | 1 | +1 页（global-secure-access），排名上升 |
| 具身智能 | 6 | 32 | 2.38 | 0 | 不变 |
| AI 硬件与推理基础设施 | 1 | 6 | 2.35 | 0 | 单页样本 |
| 知识管理与工具 | 10 | 47 | 2.34 | 1 | 不变 |
| Context 与工具集成 | 7 | 36 | 2.19 | 1 | +2 页（a2a / a2ui） |
| 数据本体论 | 2 | 11 | 2.05 | 0 | 不变 |
| Vibe Coding 框架与工作流 | 5 | 23 | 2.02 | 0 | 不变 |
| Claude Code 与扩展生态 | 6 | 24 | 1.93 | 0 | 近两月无新 Claim |
| 工程质量与测试 | 6 | 21 | **1.82** | 0 | **连续第四期垫底** |

- **零方法覆盖**：具身智能、数据本体论、Vibe Coding、Claude Code、工程质量五个分类没有任何概念链到方法页，与上期一致。
- **上期四条学习建议本周都没有落到 wiki**：`MOPD` / `ProCredit` / `magpie` / `ponytail` 在 wiki 中 0 命中，stale 411 条原封不动。本期不再追加新的待办，改为**升级已有 backlog 条目**（见第六节）。

## 二、GitHub 趋势对标（维度 4）

> velocity 优先。已跟踪项（deepseek-harness 3571⭐/天、DSH 卫星群、ponytail、magpie、jev-ultrafast）不再占名额。

| 趋势主题 | 代表仓库 | Stars | Velocity（⭐/天） | 创建 | 信号 | wiki 覆盖 | 建议 |
|---|---|---|---|---|---|---|---|
| **递归 harness 优化** | google-research/harness2 | 19.2k | 1010 | 10-06 | A+C | 🔶 [[harness-engineering]] / [[recursive-self-improvement]] | **上期"观望"已揭晓**：Harness²（Recursive Agent Harnessing，arXiv 2610.14224），权重不动，任务级 Propose–Probe–Compose 无监督改 harness + 跨任务更新"改进 harness"。直接读 |
| DeepSeek 自家推理框架 | deepseek-ai/DeepInfer | 22.0k | 2439 | 10-16 | A | 🔶 [[prefix-caching]] 等推理页 | 了解：DSH（harness）之后模型方自己出推理框架，栈从上到下补齐 |
| Agent 逆向 + clean-room 复刻 | morluto/rea、storytold/photocraft·wordcraft·pdfcraft 等 *craft 系列 | 380k / 72k / 16k | 1957 / 2899 / 884 | 04-14 / 09-30 | A+C | ❌ | 观望：媒体已把 REA 与 *craft 系列并称"AI 软件克隆"潮。rea 打着 `dsh-plugin` 标签，是 harness 插件生态的副产品；合规与知识产权风险大，不建议跟进实践 |
| 代码知识图谱 | Graphify-Labs/graphify | 134.6k | 656 | 04-03 | C | ❌（backlog 已有调研任务） | **与 PKC 主线直接相关**，日记 10-21 已有两条相关任务未动（见第六节） |
| Agent 持久记忆 | rohitg00/agentmemory、claude-mem | 29.8k / — | — | — | B | ❌ 无方法论层页面 | 盲区第六期，本期多了评测论文支撑（见维度 7） |
| 消费级本地部署 | Niko1221/Strata | 32.2k | 1037 | 09-24 | A | 🔶 [[model-routing]] | 了解：一键在消费级硬件上跑 Qwen3.8-Flash-Next，与 HF 侧"小激活 MoE"同向 |
| Skill 生态持续扩张 | wheresryan22/anatomy、cloudflare/security-audit-skill、taste-skill、archify、diagram-design | 20k / 45k / 100k / 87k / 60k | 1189 / 349 / 周增 +709 / +619 / +553 | 10-08 / 06-18 / — | A+B+C | ✅ [[skill-runtime]] / [[skill-pattern]] | 不需动作：skill 已成默认分发形态，概念层已覆盖 |

**趋势盲区结论**：本期最重要的是 harness2 内容公开——"harness 本身可以被递归优化"从概念讨论（上期 DuplexAgent-RSI）变成大厂开源框架。其余新锐要么已有页面覆盖，要么离核心领域远。

## 三、arXiv 前沿对标（维度 5）

> 聚焦 10-19 之后的新论文。

| 论文 | 时间 | 核心贡献 | wiki 覆盖 | 相关性 | 建议 |
|---|---|---|---|---|---|
| Harness² (2610.14224) | 10 | 权重固定的**两级递归 harness 优化**：任务内对比式提议-探测-组合，任务间沉淀"改进 harness"与有证据支撑的经验 | 🔶 [[harness-engineering]] / [[recursive-self-improvement]] / [[loop-engineering]] | 🔴 高 | 精读：给 recursive-self-improvement 新页补第一条大厂开源实证 |
| Harness Scaling for Generalizable Agentic RL (2610.29458) | 10 | 训练时让**同一任务跨多种 harness 变体**出现，比重复同一任务更能泛化（ClawGym / PinchBench / Claude Code 评测） | 🔶 [[harness-portability-spectrum]] / [[reinforcement-learning]]（stale） | 🔴 高 | 读：从训练侧印证"harness 可移植性"，也是 RL cluster 复活素材 |
| MemDev-Bench (2610.27524) | 10 | 用 Claude Code + DeepSeek-V4-Flash 评五种记忆系统（含 mem0 / claude-mem）：**直接给原始历史轨迹比压缩记忆更省步数**，压缩记忆丢了过程信息 | ❌ 无 agent memory 页；🔶 [[claude-code-memory-system]] | 🔴 高 | 读：对 PKC"编译后的 wiki vs 原始材料"取舍有直接参照意义 |
| Cache Engineering for Agents (2610.28577) / MemPrice (2610.24955) | 10 | 长轨迹 agent 的 KV cache I/O 成为主成本，从文本级 context 工程转向 cache 级管理；按"定价"在线分配有限记忆 | 🔶 [[prefix-caching]] / [[context-engineering]] | 🟡 中 | 补 Claim：context engineering 往下走到 cache 层 |
| VISAGENT (2610.26168) | 10 | 端到端语音交互模型做前台（全双工、可打断），分层路由把请求交给后台 agent；**已在 114 热线落地** | 🔶 [[voice-live-agent]] / [[cascaded-vs-e2e-voice]] | 🔴 高 | 读：上期"实时通道 + 后台计算"架构族有了真实部署案例 |
| DuplexLedger (2610.27581) / Context Spanning (2609.33443) / Diffuplex (2610.17780) | 09-10 | 全双工下的事务型记忆评测；全双工模型与外部 LLM 后端的通信框架；离散扩散做全双工以兼顾快和聪明 | 🔶 [[turn-taking]] / [[cascaded-vs-e2e-voice]] | 🟡 中 | 与 τ-Voice 并入同一次阅读 |
| SWE-Residual (2610.25899) / SWE-DIVE (2610.30047) / Auditing Behavioral Detectors (2610.30491) | 10 | coding agent 评测从"干净起点单轮"转向**接手半成品**、**模拟用户多轮交互**；以及评测标签与真实轨迹不一致的审计 | 🔶 [[harness-engineering]]；工程质量分类无评测页 | 🟡 中 | 工程质量分类的补页素材（该分类连续四期垫底） |
| TrackRL (2610.25126) | 10 | agentic RL 中**可追踪的 skill 库生命周期**（准入/退役/归因），AppWorld 上优于 GRPO | 🔶 [[skill-runtime]] / [[reinforcement-learning]] | 🟡 中 | 补来源：skill 与 RL 两条线的交汇 |
| AM-Bench (2610.24264) / MAS RL 红队 (2610.28966) | 10 | agentic misalignment（宁选有害动作也不愿失败）分类与评测；黑盒 RL 红队多 agent 系统 | ❌ | 🟢 低 | 了解即可 |

**前沿盲区结论**：本期论文集中在三处——**harness 递归优化与跨 harness 训练**（harness 主线）、**agent 记忆的系统性评测**（记忆盲区第一次有了可用的评测结论）、**coding agent 评测走向真实起点与多轮**（最弱分类的素材）。

## 四、HuggingFace 模型近期动向（维度 6）

| 排名 | 模型/技术 | Velocity（❤️/天） | 创建 | 一句话要点 | 重要性 |
|---|---|---|---|---|---|
| 1 | deepseek-ai/DeepSeek-V4.1-Flash-1017 | 353 | 10-17 | 上期已报；一周内社区已出 GGUF、FP8、去审查等十余个衍生版 | 🟢 |
| 2 | RecursiveSI/flint | 196 | 10-21 | 40B 总参 / 约 2.5B 激活的 coding agent MoE，官方称 SWE-bench Verified 74.2%、Terminal-Bench 2.1 54.9%；**据称主要由自动化研究系统（Eureka Machine）搭建**，同时发 NVFP4 与 INT4 GGUF，可本地接 OpenCode | 🔴 |
| 3 | ISTA-DASLab/DeepSeek-V4.1-Flash-1017-GSQ-RCO-GGUF | 112 | 10-23 | 新量化方案 GSQ-RCO 在新模型发布 6 天内跟进，上期 Qwen3.8 版已 125 万下载 | 🟡 |
| 4 | LiquidAI/LFM2.5-24B-A2B | 45 | 10-12 | 又一个 A2B 级小激活 MoE | 🟡 |
| 5 | MiniMaxAI/MiniMax-M3.1-Flash | 40 | 10-17 | 多模态 Flash 版 | 🟢 |
| 6 | tencent/Hy-Memory-30B-A3B | 31 | 10-15 | 以"记忆"命名的 30B-A3B 模型，记忆能力开始下沉到权重层 | 🟡 |
| 7 | KRAFTON/Raon-1-mini-preview | 44 | 10-21 | 游戏公司自研文本模型预览版 | 🟢 |
| 8 | fishaudio/drama-3 | 41 | 10-01 | 表现力 TTS（上期已报） | 🟢 |

**技术方法新动态**：

- **小激活 MoE 成为本地 coding agent 的主力形态**：flint（A2.5B）、LFM2.5（A2B）、Hy-Memory（A3B），加上上期 MiniCPM-V-4.7（A3B）；配套是 NVFP4 / INT4 GGUF 同日发布、直接给出 OpenCode / pi 接入配置。模型方开始按"装进某个 harness 就能用"来交付。→ 🟡
- **NVFP4 + 量化感知蒸馏（QAD）继续扩散**：NVIDIA Nemotron 3.5 Super VL 以 NVFP4 + QAD 交付并附 RL 环境；Reflection Beam（501B-A23B）发布 NVFP4 版并预告自蒸馏（self-distillation）配方。上期判断"量化从 PTQ 转向蒸馏回补精度"得到第二批证据。→ 🟡
- 上期 🔴 的多教师 on-policy distillation 本周无新增证据，结论不变，仍待补入 [[rejection-sampling-finetuning]]。

## 五、近期趋势综合（维度 7，按重要性）

1. 🔴 **Harness 递归自我优化进入大厂开源阶段**（多源：GitHub harness2 1010⭐/天 + arXiv Harness² / Harness Scaling + HF flint 自称由自动化研究系统搭建）——"模型不动、改 harness"有了可复现框架；训练侧也开始把 harness 多样性当作数据维度。正好落在本周新建的 [[recursive-self-improvement]] 与 [[harness-engineering]] 上，也是日记 DSH 深挖"同一 harness 换模型"实验的反面参照（同一模型换 harness）。→ **深入学习**
2. 🔴 **Agent memory 第一次有了能直接用的评测结论**（多源：arXiv MemDev-Bench / MemPrice / DuplexLedger + GitHub graphify 134k、agentmemory + HF Hy-Memory）——MemDev-Bench 的发现（原始轨迹比压缩记忆更有效，因为保留了过程信息）对 PKC"编译一次、持续维护"的设计是一个值得正面回应的反例。连续第六期高热，wiki 仍只有工具级的 [[claude-code-memory-system]]。→ **深入学习**，是否建 agent memory 页由你决定
3. 🟡 **全双工语音"前台 + 后台 agent"有了真实部署**（多源：arXiv VISAGENT / Context Spanning / DuplexLedger + 上期 NemotronLabs VoiceChat）——方向不新，上期已列为 🔴；本期新增的是 114 热线部署案例，可作为 [[cascaded-vs-e2e-voice]] 复核时的实证。→ 并入已有 Voice 主线任务
4. 🟡 **Coding agent 评测走向真实工作状态**（单源 arXiv 成族：SWE-Residual / SWE-DIVE / 行为检测器审计）——"接手别人声称已完成的半成品"是日常真实场景，现有 SWE-bench 式评测不覆盖。工程质量分类连续四期最弱，可借此补一个评测类概念页。→ 了解概况
5. 🟡 **本地 coding agent 的小激活 MoE + harness 即插即用交付**（多源：HF flint / LFM2.5 + GitHub Strata / DeepInfer）——补 [[model-routing]] 的本地侧证据。→ 了解概况
6. 🟢 观望：AI clean-room 软件克隆潮（rea / *craft 系列，合规风险高）、agentic misalignment 评测、MAS 网络拓扑与共识。

## 六、学习建议（升级已有 backlog，不新增任务）

1. **读 Harness² + Harness Scaling**（信号：GitHub + arXiv + HF）：两篇一起读，各补 1~2 条 Claim 到 [[recursive-self-improvement]] / [[harness-engineering]]，并把"同一模型换 harness"作为 DSH 深挖场景 5 的对照组记一笔。〔本期唯一的新动作〕
2. **PKC 竞品与 agent memory 合并成一次扫描**（信号：GitHub + arXiv）：日记 10-21 的「知识差距·PKC 主线」（openwiki / graphify）与「学习和掌握 graphify」两条合并，加上 MemDev-Bench 作为评测视角，做完再决定是否建 agent memory 页。〔连续第四期沿袭，建议本周优先〕
3. **Voice 与 RL 两条沿袭任务只追加材料、不拆新任务**：Voice 主线在 τ-Voice 之外加读 VISAGENT；RL 结构性债务在 ProCredit / MOPD 之外加 Harness Scaling 与 TrackRL。stale 411 条一周未动，清理比继续添加更紧迫。

## 附：采集执行记录

- GitHub：gh api 信号 A（90 天 / 30 天新锐）与 C（10 个领域关键词 × 半年新锐 / 近 7 天活跃）成功；harness2 / openai/math 仍无仓库描述，harness2 通过 README 确认内容（openai/math 仍未知，继续观望）。信号 B 来自 Tavily 检索到的 10 月 trending 汇总与 skill 仓库周增榜，周增数据未逐条复核。velocity 与 trend_score 由脚本计算。
- arXiv：Tavily `include_domains=arxiv.org` + 近一周 / 一月时间窗，6 个领域各 1 次。注意带 `start_date` 参数的查询全部返回空，改用 `time_range` 后正常。
- HuggingFace：Python 直连遇 SSL 证书错误，改用 curl 调 API；likes / downloads Top100、6 个 pipeline_tag、9 个关键词与 trendingScore 排序共 31 次查询，后过滤近 90 天创建（147 个模型）后按 likes/天排序。技术趋势通过 Tavily 检索 NVIDIA 技术博客、Reflection 博客与 HF 模型卡。flint 的基准成绩与"由 AI 搭建"均为官方自述，未独立验证。
