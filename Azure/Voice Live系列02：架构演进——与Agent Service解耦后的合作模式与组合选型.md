---
title: Voice Live 系列 02：架构演进——与 Agent Service 解耦后的合作模式与组合选型
created: 2026-07-19
tags:
  - azure
  - voice-agent
  - voice-live-api
  - realtime
  - agent
  - architecture
description: 从"Agent 页面选不到 gpt-realtime"这个困惑入手，梳理 Voice Live API 与 Agent Service 解耦后的三种合作模式、直连 Realtime 到全托管 Agent 的选型光谱、原生 Realtime 与级联两类模型组合的优劣、性能特征与功能组合选型
---

# Voice Live 系列 02：架构演进——与 Agent Service 解耦后的合作模式与组合选型

> 本文源于一次实际困惑的排查讨论（[与 ChatGPT 的完整讨论](https://chatgpt.com/share/6a5c24ec-5e68-83ec-9a8d-c5ad209bd815)，2026-07-19）：Azure AI Agent 是否仍可以通过 Voice Live API 使用 gpt-realtime？为什么 Agent 创建页面选不到 gpt-realtime 了？
> 实现层架构细节（WebSocket + WebRTC 双通道、Avatar、连接时序）见 [[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]]。

---

## 一、问题：Agent 页面为什么选不到 gpt-realtime 了？

在 Azure AI Foundry Portal → Agent → Create Agent 页面创建 Agent 时，Foundation Model 列表里能看到 GPT-5、GPT-4.1、GPT-4o、Phi 等模型，但 **gpt-realtime 消失了**。

先说结论：**这不代表 Azure 不再支持 GPT-Realtime，而是 Voice Live API 与 Agent Service 已经解耦**。gpt-realtime 不再作为 Agent 的 Foundation Model 暴露；如果目标是做语音 Agent，应该从 Voice Live API 发起会话，在会话中连接 Agent——而不是期望在 Agent 页面直接选择 gpt-realtime。

### 为什么要把 Realtime 从 Agent Model Picker 移除

根本原因是**两者的生命周期和职责完全不同**：

| | Realtime Model | Agent Runtime |
|---|---|---|
| 交互形态 | 双向 WebSocket、Streaming Audio | Thread、Responses API |
| 核心关注 | latency（<300ms）、interruption、turn detection、audio token | Tool execution、Planning、Memory、长上下文 |
| 生命周期 | 一次实时会话（秒级往返） | 跨轮次的任务执行（可异步、可长时间运行） |

Realtime Model 为低延迟双工语音而生，不适合承担 Agent 的规划与工具编排职责；Agent Runtime 需要的长上下文、Async Tool、Thread 管理也不是 Realtime 的设计目标。Microsoft 因此把两者职责分离。

还有一个更大的背景：**Foundry 正在统一到 Responses API 架构**。Voice、Responses、Agent 都在逐步围绕 Responses API 重组，而不是沿用旧的 Assistants API 思路——Agent UI 和模型选择的变化正是这次架构调整的表层现象。

---

## 二、架构变化：从"Agent 持有 Realtime"到"Voice Live 持有 Realtime"

调整前后的调用链方向发生了反转：

```
旧模式（Agent 为中心）              新模式（Voice Live 为中心）

Browser                            Browser
   ↓                                  ↓
Agent（选 gpt-realtime 为底座）     Voice Live API
   ↓                                  ├── Speech（STT/TTS）
Realtime Model                        ├── Echo cancellation
                                      ├── Turn detection
                                      ├── Noise suppression
                                      ├── Avatar
                                      ↓
                                   模型层：gpt-realtime（Voice Live 自己连接）
                                   或（optional）绑定 Azure AI Agent
                                      ↓
                                   Tool / MCP / Knowledge / Search
```

> 注意：图中"模型层"是二选一而非串联——独立会话模式由 Voice Live 直连 realtime/文本模型；Agent 模式则将会话绑定到 Agent，由 Agent 自己的模型负责推理（机制详见第三节模式三）。

关键变化有三点：

1. **模型归属转移**：以前是 Agent 选择 Realtime 作为底座；现在是 Voice Live 自己连接并管理 Realtime 模型，Agent 不需要（也不应该）知道底层是不是 Realtime。
2. **语音能力下沉到 Voice Live**：STT、TTS、echo cancellation、turn detection、noise suppression、avatar 全部由 Voice Live 统一提供，开发者不再手工编排多个组件——官方称这消除了自建管线中每轮对话 2~3 秒的编排开销。
3. **Agent 成为可选挂载项**：Voice Live 建立 Session 时通过 `agent_id` + `project_id` 参数即可连接 Azure AI Agent，Agent 的 prompt、工具配置由 Agent 自身管理，客户端代码无需重复配置。

所有 Voice Live 原生支持的模型都是 **fully managed**——不需要自己部署模型、做容量规划或预配吞吐。

---

## 三、与 Agent 的三种合作模式

解耦之后，实际存在三种可选的组合方式：

### 模式一：传统 Agent（不带语音）

在 Agent 页面选择 GPT-5 / GPT-4.1 / GPT-4o / Phi 等文本模型创建 Agent，走 Responses API。适合纯文本/多模态但非实时语音的场景。**这条路线上已经没有 gpt-realtime**。

### 模式二：Voice Live 独立会话（不挂 Agent）

直接向 Voice Live WebSocket endpoint 发起会话：

```
wss://<resource>.services.ai.azure.com/voice-live/realtime?api-version=2026-04-10
```

在 session 配置中直接指定模型和 instructions，工具调用通过 session 内的 function calling 完成。

- **优势**：链路最短、延迟最低；配置全部在客户端/中间层，灵活直接。
- **劣势**：prompt、工具、业务逻辑全部散落在 session 代码里；多场景/多变体时难以维护；无法复用 Agent Service 的 Thread、Knowledge、MCP 工具生态。
- **适合**：单一场景的轻量语音助手、latency 极度敏感、逻辑简单的场景。

### 模式三：Voice Live + Agent Service（官方推荐的 Voice Agent 方式）

建立 Voice Live Session 时传入 `agent_id` 和 `project_id`，将会话接到 Foundry Agent 上：

```
Client → Voice Live API（语音层）→ Azure AI Agent（推理层）→ MCP / Functions / Knowledge
```

#### 桥接机制：会话绑定，而非 function call

一个容易误解的点：Voice Live 与 Agent 的衔接**不是** realtime 模型通过 function call 去调用 Agent，而是**连接层的会话绑定 + 服务端编排**：

1. **绑定发生在 WebSocket 连接建立时**。endpoint 对所有模式相同，区别只在 query 参数——`model` 与 `agent_id`+`project_id` 二选一。Agent 模式下不指定模型，"用什么模型思考"由 Agent 自己的配置决定：

   ```
   # 独立会话模式：?api-version=2026-04-10&model=gpt-realtime
   # Agent 模式：  ?api-version=2026-04-10&agent_id=xxx&project_id=xxx
   ```

2. **推理与工具调用都发生在 Agent Runtime 内部**。每个用户 turn 由 Voice Live 服务端转发给 Agent Runtime（thread/run），Agent 用自己的模型做推理、planning、tool call（MCP/Functions/Knowledge 均在 Agent 侧执行），输出流回 Voice Live 走语音合成。

3. 两个文档证据佐证这一分工：Agent 模式下 session 的 `instructions` 属性**不可用**（prompt 归 Agent 管，Voice Live 只是语音壳）；`interim_response` 配置提供 `TOOL` / `LATENCY` 触发器——Agent 执行工具期间 Voice Live 可自动生成"稍等"类过渡语，说明工具执行对 Voice Live 是不透明的黑盒，它只感知延迟。

- **优势**：
  - prompt 和配置内置在 Agent 中管理，改对话逻辑**不需要改客户端代码**；
  - Agent 封装复杂逻辑与行为，天然支持多场景/多业务变体（每个变体一个 Agent，客户端只换 agent_id）；
  - 复用 Agent Service 的工具生态（MCP、Functions、Azure AI Search / Knowledge）；
  - 集成流程简化——连接只需要 agent_id，其余设置由服务端内部处理。
- **劣势**：
  - 多一跳 Agent Runtime，工具编排复杂时响应间隔会拉长（语音场景需要用 filler/确认语等手段掩盖工具执行延迟）；
  - Agent V1 与 V2（新 Foundry portal）的接入方式存在差异，V2 的 Voice Live 接入文档一度滞后于功能本身，需留意 api-version 与 portal 版本的匹配。
- **适合**：企业级 Voice Agent——客服、外呼、需要知识库/工具调用、多业务线复用的场景。

---

## 四、选型光谱：直连 GPT Realtime API，还是 Voice Live？

一个自然的追问：realtime 模型本身原生支持 function calling——如果追求极致性能，是否应该跳过 Voice Live，直接用 GPT Realtime API 构建？

答案是：可以，这正是选型光谱的最左端。把三条语音路线放在一条轴上看：

```
控制力 / 极致尾延迟 ◄──────────────────────────────► 托管程度 / 工程省力

直连 Realtime API          Voice Live 模式二          Voice Live 模式三
（自建语音工程）            （托管语音层）              （托管语音层 + Agent）
```

### 光谱各点的差异

| 维度 | 直连 Realtime API | Voice Live 模式二 | Voice Live 模式三 |
|------|------------------|------------------|------------------|
| 网络路径 | 客户端 WebRTC / SIP **直连模型**，最短 | 经 Voice Live 服务层（WebSocket 为主） | 同左，再加 Agent Runtime 一跳 |
| 模型部署 | 自建 deployment，可上 **provisioned throughput**（尾延迟可控、容量独占） | fully managed 共享容量（均值低，尾部不受你控制） | 由 Agent 配置，managed |
| Function call | realtime 模型原生发起，工具在**自己进程**执行 | session 内 function calling，自己处理 | **Agent Runtime 内**执行（MCP / Functions / Knowledge） |
| Turn detection | 仅模型自带 server VAD | `azure_semantic_vad`（语义级，中文/嘈杂环境体验更好） | 同左 |
| 语音增强 | 无——降噪、回声消除全自建 | 全套：降噪 / 回声消除 / custom voice / avatar | 同左 |
| Prompt / 逻辑管理 | 全在自己代码 | session `instructions` | Agent 侧集中管理（session `instructions` 禁用） |
| 工具延迟掩盖 | 自己写 filler 逻辑 | 自己写 | `interim_response`（TOOL/LATENCY 触发）内置 |
| 运维 | deployment、region、配额、容量规划全自理 | 免 | 免 |

### 三笔账：直连"更快"只在特定条件下成立

**第一笔：延迟瓶颈的真实排序。** 端到端延迟大头是**模型推理 > 网络 RTT > 语音处理层**。Voice Live 增值层（semantic VAD、降噪、回声消除）的开销是毫秒级；如果场景工具调用密集，工具执行时间才是主导项——这时直连省下的几十 ms 没有意义。

**第二笔：要自己重建的东西。** 直连后只有模型自带的 server VAD，没有降噪/回声消除/custom voice/avatar，工具执行期间的过渡话术要自己写。**抢话和误打断带来的体验损失，用户感知远大于 50ms 的延迟差**——语音场景里"体验工程"往往比裸延迟更值钱。

**第三笔：运维成本。** 直连需要自己做 deployment、容量规划、region 选型、配额管理；换来的是 PTU 级的确定性。

### 决策规则

| 条件 | 选择 |
|------|------|
| 工具少而快（<3 个、百 ms 级）+ 有实时音频工程能力 + 需要 PTU 级尾延迟保证 | **直连 Realtime API（WebRTC）+ 自管 function call** |
| 需要 custom voice / avatar / 降噪 / 好的中文打断体验 | Voice Live 模式二——保留低延迟，拿到语音增强层 |
| 工具重、知识库、多业务线复用 | Voice Live 模式三，接受 Agent 跳延迟，用 interim response 掩盖 |

一句话：**延迟瓶颈在模型和工具，不在 Voice Live 这层壳；只有当模型（PTU）和工具（本地快工具）都已压到极限、且愿意自建语音工程时，直连才是最后一段收益。**

---

## 五、模型组合：原生 Realtime vs 级联，性能与能力的取舍

Voice Live 支持的模型分为两大类，**本质是端到端 speech-to-speech 与级联（cascaded）两条技术路线**，Voice Live 把它们统一在同一个 API 后面：

### 两类模型组合

| 类别 | 模型 | 音频路径 |
|------|------|---------|
| 原生 Realtime（端到端） | `gpt-realtime`、`gpt-realtime-1.5`、`gpt-realtime-mini` | 模型原生音频进出，可选叠加 Azure TTS 声音（含 custom voice） |
| 级联（文本模型 + Azure 语音） | `gpt-5`、`gpt-4.1`、`gpt-4.1-mini`、`gpt-4o`、`gpt-4o-mini`、`phi` 系列 | Azure STT 转文本 → 模型推理 → Azure TTS 合成（含 custom voice） |

### 优劣对比

| 维度 | 原生 Realtime 系列 | 级联（GPT-5 / GPT-4.1 / Phi + Azure STT/TTS） |
|------|-------------------|---------------------------------------------|
| 延迟 | 最低（模型直接消费/产出 audio token，<300ms 级） | 多两跳（STT、TTS），但 Voice Live 内部流水线化，仍可控制在亚秒级 |
| 智能程度 | 推理能力弱于同代旗舰文本模型 | 可用 GPT-5 等最强推理模型，长上下文、复杂工具规划更强 |
| 语音自然度 | 原生语音韵律自然，对语气/情绪的理解和表达更好 | 取决于 TTS；可用 Azure custom voice 定制品牌音色 |
| 打断/轮次体验 | 原生 interruption、turn detection 体验最佳 | 依赖 Voice Live 的 semantic VAD / turn detection 补齐 |
| 上下文限制 | 受 Realtime 底座 token 限制约束（约 128k 级，随部署与配额而异） | 随所选文本模型的上下文能力 |
| 成本 | audio token 计费，成本较高；mini 版可显著降低 | 文本模型 token + STT/TTS 计费；mini/Phi 组合可做到很低 |
| 适合场景 | 强调"像人"的自然对话：陪伴、口语教练、高端客服 | 强调"答得对"的业务对话：知识问答、流程办理、工具调用密集型 |

### 选型直觉

- **对话体验优先** → `gpt-realtime`（或 1.5）；预算敏感就用 `gpt-realtime-mini`。
- **推理与工具准确性优先** → `gpt-5` / `gpt-4.1` 级联组合；配 custom voice 保品牌一致性。
- **成本极度敏感 / 边缘轻量** → `phi` 系列或 `gpt-4o-mini` / `gpt-4.1-mini` 级联。
- **两头都要** → 用模式三挂 Agent：Voice Live 语音层（semantic VAD + HD 音色）保交互体验，Agent 配置强模型做复杂推理与工具调用，`interim_response` 掩盖工具延迟（体验与智能分层）。

---

## 六、功能组合：Voice Live 提供的语音增强层

无论选哪类模型，Voice Live 的语音增强能力都是统一提供、按需开启的，这是它相对"裸用 Realtime API"最大的增值：

| 功能 | 说明 | 组合建议 |
|------|------|---------|
| Turn detection（semantic VAD） | 语义级轮次检测，判断用户是否说完 | 所有场景默认开；级联模型必开（弥补非原生短板） |
| Echo cancellation | 回声消除 | 免提/音箱设备场景必开 |
| Noise suppression | 噪声抑制 | 呼叫中心、户外/嘈杂环境必开 |
| Azure TTS voices + Custom voice | 数百个标准音色 + 品牌定制音色 | 级联模型的输出端；Realtime 模型也可选择叠加 |
| Avatar（数字人） | 音视频同步的虚拟形象输出 | 需要视觉在场感的场景（导览、数字员工前台） |
| WebSocket / WebRTC | 服务端集成用 WebSocket；客户端实时音频推荐 WebRTC | 协议选型详见 [[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]] |

与裸用 GPT Realtime API 相比（后者只提供模型 + WebRTC/SIP/WebSocket 传输），Voice Live 把 STT/TTS/VAD/降噪/Avatar 打包成了平台能力——这正是"用 Voice Live 而不是自己拼 STT + LLM + TTS 管线"的核心理由。

---

## 七、组合选型速查：功能与性能对照

### 7.1 极致性能的构建方案（直连 Realtime 蓝图）

如果结论是"要极致性能"，具体应该这样搭——延迟是逐层压出来的，每一层都有明确的优化动作：

| 层 | 构建动作 | 压掉的延迟 |
|----|---------|-----------|
| 传输层 | 客户端 **WebRTC 直连**模型 endpoint（电话场景用 SIP），不经任何后端代理/中转服务 | 中转跳 + 服务端排队，几十~上百 ms |
| 模型层 | `gpt-realtime` 自建 deployment + **provisioned throughput**；deployment region 与用户就近 | 共享容量的排队抖动，P99 从秒级压回百 ms 级 |
| 工具层 | function call 由 realtime 模型原生发起；工具**少而快**（<3 个、百 ms 级），部署在模型同 region 或客户端本地；能预取的提前预取 | 工具往返，通常是最大的可变项 |
| 会话层 | system prompt 精简（长 prompt 拉高首 token 时间）；上下文定期截断/摘要，避免逼近 128k 后变慢 | 首响应 TTFT，几十~几百 ms |
| 音频层 | PCM16 直采直发，避免转码重采样；VAD 阈值按场景调（`silence_duration_ms` 调短会更快接话但更易抢话） | 采集/编解码，几十 ms |
| 体验层 | 打断（barge-in）客户端本地处理：检测到用户说话立即停播；工具执行期间自己播 filler 音 | 不减延迟，但消除"感知延迟" |

**代价清单**（选这条路线前逐项确认能承担）：自建降噪/回声消除、只有模型自带 server VAD（无 semantic VAD）、无 custom voice / avatar、deployment 容量规划与配额运维、filler/打断逻辑自研。

**量级预期**（同 region、无重工具，经验量级非实测）：这套蓝图 voice-to-voice 可做到 **~300–500ms**；每偏离一项（共享容量、加中转、上重工具）都会往上加。

### 7.2 组合速查表

延迟为同 region 无工具时的 voice-to-voice 经验量级（工具执行时间另加）；"放弃"列是选该组合的真实代价。

| 组合                                       | 延迟量级                                       | 智能上限                    | 得到的功能                                                                             | 放弃的功能 / 代价                                                           | 典型场景                            |
| ---------------------------------------- | ------------------------------------------ | ----------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------- |
| **直连 gpt-realtime + PTU（WebRTC）**        | ~300–500ms，P99 可控                          | Realtime 模型自身（弱于旗舰文本模型） | 原生语音自然度、原生打断、SIP 电话直连、自管 function call                                            | 全部语音增强层自建；无 custom voice/avatar；运维自理                                 | 极致延迟：实时翻译、口语陪练、高频短对话            |
| **Voice Live 模式二 + gpt-realtime**        | ~500–800ms                                 | 同上                      | 上行全部 + semantic VAD、降噪、回声消除、custom voice、avatar，免运维                               | 共享容量（尾延迟不可控）；工具自管                                                    | 体验优先的托管方案：高端客服、数字人              |
| **Voice Live 模式二 + gpt-realtime-mini**   | ~500–800ms                                 | 更弱，简单对话够用               | 同上，成本大幅下降                                                                         | 复杂追问/多步推理易出错                                                         | 轻量语音助手、FAQ 型应答                  |
| **Voice Live 模式二 + 级联（gpt-4.1 / gpt-5）** | ~800ms–1.2s                                | 旗舰文本模型：长上下文、复杂推理        | 强推理 + custom voice + 全套语音增强                                                       | 语音韵律/情绪表达弱于原生 realtime；多 STT/TTS 两跳                                  | 答案正确性优先：知识问答、专业咨询               |
| **Voice Live 模式二 + 级联（mini / phi）**      | ~800ms–1.2s                                | 基础对话                    | 最低成本 + 全套语音增强                                                                     | 智能与自然度双低                                                             | 批量外呼、通知确认类短流程                   |
| **Voice Live 模式三（挂 Agent）**              | 模式二基础上 **+200ms~1s/轮**（含 thread 往返；工具时间另加） | Agent 内配置，可上最强模型        | 全套语音增强 + Agent 工具生态（MCP/Functions/Knowledge）+ prompt 集中管理 + interim response 自动填充 | 每轮多 Agent Runtime 一跳；模型由 Agent 决定（连接串不传 `model`）；api-version/V2 变动风险 | 工具密集、知识库、多业务线复用的企业级 Voice Agent |
|                                          |                                            |                         |                                                                                   |                                                                      |                                 |

**读表方法**：从上往下是"性能 → 功能/智能"的让渡方向——越往上延迟越低但自己扛的工程越多，越往下功能越全但每层托管都加一跳。先确定场景的**延迟红线**（对话类 <1s，信息查询类可放宽到 1.5s），再在红线以内选智能和功能最全的那一行。

> 延迟数字为经验量级，用于组合间相对比较；生产选型前应在目标 region 实测 P50/P95/P99（见第九节开放问题 2）。

---

## 八、小结

1. **"Agent 页面选不到 gpt-realtime"是解耦的结果，不是能力回退**——语音 Agent 的正确入口从 Agent 页面转移到了 Voice Live API。
2. 调用链的持有关系反转：从 Agent 持有 Realtime，变为 Voice Live 统一持有模型层（直连 realtime/文本模型，或通过会话绑定挂 Agent）。Voice Live 与 Agent 的衔接是**连接层的会话绑定 + 服务端编排**，不是 realtime 模型 function call 调用 Agent；语音能力下沉到 Voice Live，Agent 专注逻辑与工具。
3. 选型是一条光谱：**直连 Realtime API（控制力/PTU 尾延迟）↔ Voice Live 模式二（托管语音层）↔ 模式三（+ Agent）**。延迟瓶颈在模型和工具，不在 Voice Live 这层壳，直连只是压完模型与工具之后的最后一段收益。
4. 模型组合的本质是**端到端自然度与级联智能程度的取舍**，Voice Live 用统一 API + fully managed 模型把两条路线的切换成本降到了配置级。
5. 企业级场景的最优解通常是**模式三 + 分层用模型**：Voice Live 语音层管"听与说"，Agent 管"想与做"。

---

## 九、开放问题（待验证/后续讨论）

以下问题本文尚未覆盖，做 solution 设计时需要逐项确认：

1. **成本精算**：audio token vs 文本 token + STT/TTS 的具体单价对比，按"分钟通话成本"折算各组合的真实差距（含 interim response、avatar 的额外计费）。
2. **实测延迟数据**：三条路线在同 region 下的 P50/P95/P99 端到端延迟实测（目前文中只有量级判断，无实测数字）。
3. **Region 与合规**：Voice Live 各模型的 region 覆盖差异、数据驻留与 GDPR 要求（如 Sweden Central 的组合可用性）；中国区可用性。
4. **电话接入**：与 Azure Communication Services（PSTN/SIP）的集成路径——呼叫中心场景 Voice Live 如何接电话线，直连 Realtime 的 SIP 是否更成熟。
5. **Agent V2 演进风险**：新 Foundry portal 的 Agent V2 与 Voice Live 的接入方式仍在变化（api-version 敏感），生产选型前需锁定版本组合。
6. **长会话与上下文管理**：Agent 模式下 thread 的上下文增长如何影响延迟与成本；realtime 直连约 128k token 限制下的会话截断策略。
7. **可观测性与评测**：Voice Live 的 conversation log / 系统日志如何接入现有监控；语音 Agent 的自动化评测方案（可结合 τ-Voice 一类全双工基准的失败分类）。
8. **故障降级**：Voice Live 服务不可用时能否降级到直连 Realtime 或级联管线；多 region 容灾设计。
9. **内容安全**：语音输入/输出的 content filter 行为与文本链路的差异，以及对延迟的影响。

---

## 参考

- [与 ChatGPT 的讨论：Azure AI Agent 与 Voice Live API 的解耦](https://chatgpt.com/share/6a5c24ec-5e68-83ec-9a8d-c5ad209bd815)（2026-07-19）
- [Voice Live API Overview — Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/voice-live)
- [How to use the Voice Live API — Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/voice-live-how-to)
- [Quickstart: Voice Agent with Foundry Agent Service — Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/voice-live-agents-quickstart)
- [Upgrade your voice agent with Azure AI Voice Live API — Microsoft Community Hub](https://techcommunity.microsoft.com/blog/azure-ai-foundry-blog/upgrade-your-voice-agent-with-azure-ai-voice-live-api/4458247)
- [Voice Agents in Azure using Voice Live API and Foundry Agents V1 and V2 — Mark Tucker](https://www.youtube.com/watch?v=7oM8rhOKI54)
- 相关笔记：[[Voice Live系列01：Agent实现架构——从级联流水线到Azure Voice Live API]]、[[WebSocket与WebRTC深度对比——从Azure Voice Live API看实时通信协议选型]]
