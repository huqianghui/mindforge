---
title: Continually Self-Improving AI 论文精读笔记
created: 2026-03-22
tags:
  - paper-reading
  - LLM
  - continual-learning
  - synthetic-data
  - EntiGraph
  - SBP
  - AutoML
  - AI-research-agent
---

# Continually Self-Improving AI 论文精读笔记

> 论文：[Continually Self-Improving AI](https://arxiv.org/html/2603.18073v1)
> 作者：Zitong Yang（博士论文）
> 相关资源：
> - [EntiGraph 论文](https://arxiv.org/html/2409.07431v1)
> - [synthetic_continued_pretraining 代码](https://github.com/zitongyang/synthetic_continued_pretraining)
> - [slm-fine-tune-private-domain-kb-generation](https://github.com/huqianghui/slm-fine-tune-private-domain-kb-generation)
> - GraphRAG

## 核心问题：Transformer 的三大局限

当前 LLM 面临三个根本性限制：

1. **权重静态化与上下文记忆有限**：预训练完成后参数不再自动更新，受限于上下文窗口，无法长期保留记忆
2. **依赖有限的人类数据**：训练数据需求呈幂律增长（Scaling Law），高质量文本语料即将触顶
3. **训练算法依赖人力设计**：架构创新、超参选择仍需研究者手动探索，效率受限

论文提出三个突破方向，分别对应三种核心能力：持续知识获取、自主生成训练信号、自主设计学习算法。

## 方案一：EntiGraph — 合成持续预训练（持续知识获取）

**目标**：让预训练后的 LLM 高效吸收小型领域新知识，避免灾难性遗忘。

**核心流程**：

1. **实体抽取**：从领域文档中提取关键实体（人名、概念、地点等）
2. **关系描述**：让 LLM 针对每对实体生成关系描述，等效于遍历知识图谱的边
3. **合成语料生成**：汇总所有关系描述，构成多样化的合成训练语料
4. **继续预训练**：用合成语料对模型执行标准的 next-token prediction 训练

**关键实验结果**：

- 源语料规模比传统 CPT 小约 10,000 倍（~100M token 级别 vs ~1B token 级别）
- EntiGraph CPT 在 QuALITY 基准上呈对数线性扩展，直至 4.55 亿 token
- 闭卷问答准确率显著提升，接近 RAG 性能——无需外部检索即可回答
- EntiGraph + RAG 效果优于纯 RAG，两者互补
- 即使用较弱模型（Llama 3.1 8B）生成合成语料，仍有显著增益

**与 GraphRAG 的区别**：

| 维度 | EntiGraph | GraphRAG |
|------|-----------|----------|
| 阶段 | 训练阶段 | 推理阶段 |
| 方式 | 知识图生成合成文本 -> 继续预训练 | 知识图辅助检索 -> 多跳推理 |
| 效果 | 知识内化到参数 | 依赖外部图结构 |

**数据质量保证**：合成陈述与原文事实高度相符，n-gram 重复率极低，多样性好。

## 方案二：SBP — 合成引导预训练（自主生成训练信号）

**目标**：突破人类数据瓶颈，通过模型自身生成合成数据扩充预训练语料。

**核心流程**：

1. **最近邻文档配对**：基于 embedding 空间对文档进行相似度配对 (d1, d2)
2. **Synthesizer 微调**：微调模型学习条件生成 p(d2|d1)
3. **大规模合成数据生成**：高温采样批量生成多样化合成文档，与真实数据混合重训练

**核心创新 — 高熵训练目标**：

- 一个文档对应多个相关文档（一对多映射），迫使模型提炼共享抽象概念
- 不修改 Transformer 架构，仅改变训练目标和数据组织方式
- 将"跨文档关系建模"提升为预训练的一等公民

**实验结果**：

- 3B 模型：SBP 达到 20 倍真实数据训练增益的约 43%
- 6B 模型：SBP 达到 20 倍真实数据训练增益的约 58%
- 模型越大，从合成数据中获益越多
- 合成文本保留了潜在主题分布，避免了简单重复

## 方案三：AI 设计 AI — 测试时演化搜索（自主设计学习算法）

**目标**：让 AI 在推理阶段自行搜索更优的训练算法和配置。

**系统架构**：

- **研究员 Agent（Implementer）**：LLM 基于当前代码和指标提出改进方案，生成 code diff
- **调度器（Scheduler）**：管理资源分配和实验队列
- **执行工作器（Worker）**：应用 code diff -> 运行实验 -> 评价函数返回分数

**价值函数设计**：

```python
class AIResearchEnv:
    def value(self, code_diff):
        sandbox.exec(f"patch -p {code_diff}")  # 应用改动
        sandbox.exec("bash run.sh")             # 运行训练
        return sandbox.exec("bash eval.sh")     # 返回性能指标
```

**实验结果**：

- GRPO 环境（数学推理）：执行引导搜索优于 best-of-N 基线
- nanoGPT 环境（预训练）：自动发现的算法显著降低训练损失
- 生成的改进方案中，相当比例涉及算法层面的修改，而非仅超参调整
- Claude 4.5 Sonnet 和 Opus 均能高效生成候选方案

**关键限制**：仍依赖预设环境和评价指标，非完全自主演化。

## 三部分之间的递进关系

论文三个方案构成递进式的自我改进路径：

1. **EntiGraph**：窄领域能力更新（特定知识吸收）
2. **SBP**：基础能力引导（通用预训练增强）
3. **AI 设计 AI**：算法发现（自动化研究流程）

每一层都使 AI 系统获得更高程度的自主性，从"被动学习数据"到"主动生成数据"再到"自主设计学习方法"。

## 个人思考：实际价值与局限

**尚未解决的根本问题**：

- **灾难性遗忘**：EWC、Replay Buffer 等方案仍不够通用
- **注意力混淆**：长文本多任务场景下推理不稳定
- **缺乏真正的运行时知识注入**：仍需离线训练流程

**与个人项目的关联**：

- [slm-fine-tune-private-domain-kb-generation](https://github.com/huqianghui/slm-fine-tune-private-domain-kb-generation) 中的领域知识库生成流程，可借鉴 EntiGraph 的实体图数据增强策略
- GraphRAG 与 EntiGraph 互补：前者用于推理阶段，后者用于训练阶段

**核心洞察**：论文更多是在"优化已有范式"而非"突破范式本身"。三个方案均未改变 Transformer 底层架构，而是通过数据工程和系统工程实现能力提升——这本身就说明了当前 AI 进步的主要驱动力仍在工程层面。
