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
    title: '内部债务基本清零，剩下的是两篇新文未入库与 119 条待验证 Claim'
    priority: high
    action: claim
    signals: [introspection]
    nodes: [agent-runtime, reconciliation-loop, ai-gateway]
  - topic: agent-runtime
    title: '部署交接的经验只写在文章里，wiki 没有对应的页'
    priority: high
    action: claim
    signals: [introspection]
    nodes: [agent-runtime, reconciliation-loop, agent-sandbox]
  - topic: context-engineering
    title: '上下文压缩开始有专门的基准，结论是压缩会丢任务信息'
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
    title: '语音 agent 的失败主要在决策，不在听和说'
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
    title: 'dsh 生态和跨模型切换工具在 GitHub 上增长最快'
    priority: low
    action: watch
    signals: [github]
    nodes: [model-routing]
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
| 准确性 | Claim 之间有没有矛盾 | 1 处张力（1） | 同一处，是外部文档自身矛盾，已由实测裁决 |
| 缺失性 | 名词、层级、证据 | 48 个名词、10 页无上层（25）、119 条待验证（101） | 层级缺口减半；待验证增加，因为新 Claim 多是推论 |
| 引导性 | 页面有没有学习路径带着走 | 69 / 173 页不在路径上（79 / 169） | agent runtime 路径已建，剩下的是整类没有路径 |

### 1. 完备性：两篇新文章没有入库

- [AKS Agent Runtime 系列 14：让 PoC 能交给别人部署](../../Azure/Azure-Kubernetes-Service/AKS-Agent-Runtime系列14：让PoC能交给别人部署.md)：版本回退、入口三道处理与网络策略、平台登记现查、Helm 锁、配置三分类。里面至少有四条能进 wiki 的论断，最直接的落点是 [[reconciliation-loop]]（完整部署以 chart 为期望状态，手工改动会被覆盖）和 [[agent-runtime]]（会话型和常驻型 runtime 都需要一份按集群现查的平台登记）。
- [魏斯曼演讲大师课读书笔记](../../book/魏斯曼演讲大师课读书笔记：结构、开场与串联.md)：这是一个新领域（演讲与表达），wiki 里还没有任何相关的页。是否建页要先定：它和现有的技术知识图谱关联很弱，更适合放进学习路径之外的独立分类，或者只作为 skill 的来源，不进 wiki。

→ 动作：两篇**入队提取**。系列 14 按常规处理；读书笔记先请你决定是否进 wiki。

### 2. 准确性：没有漂移，张力仍是同一处

漂移缺口为 0，说明上周补抽之后，wiki 的结论和文章一致。唯一的张力还在 [[agent-platform]] 的 revision 那条 Claim：它记录的是**参考实现的文档自己前后不一**——一处说已有会话固定"配置和权限"，一处说权限每次请求实时算。Claim 已经按系列 04"撤销约 1 秒生效"的实测采纳了后者，所以这不是 wiki 内部的矛盾，而是外部来源本身矛盾、已由实测裁决。

→ 动作：无需复核。脚本靠"一处说"这类字样识别张力，这条以后每期都会被报出来；可以把正文改写成"参考实现文档有两处表述不一，实测支持权限实时算"，或在脚本里登记为已裁决。

### 3. 缺失性 · 层级缺口：10 页，多数是散点

25 页降到 10 页。剩下的 [[terminal-multiplexer-for-ai]]、[[notion-as-ai-layer]]、[[global-workspace-llm]] 都是单篇文章引出的散点，暂不处理；[[distributed-training-parallelism]] 应该 `part-of` [[llm-serving]] 的训练侧或 RL 基建，[[global-secure-access]] 可以 `part-of` 网络与身份相关的 Azure 页，这两条**补边**即可。

### 4. 缺失性 · 名词缺口：48 个，基本是产品名和泛词

前十名是 codex、aks、voice-live-api、kubernetes、azure-openai、connector、dataverse、work-iq、gsd、power-platform，都是产品名或泛词，按惯例只作证据。值得看的只有两个：

- `kata-containers`（6 篇）、`opensandbox`（5 篇）：都已作为 [[agent-sandbox]] 的组成写进 Claim，**补别名**就能消除；
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

**认知深度**：

- 低置信度 Claim（≤ 0.5）19 条；
- 单来源页 37 个；
- 孤立页 2 个：[[terminal-multiplexer-for-ai]]、[[intelligent-dictation]]。

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

几点判断：

- **dsh 生态继续是增长最快的 agent 方向**，而且出现了"装进手机""免 key 用多家模型"这类周边，和上期的 harness 解耦主题一致；wiki 里 dsh 已被 10 页提到，补一条生态现状的 Claim 即可。
- **一个入口切换各家模型**（magpie 让 Codex 跑 DeepSeek、Claude Code 跑 Kimi）是 [[model-routing]] 的新形态：路由不在网关，而在桌面端。
- 上期的"skill 层成为主要形态"仍成立：Jane Street、Cloudflare 都在发 skill，且增速很高。
- **OpenShell 在追踪任务里挂了很久**，现在 22k⭐，velocity 80，已是成熟项目，可以考虑按计划实测一次。

## 四、arXiv 前沿对标（维度 5）

| 论文 | 时间 | 核心贡献 | wiki | 相关性 | 建议 |
|---|---|---|---|---|---|
| CompAct-Bench（2611.25673） | 11 月 | 200 个任务专测上下文压缩：12 个模型在强压缩下都丢了大量任务信息，难度取决于关键信息出现在轨迹的哪里 | 🔶 | 高 | 补 Claim |
| Forget Freely, Grep Later（2611.25123） | 11 月 | 压缩后另存完整的追加日志，需要时 grep 回来，做到无损 | 🔶 | 高 | 补 Claim |
| You don't need long context（2611.05306） | 11 月 | 长任务上简单的对话末尾压缩通常不输全历史 | 🔶 | 高 | 补 Claim |
| Claw-SWE-Bench（2606.12344） | 6 月 | 固定模型换 7 种 harness，成功率和成本差别很大，评测应把 harness 当受控变量 | ❌ | 高 | 补 Claim |
| Great Listeners, Poor Decision-Makers（2611.23847） | 11 月 | 全双工语音 agent 在客服任务上成功率 31~51%，文本 agent 85%，失败的 79~90% 归因于 agent 行为 | ❌ | 高 | 读论文 |
| WorkflowArena（2611.12856） | 11 月 | 让模型自己编排子 agent 的能力单独测；Claude Code 委派次数少但每次组更多 worker，Codex 委派更频繁 | 🔶 | 中 | 了解 |
| Log-To-Leak（2610.36108） | 10 月 | 恶意 MCP 服务器靠工具描述诱导 agent 外泄查询和其他服务器的响应 | 🔶 | 中 | 补 Claim |
| The Devil Wears Markdown（2611.10830） | 11 月 | 检测藏在 SKILL.md 里的恶意指令，静态、动态、agent 三层分析 | 🔶 | 中 | 补 Claim |
| CARE-PO（2611.12125） | 11 月 | agent 轨迹里大多有可删掉的工具调用，提出可控的调用效率训练 | ❌ | 中 | 观望 |
| AgentDecept（2610.39377） | 10 月 | 在压力场景下测 agent 是否如实报告自己做了什么 | ❌ | 中 | 观望 |

上下文压缩这一组最值得看：三篇放在一起，结论是"压缩本身没问题，问题在压缩时丢了什么"。这和上期报告里"频繁压缩与保留原始轨迹结论相反"的张力是同一件事，现在有了专门的基准和一个折中方案（压缩 + 无损日志 + 按需检索）。[[context-engineering]] 里关于压缩的 Claim 可以据此补一条适用条件。

语音那篇正好对上追踪任务里挂着的 τ-Voice 论文（79~90% 失败源于 agent 行为），可以一起读。

## 五、HuggingFace 模型近期动向（维度 6）

近 60 天新模型 137 个，按 likes/天 排序：

| # | 模型 | Velocity | 创建 | 要点 | 重要性 |
|---|---|---|---|---|---|
| 1 | thinkingmachines/Inkling-2-Mini | 872 | 11-17 | 26B 参数、3.4B 激活的循环层 transformer，中间层每 token 跑三遍，能在笔记本上跑 agent 任务，Apache 2.0 | 🔴 |
| 2 | xtools-at/DeepSeek-V4-Pro-Qwen3.5-9B（蒸馏） | 277 | 10-30 | 把 DeepSeek V4 Pro 蒸馏到 9B | 🟡 |
| 3 | deepseek-ai/DeepSeek-V4.1-Flash-1017 | 178 | 10-17 | DeepSeek 新一代 Flash，多模态 | 🟡 |
| 4 | harness-hub/Qwen3.8-27B-pi-adapted | 144 | 11-16 | 针对特定 harness 做 LoRA 适配的模型 | 🟡 |
| 5 | moonshotai/Kimi-K3.1-Pro | 116 | 11-02 | Kimi 新版，多模态 | 🟡 |
| 6 | sensenova/SenseNova-Loop-9B | 100 | 11-17 | 另一个循环层模型 | 🟢 |
| 7 | higurashi-ai/Haru-4B | 83 | 11-12 | 音频到音频的小模型（上期已报） | 🟢 |
| 8 | Edge0/Edge0-145B-NVFP4 | 66 | 11-11 | NVFP4 量化发布 | 🟢 |
| 9 | nvidia/Nemotron-3.5-Transcribe-30B-A4B | 52 | 10-07 | MoE 结构的转写模型 | 🟡 |
| 10 | Zyphra/ZONOS3-Mini | 46 | 11-09 | 小型 TTS | 🟢 |

值得关注的新趋势，按重要性：

1. **循环层（looped）模型**：Inkling-2-Mini 和 SenseNova-Loop 同周出现，用"同一组层多跑几遍"换参数量，小模型也能做 agent 任务。这是架构层面的新信号，wiki 里没有。
2. **为特定 harness 适配模型**：harness-hub 直接发布"针对某个 harness 调过"的模型，和 arXiv 上 Claw-SWE-Bench 的结论互相印证——模型和 harness 正在成对出现。
3. **NVFP4 成为发布格式**：Inkling-2-Small 主 checkpoint 就是 NVFP4，Edge0 也是，上期是观望项，现在已进入主流发布。

## 六、近期趋势综合（维度 7，按重要性）

1. 🔴 **上下文压缩有了专门的评测**（arXiv 三篇）：结论是压缩会丢任务相关信息，折中方案是"压缩 + 无损日志 + 按需检索"。→ 在 [[context-engineering]] 补适用条件。
2. 🟡 **模型与 harness 成对**（arXiv + GitHub + HF 多源）：评测把 harness 当变量，模型开始针对 harness 适配，桌面端出现跨模型切换工具。→ 在 [[model-harness-codesign]] 补一条。
3. 🟡 **Skill 与 MCP 成为提示注入的新入口**（arXiv + GitHub）：恶意 MCP 工具描述、SKILL.md 里藏指令；与此同时大机构都在发 skill。→ 在 [[skill-pattern]] 或 [[model-context-protocol]] 补安全边界。
4. 🟡 **语音 agent 的瓶颈在决策**（arXiv）：和追踪任务里的 τ-Voice 论文是同一结论。→ 读论文，补进 [[cascaded-vs-e2e-voice]]。
5. 🟡 **模型自己编排子 agent 被单独评测**（arXiv）。→ 了解概况。
6. 🟢 Agent 欺骗与压力测试（arXiv）、dsh 与跨模型工具（GitHub）、循环层小模型（HF）：观望。

## 七、学习建议

先内部、后外部：

1. **完备性：两篇新文入队**（内部 1）：系列 14 下次 `/extract-knowledge` 一起处理；读书笔记要不要进 wiki，请你先定。
2. **准确性：张力那条无需复核**（内部 2）：是参考实现文档自身矛盾、已由实测裁决，改一下正文措辞即可，不再每期报出。
3. **引导性：建具身智能学习路径**（内部 6），6 页 36 条 Claim，体量够了。
4. **缺失性：补两条边、两个别名**（内部 3、4）：`distributed-training-parallelism`、`global-secure-access` 补上层，`kata-containers`、`opensandbox` 补进 [[agent-sandbox]] 的别名。
5. **外部：读上下文压缩三篇**（趋势 1），补进 [[context-engineering]]；**读语音决策那篇**，和 τ-Voice 一起，补进 [[cascaded-vs-e2e-voice]]。
6. **实验**：上期的 Substrate 和两跳网关两项还没做；本期加一项 agent-lightning 与 rllm 的对照实跑。

## 附：采集执行记录

- 内省：`wiki/scripts/structural-gaps.py` 七节输出；统计与成熟度用 `/tmp/gap_intro.py` 重新计算（上期脚本已不在 /tmp，口径见第二节说明）。
- GitHub：gh api 信号 A（90 天 / 30 天新锐）与信号 C（12 个关键词 × 半年新锐 / 近 7 天活跃），共 155 个仓库，按 trend_score 与 velocity 排序；本期未做信号 B 的 Tavily trending 汇总。
- arXiv：Tavily `include_domains=arxiv.org` + `time_range=month`，6 个领域各 1 次，读了检索返回的摘要和正文片段，未逐篇打开全文。
- HuggingFace：API 按 likes、downloads、trendingScore 排序，加 6 个 pipeline_tag、8 个关键词，后过滤近 60 天创建（137 个）；Inkling-2 的结构和许可来自官方模型卡与第三方报道。
