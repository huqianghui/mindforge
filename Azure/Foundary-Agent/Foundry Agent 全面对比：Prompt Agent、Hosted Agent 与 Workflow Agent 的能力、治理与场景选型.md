---
title: Foundry Agent 全面对比：Prompt Agent、Hosted Agent 与 Workflow Agent 的能力、治理与场景选型
created: 2026-07-19
tags:
  - azure
  - foundry
  - agent
  - hosted-agent
  - prompt-agent
  - workflow-agent
  - governance
  - architecture
description: 全面对比 Microsoft Foundry 中三类 Agent——Prompt Agent（Foundry 帮你运行）、Hosted Agent（你自己运行，Foundry 帮你托管）与 Workflow Agent（多 Agent 编排层）——的架构、Memory、Planner、工具、治理、可观测性、模型自由度与成熟度，给出 80/20 场景选型规则，并专节回答 Voice Live 与两类 Agent 的组合关系
---

# Foundry Agent 全面对比：Prompt Agent、Hosted Agent 与 Workflow Agent 的能力、治理与场景选型

> 本文源于一次架构选型讨论（与 ChatGPT 的讨论，2026-07-19）：在 Microsoft Foundry 里建 Agent 时，Prompt Agent、Hosted Agent、Workflow Agent 到底差在哪？什么场景该用哪个？
> 姊妹篇（语音入口视角）：[[Voice Live系列02：架构演进——与Agent Service解耦后的合作模式与组合选型]]。

---

## 一、一句话定位

| 类型 | 一句话 | 类比 |
|------|--------|------|
| **Prompt Agent** | **Foundry 帮你运行 Agent**——你只提供 instruction + tools + model + knowledge 配置，运行时归微软 | Azure Functions / Copilot Studio 的技术版 |
| **Hosted Agent**（preview） | **你自己运行 Agent，Foundry 帮你托管**——你写代码打包成容器，Foundry 只管 Hosting / Identity / Scale / Monitoring | Kubernetes（自带工作负载，平台管底座） |
| **Workflow Agent**（public preview） | **编排多个 Agent 的确定性工作流层**——基于 Microsoft Agent Framework，可视化 + YAML 定义多 Agent 协作 | Logic Apps / Step Functions 的 Agent 版 |

三者不是同一维度的竞争关系：Prompt 与 Hosted 是**单个 Agent 的两种运行时归属**，Workflow 是**它们之上的编排层**。

---

## 二、架构与运行时：谁持有 Planner 和 State

### Prompt Agent：托管黑盒运行时

创建时只声明四样东西——instructions、tools、model、knowledge。其余全部由 Foundry Agent Service 运行时接管：

- **Planner 是黑盒**：怎么决定调哪个工具、怎么重试、怎么分步，微软控制，不可自定义。
- **State 由 Thread / Run 承载**：会话历史、run 状态由微软维护，retrieval、ranking、pruning、consolidation 策略都不归你管。
- **调用面**：Responses API（新版 Foundry Agent Service 已 GA，架构上取代旧 Assistants API 思路）。

### Hosted Agent：自带运行时的容器

你用任意框架写 Agent——LangGraph、Microsoft Agent Framework、OpenAI Agents SDK 都行——打包成 Docker 镜像推到 ACR，Foundry 拉取镜像、分配算力、签发专属 **Entra agent identity** 和 endpoint。

- **Planner 完全自定义**：LangGraph 的 StateGraph 节点、条件边、Human-in-the-loop 审批节点，随便设计。
- **State 自己设计**：复杂图状态、长期记忆（Mem0 / GraphRAG / Redis / PostgreSQL）自由接入。
- **隔离模型**：每个 session 一个 VM 级隔离 sandbox，带持久文件系统（`$HOME` 和 `/files`），支持 scale-to-zero + 有状态恢复——idle 15 分钟后算力回收，session 恢复时状态自动还原。
- **三种调用协议**（可同时暴露）：
  - `/responses` —— OpenAI Responses 兼容，对话式调用首选；
  - `/invocations` —— 任意 JSON 进出，适合 webhook 接收器、批处理、协议桥接（如 AG-UI）；
  - `/invocations_ws` —— 全双工 WebSocket，实时语音等双向流场景（见第六节）。

### Workflow Agent：编排层

基于 Microsoft Agent Framework 的多 Agent workflows（public preview）：在 portal 可视化设计器或 VS Code AI Toolkit 里用 YAML 定义确定性、有状态的编排流程，协调多个 Agent 按序/分支/并行工作。适合"单个 Agent 装不下"的业务流程——Prompt Agent 自身的多 Agent 能力有限，复杂协作主要靠这一层（或者干脆在 Hosted Agent 里用 LangGraph 自己编排）。

---

## 三、十维能力对比

| 维度 | Prompt Agent | Hosted Agent |
|------|-------------|--------------|
| **架构** | 声明式配置（instruction/tools/model/knowledge），运行时归微软 | 自带代码 + 容器，Foundry 只管 Hosting/Identity/Scale/Monitoring |
| **Memory** | Thread / Run History，微软控制 retrieval/ranking/pruning/consolidation | 完全自由：Mem0、GraphRAG、Redis、PostgreSQL、自建向量库 |
| **Planner** | 黑盒，不可自定义 | 任意：LangGraph 节点图、含 Human Approval 的审批流 |
| **Tool** | 官方工具集：AI Search、Bing Grounding、Code Interpreter、Functions、MCP | 无限制：容器内 ssh/kubectl/redis/SAP/Oracle/mainframe 客户端都行；另可通过 **Toolbox MCP endpoint** 用 Foundry 托管工具（Web Search、File Search、Code Interpreter、AI Search、custom MCP、A2A） |
| **State** | Thread 由微软维护 | 自己设计任意复杂 state；per-session sandbox 持久化 |
| **治理** | **Strong**：RBAC、Audit、Monitoring、Prompt Shield、Content Filter、Cost Tracking 全在 portal 开箱即用 | **Medium（内容层）**：Foundry 只看得见 Input/Output/Container 边界，内容安全、prompt 防护需在代码内自接；**身份层与 Prompt 同源**（专属 Entra agent identity + 显式 RBAC），详见第四节 |
| **可观测性** | Portal 直接看 Thread、Run、Tool Call、Token 消耗 | 协议库内置 OpenTelemetry（trace 进关联的 App Insights），但 Agent 内部推理步骤、planner 决策需自己埋点（LangSmith / Phoenix / 自定义 span） |
| **多 Agent** | 有限（connected agents），复杂协作靠 Workflow Agent | LangGraph 任意复杂 Supervisor / 层级结构，容器内自己编排 |
| **模型** | 仅 Foundry 支持的模型（GPT-5 / GPT-4.1 / Phi 等） | 任意模型：Azure 上的 GPT-5，也可以 Claude / Gemini / DeepSeek / Qwen / Llama（第三方模型 at your own risk，出口流量与合规自负） |
| **成熟度** | **GA**（新版 Foundry Agent Service 已 GA，唯一生产级选项） | **Preview**；multi-agent workflows 也是 public preview |

一条判断主线贯穿所有维度：**是否需要自己控制 Agent Runtime**。不需要 → Prompt Agent 拿全套托管红利；需要 → Hosted Agent 拿全部自由度，代价是治理和可观测性要自己补。

---

## 四、治理与安全：三类 Agent 的分层对比

治理是选型中差距最大、也最容易被低估的维度。但"Prompt 强、Hosted 弱"的笼统说法并不准确——把治理拆成**身份、内容、审计、成本**四层看，差异的真实分布是：**三者在身份层站在同一套 Entra Agent ID 体系上，分水岭在内容层和可观测性的内层**。

### 4.1 身份与访问层：三者同一套 Entra Agent ID 体系

Foundry 把 agent 身份统一建在 **Microsoft Entra Agent ID** 上——一种专为 AI agent 设计的 Entra 身份类型，两层模型：

- **Agent Identity Blueprint**：治理一类 agent 身份的模板对象，持有 OAuth 凭据，负责身份的创建/更新/删除（身份签发权）；
- **Agent Identity**：具体 agent 的专属 service principal——agent 调工具时，Foundry 用 blueprint 凭据向 Entra 换取该身份的 token，再认证下游服务，全程无 API key。

关键含义：**人类身份的那套治理能力——Conditional Access、Identity Protection、audit log、identity governance——全部延伸到了 agent 身份上**，Entra admin center 有专门的 Agent identities 视图。

三类 Agent 在这一层的落地方式：

| | Prompt Agent | Hosted Agent | Workflow Agent |
|---|---|---|---|
| 身份分配 | 自动管理；**published 后获得专属 agent identity**，unpublished 共用 project 级身份 | **部署时自动创建 per-agent 专属身份**；另有 project managed identity 负责基础设施（如 ACR 拉镜像），与运行时身份分离 | 编排层自身是托管 artifact；身份治理落在**每个成员 Agent** 上，各用各的身份 |
| 默认权限 | 官方工具链内置授权 | 默认仅 project endpoint 模型推理 + session storage | 继承成员 Agent 权限 |
| 扩展权限 | portal 配置工具连接 | **手动给 agent 的 Entra ID 授 RBAC**——访问自己的 Storage/Key Vault/SQL 需逐项授权，天然最小权限 | 按成员逐个授权 |

值得强调：Hosted Agent 在身份层**不弱反强**——"每个 agent 一个 SP + 手动 RBAC"意味着能精确审计"哪个 agent 访问了哪个资源"，比黑盒运行时的隐式授权更可控。当前限制：仅部分工具支持 agent identity 认证（MCP 在列）；unpublished agent 用共享身份，治理粒度在发布后才完整。

### 4.2 内容安全层：真正的分水岭

| | Prompt Agent | Hosted Agent | Workflow Agent |
|---|---|---|---|
| Prompt 注入防护 | **Prompt Shield 内置**，零代码 | 自建（代码内接检测） | 取决于成员：prompt agent 成员有内置，hosted 成员自建 |
| 内容过滤 | **Content Filter 内置**在运行时 | 自己调用 Azure AI Content Safety 或自建 | 同上，按成员 |
| 第三方模型风险 | 不适用（仅 Foundry 模型） | Claude/Gemini 等 at your own risk，数据出境合规自负 | 若含 hosted 成员则同左 |

这一层是"Medium 治理"说法的真实来源：Foundry 对 Hosted Agent 的内容可见性止于容器边界（Input/Output/Container 健康），**容器内的每一次 LLM 调用都在平台防线之外**。

### 4.3 审计与可观测性层

| | Prompt Agent | Hosted Agent | Workflow Agent |
|---|---|---|---|
| 平台侧可见 | Thread、Run、Tool Call、Token 全在 portal | 容器边界遥测；协议库内置 OTel 骨架（`/readiness`、OTLP export、graceful shutdown 由 `azure-ai-agentserver-core` 继承），trace 进关联 App Insights | **conversation tracing + agent monitor** 在 portal 内置；流程每步（哪个 agent、什么输入输出）可追溯 |
| 内层可见 | 运行时黑盒，但微软替你记录了标准事件 | **planner 决策、中间 LLM 调用要自己埋 span**（LangSmith/Phoenix/自定义） | 编排层透明（YAML 即流程），成员内层按各自类型 |
| 流程审计 | 单 agent 无流程概念 | 自己代码自己审 | **流程即配置**：YAML 版本化，业务流程本身是可 diff、可回溯的 artifact——这是 Workflow 相对代码编排最大的治理优势 |

### 4.4 成本层

- **Prompt Agent**：Token 级 Cost Tracking 开箱即用，portal 直接看。
- **Hosted Agent**：算力（sandbox）+ token 双成本；跨模型（尤其第三方 API）的成本聚合要自己算。
- **Workflow Agent**：成员成本可分别追踪，但"一次业务流程花多少钱"的端到端归集目前要自己汇总。

### 4.5 治理选型直觉

1. **强合规组织（金融/医疗/政府）**：Prompt Agent 的开箱内容安全 + 审计仍是权重最高的理由——用 Hosted 复刻同等**内容层**治理水位的工程成本常被严重低估。
2. **但"要治理就不能用 Hosted"是误区**：身份与访问层三者同源（Entra Agent ID），Hosted 甚至因显式 RBAC 更可审计。Hosted 的治理缺口集中在内容层和内层可观测性，是**可以用工程补的**（Content Safety API + OTel 埋点），只是要把这笔工程量算进选型。
3. **多 Agent 流程要审计**：优先 Workflow Agent 而不是 Hosted 内代码编排——"流程即 YAML"天然满足"业务流程可回溯"的合规诉求。

---

## 五、Workflow Agent：什么时候需要编排层

Prompt Agent 单体能力有边界：planner 黑盒、多 Agent 协作有限。当业务需要**多个职责单一的 Agent 按确定性流程协作**时，有两条路：

| 路线 | 形态 | 适合 |
|------|------|------|
| **Workflow Agent**（multi-agent workflows） | portal 可视化设计器 / VS Code AI Toolkit + YAML，基于 Microsoft Agent Framework，确定性、有状态编排 | 想留在托管体系内：流程可视化、审计友好、不写编排代码 |
| **Hosted Agent 内自编排** | LangGraph / Agent Framework 代码级编排，整个多 Agent 系统打包成一个容器 | 编排逻辑复杂到 YAML 表达不了：动态拓扑、复杂条件路由、跨模型调度 |

两条路的分界线和第三节的主线一致：**编排逻辑是否需要代码级控制**。Workflow Agent 本质是把"多 Agent 协作"也纳入托管治理体系——流程即配置、每步可审计；Hosted 自编排则是把编排也当成自己代码的一部分。

需要注意 Workflow Agent 目前是 public preview，YAML schema 与设计器能力仍在演进，生产依赖需锁版本评估。

---

## 六、Voice Live 与两类 Agent 的组合：方向相反的两条路径

姊妹篇[[Voice Live系列02：架构演进——与Agent Service解耦后的合作模式与组合选型|Voice Live 文章]]讲了 Voice Live 挂 Agent 的模式三。一个自然的追问：**这个 `agent_id` 绑定对 Hosted Agent 也有效吗？**

结论：**无效——Voice Live 的 agent 绑定是 Prompt Agent 专属路径；Hosted Agent 的语音方案是反向组合。**

### 路径一（Prompt Agent）：Voice Live 在外，Agent 在后

```
Client → Voice Live API（语音壳）→ Agent Runtime（thread/run，微软托管）→ 工具
```

- 连接参数：旧版 `agent_id` + `project_id`；新版（Foundry new portal）改为 `agent_name` + `project_name`，可选 `agent_version`（灰度固定版本）、`conversation_id`（续接上下文）、`foundry_resource_override`（跨资源）。
- Voice Live 服务端把每个语音 turn 转发给托管运行时，Agent 用自己的模型推理、执行工具，结果流回 Voice Live 合成语音。
- 约束：agent 模式**不支持 key 认证**，必须 Microsoft Entra ID；session `instructions` 禁用（prompt 归 Agent 管）。
- 这是官方 public preview 的"voice-native agents"路径，与新版 Foundry Agent Service（即 Prompt Agent 体系）绑定发布。

### 路径二（Hosted Agent）：Agent 容器在外，Voice Live 在内

Hosted Agent 不接入 Voice Live 的 agent 绑定，而是自己声明 `invocations_ws` 协议，暴露全双工 WebSocket：

```
wss://<account>.services.ai.azure.com/api/projects/<project>/agents/<agent>/endpoint/protocols/invocations_ws?api-version=v1&agent_session_id=<id>
```

```
Client → invocations_ws（平台透明代理，原始字节转发）→ 你的容器
                                                        └── 容器内语音管线：Voice Live SDK / Pipecat / LiveKit Agents
```

- 平台在 APIM 层做认证（Entra bearer token，容器看不到）和路由，之后**不解析、不转换、不缓冲**任何帧——语音管线完全跑在你的容器里。
- 官方验证过的三个容器内语音框架：**Microsoft Voice Live**、Pipecat、LiveKit Agents。也就是说 Voice Live 在这条路径里从"前门"降级为"容器里的一个组件"——你的代码调用 Voice Live 获得 STT/TTS/VAD 能力，编排权在你手里。
- 级联（STT→LLM→TTS）和 speech-to-speech（gpt-realtime）两种管线都可以在容器内跑。

### 为什么 agent_id 调不通 Hosted Agent

机制上就不兼容：Voice Live agent 模式的服务端编排依赖**托管运行时的 thread/run**——而 Hosted Agent 没有托管运行时，它的调用面只有 `/responses`、`/invocations`、`/invocations_ws` 三种容器协议。即使 Hosted Agent 暴露了 OpenAI 兼容的 `/responses`，当前官方文档没有任何"Voice Live agent 绑定指向 hosted agent"的支持路径，属未定义行为。

### Hosted 语音路径的硬约束（选型前逐项确认）

| 约束 | 值 | 影响 |
|------|-----|------|
| WebSocket 帧上限 | 1 MB（超限 close 1009） | 音频分帧要小（20ms PCM@16kHz ≈ 640 字节，安全） |
| 单连接时长 | ~30 分钟（平台滚动回收，close 1001） | 客户端必须实现带同一 `agent_session_id` 的重连；平台不重放丢失帧 |
| Session idle | 15 分钟缩容 | 状态持久化、恢复冷启动可预期但非零 |
| Sandbox 算力 | 最高 2 vCPU / 4 GiB（语音建议 ≥1 vCPU / 2 GiB） | 重管线（本地 VAD + 多模型）要精打细算 |
| WebRTC | **无托管 WebRTC**（无 TURN/SFU/signaling 服务） | 要 WebRTC 得客户端+容器自己实现，`invocations_ws` 只当 signaling 通道 |
| 电话接入 | 无原生 PSTN | 用 ACS / Twilio 把电话音频桥到 `invocations_ws` |

### 语音场景的选型规则

| 需求 | 选择 |
|------|------|
| 语音 Agent + 官方工具生态够用 + 要托管治理 | **Prompt Agent + Voice Live agent 绑定**（模式三）——最短路径，preview 中最接近官方主推 |
| 语音 Agent + 自定义 planner/memory/跨模型 | **Hosted Agent + 容器内 Voice Live SDK + `invocations_ws`**——自由度全拿，但重连/缩容/WebRTC/电话全自己扛 |
| 只要语音不要 Agent 复杂度 | Voice Live 独立会话（模式二），见姊妹篇 |

---

## 七、场景选型：80/20 规则

### 80%：Prompt Agent 覆盖的企业场景

RAG 问答、FAQ、企业搜索、CRM 助手、Voice Agent（挂 Voice Live）、内部 Copilot——这些场景的共性是：**官方工具集够用、不需要自定义 planner、治理是刚需**。Prompt Agent 是目前唯一 GA 的选项，也是这些场景的默认答案。

### 20%：必须上 Hosted Agent 的信号

出现以下任何一条，Prompt Agent 就装不下了：

1. **复杂 Workflow**：多步、条件分支、循环，且逻辑复杂到 Workflow Agent 的 YAML 表达不了；
2. **长期 Memory**：跨会话的用户级记忆（Mem0/GraphRAG），不是 Thread 能承载的；
3. **Graph State**：需要显式状态机（LangGraph StateGraph）；
4. **复杂 Multi-Agent**：Supervisor、层级委派、动态拓扑；
5. **Human Approval**：审批节点嵌在 Agent 流程中间；
6. **跨模型编排**：按任务路由到 Claude/Gemini/DeepSeek 等非 Foundry 模型；
7. **自定义 Planner / Agentic Coding**：运行时行为本身是产品的核心竞争力。

### 演进方向

- **Prompt Agent → 企业 Copilot 的标准底座**：托管治理 + 官方工具 + Voice Live 原生集成，微软会持续往这条线堆能力；
- **Hosted Agent → 复杂 Agent 系统的运行时**：对标"把任意 Agent 框架产品化部署"，配合 Agent Framework 生态成长；
- **Workflow Agent → 两者之间的粘合层**：让多个托管 Agent 组成业务流程而不必下沉到代码。

类比记忆：**Prompt Agent 之于 Hosted Agent，如 Azure Functions 之于 Kubernetes**——前者用运行时换省心，后者用运维换控制权。

---

## 八、小结

1. 三者定位：**Prompt Agent = Foundry 帮你运行；Hosted Agent = 你运行、Foundry 托管；Workflow Agent = 之上的确定性编排层**。选型主线只有一条：是否需要自己控制 Agent Runtime。
2. 治理要分层看：**身份层三者同源**——都建在 Entra Agent ID（blueprint + agent identity）上，Conditional Access/Identity Protection/audit 对 agent 身份全部适用，Hosted Agent 的专属 SP + 显式 RBAC 甚至更可审计；**真正的分水岭在内容层**（Prompt Shield/Content Filter 只有 Prompt Agent 内置）和内层可观测性（Hosted 的 planner 决策要自己埋点）；Workflow Agent 的独特优势是"流程即 YAML"的流程审计能力。
3. Voice Live 与两类 Agent 的组合**方向相反**：Prompt Agent 用 agent 绑定（Voice Live 在外），Hosted Agent 用 `invocations_ws`（Voice Live 作为容器内组件）——`agent_id` 直连 Hosted Agent 无文档支持。
4. 成熟度梯度要进决策：Prompt Agent（GA）> Hosted Agent（preview）≈ Workflow Agent（public preview）。生产系统当前的稳妥解是 Prompt Agent 打底，Hosted Agent 用于确实装不下的 20% 场景并锁版本。

---

## 九、开放问题（待验证/后续讨论）

1. **Hosted Agent 的 SLA 与配额**：preview 阶段 sandbox 算力（2 vCPU/4GiB 上限）能否满足重管线；GA 后规格与定价。
2. **Voice Live × Hosted Agent 的官方打通**：未来是否会支持 agent 绑定指向暴露 `/responses` 的 hosted agent（当前未定义）。
3. **Workflow Agent 的表达力边界**：YAML 能表达的分支/循环/错误处理复杂度上限，何时必须降级到代码编排。
4. **治理水位复刻成本**：在 Hosted Agent 里复刻 Prompt Agent 同等治理（内容安全+审计+成本追踪）的实际工程量评估。
5. **第三方模型合规**：Hosted Agent 调 Claude/Gemini 的数据出境、合规与"at your own risk"的边界在企业场景如何落地。
6. **多 Agent 的身份模型**：Workflow 中多个 Agent 协作时 Entra agent identity 的权限边界与最小权限实践。
7. **成本对比精算**：同一场景 Prompt Agent（token 计费）vs Hosted Agent（算力+token）的真实成本曲线。

---

## 参考

- 与 ChatGPT 的讨论：Prompt Agent vs Hosted Agent 十维对比（2026-07-19）
- [Foundry Agent Service Overview — Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-foundry/agents/overview)
- [What are hosted agents? — Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-foundry/agents/concepts/hosted-agents)
- [Agent identity concepts in Microsoft Foundry — Microsoft Learn](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/agent-identity)
- [Introducing Multi-Agent Workflows in Foundry Agent Service — Microsoft DevBlogs](https://devblogs.microsoft.com/foundry/introducing-multi-agent-workflows-in-foundry-agent-service)
- [Build a voice agent with hosted agents — Microsoft Learn](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/build-voice-agent)
- [Quickstart: Voice Agent with Foundry Agent Service — Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/voice-live-agents-quickstart)
- [Public preview: Voice-native agents in Microsoft Foundry — Microsoft Community Hub](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/public-preview-voice-native-agents-in-microsoft-foundry/4502756)
- [Multi-agent workflows in Foundry Agent Service — Microsoft DevBlogs](https://devblogs.microsoft.com/foundry/)
- 相关笔记：[[Voice Live系列02：架构演进——与Agent Service解耦后的合作模式与组合选型]]、[[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]]
