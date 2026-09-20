---
title: VLA系列01：VLA输出架构演进——从动作token到扩散动作头
created: 2026-09-17
series: VLA
series_index: 1
aliases:
  - 具身智能系列02：VLA输出架构演进——从动作token到扩散动作头
tags:
  - embodied-ai
  - vla
  - diffusion
  - structured-output
  - computer-use
---

# VLA系列01：VLA 输出架构演进——从动作 token 到扩散动作头

> VLA系列导航：**01（本篇）** · [02 扩散与Transformer的分工](VLA系列02：扩散与Transformer在VLA中的分工——动作块并行去噪与闭环重规划.md) · [03 扩散模型基础](VLA系列03：扩散模型基础——从去噪机制到高维连续多峰的选型逻辑.md) ｜ 总导读：[具身智能全景](具身智能全景：从LLM、Agent、RAG到物理世界闭环.md)

从软件 Agent 的经验出发看 VLA（Vision-Language-Action），一个自然的疑问是：**动作输出为什么不直接用 structured output？** Computer use 就是让模型按固定格式输出 `click(x, y)` 这类结构化命令，稳定可靠——机器人动作看起来也就是几个数字（关节角度、末端位姿），约束成固定 schema 不就行了？

这个问题正好卡在"软件 Agent 思维"和"机器人控制思维"的交界处。答案是：**早期 VLA 真的就是这么做的**，后来主流才转向独立的连续动作头。转向的原因不在"格式稳不稳"，而在动作这种输出本身的性质。本篇把这条演进线讲清楚。

## 一、两代输出方式

### 第一代：动作离散化成 token（RT-2、OpenVLA，2023–2024）

做法：机械臂有 7 个自由度（xyz 位移、三个旋转、夹爪开合），把每个维度的取值范围切成 256 个 bin，每个 bin 对应词表里一个（挪用或新增的）token。模型像生成文本一样，自回归地吐出 7 个 token，反量化后就是一个动作。

这本质上就是 structured output——"schema" 是 7 个整数，只是约束方式不是 JSON grammar 而是动作词表。它的巨大好处是**完全复用 LLM 的架构、训练目标和推理栈**：不改模型结构，动作数据和图文数据混在一起做 next-token prediction 就能训，这正是 RT-2 证明"VLM 预训练知识能迁移到机器人控制"时选它的原因。

### 第二代：独立的连续动作头（π0、Rho-alpha 等，2024 至今）

做法：VLM 骨干负责理解图像和指令，然后接一个独立的**动作专家头（action expert）**——一个规模小得多的网络，用扩散模型（diffusion）或 flow matching 直接生成连续的动作序列（一次出未来几十步，称为 action chunking）。π0 甚至给这个头单独一套权重，与骨干分工明确。

## 二、为什么转向：四个原因

每个原因都可以和 computer use 的场景对照，看出两类任务的本质差异。

### 1. 精度与平滑性

把连续值切成 256 个 bin，在 1 米的工作空间里分辨率约 4 毫米——插拔、拧旋钮、精密装配不够用。更麻烦的是相邻两帧的动作若落在 bin 边界两侧会发生跳变，机械臂表现为抖动。

对照 computer use：点击一个按钮，坐标差几个像素完全无所谓，按钮本身就有几十像素的容错。**离散化的代价在 UI 操作里不存在，在物理操作里是硬伤。**

### 2. 频率与延迟

机器人控制通常要求 10–50 Hz 出动作，而且现在主流做 action chunking——一次预测未来 50 步保证动作连贯。7 维 × 50 步 = 350 个 token，自回归逐个生成，在真机的实时性要求下来不及。扩散头一次并行生成整段（机制细节见[VLA系列02](VLA系列02：扩散与Transformer在VLA中的分工——动作块并行去噪与闭环重规划.md)）。

对照 computer use：一步操作之后要等页面加载几百毫秒到几秒，模型有充足时间慢慢生成下一个命令，**延迟从来不是瓶颈**。

值得一提的是 token 派没有认输：Physical Intelligence 后来推出 FAST tokenizer，用 DCT（离散余弦变换）压缩动作序列，把 token 数大幅压下来——但这是在追赶连续头已经具备的能力。

### 3. 多模态分布——最本质的一条

面前一个杯子，从左边绕过去抓和从右边绕过去抓**都是正确答案**。训练数据里两种示范都有时：

- 用回归（MSE）或对 softmax 分布取期望，模型会学出两个峰的平均值——"从中间直接撞过去"。**两种正确答案的均值是错误答案**。
- 扩散模型天然能表示多峰分布：采样时随机落入其中一个峰，然后把这条轨迹走到底，不会在两个方案之间摇摆。（"多峰"的精确含义、以及扩散为什么用 MSE 损失训练却不输出均值，见[VLA系列03](VLA系列03：扩散模型基础——从去噪机制到高维连续多峰的选型逻辑.md)。）

对照 computer use：要点"提交"就是那一个按钮，决策是离散且唯一的，几乎不存在"两个都对但不能取平均"的问题。

### 4. 维度间的耦合

7 个关节必须协同才构成一个合理的姿态。自回归逐维生成时，后面的维度只能条件于前面已采样的维度，误差沿着生成顺序累积；扩散头一次联合建模整个动作向量（乃至整个动作块），维度间的一致性在每一步去噪中同时被约束。

## 三、structured output 的"稳定性"到底稳定了什么

回到最初的疑问。Structured output 在 LLM 应用里解决的痛点是**格式合法性**：保证输出一定能被解析（JSON 不缺括号、字段类型正确）。但机器人真正需要的是**物理合法性**：不撞、不抖、力度对、轨迹平滑。

这两者是错位的：

- 连续动作头的输出本来就是固定维度的浮点向量，**不存在解析失败**——格式合法性在这里根本不是问题，structured output 的核心卖点落空；
- 而 structured output 的实现方式（离散化 + 串行生成 + 单点输出）恰恰在精度、延迟、多峰分布三个维度上与物理合法性冲突。

一句话：**structured output 解决的痛点在动作输出里不存在，它带来的代价却很实在。**

## 四、归纳：两类输出的分界，以及分层架构

| 维度 | Computer use（UI 操作） | 机器人控制 |
|---|---|---|
| 频率 | 低频（秒级一步） | 高频（10–50 Hz） |
| 输出性质 | 离散决策，"命令" | 连续控制信号，本身就是"执行" |
| 正确答案 | 通常唯一 | 常常多解（多峰分布） |
| 容错 | 高（像素级偏差无影响） | 低（毫米级偏差可能失败） |
| 可撤销性 | 多数可重试 | 不可撤销，有物理后果 |
| 最优输出方式 | Structured output + 确定性执行器 | 连续动作头（扩散 / flow matching） |

两者并不对立。现在的主流 VLA 系统其实是**分层**的：

- **高层任务规划**：VLM 做任务分解和子目标生成（"先去厨房、再找杯子、再抓取"）——这一层是低频、离散的决策，完全可以用 structured output；
- **低层动作策略**：连续动作头把子目标翻译成高频控制信号。

你熟悉的 planner / executor 结构在这里依然成立，只是 executor 从一段确定性代码换成了一个概率性的控制模型。关于 computer use 这一侧的 action loop 协议与执行器设计，可参考 [Computer Use 与 Browser Use 系列三：自己实现——action loop 协议、双执行器路线与跨平台 adapter 矩阵](../AI/computer-use/Computer%20Use与Browser%20Use系列三：自己实现——action%20loop协议、双执行器路线与跨平台adapter矩阵.md)，对照阅读能更清楚地看到两个世界在"executor"这一层的分岔。

顺带一提，这对权衡还会在更高的层次重现：3D 内容生产上"Agent 写代码指挥 Blender"与"神经模型直接生成 3D"之争，几乎就是本篇这对路线的放大版——见[空间智能系列03](空间智能系列03：3D内容生产的两条路线——Agent操作Blender与神经3D生成的分工.md)。

下一篇[VLA系列02](VLA系列02：扩散与Transformer在VLA中的分工——动作块并行去噪与闭环重规划.md)拆开扩散动作头内部：扩散和 Transformer 各自负责什么、"动作明明有先后因果怎么还能并行生成"。

## 参考

- [RT-2: Vision-Language-Action Models – Google DeepMind](https://deepmind.google/discover/blog/rt-2-new-model-translates-vision-and-language-into-action/)
- [OpenVLA: An Open-Source Vision-Language-Action Model](https://openvla.github.io/)
- [π0: A Vision-Language-Action Flow Model for General Robot Control – Physical Intelligence](https://www.physicalintelligence.company/blog/pi0)
- [FAST: Efficient Action Tokenization for Vision-Language-Action Models – Physical Intelligence](https://www.physicalintelligence.company/research/fast)
- [rho-alpha | Azure AI Labs](https://labs.ai.azure.com/innovations/rho-alpha/)
