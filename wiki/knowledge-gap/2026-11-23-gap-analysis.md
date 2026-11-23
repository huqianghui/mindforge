---
title: 知识差距分析报告 2026-11-23
created: 2026-11-23
tags:
  - knowledge-gap
  - wiki-maintenance
stats:
  concepts: 139
  methods: 22
  decisions: 12
  claims: 1024
  maturity: 2.40
github_trending_date: 2026-11-23
arxiv_query_date: 2026-11-23
huggingface_query_date: 2026-11-23
baseline: 2026-11-16-gap-analysis
trends:
  - topic: wiki-health
    title: '内部债务基本清零，剩下两篇新文未入库、两条 Claim 出处记错'
    priority: high
    action: claim
    signals: [introspection]
    nodes: [agent-runtime, reconciliation-loop, method-agnostic, viseme]
  - topic: agent-runtime
    title: '部署交接的经验只写在文章里，wiki 没有对应的页'
    priority: high
    action: claim
    signals: [introspection]
    nodes: [agent-runtime, reconciliation-loop, agent-sandbox]
  - topic: context-engineering
    title: '上下文压缩开始有专门的基准，损失取决于任务状态存在哪里'
    priority: high
    action: claim
    signals: [arxiv]
    nodes: [context-engineering]
  - topic: agent-safety
    title: 'Skill 与 MCP 成为提示注入的新入口'
    priority: medium
    action: claim
    signals: [arxiv, github]
    nodes: [skill-pattern, model-context-protocol]
  - topic: model-harness-decoupling
    title: '同一模型换 harness 成功率与成本差很多，评测开始把 harness 当变量'
    priority: medium
    action: claim
    signals: [arxiv, github]
    nodes: [model-harness-codesign, agent-harness]
  - topic: voice-agent
    title: '语音 agent 的瓶颈从识别转到决策'
    priority: medium
    action: claim
    signals: [arxiv]
    nodes: [cascaded-vs-e2e-voice]
  - topic: multi-agent
    title: '让模型自己编排子 agent 成为独立评测的能力'
    priority: medium
    action: overview
    signals: [arxiv]
  - topic: agent-eval
    title: 'Agent 评测加入欺骗与压力场景'
    priority: low
    action: watch
    signals: [arxiv]
  - topic: agent-tooling
    title: '设计品味类 skill 与 dsh 生态在 GitHub 周榜上增长最快'
    priority: low
    action: watch
    signals: [github]
    nodes: [model-routing, skill-pattern]
  - topic: local-inference
    title: '小参数循环层模型能在笔记本上跑 agent 任务'
    priority: low
    action: watch
    signals: [hf]
---

# 知识差距分析报告（2026-11-23）

> 基线对比：[[2026-11-16-gap-analysis]]（7 天前）。这一周 wiki 新增 3 个概念页、1 个决策页、43 条 Claim，新页是 MCP、协议栈伞形页、推理服务伞形页和"常驻实例 vs 会话调度"决策页；Claim 主要来自上期建议的落实（31 篇漏抽文章补抽）和 AKS 系列 12、13。上期列出的内部债务这周几乎都处理了，本期内部问题明显变少，外部信号的比重相应上升。

## 一、内部知识的完备性、准确性、缺失性与引导性（维度 8）

| 角度 | 检查 | 本期结果（上期） | 一句话判断 |
|---|---|---|---|
| 完备性 | 文章有没有被编译进 wiki | 2 / 271 篇未引用（31 / 266） | 只剩这两天新写的两篇 |
| 准确性 | Claim 是否落后于来源文章 | 0 条漂移（44） | 上期的 44 条已全部复核 |
| 准确性 | Claim 的来源能不能找到 | 2 条来源标题对不上任何文章（未统计） | 抽取时记错了出处，要复核 |
| 准确性 | Claim 之间有没有矛盾 | 1 处张力（1） | 同一处，是外部文档自身矛盾，已由实测裁决 |
| 缺失性 | 名词、层级、证据 | 48 个名词、10 页无上层（25）、119 条待验证（101） | 层级缺口减半；待验证增加，因为新 Claim 多是推论 |
| 引导性 | 页面有没有学习路径带着走 | 69 / 173 页不在路径上（79 / 169） | agent runtime 路径已建，剩下的是整类没有路径 |

### 1. 完备性：两篇新文章没有入库

- [AKS Agent Runtime 系列 14：让 PoC 能交给别人部署](../../Azure/Azure-Kubernetes-Service/AKS-Agent-Runtime系列14：让PoC能交给别人部署.md)：版本回退、入口三道处理与网络策略、平台登记现查、Helm 锁、配置三分类。里面至少有四条能进 wiki 的论断，最直接的落点是 [[reconciliation-loop]]（完整部署以 chart 为期望状态，手工改动会被覆盖）和 [[agent-runtime]]（会话型和常驻型 runtime 都需要一份按集群现查的平台登记）。
- [魏斯曼演讲大师课读书笔记](../../book/魏斯曼演讲大师课读书笔记：结构、开场与串联.md)：这是一个新领域（演讲与表达），wiki 里还没有任何相关的页。是否建页要先定：它和现有的技术知识图谱关联很弱，更适合放进学习路径之外的独立分类，或者只作为 skill 的来源，不进 wiki。

→ 动作：两篇**入队提取**。系列 14 按常规处理；读书笔记先请你决定是否进 wiki。

### 2. 准确性：没有漂移，张力已清零，但有两条出处记错

漂移缺口为 0，说明上周补抽之后，wiki 的结论和文章一致。脚本报出的唯一一处张力在 [[agent-platform]] 的 revision 那条 Claim：它记录的是**参考实现的文档自己前后不一**——一处说已有会话固定"配置和权限"，一处说权限每次请求实时算。Claim 已经按系列 04"撤销约 1 秒生效"的实测采纳了后者，所以这不是 wiki 内部的矛盾，而是外部来源本身矛盾、已由实测裁决。

→ 已处理：正文改写为"参考实现文档里，已有会话是否连权限一起固定，前后两处表述不一致（已裁决）"，并写明裁决依据是系列 04 的实测。改写后重跑脚本，张力缺口为 0。

另外，维度 1 的暗引用核对发现 [[method-agnostic]]、[[viseme]] 各有一条 Claim 的来源标题从来没有存在过（见第二节），这是本期唯一真正的准确性问题。

→ 动作：两条 Claim 交 `/revalidate` **复核**出处。

### 3. 缺失性 · 层级缺口：10 页，多数是散点

25 页降到 10 页。剩下的 [[terminal-multiplexer-for-ai]]、[[notion-as-ai-layer]]、[[global-workspace-llm]] 都是单篇文章引出的散点，暂不处理。

[[distributed-training-parallelism]] 和 [[global-secure-access]] 两页初稿里写成"补边即可"，核对后不成立，**它们缺的是上层页，不是边**：

- [[llm-serving]] 只讲推理服务，没有训练侧内容，把训练并行挂到它下面是错的层级。训练侧目前只有 [[slime-rl-framework]] 和决策页 [[rl-infra-framework-selection]]，没有"训练基础设施"这一层的伞形页。等 agent-lightning RL 实践继续写下去、训练侧页面再多两三页时，再建伞形页一起挂上。
- wiki 里和 Azure 网络、身份相关的只有 [[entra-agent-id]]（agent 身份），没有"企业网络访问"这一层。GSA 目前只由数字人网络问题那一篇文章支撑，暂按散点处理。

### 4. 缺失性 · 名词缺口：48 个，基本是产品名和泛词

前十名是 codex、aks、voice-live-api、kubernetes、azure-openai、connector、dataverse、work-iq、gsd、power-platform，都是产品名或泛词，按惯例只作证据。值得看的只有两个：

- `kata-containers`（6 篇）、`opensandbox`（5 篇）：初稿建议补成 [[agent-sandbox]] 的别名，核对后撤回。两者都是**产品**（一个是 VM 级容器运行时，一个是沙箱调度系统），agent-sandbox 是概念，把产品名写成概念的别名会让搜索和图谱把三者当成同一个东西。它们在 agent-sandbox 里已经被提到 35 处，作为证据已经足够，按惯例不建页、不补别名；
- `rust`（6 篇）：上期 HOLD 的 rust-ownership 仍未达到建页门槛，维持。

### 5. 缺失性 · 验证缺口：119 条

比上期多了 18 条，原因是这周新增的 Claim 大多是"推论"类（比如刚补的 agent-lightning 与 rllm 收敛对比，0.3）。最集中的几页是 [[agent-lightning]]、[[agent-platform]]、[[recursive-self-improvement]]，各 4 条。能用一次实验改结论的：

| 实验 | 改哪条 | 当前 → 预期 |
|---|---|---|
| 在 calc_x 上用同一 reward 对比 agent-lightning 与 rllm 的收敛曲线 | [[rl-infra-framework-selection]] 的收敛稳定性 Claim | 0.3 → 0.7 |
| 用现在的常驻实现和会话实现各跑一次"常驻入口加会话执行池"的最小原型 | [[resident-vs-session-agent-runtime]] 两种形态会合的 Claim | 0.55 → 0.75 |
| 在 AKS 上部署一次 Agent Substrate | [[actor-snapshot-scheduling]] 与 [[agent-sandbox]] 的粒度光谱 Claim | 维持 → 补实测 |

### 6. 引导性：69 页没有入口

最活跃的 agent runtime 领域上周已经有了路径，本期 69 页里大头是**整类没有路径**：工程质量与测试（6/6）、Vibe Coding（5/5）、具身智能（6/6）、AI FinOps（2/2）。其中具身智能 6 页、36 条 Claim，体量已经够一条短路径。

→ 动作：用 `/learning-path` **建路径**，先建具身智能（世界模型 → VLA → action chunking → diffusion）。

### 7. 答不上的问题

本期最活跃的两个领域，各问三个问题，用 wiki 内容作答：

**Agent runtime 的部署与交接**

1. 为什么手工 `kubectl set image` 换上去的镜像，下一次部署会被换回？——[[reconciliation-loop]] 能解释"期望状态覆盖现实状态"的原理，但没有 Helm 和 chart 版本这一层的论断。**部分能答**。
2. 什么时候平台配置应该从集群现查，而不是写进配置文件？——wiki 里没有。**答不上**，素材在系列 14 第五节。
3. 什么时候不该在 LiteLLM 控制台里改配置？——[[ai-gateway]] 有完整答案。**能答**。

**演讲与表达**

1. 为什么要先选叙述结构，再往石柱里填材料？——**答不上**，wiki 没有这个领域。
2. 什么时候不该用数字榜单式的结构？——**答不上**。
3. 讲技术演进时，历时型结构比问题-解决型好在哪里？——**答不上**。

第二组三题都答不上，是因为这个领域本来就不在 wiki 里，这不一定是缺口：要看你是否希望 wiki 覆盖非技术领域（见第 1 节）。

### 上期建议的落实情况

上期 6 条建议，落实了 4 条：

- **漂移复核**：44 条全部复核，Agent Substrate 的"pre-1.0"已改为 1.0 GA。
- **31 篇漏抽补抽**：完成，覆盖缺口从 31 降到 2。
- **agent runtime 路径**：已建，并在 11-18 刷新到 13 站 54 题。
- **补别名、补边、建 MCP 页**：MCP 页和协议栈伞形页已建，层级缺口从 25 降到 10。

另外两条没有动：
- **读委托与授权三篇论文**：A2ABreak、Authorization Propagation、AuthorizationBench；
- **做实验清单**：在 AKS 上部署 Agent Substrate、两跳网关。

## 二、内省总览（维度 1-3）

**规模**：139 概念 / 22 方法 / 12 决策，1024 条 Claim（上期 136 / 22 / 11，981 条）。

### 覆盖广度（维度 1）

**与上期对比**：新增 4 页、删除 0 页。概念页 [[model-context-protocol]]、[[agent-protocol-stack]]（11-16 10:01）、[[llm-serving]]（11-16 10:42）都是在上期报告（11-16 09:27）之后、按上期建议建的；决策页 [[resident-vs-session-agent-runtime]] 来自 AKS 系列 13。方法页没有变化，仍是 22 页。

**各分类的 Claim 密度与方法覆盖**：index 把方法页按"方法类型"单独分类（工作流、决策框架、分层策略等），不归到领域下面，所以按 index 统计，每个领域分类的方法页数都是 0。这个数字本身没有意义，下表改用"领域里有多少概念页链到了方法页"来衡量知其然是否也知其所以然：

| 分类 | 概念页 | Claims | Claim/页 | 链到方法页 | 单来源页 | 低置信 Claim |
|---|---|---|---|---|---|---|
| AI Agent 理论与架构 | 51 | 359 | 7.0 | 9 | 14 | 2 |
| LLM 推理与训练 | 17 | 112 | 6.6 | 8 | 4 | 1 |
| 语音与实时交互 | 15 | 116 | 7.7 | 6 | 2 | 0 |
| 知识管理与工具 | 11 | 64 | 5.8 | 1 | 1 | 4 |
| Context 与工具集成 | 9 | 44 | 4.9 | 1 | 2 | 0 |
| Azure 与云平台 | 8 | 65 | 8.1 | 1 | 0 | 1 |
| 工程质量与测试 | 6 | 21 | 3.5 | **0** | 4 | 4 |
| 具身智能 | 6 | 36 | 6.0 | **0** | 0 | 0 |
| Claude Code 与扩展生态 | 6 | 25 | 4.2 | **0** | 1 | 2 |
| Vibe Coding 框架与工作流 | 5 | 23 | 4.6 | **0** | 1 | 0 |

- **没有任何方法支撑的领域**：工程质量与测试、具身智能、Claude Code 与扩展生态、Vibe Coding，另有本体论（2 页）和 AI 硬件（1 页）两个小类。前三个都写过不少实践文章，方法其实存在，只是没有被抽成方法页；具身智能是纯学习类内容，没有方法页是正常的。
- **AI Agent 理论与架构** 51 页只有 9 页链到方法，比例最低（18%），也是单来源页最多的分类（14 页）。这个分类体量大、增长快，Claim 多是机制描述。

**暗引用**（概念页里写了 `[[...]]` 但按文件名找不到目标）：脚本报出 6 处，逐个核对后，3 处是统计口径的误报，1 处是外部文档，**2 处是真问题**：

- 误报：[[model-routing]] 里 3 处指向 `Notes/tool/codex/jev-router/README`，文件存在，是带路径的写法，脚本只按文件名比对；`ADR-007` 和 `wikilinks` 在正文的反引号里，是举例用的字面量，不是链接。
- 外部文档：[[voice-live-agent]] 引用的 Azure Speech 配额文档，属于外部来源，写成 wikilink 不合适，改成外部链接即可。
- **来源标题对不上任何文章**：[[method-agnostic]] 一条 Claim 的来源写成"Agent Lightning 系列 03：推理与训练的分野——VERL 架构拆解"，[[viseme]] 一条 Claim 的来源写成"Blender 系列 04：口型同步实战——从音量包络到 viseme 的渐进式改造与三维口型架构"。查 git 历史，这两个标题**从来没有存在过**，不是 10-14 精简标题时漏改的旧名（两篇文章当时的原标题和这里写的都不一样）。也就是说，抽取时记下的来源标题本身就不准，这两条 Claim 的出处需要重新找到并核对内容。

→ 动作：两条 Claim 交 `/revalidate` **复核**出处（找到真实来源文章，核对 Claim 是否仍成立）；外部文档那处改成外部链接。

### 认知深度（维度 2）

- **低置信度 Claim（≤ 0.5）19 条**，集中在 [[testcontainers]]、[[llm-wiki]]、[[skill-hub-ecosystem]]、[[three-layer-token-optimization]]（各 2 条），其余分散在 11 页各 1 条。按分类看，工程质量与测试和知识管理与工具各 4 条，是低置信度最集中的两类；
- **单来源页 37 个**，AI Agent 理论与架构占 14 个，工程质量与测试 6 页里有 4 页单来源；
- **孤立页 2 个**：[[terminal-multiplexer-for-ai]]、[[intelligent-dictation]]；
- **只有概念没有方法的领域**：见上表加粗的四类。

**成熟度**：按 Claim 数加权的平均成熟度 2.40 / 3.0（🌳 成熟）。

- 分布：精通 65 页、成熟 76 页、成长 32 页、萌芽 0 页。
- 上期是 2.48。计算脚本是这期重写的，各维度计分口径与上期大体相同，但来源数统计更严（只数"来源"区的条目），所以 0.08 的下降**不能直接读成退步**。

| 分类 | 页数 | Claims | 成熟度 |
|---|---|---|---|
| Azure 与云平台 | 8 | 65 | 2.57 |
| AI Agent 理论与架构 | 51 | 359 | 2.50 |
| LLM 推理与训练 | 17 | 112 | 2.40 |
| 语音与实时交互 | 15 | 116 | 2.40 |
| Context 与工具集成 | 9 | 44 | 2.34 |
| Claude Code 与扩展生态 | 6 | 25 | 2.14 |
| 工程质量与测试 | 6 | 21 | **1.72** |
| Quality Gate（质量门禁） | 2 | 4 | **1.65** |

最成熟的是 Azure 与云平台（2.57），最薄弱的是质量门禁与工程质量（1.65、1.72），这两类也是"整类没有学习路径"的那几类，Claim 少、来源单一、几乎没有实践记录。

## 三、GitHub 趋势对标（维度 4）

按 star velocity（⭐/天）排序，剔除游戏模拟器、系统工具这类和你的领域无关的仓库：

| 趋势主题 | 代表仓库 | Stars | Velocity | 创建 | 信号 | wiki | 建议 |
|---|---|---|---|---|---|---|---|
| 让 coding agent 少写代码 | DietrichGebert/ponytail | 197k | 1203 | 06-12 | C | ❌ | 观望 |
| DeepSeek Harness 生态 | dsh-Go、dsh-our-free-model | 31k / 85k | 1052 / 1410 | 10-25 / 09-24 | A C | 🔶 | 补充 |
| 一个入口切换各家 agent 的模型 | yetone/magpie | 40k | 661 | 09-23 | A C | 🔶 | 补充 |
| 个人常驻 agent | NousResearch/hermes-agent、simplexai-labs/linger | 266k / 4k | 543 / 313 | — / 11-10 | C | ✅ | 无 |
| 安全审计做成 skill | cloudflare/security-audit-skill | 77k | 489 | 06-18 | C | ❌ | 观望 |
| 开源 coding agent | anomalyco/opencode | 229k | 400 | 2025-04 | C | ✅ | 无 |
| 机构发布自己的 agent skills | janestreet/agent_skills | 11k | 552 | 11-03 | A | 🔶 | 观望 |
| 设计和评审都交给 agent | google/elephant-goldfish-model | 22k | 314 | 09-13 | C | ❌ | 观望 |
| Agent 专用浏览器 | lexmount/moli、citrolabs/ego-lite | 24k / 24k | 232 / 109 | 08-10 / 04-16 | C | 🔶 | 观望 |
| Agent 记忆 | vectorize-io/hindsight、OpenViking | 63k / 43k | 161 / 132 | — | C | ✅ | 无 |
| 安全运行时 | ai-openshell/openshell | 22k | 80 | 02-24 | C | 🔶 | 补充 |

**周榜补充（信号 B）**：YourAIProject 的 GitHub Trending 周档案（第 44~46 周）和 workollab 11-18 的榜单。A、C 两路按"创建以来平均增速"排，看不到老仓库最近突然变火，周榜能补上：

| 趋势主题 | 代表仓库 | 本周增量 | wiki | 建议 |
|---|---|---|---|---|
| 设计品味类 skill（反 AI 味的 UI 与文字） | Nutlope/hallmark、pbakaus/impeccable、Leonxlnx/taste-skill、blader/humanizer | +12.1k、+12k、+5k、+3.1k | ❌ | 观望 |
| 官方与大厂 skill 库 | anthropics/skills、addyosmani/agent-skills | 每周 +2.4k~6.2k | ✅ | 无 |
| 跨 harness 的优化套件 | affaan-m/ECC | +6.4k | ❌ | 观望 |
| 多 agent 并行的工作区 | max-sixty/worktrunk（git worktree 管理）、backnotprop/plannotator | +2.3k、+2.9k | 🔶 | 观望 |
| Agent 浏览器 | vercel-labs/agent-browser | +4.6k | 🔶 | 观望 |
| 给 agent 喂最新的 web 实践 | GoogleChrome/modern-web-guidance-src | +7k | ❌ | 观望 |

**月榜（信号 B）**：GitHub Trending 月视图（11-12 的一份整理）里月增量最大的五个：VoiceStudio（本地声音克隆，+50.6k）、security-audit-skill（+42.1k）、stablyai/orca（多个 coding agent 并排跑，+33.3k）、t3code（一个应用调度多家 coding agent，+29.8k）、impeccable（+28.9k）。五个里四个直接挂在 agent 上。

**分领域检索（信号 B）**：按核心领域各做一次 trending 检索，补充 A、C 两路没有覆盖到的：

- **AI Agent**：AG-UI 协议到了 1.0，冻结了基于 JSON Schema 的规范（约 19k⭐）；它要解决的是 agent 不适合请求-响应模式（流式 token、调用中途暂停等人、派生子 agent），这和 [[agent-protocol-stack]] 里"agent 到前端"那一层对应，wiki 里还没有这一层的协议实例。NVIDIA 的 skill 评测框架（约 3.5k⭐）把 skill 上线前的检查分成三级：安全与结构扫描、语义重叠检测、在沙箱 agent 里实跑看行为变化。
- **Voice AI**：微软 VibeVoice（多说话人长音频，约 57k⭐）；自托管电话 agent 一批（Vapi 兼容 API、Asterisk/FreeSWITCH + 实时模型），本地全双工语音助手开始把多个端到端引擎做成可切换选项。和 [[cascaded-vs-e2e-voice]] 相关，但都是应用层，没有新的架构结论。
- **MCP 与 Claude 生态**：Google Stitch 设计转代码的 skill 库通过 MCP 服务器调用设计稿；腾讯 LoopForge 用自托管 SOP 编排 10 个 coding agent CLI，带 Docker 沙箱、人工审批和断点续跑。一则"MCP 2.0 双向工具调用"的新闻只出现在一个聚合站，没有找到官方来源，**未核实，不采用**。
- **LLM 推理**：Rust 推理栈（mistral.rs、Candle、Rig）有一波周榜，但原文也说多数项目在 1.0 之前、没有可核对的基准；NVIDIA Dynamo 继续加 KV cache 存储合作。和 [[llm-serving]] 相关，暂无要改的结论。
- **Vibe Coding**：t3code 月增 109%，增长部分来自作者在社交媒体上号召点 star，**星数作为热度信号要打折扣**；plannotator（在计划上批注、一键把反馈发给 agent）约 10k⭐。
- **RAG**（已降级，只看是否有反转信号）：排前面的是 agent 记忆类项目（claude-mem、mem0、MemPalace），检索框架本身没有新动向，维持降级。

周榜上排前面的几乎都是 skill，而且是"让 agent 做得更有品味"这一类，和 A、C 两路看到的"安全审计做成 skill"是同一个方向：skill 已经从工具封装扩展到审美和判断。

几点判断：

- **dsh 生态继续是增长最快的 agent 方向**，而且出现了"装进手机""免 key 用多家模型"这类周边，和上期的 harness 解耦主题一致；wiki 里 dsh 已被 10 页提到，补一条生态现状的 Claim 即可。
- **一个入口切换各家模型**（magpie 让 Codex 跑 DeepSeek、Claude Code 跑 Kimi）是 [[model-routing]] 的新形态：路由不在网关，而在桌面端。
- 上期的"skill 层成为主要形态"仍成立：Jane Street、Cloudflare 都在发 skill，且增速很高。
- **OpenShell 在追踪任务里挂了很久**，现在 22k⭐，velocity 80，已是成熟项目，可以考虑按计划实测一次。

## 四、arXiv 前沿对标（维度 5）

| 论文 | 时间 | 核心贡献 | wiki | 相关性 | 建议 |
|---|---|---|---|---|---|
| CompAct-Bench（2611.25673） | 11 月 | 200 个任务、12 个模型专测压缩后能否继续做对：整体仍明显有损；搜索类在后期越压越差，编码类反而变好，因为进度已经落在代码仓库里；压缩不只会漏信息，还会改变信息的含义 | 🔶 | 高 | 补 Claim |
| Forget Freely, Grep Later（2611.25123） | 11 月 | 压缩照做，另存一份只追加的完整日志，需要细节时 grep 回来；ContextBench 上准确率 95~97%，纯摘要和观察遮蔽最多 21%；token 比摘要基线多 6%~19%，但 AMA-Bench stream 上是 2.3 倍（补 Claim 时复核全文发现，初稿漏了这个例外） | 🔶 | 高 | 补 Claim |
| You don't need long context（2611.05306） | 11 月 | 后面的 token 比前面贵（开源前沿模型上最多 7 倍）；频繁压缩、保持短上下文，任务精度几乎不掉 | 🔶 | 高 | 补 Claim |
| Claw-SWE-Bench（2606.12344） | 6 月 | 7 种通用 harness × 3 个模型、350 个任务、跑三遍取平均：模型固定时成功率和 token 消耗都随 harness 大幅变化，评测应把 harness 当受控变量 | ❌ | 高 | 补 Claim |
| Great Listeners, Poor Decision-Makers（2611.23847） | 11 月 | 立场文章：语音 agent 的瓶颈已从识别转到决策，提出在感知和推理之外单设一层决策（动、等、问、不出声），依据是否在对我说、说话人是谁、内容置信度、动作风险。文中引用的数字（客服任务文本 agent 85%、全双工 31~51%，失败 79~90% 归因于 agent 行为）来自 τ-Voice | ❌ | 高 | 补 Claim |
| WorkflowArena（2611.12856） | 11 月 | 让模型自己编排子 agent 的能力单独测；Claude Code 委派次数少但每次组更多 worker，Codex 委派更频繁（仅摘要） | 🔶 | 中 | 了解 |
| Log-To-Leak（2610.36108） | 10 月 | 恶意 MCP 服务器在工具描述里埋指令，让 agent 做完正常任务后再调用一个"保存日志"工具，把查询和其他服务器的响应交出去。18 组模型 × 服务器上攻击成功率 62.64%~100%，16 组的正常任务完成率变化不超过 6.63 个百分点，也就是**任务照样做完、用户察觉不到**。三种防御（提示夹心、LLM 元数据检查、IPIGuard）在 GitHub MCP + GPT-4o 上残余成功率仍在 55% 以上；指令检测器把 85.53% 的正常工具描述也判成可疑。作者的结论是靠内容过滤防不住，次级工具调用要由宿主做授权 | 🔶 | 中 | 补 Claim |
| The Devil Wears Markdown（2611.10830） | 11 月 | 在 80 个恶意、60 个正常 skill 的测试集上比较扫描器：YARA 和 Cisco Skill Scanner 召回 0.91，但 60 个正常 skill 里分别误报 49 个和 33 个；Cisco 加 LLM 分析后召回 0.85、误报 40 个。作者的静态 + 动态 + agent 三段式流水线召回同为 0.85，误报降到 5 个（F1 0.89）。说明**单靠规则或单靠 LLM 都会大量误报**，要组合执行期的行为证据 | 🔶 | 中 | 补 Claim |
| CARE-PO（2611.12125） | 11 月 | agent 轨迹里大多有可删掉的工具调用，提出可控的调用效率训练（仅摘要） | ❌ | 中 | 观望 |
| AgentDecept（2610.39377） | 10 月 | 在压力场景下测 agent 是否如实报告自己做了什么（仅摘要） | ❌ | 中 | 观望 |

上下文压缩这一组最值得看。三篇的结论表面上相反：一篇说频繁压缩几乎不掉精度，一篇说压缩明显有损。读全文后能对上：**损失取决于任务状态存在哪里**。进度已经写进外部环境（代码仓库、文件）的任务，压缩丢掉的是历史而不是状态，所以几乎无损；状态只在上下文里的任务（搜索、核对细节），压缩就会丢、甚至改写信息。第三篇给出的折中是压缩照做、另存只追加的完整日志、按需 grep。这正好回答了上期报告里"频繁压缩与保留原始轨迹结论相反"的张力，[[context-engineering]] 里关于压缩的 Claim 可以据此补适用条件。

安全这两篇放在一起看，结论一致：**MCP 工具描述和 SKILL.md 都是"被 agent 当指令读"的文本，内容层面的过滤要么漏、要么误报太多**。Log-To-Leak 给的方向是宿主侧授权次级调用，Devil Wears Markdown 给的方向是加上执行期的行为证据。这和 wiki 里 [[agent-sandbox]]、[[ai-gateway]] 把权限放在 agent 之外的思路是同一件事，可以作为外部证据补进 [[model-context-protocol]] 和 [[skill-pattern]] 的安全边界。

语音那篇是立场文章，最有用的是它提出的"单设一层决策"的架构；文中的失败率数字引自追踪任务里挂着的 τ-Voice 论文，要核对原始数字应去读 τ-Voice。

## 五、HuggingFace 模型近期动向（维度 6）

近 60 天新模型 137 个，按 likes/天 排序：

| # | 模型 | Velocity | 创建 | 要点 | 重要性 |
|---|---|---|---|---|---|
| 1 | thinkingmachines/Inkling-2-Mini | 872 | 11-17 | 26.4B 参数、3.4B 激活的循环层 transformer，循环层每 token 跑三遍，等效激活 5.4B；单个约 20GB 的 NVFP4/MXFP8 混合精度 checkpoint，32GB 内存的 Apple silicon 能跑，Apache 2.0 | 🔴 |
| 2 | xtools-at/DeepSeek-V4-Pro-Qwen3.5-9B（蒸馏） | 277 | 10-30 | 把 DeepSeek V4 Pro 蒸馏到 9B | 🟡 |
| 3 | deepseek-ai/DeepSeek-V4.1-Flash-1017 | 178 | 10-17 | DeepSeek 新一代 Flash，多模态 | 🟡 |
| 4 | harness-hub/Qwen3.8-27B-pi-adapted | 144 | 11-16 | 用强化学习针对 pi harness 训的 LoRA。模型卡数字（都在 pi harness 下、单次尝试）：关掉思考时 Terminal-Bench 2.1 从 39.5% 到 55.8%，追平基座最高推理强度；SWE-bench Pro 难题集从 39.2% 到 64.7%，生成 token 约少 4.5 倍 | 🟡 |
| 5 | moonshotai/Kimi-K3.1-Pro | 116 | 11-02 | Kimi 新版，多模态 | 🟡 |
| 6 | sensenova/SenseNova-Loop-9B | 100 | 11-17 | 另一个循环层模型 | 🟢 |
| 7 | higurashi-ai/Haru-4B | 83 | 11-12 | 音频到音频的小模型（上期已报） | 🟢 |
| 8 | Edge0/Edge0-145B-NVFP4 | 66 | 11-11 | NVFP4 量化发布 | 🟢 |
| 9 | nvidia/Nemotron-3.5-Transcribe-30B-A4B | 52 | 10-07 | MoE 结构的转写模型 | 🟡 |
| 10 | Zyphra/ZONOS3-Mini | 46 | 11-09 | 小型 TTS | 🟢 |

值得关注的新趋势，按重要性：

1. **循环层（looped）模型**：Inkling-2-Mini 和 SenseNova-Loop 同周出现，用"同一组层多跑几遍"换参数量，小模型也能做 agent 任务。这是架构层面的新信号，wiki 里没有。
2. **为特定 harness 适配模型**：harness-hub 直接发布"针对某个 harness 调过"的模型，和 arXiv 上 Claw-SWE-Bench 的结论互相印证——模型和 harness 正在成对出现。要注意它的数字全部是在同一个 harness 下测的，换 harness 是否还有收益，模型卡没有给。
3. **NVFP4 成为发布格式**：Inkling-2-Small（594B 总参、17B 激活）的模型卡写明预训练、中训和后训练都在 NVFP4 下完成，主 checkpoint 就是 NVFP4，MXFP8 版只在评测上高 1~2 个点；Edge0 也直接发 NVFP4。上期是观望项，现在已进入主流发布。

### 领域模型扫描（信号 E）

按 5 个 pipeline_tag 和 6 个关键词，likes、downloads 两种排序各取 40 个，后过滤近 90 天创建的，按 likes/天排序。L/D 是 likes 与 downloads 之比：高说明是前沿关注，低说明是生产在用。

| 领域 | 近 90 天头部 | L/D | 框架 | 说明 |
|---|---|---|---|---|
| LLM | DeepSeek-V4-Pro → Qwen3.5-9B 蒸馏（去审查版） | 0.15 | transformers | 关注远高于使用 |
| LLM | Ternary-Bonsai-2-27B（三值权重） | 0.002 | llama.cpp | 130 万下载，已经在本地大量使用 |
| ASR | NVIDIA Nemotron-3.5-Transcribe-30B-A4B | 0.026 | nemo | MoE 转写模型，近 90 天 ASR 头部 |
| TTS | Zyphra ZONOS3-Mini、fishaudio drama-3 | 0.004、0.031 | 自有库 | 都带 arXiv 论文；drama-3 的 GGUF 版下载 62 万，TTS 也开始走 llama.cpp 路线 |
| 代码 | Qwen3.5-4B-GLB-3D-Coder | 0.006 | — | 代码类近 90 天没有大模型新发布，头部是社区微调和 GGUF 转换 |
| 多模态 | Inkling-2-Mini、DeepSeek-V4.1-Flash-1017、Kimi-K3.1-Pro | 0.01~0.13 | transformers | 新一代基座都是多模态 |
| 蒸馏 | MiMo-V2.6-Distill-Qwen-9B、Qwen3.8-35B-A3B-Distill | 0.018、0.0002 | transformers、gguf | 大模型蒸到 9B 和 35B-A3B 两档 |
| GGUF | unsloth/Inkling-2-Mini-GGUF | 0.0008 | — | 发布 3 天下载 129 万，新模型当周就有 GGUF |
| GGUF | Qwen3.8-27B-GSQ-RCO-GGUF | 0.002 | gguf | 带 arXiv 2604.18556，新的低比特量化方法已进入社区发布 |
| Agent | agentionai/Qwen3.8-Flash-Next-Gyro-GGUF | 0.0001 | gguf | 名字带 agent 的多是社区微调，236 万下载，几乎没有关注 |
| 函数调用 | 近 90 天只有 3 个，最高 5 likes | — | — | "function-calling 专用小模型"这个方向已经没人做了，基座自带 |

三点判断：

- **GGUF 和 llama.cpp 成了默认的第二发布渠道**：新基座发布当周就有 GGUF，TTS 模型也开始出 GGUF，下载量往往比原版高一个数量级。
- **函数调用专用模型没有新发布**，近 90 天只有 3 个，说明工具调用已经是基座能力，不再单独训练。wiki 里没有"专门微调函数调用"的论断，这一条只作为背景。
- **名字里带 agent 的 HF 模型几乎都是社区微调**，关注度很低。agent 能力的进展主要体现在 harness 适配（pi-adapted）和基座本身，不在"agent 专用模型"上。

### 技术方法动态（信号 F）

5 次 Tavily 检索（HF 博客微调、蒸馏与量化、热门模型、PEFT、量化格式）的要点：

- **量化格式**：llama.cpp 11-04 的版本在 GGUF 里加了 MXFP4、NVFP4、FP8 E4M3；MACaQ 做 MXFP4 的 W4A4 训练后量化，开销 2.3%；unsloth 给出的 NVFP4 版 Qwen3.6-27B 基准接近 BF16。**4 比特浮点格式在新发布里越来越常见**，AWQ 这类整数量化仍有人做（如 SenseNova-Loop-9B-AWQ），但官方发布开始直接给 NVFP4。
- **蒸馏**：11-13 热门第一是 DeepSeek-V4-Pro 蒸到 Qwen3.5 9B；大模型 → 9B 是最常见的一档。
- **微调**：LoRA 仍是主流，新的变化是**用强化学习训 LoRA 去适配某个 harness**（pi-adapted），而不是用 SFT 适配某个任务。
- **架构**：循环层（Inkling-2-Mini、SenseNova-Loop-9B）是本期新出现的方向；Inkling-2-Small 模型卡的对比表里，同档开源模型（DeepSeek-V4.1-Flash 16B/552B、Kimi K3 104B/2800B 等）全部是激活参数远小于总参数的 MoE。

## 六、近期趋势综合（维度 7，按重要性）

1. 🔴 **上下文压缩有了专门的评测**（arXiv 三篇）：损失取决于任务状态存在哪里，状态在外部环境里时几乎无损，只在上下文里时会丢甚至改写；折中方案是"压缩 + 只追加的完整日志 + 按需检索"。→ 在 [[context-engineering]] 补适用条件。
2. 🟡 **模型与 harness 成对**（arXiv + GitHub + HF 多源）：评测把 harness 当变量，模型开始针对 harness 适配，桌面端出现跨模型切换工具。→ 在 [[model-harness-codesign]] 补一条。
3. 🟡 **Skill 与 MCP 成为提示注入的新入口**（arXiv + GitHub）：恶意 MCP 工具描述、SKILL.md 里藏指令；与此同时大机构都在发 skill。→ 在 [[skill-pattern]] 或 [[model-context-protocol]] 补安全边界。
4. 🟡 **语音 agent 的瓶颈从识别转到决策**（arXiv）：立场文章提出单设一层决策，数字引自 τ-Voice。→ 补进 [[cascaded-vs-e2e-voice]]，τ-Voice 原文仍按追踪任务去读。
5. 🟡 **模型自己编排子 agent 被单独评测**（arXiv）。→ 了解概况。
6. 🟢 Agent 欺骗与压力测试（arXiv）、设计品味类 skill 与 dsh 生态（GitHub 周榜与新锐）、循环层小模型（HF）：观望。

## 七、学习建议

先内部、后外部：

1. **准确性：两条出处记错的 Claim 复核**（内部 2）：[[method-agnostic]]、[[viseme]] 各一条，找到真实来源后核对内容；张力那条已改写，脚本不再报出。
2. **完备性：两篇新文入队**（内部 1）：系列 14 下次 `/extract-knowledge` 一起处理；读书笔记要不要进 wiki，请你先定。
3. **引导性：建具身智能学习路径**（内部 6），6 页 36 条 Claim，体量够了。
4. **缺失性：两页缺的是上层页，暂不建**（内部 3、4）：初稿写的"补两条边、两个别名"核对后撤回。`distributed-training-parallelism`、`global-secure-access` 在 wiki 里都没有合适的上层页，挂到 [[llm-serving]] 下面层级不对，等训练侧和企业网络侧的页面多起来再建伞形页；`kata-containers`、`opensandbox` 是产品，不应作为 [[agent-sandbox]] 这个概念的别名。
5. **链接维护**（内部维度 1）：Azure Speech 配额文档那处 wikilink 改成外部链接。
6. **外部：上下文压缩三篇**（趋势 1）补进 [[context-engineering]] 的适用条件；**语音决策那篇**补进 [[cascaded-vs-e2e-voice]]，τ-Voice 原文仍按追踪任务去读；**安全两篇**（Log-To-Leak、Devil Wears Markdown）补进 [[model-context-protocol]]、[[skill-pattern]] 的安全边界。这几篇都已读过全文。
7. **实验**：上期的 Substrate 和两跳网关两项还没做；本期加一项 agent-lightning 与 rllm 的对照实跑。

### 当天落实情况

- **复核**：[[method-agnostic]] 一条修订（来源更正为 Agent-Lightning 系列 07），[[viseme]] 一条降级 0.7 → 0.6（"实证"改"方案"）；Azure Speech 配额文档改为外部链接。
- **入队提取**：系列 14 注入 5 页 7 条 Claim；读书笔记按建议不进 wiki，登记覆盖豁免与 HOLD。
- **建路径**：新建 [[embodied-intelligence]]，9 站 + 前沿站、36 题；`topics.yml` 新增 `embodied-ai`，下一期开始追踪外部信号。
- **外部 Claim**：[[context-engineering]] +2、[[cascaded-vs-e2e-voice]] +1、[[model-context-protocol]] +1、[[skill-pattern]] +1、[[model-harness-codesign]] +1，写入前重新打开全文核对数字。Claw-SWE-Bench 有 v1、v2 两版，本报告与 Claim 依据 v2（7 个 harness × 3 个模型、三次平均），v1 是 5 × 2、单次运行。
- **未做**：三项实验需要 AKS 与 GPU 环境，本次没有做；τ-Voice 原文仍在追踪任务里。

## 附：采集执行记录

- **内省**：`wiki/scripts/structural-gaps.py` 七节输出；统计与成熟度用临时脚本重新计算（上期脚本已不在，口径见第二节说明）；暗引用 6 处逐个查文件与 git 历史确认原因；新增页与上期报告的先后用 git 提交时间核对。
- **GitHub 信号 A、C**：gh api 90 天 / 30 天新锐，加 12 个关键词 × 半年新锐 / 近 7 天活跃，共 155 个仓库，按 trend_score 与 velocity 排序。
- **GitHub 信号 B**：Tavily 检索 GitHub Trending 周档案（第 44~46 周）、11-18 榜单、11-12 月视图整理，以及 AI Agent、Voice AI、MCP 与 Claude、LLM 推理、Vibe Coding、RAG 六个领域各一次。`site:ossinsight.io OR site:star-history.com` 那次检索只返回一个无关仓库页，**没有拿到 star 增长排行**，用上面的周档案和月视图代替。
- **arXiv**：Tavily `include_domains=arxiv.org` + `time_range=month`，6 个领域各 1 次。列为"补 Claim"的七篇（CompAct-Bench、GrepMem、You don't need long context、Claw-SWE-Bench、Great Listeners、Log-To-Leak、Devil Wears Markdown）都用 tavily_extract 打开全文核对；WorkflowArena、CARE-PO、AgentDecept 只读了摘要，表中已标"仅摘要"，建议动作只到"了解 / 观望"。
- **HuggingFace 信号 D**：API 按 likes、downloads、trendingScore 排序，后过滤近 60 天创建（137 个）。
- **HuggingFace 信号 E**：5 个 pipeline_tag + 6 个关键词，likes、downloads 两种排序各取 40 个，后过滤近 90 天，记录 L/D、library_name、arXiv 标签。
- **HuggingFace 信号 F**：5 次 Tavily 检索（HF 博客微调、蒸馏与量化、热门模型、PEFT、量化格式）。
- **核对**：Inkling-2-Mini、Inkling-2-Small、pi-adapted 的参数、精度和基准数字都来自官方模型卡原文。

### 交付前自检

| 步骤 | 状态 |
|---|---|
| 1 获取日期 | 已做 |
| 2 读取 wiki 现状与上期基线 | 已做 |
| 3 GitHub 信号 A / B / C | 已做；B 的 ossinsight 检索失败，已说明替代方式 |
| 3 arXiv 6 个领域 + 全文核对 | 已做；三篇仅摘要，已标注、未据以下结论 |
| 3 HuggingFace 信号 D / E / F | 已做 |
| 4 维度 1 覆盖广度（分类密度、零方法、暗引用、与上期对比） | 已做 |
| 4 维度 2 认知深度（单来源、低置信分布、孤立页、只有概念的领域） | 已做 |
| 4 维度 3 成熟度 | 已做；计分脚本重写，口径差异已说明 |
| 4 维度 4~7 外部对标与综合 | 已做 |
| 4 维度 8 内部四个角度 + 答不上的问题 | 已做 |
| 5 报告与 trends 校验 | 已做，校验通过后提交 |
| 6 日记摘要 | 已做，按补全后的结论更新 |
