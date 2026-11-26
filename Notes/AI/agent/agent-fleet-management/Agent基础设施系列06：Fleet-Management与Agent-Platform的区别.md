---
title: Agent 基础设施系列 06：Fleet Management 与 Agent Platform 的区别
created: 2026-11-26
tags:
  - agent
  - agent-fleet-management
  - agent-platform
  - agent-365
  - bedrock-agentcore
  - gemini-enterprise-agent-platform
  - ai-gateway
  - multi-cloud
description: Agent Platform 管的是把一个 agent 造好、跑好，fleet management 管的是一次改动能不能落到几百个 agent 上。分界有两条——能不能看到别家平台建的 agent，以及是否站在请求路径上。三朵云的出发点不同，微软从身份和台账出发、出了 Azure 只能只读同步，AWS 从版本和灰度出发、整个 fleet 换模型要自己写脚本，Google 从网络数据面出发、跨云网关还没上线。跨云方案分 SaaS 套件、中立控制面、云厂商外延和开源自建四类，共同的边界是一次改全部只对经过网关的流量成立；网关本身又分 LLM、AI、Agent 三档，A2A 放不放进网关，取决于把网关当成消费入口还是网络边界
---

# Agent 基础设施系列 06：Fleet Management 与 Agent Platform 的区别

最近读到 Lyzr 的一篇 [7 Best Platforms for AI Agent Fleet Management](https://www.lyzr.ai/blog/best-platforms-for-ai-agent-fleet-management/)，里面引了 Gartner 2026 年 4 月的一组数字：到 2028 年，一家全球 Fortune 500 企业平均会有超过 15 万个 agent 在用，2025 年还不到 15 个；而认为自己的 agent 治理到位的组织只有 13%（[Gartner Identifies Six Steps to Manage AI Agent Sprawl](https://www.gartner.com/en/newsroom/press-releases/2026-04-28-gartner-identifies-six-steps-to-manage-artificial-intelligence-agent-sprawl)）。这篇文章是 Lyzr 推自家产品的，评分表把自己排在第一，但它提出的问题是对的：造一个 agent 现在只要两天，可某个模型要退役、某条数据规则收紧时，三百个 agent 还是一个一个改。

我和客户聊 agent 平台时，常把 fleet management 和 agent platform 混成一件事。这篇把两者分开，再看三朵云各自给了什么解法，以及跨云的方案能做到哪一步。

## 一、Platform 管一个 agent，fleet 管全部 agent

[系列 01](../agent-platform/Agent基础设施系列01：三层划分与自建路线.md) 把 agent 基础设施分成 Framework、Runtime、Platform 三层。Foundry、AgentCore、Gemini Enterprise Agent Platform 都是 platform：给你建 agent 的工具、跑 agent 的运行时，再给每个 agent 配上身份、观测和评估。它关心的是**这一个 agent** 有没有造好、跑好。

Fleet management 换了一个视角：把企业里所有 agent 当成一个整体来运营。Lyzr 那篇文章用五个指标来衡量，我觉得概括得不错：

1. **清点**：一共有多少 agent，包括不是这个平台建的；
2. **健康**：每个 agent 的错误、延迟、升级人工、质量漂移，能逐个看也能汇总看；
3. **版本**：哪个版本跑在哪里，能不能灰度、能不能一步回滚；
4. **花费**：按 agent、按团队算钱，预算到了能真的拦住；
5. **触达**：一条策略或一次换模型，同时落到所有 agent 上。

前四个大多数平台都在补，第五个才是 fleet 和 platform 真正拉开差距的地方。

健康这一项我会再加一层业务结果。错误率和漂移只能说明 agent 有没有出问题，回答不了"这几百个 agent 值不值"。ServiceNow AI Control Tower 的 Measure、Agent 365 的 Business Analytics 都在往这个方向补；垂直行业的厂商做得更直接，比如做金融研究外包的 Acuity Analytics，按工作流统计周转时间和准确率。

"fleet"这个词在市场上还有另一种用法，要先分清。这篇讲的是管好企业已有的一群 agent；另一种是卖给你一群现成的 agent。Acuity Analytics 的 [Agent Fleet](https://www.acuityanalytics.com/agent-fleet/) 就属于后者：面向资管、私募、投行、信贷的一套 agent 工作流，每份输出由它的分析师复核，治理指的是单个工作流内的审计记录和人工复核，没有对其他平台 agent 的清点，也没有网关。客户说"agent fleet"时，先问清楚是哪一种。

按这五个指标去看具体产品，会发现分界其实是两条：

- **能不能看到别家建的 agent**。平台天然只认识自己托管的 agent；fleet 要求的是全量清点，包括别的云、别的 SaaS、开发者笔记本上的 coding agent。
- **在不在请求路径上**。注册表能告诉你有哪些 agent，却改不了任何一个 agent 的行为。要让"一次改全部"成立，控制点必须站在 agent 调模型、调工具的路上，也就是网关。

下面这张定位图把这两条分界画成两个轴，后面讲到的产品都在上面：

![看得见 vs 管得住：各家 fleet 方案的位置|900](../../../../asset/agent-fleet-visibility-vs-control-2026-11-26.svg)

越往右，能看到的 agent 越多；越往上，控制越深。几乎每家都是在自己的地盘里能做到很上面，一出自家云就掉到只读。

### fleet 控制台长什么样

Lyzr 的 OpenController 是一个比较典型的 fleet 控制台，三个界面正好对应"看得见"和"管得住"两件事（以下截图来自厂商产品页，数据为演示数据）。

**第一层是清点。** AI Inventory 按"云 → 平台 → agent → 用到的资源"把整个资产串起来：Microsoft 的 3 个租户、AWS 的 6 个账号、Google 的 2 个项目，下面挂着 Foundry、Copilot Studio、AgentCore、Vertex、Databricks、Agentforce，还有开发者本机上的 Claude Code。右上角 312 个 agent 里有 86 个是影子 agent，也就是没人登记过的。

![OpenController 的 AI Inventory：按云、平台、agent、资源串起来的资产图|900](../../../../asset/lyzr-opencontroller-inventory-2026-11-26.png)

**第二层是风险和花费的汇总。** Overview 把问题按平台和类别做成热力图（暴露面、身份、数据、自主度、供应链、运行时、治理），右边对照 OWASP、MITRE ATLAS、NIST AI RMF、ISO/IEC 42001、EU AI Act 这些框架的覆盖情况，下面是按平台的 agent 数量和当月花费。

![OpenController 的 Overview：按平台的风险热力图、合规框架覆盖与花费|900](../../../../asset/lyzr-opencontroller-overview-2026-11-26.png)

这两层都还是"看得见"。真正能改变 agent 行为的是第三层。

**第三层是网关。** LLM Gateway 站在 agent 和模型提供方中间：左边是各个 agent 的流量占比，右边是 OpenAI、Anthropic、Gemini、Azure OpenAI 和本地 Llama 的延迟。下面的实时调用里能看到 403（策略拒绝）和 429（预算或限流），右下角是各团队离预算还有多远。换模型、切流量、封工具、卡预算，都发生在这一层。

![OpenController 的 LLM Gateway：agent 到模型的流量、实时调用与团队预算|900](../../../../asset/lyzr-opencontroller-llm-gateway-2026-11-26.png)

Lyzr 自己也承认这个边界：一次改全部只对流量经过它网关的 agent 成立，只登记了的 agent 是"看得见、改不了"。这句话对后面所有产品都适用。

## 二、三朵云的出发点不同

三家都在往 fleet 方向补，但起点不一样，补出来的形状也不一样。

### 微软：从身份和台账出发

微软的 fleet 核心是 Agent 365 加 Entra Agent ID。Agent 365 的注册表是 Microsoft 365 管理中心里的 agent 台账，Foundry、Copilot Studio、Agent Builder 建出来的 agent 自动进来；Entra 给每个 agent 一个目录里的身份，带 owner、sponsor 和 Conditional Access。逐请求的执行在 AI Gateway 上：Agent 365 能把工具策略写进网关，由网关在每次 MCP 调用时拦截。这条链路的细节我在 [系列 05](../agent-platform/Agent基础设施系列05：完整Agent方案的三条路线.md) 里写过，这里不重复。

对 fleet 来说，关键是 Azure 之外的部分。Agent 365 通过 connected platforms 把 Bedrock、AgentCore、Vertex AI、Agentforce、Databricks、Snowflake 等平台的 agent 同步进注册表，按 [Connected platforms in Microsoft Agent 365](https://learn.microsoft.com/en-us/microsoft-agent-365/admin/connected-platforms) 的说法，这条连接**设计上就是只读的**：Agent 365 不调用、不执行源平台上的 agent，也不改源平台的资源；同步要手动触发，没有定时任务。Ignite 2026 上宣布同步进来的 agent 会自动拿到 Entra Agent ID、连接改成免密钥，目前还是预览。

所以微软的形状是：**清点最全，身份最强，但出了 Azure 就只剩看得见**。花费这一项，Agent 365 Business Analytics 刚进 Frontier 预览，能看用量和花费预测；真正能拦住花费的，是 AI Gateway 上的成本上限，它只管经过网关的流量。

### AWS：从版本和灰度出发

AWS 在"版本"这一项上做得最扎实。AgentCore Runtime 每次更新都会生成一个完整、自包含的新版本，`DEFAULT` endpoint 自动指向最新版本，你自己建的 `PROD` 之类的 endpoint 则停在你指定的版本上，不会被更新带走（[AgentCore Runtime versioning and endpoints](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agent-runtime-versioning.html)）。Well-Architected 的 Agentic AI Lens 建议用 endpoint 的权重路由做灰度：新版本先放 5%~10% 的流量，看质量指标，干净了再放量，并配自动的放行门槛（[AGENTOPS02-BP03](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops02-bp03.html)）。

清点交给 AWS Agent Registry，2026-08-31 GA。它是一个带审批流的目录：记录从 `DRAFT` 到 `PENDING_APPROVAL` 再到 `APPROVED` 或 `REJECTED`，状态变化发 EventBridge 事件，安全扫描、查重、人工审批都能挂上去；全程有 CloudTrail 审计，支持 CloudFormation、Terraform、CDK 管理，能用 RAM 跨账号共享成组织级注册表，记录可以打标签做成本分摊（[AWS Agent Registry is now generally available](https://aws.amazon.com/about-aws/whats-new/2026/08/aws-agent-registry-generally-available)）。

边界有两处：

- **自动发现只覆盖 AgentCore Runtime 和 AgentCore Gateway**，其他 agent 要手工建记录或填 URL 同步；AWS 的博客说跨云和本地的联邦发现还在规划。
- **灰度是按一个 runtime 做的**。整个 fleet 换模型，等于对几百个 runtime 逐个发版本、调权重，这件事要自己写脚本编排。

所以 AWS 的形状是：**工程师友好、一切皆代码，单个 agent 的发布最稳，fleet 级的动作要自己拼**。

### Google：从网络数据面出发

Google 在 Next '26 把 Vertex AI 改成了 Gemini Enterprise Agent Platform，治理侧是 Agent Identity、Agent Registry、Agent Gateway 三件套。和另外两家最大的不同是 Agent Gateway **从一开始就站在请求路径上**，而且管两个方向：客户端到 agent 的入站，和 agent 到任何地方的出站（[Agent Gateway overview](https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/gateways/agent-gateway-overview)）：

- 每个 agent 有一个 SPIFFE ID，默认用 mTLS 和 DPoP 做端到端的密码学认证；
- 默认拒绝所有连接，只有 IAM 策略显式授权了，agent 才能访问注册表里的工具和端点；
- Model Armor 扫提示词和工具返回，自然语言写的 semantic governance 策略在运行时约束 agent 怎么用工具；
- token management policies 能把 token 用量和估算花费归到每个 agent identity 上，共享预算用完了直接返回 HTTP 429（[Token management policies overview](https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/policies/token-management-overview)）。

顺带一提，Lyzr 的评分表说 Google "没有按 agent 的预算"，和 Google 的文档对不上。

健康这一项，Agent Evaluation 的 online monitor 按过滤条件从 Cloud Trace 抽样生产流量，持续打分，用来发现质量下降和行为漂移，这是三家里最完整的漂移方案。

边界在跨云。Agent Gateway 目前只有 Agent Runtime 和 Gemini Enterprise 上的托管形态可用，GKE、Cloud Run 和跨云形态都还写着 coming soon。跨云形态的设计是：管理面在 Google Cloud，你在 EKS、AKS、OpenShift 或自己机房的集群里装一个基于 Envoy 的轻量网关，agent 流量留在你的环境里，只有 Model Armor 这类策略检查回调 Google。Agent Registry 对外部 agent 目前要手工登记，跨云自动注册是 Limited Preview。

所以 Google 的形状是：**控制最深，设计上最接近 fleet，但跨云那一半还没交付**。

### 三家放在一起

| 指标 | 微软 | AWS | Google |
|---|---|---|---|
| 清点 | 注册表 GA；他云 agent 只读、手动同步 | Registry GA；自动发现只限 AgentCore | Registry GA；外部 agent 手工登记，跨云自动注册 Limited Preview |
| 健康 | Agent 365 活动视图、Foundry 评估；外部 agent 要接 SDK | CloudWatch 按版本出指标（Lens 推荐做法） | online monitor 持续评估漂移 |
| 版本 | 没有 fleet 级灰度 | 不可变版本 + endpoint 权重灰度，最完整 | 没查到与 AgentCore endpoint 权重灰度对应的机制 |
| 花费 | AI Gateway 成本上限（软上限）；Business Analytics 预览 | 标签做成本分摊，没有按 agent 拦截 | token 预算按 agent 归属，用完返回 429 |
| 触达 | 工具策略经网关下发；只管经过 AI Gateway 的流量 | 要自己写脚本逐个 runtime 推 | 网关上的策略对所有经过它的 agent 生效 |

三家在自己的云里都能管得很深，差别在于先补哪一项。真正的分水岭还是那句话：**agent 的流量不经过你的网关，你就只能看，不能改**。

## 三、跨云方案的四类做法

客户的 agent 不会只在一朵云上。Lyzr 那篇文章里的产品，加上前面几篇写过的开源组件，可以分成四类。

**第一类：SaaS 套件往外扩。** 这一类的厂商本来就是企业的系统台账，现在把 agent 也当成一种资产来管。

- **ServiceNow AI Control Tower** 按发现、观测、治理、安全、衡量五个维度组织，把 agent 当成和服务器、应用一样的 IT 资产，挂在 CMDB 上。Knowledge 2026 的官方新闻稿说它加深了和 AWS、Microsoft、NVIDIA 的集成，增强功能 2026-08 GA；媒体报道里提到它新增了约 30 个连接器（AWS、Azure、Google Cloud、SAP、Oracle、Workday 等），并能停用其他平台上的 agent，这两点我在官方新闻稿正文里没找到原文。它管的是"agent 是什么、能做什么"，不管发布，版本和灰度还在各自的构建流水线里。
- **Salesforce AI Control Plane** 是 2026-09-10 随 Trusted Enterprise AI Harness 一起宣布的，承诺发现、注册、身份、策略、生命周期、评估、观测和成本控制，覆盖 Salesforce 和第三方 AI（[Salesforce Introduces the Trusted Enterprise AI Harness](https://www.salesforce.com/news/stories/enterprise-ai-harness)）。新能力计划从 FY28 初（2027 年 2 月起）开始推出，在那之前，MuleSoft 的 Agent Scanners 能发现 Bedrock、Vertex AI、Copilot Studio 上的 agent，但只是发现。

这一类适合流程、审批、风险本来就跑在 ServiceNow 或 Salesforce 上的企业：agent 的台账跟着已有的系统台账走，最省组织成本。

**第二类：中立的控制面。** Lyzr OpenController 是代表，Kosmoy 这类产品也在这一格。它们的卖点是不属于任何一朵云，能部署在你自己的 VPC、机房甚至离线环境里，用 adapter 对接 AgentCore、Gemini Enterprise Agent Platform 和 Foundry。前面的截图说明了它的完整形态：清点和风险是一层，网关是另一层。

**第三类：云厂商往外延伸。** Agent 365 的 connected platforms、Google 的跨云 Agent Gateway、AWS 规划中的联邦发现，都是云厂商把自己的控制面伸到别的云上。这条路的好处是身份和策略只有一个源；问题是延伸出去的部分要么只读（微软），要么还没交付（Google、AWS）。

**第四类：开源自建。** 数据面用 [agentgateway](../agent-gateway/agentgateway的定位与扩展机制.md)，一个代理同时管 LLM、MCP、A2A；目录和审批用 [agentregistry](../agent-registry/agentregistry的定位与部署实践.md)；身份用 SPIFFE/SPIRE 加 Keycloak。数据面天然跨云，缺的是 owner、到期回收、风险分级这层治理，要自己写。[系列 05](../agent-platform/Agent基础设施系列05：完整Agent方案的三条路线.md) 的混合方案就是这一类和微软控制面的组合。

四类放在一起，共同的边界不变：**清点可以靠同步、扫描、连接器做到全量，触达只能靠流量经过网关**。所以选跨云方案，本质上是在选"把哪一个网关放到所有 agent 的路上"，以及"台账以谁为准"。

### 网关管到哪一层：LLM、AI 还是 Agent

说到网关，各家的名字很乱，管的范围也不一样。我按管到哪一层分成三档：

- **LLM Gateway**：只管 agent 调模型。统一别名、路由与失败切换、按 token 算钱、预算拦截。LiteLLM 起家时就是这一档。
- **AI Gateway**：在模型之外再管 MCP 工具，能封某个 server 或某个工具。
- **Agent Gateway**：再往前一步，管 agent 之间的 A2A 调用，以及 agent 的全部出入站连接。

有意思的是名字和实际范围对不上。Lyzr 的网关叫 LLM Gateway，菜单里却已经有 MCP servers 和 Tool policies，实际是 AI Gateway 这一档；微软叫 AI Gateway，范围也是模型加 MCP，A2A 留在 APIM。两家都没有把 A2A 和 Agent Card 列表放进网关：OpenController 的 Inventory 里，agent "用到的资源"只列了模型、MCP server、工具、API key、身份和知识库，没有"调用了哪个 agent"这条边。另一边，Google Agent Gateway、agentgateway、Kong、LiteLLM 都把 A2A 放进了网关。

两家都没有官方解释过为什么不放，我的理解是两派对网关的定义不同。

**把网关当成消费入口。** 这一派的网关只管 agent 要消费的资源：模型和工具能计价、能替换，路由、降级、预算这些网关能力都用得上。A2A 不一样：

- **它本身不花 token**。钱花在被调用的 agent 内部的模型调用上，如果那个 agent 也走网关，这笔账已经记过一次；
- **agent 不能像模型那样按成本或延迟互相替换**，路由和降级用不上；
- **"有哪些 agent"本来就是注册表的事**。网关再维护一份 Agent Card 目录，就和 Agent 365、OpenController 的 Registry 成了两个台账。

换句话说，A2A 调用本身就是一次 HTTP/JSON-RPC 请求，里面没有模型调用，要管的是谁能调、调多少次、怎么限流和审计，按请求次数计量，和业务 API 是一类流量。微软把它放在 APIM 而不是 AI Gateway，按这个角度就讲得通：APIM 按请求管 API，AI Gateway 按 token 管模型和工具。不过 A2A 也不完全等同于普通 API：一个 task 可以跑很久，中间有状态变化、流式返回和推送通知；agent 之间传的是自然语言写的任务和结果，可能带敏感数据，需要 DLP、内容安全这类检查。按 API 的方式管 A2A，身份和调用量能管住，内容这一层要另外补。

**把网关当成 agent 的网络边界。** 这一派不区分流量是去模型、去工具还是去另一个 agent，凡是出入 agent 的连接都要认证身份、检查策略、留下审计。Google 的 Agent Gateway 底下是 Secure Web Proxy 和负载均衡器，本质是零信任的网络边界，A2A 自然在里面。

对 fleet 来说，眼下第一种已经够用。最痛的"一次改全部"是换模型和改策略，落在模型和工具这一层；企业里多数多 agent 协作还发生在同一个框架、同一个进程里（一个 CrewAI crew、一张 LangGraph 图），根本不经过网络。等跨团队、跨平台的 A2A 调用多起来，第二种定义会变得必要，到时候 agent 调 agent 的权限和审计，也需要一个站在路径上的控制点。

## 四、选型时做一次换模型演练

Lyzr 那篇文章最后提了一个验收办法，我觉得比看功能表有用：假设某个 agent 依赖的模型要退役了，在候选平台上走一遍下面几步。

1. **清点**：问平台有多少 agent 在调这个模型，看多久能给出答案。
2. **灰度**：把其中 10% 切到替代模型。
3. **对比**：看新旧模型的错误率、升级人工次数和单次运行成本。
4. **回滚**：把其中一个 agent 一步切回去。
5. **收尾**：把剩下的全部切完，数一下有几个 agent 需要改代码。

第一步就要导表格的，答案已经有了。

按这个演练对照前面三家：AWS 在第 2 步和第 4 步最顺手，但第 1 步只能回答 AgentCore 上的 agent，第 5 步要自己写脚本；Google 在第 1 步到第 3 步都有现成的东西，只限 Google Cloud 里经过 Agent Gateway 的 agent；微软在第 1 步覆盖最广，但对他云的 agent 只能回答"有哪些"，回答不了"在调哪个模型"，除非那些 agent 改走 AI Gateway。

我的判断：

- **agent 只在一朵云上、规模在几十个，先用原生能力**，不必为 fleet 单独买产品。
- **跨云时先定台账和网关**。台账只能有一个源，这件事和[系列 05](../agent-platform/Agent基础设施系列05：完整Agent方案的三条路线.md) 的结论一样；网关可以每朵云一个，但策略要能从同一处下发。
- **"看得见"和"管得住"要分开验收**。演示里的发现和清点都很漂亮，要追问的是：这个 agent 的下一次模型调用，会不会经过你能改的那个点。

## 相关阅读

- [Agent 基础设施系列 01：三层划分与自建路线](../agent-platform/Agent基础设施系列01：三层划分与自建路线.md)——Framework、Runtime、Platform 的划分
- [Agent 基础设施系列 05：完整 Agent 方案的三条路线](../agent-platform/Agent基础设施系列05：完整Agent方案的三条路线.md)——Agent 365、AI Gateway 的细节与混合方案
- [agentgateway 的定位与扩展机制](../agent-gateway/agentgateway的定位与扩展机制.md)——开源网关这一层
- [agentregistry 的定位与部署实践](../agent-registry/agentregistry的定位与部署实践.md)——开源注册表这一层
- [Entra Agent ID 的双层身份模型](../../../../Azure/Foundary-Agent/Entra-Agent-ID的双层身份模型.md)——blueprint 与 agent identity

## 参考资料

- [7 Best Platforms for AI Agent Fleet Management](https://www.lyzr.ai/blog/best-platforms-for-ai-agent-fleet-management/)（厂商文章）
- [OpenController: Unified AI Agent Control Plane](https://www.lyzr.ai/opencontroller/)
- [Gartner Identifies Six Steps to Manage AI Agent Sprawl](https://www.gartner.com/en/newsroom/press-releases/2026-04-28-gartner-identifies-six-steps-to-manage-artificial-intelligence-agent-sprawl)
- [Connected platforms in Microsoft Agent 365](https://learn.microsoft.com/en-us/microsoft-agent-365/admin/connected-platforms)
- [What's new in Microsoft Agent 365: Ignite 2026](https://techcommunity.microsoft.com/blog/agent-365-blog/whats-new-in-microsoft-agent-365-ignite-2026/4571753)
- [AgentCore Runtime versioning and endpoints](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agent-runtime-versioning.html)
- [AGENTOPS02-BP03 Implement agent behavior versioning and rollback capabilities](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops02-bp03.html)
- [AWS Agent Registry is now generally available](https://aws.amazon.com/about-aws/whats-new/2026/08/aws-agent-registry-generally-available)
- [Manage agents, tools and skills at scale with AWS Agent Registry](https://aws.amazon.com/blogs/machine-learning/manage-agents-tools-and-skills-at-scale-with-aws-agent-registry)
- [What's new in Gemini Enterprise Agent Platform](https://cloud.google.com/blog/products/ai-machine-learning/whats-new-in-gemini-enterprise-agent-platform)
- [Agent Gateway overview](https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/gateways/agent-gateway-overview)
- [Token management policies overview](https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/policies/token-management-overview)
- [Continuous evaluation with online monitors](https://docs.cloud.google.com/gemini-enterprise-agent-platform/optimize/evaluation/evaluate-online)
- [Agent Registry key concepts](https://docs.cloud.google.com/agent-registry/concepts)
- [ServiceNow expands AI Control Tower](https://newsroom.servicenow.com/press-releases/details/2026/ServiceNow-expands-AI-Control-Tower-to-discover-observe-govern-secure-and-measure-AI-deployed-across-any-system-in-the-enterprise/default.aspx)
- [ServiceNow's AI Control Tower Gets Enforcement Muscle](https://theaieconomy.substack.com/p/servicenow-ai-control-tower-knowledge-2026-enforcement)
- [Salesforce Introduces the Trusted Enterprise AI Harness](https://www.salesforce.com/news/stories/enterprise-ai-harness)
- [Agent Fleet: Agentic AI Platform for Financial Services](https://www.acuityanalytics.com/agent-fleet/)
