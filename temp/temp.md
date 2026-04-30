Me: 
    https://github.com/JuliusBrussee/caveman帮我分析一下它节省token的关键技术。以及它和Ruby token kill的区别是什么？RTK 我大概是明白它是通过拦截命令输出，通过过滤规则来实现减少token，但是caveman似乎是修改了对话内容，这个要保证效果，而且也需要调用大模型？ 而且是跨session的情况下，怎么保持功效

Researcher:
    我理解你想让我分析 GitHub 项目 caveman 的省 token 关键技术，并与 Ruby Token Kill（RTK）做机制层面的对比，重点关注你提到的几个疑问点：是否修改对话内容、是否仍需调用大模型、以及在跨 session 场景下如何保持效果。
To make sure I cover what you need：

你更希望偏实现层面（如：具体如何重写/压缩对话、是否用 AST / diff / summarization、是否 hook 到 message history），还是偏架构与原理对比（设计理念、适用场景、优缺点）？

A) 实现细节为主
B) 原理与架构为主
C) 两者都要，但以原理为主


对比 RTK 时，你希望停留在机制对比，还是要进一步到效果、风险与适用边界（例如信息丢失、上下文漂移、debug 可观测性）？

A) 机制即可
B) 机制 + 风险/边界 + 适用场景


关于你特别关心的点（“caveman 是否需要再次调用大模型、以及跨 session 如何保持功效”），是否希望我单独拉一节深入分析，甚至用流程图/伪代码式说明？

A) 是
B) 不用，文字解释即可



或者直接回复 “go ahead”，我会按偏技术实现 + 深入分析跨 session 机制的方式推进。

Me:
    C) 两者都要，但以原理为主

B) 机制 + 风险/边界 + 适用场景

A) 是


Researcher:

Caveman 与 RTK（Rust Token Killer）省 Token 技术原理详解与系统对比

重要说明：你提到的"Ruby Token Kill"实际上是 RTK（Rust Token Killer），一个用 Rust 编写的 CLI 代理工具，并非 Ruby 项目。下文统一使用"RTK"来指代。 [github.com]



核心机制差异
Caveman 通过注入系统级风格约束规则，让主 LLM 自身以"原始人说话"的极简风格输出回答，削减输出 token；同时通过 caveman-compress 子技能使用本地 Python 脚本压缩持久记忆文件，削减输入 token。RTK 作为本地 CLI 代理，在 shell 命令输出到达 LLM 上下文之前，通过四种确定性过滤策略（智能过滤、分组、截断、去重）进行压缩。

是否需要额外调用大模型
两者均不需要额外的 LLM API 调用。Caveman 是利用主 LLM 的指令遵循能力在同一次推理中完成压缩；caveman-compress 需要 Python 3.10+ 本地执行。RTK 是纯本地 Rust 二进制程序，零模型依赖。

跨会话持久化
Caveman 通过压缩 CLAUDE.md 等记忆文件（一次压缩、多次受益）+ SessionStart 钩子自动激活 + .caveman-active 状态文件来实现跨会话一致性。RTK 通过全局 hook 初始化 + ~/.config/rtk/config.toml 持久配置实现一次安装、所有后续会话自动生效。

一、Caveman 省 Token 关键技术原理
1.1 总体架构：两层压缩体系
Caveman 是针对 AI 编程助理（Claude Code、Codex、Gemini CLI、Cursor 等 40+ 种代理）开发的对话压缩技能插件。它的省 token 机制分为两个独立层面： [openclawapi.org], [openclawapi.org]























层面作用对象机制节省幅度输出压缩（核心）LLM 生成的回复系统提示规则注入，约束 LLM 输出风格平均 65%（范围 22%–87%） [github.com]输入压缩（caveman-compress）持久记忆文件（如 CLAUDE.md）本地 Python 脚本重写文件为简洁格式平均 46% [github.com]
1.2 输出压缩：系统提示级风格约束
Caveman 的核心并非"修改已生成的对话内容"，而是在 LLM 生成回答之前注入一组风格约束规则，使 LLM 在同一次推理中直接产出简洁回复。这意味着不存在二次改写或额外模型调用。
具体的规则内容从代码仓库的 SKILL.md 中可以看到关键指令模式：

"Drop: articles, filler (just/really/basically), pleasantries, hedging. Fragments OK. Short synonyms. Code unchanged. Pattern: [thing] [action] [reason]. [next step]. ACTIVE EVERY RESPONSE. No revert after many turns. No filler drift. Code/commits/PRs: normal. Off: 'stop caveman' / 'normal mode'."

这段规则的技术要点：

删除对象：冠词（a/an/the）、填充词（just/really/basically）、客套话（sure/certainly/happy to）、犹疑措辞（hedging）
允许形式：句子片段（Fragments OK）、短同义词替换
严格保护：代码块不变（Code unchanged）、提交/PR 内容保持正常格式
持续性保障：明确要求"ACTIVE EVERY RESPONSE"和"No revert after many turns. No filler drift"，防止 LLM 在多轮对话后"回退"到冗长风格
退出机制：用户说"stop caveman"或"normal mode"即可关闭

为什么"角色设定"比"请简洁回答"更有效？ 项目作者和社区测试发现，仅告诉 Claude "请简洁回答"，其训练偏好会把回复拉回啰嗦模式，效果差；但给一个具体的"原始人"人设配合结构化规则，压缩效果显著提升。一篇 arxiv 论文（arxiv:2604.00025）也指出，对大模型施加简洁约束后，在某些基准上准确率反而提升了 26 个百分点。 [l024.net] [openclawapi.org]
1.3 多档位压缩策略
Caveman 提供 Lite / Full / Ultra 三种英文压缩等级和 Wenyan-Lite / Wenyan-Full / Wenyan-Ultra 三种文言文压缩等级。以同一个 React 重渲染问题的回答为例： [github.com]






























等级示例输出特征🪶 Lite"Your component re-renders because you create a new object reference each render. Inline object props fail shallow comparison every time. Wrap it in useMemo."完整语法，仅删填充词和客套🪨 Full（默认）"New object ref each render. Inline object prop = new ref = re-render. Wrap in useMemo."删冠词、片段化表达、短词替换🔥 Ultra"Inline obj prop → new ref → re-render. useMemo."电报体，符号因果📜 文言文"物出新參照，致重繪。useMemo Wrap之。"古典中文极简风格
数据来源：caveman 官方 README 对比表 [github.com]
文言文模式的设计理由：文言文是人类历史上信息密度最高的文字系统之一，同样一个意思用字最少，且中文每个字的 token 数量也比英文少。 [l024.net]
1.4 输入压缩：caveman-compress 子技能
这是 Caveman 实现跨会话 token 节省的关键工具。Claude Code 等 AI 助手在每次新会话开始时都会加载 CLAUDE.md 等项目记忆文件作为上下文。如果该文件很大，则每次会话都要消耗大量输入 token。 [github.com]
caveman-compress 的工作方式：
/caveman:compress CLAUDE.md

执行后生成两个文件： [github.com]
CLAUDE.md          ← 压缩版（Claude 每次会话读取这个——更少 token）
CLAUDE.original.md ← 人类可读备份（用户查看和编辑这个）

实测压缩效果（来自官方基准）： [github.com]















































文件原始 token 数压缩后 token 数节省比例claude-md-preferences.md70628559.6%project-notes.md114553553.3%claude-md-project.md112263643.3%todo-list.md62738838.1%mixed-with-code.md88856036.9%平均89848146%
关键保护规则：代码块、URL、文件路径、命令、标题、日期、版本号等技术内容原样透传不压缩，仅对散文性描述做压缩。所有验证通过——标题、代码块、URL、文件路径均完整保留。 [github.com] [github.com]
技术实现：caveman-compress 要求 Python 3.10+ 环境，其代码位于 caveman-compress/scripts/ 目录，安全扫描显示存在 subprocess 和文件 I/O 模式。这表明压缩过程由本地 Python 脚本执行文本转换，而非调用外部 LLM 进行重写。 [github.com]
累积效益计算：一个 1000-token 的项目记忆文件在每次会话开始时都被加载。经过 100 次会话，累计消耗 100,000 token 的开销。caveman-compress 将其削减约 46%，即长期节省约 46,000 token。
1.5 安全阀机制（Auto-Clarity）
Caveman 并非一味追求极致压缩。项目内置了 auto-clarity 安全退出机制，在以下场景下自动暂停简化模式，恢复 LLM 的正常详细回复：

安全警告：涉及危险操作时
不可逆操作确认：需要用户明确确认的关键步骤
多步骤序列：怕顺序搞混导致错误
用户显露疑惑：检测到用户可能不理解当前回答时

1.6 官方基准测试数据
以下为 Caveman 使用 Claude API 的实际 token 计数结果： [github.com]













































































任务Normal (tokens)Caveman (tokens)节省Explain React re-render bug118015987%Fix auth middleware token expiry70412183%Set up PostgreSQL connection pool234738084%Explain git rebase vs merge70229258%Refactor callback to async/await38730122%Architecture: microservices vs monolith44631030%Review PR for security issues67839841%Docker multi-stage build104229072%Debug PostgreSQL race condition120023281%Implement React error boundary345445687%平均121429465%
范围：22%–87%。解释性任务（如 React 错误边界：87%）节省最多；已经很简洁的重构类任务（如 async/await：22%）节省最少。

二、RTK 省 Token 关键技术原理
2.1 架构定位
RTK 是一个高性能 CLI 代理，定位于 AI 编程助手（Claude Code、GitHub Copilot、Cursor、Gemini CLI 等）与操作系统 shell 之间的中间层。其核心功能用一句话概括：在命令输出到达 LLM 上下文之前进行过滤和压缩。RTK 以单一 Rust 二进制文件形式提供，零运行时依赖，每条命令处理开销不到 10 毫秒。 [github.com] [github.com]
2.2 工作流程
RTK 的命令处理流程可用官方提供的对比图说明： [github.com]
没有 RTK：                                      使用 RTK：

Claude  --git status-->  shell  -->  git         Claude  --git status-->  RTK  -->  git
  ^                                   |            ^                      |          |
  |        ~2,000 tokens（原始）       |            |   ~200 tokens        | 过滤     |
  +-----------------------------------+            +------- （已过滤）-----+----------+

具体流程分为三个组件： [pyshine.com]


PreToolUse Hook（Bash 拦截器）：RTK 安装一个预执行钩子，透明地拦截 AI 代理发出的 Bash 命令。例如将 git status 自动改写为 rtk git status。AI 代理完全不感知这个改写过程，只接收到压缩后的输出。 [pyshine.com]


RTK Core（Rust 核心引擎）：分析命令类型，选择对应的过滤策略，执行高速处理（<10ms）。 [pyshine.com]


Filter Engine（过滤引擎）：实施四大策略： [github.com]

智能过滤：去除噪音（注释、空白、样板代码）
分组：聚合相似项（按目录分文件，按类型分错误）
截断：保留相关上下文，删除冗余
去重：合并重复日志行并计数



配置存储：用户偏好持久化于 ~/.config/rtk/config.toml，包括排除命令列表、tee 模式设置、自定义过滤规则，跨会话跨项目持久生效。 [pyshine.com]


2.3 RTK 基准测试数据
以下为 RTK 官方给出的30 分钟 Claude Code 会话典型 token 节省估算： [github.com]

操作频率标准输出 tokensRTK 输出 tokens节省ls / tree10x2,000400-80%cat / read20x40,00012,000-70%grep / rg8x16,0003,200-80%git status10x3,000600-80%git diff5x10,0002,500-75%git log5x2,500500-80%git add/commit/push8x1,600120-92%cargo test / npm test5x25,0002,500-90%ruff check3x3,000600-80%pytest4x8,000800-90%go test3x6,000600-90%docker ps3x900180-80%总计~118,000~23,900

注：估算基于中等规模 TypeScript/Rust 项目，实际节省因项目大小而异。 [github.com]

2.4 失败场景兜底：Tee 模式
RTK 配置中提供了 tee 模式，当命令执行失败时，RTK 会将完整未过滤的原始输出保存，以便 LLM 在需要时可以读取详细错误信息而不必重新执行命令。配置示例：


[tee]
enabled = true          # 默认开启
mode = "failures"       # 可选 "failures"、"always"、"never"


三、Caveman vs RTK 系统性对比
3.1 省 Token 机制对比








































维度CavemanRTK作用层面LLM 对话输出 + 持久记忆文件输入外部工具/命令的输出（shell stdout/stderr）核心方法风格约束规则注入 + 本地脚本文件重写确定性算法过滤（过滤/分组/截断/去重）触发方式LLM 在生成回答时遵循注入的规则PreToolUse Hook 拦截命令并路由至 RTK 处理 [pyshine.com]处理位置主 LLM 推理过程内（输出压缩）/ 本地 Python 脚本（输入压缩）本地 Rust 二进制，在 LLM 外部执行 [github.com]典型节省输出平均 65%（范围 22%–87%） [github.com]；输入平均 46% [github.com]综合约 80%（范围因命令类型 70%–92%） [github.com]支持平台40+ AI 代理（Claude Code、Codex、Cursor、Gemini CLI 等） [openclawapi.org]Claude Code、Copilot、Cursor、Gemini CLI、Codex 等 [github.com]
3.2 语义保真度对比
Caveman 在语义层面进行重构：删除赘述和语气词，用更短的措辞表达同一含义。其保真策略包括：

代码块、URL、文件路径、命令、标题、日期、版本号等技术内容严格原样保留 [github.com]
Auto-clarity 安全阀在高风险场景自动恢复详细输出
官方基准在全部测试任务中声称维持 100% 技术准确率 [github.com]

但需注意的 tradeoff：独立基准测试（来自 DEV Community 的 Kuba Guzik）显示，在已经要求"Be concise"且输出为结构化 JSON 的基线条件下，Caveman 的实际节省仅为 13%–21%（而非宣传的 75%）。在全部 72 次运行中，模型返回了 100% 的正确事实，无数据点丢失。这说明 75% 的节省数据基于"无任何简洁指令"的基线，而非实际开发工作流中常见的已有精简要求的场景。 [dev.to]
RTK 的语义修改风险更低：它不重写内容文字，仅执行结构性的删减和重组（去除空白行、合并重复项、按类型分组等）。在 tee 模式开启时，命令失败的完整原始输出会被保留供后续查看。其主要风险在于过滤规则偶有误判，可能对非标准格式的输出删除有用信息——此时用户可通过 exclude_commands 配置将特定命令排除在过滤之外。 [github.com]
3.3 大模型调用与成本

























维度CavemanRTK是否调用额外 LLM否。输出压缩由主 LLM 遵循注入规则完成；输入压缩由本地 Python 脚本完成 [github.com]否。纯本地 Rust 程序，零模型依赖 [github.com]自身的 token 开销完整技能规则约 552 tokens（注入到上下文中） [dev.to]零（不占用 LLM 上下文）净收益权衡552 tokens 的指令开销 vs 平均 65% 的输出节省。社区测试表明 6 行精简规则（仅 85 tokens）也可实现 14%–21% 的节省效果 [dev.to]无 token 开销；唯一成本是系统安装和 <10ms 延迟
关键推论：Caveman 技能规则本身有 token 成本。当 LLM 输出本来就很简洁时（如结构化数据提取任务），552 tokens 的注入开销可能抵消部分节省。在这类场景下，使用 85 tokens 的精简版规则更为划算——在 Claude Opus 上，精简版（21% 节省）反而优于完整版（9% 节省）。 [dev.to]
3.4 调试与可观测性对比



































维度CavemanRTK模式开关/caveman off 或说 "normal mode" 即时关闭通过 exclude_commands 排除特定命令压缩级别调节支持 /caveman lite/full/ultra 动态切换 [github.com]不适用（过滤策略按命令类型自动选择）原始内容保留caveman-compress 备份 .original.md 文件 [github.com]tee 模式在命令失败时保存完整未过滤输出安全机制auto-clarity 自动退出简化模式graceful degradation：遇到不支持的命令时透传原始输出统计功能在 Claude Code 中支持状态栏 badge 显示模式状态 [github.com]rtk gain 显示 token 节省统计；rtk gain --graph 显示 30 天 ASCII 图表；rtk discover 发现遗漏的节省机会 [github.com]
3.5 风险与不适用场景
Caveman 的风险与边界：

解释性不足风险：Ultra 模式下可能省略推理过程和前提条件，只给结论。对不熟悉问题领域的用户，可能造成理解障碍——auto-clarity 安全阀部分缓解了这一问题
基线效果递减：当用户已通过其他方式要求简洁输出、或任务本身输出很紧凑时（如纯数据提取），Caveman 的边际收益显著下降。独立测试显示在这类场景下仅节省 13%–21%，而非 75% [dev.to]
规则注入自身消耗 token：完整技能占 552 tokens，在短对话中占比不容忽视 [dev.to]
多轮对话漂移风险：虽然规则明确要求"No revert after many turns. No filler drift"，但不同 LLM 对长对话中指令遵循的一致性存在差异，实际效果可能随对话变长而衰减

RTK 的风险与边界：

过滤误伤：对于格式非标准或 RTK 未适配的命令输出，可能误删有用信息。需通过 exclude_commands 手动配置排除
非文本输出不适用：RTK 设计针对文本输出，对二进制数据、图片等非文本内容的命令不应使用
命令覆盖范围有限：虽支持 100+ 命令，但超出范围的命令将直接透传，不产生节省
纯对话场景无效：RTK 仅作用于外部命令输出。如果 AI 会话不涉及 shell 命令执行（纯问答对话），RTK 无法发挥任何作用

3.6 适用场景矩阵

使用场景CavemanRTK建议代码问答/Bug 分析✅ 高效（输出多为解释性文字，压缩空间大）❌ 无效（无命令输出可过滤）用 CavemanAI 驱动的构建/测试执行有限帮助（只压缩 AI 回复文字）✅ 高效（大量 test/build 输出可压缩 90%）用 RTKAI 代理频繁执行 shell 命令有限帮助✅ 核心场景（cat/grep/git 等命令输出大幅压缩） [github.com]用 RTK长期项目、频繁新建会话✅ caveman-compress 持续节省记忆文件 token✅ 全局 hook 持续节省命令输出两者结合PR 审查/Commit 生成✅ 有专门子技能（caveman-review / caveman-commit） [github.com]有限帮助用 Caveman教学/文档撰写❌ 不适合（需要详尽解释）不相关关闭 Caveman中文开发环境✅ 文言文模式可进一步提升压缩效率 [l024.net]✅ 提供中文 README 和文档 [github.com]



四、跨会话（Cross-Session）机制深入分析
这是你最关心的问题之一。下面分别用步骤化流程描述两者的跨会话工作方式。
4.1 Caveman 跨会话流程
Caveman 面临的跨会话挑战：每个新会话都是全新的 LLM 上下文，之前注入的规则不会自动延续；同时记忆文件每次会话都要重新加载。Caveman 通过三个机制解决：
步骤 1：持久记忆文件压缩（一次执行，长期受益）


用户运行: /caveman:compress CLAUDE.md
    ↓
Python 脚本读取 CLAUDE.md 原始内容
    ↓
保留: 代码块、URL、文件路径、命令、标题、日期、版本号
压缩: 散文性描述 → 原始人风格极简表达
    ↓
输出:
  CLAUDE.md          ← 压缩版（LLM 每次会话读取）
  CLAUDE.original.md ← 完整备份（用户编辑用）

  此后每次新会话，LLM 加载的 CLAUDE.md 都是压缩版本，无需重复执行压缩命令。仅当用户修改 .original.md 后才需要重新运行压缩。 [github.com]
步骤 2：SessionStart 钩子自动激活
不同平台的自动激活方式不同： [github.com]


平台自动激活机制Claude CodeSessionStart hooks（会话启动钩子） [github.com]Codex.codex/hooks.json 配置文件 [github.com]Gemini CLIcontext files（上下文文件） [github.com]Cursor/Windsurf/Cline/Copilot需手动添加 always-on 规则片段到系统提示或规则文件中 [github.com]
在 Claude Code 中，SessionStart hook 会在每次新会话启动时自动将 Caveman 规则注入系统提示，用户无需手动操作。


步骤 3：模式状态持久化
Caveman 在项目目录下创建 .caveman/ 文件夹，其中包含 .caveman-active 状态标记文件，记录当前模式（full / lite / ultra / wenyan 等）。每次会话启动时读取此文件，自动恢复用户上次选择的压缩等级。 [openclawapi.org]
完整跨会话时序：
会话 N（首次配置）:
  1. 安装 Caveman 插件
  2. 运行 /caveman:compress CLAUDE.md → 生成压缩版
  3. 设置 /caveman ultra → .caveman-active 写入 "ultra"
  4. 正常开发，所有 LLM 回复为 Ultra 模式

────── 会话结束 ──────

会话 N+1（无需任何操作）:
  1. Claude Code 启动 → SessionStart hook 注入 Caveman 规则
  2. 加载 CLAUDE.md（已是压缩版，节省 ~46% 输入 token）
  3. 读取 .caveman-active → 恢复 Ultra 模式
  4. 所有 LLM 回复自动为 Ultra 模式

────── 用户修改了 CLAUDE.original.md ──────

会话 N+2:
  1. 自动激活同上
  2. 用户运行 /caveman:compress CLAUDE.md → 重新压缩
  3. 继续使用

4.2 RTK 跨会话流程
RTK 的跨会话机制相对简单，因为它以系统级服务形式存在，不依赖 LLM 对话上下文：
步骤 1：一次性全局初始化
用户运行: rtk init --global          # 为 Claude Code 安装全局 hook
  或:     rtk init --agent gemini     # 为 Gemini CLI 安装
  或:     rtk init --agent codex      # 为 Codex 安装
    ↓
RTK 修改对应 AI 代理的 PreToolUse hook 配置
    ↓
所有后续会话中，该代理的 shell 命令自动经 RTK 过滤


步骤 2：配置持久化
所有配置存储在 ~/.config/rtk/config.toml，包括： [pyshine.com]

exclude_commands：不需要过滤的命令列表
tee.enabled / tee.mode：失败时是否保存原始输出
自定义过滤规则

该文件跨会话跨项目持久生效，用户修改后立即影响后续所有 AI 对话。
步骤 3：无状态按命令过滤
RTK 对每条命令独立过滤，不维护跨命令的状态。这意味着：

不存在"上下文漂移"问题
每个新会话的效果与上一个完全一致
唯一可能的变化来自用户修改 config.toml

会话 N（首次配置）:
  1. 安装 RTK: brew install rtk
  2. 初始化: rtk init --global
  3. 正常使用 AI 代理 → 所有 shell 命令自动经 RTK 过滤

────── 会话结束 ──────

会话 N+1（零操作）:
  1. AI 代理启动
  2. 用户或 AI 执行 git status → hook 自动改写为 rtk git status
  3. RTK 过滤输出并返回精简结果
  4. 效果与会话 N 完全一致

────── 用户调整配置 ──────

会话 N+2:
  1. 用户编辑 ~/.config/rtk/config.toml（如增加 exclude）
  2. 配置立即生效，后续命令按新规则过滤


4.3 跨会话机制对比总结

维度CavemanRTK新会话是否需要操作在有自动钩子的平台无需操作；否则需手动 /caveman无需任何操作状态持久化方式.caveman-active 文件 + 压缩后的记忆文件~/.config/rtk/config.toml上下文一致性风险LLM 可能在超长对话中指令遵循衰减无（确定性算法，每命令独立）更新机制修改 .original.md → 重新运行 compress修改 config.toml → 即时生效



五、两者能否结合使用

🔗
互补性分析
Caveman 压缩 LLM 的输出和持久上下文输入。
RTK 压缩 LLM 获取的外部工具输出（shell 命令结果）。
两者作用于不同数据流，可以同时启用而互不干扰。
📊
联合效益估算
RTK 将 30 分钟会话的工具输出从 ~118,000 token 压至 ~23,900 token（节省 ~80%）。
Caveman 将 LLM 回复平均从 1,214 token 压至 294 token（节省 ~65%）。
Caveman-compress 额外压缩每次会话的记忆文件加载开销约 46%。
三者叠加，可从输入（记忆文件）、中间（命令输出）、输出（LLM 回复）三个维度全面削减 token。
⚠️
联合使用注意事项
两者各自的风险仍然存在：Caveman 的解释不足风险 + RTK 的过滤误伤风险。
调试时建议临时关闭 Caveman（恢复详细回复）并检查 RTK tee 日志（获取未过滤命令输出），以获得完整信息。
RTK 在纯对话（无命令执行）场景下不产生任何价值，此时仅 Caveman 起作用。

总结：Caveman 和 RTK 从不同维度解决 LLM 上下文的 token 膨胀问题。Caveman 的本质是"提示工程"——通过精心设计的对话约束规则让 LLM 自身产出更精炼的回答，同时用本地脚本压缩持久记忆文件；RTK 的本质是"数据管道过滤"——在 LLM 获取外部信息的入口处用确定性算法剔除噪音。两者都不需要额外调用大模型，都支持跨会话持久化，但实现路径截然不同。对于以工具调用为主的 AI Agent 场景，RTK 的价值更为直接；对于以问答交互为主的编程助手场景，Caveman 效果更显著；在两者兼有的综合开发场景中，同时启用可实现输入、中间、输出三层 token 全面优化。


Me:

“这段规则的技术要点：

删除对象：冠词（a/an/the）、填充词（just/really/basically）、客套话（sure/certainly/happy to）、犹疑措辞（hedging）
允许形式：句子片段（Fragments OK）、短同义词替换
严格保护：代码块不变（Code unchanged）、提交/PR 内容保持正常格式
持续性保障：明确要求"ACTIVE EVERY RESPONSE"和"No revert after many turns. No filler drift"，防止 LLM 在多轮对话后"回退"到冗长风格
退出机制：用户说"stop caveman"或"normal mode"即可关闭”删除对象等等这些动作，都是通过python代码实现的？ 它的词库等等都是固定的吗？ 所以是每次input 和output 都需要通过这个hook，来把内容进行update？

Researcher:

Caveman 输出压缩规则的工程实现剖析

结论先行：Caveman 的"删除冠词/填充词"等压缩规则并非由 Python 脚本逐词删除，而是由 LLM 在系统提示约束下自主完成。Caveman 将一组精心设计的风格约束规则注入 LLM 的系统上下文（通过 SessionStart Hook），LLM 在同一次推理中直接生成精简回复，无须额外后处理1。SKILL.md 中明确列举了常见冠词、语气词等削减目标及示例2，但这些并非硬编码到代码中的停用词表，而是以自然语言指导 LLM 自行泛化判断。跨对话持久性依靠 Hook + 状态文件机制保证：每轮对话均通过 UserPrompt Hook 重新注入/强化规则，防止风格"回潮"1。
另一方面，caveman-compress 压缩记忆文件的过程虽由 Python 脚本驱动，但核心压缩仍由 LLM 完成：脚本构造压缩指令 Prompt 并调用 Claude API 重写文本，再用确定性代码校验结果。这一"文件一次压缩，多会话受益"的设计，解释了为什么 caveman-compress 可跨 session 长期生效，而对话输出压缩需要每次注入规则来维持效果。


压缩规则由 LLM 执行，非代码删词
Caveman 通过系统提示加入"像聪明的原始人一样说话"的规则，LLM 遵循这些规则直接生成简洁回复。SKILL.md 中列举的 "Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging" 等条目是给 LLM 的自然语言指南，而非程序代码中的停用词表。

Hook 层实现自动持久化
SessionStart Hook（caveman-activate.js）在每次会话一开始注入 Caveman 规则作为系统消息，并写入 .caveman-active 模式标志。UserPrompt Hook（caveman-mode-tracker.js）每次用户输入时读取状态文件并输出 hookSpecificOutput JSON 强化提示。不存在 Output Hook——模型回答不经二次改写。

文件压缩靠脚本+LLM API
/caveman:compress 由 Python 脚本调用 Claude API 重写文本。规则明确保护代码块、URL 等不变。压缩后文件持久保存用于未来会话，平均减少 ~46% token。需要 Python 3.10+。


1. 输出压缩规则：LLM 行为约束 vs 确定性代码逻辑
Caveman 的输出压缩本质是 Prompt Engineering，而非传统的文本过滤器。下面明确区分两个层面的职责：
1.1 LLM 行为约束层（Prompt / System Rule / Skill）
SKILL.md 是 Caveman 行为的单一真理来源（single source of truth），定义了压缩级别、持续性规则、auto-clarity 边界和压缩模式1。其内容以自然语言和示例告诉模型如何压缩，而非程序化指令：
核心规则原文（摘自 SKILL.md）：

"Respond terse like smart caveman. All technical substance stay. Only fluff die."2
"Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging. Fragments OK. Short synonyms (big not extensive, fix not "implement a solution for"). Technical terms exact. Code blocks unchanged. Errors quoted exact."2
"Pattern: [thing] [action] [reason]. [next step]."2
"ACTIVE EVERY RESPONSE. No revert after many turns. No filler drift. Still active if unsure. Off only: 'stop caveman' / 'normal mode'."2

这些规则的关键技术特征：

删除对象是自然语言描述的示例集，不是硬编码词典。SKILL.md 列出了 a/an/the、just/really/basically/actually/simply、sure/certainly/of course/happy to 等词作为示例2，但这些词的删除由 LLM 的语言理解能力执行，而非由程序扫描文本后做字符串替换。LLM 可以"触类旁通"——遇到 SKILL.md 未显式列出但同样冗余的措辞（如 "I think"、"it seems that"），模型也能自行省略。
同义词替换依赖模型语义理解。规则仅给出方向性示例 "big not extensive, fix not 'implement a solution for'"2，模型据此在生成时倾向用短词代替长词，但并不存在一个同义词映射表在代码中查表替换。
严格保护区域：代码块 (Code blocks unchanged)、错误信息 (Errors quoted exact)、技术术语 (Technical terms exact) 明确被排除在压缩之外2。
格式模板提供风格锚点：[thing] [action] [reason]. [next step]. 模式2给 LLM 一个简洁的句式骨架，辅以正反示例——"Not: 'Sure! I'd be happy to help you with that...' Yes: 'Bug in auth middleware. Token expiry check use < not <=. Fix:'"2。
六档压缩级别控制压缩强度2：

级别压缩特征lite删填充词/犹疑措辞，保留冠词和完整句式full（默认）删冠词，允许片段句，使用短同义词ultra极致缩写（DB/auth/config/req/res/fn/impl），删连词，箭头表因果wenyan-lite半文言，保留语法结构，去除填充wenyan-full全文言文，80-90% 字符减少wenyan-ultra文言极致缩写
数据来源：SKILL.md Intensity 表2
1.2 确定性代码逻辑层（JS Hook / Python 脚本）
Caveman 不对每轮对话的用户输入或模型输出做静态代码级文本改写。Hook 的作用是操控上下文（context），而非操控内容（content）：

没有 Python/JS 函数在 runtime 扫描模型输出并删除 "a/an/the" 等词。模型一开始就按照规则生成了不含这些词的版本。
没有对用户输入做压缩改写。除了识别 /caveman ... 斜杠指令和自然语言激活/停用关键词外，用户问题原文直接送入 LLM1。
唯一涉及确定性代码参与文本压缩的是 caveman-compress（文件压缩，详见第 4 节），那是对持久记忆文件的一次性处理，且其核心压缩步骤同样依赖 LLM API。

2. 单轮对话调用链：从用户输入到最终输出
2.1 Hook 系统的三组件架构
PyShine 的技术分析文章详细描述了 Claude Code 平台上 Caveman 的 Hook 系统1：
组件一：caveman-activate.js（SessionStart Hook）
每次 Claude Code 会话启动时运行一次，承担三项职责1：

写入模式标志：将当前激活模式（默认 "full"）写入 $CLAUDE_CONFIG_DIR/.caveman-active 文件1。写操作通过 safeWriteFlag() 函数完成，该函数拒绝对符号链接目标写入，使用原子性 temp+rename 方式，创建文件权限为 0600，防止本地攻击者替换可预测路径来破坏文件1。
将 Caveman 规则集输出为系统上下文：Hook 将规则文本输出到 stdout，Claude Code 将其作为系统消息注入模型。用户不可见此注入，但模型从会话第一条消息起就遵循 Caveman 规则1。
检查状态栏配置：若 settings.json 中未配置自定义 statusLine，Hook 会在首次交互时提示用户设置状态栏徽章1。

组件二：caveman-mode-tracker.js（UserPromptSubmit Hook）
每次用户提交问题时运行，从 stdin 读取 JSON 并处理三件事1：

斜杠指令处理：如果用户输入以 /caveman 开头，将对应模式写入标志文件。支持全部压缩级别及特殊模式如 /caveman-commit 和 /caveman-review1。
自然语言激活/停用：匹配 "activate caveman"、"talk like caveman"、"less tokens please" 等短语激活；匹配 "stop caveman"、"normal mode"、"deactivate caveman" 停用（删除标志文件）1。
每轮强化（Per-Turn Reinforcement）：当标志文件标记为持久模式（非 commit/review/compress 等一次性模式）时，Hook 输出一小段 hookSpecificOutput JSON 提醒，让模型在本轮回答时继续维持 Caveman 风格，即使其他插件在对话中注入了竞争性指令也不会被"冲淡"1。

组件三：caveman-statusline.sh（状态栏徽章）
读取标志文件并输出有色徽章：full 或空 → [CAVEMAN]；其他模式 → [CAVEMAN:ULTRA] 等。Windows 用户有 PowerShell 对应脚本 caveman-statusline.ps11。
2.2 调用链时序：一轮完整对话
以下伪流程描述 Caveman Full 模式激活状态下，一轮对话从输入到输出的完整路径：

2. 单轮对话调用链：从用户输入到最终输出
2.1 Hook 系统的三组件架构
PyShine 的技术分析文章详细描述了 Claude Code 平台上 Caveman 的 Hook 系统1：
组件一：caveman-activate.js（SessionStart Hook）
每次 Claude Code 会话启动时运行一次，承担三项职责1：

写入模式标志：将当前激活模式（默认 "full"）写入 $CLAUDE_CONFIG_DIR/.caveman-active 文件1。写操作通过 safeWriteFlag() 函数完成，该函数拒绝对符号链接目标写入，使用原子性 temp+rename 方式，创建文件权限为 0600，防止本地攻击者替换可预测路径来破坏文件1。
将 Caveman 规则集输出为系统上下文：Hook 将规则文本输出到 stdout，Claude Code 将其作为系统消息注入模型。用户不可见此注入，但模型从会话第一条消息起就遵循 Caveman 规则1。
检查状态栏配置：若 settings.json 中未配置自定义 statusLine，Hook 会在首次交互时提示用户设置状态栏徽章1。

组件二：caveman-mode-tracker.js（UserPromptSubmit Hook）
每次用户提交问题时运行，从 stdin 读取 JSON 并处理三件事1：

斜杠指令处理：如果用户输入以 /caveman 开头，将对应模式写入标志文件。支持全部压缩级别及特殊模式如 /caveman-commit 和 /caveman-review1。
自然语言激活/停用：匹配 "activate caveman"、"talk like caveman"、"less tokens please" 等短语激活；匹配 "stop caveman"、"normal mode"、"deactivate caveman" 停用（删除标志文件）1。
每轮强化（Per-Turn Reinforcement）：当标志文件标记为持久模式（非 commit/review/compress 等一次性模式）时，Hook 输出一小段 hookSpecificOutput JSON 提醒，让模型在本轮回答时继续维持 Caveman 风格，即使其他插件在对话中注入了竞争性指令也不会被"冲淡"1。

组件三：caveman-statusline.sh（状态栏徽章）
读取标志文件并输出有色徽章：full 或空 → [CAVEMAN]；其他模式 → [CAVEMAN:ULTRA] 等。Windows 用户有 PowerShell 对应脚本 caveman-statusline.ps11。
2.2 调用链时序：一轮完整对话
以下伪流程描述 Caveman Full 模式激活状态下，一轮对话从输入到输出的完整路径：


用户打开新的对话会话:
    Claude Code 触发 SessionStart Hook (caveman-activate.js):
      ① 读取/初始化 .caveman-active = "full"
      ② 将 SKILL.md 规则文本 → stdout → Claude Code 注入为系统消息
      ③ 检查 statusLine 配置
    → 模型上下文已包含 Caveman 规则

用户（轮1）问: "Why is my React component re-rendering?"
    Claude Code 触发 UserPrompt Hook (caveman-mode-tracker.js):
      ① 检查用户输入 → 非 /caveman 指令，无需改状态
      ② 读取 .caveman-active → "full" → 输出 hookSpecificOutput JSON 强化
    → 用户原始问题 + 强化提示 一并传入模型

模型接收的完整上下文:
    [System]  Caveman 规则（SessionStart 注入）
    [Hook]    hookSpecificOutput（每轮强化）
    [User]    "Why is my React component re-rendering?"

模型生成回答:
    遵循 "Drop articles/filler..." 等约束
    原本可能: "The reason your component is re-rendering is likely because
               you're creating a new object reference each render cycle..."
    实际输出: "New object ref each render. Inline object prop = new ref
               = re-render. Wrap in useMemo."

Claude Code 显示模型输出给用户:
    → 无任何后续代码级剪辑或处理
    → 用户看到的就是模型按 Caveman 风格生成的原始答复
    （状态栏显示 [CAVEMAN]）


关键结论：


环节是否有代码改写内容？实际发生了什么？用户输入否UserPrompt Hook 仅识别 /caveman 指令和自然语言触发词，不改写用户问题本身【5†L179-L198】系统上下文是（注入，非改写）SessionStart Hook 将规则文本追加到系统消息中【5†L159-L160】每轮强化是（注入，非改写）UserPrompt Hook 输出小型 JSON 作为隐藏补充上下文【5†L199-L205】模型回答否模型输出直接呈现给用户。Caveman 无 Output Hook，不存在对回答的二次处理



2.3 与非 Hook 平台的差异
在支持自动 Hook 的平台（Claude Code、Codex、Gemini CLI）上，上述流程完全自动化【5†L48-L54】。
对于不支持 Hook 的平台（如 Cursor、Windsurf、Cline、Copilot），Caveman 提供了 rules/caveman-activate.md 等规则文件，需要手动配置为 always-on 规则【14†L9-L10】。在这些平台上，每轮强化机制不可用，Caveman 仅靠规则文件中写入的 "ACTIVE EVERY RESPONSE" 等文字约束来维持一致性。

3. 持续性保障机制："No revert after many turns"
3.1 三重防线
Caveman 通过三层工程机制防止 LLM 在长对话中"回退"到冗长风格：
第一层：规则文本中的持续性声明
SKILL.md 明确写入 "ACTIVE EVERY RESPONSE. No revert after many turns. No filler drift. Still active if unsure."【1†L101-L103】。这属于 LLM 行为约束——模型在上下文中持续看到这条指令，会努力遵守。但仅靠这一层，如果对话极长导致上下文窗口滚动，早期系统消息可能被截断。
第二层：Per-Turn Reinforcement（每轮强化）
UserPrompt Hook 在每次用户提问时输出 hookSpecificOutput JSON，将 Caveman 模式提示"刷新"到模型最近可见的上下文中【5†L199-L205】。即使 SessionStart 注入的完整规则因上下文过长而被裁剪，这个per-turn 短提示始终位于对话最近端，确保模型不会忘记当前风格。
第三层：状态文件持久化
.caveman-active 文件跨轮次、跨 Hook 通信，始终记录当前模式【5†L147-L153】。只要该文件存在且内容不为空，UserPrompt Hook 就会持续发出强化提示。模式切换（用户说 "stop caveman" → Hook 删除文件）和恢复（用户说 "activate caveman" → Hook 重建文件）都通过该文件中介【5†L197-L198】。

3.2 已知风险与失败模式


风险场景原因缓解措施不支持 Hook 的平台模式丢失无 SessionStart/UserPrompt Hook，规则仅靠手动配置的规则文件需用户每次会话手动 /caveman 或配置 always-on 规则文件【14†L9-L10】多轮对话后风格回退LLM 指令遵循能力在超长上下文中可能衰减Per-turn reinforcement 缓解；若仍回退，官方 FAQ 建议"检查 hook 是否正常运行"【15†L15-L23】其他插件竞争性指令同一会话中其他插件要求详尽解释，与 Caveman 规则冲突Per-turn reinforcement 以 JSON 形式持续注入；SKILL.md 中的 "No filler drift" 给模型明确优先级信号【1†L101-L103】Hook 运行异常JS 文件加载失败、权限问题等Hook 设计为 silent-fail：任何文件系统错误都不应阻塞会话启动【14†L7】



4. Caveman-compress 文件压缩：代码逻辑与 LLM 协同
4.1 与输出压缩的根本区别
输出压缩不调用额外 LLM——主模型在同一次推理中遵循规则生成简洁回复。而 caveman-compress 会发起独立的 LLM API 调用来压缩记忆文件【20†L0-L1】【21†L9-L10】。
4.2 完整执行流程


用户触发：执行 /caveman:compress <filepath>（通常用于 CLAUDE.md）【5†L263-L267】。


安全检查：Python 脚本首先验证目标文件路径。代码中定义了 SENSITIVE_PATH_COMPONENTS (.ssh, .aws, .gnupg, .kube, .docker) 和 SENSITIVE_NAME_TOKENS ("secret", "credential", "password", "passwd", "apikey", "accesskey", "token", "privatekey") 等黑名单【21†L0-L1】。如果文件名或路径命中这些模式，脚本直接拒绝压缩并报错："Refusing to compress {filepath}: filename looks sensitive"【21†L9-L10】。这是因为压缩需要将文件原始内容发送到 Anthropic API（第三方边界），必须防止意外泄露凭证和密钥【21†L9-L10】。


构造压缩 Prompt：build_compress_prompt() 函数读取原始 Markdown 文本，将其嵌入结构化指令中【20†L0-L1】：

Compress this markdown into caveman format.
STRICT RULES:
- Do NOT modify anything inside ``` code blocks
- Do NOT modify anything inside [square brackets] or automatic link references
- [URLs, file paths, versions, headings, lists 等保护规则]
- Use Caveman style for prose: drop filler words, articles...

Text to compress:
<原始文本>


关键保护规则：代码块、URL、文件路径、命令、标题、日期、版本号等技术内容原样透传不压缩，仅对散文性描述做压缩【5†L283】。


调用 Claude API：call_claude() 函数通过 subprocess 调用 claude CLI 或发起 HTTP 请求，将 prompt 发送给 Anthropic 云端模型【20†L0-L1】。返回结果经 strip_llm_wrapper() 处理去除模型可能添加的包装文字【25†L3-L4】。


验证与自动修复：validate.py 脚本检查压缩结果的 Markdown 结构完整性——标题、代码块、URL、文件路径、命令是否完整保留【14†L15-L16】。若检测到违规：

脚本构造 build_fix_prompt()，将原始文本、压缩文本和错误列表一并发送给 Claude，要求仅修复错误【21†L3-L4】
最多重试 2 次【14†L15-L16】
若 2 次后仍失败，脚本恢复原始文件不做更改并报错："❌ Failed after retries — original restored"【21†L3-L4】



写入文件：验证通过后：

原始内容备份为 <filename>.original.md【5†L283-L289】
压缩后内容写回原文件路径（如 CLAUDE.md）



跨会话持久生效：由于 Claude Code 每次新会话都会重新加载 CLAUDE.md，此后读到的都是压缩版本，无需重复执行压缩命令【5†L275-L281】。


.3 文件压缩基准数据


文件原始 token 数压缩后 token 数节省比例claude-md-preferences.md70628559.6%project-notes.md114553553.3%claude-md-project.md112263643.3%todo-list.md62738838.1%mixed-with-code.md88856036.9%平均89848146%
数据来源：PyShine 技术分析文章引用的 Caveman 官方基准【5†L291-L298】
4.4 为什么文件压缩可以长久生效，而对话输出压缩需要每次注入？

文件压缩改变了持久存储的数据——记忆文件内容被永久替换为精简版本，后续所有会话都天然继承这个优化。
对话输出压缩涉及动态生成内容——LLM 每次回答如果没有规则约束就会恢复冗长风格。对话没有全局"状态文件"能让 LLM 自动记住"以后都简洁"，因此只能在每个会话的上下文中不断靠 Hook 注入规则。



















































































操作频率标准输出 tokensRTK 输出 tokens节省ls / tree10x2,000400-80%cat / read20x40,00012,000-70%grep / rg8x16,0003,200-80%git status10x3,000600-80%git diff5x10,0002,500-75%git log5x2,500500-80%git add/commit/push8x1,600120-92%cargo test / npm test5x25,0002,500-90%ruff check3x3,000600-80%pytest4x8,000800-90%go test3x6,000600-90%docker ps3x900180-80%总计~118,000~23,900-80%
注：估算基于中等规模 TypeScript/Rust 项目，实际节省因项目大小而异。 [github.com]
2.4 失败场景兜底：Tee 模式
RTK 配置中提供了 tee 模式，当命令执行失败时，RTK 会将完整未过滤的原始输出保存，以便 LLM 在需要时可以读取详细错误信息而不必重新执行命令。配置示例：

