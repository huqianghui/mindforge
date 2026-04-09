---
title: "论文阅读：The Bitter Lesson — 算力终将胜出，对 AI Agent 工程的启示"
created: 2026-03-21
tags: [paper-reading, bitter-lesson, reinforcement-learning, rich-sutton, AI-agent, harness-engineering, scaling, computation]
paper: "The Bitter Lesson"
authors: [Rich Sutton]
source: http://www.incompleteideas.net/IncIdeas/BitterLesson.html
related: "[[learn-claude-code——打开Coding Agent黑盒]]"
---

# 论文阅读：The Bitter Lesson — 算力终将胜出，对 AI Agent 工程的启示

> Rich Sutton 用一页纸总结了 AI 70 年的最大教训：**利用算力扩展的通用方法（search & learning）最终总会击败依赖人类领域知识的方法。** 这个结论对当下的 AI Agent 工程意味着什么？Harness Engineering 是会被模型吞噬的"人类知识"，还是不会过时的"元方法"？

---

## 一、论文核心摘要

### 作者背景

**Rich Sutton** 是强化学习（Reinforcement Learning）领域最重要的奠基人之一。他的核心贡献包括：

| 贡献 | 说明 |
|---|---|
| **Temporal Difference (TD) Learning** | 1988 年提出，RL 最核心的算法思想——不需要等到最终结果，每一步都可以更新价值估计 |
| **Policy Gradient 早期工作** | 奠定了后来 PPO / TRPO 等现代 RL 算法的基础 |
| **Dyna 架构** | Model-based RL 的开创性工作——agent 同时学习环境模型和策略 |
| **《Reinforcement Learning: An Introduction》** | 与 Andrew Barto 合著，RL 领域的"圣经"教材（1998 初版，2018 第二版） |

称他为"强化学习之父"并不夸张——如果 RL 领域只能选一个代表人物，Rich Sutton 是最没有争议的选择。

### 核心论点

论文只有一页，但论点极其锐利：

> **The biggest lesson that can be read from 70 years of AI research is that general methods that leverage computation are ultimately the most effective, and by a large margin.**

翻译成一句话：**不要把人类知识硬编码进系统，要构建能利用算力扩展的通用方法。**

Sutton 将能利用算力扩展的方法归结为两类：

- **Search**（搜索）——在解空间中大规模探索（如 Alpha-Beta 搜索、Monte Carlo Tree Search）
- **Learning**（学习）——从数据/经验中自动提取模式（如梯度下降、self-play）

### 四个历史案例

| 领域 | "人类知识"路线 | "算力扩展"路线 | 结局 |
|---|---|---|---|
| **国际象棋** | 编码人类对棋局结构的理解（开局库、残局表、评估函数手工调参） | 大规模深度搜索 + 专用硬件（Deep Blue, 1997） | 暴力搜索完胜 |
| **围棋** | 利用人类棋理减少搜索量（模式匹配、手工特征） | MCTS + self-play 学习价值函数（AlphaGo → AlphaZero） | Search + Learning 完胜，且 AlphaZero 完全不需要人类棋谱 |
| **语音识别** | 基于语言学知识（音素、声道模型、词汇规则） | 统计方法 HMM → Deep Learning（端到端，海量数据 + 海量算力） | 统计/DL 完胜 |
| **计算机视觉** | 手工特征（边缘检测、SIFT、广义圆柱体） | 卷积神经网络 + 大规模数据训练 | DL 完胜，手工特征全部被淘汰 |

### "苦涩"在哪里？

Sutton 总结了四条规律：

1. AI 研究者**总是**试图把人类知识编码进 agent
2. 这在短期内**总是有效的**，而且让研究者感觉良好
3. 但长期来看**总会停滞**，甚至阻碍进步
4. 突破性进展**最终总来自**利用算力扩展的对立方法

"苦涩"（bitter）是因为：这种胜利总是对人类自信心的打击——**我们精心设计的领域知识，被简单粗暴的"更多计算"碾压了。**

---

## 二、Bitter Lesson 和强化学习的关系

一个自然的问题是：Sutton 是 RL 之父，但 Bitter Lesson 的四个案例中，只有棋类属于 RL 的典型应用场景。语音识别和计算机视觉跟 RL 有什么关系？

### Sutton 说的不是 RL，而是 RL 背后的元原理

关键在于理解 Sutton 的抽象层次。他不是在推销 RL，而是在指出一个**跨领域的元规律**：

```
RL 的核心思想：
  Agent 通过与环境交互（trial-and-error）自主学习策略
  ↓ 抽象为
  "让计算（search + learning）替代人类知识"
  ↓ 这个原理不限于 RL
  语音识别：HMM 的统计学习 → DL 的端到端学习
  计算机视觉：CNN 自动学特征 → 取代手工设计的 SIFT
  NLP：Transformer 大规模预训练 → 取代手工语法规则
```

Sutton 的 RL 研究经历让他**亲身体验**了这个规律：

- **早期 RL**：研究者手工设计状态特征、奖励函数、启发式搜索策略
- **后来的突破**（TD-Gammon, AlphaGo）：全部抛弃手工设计，用 self-play + 大规模搜索让 agent 自己学

他从自己的领域出发，但发现这个规律在所有 AI 子领域都成立。**Bitter Lesson 不是 RL 论文，而是 AI 方法论论文——RL 只是他得出这个结论的起点。**

### Search 和 Learning 的统一性

Sutton 刻意把 search 和 learning 并列为"两种利用算力的方法"。这不是随意的分类：

| 方法 | 怎么利用算力 | RL 中的对应 | 其他领域的对应 |
|---|---|---|---|
| **Search** | 在可能性空间中大规模枚举/剪枝 | MCTS（Monte Carlo Tree Search） | 棋类搜索、Beam Search（NLP） |
| **Learning** | 从大量数据/经验中提取模式 | TD Learning、Policy Gradient | 监督学习、自监督预训练 |

在 AlphaZero 中，search（MCTS）和 learning（self-play 训练神经网络）是**同时使用、相互增强的**——MCTS 生成高质量训练数据，神经网络提供更好的搜索引导。这种 search + learning 的结合，在 Sutton 看来是利用算力的最高形态。

---

## 三、强化学习 Agent 与 LLM Agent——同一个词，两种实体

Sutton 论文中的 "agent" 和当下 Claude Code / Cursor 等产品中的 "agent" 用的是同一个词，但内涵有显著差异。

### 相同的骨架

两者都遵循**"观察 → 决策 → 行动 → 反馈 → 循环"**的基本模式：

```
RL Agent                              LLM Agent (如 Claude Code)
┌───────────────────┐                ┌───────────────────┐
│ 1. 观察环境 (state) │                │ 1. 读取 context     │
│ 2. 选择动作 (action)│                │ 2. 选择工具调用      │
│ 3. 执行动作         │                │ 3. 执行工具          │
│ 4. 获得奖励 (reward)│                │ 4. 获得工具结果      │
│ 5. 更新策略 (learn) │                │ 5. 追加到 messages  │
│ 6. 重复             │                │ 6. 重复             │
└───────────────────┘                └───────────────────┘
```

这也是 learn-claude-code S01 的 Agent Loop——`while stop_reason == "tool_use"` 本质上就是一个没有显式奖励信号的 agent 循环。

### 关键差异

| 维度 | RL Agent | LLM Agent |
|---|---|---|
| **学习** | **在线学习**——权重在交互中持续更新 | **不学习**——权重冻结，只靠 context 积累信息 |
| **策略来源** | 从零试错，self-play / exploration | 预训练获得通用策略，通过 prompt 进行"伪适应" |
| **奖励信号** | 明确的数值奖励（分数、距离） | **无显式奖励**——靠内化的 preference 判断好坏 |
| **记忆** | 内化在权重中（permanent） | 在 context window 中（ephemeral） |
| **泛化** | 窄域（训练 Atari 的不会下围棋） | 广域（同一个模型能编程、写文章、做数学） |
| **状态空间** | 低维向量或像素（结构化） | 自然语言 + 工具输出（非结构化、高维） |
| **动作空间** | 有限离散/连续（按键、关节角度） | 开放式（可生成任意文本、调用任意工具） |

**最本质的区别在"学习"这一行。** RL agent 的权重在每次交互后都会更新——它真的在"变聪明"。LLM agent 的权重是冻结的——它只是在 context window 里"假装在学习"，session 结束，一切归零。

这也是为什么 learn-claude-code 需要 12 层 harness（memory、context compression、skill loading、task system...）——**这些 harness 本质上是在补偿 LLM 缺失的在线学习能力**，用外部系统模拟 RL agent 天然具备的记忆和适应。

---

## 四、为什么不把 RL 的持续学习加入当前模型？

这是一个非常好的问题。事实上，RL 已经深度参与了当前 LLM 的训练流程：

```
LLM 训练流程：
Pre-training（自监督学习，海量文本）
  → SFT（Supervised Fine-Tuning，人类标注对话）
    → RLHF / RLAIF（强化学习，基于人类/AI 偏好优化）
      → 部署（权重冻结）
```

RLHF（Reinforcement Learning from Human Feedback）确实改变了模型权重——它让模型学会了"什么样的回答人类更喜欢"。**所以 RL 已经在影响权重了。**

那为什么不把这个机制延续到推理阶段，让模型在使用中持续学习？

### 技术障碍

| 障碍 | 说明 | 前景 |
|---|---|---|
| **灾难性遗忘** | 在新数据上更新权重，会覆盖旧知识 | 有明确的解决路径（见下文） |
| **奖励定义困难** | LLM 的"好回答"定义高度模糊、因场景而异，在线实时定义奖励目前做不到 | 硬问题 |
| **安全风险** | 在线学习意味着模型行为会随使用改变——可能被恶意用户通过对抗性输入"训练"成有害模型 | 硬问题 |
| **计算成本** | 推理已经很贵，加上实时梯度更新，成本翻倍甚至更多 | 硬问题 |
| **多用户冲突** | 一个云端模型服务百万用户，用户 A 和用户 B 的偏好可能矛盾 | 本地化可解（见下文） |

#### 灾难性遗忘：不是不可解，而是还没在大模型规模上完美解决

灾难性遗忘的本质是：神经网络的权重是**全局共享的**——学习新知识时更新的权重，和存储旧知识的权重是同一批参数。这和人类大脑不同——人脑有海马体（快速学习新记忆）和皮层（缓慢巩固长期记忆）的分层机制，新旧记忆不会互相覆盖。

受此启发，当前有多条解决路径：

| 人类记忆机制 | AI 对应方案 | 原理 |
|---|---|---|
| 海马体/皮层分离 | **CLS（Complementary Learning Systems）** | 快速学习模块 + 缓慢巩固主模型，互不干扰 |
| 重要记忆加固 | **EWC（Elastic Weight Consolidation）** | 标记"重要权重"并在更新时施加约束，保护旧知识 |
| 不同脑区处理不同功能 | **LoRA / Adapter 分层** | 冻结主模型，每个任务/用户只训练小适配层，互不覆盖 |
| 睡眠时整理记忆 | **Experience Replay** | 学新知识时混入旧数据回放，防止遗忘 |

其中 **LoRA/Adapter 分层已在工业界广泛使用**，是目前最实用的折中——主模型权重不动，每个场景叠加一个轻量适配层。这个方向正在快速成熟。

#### 多用户冲突：本地化模型可以根本性消除

多用户冲突的前提是"一个云端模型服务所有人"。但如果模型足够小、运行在本地呢？

```
云端大模型：一个模型 → 百万用户 → 冲突是硬约束
本地小模型：每人一个专属模型 → 冲突消失

终局愿景：每个人拥有一个个性化 AI agent
  ├── 自己的硬件（手机 / PC / 专用芯片）
  ├── 自己的权重（通过本地 fine-tune 持续适应）
  ├── 自己的记忆和偏好（在线学习不影响他人）
  └── 自己的身份（真正的"专属 agent"）
```

这个趋势正在发生——Llama、Phi、Gemma 等开源小模型在手机端已可流畅运行。当本地算力足够时，"每人一个可持续学习的 agent"不再是科幻。

### 正在探索的方向

虽然完全的在线 RL 还不可行，但工业界和学术界正在从多个方向逼近：

| 方向 | 做法 | 代表工作 |
|---|---|---|
| **Test-time Compute** | 不改权重，但在推理时投入更多算力做搜索（思维链、自我验证、采样多个答案选最优） | OpenAI o1/o3、Claude 的 extended thinking |
| **Continual Fine-tuning** | 定期用新数据/反馈重新训练（离线），而非实时更新 | 各大模型的版本迭代 |
| **LoRA / Adapter** | 冻结主模型，只训练小规模适配层，降低遗忘风险 | 企业定制化微调 |
| **外部记忆系统** | 不改权重，但通过 RAG / Memory / CLAUDE.md 等外部系统提供"伪学习" | 当前 LLM agent 的主流方案 |
| **Self-play + RL** | 训练阶段用 RL self-play 大幅提升推理能力 | DeepSeek-R1（纯 RL 训练推理能力） |

**注意最后一行**：DeepSeek-R1 的突破恰恰验证了 Bitter Lesson——不靠人类标注的思维链，纯粹通过 RL self-play + 海量算力，让模型自己学会了推理。这和 AlphaZero 抛弃人类棋谱、通过 self-play 学会下棋是**同一个范式**。

### 小结

当前 LLM agent 的"不学习"不是因为 RL 理论不支持，而是因为**工程上还没有安全、高效地在推理时做在线学习的方法**。这正是 harness（外部记忆、context 管理、skill 加载）存在的原因——它是"等待模型获得在线学习能力之前的工程替代方案"。

---

## 五、Bitter Lesson 与 Scaling Laws 的关系

两者经常被混为一谈，但其实是不同层次的东西：

| 维度 | Bitter Lesson (Sutton, 2019) | Scaling Laws (Kaplan et al., 2020) |
|---|---|---|
| **性质** | 定性的方法论主张（"应该怎么做"） | 定量的经验公式（"做了之后会怎样"） |
| **核心** | 通用方法 + 算力扩展**终将胜过**人类知识编码 | 模型损失随 compute/data/params 呈**幂律下降** |
| **利用算力的方式** | Search **+** Learning 两条腿 | 主要是 Learning 一条腿（更大模型 + 更多数据） |
| **适用范围** | 所有 AI 子领域，不依赖具体架构 | 主要是 neural language models |

**联系**：Scaling Laws 可以看作 Bitter Lesson 的数学证明——"性能随算力幂律提升且不饱和"，正是"算力扩展方法终将胜出"的定量表达。

**关键区别在于 Search 的缺席**。Scaling Laws 时代（2020-2024）主要靠 Learning scaling——训练更大模型。但当训练数据接近枯竭、边际收益递减时，**Search scaling 回归了**：

```
Scaling Laws 时代（2020-2024）：主要靠 Learning scaling
  GPT-3 → GPT-4：更大模型 + 更多数据

Bitter Lesson 完整版（2024-）：Learning + Search 双 scaling
  o1/o3：推理时做 chain-of-thought 搜索（test-time compute）
  DeepSeek-R1：RL self-play 让模型学会自己搜索
  ↑ 这才是 Sutton 说的 Search + Learning 的完整形态
```

**结论**：Scaling Laws 可能会过时（当 Transformer 被新架构取代时），但 Bitter Lesson 不会过时（因为它不依赖具体架构，而是一个跨时代的方法论判断）。

---

## 六、Bitter Lesson 对当下 AI 从业者的意义

### 意义一：不要过度投资在"人类知识编码"上

这是最直接的启示。在 AI agent 工程中，以下做法都属于"编码人类知识"：

```
高风险（可能被 model scaling 淘汰）：
├── 手写复杂的 routing 逻辑（if task == "code" → agent_A; if task == "review" → agent_B）
├── 硬编码的 prompt 模板和工作流编排
├── 复杂的 multi-agent 协作协议（人为设计角色分工）
└── 精心手工设计的评估函数和奖励模型
```

Bitter Lesson 告诉我们：这些在当下有效，但当 model 足够强时，可能全部变成累赘。**更明智的做法是：让 model 自己学会规划、路由、协作，而不是人类替它做这些决策。**

### 意义二：但 Bitter Lesson 有适用边界

Sutton 的论点有一个隐含前提：**问题本身是可以通过更多计算来解决的。** 但在生产环境中，有些问题不是"计算问题"：

| Bitter Lesson 适用 | Bitter Lesson 不适用 |
|---|---|
| 规划、推理、工具选择（更多算力 → 更好的决策） | 权限边界、安全约束（这是确定性规则，不是搜索问题） |
| 代码生成、Bug 修复（更强的模型 → 更好的代码） | 成本控制、延迟 SLA（这是资源约束，不是能力问题） |
| 知识检索、问答（更大的模型 → 更好的记忆） | 审计合规、可复现性（这是制度要求，不是技术问题） |

**Harness 的"控制层"（权限、安全、成本、可观测性）不属于 Bitter Lesson 的适用范围**——模型再强，你也不会让它自己决定是否有权删除生产数据库。

### 意义三：最高价值投资是"元方法"——它不是被取代的，而是做取代的

Sutton 在结尾写道：

> "We want AI agents that can **discover** like we can, not which contain what we have discovered. Building in our discoveries only makes it harder to see how the discovering process can be done."

这里需要厘清三类投资的关系——**元方法不是被淘汰的那个，恰恰相反，它是做淘汰的那个**：

```
被取代的（人类编码的具体知识）：
├── "这个 bug 一般是 X 原因，先检查 X"
├── 手工编排的 routing / workflow / multi-agent 角色分工
└── 硬编码的 prompt 模板
    ↑ model 越强，这些越多余

做取代的（元方法 = search + learning 机制）：
├── 通用的 search 机制（让 model 自己探索解决方案）
├── 通用的 learning 机制（让 model 从反馈中自我改进）
└── 通用的 tool 接口（让 model 自己发现和使用工具）
    ↑ 这是 Sutton 说的 "build in the meta-methods"
    ↑ 永远不会过时，因为它就是利用算力的方式本身

不会被取代的（确定性约束，Bitter Lesson 管不到的）：
├── 安全边界（权限模型、path sandboxing）
├── 可观测性（日志、审计、trace）
├── 资源约束（成本上限、延迟 SLA、token 预算）
└── 确定性协议（API 契约、数据格式、系统集成）
    ↑ 不是"能力问题"而是"规则问题"，model 再强也需要
```

**通俗地说：与其教 AI "遇到这种 bug 先查日志"（具体知识），不如给它测试框架和错误反馈循环（元方法），让它自己学会 debug 策略——同时用权限系统确保它不会误删生产数据（确定性约束）。**

### 意义四：AI 从业者自己的"元方法"

上面讨论的元方法（search + learning）是**构建进 AI 系统的能力**。但 Bitter Lesson 对设计这些系统的**人**同样适用：AI 不断迭代会吞噬具体技能（写 prompt、调参数、搭 pipeline），不会吞噬的是元能力。

Bitter Lesson 对 AI 和对人说的其实是同一句话：

```
对 AI 系统：不要硬编码具体知识，要内建 search + learning
对 AI 从业者：不要只积累具体技能，要培养"学习如何学习"的能力
```

**三种不会被取代的元能力**：

| 元能力 | 对应层级 | 为什么不会被取代 |
|---|---|---|
| **定义问题**（判断力） | Spec Layer | AI 能 search & learn，但需要人定义"什么是对的"——需求、评估标准、好坏判断 |
| **设计约束**（架构力） | Harness Layer | 确定性边界需要价值判断——安全权衡、成本取舍、系统架构决策 |
| **跨域迁移**（元学习） | 贯穿所有层 | AI 在域内很强，但跨域连接仍依赖人类直觉——把 RL 迁移到 LLM agent、把认知科学迁移到 AI 工程 |

**Sutton 自己就是最好的例子**——他不是靠某个具体算法不被淘汰的（TD Learning 已经 38 年了），而是靠**从具体经验中提炼元规律的能力**。The Bitter Lesson 本身就是元方法的产物：观察 70 年历史 → 提炼跨领域规律 → 指导未来决策。这个能力，AI 目前还不具备。

这三种元能力在 [[Vibe Coding系列02：架构师视角的AI Harness Engineering最佳实践]] 中有对应的实践路径：

| 元能力 | Bitter Lesson 理论 | Harness Engineering 实践 |
|---|---|---|
| **定义问题** | 人定义"什么是对的"，AI 去 search & learn | 架构师编写 baseline spec 和 config.yaml——技术选型、架构决策不委托给 AI |
| **设计约束** | 确定性边界不是搜索问题 | 设计 CLAUDE.md 规则、权限边界、CI/CD 质量门——这些是"缰绳"的具体形态 |
| **跨域迁移** | 从具体经验提炼元规律 | 将 ragflow 的 60-70% 代码复用到 yoga-guru；将 OpenSpec 的变更管理理念迁移到 Superpowers |

**关键启示：Harness Engineering 本身就是架构师培养元能力的最佳练习场。** 你不是在"写配置文件"，而是在练习"定义问题 + 设计约束 + 跨域迁移"这三种不会被 AI 取代的元能力。做 Harness Engineering 的过程，就是让自己不被 AI 淘汰的过程。

---

## 七、总结

1. **Bitter Lesson 的核心**：算力扩展的通用方法（search + learning）终将胜过人类知识编码
2. **与 RL 的关系**：Sutton 从 RL 研究中提炼出这个规律，但它超越 RL，适用于所有 AI 子领域
3. **与 Scaling Laws 的关系**：Scaling Laws 是 Bitter Lesson 的数学证明（Learning 那条腿），test-time compute 是 Search 那条腿的回归
4. **RL Agent vs LLM Agent**：共享循环骨架，但 RL agent 在线学习、LLM agent 不学习——harness 本质是对缺失学习能力的工程补偿
5. **RL 与 LLM 训练**：RLHF 已参与权重更新，但推理时在线学习因安全/成本/遗忘尚不可行
6. **对系统的启示**：不要过度投资会被 scaling 淘汰的人类知识编码；投资确定性约束（安全、成本）和元方法（search + learning 机制）
7. **对从业者的启示**：元方法对人同样适用——培养定义问题、设计约束、跨域迁移的能力，而非积累会被 AI 吞噬的具体技能
8. **Harness 的正确定位**：不是教 model 怎么做，而是给它环境和边界——"build in the meta-methods, not the discoveries"

---

## 相关文章

- [[learn-claude-code——打开Coding Agent黑盒]] — Coding Agent 的 12 层 Harness 解构
- [[Vibe Coding系列02：架构师视角的AI Harness Engineering最佳实践]] — Harness Engineering 的实践框架
- [[Claude Code的Agent与Subagent架构解析——以Superpowers为例]] — Subagent context 隔离架构

## 参考资料

- [The Bitter Lesson（原文）](http://www.incompleteideas.net/IncIdeas/BitterLesson.html) — Rich Sutton, March 13, 2019
- [The Bitter Lesson（PDF）](https://www.cs.utexas.edu/~eunsol/courses/data/bitter_lesson.pdf) — UT Austin 课程存档
- [Reinforcement Learning: An Introduction](http://incompleteideas.net/book/the-book-2nd.html) — Rich Sutton & Andrew Barto, 2018 第二版
- [DeepSeek-R1 技术报告](https://arxiv.org/abs/2501.12948) — 纯 RL 训练推理能力的突破性工作
