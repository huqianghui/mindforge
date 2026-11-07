---
title: "学习路径：Harness 工程与 Agent 架构"
created: "2026-11-07"
updated: "2026-11-07"
tags:
  - wiki
  - path
  - harness
  - agent
  - context-engineering
path_id: "harness-agent-architecture"
audience: "自己 + CSA 团队"
gap_topics:
  - harness
  - agent-eval
  - agent-memory
  - mcp
  - agent-tooling
  - model-harness-decoupling
  - context-engineering
  - multi-agent
  - agent-safety
signals:
  - "GitHub Trending（agent harness、MCP、skill 生态）"
  - "arXiv：agent harness、coding agent evaluation、agent memory"
  - "Claude Code / Codex / GitHub Copilot 官方 changelog"
---

# 学习路径：Harness 工程与 Agent 架构

agent 的智能来自模型，可靠性来自 harness。这条路径从 30 行的 agent loop 出发，经过 context、harness、控制论、扩展机制、协议、多 agent、模型与 harness 的关系，一直走到基础设施和外循环，最后看这个领域正在发生的变化。

**怎么用**：按站点顺序读，每站对照「算会」自查。

> [!WARNING]
> 这个领域的底座页 stale 比例很高（多数 Claim 写于 7~8 月），概念性的结论大多仍成立，但涉及具体产品和数字的要以复核行为准。建议先跑一轮 `/revalidate` 覆盖 [[harness-engineering]]、[[model-harness-codesign]]、[[mcp-vs-cli]]。

**预计总用时**：约 16~20 小时（不含动手实验）。

## 第 1 站 · 最小形式：agent loop

- **读**：[[agent-loop-architecture]]、[[react-paradigm]]、[[agent-paradigms]]
- **前置**：无
- **用时**：约 1 小时
- **⚠️ stale**：三页共 13 条中 11 条 stale（概念性为主）
- **算会**：
  - 能手写一个最小 agent loop 的伪代码：调模型 → 解析工具调用 → dispatch → 结果回填 → 循环
  - 能说出 ReAct 为什么是 agent loop 的最小完备形式，以及 ReAct、Plan-and-Solve、Reflection 三种范式各对应什么认知策略
  - 能说出所有 agent 框架本质上只做哪三件事

## 第 2 站 · 上下文：从 prompt 到 context

- **读**：[[context-engineering]]、[[context-explosion]]、[[context-projection]]
- **前置**：第 1 站
- **用时**：约 1.5 小时
- **⚠️ stale**：三页共 15 条中 14 条 stale
- **算会**：
  - 能解释"LLM 性能限制通常是上下文问题而非模型缺陷"，以及 context window 当作 RAM 的类比
  - 能说出 context 爆炸的根因：context 不等于 state
  - 能区分文档式加载与能力式加载，说出 Selection Layer 为什么是瓶颈

## 第 3 站 · Harness：一等系统层

- **读**：[[harness-engineering]]（Claim「Harness Engineering 是 Prompt 和 Context Engineering 的超集」「Agent 的智能来自 model，可靠性来自 harness」「harness 按归谁、能不能改分三类」）、[[generation-evaluation-separation]]
- **前置**：第 2 站
- **用时**：约 2 小时
- **⚠️ stale**：[[harness-engineering]] 25 条中 22 条、[[generation-evaluation-separation]] 16 条中 7 条
- **算会**：
  - 能画出 Prompt < Context < Harness 的同心圆，说出每一圈多管了什么
  - 能说出 agent 的两种典型失败模式为什么是系统设计问题，以及级联失败为什么催生了 harness engineering
  - 能说出生成与评估分离的原则，并举出两个不同领域的实例

## 第 4 站 · 控制论视角

- **读**：[[cybernetics-agent-design]]、[[feedback-loop]]、[[requisite-variety]]、[[cybernetics-harness-design-sheet]]
- **前置**：第 3 站
- **用时**：约 2 小时
- **⚠️ stale**：理论页，stale 只表示没有新证据，结论变化慢
- **算会**：
  - 能说出 agent 与控制系统为什么是结构同构而不是类比：负反馈、共轭变换、随机探索
  - 能解释"共轭变换是 agent 失败的首要原因"：表示错误比推理错误更常见
  - 能用必要多样性定律解释为什么调节永远"完成不了"，以及模型变强后外层调节器为什么要降复杂度

## 第 5 站 · 扩展机制：skill、MCP、hook

- **读**：[[skill-runtime]]、[[skill-pattern]]、[[harness-portability-spectrum]]、[[claude-code-extension-system]]
- **前置**：第 3 站
- **用时**：约 2 小时
- **⚠️ stale**：四页共 22 条中 21 条 stale；[[skill-runtime]] 里 SEP-2640（skill 标准化为 MCP Resource）这条与三支柱路径第 9 站的 Foundry toolbox 是同一件事，可互相印证
- **算会**：
  - 能说出 skill 与 tool 的本质区别，以及 skill 为什么是唯一跨 harness 可移植的资产
  - 能按"离模型越近越可移植"给 skill、MCP、prompt、subagent、hook、command 排序
  - 能说出 plugin 为什么是分发单元而不是运行时单元

## 第 6 站 · 工具与互操作协议

- **读**：[[mcp-vs-cli]]、[[a2a-protocol]]、[[ag-ui-protocol]]、[[a2ui-protocol]]
- **前置**：第 5 站
- **用时**：约 2 小时
- **⚠️ stale**：[[mcp-vs-cli]] 8 条中 7 条；A2A、A2UI 两页全部 active
- **算会**：
  - 能说出 MCP 与 CLI 两条路线的取舍（context 膨胀 vs token 效率），以及为什么最终是共存
  - 能说出 MCP 向下连工具、A2A 横向连 agent、AG-UI 向上连 UI 的分工
  - 能说出 A2A 的 Task 为什么不是工作流引擎、Agent Registry 为什么不是服务实例发现；A2UI 为什么"展示不等于授权"

## 第 7 站 · 多 agent 与隔离

- **读**：[[claude-code-agent-subagent]]、[[orchestrator-pattern-multi-agent]]、[[oh-my-claude-code]]
- **前置**：第 3 站
- **用时**：约 1.5 小时
- **⚠️ stale**：[[claude-code-agent-subagent]] 5/5
- **算会**：
  - 能解释"进程隔离即上下文隔离"，以及 subagent 与主 session 的上下文为什么完全隔离
  - 能说出 orchestrator 模式里协调者负责什么、子 agent 负责什么，以及子 agent 只读记忆的设计理由（见 [[agent-memory-lifecycle]]）
  - 能区分 subagent 与长期协作的 teammate

## 第 8 站 · 模型与 harness：绑定还是解耦

- **读**：[[model-harness-codesign]]、[[codex-desktop-architecture]]
- **前置**：第 3、5 站
- **用时**：约 1.5 小时
- **⚠️ stale**：[[model-harness-codesign]] 12 条中 10 条
- **算会**：
  - 能说出第一方绑定的结构性优势在训练时对齐，以及多模型适配成本为什么是笛卡尔积
  - 能用"逐层可撬性"评估一个 coding agent 接第三方模型：目录层、工具层、治理层各能不能换
  - 能举一个"同一个 harness 跨产品复用"的实例（微软 Copilot harness，见 [[github-copilot]]）

## 第 9 站 · 基础设施：三层与沙箱

- **读**：[[agent-infra-three-layers]]、[[agent-sandbox]]
- **前置**：第 3 站
- **用时**：约 1.5 小时
- **算会**：
  - 能按三个问题划分 Framework / Runtime / Platform，说出 harness 为什么不单列一层
  - 能说出沙箱的三件事：隔离原语、环境的分配与回收、出站与凭据，以及"凭据不进沙箱"的做法
  - 能说出 agent 本身和它执行的代码为什么要分开选隔离粒度

## 第 10 站 · 外循环：Loop Engineering 与评测门禁

- **读**：[[loop-engineering]]、[[harness-engineering]]（Claim「多模型 harness 必须自建三层评测体系」「Agent 行为回归是传统 CI 测不出的新回归类别」）
- **前置**：第 3、4 站
- **用时**：约 1.5 小时
- **⚠️ stale**：[[loop-engineering]] 15/15
- **算会**：
  - 能区分内循环与外循环，说出外循环的最小内核（自动发现 + workflow + 重复 + 跨轮记忆）
  - 能解释"循环的形状由验证信号来源决定"，以及验证为什么要左移
  - 能说出多模型 harness 的三层评测：离线 benchmark → PR 门禁 → 生产 A/B，以及 agent 行为回归为什么是传统 CI 测不出的新回归类别

## 前沿站 · 正在发生的变化

来自知识差距报告的 harness、agent-eval、agent-memory、mcp、agent-tooling 等主题。这一站还没进 wiki，「算会」统一是：**能说出它改变了上面哪一站的哪条结论**。

- **Harness 递归自我优化进入大厂开源阶段**（2026-10-25，高优先级，建议深挖）：Harness² 等，权重不动、无监督改 harness → 影响第 3、10 站；与 [[recursive-self-improvement]] 衔接
- **Agent memory 第一次有了能直接用的评测结论**（2026-10-25，高优先级）→ 影响第 7 站与 [[agent-memory-lifecycle]]
- **Coding agent 评测走向真实工作状态**（2026-10-25）、**过度工程成为独立评测维度**（2026-10-19）→ 影响第 10 站的质量门禁
- **MCP 安全框架**、**Harness 安全的攻击分类学**（2026-09）→ 影响第 6、9 站
- **重磅热点 · REA（Reverse Engineer Anything）**：GitHub 上数十万星、连续多日霸榜，用 MCP 把 Ghidra、IDA、JADX 等逆向工具开放给 coding agent，按"证据 → 推理 → 验证"闭环拆解没有源码的程序；本身是 harness 插件生态（`dsh-plugin`）的产物 → 影响第 5、6 站：一个"skill + MCP 把专业工具链交给 agent"的极端样本，"每个结论绑定可核验证据"的做法也值得借鉴。合规与知识产权风险高，建议了解原理、不拿来逆向他人软件

## 毕业标准

拿到一个陌生的 agent 产品或框架，能在 20 分钟内说出：它的 loop 长什么样、context 怎么管、harness 归谁能不能改、扩展机制走哪条、工具与协议用什么、模型绑不绑定、跑在哪一层的基础设施上，以及它最可能在哪一环失败。

## 这条路径暴露的缺口

- **stale 是最大问题**：10 站里 8 站的底座页 stale 比例超过一半，优先 `/revalidate harness-engineering`、`model-harness-codesign`、`mcp-vs-cli`、`loop-engineering`
- **缺评测类概念页**：agent-eval 连续多期在知识差距报告里出现，wiki 只有 [[harness-engineering]] 里的两条评测 Claim，没有"coding agent 评测"概念页（[[harness-five-dimension-quality-gate]] 讲的是 Harness CI 产品的代码质量门禁，不是 agent 评测）
- **缺安全类页**：agent-safety、MCP 安全在报告里出现了 7 期，wiki 里没有对应页
