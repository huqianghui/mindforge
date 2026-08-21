---
title: Vibe Coding系列14：Harness框架的Skill化收敛——从Agent、Command、Hook全家桶到纯Skill的架构简化
created: 2026-08-20
tags:
  - AI
  - vibe-coding
  - harness
  - harness-engineering
  - skill
  - superpowers
  - gsd
  - gstack
  - claude-code
  - plugin
---

# Vibe Coding系列14：Harness框架的Skill化收敛——从Agent、Command、Hook全家桶到纯Skill的架构简化

> 本文源于 2026-08-20 对 SDLC framework 更新的调查讨论：重新翻看 Superpowers、GSD、gstack 等框架的最新版本时，发现一个共同趋势——**它们都变简单了**。早期插件动辄自带 agent 定义、command 编排、hook 链、workflow，现在几乎只剩一样东西：一系列 skill。这不是偶然的巧合，而是外层 Harness 生态的一次结构性收敛。
> 前置阅读：[[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移|系列05（Skill Runtime 范式迁移）]]、[[Vibe Coding系列08：GSD+Superpowers+gstack三层插件架构——从定位争议到组合实践|系列08（三层插件架构）]]、[[Claude Code系列07：Harness分层架构——从50万行源码到社区框架的控制论解读|Claude Code 系列07（内层/外层 Harness 分层）]]。

---

## 0. 现象：一个插件的三个版本

最好的证据就在本地插件缓存里。Superpowers 在 `~/.claude/plugins/cache` 中恰好留存了三个版本，目录结构的变化一目了然：

| 版本 | agents/ | commands/ | skills/ | hooks |
|------|---------|-----------|---------|-------|
| 5.0.2 | 1 个（code-reviewer） | 3 个（brainstorm / execute-plan / write-plan） | 14 个 | 多个 |
| 5.0.7 | 1 个 | 3 个 | 14 个 | 多个 |
| **6.3.0** | **0 个** | **0 个** | 14 个 | **仅 1 个极简 SessionStart**（matcher: `startup\|clear\|compact`，只做 bootstrap 注入） |

Skill 数量一个没少，但 agent、command 目录整体消失，hook 收敛到只剩一个"会话启动时把 skill 索引注入上下文"的引导钩子。同样的瘦身也发生在 GSD 和 gstack 上——外层框架的交付物从"一套自带运行时机制的系统"变成了"一组纯 markdown 方法论文档"。

为什么？

---

## 1. 首要原因：宿主把基础设施内置了，插件的轮子成了重复建设

早期 Claude Code 功能有限。插件想实现"多阶段工作流"、"专职 reviewer agent"、"强制审批门禁"，只能自己造：自定义 agent 定义文件、command 编排入口、复杂的 hook 链。这是当时的**无奈之举**——不是插件想做重，而是宿主太薄。

现在宿主长出来了。Claude Code 原生提供：

| 插件早期自造的轮子 | 宿主现在的原生能力 |
|---|---|
| 自定义 agent 定义（如 5.0.2 的 code-reviewer.md） | **Agent 工具 + subagent 体系**（含 agent 注册、并行 dispatch、SendMessage 续话） |
| command 编排多阶段流程 | **Plan mode、任务列表（TaskCreate/TaskUpdate）、Workflow 编排** |
| hook 链实现流程门禁 | **原生 hooks 体系 + 权限系统 + 沙箱** |
| 自建状态文件追踪进度 | **Session 持久化、memory 体系** |

插件再自带一套，就是在 50 万行的内层 Harness 上重复建设（见 [[Claude Code系列07：Harness分层架构——从50万行源码到社区框架的控制论解读|系列07]] 的 6400 vs 500000 分析）。于是 Superpowers 的 `subagent-driven-development`、`dispatching-parallel-agents` 这些 skill 的做法变成了：**用 markdown 教模型怎么用宿主的原生能力**，而不是自己实现一套。6.3.0 的 release notes 里能看到这种寄生式演进的细节——"Subagent waits are event-driven instead of poll-heavy, spawns pin model and reasoning effort explicitly"——skill 文本在跟随宿主 API 的演进而调整措辞，而不是维护自己的执行代码。

一句话：**基础设施归宿主，方法论归插件，分层终于清楚了。**

## 2. 第二个原因：模型变强，流程挟持的收益变成了负担

早期框架用 command + hook 把模型"锁"在预设流程里，本质是对弱模型的不信任——怕它跳步、怕它偷懒、怕它不验证。模型能力上来之后，这种硬编排的成本收益倒挂了：

- **硬流程打断模型自己的规划**。新一代模型自带较强的任务分解和自我验证倾向，强制的 command 序列反而造成"模型想直走、流程逼它绕路"的对抗；
- **提示词教育比状态机管用**。Superpowers 6.x 的演进方向很说明问题：release notes 里大量篇幅在打磨 skill 文本的"rationalization table"（预判模型会用什么借口跳过 TDD，逐条反驳）——用**说服**替代**强制**，并且是拿 eval campaign 实测过的（删掉 TDD 的"Why Order Matters"反驳段后，test-first 行为从 8/10 掉到 5/10，于是改为折叠进表格而不是删除）；
- **强制留给真正不可逆的操作**。6.3.0 把"controller 遇到 plan 冲突就停下等人"改成"记录裁决继续干活，只有破坏性/不可逆操作才停"——一次捐赠的 session 曾因一个 controller 本可自决的问题空等九小时。门禁在收窄到真正需要人类的地方。

这正是 [[Vibe Coding系列13：控制论如何指导Harness Engineering——用Regulation和Requisite Variety让Vibe Coding变得可控|系列13]] 的控制论判断：调节器的复杂度要匹配被调节系统的不确定性——模型的不确定性下降了，外层调节器自然该降复杂度。

## 3. 第三个原因：Skill 是唯一跨 harness 可移植的载体

Agent 定义、command 协议、hook 事件模型都是**某个 harness 的实现细节**——换个宿主就全部作废（[[Foundry Toolbox与Skills深度解析：Prompt Agent与Hosted Agent的Skill支持、执行环境与Harness控制权|Foundry Skills 一文]]的结论：hook 的可移植性几乎为零）。而 skill 只是"给模型看的 markdown"，是可移植性最高的资产形态。

Superpowers 6.3.0 的 release notes 明确列出了 Harness Support 章节：Hermes Agent、Grok Build CLI、Antigravity、Pi、Codex……同一套 skills 通过不同的 bootstrap 机制注入到各家 harness。仓库里同时存在 `CLAUDE.md`、`AGENTS.md`、`GEMINI.md` 三个入口文件也是同一信号——**一份方法论，多个宿主**。一旦把资产押注在 skill 上，agent/command/hook 这些绑定单一宿主的机制就成了拖累跨平台发布的死重。

这与 Foundry 侧的动向共振：Prompt Agent 与 Hosted Agent 的对比表中 Skill support 已双双标 Yes——skill 正在成为跨 harness 的行业通用格式。

## 4. 第四个原因：纯文本资产的维护成本低一个量级

Agent/hook/command 是代码，有兼容性矩阵、有平台差异、有 bug。Superpowers 6.3.0 修的 Windows SessionStart hook 问题很典型：一个带引号的命令路径，PowerShell 当表达式解析报错、cmd.exe 的去引号规则遇到路径里的 `(` 直接截断——**一个 hook 要在三种 shell 上验证**。这类成本乘以每个自带机制，就是框架维护者的日常。收敛到纯 skill 后：

- 测试方式从"跑代码"变成"eval campaign + subagent probe"（6.x 对每处文本删减做微测试，有一处删减实测退化就重做而不是硬上）；
- 发布物从"多平台二进制行为"变成"markdown 文本"，review 即 diff；
- 唯一保留的那个 SessionStart hook 承担全部的"代码性"——最小可行的注入点。

## 5. 收敛后的分工格局

把四个原因合起来，外层 Harness 生态收敛到一个清晰的三层分工：

```
┌─────────────────────────────────────────────┐
│ 方法论层（插件/框架）：纯 skill               │
│   Superpowers = 工程纪律（TDD/review/debug） │
│   GSD = 项目规模分级与 context 策略           │
│   gstack = 具体工种的操作手册                 │
├─────────────────────────────────────────────┤
│ 基础设施层（宿主 harness）：                  │
│   Agent Loop、subagent、workflow、hooks、    │
│   权限、沙箱、session、memory                 │
├─────────────────────────────────────────────┤
│ 能力层（模型）：规划、自检、工具使用           │
└─────────────────────────────────────────────┘
```

对照 [[Vibe Coding系列08：GSD+Superpowers+gstack三层插件架构——从定位争议到组合实践|系列08]] 当时的"三层插件架构"：那时三个框架各自还带着机制层的私货，组合时要处理 hook 冲突、command 命名空间打架；现在它们都退到纯方法论层，组合成本大幅下降——skill 天然可叠加，冲突至多是"两份文档观点不一致"，而不是"两个 hook 抢同一个事件"。

这也意味着框架之间的竞争维度变了：**不再比谁的机制更精巧，而是比谁的方法论文本更能改变模型行为**——Superpowers 用 eval campaign 微测试每一段文字的存废，就是这个新竞争维度下的打法。方法论质量成了唯一护城河。

## 6. 落地问答一：收敛之后，用户自己还要建 subagent/workflow/hook 吗？

一个自然的追问：既然框架都不带机制了，那机制是宿主全自动了，还是转嫁给用户自己建？答案是**分两半：机制已自动化，策略归你——但"策略"大部分场景也不用写**。

**宿主全自动的部分（零配置可用）**：内置通用 agent 类型（general-purpose / Explore / Plan）、subagent 的调度与并行 fan-out、plan mode、任务列表、Workflow 编排、hook 挂载点、session 持久化。模型自己决定"这个搜索任务派个 subagent"、"这三个独立任务并行跑"——不需要预先定义任何文件。Superpowers 的 `dispatching-parallel-agents` 全文没有一行代码，只是教模型怎么用宿主原生能力：**机制是宿主的，触发是模型的，skill 只是方法论**。

**仍需亲手建的只有两类**，恰好都是"自动化不了"的：

1. **领域角色 subagent**——当通用 agent 的"人设"不够用时。判断标准：需要**固定系统提示词 + 受限工具集 + 可路由的名字**才建（如本 vault 的 obsidian-agent：日记格式规则 + 工具白名单）。只是"帮我并行搜三个目录"这种，内置 agent 就够。
2. **安全 hook**——当需要 100% 强制而不是 90% 听话时（如本 vault 的 guard-private-journal.sh：私人日记永不进 git，不能靠模型"记得"）。Hook 永远不会被宿主"自动化"掉——**该挂什么门禁只有你知道**，宿主只能提供挂载点。

| 东西 | 谁负责 | 你的动作 |
|---|---|---|
| 机制（subagent 调度、workflow 引擎、hook 事件） | 宿主 | 无，开箱即用 |
| 何时用、怎么用（方法论） | 模型 + skill | 装插件或写 skill 文档，不写也能用 |
| 领域角色（专业 agent）和硬门禁（hook） | **你** | 仅在"通用不够专"或"说服不够硬"时才建 |

## 7. 落地问答二：BMAD 式角色 agent（PM / CEO / UI-designer）还该建吗？

BMAD 这类"角色扮演式流水线"（PM 写 PRD → Architect 出架构 → Dev 实现 → QA 审查）是上一代重 harness 风格的典型。skill 化收敛趋势下，判断一个角色该做成 agent 定义还是 skill，标准不是组织架构，而是**机制需求**：

**值得做成 subagent 的角色——需要机制层的东西**：

- **上下文隔离**：QA/reviewer 的价值恰恰在于"没看过实现过程的新鲜眼睛"——同一上下文自审会被前文倾向污染，必须独立上下文，skill 给不了（OMC 的 "Never self-approve in the same active context" 即此理）；
- **工具限权**：架构评审只读不写（工具清单去掉 Write/Edit），硬约束只能在 agent 定义里做；
- **并行 fan-out**：三个 UI 方案让三个 designer 实例各出一版再评比。

**降级成 skill 的角色——只是方法论的拟人化包装**：

- PM 的真实价值是 **PRD 模板、需求追问清单、验收标准写法**——纯知识，写成 skill 效果一样，省掉委派开销和上下文割裂；
- **CEO 这类角色基本是戏剧效果**：有用的是决策准则（成本红线、优先级框架），没用的是人设本身。模型不会因为被叫 CEO 就获得商业判断力——把准则写成 checklist skill 比造 CEO agent 诚实得多。

| BMAD 角色 | 建议载体 | 理由 |
|---|---|---|
| PM / PO（产出 PRD） | **skill/command**（方法论+模板） | 纯知识，无需隔离 |
| Architect | skill 为主；重大决策可用只读 subagent | 需读全库但不该动手改 |
| Dev | 主会话或 executor subagent | 本来就是默认工作形态 |
| QA / Reviewer | **必须 subagent** | 上下文隔离是其价值来源 |
| UX designer | 并行出稿用 subagent，规范用 skill | 机制需求（并行）才上 subagent |

**一句话：agent 按"机制需求"建——需要隔离、限权、并行的角色才配一个 agent 定义文件（QA 是典型）；只装方法论的角色（PM/CEO）降级成 skill，效果不减、维护减半。** 这正是 skill 化收敛趋势在 BMAD 问题上的具体应用。

BMAD 有一点本来就做对了：**阶段间靠文档交接**（PRD、架构文档落盘，下一阶段读文件而不是靠会话记忆）。这在 subagent 体系里依然是最佳实践——subagent 之间不共享上下文，产物落盘就是天然的 handoff 协议。

## 8. 落地问答三：agent 有层级吗？能 agent 套 subagent 吗？

有层级，但**只有两层半**，且业界在收紧而不是放开：

```
Main Agent（主会话本身，天然存在的顶层执行体，不在 .claude/agents/ 里定义）
   │ 通过 Agent 工具委派
   ├── Subagent A（Explore：只读搜索，跑完即回）
   ├── Subagent B（obsidian-agent：领域角色）
   │      └── （仅全工具 agent 可再委派一层，多数专职 agent 的工具清单排除了 Agent 工具，是叶子节点）
   └── Teammate C（长期协作型，可 SendMessage 续话）
```

三个关键认知：

1. **`.claude/agents/*.md` 定义的是 agent 类型（模板）**，运行时被实例化为 subagent——"agent 是类，subagent 是对象"。所以"设定 PM agent 还是 subagent"不是二选一：定义形式叫 agent，运行形态叫 subagent。
2. **深嵌套被刻意限制**：Workflow 嵌套只允许一层；Superpowers 6.3.0 有现成实证——"Implementers and reviewers may not spawn their own subagents, which was producing duplicate reviews"。深层级委派的通病：上下文逐层有损压缩、成本失控、孙代 agent 的行为对主会话完全不可见。
3. **"CEO→PM→Dev" 的组织树，正确译法是扁平星型**：main agent 兼任编排者，按阶段依次委派（PM 阶段加载 PRD skill → Architect 只读 subagent 出文档 → Dev executor 读文档实现 → QA reviewer 独立评审），层级感靠**主会话的编排权 + 文件交接**实现——指挥链是逻辑上的，不是进程树上的。

## 9. 落地问答四：怎么指定 subagent 干活——直接调出，还是通过 skill？

明确了"哪些角色该建成 subagent"之后，还剩一个操作问题：怎么触发它？实践中有**三条路径**，按控制权从直接到间接排列。先给结论：**日常是"说需求，模型自己路由"；skill 不是调用 subagent 的通道，而是教模型"何时该派、怎么派"的路由规则**。

**路径一：自然语言点名/描述需求（最常用）**。Subagent 没有命令行式的"直接调出"入口，但可以在对话里点名（"用 obsidian-agent 整理今天的日记"），主会话调用 Agent 工具把需求作为 prompt 传给它。也可以不点名只说需求——每个 agent 定义的 `description` 字段就是给模型看的"路由说明书"（如 obsidian-agent 的描述写着"当用户提到日记、任务、TODO……时使用此 agent"），模型据此自动匹配。**description 写得好不好，直接决定自动路由准不准**——这是 agent 定义文件里最重要的字段之一。

**路径二：slash command 包装（确定性入口）**。"需求 → 某 subagent"的映射固定高频时，用 command 变成一键入口。本 vault 的路由表即实例：`/daily` → obsidian-agent、`/extract-knowledge` → knowledge-extractor、`/detect-conflict` → conflict-detector。命令即路由，不靠模型猜——适合流程固定、不想每次口头描述的场景。

**路径三：skill 教方法论，模型在执行中自主派活（间接）**。这里要澄清 skill 的角色：**skill 不直接调用 subagent，它改变的是模型的决策**。Superpowers 的 `subagent-driven-development` skill 内容是"实现每个任务派 implementer subagent，完成后派独立 reviewer 评审，不得复用 implementer 上下文"——模型加载后在执行任务时**自发地**按这套纪律派活。用户从头到尾只说了"实现这个功能"，派活决策全部来自 skill 灌输的方法论。

| 路径 | 触发者 | 确定性 | 适合 |
|---|---|---|---|
| 自然语言点名/描述需求 | 你（每次口头） | 中（靠 description 路由） | 临时、低频任务 |
| slash command | 你（一键） | 高（命令即路由） | 固定高频入口（/daily 这类） |
| skill 方法论 | 模型（执行中自主） | 低但覆盖广 | 工作纪律类（"凡写代码必派 reviewer"） |

三条路径是叠加使用的：`/daily`（路径二）唤起 obsidian-agent，它按自己定义文件里的格式规则干活（agent 定义 = 长驻的角色 skill）；装了 review 类 skill 后，主会话在大改动后还会自发派 reviewer（路径三）。**一句话：要指定谁干活，说出来或做成 command；要固化"什么情况该派谁"的规则，写进 skill 或 agent description——前者是点菜，后者是训练服务员。**

## 10. 判断与推论

1. **"变简单"是表象，实质是职责归位**。复杂度没有消失，而是沉到了宿主（内层 Harness 持续变厚）和模型（能力吸收了流程）两端；插件层作为方法论载体，本来就该薄。
2. **选型视角更新**：评估一个 SDLC 框架，过去看"机制是否完备"（有没有 reviewer agent、有没有门禁 hook），现在应该看"skill 文本质量与实证方法"（有没有 eval 支撑、rationalization 覆盖是否扎实、是否跟随宿主能力演进及时更新）。
3. **风险提示**：纯 skill 意味着约束力从 L1（代码强制）降到 L2/L3（提示词说服）——对确实需要硬门禁的场景（合规审计、不可逆操作），仍需宿主 hook 或外部流程兜底，不能全押说服。这与本 vault 的记忆提权协议（`.claude/rules/memory-promotion.md`：L1 Hook / L2 CLAUDE.md / L3 Memory 三级约束强度）是同一个道理：约束力要匹配需求强度，行为规则的载体决定它的强制力上限。
4. **对 Foundry 侧的映射**：Prompt Agent（宿主托管机制）+ skill 双 Yes 的组合，正在企业侧复刻同一分层——平台管运行时，skill 管方法论。这一收敛不是 Claude Code 生态的局部现象，而是 Agent 产业的通用走向。
5. **用户侧的资产清单也随之收敛**（见第 6~8 节）：值得亲手维护的只剩三类——领域角色 agent 定义（装只有你有的领域知识）、安全 hook（装只有你能定的安全边界）、方法论 skill（装你的工作流偏好）。其余机制一律用宿主原生的；角色扮演式流水线（BMAD 等）按"机制需求"翻译成扁平星型编排，而不是照搬组织架构树。

---

## 参考

- 本地插件缓存实证：`~/.claude/plugins/cache/claude-plugins-official/superpowers/`（5.0.2 / 5.0.7 / 6.3.0 三版本目录对比）
- Superpowers 6.3.0 RELEASE-NOTES.md（controller 自决、批量 dispatch、rationalization table 微测试、Windows hook 修复、多 harness 支持）
- [[Claude Code系列07：Harness分层架构——从50万行源码到社区框架的控制论解读]] — 内层/外层 Harness 分层框架
- [[Vibe Coding系列05：大项目落地困局——从Context爆炸到Skill Runtime的范式迁移]] — Skill Runtime 范式的先导判断
- [[Vibe Coding系列08：GSD+Superpowers+gstack三层插件架构——从定位争议到组合实践]] — 收敛前的三框架组合形态
- [[Vibe Coding系列13：控制论如何指导Harness Engineering——用Regulation和Requisite Variety让Vibe Coding变得可控]] — 调节器复杂度匹配论
- [[Foundry Toolbox与Skills深度解析：Prompt Agent与Hosted Agent的Skill支持、执行环境与Harness控制权]] — skill 可移植性与 hook 归零结论
