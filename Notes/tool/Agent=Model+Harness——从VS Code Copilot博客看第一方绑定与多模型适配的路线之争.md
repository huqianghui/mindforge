---
title: "Agent = Model + Harness——从 VS Code Copilot 博客看第一方绑定与多模型适配的路线之争"
created: 2026-07-08
tags: [agent, harness, harness-engineering, claude-code, vscode, github-copilot, agent-loop, model-harness-codesign, meta-harness, eval-gate]
---

# Agent = Model + Harness——从 VS Code Copilot 博客看第一方绑定与多模型适配的路线之争

> 源文章：[The Coding Harness Behind GitHub Copilot in VS Code](https://code.visualstudio.com/blogs/2026/05/15/agent-harnesses-github-copilot-vscode)（VS Code 官方博客，2026-05-15），及其续篇 [Optimizing the VS Code Coding Harness with Model Providers](https://code.visualstudio.com/blogs/2026/07/06/optimizing-vscode-coding-harness-model-providers)（2026-07-06，与 OpenAI 合作在生产流量上 A/B 调优 GPT-5.5 prompt）。本篇沿三条线展开：一是梳理原文的 harness 定义与工程细节；二是一个原文没有明说、但被它的证据充分支撑的推论——**第一方绑定（Claude Code + Claude 系列）为什么可能是结构性最优组合，以及多模型框架（VS Code / OpenCode）的先天代价**；三是顺着它的 PR 评测门禁往下挖——**"哪些改动敏感"这个判断今天由谁做、agent 改 harness 的时代怎么做、Meta-Harness 全量评测体制下它如何被整个溶解**。

---

## 一、原文的核心命题："The model is the engine. The harness is the car."

每次新模型发布，大家都在问"哪个模型最强"。VS Code 团队的回答是：这个问题问错了对象——对 coding agent 来说，**模型只是引擎，开发者真正交互的是整辆车（harness）**。

**Agent = Model + Harness**。语言模型自己不会编辑文件、不会执行命令、不会跑测试——它只会产出文本。Harness 是把文本变成行动、再把行动结果喂回模型的那一层系统。围绕模型固定下来的所有逻辑——上下文组装、工具暴露、工具执行、循环控制——都属于 harness。

### Harness 的三大职责（VS Code 版定义）

1. **Context assembly（上下文组装）**：请求到达模型之前，harness 负责拼 prompt——system message、用户 query、workspace 结构（语言/框架/打开的编辑器）、多轮对话历史、工具结果、custom instructions、跨 session 的 memory。**模型能看见什么完全由 harness 决定，这些决定直接影响质量**。
2. **Tool exposure（工具暴露）**：harness 声明模型可以调用哪些工具（`read_file`、`replace_string_in_file` / `apply_patch`、`run_in_terminal`、`semantic_search`……）。每个工具有 JSON schema 和引导模型"何时调用"的 description。工具集是**按请求动态变化的**：某些工具只对特定模型开放、某些需要用户确认、MCP server 和扩展可以注入新工具、custom agent（`.agent.md`）可以限定子集。
3. **Tool execution（工具执行）**：模型请求调用工具时，harness 负责校验参数、真正执行、处理错误、格式化结果、喂回下一轮。模型说"编辑文件"，写 diff 的是 harness；模型说"跑命令"，spawn 进程、抓输出、回传的也是 harness。

### Agent loop：turn / round / run 三层结构

核心是一个 **"think → act → observe → think again"** 的 tool-calling 循环：

- **Turn**：用户可见的一次对话交换（发一条消息、收到最终回复）；
- **Round**：循环的一次完整迭代——重建 prompt → 调模型 → 收文本/工具调用 → 执行工具 → 记录结果 → 决定是否继续；
- **Run**：一个 turn 内所有 round 的完整执行。一次用户提问可能触发几十个 round（搜文件、读代码、改文件、跑测试、读输出、迭代修复）。

循环受 loop-control 约束：tool-call 上限、round 间取消检查、stop hooks（扩展点，可以检查 agent 状态后放行结束或推它继续干）。**prompt 每轮重建**——模型永远看到 workspace 的最新状态；历史太长时 harness 负责把早期 round 压缩成 summary（conversation summarization），避免撞 context window 上限。

这一套与 [[Claude Code系列07：Harness分层架构——从50万行源码到社区框架的控制论解读]] 里拆解的 Claude Code 内循环结构几乎一一对应——行业在 harness 架构上已经收敛。

---

## 二、原文最有信息量的部分：per-model 差异到底有多大

博客里有一段非常坦诚的清单，值得逐条记录——这是"多模型适配成本"的第一手证据：

- **编辑工具都不一样**：Claude 系列用 `replace_string_in_file`，GPT 系列用 `apply_patch`；
- **Gemini 需要专门提醒**"用 tool-calling 而不是口头描述你要调用工具"，而且历史里有孤儿 tool call 就会崩；
- 有的模型支持 extended thinking，需要 reasoning-effort 控制；有的适合简洁 system prompt，有的必须用冗长结构化指令才不跑偏；
- **甚至同一家族内部都不通用**：Claude Sonnet 4、Claude 4.5、Opus 各自拿到不同的 system prompt。

结论是：多模型支持不是"往 model picker 里加一个选项"，而是 **per-model system prompt + per-model tool set + per-model 会话管理**的笛卡尔积。每接入一个新模型，都要校验 tool schema、重调默认参数、完整重跑 agent session 评测。VS Code 团队自己说：**harness 才是他们花掉大部分工程时间的地方**（"The harness is the product"）。

为了支撑这个适配矩阵，他们被迫建了一整套产品级评测体系。起点是**公开 benchmark 不够用**：SWE-bench 有污染问题（OpenAI 发现前沿模型能从记忆里复现 gold patch，[已停报 SWE-bench Verified](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/)），Terminal-Bench 更像孤立的终端解谜，覆盖不了真实工作流。于是有了下面两件自建武器。

### 2.1 VSC-Bench：产品级离线评测套件（数据集不公开）

- **任务来源**：VS Code 特有的开发者工作流，专门覆盖公开 benchmark 的盲区——custom agent mode、扩展工作流、MCP 与工具调用、终端/浏览器交互、多轮对话、跨 TypeScript/Python/C++ 的多语言任务；
- **运行方式**：每个任务在**容器化、可复现的 workspace** 里跑——评测 harness 真正启动一个 VS Code 实例、打开 workspace、发送一或多条用户 prompt、让 agent 完整执行 text + tool calls，然后评估整个过程。评的不只是"最终代码对不对"，还包括 agent 使用编辑器、终端、language service、浏览器的方式是否符合产品预期；
- **度量维度**：resolution rate（解题率）+ agent effort + token 效率 + latency 四件套。博客给的散点图是 8 个 model-effort 配置 × 40 次运行，其中一个发现：xhigh reasoning effort 比 high 更费 token 但解题率反而略低——**存在"有效努力甜点"，过了这个点额外思考不再换来更好结果**；
- **数据集在哪**：**内部私有，没有公开**。配套基础设施（`github/evald` 私有仓库、`vscode-evals` npm feed、`vscode-engineering` 流水线）也全部私有，评测分析正文明确"stays private on evald"。这不是吝啬——一旦公开就会重蹈 SWE-bench 的污染覆辙，**私有性正是它作为质量信号（乃至护城河）的前提**。

### 2.2 PR 评测门禁：防"agent 行为回归"的 merge 关卡

**它防的问题传统 CI 测不出来**：模型没换、代码没 bug，但改了一个工具的 description、动了一行 system prompt，agent 就可能整体变笨——单元测试全绿，产品体验回归。所以任何**可能移动 agent 行为**的 PR，merge 之前要拿到真实 agent session 的 benchmark 数字。

触发方式是**打标签，不是全量强制**：只有涉及核心工具、system prompt、上下文组装、loop 逻辑等 agent 敏感面的 PR 才打 `~requires-eval-assessment` 标签进入这条流水线；普通改动（UI、编辑器功能、无关 bugfix）走正常 CI。流程四步：

1. **构建**：标签事件经 webhook 路由到 `vscode-engineering` 的 workflow，对 PR 的 merge ref 发起 Azure DevOps 构建（失败自动重试一次，PR 上留"queued 1 of 2"评论）；
2. **发布评测 agent**：构建成功后，把 PR 版本打成 `0.0.0-dev.*` 的 agent 包，推到 `vscode-evals` npm feed 的 `dev` tag（评论翻转"queued 2 of 2"）；
3. **开评测 issue**：`repository_dispatch` 在私有的 `github/evald` 上开一个 model-evaluation issue，钉死到刚发布的 agent 版本；
4. **回报**：evald 跑 benchmark 并产出分析，Azure Logic App 只把**评论 URL** 转发回原 PR（分析正文留在私有仓库）。

一个说明覆盖面的真实案例：[microsoft/vscode#312854](https://github.com/microsoft/vscode/pull/312854) 只是修一个"终端 shell integration 挂起"的 bug（加 30 秒 data-idle fallback 定时器），连 prompt 都没碰——但因为终端是 agent 的核心工具（`run_in_terminal` 的行为地基），照样要过评测门禁。**判断标准不是"改没改 prompt"，而是"会不会改变 agent 感知到的世界"**。至于这个判断由谁来做、可靠性如何、agent 写代码的时代它会如何演化——见第五节的实证与推演。

### 2.3 生产 A/B：评测体系的第三层

VS Code 团队 2026-07-06 的续篇博客 [Optimizing the VS Code Coding Harness with Model Providers](https://code.visualstudio.com/blogs/2026/07/06/optimizing-vscode-coding-harness-model-providers) 补上了第三层：**在真实生产流量上做 A/B 实验**。背景是 GPT-5.5 发布后，团队拉上 OpenAI 合作（原话："With OpenAI's model expertise and our harness data, we tested two small prompt changes, measured them against control on live traffic, and shipped the winner"），花两周针对这一个模型调 system prompt：

- **实验设计**：生产流量 25/25/25 分流三组——`PRPT_CTRL`（现行默认）、`PRPT_SRCH`（economical search：注入五条"从最具体的锚点开始、只收集刚够的上下文、优先一次定向搜索、知道最便宜的判别性检查后立刻行动"式原则）、`PRPT_LRG`（把工作流重组为 `Before_the_first_edit` / `After_the_first_edit` 两大结构化段落：编辑前先形成局部假设，首次实质编辑后立即验证）；
- **7 指标 × 3 维度**：质量（**10 分钟存活率**——AI 写的代码 10 分钟后还有多少没被删改；**commit 存活率**——多少活到了 git commit）、延迟（p50/p95 Time to First Edit）、效率（p50/p95 总 token、平均工具调用数），全部做统计显著性检验；
- **结果**：`PRPT_LRG` 胜出——p95 首次编辑延迟 **-9.30%（快 38.8 秒，p=1e-10）**、平均工具调用 **-8.54%（少 2.04 次，p=1e-12）**、p95 token **-7.64%（少 0.5M）**；代价是 10 分钟存活率微降 0.44%（p=0.0493）。团队权衡后把它设为 GPT-5.5 的新默认 prompt。

三点值得记下：**其一**，"存活率"这类指标只有真实用户行为能提供——离线 benchmark 评的是"解没解出来"，存活率评的是"用户认不认"；**其二**，效率大幅改善换质量微降的 trade-off 被显式量化后才拍板，而不是拍脑袋；**其三**，博客结语"A model release is not the end of the tuning loop"——模型发布不是调优的终点，是又一轮 per-model 适配的起点。

至此评测体系三层齐了：**VSC-Bench（离线，选候选）→ PR 门禁（merge 时，防回归）→ 生产 A/B（在线，定胜负）**。这套东西本质上是在为"模型异构性"付税。税率有多高，护城河和包袱就各有多重。

---

## 三、推论：第一方绑定为什么可能是最优组合

原文没有说"Claude Code + Claude 是最优解"——它是 VS Code 的博客，立场是为多模型路线辩护。但它给出的证据恰好能推出对面的结论。

### 3.1 Harness 屏蔽的是接口差异，屏蔽不了能力分布差异

模型发布出来，默认的工具使用习惯、推理规划能力都有差异，harness 的职责之一就是**屏蔽这些差异**。但要分两层看：

- **接口层差异**（tool 格式、prompt 偏好、错误行为）：harness 可以在推理时适配——换 system prompt、换编辑工具、加提醒；
- **能力层差异**（规划深度、长程一致性、工具选择直觉）：这是训练分布决定的，**推理时的任何 prompt 工程都只能缓解、不能补齐**。Gemini "需要提醒才肯用 tool-calling"就是典型——那不是接口问题，是这个模型的训练分布里 agentic tool use 的比重问题。

### 3.2 第一方组合的真正优势：对齐发生在训练时

Claude Code + Claude 系列的优势不在"适配做得快"，而在**根本不需要适配**：

1. **训练分布对齐**：Anthropic 可以拿 Claude Code 的 harness（真实工具集、真实 system prompt、真实 agent loop）作为 RL 环境去训模型。模型学会的 `str_replace` 编辑格式、工具调用节奏、何时停止的判断，就是 harness 里将来真正运行的那一套。第三方 harness 永远拿不到这个训练分布——它们只能在推理时逆向猜测模型被训成了什么样。
2. **发布节奏同步**：VS Code 博客承认他们依赖 provider 提前给 checkpoint 来预调 harness——这是**乙方姿态**的适配。2.3 那篇续篇就是这个姿态的实况账单：GPT-5.5 发布**之后**，还要拉上 OpenAI 花两周、动用生产流量做 A/B，才把这一个模型的 system prompt 调到位。而第一方是甲方：模型和 harness 在同一个 release train 上联合调优，模型改一版、harness 的 system prompt 同步改一版，中间没有信息损耗。
3. **零适配矩阵**：Claude Code 只服务一个模型家族，没有 per-model 工具集、没有 N×M 评测矩阵。省下来的工程预算全部投入单一路径的深度——subagent、hooks、memory、plugin 这些能力的迭代速度，部分就来自这里。

这不是 Claude Code 独有的洞察——**每家 lab 都想通了同一件事**：OpenAI 做 Codex CLI 绑 GPT 系列，Google 做 Gemini CLI 绑 Gemini。第一方 harness 已经是频率主导的模式，而不是特例。"agent = model + harness"成立之后，**model 厂商向下做 harness，比 harness 厂商向上做 model 容易得多**。

### 3.3 多模型框架的结构性劣势

对照之下，VS Code / OpenCode 这类多模型框架的代价可以列得很具体：

| 代价           | 表现                                                              |
| ------------ | --------------------------------------------------------------- |
| **无第一方模型绑定** | 永远在推理时适配，摸不到训练分布；新模型能力吃不满，短板兜不住                                 |
| **适配矩阵复杂度**  | per-model prompt/tool/会话管理 → 代码量与测试面随模型数近似线性增长                  |
| **最小公约数引力**  | 抽象层要覆盖所有模型，容易向"所有模型都能跑"而不是"某个模型跑到极致"退化                          |
| **评测税**      | 必须自建 VSC-Bench 级别的评测基础设施才能守住质量线——这本身是一笔巨大的固定成本                  |
| **信息不对称**    | 依赖 provider 的 early access 善意；模型内部的训练细节（比如为什么这个版本偏爱哪种编辑格式）永远是黑盒 |

---

## 四、但多模型路线并非没有生态位——几个反方观点

把结论停在"第一方最优"就太顺了。至少有五个反向论点值得认真对待：

1. **用户要的是模型选择权**。企业采购天然抗拒单一供应商：价格谈判、合规、可用性容灾都要求 BYOK 和多 provider。VS Code 的多模型支持不是工程审美，是**渠道属性决定的产品需求**。第一方 harness 的"最优"只对"愿意接受锁定的用户"成立。
2. **模型竞争红利只有多模型 harness 能兑现**。当 GPT 在某类重构上更强、Claude 在长程规划上更强时，auto-selection 可以按任务路由——单一模型组合放弃了这个上界。VSC-Bench 那张"resolution rate vs token 用量"的散点图，本身就是在为路由决策提供数据。
3. **评测税可以转化为护城河**。适配矩阵是负担，但一旦建成 VSC-Bench + PR 门禁这种基础设施，它反而成了别人难以复制的资产——"我们知道每个模型在真实编辑器工作流里的确切表现"这件事，连 model 厂商自己都未必知道。
4. **头部渠道可以用流量换 provider 的深度合作，"信息不对称"是可缓解的**。2.3 的 GPT-5.5 实验里 OpenAI 出 model expertise、VS Code 出 harness 数据和生产流量——对 OpenAI 来说，VS Code 的海量真实 agent session 是它自己也拿不到的分发面与行为数据。渠道足够大时，乙方姿态会升级成**数据换 expertise 的对等交易**，3.3 表里"永远是黑盒"的劣势被部分对冲。当然，这个筹码只有头部渠道有——长尾多模型框架依然两头够不着。
5. **MCP 等开放标准在持续降低工具侧的异构成本**。工具协议标准化之后，per-model 差异会逐渐收窄到 prompt 和编辑格式层面——适配税是动态下降的，不是恒定的。

**但第 5 点要立刻打个折扣：MCP 不是免费的，它只是把成本换了个形态**：

- **Context 膨胀**：每个 MCP server 的工具都要把 JSON schema + description 注入 prompt，接的 server 一多，还没开始干活就先吃掉几千上万 token——工具异构税变成了 context 税，直接挤占真正任务可用的上下文预算；
- **描述冲突与混淆**：工具描述由各个外部 server 作者各自撰写，质量参差、命名撞车（多个 server 都有 `search` / `fetch` / `query`）、语义重叠，模型面对相似工具时选择准确率下降。第一方 harness 的内置工具集是一个团队统一设计、互斥性经过评测的；MCP 生态里没有任何机制保证两个 server 的描述互相兼容——协议只标准化了"怎么调用"，没有标准化"怎么描述"；
- **用户侧负担**：选装哪些 server、排查"工具明明装了却没被调用"、管理认证与权限、控制工具数量防止上面两个问题恶化——这些治理复杂度全部转嫁给了用户。

所以更准确的说法是：MCP 降低的是**接入成本**（实现一次、处处可接），但把**治理成本**（context 预算、工具去重、描述质量）留给了 harness 和用户。而治理恰恰又是第一方占优的领域——它可以对自家内置工具做训练时对齐 + 统一文案治理，MCP 工具在任何 harness 里都只能是"客座"待遇。

一个可用的类比框架：这是 **Apple（垂直一体化）vs Windows/Android（水平生态）** 的老故事在 agent 层的重演。垂直一体化在体验的绝对上限上赢，水平生态在覆盖面、选择权和生态多样性上赢。历史的答案是两者长期共存，各占不同的用户群——没有理由认为 coding agent 会例外。

真正的开放问题是：**随着 agentic RL 把"模型在自家 harness 里训练"变成标配（训练分布优势持续加宽），水平生态还能不能维持"体验足够接近"？** 如果第一方与第三方的体验差距拉大到不可忽略，多模型框架就会被挤压到"企业合规渠道"这个单一生态位里。这一点与 [[Agent Lightning系列08：RL实战篇——example选型、calc_x跑通VERL训练与tinker等框架]] 里"训练环境=运行环境"的思路是同一条线索。

---

## 五、门禁的演化：从人肉标签到 Meta-Harness 全量评测

第二节留了个尾巴：`~requires-eval-assessment` 这个"敏感面"标签由谁来打、判断可靠吗、当 harness 代码本身越来越多由 agent 修改时它还成立吗？这一节先看实证，再给一个工程框架，最后推演它的终局。

### 5.1 实证：今天这个标签是人打的，而且是作者自己打的

用公开 GitHub API 查 microsoft/vscode 上带该标签的 PR（截至 2026-07），共 **9 个**。逐一翻 issue events 看 `labeled` 事件的操作者：

- **8 个由 PR 作者本人手动打标**——meganrogge、dmitrivMS、hawkticehurst、bryanchen-d、digitarald，全是 VS Code 团队成员，打的都是自己的 PR；
- **1 个由 `vs-code-engineering[bot]` 打标**（[#316277](https://github.com/microsoft/vscode/pull/316277)），说明存在某种自动规则，但只覆盖了 1/9。

也就是说，这道门禁今天的触发机制本质是**作者自我申报（self-declaration）**：写代码的人凭对系统的理解，自己判断"我这个改动会不会移动 agent 行为"，然后自己给自己挂上"需要过评测"的牌子。它依赖两个前提——作者是熟悉 agent 敏感面的资深团队成员，以及团队文化里"漏打标签"是件丢脸的事。#312854（终端 bug 修复也要过门禁）恰恰证明这套人肉判断的水位不低：连"没碰 prompt 的定时器修复"都能被识别为敏感面。

### 5.2 当 agent 开始改 harness：分层约束框架

自我申报模式有个显然的时代裂缝：**写 harness 代码的越来越多是 coding agent 自己**。Agent 没有"资深成员的直觉"，也不怕丢脸。让 agent 参与打标，约束力要分层设计——确定性规则、语义指令、独立评审三级，强制力递减、灵活性递增：

| 层级 | 机制 | 强制力 | 覆盖什么 |
|---|---|---|---|
| **L1 确定性规则** | 路径/文件规则（CI 代码执行）：改了 `prompts/`、`tools/`、loop 相关目录 → 自动打标 | ~100% | 语法可判定的敏感面，保**召回** |
| **L2 语义指令** | AGENTS.md / system prompt 里写"何为敏感面"的判断标准，agent 提交时自评 | ~90% | 语义敏感但路径不敏感的改动 |
| **L3 独立评审** | 单独的 reviewer agent（非作者 agent）复核"该不该打标" | 补精度 | 兜住 L2 的漏判，执行 never self-approve |

关键在 L1 的局限：**#312854 这类改动是 L1 的天然盲区**——它改的是终端集成的超时逻辑，路径上看不出任何"agent 敏感"，只有理解"`run_in_terminal` 的行为地基建立在 shell integration 之上"这条因果链才能判断出来。语法规则保召回下限，语义判断（人或 L2/L3 agent）负责这类跨层因果。

两个必须遵守的原则：

1. **成本不对称决定默认值**：漏报 = agent 行为回归直接上线（用户体验受损、事后难归因）；误报 = 多跑一轮评测（花的是计算费）。两边代价差几个量级，所以规则应当是**"不确定时默认打标签"**——宁可多评，不可漏评；
2. **Never self-approve**：当修改 harness 的作者本身是 agent 时，出现了一个自指环路——agent 改的代码决定了 agent 自己（和它的同类）将来感知到的世界。打标 / 免评的判断绝不能由作者 agent 自己做终审，必须由独立的评审通道（L1 规则或 L3 reviewer）闭合。

### 5.3 Meta-Harness：把"哪些改动敏感"这个问题整个溶解掉

但还有一条更激进的路线，来自 [[meta-harness]]（arxiv 2603.28052）：**让 agent 修改 harness 不是需要防范的风险，而是被设计出来的核心机制**。Meta-Harness 用 Coding Agent 作 Proposer，跑 Propose → Evaluate → Log → Repeat 的搜索循环，自动探索最优 harness 配置——约 20 轮 × 每轮 3 个候选 ≈ 60 个 harness 变体，**每一个变体都全量过评测**。

注意它对 5.1/5.2 纠结的那个判断题的解法：Meta-Harness **根本不问"这个改动敏感吗"**。它的回答是评测覆盖率 100%——既然每个候选都要被评，"挑出哪些改动需要评"这个判断题就不存在了。对比一下两种体制的经济学：

| | VS Code 门禁（选择性评测） | Meta-Harness（全量评测） |
|---|---|---|
| 评测覆盖 | 只有打了标签的 PR | 每一个候选变体 |
| 核心难题 | "哪些改动敏感"的判断（人肉/分层规则） | 无此难题 |
| 评测成本 | 低（按需触发） | 高（评测就是主循环本体） |
| 判断错误的后果 | 漏标 = 回归上线 | 不存在漏标 |
| 适用前提 | 评测昂贵、PR 流量大 | 评测足够便宜/自动化 |

同一逻辑在 [[SkillOpt快速上手：AML+Azure OpenAI跑通SearchQA最小实验]] 里也出现过：SkillOpt 的 gate 对**每一次** skill 更新都在 validation split 上评一遍、ties-rejected（打平也拒）——它也不判断"这次编辑敏感吗"，而是全量评。代价同样直观：gate 验证就是 token 成本的大头之一，所以实践里要靠 `--limit 8` 砍冒烟成本。**评测税没有消失，只是从"判断谁该交税"变成了"人人都交但降低单价"**。

### 5.4 推演：打标签是评测昂贵时代的过渡产物

把 5.1–5.3 连起来，可以下一个判断：**`~requires-eval-assessment` 这类人肉标签机制，是"评测昂贵"这个约束条件下的过渡性产物**。评测越贵，越需要精准地挑出少数敏感改动；评测越便宜、越自动化，越应该无脑全量评——判断题退化为算术题。VS Code 已经把 VSC-Bench 建成了容器化、可复现的自动评测，剩下的只是单次成本问题；成本曲线往下走，门禁会自然从"标签触发"滑向"默认全评"。

到那时评测套件的角色也变了：**不再是 merge 关卡，而是 harness 演化的 fitness function**——每一个（人或 agent 提出的）harness 变更都在其上竞争，胜者晋级。这正是 Meta-Harness 论文描绘的形态。但它成立有两个前提，缺一个都会翻车：

1. **Benchmark 保真度（Goodhart 风险）**：全量评测意味着 harness 只朝评测分数优化——评测套件与真实工作流的偏差会被搜索循环无限放大。Meta-Harness 的消融给了个侧面警示：给 Proposer 完整执行 trace 时成绩 50.0%，只给分数 34.6%，LLM 摘要 34.9%——**信号的保真度直接决定优化的质量**，分数是不够的，摘要也救不回来。而 2.3 里"10 分钟存活率 / commit 存活率"这类**只有真实用户行为能提供的在线指标，正是离线评测之外的保真度地锚**——线上信号在场，harness 才不会朝离线分数过拟合；那次实验里 -0.44% 的质量微降能被看见并显式权衡，靠的就是这层地锚；
2. **爆炸半径控制**：Meta-Harness 的 60 个变体是在沙箱里竞争的，输了就丢弃；VS Code 的 PR 是要 merge 进 main、发布给千万用户的。全量评测体制要求"评测通过 ≠ 立即上线"之间还有 staged rollout / 灰度这一层——沙箱内可以放任搜索，出沙箱必须收紧。

---

## 六、落回一句话

VS Code 博客最有价值的贡献是把 harness 从隐性工程变成了显性概念，并用第一手细节证明了"多模型适配"的真实成本。而它没有说出口的推论是：**当 agent = model + harness 成立时，谁能把这两半在训练时就缝在一起，谁就拿走了体验的上限；剩下的玩家，则去争夺选择权、覆盖面和评测基础设施的价值**。Claude Code + Claude 是前者的代表，VS Code / OpenCode 是后者的赌注。

而评测基础设施这条线还藏着第二层演化：今天它是靠人肉标签选择性触发的 merge 门禁，明天——当评测成本降到足够低、当改 harness 的主力从人变成 agent——它会转身成为 harness 演化的 fitness function。**门禁守护 harness，最终变成门禁驱动 harness**。到那一步，"谁的评测套件更保真"会和"谁的模型更强"一样，成为 agent 竞争的核心变量。

---

## 相关

- [[Claude Code系列07：Harness分层架构——从50万行源码到社区框架的控制论解读]]——Claude Code 侧的 harness 分层拆解
- [[Claude Code系列01：核心概念与设计哲学解析]]——第一方 harness 的设计哲学
- [[Loop Engineering概念澄清——内循环、外循环与Harness Engineering的边界]]——agent loop 在更大循环体系中的位置
- [[InkOS深度感想——AI小说创作中的Harness Engineering范式]]——harness 范式在非 coding 领域的迁移
- [[2026-04-16-Meta-Harness论文解读与实践思考]]——第五节 Meta-Harness 论证线的论文精读（Proposer、消融实验、三种落地路径）
- [[SkillOpt快速上手：AML+Azure OpenAI跑通SearchQA最小实验]]——"每次更新都过 gate"的全量评测体制实测（含 gate 的 token 成本）
- Wiki：[[harness-engineering]] / [[agent-loop-architecture]] / [[meta-harness]]
