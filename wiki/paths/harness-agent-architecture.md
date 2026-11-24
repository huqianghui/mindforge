---
title: "学习路径：Harness 工程与 Agent 架构"
created: "2026-11-07"
updated: "2026-11-24"
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
> 这个领域的底座页多数 Claim 写于 7~8 月，概念性的结论大多仍成立，涉及具体产品和数字的以复核行为准。[[harness-engineering]]、[[model-harness-codesign]]、[[mcp-vs-cli]] 已在 2026-11 的几轮 `/revalidate` 里复核过。

**预计总用时**：约 16~20 小时（不含动手实验）。

## 第 1 站 · 最小形式：agent loop

- **读**：[[agent-loop-architecture]]、[[react-paradigm]]、[[agent-paradigms]]
- **前置**：无
- **用时**：约 1 小时
- **算会**：
  - 能手写一个最小 agent loop 的伪代码：调模型 → 解析工具调用 → dispatch → 结果回填 → 循环
  - 能说出 ReAct 为什么是 agent loop 的最小完备形式，以及 ReAct、Plan-and-Solve、Reflection 三种范式各对应什么认知策略
  - 能说出所有 agent 框架本质上只做哪三件事
  - 能说出一个请求为什么会跑成多轮：要调工具、输出被截断要恢复、上下文超限要压缩三种继续原因，以及工具层的路由表与控制面各管什么

## 第 2 站 · 上下文：从 prompt 到 context

- **读**：[[context-engineering]]、[[context-explosion]]、[[context-projection]]
- **前置**：第 1 站
- **用时**：约 1.5 小时
- **算会**：
  - 能解释"LLM 性能限制通常是上下文问题而非模型缺陷"，以及 context window 当作 RAM 的类比
  - 能说出 context 爆炸的根因：context 不等于 state
  - 能区分文档式加载与能力式加载，说出 Selection Layer 为什么是瓶颈
  - 能用"任务状态存在哪里"解释压缩为什么有时几乎无损、有时越压越差，并说出"压缩 + 只追加的完整日志 + 按需 grep"的折中
  - 能说出长会话的两种失败（上下文耗尽、提前宣布完成）和三类对策（分层加载、按工作区裁剪 MCP、插件开关即上下文开关）

## 第 3 站 · Harness：一等系统层

- **读**：[[harness-engineering]]（Claim「Harness Engineering 是 Prompt 和 Context Engineering 的超集」「Agent 的智能来自 model，可靠性来自 harness」「harness 按归谁、能不能改分三类」）、[[generation-evaluation-separation]]
- **前置**：第 2 站
- **用时**：约 2 小时
- **⚠️ stale**：[[harness-engineering]] 1/20、[[generation-evaluation-separation]] 3/16（其余读物全部 active，读时以各 Claim 的复核行为准）
- **算会**：
  - 能画出 Prompt < Context < Harness 的同心圆，说出每一圈多管了什么
  - 能说出 agent 的两种典型失败模式为什么是系统设计问题，以及级联失败为什么催生了 harness engineering
  - 能说出生成与评估分离的原则，并举出两个不同领域的实例
  - 能说出 harness 持续要回答的五个问题（任务怎么定义、状态怎么保存、上下文怎么控制、谁判断好坏、跑偏怎么修），以及 Delegate → Review → Own 的分工

## 第 4 站 · 控制论视角

- **读**：[[cybernetics-agent-design]]、[[feedback-loop]]、[[requisite-variety]]、[[cybernetics-harness-design-sheet]]；[[regulation-first-design]]（Regulation-First 五步与失败诊断表）
- **前置**：第 3 站
- **用时**：约 2 小时
- **⚠️ stale**：[[feedback-loop]] 1/4（其余读物全部 active，读时以各 Claim 的复核行为准）
- **算会**：
  - 能说出 agent 与控制系统为什么是结构同构而不是类比：负反馈、共轭变换、随机探索
  - 能解释"共轭变换是 agent 失败的首要原因"：表示错误比推理错误更常见
  - 能用必要多样性定律解释为什么调节永远"完成不了"，以及模型变强后外层调节器为什么要降复杂度
  - 能分清 Regulation 与 Optimization，并按 Governance → Regulation → Control → Orchestration 的顺序问问题
  - 能用 Regulation-First 给一个项目列出被调节量、扰动、反馈通道与调节器，并说出为什么代码质量不是被调节量

## 第 5 站 · 扩展机制：skill、MCP、hook

- **读**：[[skill-runtime]]、[[skill-pattern]]、[[harness-portability-spectrum]]、[[claude-code-extension-system]]
- **前置**：第 3 站
- **用时**：约 2 小时
- **⚠️ stale**：[[harness-portability-spectrum]] 2/8（其余读物全部 active，读时以各 Claim 的复核行为准）
- **算会**：
  - 能说出 skill 与 tool 的本质区别，以及 skill 为什么是唯一跨 harness 可移植的资产
  - 能按"离模型越近越可移植"给 skill、MCP、prompt、subagent、hook、command 排序
  - 能说出 plugin 为什么是分发单元而不是运行时单元
  - 能说出入口与执行为什么要分开（入口做 Skill、执行交给隔离的 Agent），以及什么样的角色才值得写成专用 agent 定义
  - 能说出为什么装第三方 skill 前不能只做文本扫描

## 第 6 站 · 工具与互操作协议

- **读**：[[mcp-vs-cli]]、[[a2a-protocol]]、[[ag-ui-protocol]]、[[a2ui-protocol]]；[[model-context-protocol]]（Claim「工具描述本身就是注入入口」）
- **前置**：第 5 站
- **用时**：约 2 小时
- **⚠️ stale**：[[mcp-vs-cli]] 1/8、[[ag-ui-protocol]] 1/5（其余读物全部 active，读时以各 Claim 的复核行为准）
- **算会**：
  - 能说出 MCP 与 CLI 两条路线的取舍（context 膨胀 vs token 效率），以及为什么最终是共存
  - 能说出 MCP 向下连工具、A2A 横向连 agent、AG-UI 向上连 UI 的分工
  - 能说出 A2A 的 Task 为什么不是工作流引擎、Agent Registry 为什么不是服务实例发现；A2UI 为什么"展示不等于授权"
  - 能解释恶意 MCP 工具描述怎么让 agent 照常完成任务又把数据交出去，以及为什么要由宿主授权次级工具调用

## 第 7 站 · 多 agent 与隔离

- **读**：[[claude-code-agent-subagent]]、[[orchestrator-pattern-multi-agent]]、[[oh-my-claude-code]]
- **前置**：第 3 站
- **用时**：约 1.5 小时
- **⚠️ stale**：[[orchestrator-pattern-multi-agent]] 1/3、[[oh-my-claude-code]] 1/4（其余读物全部 active，读时以各 Claim 的复核行为准）
- **算会**：
  - 能解释"进程隔离即上下文隔离"，以及 subagent 与主 session 的上下文为什么完全隔离
  - 能说出 orchestrator 模式里协调者负责什么、子 agent 负责什么，以及子 agent 只读记忆的设计理由（见 [[agent-memory-lifecycle]]）
  - 能区分 subagent 与长期协作的 teammate
  - 能说出 subagent 为什么是对上下文膨胀的架构级回答，以及它带回的摘要有损时怎么办

## 第 8 站 · 模型与 harness：绑定还是解耦

- **读**：[[model-harness-codesign]]、[[codex-desktop-architecture]]
- **前置**：第 3、5 站
- **用时**：约 1.5 小时
- **⚠️ stale**：[[model-harness-codesign]] 2/13、[[codex-desktop-architecture]] 1/4（其余读物全部 active，读时以各 Claim 的复核行为准）
- **算会**：
  - 能说出第一方绑定的结构性优势在训练时对齐，以及多模型适配成本为什么是笛卡尔积
  - 能用"逐层可撬性"评估一个 coding agent 接第三方模型：目录层、工具层、治理层各能不能换
  - 能举一个"同一个 harness 跨产品复用"的实例（微软 Copilot harness，见 [[github-copilot]]）
  - 能说出为什么评测要把 harness 当受控变量：同一模型换通用 harness，成功率和成本差多少，评测适配层本身又能把成绩拉低多少

## 第 9 站 · 基础设施：三层与沙箱

- **读**：[[agent-infra-three-layers]]、[[agent-harness]]（「harness 面向 model、runtime 面向 infra」「harness 不单列一层」）、[[agent-sandbox]]（「多租户平台上 harness 自身也当不可信」）
- **前置**：第 3 站
- **用时**：约 1 小时
- **⚠️ stale**：[[agent-harness]] 2/9（其余读物全部 active，读时以各 Claim 的复核行为准）
- **延伸**：harness 跑在哪、被谁管这一整块（执行、会话、治理、身份、定义与发现、自建 vs 托管）已单独排成 [[agent-runtime-platform]]，11 站，本站只读它的第 1、2 站即可接着往下走
- **算会**：
  - 能按三个问题划分 Framework / Runtime / Platform，说出 harness 为什么不单列一层
  - 能说出 harness 面向 model、runtime 面向 infra 的两个边界测试（换模型要不要重调、谁在焦虑什么）
  - 能说出沙箱的三件事：隔离原语、环境的分配与回收、出站与凭据，以及"凭据不进沙箱"的做法
  - 能说出 agent 本身和它执行的代码为什么要分开选隔离粒度，以及编码 harness 为什么例外、整个放进沙箱

## 第 10 站 · 外循环：Loop Engineering 与评测门禁

- **读**：[[loop-engineering]]、[[harness-engineering]]（Claim「多模型 harness 必须自建三层评测体系」「Agent 行为回归是传统 CI 测不出的新回归类别」）
- **前置**：第 3、4 站
- **用时**：约 1.5 小时
- **⚠️ stale**：[[harness-engineering]] 1/20（其余读物全部 active，读时以各 Claim 的复核行为准）
- **算会**：
  - 能区分内循环与外循环，说出外循环的最小内核（自动发现 + workflow + 重复 + 跨轮记忆）
  - 能解释"循环的形状由验证信号来源决定"，以及验证为什么要左移
  - 能说出多模型 harness 的三层评测：离线 benchmark → PR 门禁 → 生产 A/B，以及 agent 行为回归为什么是传统 CI 测不出的新回归类别

## 前沿站 · 正在发生的变化

来自知识差距报告的 harness、agent-eval、agent-memory、multi-agent、agent-tooling 等主题。「算会」统一是：**能说出它改变了上面哪一站的哪条结论**。2026-11-23 那期的三条（上下文压缩的适用条件、harness 当受控变量、skill 与 MCP 成为注入入口）已经收进第 2、5、6、8 站。

- **模型自己编排子 agent 成为独立评测的能力**（2026-11-23，WorkflowArena，仅读摘要）→ 影响第 7 站：委派次数与每次组多少 worker，Claude Code 与 Codex 走了不同的路
- **Agent 评测加入欺骗与压力场景**（2026-11-23）→ 影响第 10 站的质量门禁：agent 是否如实报告自己做了什么
- **Harness 递归自我优化进入大厂开源阶段**（2026-10-25，Harness² 等）→ 影响第 3、10 站；与 [[recursive-self-improvement]] 衔接
- **Agent memory 有了能直接用的评测结论**（2026-10-25）→ 影响第 7 站与 [[agent-memory-lifecycle]]
- **设计品味类 skill 在 GitHub 周榜上增长最快**（2026-11-23）→ 影响第 5 站：skill 从工具封装扩展到审美与判断
- **重磅热点 · REA（Reverse Engineer Anything）**：用 MCP 把逆向工具交给 coding agent，按"证据 → 推理 → 验证"闭环拆解没有源码的程序 → 影响第 5、6 站；合规与知识产权风险高，了解原理即可

## 毕业标准

拿到一个陌生的 agent 产品或框架，能在 20 分钟内说出：它的 loop 长什么样、context 怎么管、harness 归谁能不能改、扩展机制走哪条、工具与协议用什么、模型绑不绑定、跑在哪一层的基础设施上，以及它最可能在哪一环失败。

## 这条路径暴露的缺口

- **stale 大幅下降**：2026-11-07 全库复核与之后几轮复核后，各站读物的 stale 只剩少数（见各站 ⚠️ 行），2026-11-24 复核后 [[model-harness-codesign]]、[[context-explosion]]、[[generation-evaluation-separation]] 已清零，剩下的零星分布在各站
- **缺评测类概念页**：agent-eval 连续多期在知识差距报告里出现，wiki 只有 [[harness-engineering]] 与 [[model-harness-codesign]] 里的几条评测 Claim，没有"coding agent 评测"概念页
- **安全类仍没有独立页**：MCP 注入与恶意 skill 已作为 Claim 收进 [[model-context-protocol]]、[[skill-pattern]]，但 agent 安全作为一个领域还没有伞形页
