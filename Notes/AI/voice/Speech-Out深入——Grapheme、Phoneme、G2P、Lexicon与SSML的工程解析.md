---
title: Speech Out 深入——Grapheme、Phoneme、G2P、Lexicon 与 SSML 的工程解析
created: 2026-04-30
tags:
  - speech
  - voice-agent
  - TTS
  - G2P
  - phoneme
  - SSML
  - lexicon
  - realtime
  - azure-speech
description: 深入拆解实时语音 Agent 的 Speech Out 层：从 Grapheme/Phoneme 基本概念到 G2P 转换机制、Lexicon 发音控制、SSML 语音标记语言，以及 Realtime 场景下的工程落地策略
---

# Speech Out 深入——Grapheme、Phoneme、G2P、Lexicon 与 SSML 的工程解析

> 本文是 [[Speech技术全景——从音频处理基础到Turn-Taking的深层机制]] 的姊妹篇。前文聚焦 **Speech In**（VAD、AEC、降噪等音频输入处理）和核心处理层（ASR、Turn-Taking），本文则深入 **Speech Out** 层——当 LLM 生成了回复文本之后，如何准确地"读出来"。已有的 [[Voice-Live-Agent实现架构——从级联流水线到Azure-Voice-Live-API]] 提供了系统架构概览，本文向下深入 TTS 前的关键环节。

---

## 一、为什么需要关注 Speech Out 层

在实时语音 Agent 的完整链路中：

```
用户语音 → VAD → ASR → LLM → ??? → TTS → 播放
```

中间这个 `???` 就是本文要解决的问题：**从文本到正确发音的转换与控制**。

很多开发者认为"把文本扔给 TTS 就完了"，但在实际产品中，以下场景会让你意识到这个中间层的重要性：

- 品牌名 "Azure" 被读成奇怪的发音
- 缩写 "SQL" 被读成一个词而非字母拼读
- 人名 / 地名（尤其非英语）发音完全错误
- LLM 生成的新词、缩写让 TTS 不知所措

这些问题的根源，都指向同一个概念：**Grapheme-to-Phoneme（G2P）转换**。

---

## 二、基础概念：Grapheme 与 Phoneme

### 2.1 Grapheme（字位）

**词源**：graph（书写）+ -eme（最小单位）

**定义**：书写系统中的**最小有意义单位**——通常就是字母或字符。

| 语言 | Grapheme 示例 |
|------|--------------|
| 英语 | a, b, c, ph, ch |
| 中文 | 你, 好, 世 |
| 日语 | あ, い, う |

一个关键点：Grapheme 不一定是单个字母。英语中 `ph`、`ch`、`sh` 都是 **digraph**（双字母组合作为一个 grapheme）。

### 2.2 Phoneme（音位）

**词源**：phone（声音）+ -eme（最小单位）

**定义**：语音中的**最小区别性发音单位**。

| 音素（IPA） | 示例词 | 说明 |
|------------|--------|------|
| /k/ | **c**at | 清塞音 |
| /æ/ | c**a**t | 低前元音 |
| /f/ | **ph**one | 清擦音（注意：ph → /f/） |
| /oʊ/ | ph**o**ne | 双元音 |

### 2.3 核心矛盾：Grapheme ≠ Phoneme

这就是 G2P 存在的根本原因——**书写和发音之间没有一一对应关系**。

```
cat:   grapheme  c + a + t    →  phoneme  /k/ + /æ/ + /t/     ← 看起来简单
phone: grapheme  ph + o + ne  →  phoneme  /f/ + /oʊ/ + /n/   ← ph → /f/ 不直觉
read:  grapheme  r + ea + d   →  phoneme  /riːd/ 或 /rɛd/    ← 多音词，取决于上下文
```

G2P 本质上是在解决：**从离散符号系统（文本）到规则复杂的发音系统（语音）的映射问题**。

---

## 三、G2P 在 Speech Pipeline 中的精确位置

### 3.1 经典 TTS Pipeline 的内部分层

很多人把 TTS 当作一个黑盒，但它内部其实有清晰的分层：

```
LLM 输出文本
    ↓
 ┌──────────────────────────────── TTS 系统边界 ──────────────────────────┐
 │  (1) Text Normalization（文本规范化）                                    │
 │      "SQL db v2" → "S Q L database version two"                       │
 │      ↓                                                                │
 │  (2) Lexicon Lookup（词典查询）                                         │
 │      已知词 → 直接返回 phoneme                                         │
 │      ↓                                                                │
 │  (3) G2P（grapheme-to-phoneme 转换）                                   │
 │      未知词 → 模型/规则推断 phoneme                                     │
 │      ↓                                                                │
 │  (4) Prosody Prediction（韵律预测）                                     │
 │      重音、停顿、语调                                                   │
 │      ↓                                                                │
 │  (5) Acoustic Model（声学模型）                                        │
 │      phoneme + prosody → mel spectrogram                              │
 │      ↓                                                                │
 │  (6) Vocoder（声码器）                                                 │
 │      mel spectrogram → 音频波形                                        │
 └───────────────────────────────────────────────────────────────────────┘
```

**G2P 的精确位置**：在 Text Normalization 之后、Acoustic Model 之前。它和 Lexicon 共同负责将文本转换为 phoneme 序列。

### 3.2 三种 G2P 实现方式

| 方式 | 描述 | 优缺点 |
|------|------|--------|
| **显式 G2P**（传统） | 独立 G2P 模块，输出 phoneme 给 TTS | 可控性强，但增加延迟和复杂度 |
| **隐式 G2P**（End-to-End） | TTS 模型内部完成（如 VITS、Tacotron） | 简单、低延迟，但发音不可控 |
| **Hybrid**（工程最常见） | 规则 + 字典 + fallback G2P | 平衡可控性和效率 |

### 3.3 Realtime 场景的特殊挑战

在实时语音 Agent 中，G2P 面临三个关键卡点：

**卡点 1：流式处理的 chunk 边界问题**

LLM 是逐 token 输出的：

```
"inter" → "interesting"
```

如果太早做 G2P，`inter` 会被转换为 `/ˈɪntər/`，但完整词 `interesting` 的发音是 `/ˈɪntrəstɪŋ/`——发音会错。

**卡点 2：延迟瓶颈**

如果 G2P 是非流式的（依赖整句输入），会直接导致 TTS 等待，整体延迟上升。

**卡点 3：韵律依赖上下文**

重音、停顿、语调依赖句子级信息，而非 token 级。这与流式处理天然矛盾。

**工程折中方案**：

| 方案 | 策略 | 适用场景 |
|------|------|---------|
| 延迟 G2P | 等一句话完整再处理 | 发音准确但延迟高 |
| Chunk + Lookahead | 缓存 3-5 个词再做 G2P | 延迟与准确的折中（最常见） |
| 交给 Neural TTS | 不显式做 G2P，全靠模型 | 最简单，但 long-tail 词容易翻车 |

---

## 四、G2P 与 Semantic VAD 的关系

这两个组件经常被放在一起讨论，但它们**根本不在同一个层级**。

### 4.1 位置对比

```
用户说话
→ 音频流
→ VAD → ASR（流式转文本）→ Semantic VAD（判断是否说完）→ 触发 LLM
                                                              ↓
                                              LLM 生成回复 → G2P → TTS → 播放
```

| 维度 | G2P | Semantic VAD |
|------|-----|-------------|
| **输入** | 文本 | 音频 + 语义上下文 |
| **输出** | phoneme 序列 | 决策（说完了/没说完） |
| **所在阶段** | TTS 前（输出侧） | ASR 后（输入侧） |
| **本质** | 表示转换层（Representation Layer） | 决策控制层（Control Layer） |
| **是否影响打断** | 不影响 | 核心能力 |

一句话总结：**Semantic VAD 决定"什么时候说"，G2P 决定"怎么说"。**

### 4.2 隐藏的耦合点

虽然它们在不同层级，但在实时系统中存在间接耦合：

1. **Semantic VAD 节流 G2P**：VAD 判定用户还没说完 → 不触发 LLM → 不走 G2P
2. **打断废弃 G2P 结果**：TTS 正在播放（G2P 已完成），用户突然说话 → Semantic VAD 触发打断 → 已完成的 G2P 结果被丢弃
3. **流式截断**：在增量 G2P + 流式 TTS 的系统中，Semantic VAD 可能在 G2P 只做了一半时触发打断，导致 pipeline 截断

用控制论的视角看：

- **G2P** → 系统内部的"确定性转换模块"（执行层）
- **Semantic VAD** → 系统外部的"反馈控制机制"（调度 + 控制层）

---

## 五、Lexicon 与 Custom Lexicon——G2P 的 Override 层

### 5.1 Lexicon 的本质

很多人把 Lexicon 理解为"词典"，但更准确的定义是：

> **Lexicon = G2P 的发音覆盖规则表（Override Table）**

```
没有 Lexicon 时：
  "SQL" → G2P 模型推断 → /ˈsiːkwəl/ 或 /ˈɛs kjuː ɛl/  ← 不稳定

有 Lexicon 时：
  "SQL" → Lexicon 命中 → 强制 /ˈɛs kjuː ɛl/              ← 跳过 G2P，确定性输出
```

### 5.2 Pipeline 中的位置

```
LLM 输出文本
    ↓
  Text Normalization
    ↓
  ⭐ Lexicon / Custom Lexicon（这里介入）
    ↓
  G2P（处理 Lexicon 未命中的词）
    ↓
  phoneme → TTS
```

Lexicon 在 G2P **之前/之中**介入，对命中的词直接返回预定义的 phoneme，未命中的词才走 G2P 模型推断。

### 5.3 系统 Lexicon vs Custom Lexicon

| 类型 | 来源 | 覆盖范围 |
|------|------|---------|
| 系统 Lexicon | TTS 引擎自带 | 常见词汇的标准发音 |
| Custom Lexicon | 开发者定义 | 人名、品牌名、行业术语、LLM 生成词 |

Custom Lexicon 的本质是：**你在接管 G2P 对特定词汇的决策权**。

### 5.4 为什么 Lexicon 只能放在这个位置

- **TTS 之后？** 太晚了——phoneme → waveform 后发音已经"定死"
- **LLM 层解决？** 不可靠——你可以 prompt "请把 SQL 读成 S-Q-L"，但 LLM 输出不稳定、不可维护
- **唯一稳定的插入点**：G2P 前后

### 5.5 Custom Lexicon 的格式（PLS 标准）

在 Azure Speech Service 中，Custom Lexicon 使用 PLS（Pronunciation Lexicon Specification）格式：

```xml
<lexicon version="1.0"
         xmlns="http://www.w3.org/2005/01/pronunciation-lexicon"
         alphabet="ipa" xml:lang="en-US">
  <lexeme>
    <grapheme>SQL</grapheme>
    <phoneme>ˈɛs kjuː ɛl</phoneme>
  </lexeme>
  <lexeme>
    <grapheme>Azure</grapheme>
    <phoneme>ˈæʒər</phoneme>
  </lexeme>
  <lexeme>
    <grapheme>Kubernetes</grapheme>
    <phoneme>kuːbərˈnɛtiːz</phoneme>
  </lexeme>
</lexicon>
```

---

## 六、SSML——语音控制的 DSL

### 6.1 SSML 不是"配置文件"，是"控制语言"

**SSML（Speech Synthesis Markup Language）** 是 W3C 标准的语音合成标记语言。关键认知：

| 误解 | 事实 |
|------|------|
| "把配置写成 XML" | **嵌入在文本中的局部控制指令** |
| 静态、全局的设置 | **上下文敏感、位置相关的控制** |
| 上传一个文件让系统自动用 | **每次 TTS 调用时作为请求级输入** |

SSML 是"语音层的 DSL（Domain Specific Language）"——让你直接操控 TTS pipeline，而不是只给它输入纯文本。

### 6.2 SSML 的核心能力

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">

  <!-- 1. 发音控制（phoneme）—— 覆盖 G2P -->
  Hello, welcome to
  <phoneme alphabet="ipa" ph="ˈɛs kjuː ɛl">SQL</phoneme>
  database training.

  <!-- 2. 停顿控制（break） -->
  Let me think<break time="500ms"/> about that.

  <!-- 3. 语速/音调控制（prosody） -->
  <prosody rate="slow" pitch="+10%">
    This is very important.
  </prosody>

  <!-- 4. 强调（emphasis） -->
  You must <emphasis level="strong">never</emphasis> do that.

  <!-- 5. 引用外部 Lexicon -->
  <lexicon uri="https://your-storage.blob.core.windows.net/lexicon.xml"/>

  <!-- 6. 选择说话人（voice） -->
  <voice name="en-US-JennyNeural">
    Hi there!
  </voice>

</speak>
```

### 6.3 SSML 与 Lexicon / G2P 的关系

三者构成一个层级化的发音控制体系：

```
SSML（局部 override）          ← 精确到"这一处"
  + Lexicon（全局规则）          ← 所有出现的某个词
    → 共同约束 G2P（默认策略）   ← 兜底推断
```

| 层级 | 作用域 | 示例 |
|------|--------|------|
| SSML `<phoneme>` | 局部（这一处） | 本句中 SQL 读 /ˈsiːkwəl/ |
| Lexicon | 全局（所有出现） | SQL 永远读 /ˈɛs kjuː ɛl/ |
| G2P | 兜底（Lexicon 未命中） | 未知词由模型推断 |

### 6.4 SSML 在 Pipeline 中的位置

```
LLM 输出（文本 or SSML）
    ↓
  SSML Parser（解析控制标签）
    ↓
  Text Normalization
    ↓
  Lexicon / G2P
    ↓
  TTS（声学模型 + Vocoder）
    ↓
  音频
```

SSML 是在 G2P 之前，把**控制意图**注入 pipeline。

---

## 七、不同技术栈的 G2P 控制能力对比

这是选择 Voice Agent 技术栈时一个经常被忽视但后期影响巨大的因素。

### 7.1 Azure Speech Service——Hybrid G2P，强可控

```
Text → （内部 G2P）→ TTS → Audio
         ↑
  SSML <phoneme> 可 override
  Custom Lexicon 可全局覆盖
```

| 能力 | 支持情况 |
|------|---------|
| 内置 G2P | 支持 |
| 显式 phoneme 控制 | 支持（SSML `<phoneme>`） |
| Custom Lexicon | 支持（PLS 格式） |
| 流式 TTS | 支持 |
| **可控性** | **高** |

Azure Speech 的 G2P 是"可编排组件"——默认自动处理，出错时可手动 override。

### 7.2 GPT-Realtime / OpenAI Realtime API——End-to-End 黑盒

```
LLM → Text → （内部 G2P + TTS）→ Audio
                    ↑
               不可见、不可控
```

| 能力 | 支持情况 |
|------|---------|
| 内置 G2P | 支持（内嵌） |
| 显式 phoneme 控制 | 不支持 |
| Custom Lexicon | 不支持 |
| 流式 TTS | 支持 |
| **可控性** | **低** |

唯一的"控制"手段是文本层面的间接 hack：
- `read` → `reed`（拼写调整）
- `Hello... John`（插入停顿）

本质上是在 hack G2P，而不是控制 G2P。

### 7.3 选型决策矩阵

| 你的需求 | 推荐路线 |
|---------|---------|
| 快速验证 / Demo / 内部工具 | GPT-Realtime（黑盒，上手快） |
| 英文为主，不在意发音精度 | GPT-Realtime |
| 涉及人名 / 地名 / 品牌名 | Azure Speech（需要 Lexicon 控制） |
| 多语言混合（中英混读） | Azure Speech（必须有发音控制） |
| 专业领域（医疗 / 金融） | Azure Speech + Custom Lexicon |
| 产品级语音体验 | Azure Speech + Pronunciation Control Layer |

**核心判断**：不是"它们有没有 G2P"——都有。而是**你有没有"发音控制权"**。G2P 控制能力决定的不是"能不能做"，而是"做大之后会不会崩"。

---

## 八、Realtime Voice Agent 的发音控制工程实践

### 8.1 一个关键认知误区

> 很多人试图用"离线 TTS 的思路"设计"Realtime Voice Agent"——这两个世界是有冲突的。

离线 TTS 可以：整段 SSML 一次性提交、完整 Lexicon 引用、不关心延迟。

Realtime 场景的约束：

- **SSML + Streaming 天然冲突**：XML 要完整结构，streaming 是 token 流
- **LLM 不会稳定生成 SSML**：标签不闭合、结构错误
- **复杂 Lexicon 引用增加网络依赖**

### 8.2 正确的工程架构——Pronunciation Control Layer

不要试图让 LLM 直接输出 SSML，而是在 LLM 和 TTS 之间构建一层**发音控制层**：

```
LLM（streaming text output）
    ↓
⭐ Pronunciation Control Layer（你自己构建）
    ├── Text Normalization
    │     "SQL db v2" → "S Q L database version two"
    │     ALL CAPS → 拆字母（API → A-P-I）
    │     数字 → 规则读法
    │     URL → 拆分
    ├── Lexicon Match（高频/高价值词）
    │     命中 → 替换为预定义发音文本或 phoneme
    ├── Phoneme Override（已知易错词）
    │     SQL, Azure, Kubernetes → 强制指定发音
    └── Fallback（long tail）
          heuristic 规则 或 简单字典
    ↓
TTS（Azure Speech / 其他引擎）
    ↓
音频流 → 播放
```

### 8.3 SSML 在 Realtime 中的正确用法

**不是主控制手段，只能"点状使用"：**

| 方式 | 描述 | 适用场景 |
|------|------|---------|
| **方案 A：纯文本控制**（最稳） | SQL → "S Q L"，直接文本 hack | Streaming 友好、零延迟 |
| **方案 B：Chunk 级 SSML** | Buffer 一句话 → 包一层 SSML → 发给 TTS | 有明确发音需求、非极致低延迟 |
| **方案 C：Lexicon + SSML** | SSML 引用远程 Lexicon | 复杂但可控，增加网络依赖 |

推荐：**大部分场景用方案 A，关键词用方案 B，不推荐 C 用于 Realtime。**

### 8.4 Azure Voice Live API 中的实践

关于 SSML 和 Custom Lexicon 在 Azure Voice Live API 中的使用，有几个关键点：

**SSML 是请求级输入，不是上传文件：**

```
❌ "上传一个 SSML 文件"让系统自动用
✅ 每次 TTS 调用时动态生成 SSML 作为输入
```

```http
POST /tts
Content-Type: application/ssml+xml

<speak version="1.0">
  Hello
  <phoneme alphabet="ipa" ph="ˈɛs kjuː ɛl">SQL</phoneme>
</speak>
```

**Custom Lexicon 是可上传资源，两种使用方式：**

| 方式 | 描述 |
|------|------|
| SSML 中引用 | `<lexicon uri="https://your-blob.blob.core.windows.net/lexicon.xml"/>` |
| Speech Studio 管理 | 上传 Lexicon → 绑定 voice / deployment |

注意：Lexicon 文件通常放在 Azure Blob Storage，需要 SAS token 保证可访问。

**Voice Live API 对 SSML/Lexicon 的支持是受限的：**

- 支持：基本 SSML tag、简单文本输入
- 不稳定/不推荐：大量 SSML 标签、streaming 中动态拼 SSML、复杂 Lexicon 引用

根本原因：**Realtime Pipeline ≠ Batch TTS**。

### 8.5 最小可行发音策略（MVP）

如果你正在构建 Realtime Voice Agent，不要一开始就设计"完美 G2P 系统"，先用 80/20 规则：

**Step 1：维护一个小型 Lexicon**

```json
{
  "SQL": "S Q L",
  "Azure": "AZH-ure",
  "Kubernetes": "koo-ber-NET-es",
  "API": "A P I",
  "CUDA": "koo-dah"
}
```

**Step 2：简单规则 Fallback**

- ALL CAPS → 字母拼读
- 数字 → 规则转写
- URL → 拆分读取

**Step 3：Text Normalization（比 G2P 更重要）**

```
"SQL db v2"  →  "S Q L database version two"
"@"          →  "at"
"$100"       →  "one hundred dollars"
```

**Step 4：只在必要时使用 SSML**

80% 的发音问题来自 20% 的词——先覆盖这 20%，再逐步补充。

---

## 九、总结：Speech Out 层的概念关系图

```
┌─────────────────────────────────────────────────────────────────┐
│                    Speech Out 概念关系                           │
│                                                                 │
│   Grapheme（字位）──── G2P 转换 ────→ Phoneme（音位）            │
│       ↑                  ↑                   ↓                  │
│    文本输入         Lexicon 覆盖        声学模型 → 音频           │
│                      ↑                                          │
│                 SSML 局部控制                                    │
│                                                                 │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│   │   SSML   │→ │ Lexicon  │→ │   G2P    │→ │   TTS    │       │
│   │(局部控制) │  │(全局规则) │  │(默认推断) │  │(声学合成) │       │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│   优先级：高 ───────────────────────────────────→ 低             │
└─────────────────────────────────────────────────────────────────┘
```

**关键记忆点**：

- **G2P** 是"能力"，**TTS** 是"系统"——G2P 可以被 TTS 吸收，但功能上永远独立
- **Lexicon** 不是"数据"，而是"控制权"——它是对 G2P 的 override 层
- **SSML** 是"调用参数"，不是"配置文件"——每次请求级输入，不是全局设置
- **Semantic VAD** 决定"什么时候说"，**G2P** 决定"怎么说"——不同层级，间接耦合
- 在 Realtime 场景下，**Pronunciation Control Layer** 比直接用 SSML 更靠谱

---

## 参考链接

- [W3C SSML Specification](https://www.w3.org/TR/speech-synthesis11/)
- [W3C PLS（Pronunciation Lexicon Specification）](https://www.w3.org/TR/pronunciation-lexicon/)
- [Azure Speech Service - SSML 文档](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup)
- [Azure Speech Service - Custom Lexicon](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup-pronunciation#custom-lexicon)
- [ChatGPT 原始讨论](https://chatgpt.com/share/69f31ccb-094c-8323-a34b-9ac9a8563bb7)
