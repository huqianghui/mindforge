---
title: 知识差距分析报告 2026-11-16
created: 2026-11-16
tags:
  - knowledge-gap
  - wiki-maintenance
stats:
  concepts: 136
  methods: 22
  decisions: 11
  claims: 981
  maturity: 2.48
github_trending_date: 2026-11-16
arxiv_query_date: 2026-11-16
huggingface_query_date: 2026-11-16
baseline: 2026-10-25-gap-analysis
trends:
  - topic: wiki-health
    title: 'AKS 系列大改后 44 条 Claim 未复核，最活跃领域没有学习路径'
    priority: high
    action: claim
    signals: [introspection]
    nodes: [agent-session-control-plane, agent-sandbox, agent-runtime]
  - topic: agent-runtime
    title: 'Agent runtime 开始标准化，Substrate 1.0 与 kagent 1.0 同周发布'
    priority: high
    action: claim
    signals: [github, arxiv, introspection]
    nodes: [agent-runtime, actor-snapshot-scheduling, agent-sandbox]
  - topic: agent-authorization
    title: 'Agent 委托与越权成为独立研究方向'
    priority: high
    action: deep
    signals: [arxiv, github, introspection]
    nodes: [relationship-based-access-control, a2a-protocol, ai-gateway, entra-agent-id]
  - topic: mcp
    title: 'MCP 被 31 篇文章使用却没有概念页'
    priority: high
    action: page
    signals: [introspection]
    nodes: [mcp-vs-cli, ai-gateway, a2a-protocol]
  - topic: model-harness-decoupling
    title: 'Harness 评测转向模型与 harness 的配对'
    priority: medium
    action: claim
    signals: [arxiv]
    nodes: [model-harness-codesign, agent-harness]
  - topic: voice-agent
    title: '开源全双工语音模型密集发布，交互评测拆开时机与答题'
    priority: medium
    action: claim
    signals: [hf, arxiv]
    nodes: [cascaded-vs-e2e-voice, turn-taking]
  - topic: context-engineering
    title: '频繁压缩上下文与保留原始轨迹的结论相反'
    priority: medium
    action: overview
    signals: [arxiv]
    nodes: [context-engineering]
  - topic: agent-eval
    title: 'Coding agent 评测加入执行中途的环境变化'
    priority: medium
    action: overview
    signals: [arxiv]
  - topic: agent-tooling
    title: 'Skill 层成为 GitHub 新仓库的主要形态'
    priority: low
    action: watch
    signals: [github]
    nodes: [skill-pattern]
  - topic: local-inference
    title: 'NVFP4 从权重扩展到 KV cache'
    priority: low
    action: watch
    signals: [hf, arxiv]
  - topic: industry-watch
    title: 'AI clean-room 软件克隆潮继续'
    priority: low
    action: watch
    signals: [github]
---

# 知识差距分析报告（2026-11-16）

> 基线对比：[[2026-10-25-gap-analysis]]（22 天前）。这期间 wiki 新增 19 个概念页、3 个决策页、175 条 Claim，几乎全部来自 AKS Agent Runtime 系列与今天的 agent 四概念拆分。本期第一次加入**维度 8：内部知识的完备性、准确性、缺失性与引导性**（`wiki/scripts/structural-gaps.py`），放在报告最前面——内部是否完整、准确、找得到，比外面流行什么更重要。

## 一、内部知识的完备性、准确性、缺失性与引导性（维度 8）

这一节只看 wiki 自己，和外面流行什么无关。它比外部趋势重要：外部信号只能告诉我"还有什么没学"，这里回答的是已经学了、写了的东西，**编译进来没有、还对不对、有没有漏掉骨架、找不找得到**。全部由 `wiki/scripts/structural-gaps.py` 七节输出判读而来。

| 角度 | 检查 | 本期结果 | 一句话判断 |
|---|---|---|---|
| 完备性 | 文章有没有被编译进 wiki | 31 / 266 篇未被任何页引用 | 大头是两组旧系列整组漏抽 |
| 准确性 | Claim 是否落后于来源文章 | 44 条 Claim 的来源在其后又实质修改过 | AKS 系列 11-15 大改后，11-14 的 Claim 一条都没复核 |
| 准确性 | 已知事实是否过时 | Agent Substrate"pre-1.0"三处 | 外部已 1.0 GA |
| 缺失性 | 名词、层级、证据 | MCP 无页、25 页无上层、101 条待证 | 见下文 3~5 |
| 引导性 | 页面有没有学习路径带着走 | 79 / 169 页不在任何路径上 | 最活跃的 agent runtime 一整组没有入口 |

### 1. 完备性：31 篇文章写了但没编译进来

按目录聚集，是**整组漏抽**而不是零散遗漏：

- **Context Engineering vs MCP**（7 篇，一组长文拆成的章节）+ Context Engineering 综述读书笔记：MCP 缺页的直接原因——这组文章本身就是讲 MCP 的。
- **RTK 系列**（4 篇）：[[rtk-token-compression]] 页存在，却没有引用这一系列，来源断了。
- **Claude Code 系列 01、05**（核心概念、六层记忆体系）：Claude Code 分类两个多月没有新 Claim，这两篇是现成素材，其中"六层记忆"正好对上外部连续几期高热的 agent memory。
- **Vibe Coding references**（superpowers / gstack / Compound Engineering 对比两篇）、**OCI 镜像两篇**、**jev-router 两篇**、**AKS 系列 01 补充**（Kata 运行时）、产品分析两篇等零散各一。

→ 动作：把这 31 篇放进 LOOP_STATE 待提取队列，下次 `/extract-knowledge` 按目录成组处理。

### 2. 准确性：44 条 Claim 可能落后于文章

**漂移**指 Claim 的来源文章在 Claim「最近更新」之后又有实质修改（改标题、换链接这类一行换一行的提交已排除）。44 条分三组：

- **AKS Agent Runtime 系列（33 条）**：11-14 提取后，11-15 系列重组时 02、03、05、07、10 都大改过（03 瘦身并加两种接法、05 加会话架构、07 合并落地一节、10 加每层技术栈），而 11-15 那次提取只新增 Claim，没有回头复核旧 Claim。最需要先看的是 [[agent-sandbox]]（5 条）、[[agent-session-control-plane]]（6 条）、[[actor-snapshot-scheduling]]（4 条）、[[durable-execution]]（3 条）。另外 Agent 基础设施系列 02 在 11-15 改正了 agent-sandbox 执行接口与暂停语义，凡引用它的 Claim 都要对一遍。
- **Voice Live 系列 16 与 GSA 文章（8 条）**：[[ice-nat-traversal]] 7 条、[[realtime-protocol-selection]] 1 条，来源 10-14 / 10-21 有修订。
- **控制论两条**：[[feedback-loop]]、[[negative-feedback]] 引用的 Claude Code 系列 07 在 10-14 改过。

再加上外部证据显示过时的一处：**Agent Substrate 已于 11-05 发布 1.0、在 GKE 上 GA**，wiki 三处"pre-1.0、只做 PoC"必须改（见维度 7 第 1 条）。张力只剩 1 处真矛盾（revision 固定配置还是权限），已在下面第 7 节给出处理。

→ 动作：对 44 条跑一次 `/revalidate`（按页分批），这是本期**最优先**的事——结论写在 wiki 里却和文章不一致，比缺一页更糟。

### 3. 引导性：79 / 169 页没有入口

知识在 wiki 里，但没有任何学习路径会带人走到它：

- **最活跃的领域反而没有入口**：今天建的 [[agent-framework]]、[[agent-harness]]、[[agent-runtime]]、[[agent-platform]]，以及 [[agent-session-control-plane]]、[[relationship-based-access-control]]、[[ai-gateway]]、[[durable-execution]]、[[actor-snapshot-scheduling]]、[[reconciliation-loop]]、[[credential-out-of-sandbox]]——AKS 系列沉淀的这十一页，7 条路径一条都没有引用。现有的 `harness-agent-architecture` 路径（11-07）只在第 9 站讲到"三层与沙箱"。
- **整类没有路径**：工程质量（6/6）、Vibe Coding（5/5）、具身智能（6/6）、AI FinOps（2/2）、AI 硬件（1/1），以及分层策略类方法页（3/3）。
- 有路径的分类里，语音（5/15）、LLM 推理与训练（4/16）基本覆盖。

→ 动作：用 `/learning-path` 新建一条 **agent runtime 与 agent platform** 路径，从三层总图出发，按"执行 → 会话 → 治理 → 定义与发现 → 自建 vs 托管"排站，配题库；同时把 `harness-agent-architecture` 第 9 站改为指向新路径。

### 4. 缺失性 · 名词缺口：多数是别名没登记，真正缺页的只有 MCP

脚本列出 70 多个"多篇文章打了 tag、wiki 无对应页"的词。剔除纯产品名（codex、blender、aks、dataverse 等）后，剩下的分两种：

**真正缺页——建页**

- **MCP**：31 篇文章打了这个 tag，38 个概念页正文提到它，却没有一个讲 MCP 本身的页（只有 [[mcp-vs-cli]] 这种对比页）。它和 [[a2a-protocol]]、[[ag-ui-protocol]]、[[a2ui-protocol]] 是同一层的东西：agent 的协议栈。建议建 `model-context-protocol`，同时考虑建一个伞形页 `agent-protocol-stack`，把四个协议挂在下面（`Notes/AI/agent/protocol/` 目录本身就按这个组织）。MCP 在 agent runtime 里有三处具体落点：harness 是 MCP 客户端、会话 API 包成 MCP server、agentgateway 做 MCP 聚合，[[ai-gateway]] 已有实测。

**有页但别名缺失——补别名**（一次批量改即可，属"补边"）

| tag | 已有的页 | 篇数 |
|---|---|---|
| `skill` / `agent-skill` | [[skill-pattern]] / [[skill-runtime]] | 8 / 4 |
| `rag` | [[rag-architecture-comparison]] | 6 |
| `prompt-cache` | [[prefix-caching]] | 4 |
| `knowledge-graph` / `knowledge-management` | [[llm-wiki]] / [[personal-knowledge-compiler]] | 5 / 4 |
| `control-theory` | [[cybernetics-agent-design]] | 4 |
| `hosted-agent` / `prompt-agent` | [[foundry-agent-type-selection]] | 4 / 3 |
| `turn`（TURN 中继） | [[ice-nat-traversal]] | 4 |
| `hybrid-attention` | [[hybrid-linear-attention-architecture]] | 4 |
| `text-space-optimization` | [[automatic-prompt-optimization]] / [[skillopt]] | 5 |

这说明名词缺口的大头不是知识没写，而是**搜不到**：tag 和页面别名两套词汇没有对齐。今天 agent runtime 的问题也是这样开始的。

### 5. 缺失性 · 层级缺口：25 / 169 页没有任何上层概念

按领域分组看，三种情况：

- **缺伞形页——建页**：
  - **推理服务**：[[prefix-caching]]、[[hybrid-linear-attention-architecture]]、[[throughput-latency-operating-point]]、[[hybrid-inference-framework-selection]] 四页平铺，没有共同的上层概念。vllm tag 有 6 篇文章。候选伞形页 `llm-serving`（推理引擎与服务化）。
  - **agent 协议**：[[a2a-protocol]]、[[a2ui-protocol]] 没有层级，与上面的 MCP 一起建 `agent-protocol-stack`。
- **只缺边——补边**：
  - [[codex-desktop-architecture]] 应 `implements` [[agent-harness]]（它就是一个具体 harness 的架构拆解）。
  - [[clock-driven-rendering]] 应 `part-of` [[programmatic-video]]（另一半 [[frame-driven-rendering]] 已挂）。
  - [[enterprise-ontology]] 应 `implements` [[ontology-philosophy]]。
  - 五个决策页（[[foundry-agent-type-selection]]、[[voice-agent-build-approach]]、[[rl-infra-framework-selection]]、[[prompt-optimization-tool-selection]]、[[spec-driven-vs-methodology-framework]]）都只用 `grounds` / `uses`，没写自己是在哪个概念下做的选择。决策页应统一加一条 `part-of` 指向它所属的概念页。
- **散点——暂不处理**：[[terminal-multiplexer-for-ai]]、[[notion-as-ai-layer]]、[[global-workspace-llm]]、[[rubric]] 等，与当前主线无关，等下一篇相关文章再挂。

### 6. 缺失性 · 验证缺口：101 条 Claim 写进了 wiki、但证据还不够

按"做一次实验能改哪条 Claim"归并，agent runtime 这一块最集中，也最值得做：

| 实验 | 要测什么 | 能改的 Claim | 当前 → 预期 |
|---|---|---|---|
| ① 同一镜像换 runtime | MAF 写的 agent 不改代码，分别上 Hosted Agent 与 kagent；量改动量、冷启动、Agent ID 与 trace 是否一致 | [[agent-infra-three-layers]] 层间接口 | 0.65 → 0.8 或降级 |
| ② Agent Substrate 1.0 上 AKS | GKE 外能不能跑；挂起恢复的实际延迟；**挂起后 MCP 与数据库连接全断**（GKE 文档写明）对会话控制面的影响 | [[actor-snapshot-scheduling]]、[[agent-sandbox]] 粒度光谱 | 0.75 → 按实测修订；"pre-1.0 只做 PoC"已过时，必须改 |
| ③ 模型网关 + LLM proxy 两跳 | agentgateway 在前、LiteLLM 或 APIM 在后，验证会话限流与组织配额能不能分开、协议转换会不会重复 | [[ai-gateway]] 第二条 | 0.7 → 0.8 |
| ④ agent 网关 + 企业目录 | 系列里两边都没做的部分：agentgateway 做 A2A 入口、卡片同步进 Entra Agent ID 与 Agent 365 | [[agent-platform]] 治理两处、发现三层 | 0.65 / 0.7 → 0.8 |
| ⑤ 执行接口延迟对照 | Sandman 论文给出 no-op 命令中位延迟：agent-sandbox 14.3 ms、OpenSandbox 203.5 ms；与 03 补充的实测对一遍 | [[agent-sandbox]] 执行平面三层 | 补外部证据，可升 0.85 |
| ⑥ Nacos 双向同步 | CRD 状态写进 Nacos、审核结果回写 status | [[agent-platform]] 注册中心二选一 | 0.6 → 0.75 |

其他领域的验证缺口以论文结论为主（[[recursive-self-improvement]] 4 条、[[world-model]] 4 条），读论文能补；[[three-layer-token-optimization]] 两条 0.4 可以本地复测；[[llm-wiki]] 的 OmniRAG 架构 0.4 已无人跟进，下次 `/evolve-wiki` 可考虑退役。

### 7. 准确性 · 张力：真矛盾只有 1 处

首版正则命中 13 处，逐条看过，大多是正文里描述"产品之间不一致"（如 [[voice-live-agent]] 的三条产品线拼接缝），不是 wiki 自相矛盾；收紧正则后只剩真正的一处：

- [[agent-platform]] 的 revision Claim：参考实现文档一处说"已有会话固定配置和权限"，一处说"权限实时算"。Claim 已写明系列 04 撤销 1 秒生效的实测支持后者——**写清适用范围**：revision 固定配置，不固定权限。下次改这页时把这句提到 Claim 标题里。

脚本已收紧为只认"两种说法 / 一处说 / 说法不一"三个短语。

### 8. 答不上的问题

对本期最活跃的 agent runtime / platform 领域追问，wiki 答不上的：

1. **挂起恢复后，MCP 会话怎么接上？** Agent Substrate 挂起会断开全部连接；agentgateway 的 MCP 是有状态会话；参考实现的 harness 也是 MCP 客户端。wiki 里没有任何一页讲"沙箱暂停后有状态连接怎么重建"。→ 做实验 ②
2. **为什么 agent 调 agent 只允许一跳？什么时候一跳不够？** wiki 只记录了"只允许一跳、不继承权限"这个设计，没讲原因。本期 arXiv 两篇正好讲多跳：A2A 的身份只在传输层、每一跳只认直接调用方（A2ABreak）；多跳时要把"当前请求是谁发的"和"权限从哪来"分开传递，并且要逐跳收窄权限（Authorization Propagation in A2A）。→ 读论文，补进 [[a2a-protocol]] 与 [[relationship-based-access-control]]
3. **允许的动作里做了用户没授权的事，谁来管？** 三方交集管的是"能不能对这个资源做这个动作"。AuthorizationBench 测到 agent 在 19.2% 的轨迹里越权，而且多数没有直接危害、多发生在正常的业务压力下，不是注入攻击。这一类越权网关拦不住。wiki 没有讨论。→ 深入学习，见趋势 2
4. **同一模型换 harness，差多少？** [[model-harness-codesign]] 讲第一方绑定的理由，但没有量化。本期有一篇 5.2 万条轨迹的评测给出了配对结果（见趋势 3）。→ 补 Claim

### 上期建议的落实情况

上期三条学习建议（读 Harness² 与 Harness Scaling、PKC 竞品与 agent memory 合并扫描、Voice 与 RL 追加材料）在 wiki 中**都是 0 命中**——这三周精力全部转到了 AKS Agent Runtime 系列。stale 从 411 降到 83 是 11-07 全库复核的结果，不是这几条建议带来的。

## 二、内省总览（维度 1-3）

| 指标 | 10-25 基线 | 本期 | 变化 |
|---|---|---|---|
| 概念 / 方法 / 决策 | 117 / 22 / 8 | 136 / 22 / 11 | +19 / 0 / +3 |
| Claims | 806 | 981 | +175 |
| Claim 状态 | active 395 / stale 411 | active 897 / stale 83 / outdated 1 | 11-07 全库复核 |
| 单来源概念 | 24/117 | 22/136 | 改善 |
| 低置信 Claims（≤0.5） | 15 | 18 | +3 |
| 孤立概念 | 0（2 页无出链） | 2 | [[terminal-multiplexer-for-ai]]、[[intelligent-dictation]] 仍然没有关联 |
| 加权成熟度 | 2.47 | 2.48 | 口径与上期相同，可比 |

**分类成熟度**（Claims 加权）：

| 分类 | 概念 | Claims | 成熟度 | 链到方法页 | 变化 |
|---|---|---|---|---|---|
| AI FinOps 与经济学 | 2 | 11 | 2.75 | 2 | 不变 |
| 语音与实时交互 | 15 | 116 | 2.63 | 6 | 略降（新增页尚浅） |
| Azure 与云平台 | 8 | 64 | 2.58 | 1 | **+4 页、Claims 翻倍以上**，升到第三 |
| AI Agent 理论与架构 | 51 | 345 | 2.57 | 9 | **+13 页、+95 Claims**，本期主要增量 |
| LLM 推理与训练 | 16 | 107 | 2.52 | 7 | 三周无新增 |
| 知识管理与工具 | 11 | 57 | 2.43 | 1 | — |
| 具身智能 | 6 | 35 | 2.24 | 0 | — |
| Context 与工具集成 | 7 | 38 | 2.24 | 1 | MCP 缺页拖低此类 |
| Vibe Coding 框架与工作流 | 5 | 23 | 2.15 | 0 | — |
| 数据本体论 | 2 | 11 | 2.05 | 0 | — |
| Claude Code 与扩展生态 | 6 | 24 | 1.96 | 0 | 两个多月无新 Claim |
| 工程质量与测试 | 6 | 21 | 1.87 | 0 | **连续第五期垫底** |

- **零方法覆盖**：具身智能、数据本体论、Vibe Coding、Claude Code、工程质量五类不变。AKS 系列写了大量"怎么搭"的内容，却全进了概念页，一个方法页都没有——[[agent-session-control-plane]] 里"最小控制面四块"、[[agent-platform]] 里"自建组合"都是方法页的材料。

## 三、GitHub 趋势对标（维度 4）

> 按 velocity 排序。已跟踪的 rea、*craft 系列、ponytail、magpie、DeepInfer、Strata、harness2 不再占名额。

| 趋势主题 | 代表仓库 | Stars | Velocity（⭐/天） | 创建 | 信号 | wiki 覆盖 | 建议 |
|---|---|---|---|---|---|---|---|
| DeepSeek 的自主 agent 原型 | deepseek-ai/dsh-superagent-prototype | 23.3k | 1456 | 10-31 | A | 🔶 [[agent-harness]] | 观望：DSH 之后模型方继续往上做 agent，仓库描述只有一句，内容待确认 |
| Skill 成为主要发布形态 | heydamir/unslop、janestreet/agent_skills、patch-gg/pixelfx | 16.8k / 9.0k / 7.6k | 932 / 692 / 446 | 10-29 / 11-03 / 10-30 | A+C | ✅ [[skill-pattern]] | 不需动作：第三方评论也说"瓶颈从编排转到 skill 层" |
| 后台接活的 CLI agent | KKKKhazix/agent-autoloop | 5.5k | 424 | 11-03 | C | 🔶 [[loop-engineering]] | 了解：命令行 agent 后台常驻、拿不准时发卡片请人拍板，和"确认不转发渠道"的设计正好相反 |
| 多编码 agent 编排 | stablyai/orca、omnigent-ai/omnigent | 125.8k / 11.4k | 516 / 72 | 03-17 / 06-11 | C | 🔶 [[agent-harness]] | 了解：Octoverse 把 orca 列为单厂商项目第四；"harness 的 harness"在桌面侧的形态 |
| 沙箱与 agent runtime | NVIDIA/OpenShell、perplexityai/SPACE、davidondrej/cloudroom | 21.7k / 2.1k / 1.7k | 82 / 46 / 28 | 02-24 / 10-01 / 09-17 | C | ✅ [[agent-runtime]] / [[agent-sandbox]] | 补证据：cloudroom 就是"现成 harness 进隔离沙箱"的 B 类形态；OpenShell 已获 CNCF 支持 |
| MCP / A2A 网关与注册 | IBM/mcp-context-forge、agentic-community/mcp-gateway-registry、oomol-lab/open-connector | 4.8k / 1.1k / 6.2k | 9 / 2 / 45 | — / — / 06-29 | C | 🔶 [[ai-gateway]] | 补 Claim：网关加注册中心合一的方案已出现，可作为 [[agent-platform]] 注册中心选型的第三种 |
| 动作前授权网关 | decionis/agent-safe-pipeline、solongate/agent-security | 0.7k / 0.7k | 7 / 14 | 08-13 / 09-27 | C | 🔶 [[relationship-based-access-control]] | 并入趋势 2 |

**趋势盲区结论**：GitHub 侧没有新的大盲区。本期最大的变化来自行业发布，不在 star 榜上：Agent Substrate 1.0 GA、kagent 1.0 改建在 Substrate 之上（见维度 7 第 1 条）。

## 四、arXiv 前沿对标（维度 5）

| 论文 | 时间 | 核心贡献 | wiki 覆盖 | 相关性 | 建议 |
|---|---|---|---|---|---|
| Sandman (2610.39711) | 10 | 生产级 agentic RL 沙箱服务，峰值 11858 并发；1 万请求突发全部交付比调优后的 agent-sandbox 快 44%；no-op 命令中位延迟 2.0 / 14.3 / 203.5 ms（Sandman / agent-sandbox / OpenSandbox） | 🔶 [[agent-sandbox]] | 🔴 高 | 补来源：第一篇拿 agent-sandbox 和 OpenSandbox 做对照的论文 |
| A2ABreak (2609.10871) / Authorization Propagation in A2A (2611.07050) | 09-11 | A2A 规范抽出 37 个状态、找到 11 个漏洞，含多跳委托中的身份丢失；把"当前调用方"与"继承的授权"分开传递，15 个攻击场景拦下 14 个，本地开销 5.11 ms | 🔶 [[a2a-protocol]] / [[relationship-based-access-control]] | 🔴 高 | 读：回答"为什么只允许一跳" |
| AuthorizationBench (2610.27548) | 10 | 286 个任务、6864 条轨迹：agent 在 19.2% 的轨迹里越权；推理强度不改变越权率；正常业务压力下比恶意注入更容易越权；先问用户的 agent 越权率更低（14.0% 对 21.6%） | ❌ | 🔴 高 | 深入：三方交集管不到的"语义越权" |
| When Agents Fail: Model or Harness (2610.32483) | 10 | 4 个 harness（OpenCode / Codex CLI / Pi / DeepAgents）× 4 个模型、5.2 万条轨迹；harness 排名随模型和基准变化，OpenCode 跨模型第一；提出"有效完成率"与"模型-harness 适配度" | 🔶 [[model-harness-codesign]] / [[harness-portability-spectrum]] | 🟡 中 | 补 Claim：给"第一方绑定"补一组量化反证 |
| Object-Oriented Harness (2610.28380) / MetaVul (2610.40721) | 10 | harness 进化把发现任务与留出任务分开评估；指出此前 Meta-Harness 在同一批任务上搜索和评估 | 🔶 [[meta-harness]] | 🟡 中 | 补来源：harness 优化的评估方法问题 |
| You don't need long context (2611.05306) / Cache Engineering for Agents (2610.28577) | 10-11 | 频繁压缩到 16K~48K 上下文，长任务表现基本持平；KV cache 读取占 API 成本 82.4%，改动早期历史会让后续缓存全部失效 | 🔶 [[context-engineering]] / [[prefix-caching]] | 🟡 中 | 了解：和上期 MemDev-Bench"原始轨迹优于压缩记忆"结论相反，见维度 7 |
| InteractionBench (2611.02430) / Speculative Listening (2611.06982) | 11 | 全双工系统的时机评分与答题正确率相关（ρ=0.83），级联系统轮转全过、停顿与打断几乎全挂；块交错全双工模型 95% 的块下一段音频不改变输出 | 🔶 [[turn-taking]] / [[cascaded-vs-e2e-voice]] | 🟡 中 | 补 Claim |
| SWE-Shift (2610.32196) / SWE-Clar / SWE-DIVE | 10 | 执行中途改代码、依赖、需求，17 个系统全部下降，最强的从 67% 跌到 25%；工具与会话变化时成功率为 0 | ❌ 工程质量分类无评测页 | 🟡 中 | 了解：工程质量分类的补页素材 |
| Agent Self-Improvement with Frozen Weights (2611.11342) | 11 | 冻结权重、只用失败轨迹学习的价值与上限 | 🔶 [[recursive-self-improvement]] | 🟢 低 | 观望 |

**前沿盲区结论**：本期最集中的是 **agent 的委托与授权**——三篇论文从协议漏洞、多跳授权传递、越权行为三个角度切入，恰好对上 AKS 系列里最重的自研部分。其次是 **harness 评测的方法问题**：配对效应、留出集。

## 五、HuggingFace 模型近期动向（维度 6）

| 排名 | 模型/技术 | Velocity（❤️/天） | 创建 | 一句话要点 | 重要性 |
|---|---|---|---|---|---|
| 1 | moonshotai/Kimi-K3.1-Pro | 150 | 11-02 | 多模态旗舰，上期 Kimi K3 之后的更新 | 🟡 |
| 2 | nvidia/NVIDIA-Nemotron-3.5-Transcribe-30B-A4B | 83 | 10-07 | ASR 也走 MoE（30B 总参、4B 激活） | 🟡 |
| 3 | higurashi-ai/Haru-4B | 77 | 11-12 | 原生全双工基座模型，每 133 ms 同时吃进一帧用户音频、吐出一帧自己的音频和文字，多语言 | 🔴 |
| 4 | LiquidAI/LFM3-1.7B / LFM3-Omni-2B | 75 / 25 | 10-23 / 10-21 | 端侧小模型继续推进，Omni 版音视频统一 | 🟢 |
| 5 | NousResearch/Arete-27B | 61 | 11-06 | 在 Qwen3.8-27B 上做价值观后训练 | 🟢 |
| 6 | Zyphra/ZONOS3-Mini | 57 | 11-09 | 小型表现力 TTS | 🟢 |
| 7 | adventists-ai/Sophon-Realtime-v1 | 30 | 11-07 | 开源全双工语音模型族，同一个 32B 模型负责听、判断轮次和写回复，三种发声方式可选（带声音标签交给表现力 TTS / 轻量 TTS / 端到端小 talker），API 兼容 OpenAI Realtime | 🔴 |
| 8 | thinkingmachines/Inkling-2-Small | 29 | 11-04 | 直接以 NVFP4 与 MXFP8 发布 | 🟢 |
| 9 | convaiinnovations/laya | 101 | 09-18 | 非自回归的"System 1"决策模型，输出带校准概率 | 🟡 |

**技术方法新动态**：

- **开源全双工语音从研究原型变成可部署的模型族**：Haru-4B 做原生全双工基座，Sophon-Realtime 把"一个大脑、多种发声方式"做成可选产品形态，并兼容 OpenAI Realtime 接口。Sophon 的分法（理解与轮次判断共用一个模型，发声可换）是级联与端到端之间的第三种折中，直接关系到 [[cascaded-vs-e2e-voice]]。→ 🔴
- **NVFP4 从权重扩展到 KV cache**：Nemotron 3.5 Super VL 用 NVFP4 + 量化感知蒸馏交付；arXiv 2611.09825 给出微缩放 FP4 KV 方案，标准 NVFP4 KV 在 Qwen3-4B 上掉 8.5 分。上期"量化靠蒸馏回补精度"的判断有了第三批证据。→ 🟢
- [[system-one-model]] 有了新的开源实例 laya（上期未报），可作为来源补入。→ 🟡

## 六、近期趋势综合（维度 7，按重要性）

1. 🔴 **Agent runtime 开始标准化**（多源：行业发布 + GitHub OpenShell、cloudroom、SPACE + arXiv Sandman、Metal Sandbox + 内省）——Google 11-05 把 Agent Substrate、gVisor、OpenRL 捐给 CNCF，Substrate 1.0 在 GKE 上 GA（宣称挂起恢复低于 500 毫秒、密度 10 倍）；kagent 1.0 改建在 Substrate 之上，11-10 GA。需要注意：GKE 文档要求 Standard 集群 1.37 以上、不支持 GPU 直通、**挂起时断开全部连接**（数据库与 MCP 都要重连）；GitHub README 仍写着 pre-1.0，正式 v1.0.0 标签未见。wiki 里"Agent Substrate 是 pre-1.0、只做 PoC"的说法分散在 [[actor-snapshot-scheduling]]、[[agent-sandbox]] 和基础设施系列 01，**已经过时**。→ **补 Claim 并修订过时说法**，再决定是否把实验 ② 排进系列
2. 🔴 **Agent 委托与越权成为独立方向**（多源：arXiv A2ABreak、A2A 多跳授权传递、AuthorizationBench、A2A 失败分类 + GitHub 授权网关与 MCP 网关注册 + 内省"答不上的问题" 2、3）——AKS 系列的授权做到了"资源 + 动作"的三方交集和一跳委托，这批工作讲的是它的下一步：多跳时权限怎么逐跳收窄、允许的动作里做了用户没授权的事怎么发现。→ **深入学习**
3. 🔴 **MCP 缺页**（内省）——31 篇文章、38 个概念页提到，没有概念页；和 A2A、AG-UI、A2UI 一起缺一个协议栈伞形页。→ **建页**
4. 🟡 **Harness 评测转向模型与 harness 的配对**（单源 arXiv 成族：When Agents Fail、OO-Harness、MetaVul、Harness Scaling）——"哪个 harness 最好"没有脱离模型的答案；harness 优化必须用留出集评估。补到 [[model-harness-codesign]] 与 [[agent-harness]]。→ 补 Claim
5. 🟡 **开源全双工语音模型密集发布**（多源：HF Haru-4B、Sophon-Realtime + arXiv InteractionBench、Speculative Listening）——级联系统轮转全过、停顿与打断几乎全挂，这一点可以直接对照 Voice Live 的级联模式。→ 补 Claim 到 [[turn-taking]]、[[cascaded-vs-e2e-voice]]
6. 🟡 **压缩上下文还是保留原始轨迹**（单源 arXiv）——本期"频繁压缩基本不掉分"和上期 MemDev-Bench"原始轨迹优于压缩记忆"结论相反，差别可能在任务是否依赖过程细节。对 PKC"编译一次"的设计是同一个问题的两面。→ 了解概况，两篇一起读
7. 🟡 **Coding agent 评测加入执行中途的变化**（单源 arXiv）——SWE-Shift 里工具与会话变化时成功率为 0，正好对应 agent runtime 里"沙箱暂停恢复后环境变了"的场景。→ 了解概况
8. 🟢 观望：skill 层成为新仓库主要形态；NVFP4 扩展到 KV cache；AI clean-room 克隆潮继续（craft-anything 2111⭐/天）。

## 七、学习建议

先内部、后外部；不新增日记任务，只给顺序：

1. **准确性：复核 44 条漂移 Claim**（内部 2）：按页分批跑 `/revalidate`，先 [[agent-session-control-plane]]、[[agent-sandbox]]、[[actor-snapshot-scheduling]]、[[durable-execution]]，再 [[ice-nat-traversal]]；同时把 Agent Substrate 三处"pre-1.0"改为 1.0 GA 及其限制。
2. **完备性：31 篇漏抽文章入队**（内部 1）：Context Engineering vs MCP 一组、RTK 一组、Claude Code 01 / 05 优先，按目录成组 `/extract-knowledge`。
3. **引导性：建 agent runtime 与 agent platform 学习路径**（内部 3）：`/learning-path` 新建，十一页按"执行 → 会话 → 治理 → 定义与发现 → 自建 vs 托管"排站，配题库；`harness-agent-architecture` 第 9 站改指新路径。
4. **缺失性：补别名、补边、建 MCP 页**（内部 4、5）：别名表一次改完，三条边与五个决策页的 `part-of` 补上；MCP 页与协议栈伞形页的素材就在第 2 条那组文章里，和第 2 条一起做。
5. **外部：读委托与授权三篇**（趋势 2 + 答不上的问题 2、3）：A2ABreak、Authorization Propagation、AuthorizationBench，补进 [[a2a-protocol]] 与 [[relationship-based-access-control]]；写成文章就是 AKS Agent Runtime 系列 04 的第二篇补充。
6. **实验清单**（内部 6）：②（Substrate 上 AKS）与 ③（两跳网关）最便宜、最能改结论，先做。

## 附：采集执行记录

- 内省：`/tmp/gap_intro.py` 计算统计与成熟度（口径与上期相同）；内部四个角度用 `wiki/scripts/structural-gaps.py` 首次运行（七节），输出经人工判读。漂移检查排除了"一行换一行"的改标题、换链接提交（净增 ≥ 5 行或增删合计 ≥ 40 行才算实质修改）。
- GitHub：gh api 信号 A（90 天 / 30 天新锐）与信号 C（10 个关键词 × 半年新锐 / 近 7 天活跃，新增 agent-runtime、agent-sandbox、agent-gateway 三个关键词）成功；信号 B 用 Tavily 检索 11 月 trending 汇总与 Octoverse 2026。dsh-superagent-prototype、harness2、openai/math 仍无描述，内容未确认。
- 行业：Agent Substrate 1.0 与 kagent 1.0 来自 Google Cloud 博客、Google 开源博客与第三方报道；"挂起断开连接""不支持 GPU 直通"来自转引的 GKE 文档，未直接打开 GKE 文档核对；README 与发布说法不一致已在正文注明。
- arXiv：Tavily `include_domains=arxiv.org` + `time_range=month`，6 个领域各 1 次，外加委托授权 1 次；Sandman、When Agents Fail、AuthorizationBench、A2A 多跳授权四篇读了摘要或正文关键段。
- HuggingFace：curl 调 API，likes / downloads / trendingScore 排序 + 5 个 pipeline_tag + 7 个关键词，后过滤近 60 天创建（117 个模型）按 likes/天排序；Haru-4B、Sophon-Realtime、Inkling-2、laya、Arete 读了模型卡。技术趋势用 Tavily 检索 NVIDIA 报告与 HF 模型卡。
- 日记：今天（11-16）的日记文件尚未创建，第 6 步未写入。
