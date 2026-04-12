---
title: Speech 技术全景——从音频处理基础到 Turn-Taking 的深层机制
created: 2026-04-11
tags:
  - speech
  - voice-agent
  - VAD
  - turn-taking
  - TTS
  - ASR
  - realtime
  - audio-processing
description: 系统梳理实时语音 Agent 涉及的核心 Speech 技术：音频前处理（VAD、AEC、降噪）、语音识别与合成、Turn-Taking 的预测-决策机制，以及 Semantic VAD 的本质
---

# Speech 技术全景——从音频处理基础到 Turn-Taking 的深层机制

> 本文是对实时语音 Agent 涉及的 Speech 技术体系的全面梳理。已有的 [[Voice-Live-Agent实现架构——从级联流水线到Azure-Voice-Live-API]] 聚焦于系统架构与工程实践，本文则向下深入，理清每一层技术的核心概念、实现原理和它们之间的真实关系。

---

## 一、Speech 技术栈的三层结构

一个完整的实时语音 Agent，无论采用哪种架构，都涉及三层技术：

```
┌─────────────────────────────────────────────┐
│           Speech In（音频输入处理）            │
│  VAD · 降噪 · 回声消除 · AGC · 编解码        │
├─────────────────────────────────────────────┤
│           Core Processing（核心处理）          │
│  ASR · LLM 推理 · Turn-Taking · 决策         │
├─────────────────────────────────────────────┤
│           Speech Out（音频输出合成）           │
│  TTS · 流式合成 · 语音参数控制               │
└─────────────────────────────────────────────┘
```

下面逐层展开。

---

## 二、Speech In——音频输入处理

用户的麦克风采集到的原始音频，在进入任何"智能"处理之前，首先需要经过一系列**信号级预处理**。这些处理看似基础，但直接决定了后续 VAD 和 ASR 的准确率。

### 2.1 VAD（Voice Activity Detection，语音活动检测）

**VAD 的核心任务**：判断当前音频帧中是否包含人声。

这是整个语音系统的"门卫"——只有 VAD 判定"有人在说话"，后续的 ASR、LLM 等模块才会启动。

#### 基础 VAD（Energy-based / Server VAD）

基于**能量阈值 + 静音时长**的简单判断：

| 参数                    | 含义            | OpenAI 默认值 |
| --------------------- | ------------- | ---------- |
| `threshold`           | 能量阈值（0.0-1.0） | 0.5        |
| `prefix_padding_ms`   | 语音开始前保留的音频    | 300ms      |
| `silence_duration_ms` | 静音多久判定说完      | 500ms      |

**优点**：简单、低延迟、对短语（"好的"、"嗯"）敏感。

**缺点**：无法区分"思考停顿"和"说完了"——用户说"我想要……（停顿思考）……那个蓝色的"，500ms 静音后会被误判为说完。

**代表实现**：[Silero VAD](https://github.com/snakers4/silero-vad)（2MB 模型，处理 32ms 音频 < 1ms）、WebRTC VAD。

#### Semantic VAD（语义级 VAD）

OpenAI Realtime API 引入的概念。配置参数只有一个 `eagerness`：

| eagerness | 行为 | 最大等待时长 |
|-----------|------|------------|
| `low` | 等更久再判定说完 | 8s |
| `medium`（默认） | 平衡 | 4s |
| `high` | 更快判定说完 | 2s |
| `auto` | 等同 medium | 4s |

**但这里有一个关键洞察**（来自深入讨论）：

> **Semantic VAD 这个名字是一个"误导"。** 它实际上不是一个独立的 VAD 模块，而是**一个 turn-taking policy 的接口壳**。

你以为你在调 VAD 参数：
```json
{ "type": "semantic_vad", "eagerness": "low" }
```

实际上你在调的是模型内部的 **policy threshold / reward tradeoff**：
- `eagerness: low` → 更高的"等待收益"权重，倾向于让用户说完
- `eagerness: high` → 更高的"快速响应收益"权重，倾向于尽快接话

这个区别非常重要，后面在 Turn-Taking 部分会深入解释。

### 2.2 AEC（Acoustic Echo Cancellation，回声消除）

**问题场景**：用户用扬声器播放 AI 回复时，麦克风会同时采集到 AI 的声音，导致"AI 听到自己说话"形成回路。

**核心原理**：AEC 持有一份"正在播放的音频"参考信号，从麦克风采集的信号中减去这个参考，留下纯净的用户语音。

```
麦克风信号 = 用户语音 + 回声（AI 播放音经扬声器→空间→麦克风）
AEC 输出 = 麦克风信号 - 估计回声 ≈ 纯净用户语音
```

**工程要点**：
- **自适应滤波器**：空间声学特性（房间大小、反射面）会变化，滤波器需要持续自适应
- **双讲（Double Talk）**：用户和 AI 同时说话时，AEC 不能把用户语音也消掉——这是最难的场景
- **延迟对齐**：参考信号和麦克风信号必须精确对齐，否则消除效果急剧下降

**为什么重要**：没有 AEC，VAD 会把 AI 自己的声音误判为"用户在说话"，导致 AI 不断自我打断。Azure Voice Live API 在云端内置了 AEC，这是它的重要优势之一。

### 2.3 ANS（Ambient Noise Suppression，环境噪声抑制）

**目标**：去除背景噪声（键盘声、空调声、街道噪音），保留清晰人声。

**两代技术**：
- **传统方法**：谱减法、维纳滤波——估计噪声频谱，从信号中减去
- **深度学习方法**：RNNoise、DTLN、PercepNet——用神经网络直接学习"干净语音 vs 噪声"的分离

**工程权衡**：降噪过强会导致语音失真（"机器人音"），过弱则噪声残留影响 ASR 准确率。

### 2.4 AGC（Automatic Gain Control，自动增益控制）

**问题**：不同用户的麦克风距离、设备质量、说话音量差异巨大。有人声音 -40dB，有人 -10dB。

**AGC 的作用**：自动调整信号增益，使输入音量稳定在 ASR 模型的最佳工作范围内。

- 音量太低 → 放大
- 音量太高 → 压缩（避免削波失真）

### 2.5 音频编解码（Codec）

实时语音通信中，编解码选择直接影响延迟和质量：

| Codec | 采样率 | 比特率 | 延迟 | 适用场景 |
|-------|--------|--------|------|---------|
| **PCM16** | 24kHz | 384 kbps | 0（无编码） | WebSocket 直传（OpenAI 默认） |
| **Opus** | 8-48kHz | 6-510 kbps | 2.5-60ms | WebRTC（自适应质量） |
| **G.711** | 8kHz | 64 kbps | 0.125ms | 电话网络（PSTN/SIP） |

OpenAI Realtime API 推荐 **PCM16 24kHz 单声道**；WebRTC 通道自动使用 Opus；电话场景（SIP 接入）使用 G.711。

### 2.6 前处理链的执行顺序

这些模块不是随意组合的，有严格的处理顺序（以 WebRTC 标准管线为参考）：

```
麦克风原始信号
    ↓
  [ AEC ]          ← 先消除回声（需要扬声器参考信号）
    ↓
  [ ANS ]          ← 去除环境噪声
    ↓
  [ AGC + Limiter ] ← 归一化音量 + 防止削波
    ↓
  [ VAD ]          ← 检测是否有人声
    ↓
 干净的语音帧 → 送入 ASR / 模型
```

**为什么 AEC 在最前面？** AEC 的自适应滤波器需要对比麦克风原始信号与扬声器参考信号。如果先做 AGC 改变了增益，会导致信号幅度变化，使自适应滤波器收敛困难甚至发散。**为什么 AGC 在 ANS 之后？** 避免在降噪前放大噪声——先去噪再调增益，信噪比更优。

---

## 三、核心处理——两种架构路线

### 3.1 级联流水线（Cascaded Pipeline）

```
VAD → ASR（语音识别）→ LLM（文本推理）→ TTS（语音合成）
```

三个独立模块，每个可以单独选型和替换。通过**流式传输 + 流水线并行**实现低延迟。

**判断标准：每个模块能不能单独替换？能 → 真正的模块化。**

### 3.2 端到端模型（End-to-End / Native）

以 GPT-4o Realtime 为代表的融合架构：

```
[light VAD] → detect speech start
      ↓
[shared audio encoder]
      ↓
[LLM core + semantic turn model]
      ↓
    (decision)
      ↓
[neural vocoder / TTS head]
      ↓
   Audio out
```

**关键区别**：这不是"把 ASR + LLM + TTS 塞进一个模型"，而是从根本上改变了处理方式——模型直接在**音频表示空间**中理解和生成，不需要经过文本这个"中间翻译层"。

### 3.3 一个判断标准（不会迷）

看到一个"能力"时，问自己：

> **它能不能被单独替换？**
> - **能** → 这是一个**模块**（VAD、ASR、TTS）
> - **不能** → 这是**模型内部能力**（turn-taking、interruption handling）

传统系统中 VAD/ASR/LLM/TTS 都是可替换模块。GPT-Realtime 中，只有最外层的 light VAD 是"模块"（仍然可以配置），而 turn-taking、语义理解、语音生成都融合在模型内部，无法单独替换。

---

## 四、Turn-Taking 深度解析——语音 Agent 的核心难题

Turn-Taking（话轮转换）是语音 Agent 中**最被低估也最关键**的技术。它决定了对话是否"自然"——什么时候该听、什么时候该说、什么时候该打断。

### 4.1 Turn-Taking ≠ 端点检测

一个常见误解：

> **错误理解**：用户停了 → 我说话

> **真实的先进系统**：我预测他 200ms 后会说完 → 提前准备甚至开口

人类对话中，两个人的话轮切换间隔通常只有 **200ms**——这比任何"检测到静音再启动"的系统都快。因此，真正先进的 turn-taking 是**预测性的**，不是反应性的。

### 4.2 子模型 vs Policy——预测与决策的分离

Turn-taking 的实现由两个组件协作完成：

```
[Audio stream]
      ↓
 (VAD + ASR partial)
      ↓
[Turn-taking 子模型（连续预测）]
      ↓
[Policy（决策器）]
      ↓
 Action（wait / speak / interrupt / backchannel）
```

#### Turn-Taking 子模型

**本质**：一个概率预测模型，持续输出：
- `P(turn_end | 当前语音)` — 用户说完的概率
- `P(user_continue)` — 用户会继续说的概率
- `P(interruption_intent)` — 用户想打断的概率

**输入是多模态融合信号**：

| 信号类型 | 具体特征 | 为什么重要 |
|---------|---------|-----------|
| **声学特征** | 能量、pitch（语调）、pause length | 语调下降 + 停顿 = 强烈的"说完了"信号 |
| **语义特征** | partial transcript、句法完整性 | "我想要那个……" 句法不完整 → 还没说完 |
| **时间特征** | utterance 长度、停顿时长、语速 | 长停顿 vs 短停顿的含义不同 |

#### Policy（决策器）

**本质**：基于子模型的预测概率，结合系统状态，做出行为决策。

| | Turn-Taking 子模型 | Policy |
|---|---|---|
| **作用** | 预测 | 决策 |
| **输出** | 概率 | 行为（wait/speak/interrupt/backchannel） |
| **实现** | ML 模型 | FSM / 规则 / RL / LLM |
| **是否必须** | 必须 | 必须 |

Policy 的实现从简单到复杂：
- **FSM（有限状态机）**：最简单，基于阈值规则（P(turn_end) > 0.8 → speak）
- **Rule-based**：加入更多规则（如"AI 正在说话时不主动开口"、"用户说了问句必须回应"）
- **RL（强化学习）**：通过 reward 学习最优策略（自然度 vs 响应速度的 tradeoff）
- **LLM-based**：GPT-Realtime 内部可能就是用 LLM 自身做 policy

### 4.3 Semantic VAD 的本质（关键洞察）

回到 Semantic VAD——理解了 turn-taking 的结构后，它的本质就清楚了：

```
Semantic VAD = turn-taking 子模型 + 简化的 policy 接口
```

当你设置 `eagerness: low / medium / high` 时，你实际在调整的是：

| eagerness | 真实行为 | 对应 policy 调整 |
|-----------|---------|-----------------|
| `low` | 等更久，倾向让用户说完 | 提高 P(turn_end) 的判定阈值 |
| `medium` | 平衡 | 默认阈值 |
| `high` | 更快接话，更容易打断 | 降低 P(turn_end) 的判定阈值 |

所以 Semantic VAD **不是一个可替换的模块**，而是 GPT-4o 模型内部 turn-taking 能力的**对外暴露接口**。你无法用第三方 VAD 替换它，因为它根本不是传统意义上的 VAD。

### 4.4 Backchannel（反馈信号）

自然对话中，听者会持续发出反馈信号：

- 语音类：嗯、哦、对、好的
- 非语音类：点头、眼神接触

先进的 turn-taking 系统需要判断用户的"嗯"是在说"继续说"（backchannel），还是"我要插话了"（interruption）。这也是子模型需要预测的维度之一。

---

## 五、Speech Out——语音合成（TTS）

### 5.1 当前 TTS 技术格局

| 方案 | 代表产品 | 特点 |
|------|---------|------|
| **端到端神经 TTS** | Azure Neural TTS、OpenAI TTS | 预训练声音，高质量，低延迟 |
| **语音克隆** | ElevenLabs、Fish Audio | 几秒音频克隆任意声音 |
| **端到端原生** | GPT-4o Audio | 不走单独 TTS，模型直接输出音频 token |

### 5.2 流式合成与句子缓冲器

流式 TTS 的关键是 **Sentence Buffer**（句子缓冲器）：

```
LLM token 流 → [Sentence Buffer] → 完整句子 → TTS 流式合成 → 音频流
```

- LLM 逐 token 输出
- Sentence Buffer 累积 token，检测句子边界（句号、问号等）
- 排除假句号（如 "Dr."、"e.g."）
- 满足最小长度后释放给 TTS

这样用户在 LLM 生成完第一个句子时就能听到回复，而非等待整段文本。

### 5.3 语音参数控制

| 参数 | 含义 | 可控性 |
|------|------|--------|
| **Voice Temperature** | 语音的情感表现力和变化度 | OpenAI TTS 暂不支持直接控制 |
| **Playback Speed** | 播放速度 | 客户端可调（0.5x-2.0x） |
| **Custom Lexicon** | 自定义发音词典（人名、专有名词） | Azure TTS 支持 SSML lexicon |
| **Voice Selection** | 声音角色 | OpenAI: alloy/ash/ballad/coral/echo/sage/shimmer/verse/marin/cedar |
| **Emotion / Style** | 情感风格 | Azure 支持 SSML style 标签；GPT-4o 原生模型可通过 prompt 引导 |

**注意**：OpenAI Realtime API 中，一旦 session 开始输出音频，**voice 设置不可更改**——需要新建 session。

---

## 六、平台对比——OpenAI Realtime vs Azure Voice Live

| 维度 | OpenAI Realtime API | Azure Voice Live API |
|------|--------------------|--------------------|
| **架构** | 端到端（GPT-4o 原生音频） | 端到端（云端托管 STT+GPT+TTS） |
| **VAD** | Server VAD + Semantic VAD | Azure Semantic VAD（含降噪+AEC） |
| **音频前处理** | 客户端自行处理 | **云端内置**（降噪、AEC、AGC） |
| **传输协议** | WebSocket / WebRTC | WebSocket + WebRTC（双通道） |
| **音频格式** | PCM16 24kHz（WS）/ Opus（WebRTC） | PCM16 24kHz（WS）/ Opus（WebRTC） |
| **数字人 Avatar** | 不支持 | **原生支持**（Video Avatar + Photo Avatar） |
| **Function Calling** | 原生支持 | 原生支持 |
| **Session 时限** | 60 分钟 | 按 Azure 配额 |
| **部署方式** | OpenAI 云端 | Azure 云端 |

**根本区别**：Azure Voice Live 的核心优势在于**音频前处理的云端内置**——开发者不需要自己处理 AEC、降噪、AGC，也不需要担心"AI 听到自己说话"的问题。OpenAI Realtime 则将这些工作交给客户端或开发者。

---

## 七、工程建议——如何从零构建语音 Agent

如果你要自己构建，**不要一开始就搞端到端**。推荐的演进路径：

### 阶段一：最小可用

1. **VAD**：Silero VAD（简单、可靠）
2. **Streaming ASR**：Deepgram / Azure STT（WebSocket 流式）
3. **简单 Turn-taking**：二分类器（说完了 / 没说完）
4. **FSM Policy**：基于阈值的状态机

### 阶段二：体验优化

5. **多模态 Turn-taking**：融合声学 + 语义特征
6. **Predictive Turn-taking**：提前预测，降低响应延迟
7. **RL Policy**：用强化学习优化自然度
8. **流式 TTS + Sentence Buffer**：降低首音频延迟

### 阶段三：平台级

9. **云端 AEC / 降噪**：或直接使用 Azure Voice Live
10. **端到端模型**：GPT-4o Realtime / Qwen3-Omni
11. **Avatar / 数字人**：WebRTC 视频流集成

### 延迟预算参考

端到端 < 1 秒是"实时对话"的门槛：

| 环节 | 级联流水线参考延迟 | 端到端参考延迟 |
|------|------------------|---------------|
| 前处理（VAD+AEC+ANS） | ~10ms | 云端内置 |
| STT（首 final transcript） | ~400ms | — |
| LLM（首 token） | ~300ms | ~300ms |
| TTS（首音频） | ~220ms | — |
| **总计（首音频）** | **~755ms** | **~500-700ms** |

---

## 八、总结

```
┌─────────────────────────────────────────────────────┐
│                    Speech 技术全景                    │
│                                                     │
│  Speech In:  AGC → AEC → ANS → VAD → 干净语音      │
│                                                     │
│  传统路线:   ASR ──→ LLM ──→ TTS                    │
│              （可替换模块）                           │
│                                                     │
│  端到端路线: [Audio Encoder + LLM + Vocoder]         │
│              （融合模型，只暴露 VAD 控制）            │
│                                                     │
│  Turn-Taking = 子模型（预测）+ Policy（决策）        │
│  Semantic VAD ≈ Turn-Taking Policy 的接口壳          │
│                                                     │
│  Speech Out: 流式 TTS + Sentence Buffer              │
│              + 语音参数控制                           │
└─────────────────────────────────────────────────────┘
```

三个核心认知：
1. **VAD 不等于 Turn-Taking**——VAD 只是最底层的"有没有声音"检测，Turn-Taking 是"该不该说话"的预测+决策系统
2. **Semantic VAD 不是 VAD**——它是端到端模型内部 turn-taking 能力的简化接口，不可替换
3. **先进系统预测未来**——不是"用户停了我再说"，而是"预测用户 200ms 后说完，提前准备"

---

## 相关文章

- [[Voice-Live-Agent实现架构——从级联流水线到Azure-Voice-Live-API]] — 两种架构的工程实践与对比
- [[从Google五种Skill Pattern到Agent Runtime——Skill、MCP与Agent的统一架构]] — Agent 架构设计
- [[Agent经典范式与人类问题处理模式的映射]] — Agent 范式分类

## 参考资料

- [OpenAI Realtime API - VAD Guide](https://developers.openai.com/api/docs/guides/realtime-vad)
- [OpenAI Realtime API - Conversations Guide](https://developers.openai.com/api/docs/guides/realtime-conversations)
- [OpenAI Realtime API - WebSocket Guide](https://developers.openai.com/api/docs/guides/realtime-websocket)
- [Building Enterprise Realtime Voice Agents from Scratch](https://arxiv.org/html/2603.05413v2)（Salesforce AI Research）
- [Silero VAD](https://github.com/snakers4/silero-vad)
- [Azure AI Services - Voice Live API](https://learn.microsoft.com/en-us/azure/ai-services/)
