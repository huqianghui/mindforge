---
title: 知识差距分析报告 2026-07-06
created: 2026-07-06
tags:
  - wiki
  - knowledge-gap
  - analysis
stats: "79 concepts, 15 methods, 7 decisions, 402 claims"
github_trending_date: 2026-07-06
arxiv_query_date: 2026-07-06
huggingface_query_date: 2026-07-06
---

# 知识差距分析报告（2026-07-06）

> 四视角融合：wiki 内省（维度 1-3）+ GitHub 趋势（维度 4）+ arXiv 前沿（维度 5）+ HuggingFace 模型（维度 6-7）
> 对比基线：[[2026-06-17-gap-analysis]]

---

## 总览

| 指标 | 2026-06-17 | 2026-07-06 | 变化 |
|------|-----------|-----------|------|
| 概念页 | 67 | 79 | **+12** |
| 方法页 | 14 | 15 | +1 |
| 决策页 | 4 | 7 | +3 |
| Claims | 324 | 402 | **+78** |
| Stale Claims | 238 | 280 | +42（占 ~70%）|
| 低置信度（≤0.5）| 17 | 16 | -1 |

**本期主线增长：RL / 训练 / 优化 cluster**（12 个新概念中 11 个属此簇，均 06-29~07-02 创建）：
`agent-lightning`(10 claims)、`verl`(7)、`rejection-sampling-finetuning`(7)、`reinforcement-learning`(6)、`method-agnostic`(6)、`skillopt`(5)、`prefix-caching`(5)、`distributed-training-parallelism`(5)、`automatic-prompt-optimization`(4)、`model-routing`(4)、`hybrid-linear-attention-architecture`(4)、`online-learning`(4)、`bitter-lesson`(4)、`slime-rl-framework`(3)、`scaling-laws`(2)。
新方法：`sft-rejection-sampling-hands-on`。新决策：`rl-infra-framework-selection`、`hybrid-inference-framework-selection`、`spec-driven-vs-methodology-framework`。

---

## 维度 1-3：内省

### 覆盖广度
- **0 孤立概念**（健康，延续上期）。
- **RL cluster 深度不错但"同源"**——15 个新概念的来源几乎全部来自 agent-lightning 系列文章（02/07/08）+ SkillOpt 论文。claims 数量够（agent-lightning 10、verl 7），但**缺乏跨来源三角验证**，本质上是"单一信源家族"。
- **方法页仍是瓶颈**：79 概念仅 15 方法。RL cluster 只有 `sft-rejection-sampling-hands-on` 一个方法页——`verl` 训练、RL rollout、reward grader 设计等"怎么做"层严重缺方法页（知其然不知其所以然）。

### 认知深度
- **Stale 已达 280 条（~70%）**——evolve-wiki 重标记 + 大量早期 Claim 未复访。已成为知识库最大健康隐患。
- **低置信度 16 条**（≤0.5），基本延续上期分布（contract-testing、ephemeral-environment、notion-as-ai-layer 等测试/工具类）。
- **浅页**：`scaling-laws`(2 claims)、`slime-rl-framework`(3) 偏薄，建议后续补充来源。

### 知识成熟度
- 整体维持 🌳 成熟区间（~2.1）。
- **新 RL cluster 拉低"AI 训练/RL"这一新分类的成熟度**——虽 claims 密集，但同源、少方法、无实践验证记录（除 calc_x 首跑外）。属 🌿成长 向 🌳成熟 过渡。
- **上期 4 条 🔴 建议全部未落地**（见下），外部盲区未收敛，反而随前沿演进被进一步放大。

---

## 维度 4：GitHub 趋势对标

**近 90 天新锐（velocity 排序，节选与用户领域相关）**：

| 主题                       | 仓库                              | Stars | 创建         | 信号  | wiki 覆盖          | 动作       |
| ------------------------ | ------------------------------- | ----- | ---------- | --- | ---------------- | -------- |
| **LLM Wiki 桌面产品化**       | `nashsu/llm_wiki`               | 13.7k | 2026-04-08 | A   | 🔶 `llm-wiki` 概念 | **对标观察** |
| Self-hosted AI workspace | `pewdiepie-archdaemon/odysseus` | 80.9k | 05-31      | A   | ❌                | 观望       |
| Vibe Design Workspace    | `nexu-io/open-design`           | 75.2k | 04-28      | A/C | ❌                | 🔶 观察    |
| AI"偷懒资深"agent            | `DietrichGebert/ponytail`       | 74.8k | 06-12      | A   | ❌                | 观望       |
| DESIGN.md 规范             | `google-labs-code/design.md`    | 25.0k | 04-10      | C   | ❌                | 观察       |
| Code Knowledge Graph     | `colbymchenry/codegraph`        | 57.7k | 02-19      | C   | 🔶 PKC 相关        | 补充       |
| SkillOpt（已建页）            | `microsoft/SkillOpt`            | 10.8k | 05-08      | C   | ✅ `skillopt`     | —        |

**值得注意**：
- **`nashsu/llm_wiki`（13.7k）** —— "把文档编译成 LLM Wiki 的跨平台桌面应用"，与你的 `llm-wiki` 概念和整个 PKC 理念**几乎正面重叠**。这是你自建体系的外部产品化对照物，值得看它的 schema / 编译流程设计，验证或补强 `personal-knowledge-compiler`。
- **DESIGN.md / AI Design Agent 生态持续膨胀**（open-design 75k、awesome-design-md 96k、design.md 规范）——延续上期趋势，仍未建页，属 context-engineering 延伸，可持续观望。

---

## 维度 5：arXiv 前沿对标

扫描 2026 年 6-7 月论文，三个方向与你的**主线工作（RL 训练）和语音主线**强相关：

| 方向 | 代表论文 | 与 wiki 关系 | 建议 |
|------|---------|-------------|------|
| **Agent 持续学习 / 无梯度 test-time RL** | JitRL（training-free 测试时 RL，比 WebRL 省 30×）、LifeSkill（verifier 引导技能学习 + 在线内化）、XSkill（experience+skill 双流）、CURATOR（预算受限记忆治理 + 抗投毒）| `online-learning`/`continual-self-improving-ai` 仅概念性，`agent-lightning` 是离线训练 | 🔴 建 `agent-continual-learning`（上期已荐，现证据成体系）|
| **全双工端到端语音（去 VAD）** | BayLing-Duplex（单一自回归 LLM 决定听/说/停，**无 VAD 模块**，GLM-4-Voice + 400K + DPO，打断成功率 100%）、DuplexOmni（交互层/思考层异步分离）| 直接冲击 `turn-taking`、`voice-activity-detection`、`cascaded-vs-e2e-voice` 决策 | 🔴 **重评语音决策页**（上期已荐，现有具体架构）|
| **RLVR 细粒度奖励 / verifier** | STRIDE（从可验证结果导出策略级监督）、Tandem RL（强 senior + 冻结 junior 协同生成）、MRRG（多角色 rubric 生成 reward）、AgenticRL（agent 自动生成 reward 函数闭环）| `reinforcement-learning`/`generation-evaluation-separation` 假设静态 oracle | 🟡 补充来源，关联到 agent-lightning 系列08 RL 实战 |

---

## 维度 6：HuggingFace 模型近期动向

**新锐模型速报（likes/天，近 90 天）**：

| 排名 | 模型 | Velocity | 创建 | 一句话要点 | 重要性 |
|------|------|----------|------|-----------|--------|
| 1 | `zai-org/GLM-5.2` | 173 | 06-16 | GLM 新一代旗舰，社区关注爆发 | 🟡 |
| 2 | `deepseek-ai/DeepSeek-V4-Pro` | 69 | 04-22 | DeepSeek V4 Pro，开源 frontier | 🟡 |
| 3 | `gemma-4-12B-coder-...GGUF` | 100 | 06-10 | Gemma-4 代码微调 + GGUF 量化版 | 🟢 |
| — | `nvidia/nemotron-3.5-asr-streaming-0.6b` | 15 | 05-15 | 600M 流式 ASR（延续上期）| 🟡 |
| — | `bosonai/higgs-tts-3-4b` | 19 | 06-04 | 4B TTS 新版 | 🟢 |
| — | `Supertone/supertonic-3` | 14 | 05-06 | 轻量 TTS | 🟢 |

**技术动态**：语音侧仍是 **流式 ASR（Nemotron 0.6B）+ 端到端** 双线推进，与维度 5 的全双工论文互为印证；LLM 侧 GLM-5.2 / DeepSeek-V4-Pro 迭代活跃但属常规基座升级，非范式变化。

---

## 维度 7：近期趋势综合（多源验证）

| # | 趋势 | 信号源 | 重要性 | 动作 |
|---|------|--------|--------|------|
| 1 | **Agent 持续学习 / 无梯度 test-time RL** | 🔥 arXiv(JitRL/LifeSkill/XSkill/CURATOR 4 篇) | 🔴 | 建 `agent-continual-learning`——你在 agent-lightning 上做的是"离线训练"，这是"部署后在线自进化"的下一层 |
| 2 | **全双工端到端语音（去 VAD/去 turn-taking 模块）** | 🔥 arXiv(BayLing-Duplex/DuplexOmni) + HF(Nemotron streaming) | 🔴 | 重评 `cascaded-vs-e2e-voice`——BayLing-Duplex 用单 LLM 干掉了 VAD 模块，直接挑战你现有语音架构假设 |
| 3 | **RLVR 细粒度奖励 / agentic verifier** | 📈 arXiv(STRIDE/Tandem/MRRG/AgenticRL) | 🟡 | 关联到系列08 RL 实战——reward grader 设计正是 agent-lightning 的核心槽位 |
| 4 | **LLM Wiki 产品化对标** | 📈 GitHub(nashsu/llm_wiki 13.7k) | 🟡 | 看外部产品如何编译文档→wiki，反哺 `personal-knowledge-compiler` |
| 5 | **知识库自身健康：Stale 70%** | 内省 | 🟡 | 非外部趋势，但已是最大内部债——建议一轮 evolve-wiki 复访高价值 stale Claim |

---

## Top 5 优先行动

1. **建 `agent-continual-learning`** 🔴——arXiv 4 篇成体系（JitRL/LifeSkill/XSkill/CURATOR），且与你正在深耕的 agent-lightning（离线训练）形成"离线↔在线自进化"的完整光谱。上期已荐，现证据更强，是当前**内外结合价值最高**的一页。
2. **重评 `cascaded-vs-e2e-voice` 决策** 🔴——BayLing-Duplex 用单一自回归 LLM 取消了 VAD 模块、打断成功率 100%，你的 `turn-taking`/`voice-activity-detection` 概念面临架构级挑战。补充新证据，验证旧结论是否仍成立。
3. **给 RL cluster 补方法页 + 跨源验证** 🟡——15 个新概念同源（agent-lightning 系列），缺"怎么做"层。可结合系列08 的 calc_x 实战沉淀 `verl-training-hands-on` 方法页，并用 STRIDE/MRRG 等外部论文为 `reinforcement-learning`/`generation-evaluation-separation` 补第二信源。
4. **对标 `nashsu/llm_wiki`** 🟡——外部已有 13.7k star 的 "文档→LLM Wiki" 桌面产品，正面覆盖你的 PKC 理念。研究其 schema 与编译流程，反哺 `personal-knowledge-compiler` / `llm-wiki`。
5. **一轮 stale 复访** 🟡——280 条 stale（~70%）是最大内部债。用 `/evolve-wiki` 优先复访高关联度、高置信度但被标 stale 的核心页，恢复知识库时效性。

> 说明：上期 4 条 🔴 建议（mcp-security-framework、agent-continual-learning、agentic-verifier、coding-agent-benchmark-landscape）**均未落地**——本期你的精力集中在 RL 训练主线（agent-lightning 系列 + SkillOpt），属合理取舍。其中 `agent-continual-learning` 因前沿演进价值进一步上升，本期继续列为 #1。
