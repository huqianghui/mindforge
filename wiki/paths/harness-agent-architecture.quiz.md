---
title: "题库：Harness 工程与 Agent 架构"
created: "2026-11-07"
updated: "2026-11-24"
tags:
  - wiki
  - path
  - quiz
path_id: "harness-agent-architecture"
---

# 题库：Harness 工程与 Agent 架构

配合 [[harness-agent-architecture]] 使用，按站点分组。题型：**场景**、**辨析**、**解释**。答案是参考要点，说出主要意思即可。

## 第 1 站 · 最小形式：agent loop

### Q1 · 解释

**问**：一个最小的 agent loop 由哪几步组成？

**答**：调模型 → 解析出工具调用 → 按名字 dispatch 到工具 → 把结果回填进消息 → 再调模型，直到模型不再调工具。核心就是一个 while 循环，几十行代码就能写完。

**出处**：[[agent-loop-architecture]]

### Q2 · 解释

**问**：为什么说 ReAct 是 agent loop 的最小完备形式？

**答**：Thought → Action → Observation 三步覆盖了"想、做、看结果"的闭环，对应人类试错迭代的认知模式；少了任何一步就不能根据环境反馈修正行动。

**出处**：[[react-paradigm]]

### Q3 · 辨析

**问**："成熟的 agent 系统都只用一种范式，比如纯 ReAct。"对吗？

**答**：不对。ReAct、Plan-and-Solve、Reflection 三种范式映射不同的认知策略，成熟系统总是混合使用——先规划、边做边看、做完反思。

**出处**：[[agent-paradigms]]

### Q4 · 解释

**问**：往 agent 里加一个新工具，最少要改什么？

**答**：工具 dispatch 采用映射表模式，加新工具只需往 dispatch map 里加一项（名字 → 函数），再把工具描述加进给模型的工具列表，loop 本身不用改。

**出处**：[[agent-loop-architecture]]

### Q5 · 解释

**问**：Claude Code 收到一个请求后，循环会因为哪几种原因继续下去？工具层分哪两层？

**答**：三种继续原因：模型返回 tool_use 要执行工具；输出被 max_tokens 截断要恢复；上下文超限要压缩后再继续。循环本身不做任何智能决策，什么时候调工具、什么时候结束都交给模型。工具层分两层：路由表只做"工具名到处理函数"的查表，新增工具不改循环；控制面决定怎么执行——路径安全检查、Bash 在沙箱里跑、写操作要确认、安全的批量并行而排他的串行。

**出处**：[[agent-loop-architecture]]（Claim「一个请求不是一次模型调用而是一段多轮运行」）

## 第 2 站 · 上下文：从 prompt 到 context

### Q1 · 辨析

**问**："agent 表现不好，多半是模型不够强。"对吗？

**答**：通常不对。LLM 的性能限制多数是上下文问题而不是模型缺陷——该给的信息没给、不该给的塞太多、格式不对，这些都属于 context engineering。

**出处**：[[context-engineering]]

### Q2 · 解释

**问**：context 爆炸的根因是什么？

**答**：把 context 当成 state——把所有历史、文档、中间结果都塞进上下文。context 应该是从 state 按需投影出来的一部分，而不是 state 本身。

**出处**：[[context-projection]]

### Q3 · 解释

**问**：文档式加载和能力式加载有什么区别？

**答**：文档式加载是把整份说明一次性塞进上下文；能力式加载是先只放能力的名称和描述，用到时再加载细节。后者才能 scale，这也是 skill 的 progressive disclosure 思路。

**出处**：[[context-projection]]、[[skill-runtime]]

### Q4 · 场景

**问**：一个基于 checklist 拼接上下文的工作流框架，项目一大就开始"失忆"、超长。问题出在哪？

**答**：全量上下文拼接模式在 L3+ 项目里必然 context 爆炸——它本质是 checklist pipeline 而不是 skill system，没有选择层（Selection Layer）按需取用。（2026-04 版 GSD 是这类框架的例子；它迁到 GSD Core 后改成子 agent 只拿紧凑上下文、命令做成 skill，剩下的风险是主协调会话的上下文增长。）

**出处**：[[context-explosion]]

### Q6 · 辨析

**问**："一篇论文说频繁压缩几乎不掉精度，另一篇说压缩明显有损，两者矛盾。"对吗？

**答**：不矛盾，适用条件不同。CompAct-Bench 显示搜索类任务随压缩边界后移越压越差（52.9% → 34.6%），编码类反而变好（64.0% → 86.1%），因为编码的进度已经写进代码仓库，压缩丢的是历史不是状态；搜索的证据只在上下文里，压缩会漏掉甚至改写信息（把待定证据写成结论导致提前结束）。"频繁压缩几乎无损"那篇测的正是状态落在环境里的软件工程任务。工程上的做法是关键信息写文件；需要精确细节时用"压缩 + 只追加完整日志 + grep 取回"。

**出处**：[[context-engineering]]（Claim「上下文压缩是否有损，取决于任务状态存在哪里」「压缩照做、另存一份只追加的完整日志」）

### Q7 · 场景

**问**：一个长会话里，agent 前面约定的规则后来被"忘掉"了，而且常常没做完就宣布完成。你从上下文管理的角度会怎么排查和调整？

**答**：先看是不是上下文腐化：模型偏向开头和结尾，用量过半后更偏向末尾，中间的早期指令容易丢；"提前宣布完成"则是缺少外部验证纠正模型对完成度的高估。调整：要长期生效的规则放进每次都会重新注入的文件（根目录 CLAUDE.md 等），关键状态写文件而不是只留在对话里；分层加载，skill 按需触发、MCP 工具首次调用时再发现；按工作区停用用不到的 MCP server 和插件，插件禁用后其组件都不进上下文；完成与否交给测试或评审这类外部检查判断。

**出处**：[[context-engineering]]（Claim「上下文能填满不代表应该填满」「Claude Code 的上下文按固定顺序组装」）

## 第 3 站 · Harness：一等系统层

### Q1 · 解释

**问**：Prompt、Context、Harness 三者是什么关系？

**答**：同心圆，逐层包含：Prompt 管一次输入怎么写，Context 管模型看到什么，Harness 管整个运行系统——工具、循环、校验、恢复、权限都在 harness 里。Harness Engineering 是前两者的超集。

**出处**：[[harness-engineering]]

### Q2 · 辨析

**问**："agent 不可靠就换更强的模型。"对吗？

**答**：不完全。agent 的智能来自模型，可靠性来自 harness；两种典型失败模式（跑偏、过早结束）是系统设计问题，级联失败正是 harness engineering 出现的驱动力。

**出处**：[[harness-engineering]]

### Q3 · 解释

**问**：生成与评估为什么要分离？举两个不同领域的例子。

**答**：自己评自己会放过自己的错误，评估要由独立的角色或机制完成。例子：harness 里的 Sensors（lint、测试、LLM-as-judge，在行动后独立检测）与生成分开，Meta-Harness 的 proposer 生成候选、评估集打分；写作去 AI 味的多轮 Humanizer；规格驱动开发里"AI 起草、人类拍板、脚本验证"。

**出处**：[[generation-evaluation-separation]]

### Q4 · 解释

**问**：harness 按"归谁、能不能改"分哪三类？

**答**：代码框架自己搭（MAF、LangGraph 等，产物是镜像，质量归你）；现成 harness 拿来即用（Claude Code、Codex、GitHub Copilot 等）；平台托管 harness 不能改（Foundry Prompt Agent、Copilot Studio 大部分 harness）。

**出处**：[[harness-engineering]]

### Q8 · 解释

**问**：harness 不是 agent、prompt 或 workflow，那它是什么？它和 Agentic Engineering 是什么关系？

**答**：harness 是一组持续回答五个问题的系统：任务怎么定义（Spec、Plan），状态怎么保存（制品、文件），上下文怎么控制（增量、重置），谁来判断好坏（评估、评审 agent），跑偏后怎么修（反馈回写到 Spec 或规则）。Agentic Engineering 是更大的学科：Harness Engineering 管"怎么控制 agent"，FinOps 管谁来治理成本，质量工程管成功率、级联失败和上下文腐化。人和 agent 的分工按 Delegate（委派调研、脚手架、测试、文档）→ Review（人审架构对齐与安全合规）→ Own（人拥有优先级、新抽象和生产签核）三档划。

**出处**：[[harness-engineering]]（Claim「Agentic Engineering 是学科」「人和 agent 的分工按 Delegate → Review → Own 三档划」）

## 第 4 站 · 控制论视角

### Q1 · 辨析

**问**："把 agent 比作控制系统只是个类比。"对吗？

**答**：不对。两者是结构同构：目标、当前状态、误差、调节、反馈一一对应；负反馈、共轭变换、随机探索在 agent 设计里都有对应物。

**出处**：[[cybernetics-agent-design]]

### Q2 · 解释

**问**：为什么说"共轭变换是 agent 失败的首要原因"？

**答**：共轭变换是表示层设计——把问题换成模型好处理的表示再变回来。大部分 agent 失败是表示错了（信息组织方式不对），而不是推理能力不够。

**出处**：[[cybernetics-agent-design]]

### Q3 · 解释

**问**：必要多样性定律对 harness 设计意味着什么？

**答**：调节器的多样性必须匹配扰动的多样性（V_Regulator ≥ V_Disturbance）；只要扰动不停，调节就永远"完成"不了。模型变强、不确定性下降时，外层调节器应该降复杂度。

**出处**：[[requisite-variety]]

### Q4 · 解释

**问**：怎么区分一条"线性工具链"和一个"控制系统"？

**答**：看有没有反馈闭环：控制系统会读取当前状态、和目标比较、根据误差调整；线性工具链只是按顺序执行，结果好坏不会回到下一步。

**出处**：[[feedback-loop]]

### Q9 · 辨析

**问**："负反馈和 reward 都是反馈，只是形式不同。"对吗？

**答**：不对，差在作用层级。负反馈是纠偏信号（u = -K × error），修正 prompt、工具、流程这些输入，当前一步就生效，不改模型；reward 是训练信号（θ ← θ + ∇reward），修正参数，作用在未来的行为分布上。所以 memory、RAG、self-reflection 都不改参数，属于快回路里的高级 harness，不是学习。判断一个机制是控制还是学习，看四条：改不改参数、时间尺度、有没有稳定性保证、目标是当前任务还是模型本身。

**出处**：[[negative-feedback]]（Claim「负反馈和 reward 不是两种反馈形式」）、[[cybernetics-agent-design]]（Claim「判断一个机制属于控制还是学习看四条」）

### Q10 · 场景

**问**：用 coding agent 推进的项目越改越乱，团队想加更多 lint 和更高的测试覆盖率。按 Regulation-First 你会先问什么？

**答**：先问被调节量是什么：在 Vibe Coding 里真正要维持稳定的是需求对齐度和功能可见性，代码质量、覆盖率、架构一致性都是调节器或观测工具，把手段当目标是最常见的调节失败。然后列扰动（理解偏差、需求模糊、多文件副作用等）、反馈通道和调节器，按诊断表定位："越改越乱"通常是调节器多样性不足，要增加机制的种类（Spec、UI 设计稿、模块边界、端到端测试等各对付一类扰动），而不是只加深同一类；约束本身过时了，则是缺少二阶调节，要定期更新 harness。

**出处**：[[regulation-first-design]]

## 第 5 站 · 扩展机制：skill、MCP、hook

### Q1 · 解释

**问**：skill 和 tool 的本质区别是什么？

**答**：tool 是能执行的动作（函数、API），skill 是"怎么做"的程序性知识（指令、步骤、资源），由 agent 读了再去调用工具。

**出处**：[[skill-pattern]]

### Q2 · 解释

**问**：按"离模型越近越可移植"，给 skill、MCP、prompt、subagent、hook、command 排序。

**答**：skill 与 MCP 可移植性最高，prompt 居中，subagent、hook、command 最低——后者依赖具体宿主的运行时机制。skill 是唯一跨 harness 可移植的资产载体。

**出处**：[[harness-portability-spectrum]]

### Q3 · 辨析

**问**："Claude Code 的扩展体系是 Command、Skill、Agent 三层并列。"对吗？

**答**：已过时。自定义 command 已经并入 skill（`.claude/commands/x.md` 与 `skills/x/SKILL.md` 都创建 `/x`），现在是 skill 加 agent 两层，plugin 负责打包分发。

**出处**：[[claude-code-extension-system]]

### Q4 · 解释

**问**：plugin 为什么是"分发单元"而不是"运行时单元"？

**答**：plugin 只是把 skills、agents、hooks、MCP 配置等打包成一个可安装的单元；运行时真正生效的仍是里面的各个组件，plugin 本身不参与执行。

**出处**：[[claude-code-extension-system]]

### Q11 · 辨析

**问**："第三方 skill 只是一份 Markdown，用规则或 LLM 扫一遍就安全了。"对吗？

**答**：不对。SKILL.md 是被 agent 当指令读的文本，恶意指令可以藏在里面。在 80 个恶意、60 个正常 skill 的测试集上，YARA 和默认 Cisco Skill Scanner 召回 0.91，但正常 skill 里分别误报 49 个和 33 个；加上 LLM 分析后召回 0.85、误报 40 个，语义更强也没有换来更好的取舍；静态 + 动态 + agent 三段式加上执行期行为证据，同样召回下误报降到 5 个。只靠规则或只靠 LLM 都会大量误报。

**出处**：[[skill-pattern]]（Claim「SKILL.md 是被 agent 当指令读的文本」）

## 第 6 站 · 工具与互操作协议

### Q1 · 辨析

**问**："MCP 会把上下文撑爆，所以应该全部改回 CLI。"对吗？

**答**：不对。早期 MCP 确实有严重的 context 膨胀，但 tool search 延迟加载已大幅缓解；MCP 与 CLI 各有所长，最终是共存互补——关键的专有 API 走 MCP，成熟常见的命令走 CLI。

**出处**：[[mcp-vs-cli]]

### Q2 · 解释

**问**：MCP、A2A、AG-UI 三个协议各管哪个方向？

**答**：MCP 向下连工具，A2A 横向连 agent，AG-UI 向上连 UI。

**出处**：[[ag-ui-protocol]]、[[a2a-protocol]]

### Q3 · 辨析

**问**："A2A 的 Task 就是一个工作流引擎。"对吗？

**答**：不对。Task 的意义是把生命周期和发起它的 HTTP 请求解耦，`GetTask` 是权威状态来源；它不负责编排多步流程。同样，Agent Registry 也不是服务实例发现。

**出处**：[[a2a-protocol]]

### Q4 · 解释

**问**：A2UI 为什么说"展示不等于授权"？

**答**：A2UI 传的是界面描述，UI 的 Data Model 不是业务数据的权威来源，客户端回传的数据不可信；安全审查重点从生成的代码转到组件白名单与操作授权。

**出处**：[[a2ui-protocol]]

### Q12 · 场景

**问**：你的 agent 同时连着 GitHub MCP 和一个第三方 MCP server，任务都正常完成了。为什么仍然可能已经泄露了数据？

**答**：Log-To-Leak 类攻击：恶意 server 在工具描述里写指令，让 agent 做完正常任务后再调用它提供的"保存日志"工具，把用户查询和其他 server 的响应一并传出去。18 组模型 × server 上攻击成功率 62.64%~100%，其中 16 组的正常任务完成率变化不超过 6.63 个百分点，所以从结果上看不出异常。提示夹心、LLM 元数据检查、IPIGuard 三种防御在 GitHub MCP + GPT-4o 上残余成功率仍在 55% 以上，指令检测器又把 85.53% 的正常描述判成可疑。结论是内容过滤防不住，次级工具调用要由宿主授权（比如在网关上按工具授权）。

**出处**：[[model-context-protocol]]（Claim「工具描述本身就是注入入口」）

## 第 7 站 · 多 agent 与隔离

### Q1 · 解释

**问**："进程隔离即上下文隔离"是什么意思？

**答**：subagent 在独立的上下文里运行，只把摘要返回给主 session，主 session 的上下文不会被子任务的细节污染。例外是 fork：fork 会继承父对话。

**出处**：[[claude-code-agent-subagent]]

### Q2 · 辨析

**问**："Claude Code 的 teammate 就是 JSONL 收件箱加 `.team/config.json`。"对吗？

**答**：不对。那是教学实现。官方的 Agent teams 里，队友有独立 context，可以直接互发消息、共享任务列表，由 lead 协调。

**出处**：[[claude-code-agent-subagent]]

### Q3 · 解释

**问**：多 agent 系统里，为什么写记忆、投票这类操作要收归协调者？

**答**：多个子 agent 都能写记忆时，记忆库会被局部视角污染；把写权限收到协调者，相当于给记忆加了一道单写者约束。

**出处**：[[agent-memory-lifecycle]]、[[orchestrator-pattern-multi-agent]]

### Q4 · 场景

**问**：一个任务要并行调研 5 个方向再汇总。你会用 subagent 还是 teammate？

**答**：用 subagent：任务边界清楚、做完即止、只需要摘要返回。teammate 适合需要长期协作、互相沟通、共享任务列表的场景。

**出处**：[[claude-code-agent-subagent]]

## 第 8 站 · 模型与 harness：绑定还是解耦

### Q1 · 解释

**问**：第一方绑定（模型厂商自做 harness）的结构性优势在哪？

**答**：在训练时对齐——模型和 harness 一起调，能力层的差异推理时补不回来；接口层差异则可以在推理时适配。

**出处**：[[model-harness-codesign]]

### Q2 · 解释

**问**：为什么多模型适配的成本很高？

**答**：成本是每个模型的 prompt × 工具 × 会话管理的笛卡尔积，每加一个模型，这些都要重新调。

**出处**：[[model-harness-codesign]]

### Q3 · 场景

**问**：客户想让 Codex 接第三方模型，问"能不能换"。你怎么回答？

**答**：按"逐层可撬性"分层回答：目录层可以替换（provider 配置），工具层补不了（第三方模型可能用不好内置工具），治理层必须显式覆盖。不能只给一个"能 / 不能"。

**出处**：[[codex-desktop-architecture]]

### Q4 · 解释

**问**：举一个"同一个 harness 跨产品复用"的例子。

**答**：微软的 Copilot harness：GitHub Copilot 的 agent loop、Copilot Studio 的 Microsoft Copilot harness（原 GitHub Copilot harness）、Foundry 里 `microsoft_copilot_preview` 托管 harness，是同一套。

**出处**：[[github-copilot]]

### Q13 · 解释

**问**：为什么单报一个模型在 SWE 类基准上的分数、不说用的是什么 harness，信息是残缺的？

**答**：Claw-SWE-Bench（v2）在统一的提示、预算、工作区和补丁提取下比较 7 个通用 harness × 3 个模型，每个配置跑三遍取平均：同样是 GLM 5.1，Pass@1 从 62.9% 到 73.1%，总成本从 86 美元到 525 美元；评测适配层本身也影响巨大，裸适配器只有 19.3%（69.1% 的补丁打不上），完整适配器 71.2%。另一个方向的证据是针对 pi harness 用强化学习训的 LoRA，在同一 harness 下大幅提升，但换 harness 是否保留收益没有给。模型和 harness 的成绩是成对的。

**出处**：[[model-harness-codesign]]（Claim「评测开始把 harness 当受控变量」）

## 第 9 站 · 基础设施：三层与沙箱

### Q1 · 解释

**问**：Framework、Runtime、Platform 三层按什么问题划分？harness 为什么不单列一层？

**答**：Framework 回答"逻辑怎么写"，Runtime 回答"设施谁来运行"，Platform 回答"身份、网关、登记谁来管"。harness 是用 framework 做出来的成品，被 runtime 当作可替换的进程托管，所以不单列一层。

**出处**：[[agent-infra-three-layers]]

### Q2 · 解释

**问**：agent 沙箱要解决哪三件事？

**答**：隔离原语（Kata、microVM 等）、环境的分配与回收（预热池、归还策略）、出站与凭据（网络策略、凭据不进沙箱）。

**出处**：[[agent-sandbox]]

### Q3 · 辨析

**问**："放行 443 端口的 NetworkPolicy 就能控制 agent 的出站。"对吗？

**答**：不对。NetworkPolicy 只认 IP 和端口，放行 443 等于放行任意 HTTPS；而且 CNI 不支持时 NetworkPolicy 会被静默忽略。出站要靠出口代理或网关控制。

**出处**：[[agent-sandbox]]

### Q4 · 场景

**问**：agent 本身可信，但它会执行模型生成的代码。隔离粒度怎么选？

**答**：把 agent 和它执行的代码分开选：受信的 agent loop 走轻量粒度（普通容器），不可信代码按执行次数借 VM 级沙箱。

**出处**：[[agent-sandbox]]

## 第 10 站 · 外循环：Loop Engineering 与评测门禁

### Q1 · 解释

**问**：Loop Engineering 说的"内循环"和"外循环"分别指什么？

**答**：内循环是 agent 单次任务里的 loop（harness 的一部分）；外循环是跨任务、跨时间的循环——自动发现要做的事、按 workflow 执行、重复运行、带跨轮记忆。自动发现是外循环的分水岭。

**出处**：[[loop-engineering]]

### Q2 · 解释

**问**：为什么说"循环的形状由验证信号来源决定"？

**答**：能拿到什么样的验证信号（测试、指标、人工审阅、线上数据），决定了循环多久转一圈、在哪里停、能不能自动化；所以验证要尽量"左移"，越早越便宜。

**出处**：[[loop-engineering]]

### Q3 · 场景

**问**：一个知识库的每周自动复核，为什么"确认"可以自动写回，"修订"要等人裁决？

**答**：确认不改变知识的含义，错了代价小；修订、降级、退役改的是知识本身，而且被很多人共用，写错会误导人。验证信号不够硬的地方，要留人在环里。

**出处**：[[loop-engineering]]、[[Loop-Engineering实践：知识库外循环]]

### Q4 · 解释

**问**：一个要支持多个模型的 agent harness，评测体系怎么搭？为什么普通 CI 不够？

**答**：三层：离线 benchmark（度量正确性、agent 付出的步数、token 效率）→ PR 门禁 → 生产 A/B。普通 CI 测的是代码行为，测不出"换了提示或模型后 agent 行为变了"这种新的回归类别，所以要专门的评测层。

**出处**：[[harness-engineering]]（Claim「多模型 harness 必须自建三层评测体系」「Agent 行为回归是传统 CI 测不出的新回归类别」）
