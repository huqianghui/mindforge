---
title: Building Enterprise Realtime Voice Agents from Scratch 论文精读笔记
created: 2026-04-06
tags:
  - paper-reading
  - voice-agent
  - realtime
  - speech-to-speech
  - cascaded-pipeline
  - streaming
  - Qwen3-Omni
  - azure
  - Pipecat
  - LiveKit
---

# Building Enterprise Realtime Voice Agents from Scratch 论文精读笔记

> 论文：[Building Enterprise Realtime Voice Agents from Scratch: A Technical Tutorial](https://arxiv.org/html/2603.05413v2)
> 作者：Jielin Qiu, Zixiang Chen, Liangwei Yang 等（Salesforce AI Research）
> 发表时间：2026 年 3 月
> 相关文章：[[Voice-Live-Agent实现架构——从级联流水线到Azure-Voice-Live-API]]

---

## 一、论文性质与核心结论

这篇论文不是传统的"提出新模型"的学术论文，而是一篇**工程范式论文（engineering tutorial paper）**——它回答的问题是：2026 年要做一个可用的企业级实时语音 Agent，到底该怎么落地。

核心结论只有一句话：

> **端到端语音模型（speech-to-speech）还不实用，真正能落地的仍然是 STT → LLM → TTS 级联流水线（cascaded pipeline）。**

换言之，所有"纯语音大模型取代 pipeline"的说法——现在还不成立。

---

## 二、关键认知模型：Voice Agent = LLM Agent + Voice I/O

论文给出了一个非常重要的抽象：

| 层 | 作用 | 本质 |
|---|---|---|
| LLM Agent | reasoning / tool use | 真正的"智能" |
| Voice I/O | STT + TTS | 输入输出层 |

这个等式打破了一个常见误区：

- **错误理解**：难点在语音
- **正确理解**：难点在 Agent（推理、工具调用、状态管理）

"能听能说"只是接口能力，而"能实时对话"是系统能力。

---

## 三、三种技术路线（Speech-to-Speech 模型的 Level 分级）

论文将现有的语音模型按**系统集成程度**分为三个 Level。需要注意的是，这三个 Level 不是"技术成熟度分级"，而是**"系统封装边界"的分级**——语音能力到底被封装到模型里了多少。

### Level 1：Fully End-to-End（全封装）

- **标准**：语音理解 + 推理 + 语音生成，全在一个模型内完成
- **代表**：Moshi
- **特点**：输入 audio，输出 audio，中间过程黑盒
- **优点**：理论延迟最低，pipeline 最简
- **致命问题**：无法插入 tool、无法控制推理、不可调试
- **论文态度**：研究价值 > 工程价值

### Level 2：Hybrid Omni（半封装）

- **标准**：语音 I/O 在模型里，但推理仍然是 LLM
- **代表**：Qwen2.5-Omni、Qwen3-Omni
- **结构**：`Audio → Encoder → Thinker(LLM) → Talker → Audio`
- **优点**：支持 function calling，reasoning 强
- **致命问题**：Talker 很难 serving、无法灵活替换组件、系统不可拆
- **本质**：看起来是一个模型，本质还是 pipeline

### Level 3：Cascaded Pipeline（外部拼接）

- **标准**：语音、推理、语音生成是完全独立组件
- **结构**：`STT → LLM → TTS`
- **优点**：工程成熟、可调试、可优化延迟
- **论文结论**：**唯一 production-ready 方案**

### Level 体系的问题

论文隐含的"进化路径"（Level 3 → 2 → 1）存在争议：

1. **假设会收敛到 end-to-end**——但企业系统需要可控性、可观测性，系统不一定会收敛
2. **混淆能力与系统**——Level 2 能力强但系统差，Level 3 能力分散但系统强
3. **忽略关键维度**——真正重要的是"是否支持 realtime orchestration"，而非封装程度

更合理的坐标系应该是三维的：封装程度、系统可控性、实时能力。

---

## 四、Qwen3-Omni 实验数据深度分析

论文对 Qwen3-Omni 的三种部署方式做了关键对比：

| 部署方式 | 延迟 | 说明 |
|---|---|---|
| DashScope 云 API | ~702ms | 可用但不可私有化 |
| 本地 vLLM（仅 Thinker） | ~516ms | 只跑文本推理，无语音生成 |
| 本地 Transformers（完整 pipeline） | ~146s | 完全不可用 |

### 为什么"同一个模型"云上 700ms，本地 146 秒？

这不是模型性能差异，而是**系统性能差异**。三种配置本质上是完全不同的系统形态：

**云 API（~702ms）**——不是"模型跑得快"，而是完整优化后的工业系统：
- 专用推理引擎（不是 vLLM）
- 模型结构改写（kernel fusion / graph compile）
- streaming pipeline（边生成边播）
- 多机并行（Thinker / Talker 分布式）
- 音频 codec 优化

**本地 vLLM（~516ms）**——只跑了 Thinker（文本理解 + 推理），没有语音生成（Talker），所以看起来还行。

**本地 Transformers（~146s）**——用最原始的方式串行执行 `audio → thinker → talker → audio`，没有 streaming、没有并行、没有 stage-level scheduling，导致延迟爆炸。

### 本地能逼近云上性能吗？

理论上可以通过分布式推理 + vLLM-Omni 来逼近，但会被卡在五个点上：

1. **vLLM-Omni 不成熟**——streaming 支持不完整，stage-level scheduling 很粗糙
2. **Thinker/Talker 难以真正解耦**——token-level streaming 不稳定，语音容易抖动
3. **Audio codec 是黑盒优化**——缺少 CUDA kernel fusion、TensorRT 等优化
4. **分布式 ≠ 低延迟**——GPU 间通信开销、调度开销可能吃掉收益
5. **资源需求**——30B MoE 模型显存吃爆，高并发下延迟飙升

核心认知：**Qwen3-Omni 的延迟优势 80% 来自 serving system，不是模型本身**。云上不是"模型更强"，而是"他们在用一个完全不同的执行系统"。

---

## 五、核心工程机制：Realtime 的本质

论文直接否定了一个流行误解：

> **错误**：realtime = 更快的模型
> **正确**：realtime = streaming + pipeline 并行

### 非流式 vs 流式

**非流式（串行执行）**：
```
STT 完成 → LLM 完成 → TTS 完成
= 400 + 800 + 400 = 1600ms
```

**流式（并行执行）**：
```
STT（边听边转）
    ↓
LLM（边生成 token）
    ↓
TTS（边说）
```

### 三个关键机制

1. **Token streaming（LLM）**——SSE 流式输出 token，不等全部生成完
2. **Sentence aggregation（句子缓冲）**——等一句话结束再送 TTS，否则语音会碎。这是很多人忽略的"工程核心点"
3. **Pipeline 并行**——各模块通过多线程/队列并行执行，本质是三个系统同时跑

最终实现的级联 pipeline TTFA（Time-to-First-Audio）约 **755ms**，已进入 1 秒以内。

---

## 六、"25+ 模型但无 tutorial"——模型 ≠ Agent

论文指出：25+ 开源 speech-to-speech 模型已经存在，但没有一个提供了"如何把它变成实时语音 Agent"的完整方法。

这句话背后的核心洞察：**speech in + speech out + function call ≠ voice agent**。

在能力层这个等式看似成立，但在系统层完全不成立。一个真实的 voice agent 需要处理：

| 系统层需求 | 说明 |
|---|---|
| Streaming pipeline | token → audio chunk 流式传输 |
| Barge-in（打断） | 用户随时插话，模型通常是 blocking generation |
| Latency orchestration | pipeline 如何重叠执行 |
| Tool latency handling | API 调用等 2 秒时怎么处理？filler speech？ |
| Turn-taking（轮次控制） | 什么时候开始说、停止说 |
| Memory & session | 多轮上下文与长对话管理 |

speech-to-speech 模型只解决了"感知 + 表达"（约 30%），剩下 70% 是交互系统工程。

---

## 七、Cascaded Pipeline 为什么"仍然必要"

论文的关键论断：即使有 Level 1 的 speech-to-speech 模型，你仍然需要级联流水线。

### "cascaded"的含义

`cascaded = 级联 / 分阶段串联`，完整的级联系统不只是 `STT → LLM → TTS`：

```
Audio input
  ↓
[VAD]（有没有人在说话？）
  ↓
[Turn detection]（一句话结束了吗？）
  ↓
[STT / speech understanding]
  ↓
[Agent / LLM / tool use]
  ↓
[Response planning]
  ↓
[TTS / speech generation]
  ↓
[Audio output]
```

### 为什么 Level 1 模型也绕不开它？

即使模型能 speech-to-speech，以下问题模型本身不解决：

- **VAD**：什么时候开始听？环境噪声怎么过滤？
- **Turn detection**：用户停顿 ≠ 结束，怎么判断？
- **Interrupt control**：用户打断 agent 怎么办？
- **Tool latency**：API 调用耗时期间要不要说话？说什么？
- **Session management**：多轮上下文和状态管理

cascaded pipeline 存在的原因不是模型不够强，而是**实时交互系统本身就是分阶段的**。它不是模型不够强的"补丁"，而是实时交互系统的**本质结构**。

---

## 八、生产框架分析：Pipecat 与 LiveKit

### Pipecat

- **定位**：语音 Agent pipeline 编排器
- **核心能力**：将 STT / LLM / TTS 变成可组合模块，用 pipeline 方式串联，支持并行处理
- **支持服务**：Deepgram（STT）、OpenAI / Claude（LLM）、ElevenLabs（TTS）
- **传输层**：WebRTC（via LiveKit）、WebSocket、电话系统
- **开源情况**：完全开源，BSD-2 license
- **本质**：论文那套 streaming pipeline 的现成实现

### LiveKit

- **定位**：实时音视频基础设施（WebRTC infra），**不是** agent 框架
- **核心能力**：WebRTC server、音频传输、低延迟 routing、session 管理
- **Agents 框架**：提供 STT/TTS hook 和 LLM integration
- **开源情况**：核心开源，cloud 是托管服务
- **本质**：解决"音频怎么实时进出系统"

### 关键区分

| 维度 | Pipecat | LiveKit |
|---|---|---|
| 抽象层 | Agent pipeline | 通信基础设施 |
| 关注点 | STT→LLM→TTS 编排 | WebRTC / 音频传输 |
| 控制 agent 行为 | 是 | 否 |
| 控制音频链路 | 部分 | 是 |

**类比**：LiveKit = "电话网络"，Pipecat = "通话中的 AI 大脑 + 流程"。

### 能否替代 Azure Voice Live API？

架构上完全可以（LiveKit + Pipecat 复刻 Voice Live pipeline），但有三个现实挑战：

1. 需要自建 global infra（TURN server、jitter buffer、QoS）
2. 开源框架 production 稳定性不足
3. Agent 逻辑（planning、memory、tool orchestration）仍需自己实现

---

## 九、Azure Voice Live 中的 VAD 与 Turn Detection

### 服务归属

| 能力 | 提供方 |
|---|---|
| VAD（有没有人在说话） | Speech Service（音频处理层） |
| Turn Detection（一句话结束了吗） | Speech Service + Model（semantic） |

### VAD 实现

Voice Live 的 VAD 是**服务端自动执行**的（server-side VAD），无需自己实现。系统自动检测语音起止并发出 `speech_started` / `speech_stopped` 事件。

关键配置参数：
```json
{
  "turn_detection": {
    "type": "server_vad",
    "threshold": 0.5,
    "silence_duration_ms": 500
  }
}
```

### 两种 Turn Detection

1. **Acoustic Turn Detection（基于静音）**——"停了 500ms → 结束"，对应 `server_vad`
2. **Semantic Turn Detection（基于语义）**——"这句话已经说完了"，对应 `semantic_vad`，由 realtime-gpt 参与判断

Semantic VAD 可以避免误判——例如用户说"我想查一下那个...嗯..."时，`server_vad` 可能因停顿误判为结束，而 `semantic_vad` 能判断"还没说完"。

### 完整链路

```
Audio stream
   ↓
[VAD（Speech Service）] ← 是否有语音
   ↓
[Turn Detection]
   ├─ server_vad（静音判断）
   └─ semantic_vad（模型语义判断）
   ↓
commit audio
   ↓
LLM / realtime-gpt
   ↓
response
```

**关键认知**：VAD 是 gating（开关），Turn Detection 是决策（什么时候触发 LLM）。VAD 必须在模型前面——它是毫秒级的信号处理，不能用百毫秒级的 LLM 来做。

---

## 十、论文的四个贡献与局限

### 四个贡献

1. **综合调研**：梳理了 25+ speech-to-speech 模型和 30+ voice agent 框架
2. **实证对比**：对比了端到端模型（Qwen3-Omni）vs 级联流水线的实际性能
3. **完整实现**：实现了 sub-1-second 延迟的企业级语音 Agent（含 function calling）
4. **九章教程**：提供了从零构建的渐进式教程与完整代码

### 技术栈

| 组件 | 选型 | 延迟 |
|---|---|---|
| STT | Deepgram Nova-3 | 337–509ms |
| LLM | vLLM on NVIDIA H200 | - |
| TTS | ElevenLabs | ~220ms 首字节 |
| 关键桥梁 | Sentence buffer | - |

### 局限与质疑

1. **过度依赖第三方服务**——Deepgram、ElevenLabs 都是商业 API，未真正解决 self-host 问题
2. **Level 分级暗示线性进化**——但系统可能长期保持分层而非收敛到 end-to-end
3. **未深入讨论 interrupt 和 multi-turn 的工程细节**——这恰恰是 production 中最困难的部分

---

## 十一、对从业者的启示

1. **不要被"单模型幻觉"带偏**——能力 ≠ 可用性，Qwen3-Omni 是"看起来已经是未来"的模型，但今天拿它做产品大概率死在工程上
2. **优先做 system，而不是 model**——重点是 streaming、orchestration、interruption、latency control
3. **cascaded pipeline 是本质结构**——即使未来模型更强，交互系统的分阶段本质不会消失
4. **Omni 类模型的真正价值**——不是直接上线，而是未来架构的 preview
5. **80% 的延迟优势来自 serving system**——不要只看模型 benchmark，要看系统级延迟
