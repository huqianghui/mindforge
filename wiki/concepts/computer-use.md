---
title: "Computer Use"
created: "2026-08-30"
updated: "2026-10-14"
tags:
  - wiki
  - concept
  - agent
  - computer-use
  - browser-use
aliases:
  - "Browser Use"
  - "桌面控制"
  - "浏览器操作"
related:
  - "[[agent-loop-architecture]]"
  - "[[model-harness-codesign]]"
  - "[[skill-runtime]]"
  - "[[harness-portability-spectrum]]"
---

# Computer Use

## 摘要

Computer Use 是 agent 直接操作 UI 层（而非 API 层）的能力：观察屏幕/页面状态（截图、DOM、Accessibility Tree），执行点击、输入、滚动等人类动作。广义的 Computer Use 是一切 GUI 控制，浏览器也是 GUI，因此它**包含** Browser Use——Browser Use 是 Computer Use 在浏览器域的子集；狭义的"原生桌面 Computer Use"特指通过操作系统接口控制桌面，此时它与 Browser Use 是**并列的两条执行路径**。Chrome integration 是接入用户浏览器的方式，不是两者之间的一层；产品栏目、操作能力、接入方式、观察方式另作正交维度理解（2026-10-13 系列一重写的澄清）。这条能力路线的价值在于绕开 API 对接（SaaS 接口变更、跨部门审批），把"用户已经会用的业务界面"直接当作 agent 的操作对象；代价是维护对象从 API 契约变成页面语义。

本概念的核心工程认知有三条主线：① **action loop 协议**——模型提议动作、handler 翻译执行、重新观察验证的循环，是 agent loop 在 GUI 操作域的实例化；② **Skill 是说明书、Runtime 才是手脚**——工具/Skill 声明处处可见，但执行 runtime 决定能力归属（Codex CLI vs App 的能力分界实证）；③ **执行位置决定补位形态**——能力越贴近用户本地状态（登录态、桌面、系统权限），缺位时越只能在客户端补。

## Claims

### Claim: 广义 Computer Use ⊃ Browser Use——操作 UI 层而非 API 层；Chrome integration 是接入方式而非中间层，狭义"原生桌面 Computer Use"与 Browser Use 是并列执行路径

- **来源**：[[Computer-Use与Browser-Use系列一：概念与产品形态]]、[[Computer-Use与Browser-Use系列九：三条执行路径对比]]
- **首次出现**：2026-08-29
- **最近更新**：2026-10-14
- **置信度**：0.8
- **状态**：active

> Computer Use 是广义 GUI 操作能力（桌面应用 + 浏览器），Browser Use 是其浏览器子集。Codex 侧四种浏览器形态（内置 `@Browser`、Chrome extension `@Chrome`、Playwright、Orca 内嵌 Browser）的本质差异是 **Profile 边界**——是否复用用户真实浏览器的登录态。认证三链路（桌面应用 provider / 扩展继承 / 独立会话）相互独立，Azure OpenAI provider 实测可用。

> 2026-10-14 精化（系列一 10-13 重写 + 系列九）：包含关系按**广义**理解——Computer Use 作为 GUI 控制的总类目覆盖桌面应用与浏览器。需要精确的两处：① **Chrome integration 不是中间层**，旧版"Computer Use → Chrome integration → Browser Use"三层树不成立，Chrome integration 只是 Browser Use 接入用户 Chrome 的一种方式（也可接内置 / 独立浏览器）；② **狭义用法下并列**——讨论执行路径时，"原生桌面 Computer Use"（OS 辅助功能 + 窗口截图 + 系统输入）与 Browser Use（浏览器接口）是两条平行路径，系列九的三路径对比即在此口径下。另外两处修正：Profile 边界只是"会话边界"一维，与显示形态（headless / headed）独立；"认证三链路相互独立"修正为"用途不同、实现可能耦合"（见系列九认证 Claim）。

### Claim: 包含关系之外的正交维度——产品栏目、操作能力、接入方式、观察方式分开理解，产品设置里的归类不等于技术层级；headless/headed 与 Profile 也是两个独立维度

- **来源**：[[Computer-Use与Browser-Use系列一：概念与产品形态]]（2026-10-13 重写）、[[Computer-Use与Browser-Use系列九：三条执行路径对比]]
- **首次出现**：2026-10-13
- **最近更新**：2026-10-14
- **置信度**：0.8
- **状态**：active

> 本条是对上一条包含关系的补充而非替代：包含关系回答"控制范围谁大"，正交维度回答"怎么接入、怎么观察、用谁的会话"。同一次读取已登录网站的任务，产品记录里归在 Computer use 栏目下、技术上用的是 Browser Use、接入方式是 Chrome integration 扩展——三个名称同时出现并不矛盾，但**产品设置中的归类不能直接转换为技术上的能力层级**。拆成六个维度：控制范围（原生桌面 / 浏览器页面）、浏览器接入（独立或内置 / 扩展连接 / 受控 CDP）、观察方式（DOM / AX / 截图）、动作方式（语义控件 / 页面命令 / 坐标与按键）、会话边界（独立 Profile / 用户现有 Profile）、显示形态（headed / headless / 面板 / 预览）。这些维度可组合：Browser Use 不依赖 Chrome integration（也可接内置或独立浏览器）；**两条路径都可以混合结构化与视觉观察**——原生桌面 Computer Use 不等于每步截图点坐标（AX 可读时按语义操作），Browser Use 也可看截图处理 Canvas，网页缺结构时先用浏览器内的视觉动作、不必立即切到系统桌面控制。易混点：画中画是预览形态，不能据此判断是否 headless 或用了哪个 Profile；headless 浏览器可以带持久化 Profile 或预置认证状态，并非必然无登录态。

### Claim: action loop 是 agent loop 在 GUI 操作域的实例化——协议层/翻译层/执行层分离，官方只给协议不给执行器

- **来源**：[[Computer-Use与Browser-Use系列三：自己实现]]
- **首次出现**：2026-08-29
- **最近更新**：2026-08-30
- **置信度**：0.8
- **状态**：active

> 循环骨架与 agent loop 同构（观察 → 模型判断 → 执行 → 回灌新状态），区别仅在实例化域：观察对象从工具返回值变成屏幕/页面状态（截图、DOM、AX 树），动作从 API 调用变成 UI 事件（click/type/scroll 坐标或元素引用）。分层上，模型返回的 action JSON 只是协议（`{type:"click",x,y}` 不会自己执行）；**action handler 是自己要写的翻译层**（官方仅给示例）；执行层可选 Playwright（浏览器页面）或 xdotool/系统事件（整个桌面）。"Docker 支持这些 action"是误读——支持 action 的是 handler，Docker/Playwright 只是执行环境。

### Claim: 语义操作优先、坐标操作兜底——Codex 与 Orca 两个独立实现同构收敛

- **来源**：[[Computer-Use与Browser-Use系列二：Codex浏览器运行时]]
- **首次出现**：2026-08-29
- **最近更新**：2026-08-29
- **置信度**：0.7
- **状态**：active

> Codex 运行时三套操作 API 按精度降级：playwright 语义层（locator/getByRole，页面小改版不失效）→ dom_cua 节点层 → cua 纯视觉坐标兜底；Orca 独立实现同样收敛到"Accessibility Tree 语义元素优先、Screenshot 坐标兜底"。跨产品同构是设计规律的强信号：**坐标一次重排就失效，语义定位才可长期维护**。推荐降级链：语义操作 → 截图+坐标 → 交人接管。

### Claim: Skill 是说明书、Runtime 才是手脚——CLI/App 共享 Skill 发现机制但执行 runtime 不对等

- **来源**：[[Computer-Use与Browser-Use系列六：Codex-CLI与App的分界]]
- **首次出现**：2026-08-29
- **最近更新**：2026-08-29
- **置信度**：0.7
- **状态**：active

> 实测：Codex CLI 能读到 App 的 bundled Computer Use Skill 文件（198 行完整 API 文档），但缺 `node_repl + @oai/sky` runtime，Skill 是一纸空文；本机 Orca 提供替代后端（75 行 discovery stub + 动态手册），同一任务（播放网易云音乐）经 `orca computer` 跑通。两个同名 `computer-use` Skill 并存时，路由的隐式裁决者是 **runtime 可用性排除法**而非智能路由。两条调用链在顶层 action loop 和底层 macOS Accessibility 一致，中间的执行引擎、协议、权限持有者（App 审批 UI vs Orca Helper）完全不同——信任边界随之不同。

### Claim: 执行位置决定能力归属——Computer Use / Browser Use / Web Search 三例同构，能力越贴近本地状态补位越只能在客户端

- **来源**：[[Computer-Use与Browser-Use系列七：搜索与浏览器操作的分界]]
- **首次出现**：2026-08-30
- **最近更新**：2026-08-30
- **置信度**：0.7
- **状态**：active

> 三个实例共享"声明处处可见、runtime 决定归属"结构：Computer Use（CLI 缺 `@oai/sky` → Orca 客户端补）、Browser Use（CLI 缺 Browser runtime → Orca 内嵌 Browser/Playwright 客户端补）、Web Search（换 Bedrock/Vertex/Databricks 代理后服务端执行器消失 → Tavily MCP 客户端补/LiteLLM 代理层拦截/browser use 开 Google 反向补）。规律：**web search 无本地状态，三层都能补；browser use 依赖登录态、computer use 依赖桌面与系统权限，只能客户端补**。"自带搜索"的产品全是第一方闭环（模型和搜索执行器同服务端）——服务端工具全家桶是第一方绑定的隐性福利。

### Claim: 服务端工具断供要分两层判断——端点层有无执行器 × harness 层肯不肯发声明，断供点越上游可补位层越少

- **来源**：[[Computer-Use与Browser-Use系列七：搜索与浏览器操作的分界]]
- **首次出现**：2026-08-30
- **最近更新**：2026-09-04
- **置信度**：0.85
- **状态**：active

> Codex + Azure OpenAI 断供解剖补出第二层：Azure Responses API 端点层其实有阉割版 `web_search` 执行器（`external_web_access` 恒 false，搜预建索引），但 Codex harness **只在默认 OpenAI provider 时才附加工具声明**（openai/codex#3851）——声明根本不出门，端点侧有执行器也无用。对照 Claude Code + Databricks 是"端点无执行器、声明发了没人执行"。两层判断框架的推论：**断供点越靠上游，下游可补位的层就越少**——LiteLLM 代理层拦截只救"断在端点层"的场景（声明得先出门才有物可拦），harness 层断供只剩客户端补位；客户端补位最通用正因为它在整条链路最上游。现场实锤：Codex App 配 Azure provider 后模型自述"当前会话没有向我暴露 web_search 工具"——连第一方 App 形态也断供，能力归属跟请求落点走、不跟产品形态走。附带暴露最隐蔽的代价：工具缺失时模型可能凭训练知识一本正经作答过期数据，用户不追问根本发现不了。

### Claim: 判定工具执行位置的五条指纹需多条交叉——弹本地权限恰证执行器在本地；管道决定能力下限、模型性格决定实际走几级梯

- **来源**：[[Computer-Use与Browser-Use系列七：搜索与浏览器操作的分界]]
- **首次出现**：2026-08-31
- **最近更新**：2026-09-04
- **置信度**：0.8
- **状态**：active

> VS Code 三模型对照实验（GPT-5.6 Sol / Gemini 3.7 Flash / Grok 4.6，同一问题只换模型）：三者搜索 Output schema 完全相同（`url_citation` 锚点 + `bing_searches`），证明走的是 Copilot 服务端统一管道而非某家模型厂商的 hosted search——Gemini 数据点起证伪作用（Google 自家 grounding 是另一套 `groundingMetadata` 格式）。五条判定指纹：① 工具名前缀（`mcp_` → MCP）；② Output schema（鉴别哪条管道格式化了结果，**不能**直接等同哪家执行）；③ 客户端有无对应物（没装扩展还能搜 → 服务端）；④ 换模型对照（schema 随模型变 → 挂模型；不变 → 挂管道层）；⑤ 权限弹窗位置——**弹本地权限恰恰证明执行器在本地**，这是执行位置最硬的指纹。元教训：单一指纹会误判（只看 schema 曾把统一管道误认成 OpenAI hosted），换模型对照这类控制变量实验一次就能分离管道层与模型层。真正的行为差异变量是模型性格：GPT/Gemini 信任搜索成品直接成文，Grok 自发沿三级梯下探（本地 fetch Yahoo 交叉验证触发权限弹窗）——管道决定能力下限，模型性格决定实际走几级梯。

### Claim: UI 层天然残缺、数据层天然完整——DOM 虚拟化是页面性质而非工具缺陷

- **来源**：[[Computer-Use与Browser-Use系列五：最佳实践]]
- **首次出现**：2026-08-29
- **最近更新**：2026-08-30
- **置信度**：0.8
- **状态**：active

> browser use 解决登录态和 JS 渲染，**不解决 DOM 虚拟化**——虚拟化页面（如 ChatGPT share）的活 DOM 只含视口附近内容，`domSnapshot()` 读到的和手写 Playwright 一样残缺，且 agent 意识不到缺。真解在换数据层（如解析 turbo-stream 数据块）。信息获取三级梯（search 发现 → fetch 获取 → browser use 到场）中，上层工具可向下兼容下层只读场景（browser use 开 Google 省搜索 API 费），但代价是模型 token、延迟与风控风险——"能补"和"该用它补"之间隔着成本表。抓取后完整性核验（数量/关键词/悬置/边界四查）责任永远在人。

### Claim: 产品化路线是"可审计智能 RPA"——模型提议、策略放行、执行器落地三权分立

- **来源**：[[Computer-Use与Browser-Use系列四：产品化]]
- **首次出现**：2026-08-29
- **最近更新**：2026-08-29
- **置信度**：0.7
- **状态**：active

> 企业场景的核心原则：模型不应直接持有浏览器控制权限——模型只提出动作，策略层决定是否放行（域名/动作白名单、高风险确认），执行器在客户浏览器本地落地。动作设计成高层业务语义（`click("新建订单")` 而非坐标），SaaS 适配从 SDK 变成流程配置。三条铁律：模型凭据不进扩展、客户 Cookie 不上后端、页面状态脱敏后才回传。安全确认按四级分类（Hand-off Required → No Confirmation），CAPTCHA/付费墙/改密码是产品硬编码的不可放行项。

### Claim: 断供框架的第三层是治理层——harness 的隐藏模型调用跟 provider 走，接第三方要盘点全部模型调用而非只主模型

- **来源**：[[Codex-Desktop系列02：gpt-5.4-mini与三条暗线]]、[[Codex-Desktop系列06：ModelInfo字段手册]]
- **首次出现**：2026-09-05
- **最近更新**：2026-09-12
- **置信度**：0.85（二进制逆向 + 源码常量实锤 + 修复推断确认——"配置意图 + 404 消失"而非抓包实测；404 归因于 codex-auto-review 系"源码选择逻辑 + luna 已部署仍需 override"两条证据推出，错误信息本身不回传模型名）
- **状态**：active

> 在"端点层 × harness 层"两层判断框架之上，Codex Desktop 接 Azure 实测补出断供的层级序列：**工具层**（web_search 声明不发）→ **目录层**（catalog schema 版本锁定；退休元数据是 OpenAI 第一方生命周期、与第三方 deployment 现实脱节——`retirement_at` 源码注释为 Informational，CLI 不执行退休，自动迁移是 UI 层行为）→ **治理层**（本条核心）：审批（Approve for me）是**第二条隐藏的模型调用链**，同样打到你配置的 provider。默认审批模型名以常量写死在源码（provider.rs:131-133）：ChatGPT 登录态取 `codex-auto-review`（Codex 内部合成名，任何第三方端点必然无同名 deployment → 404）、API key 认证态取 `gpt-5.6-luna`；修复是条目级 `auto_review_model_override` 指向真实存在的 deployment（存在即整体替换默认值，guardian/review.rs:897-898）。治理层断供最阴险处在错误归因困难：主模型正常、404 出现在审批环节、报错不说明发起方。且治理层实为**四件套**（审批模型 / guardian_v2 安全分类器 / confirmation_policies 确认政策 / collaboration_modes），全部是模型条目字段——每个环节都可能发起模型调用或依赖模型名，都是潜在断点（confirmation_policies 源码原文同时印证了系列四的四级确认分类）。配套验证纪律：三种权限模式对应三种运行态，只有 Approve for me（`approvals_reviewer: auto_review`）才真正走审批模型——Full access 下写文件成功不能作为审批链路修复的证据。

### Claim: Computer Use 的分发链——分发态在 App bundle、运行态 reconcile 到用户目录；feature flag ≠ payload、签名/权限/进程树疑似紧耦合（推测）

- **来源**：[[Codex-Desktop系列04：Computer-Use藏身之处]]、[[Codex-Desktop系列03：bundled的真正含义]]
- **首次出现**：2026-09-05
- **最近更新**：2026-09-12
- **置信度**：0.75（①② 本机路径验证 + 公开 issue 佐证；③ 为推测未直接验证——2026-09-12 按系列04 事实性修订软化）
- **状态**：active

> 系列六"runtime 不对等"的物理答案：Computer Use 不在 CLI 二进制里，而在 App bundle 携带的 plugin payload 里——`Resources/plugins/openai-bundled/plugins/computer-use/`（plugin.json + .mcp.json + skills + SkyComputerUseClient.app），`.mcp.json` 把 MCP server 的 command 指向 bundle 内的 native helper；Codex 启动时经 bundled plugin marketplace reconciliation 把 payload 安装到 `~/.codex/plugins/cache/`——"Computer Use 在哪"有两个答案：**分发态在 App bundle，运行态在用户目录**。边界证据分两档：① payload 随 CPU 架构走——Intel x64 构建根本不带这套文件，而 `codex features list` 仍显示 `computer_use stable true`（**feature flag ≠ payload**）；② bundled CLI 手动补挂 plugin 后也能获得能力——载体是 plugin payload 而非 App 本身；③（**推测，未直接验证**）SkyComputerUseClient 从 Codex.app 进程树之外启动可能因 code signature / launch context 失败——三个引用 issue 均未直接描述该故障模式、本机也无对照测试，推测与 macOS TCC 的 responsible-process 归因链有关：App Bundle + native helper + 签名 + TCC 权限 + 进程树**可能是紧密耦合的，但不是"不可拆整体"的定论**；这个方向若成立，可解释 standalone 与 bundled CLI 版本号相同能力也不同（"同源不同发行版"在能力层的表现）。另注：整条配置层调用链（CLI → plugin → MCP → SkyComputerUseClient → macOS Accessibility）目前的证据全是文件位置与 `.mcp.json` 指向，尚无一次真实触发的运行时观测（进程树、日志时间线）坐实每一跳。这是第一方绑定在**分发层**的形态：能力扩展做成 bundle 内 payload，随第一方 App 分发而不随开源 CLI 分发。

### Claim: DCC 域实证——Computer Use 适合做"眼睛"不适合做"手"，批量制作交给应用 API

- **来源**：[[Blender系列02：操作入口与官方MCP安装]]、[[Blender系列03：虎式坦克实战]]
- **首次出现**：2026-09-07
- **最近更新**：2026-09-12
- **置信度**：0.75（实测三故障 + 后台路径独立验证）
- **状态**：active

> Blender 实战给"UI 层天然残缺"补上桌面 DCC 域的实测注脚。三入口分工：**bpy Python API** 做批量建模/改参数/设关键帧/渲染（一次脚本执行完成大量重复操作），**Computer Use** 只做"眼睛"（查看窗口实际状态、打开文件），**MCP** 把 API 路径接到"正在打开的场景"（保留选中对象与编辑状态）。Computer Use 窗口操作实测接连三故障：`noWindowsAvailable`（-10005）、用户粘贴操作冲突、dmg 安装镜像未推出导致两处应用共享同一 bundle identifier（`org.blenderfoundation.blender`）而窗口定位歧义——改完整应用路径可读状态但并非全部操作恢复。关键的归因纪律：**故障只影响桌面界面操作，后台脚本生成与渲染独立验证成功，不能从 UI 故障推断模型生成失败**。UI 不可靠时切数据层/API 层的补位实例：扩展安装绕过 GUI，走 Blender 后台接口 `bpy.ops.extensions.package_install_files` 完成。GUI 操作易受窗口焦点、用户并发操作、安装状态干扰——与浏览器域"能点不等于应该点"、"DOM 虚拟化真解在数据层"同构。

### Claim: structured output 的收益模型在物理控制域翻转——格式合法性收益不成立、物理合法性才是诉求；FAST 修正：离散可行但代价在推理侧；同一权衡三次跨尺度重现

- **来源**：[[VLA系列01：输出架构演进]]、[[VLA系列04：π0、FAST与Hi-Robot]]、[[空间智能系列03：3D内容生产的两条路线]]、[[空间智能系列04：神经3D生成的开源版图]]
- **首次出现**：2026-09-17
- **最近更新**：2026-09-25
- **置信度**：0.7
- **状态**：active

> Computer use 的 structured output + 确定性执行器组合，其收益前提（离散决策、答案唯一、可重试、像素级容错）在机器人控制域全部翻转：连续高频控制信号本身就是执行、多峰分布、毫米级偏差即失败、不可撤销——离散化在精度/延迟/多峰分布/维度耦合四处冲突，物理合法性才是真诉求。FAST（2026-09-21 续证）修正论断强度：瓶颈在分词而非离散本身——DCT+BPE 频域压缩后自回归精度与流匹配相当、训练快 5 倍，但推理慢 7 倍：**离散/连续是分工不是替代，离散可行但代价在推理侧**。同一对权衡的跨尺度重现：① 动作输出（token vs 扩散头）；② 3D 内容生产（Astra+Blender 离散符号+确定性执行 vs 神经 3D 连续分布一次前向——"更高层放大版"）；③ 工程资产边界（TRELLIS.2 自认不编码部件级语义，可参数化编辑仍归 Agent+传统工具）——第三次重现划出神经生成路线的当前边界。

### Claim: 单变量受控对照：同一执行器只换判断模型，DOM 型网页任务判断延迟约为 LLM 的 1/8、任务耗时 −58~66%、公开价费用 −90~96%、成功率同为 4/4——但探索轮曾因三处口径不一致得出相反结论

- **来源**：[[Computer-Use与Browser-Use系列八：Jev与Codex实践]]
- **首次出现**：2026-09-27
- **最近更新**：2026-09-28
- **置信度**：0.75
- **状态**：active

> 口径三坑：计时边界（Jev 总时间含关闭临时 Chrome 与守护进程退出约 15.7 s，系统侧只计到验收）、writer 条件（会话内 medium vs 独立 low）、执行链路（Codex 内置浏览器 vs Chrome，观察方式不同）。修正后两组共用同一本地合成页 1280×720、同一 DOM 观察器与编号规则、同一 Azure gpt-6-astra/medium writer 逐字一致请求、同一系统 Browser 接口 20 步/120 s、逐字段验收，唯一变量是下一步动作由 Astra 还是 jev-1.13.0 判断。8 次正式样本：B1 17.76→6.10 s、B2 23.71→9.84 s，判断 14.62→1.79 s，轨迹完全一致（五步/六步）。费用按模型归属：Jev 组 token 总数约为 Astra 组 1.9 倍（B1 10,495 vs 5,567）但 Jev 输入 $0.042/M 输出免费，费用几乎全部来自 writer 的 Astra 调用——token 多不等于贵，跨模型合计不能套单一价格。Jev 组 6 秒分解：判断 29% / writer 生成用户已给定字面值 45%（最大可优化项）/ 编排 26%。边界：两类简单页面、每组 4 次，无相似选项/动态加载/错误恢复/canvas/iframe/真实站点；不是完整产品对照（Codex 原生一轮批量规划 vs 本实验逐步循环）。

### Claim: Jev skill 是"条件默认"不是"优先选择"——DOM 可观察/目标明确/有程序化验收/动作可逆的网页任务默认 jev-browser；纯视觉、跨 App、有 stakes 动作与用户点名各有归口；桌面 Computer Use 尚无有效数据

- **来源**：[[Computer-Use与Browser-Use系列八：Jev与Codex实践]]
- **首次出现**：2026-09-27
- **最近更新**：2026-09-28
- **置信度**：0.75
- **状态**：active

> 三层分清：API（`POST /v1/systemone`，不接受截图，不能替换 Codex 通用模型）/ skill 指导（官方 `typesafe-ai` skill 装了不等于每步 UI 决策都经过 Jev）/ UI 执行器（`browser-use/jev-ultrafast` 读 DOM 一次选动作与目标；`awlevin/typesafe-computer-use` OCR + 辅助功能树；skill 名字本身不提供互斥，执行器才需要锁）。"事后询问"（Codex 已决定再让 Jev 判一次）纯增加请求只会更慢，"接管循环"才是提速来源。两个新 skill `jev-browser` / `jev-desktop`：允许自动选择、执行前告知、低置信度交回、`receipt.json`/`result.json` + 独立 `verified_success`（不直接接受模型 DONE）；任务文件只放目标与验收不放凭据；互斥分层——两 Jev 入口全机锁（程序强制）/ 与系统工具 `native-begin`/`native-end` 预约（协作式）/ OS 级不存在不能宣称。路由规则：网页纯视觉/canvas/iframe/跨站点长流程→系统 Browser（Jev 不看截图、跨 origin 停止交回）；macOS 应用→系统 Computer Use（jev-desktop 待 Accessibility 权限修复后重测）；付款/删除/不可撤销提交→任一执行器都走人工确认（错误成本主导与判断模型无关，见 [[cost-per-task]]）；用户点名最高优先级。桌面无成绩原因：系统侧 ScreenCaptureKit -3811 两次、Jev Desktop 缺 Accessibility 权限（22.4 s 是启动失败耗时非成绩），未改权限未重启掩盖。confidence 不是正确率，`min_confidence: 0.4` 未用结果标签校准（[[confidence-calibration]]）。升级为优先选择还差四个实验：桌面复测、难任务集、三臂对照加 Codex 原生批量规划、writer 优化两组同步。

### Claim: 三条执行路径没有固定的速度与 token 排名——总耗时常由模型判断与循环轮次主导，token 由观察策略而非接入方式决定；"Chrome 扩展更省"、"Computer Use 最费"都不能预设

- **来源**：[[Computer-Use与Browser-Use系列九：三条执行路径对比]]
- **首次出现**：2026-10-13
- **最近更新**：2026-10-13
- **置信度**：0.65
- **状态**：active

> 比较对象是原生桌面 Computer Use、独立/内置浏览器 Browser Use、Chrome 扩展 Browser Use 三条路径。**性能**：总耗时 = 初始化与认证 + 页面加载 + 各轮（观察 + 模型判断 + 动作执行 + 等待验收）+ 清理；结构化网页一次拿到多个控件、减少轮次，桌面路径可能多出窗口定位与焦点管理，扩展多一个连接认证环节但可省登录准备——但同样精简的状态、同一模型与动作策略下不能预设排名；系列八只换判断模型就让耗时降 58~66%，说明判断环节常是主导项（那是判断模型对照，不是路径对照）。**Token**：成本来自工具说明、历史上下文、状态观察、输出与推理 usage；每步整张截图、每步完整 DOM/AX 树都贵，局部读取、差量观察与句柄复用、导出文件按需读取才省——精简 AX 的桌面操作可能比反复读巨大 DOM 更省。**测量纪律**："通常高效"是工程趋势不是测量；字符数不是 token；token 总数不能代替任务成本（系列八 Jev 组 token 约 1.9 倍但费用更低）；要排名须同模型、同任务、同初始状态与视口、同验收，把冷启动/执行/验收/清理分别计时并记录成功率、重试、观察次数、截图与 DOM 大小、usage 与前台占用时长；启动失败不能当性能成绩。**屏幕占用**拆三问：前台要求、显示器占用、全局输入占用——后台可操作不等于零屏幕占用或同页并发安全，结构读成功也不能代替截图或连续录屏成功。证据边界：未做三条路径同条件基准测试，属工程判断 + 历史实验引用。

### Claim: 账号身份与 model provider 要分开配置——Chrome Browser Use 访问远程网址前有一次以 ChatGPT 身份发起的站点预检，纯 API key / custom provider 模式下会在页面加载前失败；登录 ChatGPT 账号（Free 档即可）并保留 Azure OpenAI provider 后实测恢复

- **来源**：[[Computer-Use与Browser-Use系列九：三条执行路径对比]]
- **首次出现**：2026-10-13
- **最近更新**：2026-10-13
- **置信度**：0.65
- **状态**：active

> 官方仓库的一份用户报告指出，Chrome Browser Use 访问远程网址前会以 ChatGPT 身份请求一次 `site_status` 预检判断站点是否允许访问；Codex Desktop 处于 API key / custom provider 模式时拿不到可用 token，在首个浏览器操作（如命名会话）就报 `Codex auth token is unavailable`。本例处理：在 Desktop 登录 ChatGPT 账号（Free 档），provider 保持 Azure OpenAI，重启后账号菜单同时显示账号、Free 档与 Azure OpenAI；随后命名会话、列标签页、接管用户页读标题与 URL、提取渲染文本、导航 example.com 全部成功。职责三分：站点预检用 ChatGPT 账号、模型推理与计费用 Azure OpenAI、目标网站登录态用 Chrome Profile 的 Cookie/SSO。这是"断供框架治理层"（隐藏调用跟 provider 走）的同族现象：**harness 里还有不走模型 provider 的隐藏身份依赖**，接第三方 provider 时要盘点的不只是模型调用，还有身份调用。证据边界：未隔离具体生效的改动、未抓取身份检查与预检网络链路、未独立核验模型请求目的地，不宜推广为所有 custom provider 环境的通用修复；Windows 侧另有用户报告的不同处理方式。

## 冲突与演进

- 2026-08-30：建页。系列一~七 + Orca 使用笔记二共 8 篇（2026-08-29~30 成文）提供完整素材；browser-use 不单独建页（包含关系即本页第一条 Claim）；action-loop、semantic-first-coordinate-fallback 按"避免同批次碎片化"作页内 Claims 收入。
- 2026-09-04：注入系列七 08-30/08-31 三波修订的两条新 Claim——两层判断框架（端点层×harness 层，Codex+Azure 断供解剖 + Scout 镜像）与五条执行位置判定指纹（三模型对照实验）。"执行位置决定能力归属"从单层判断细化为两层判断。
- 2026-09-06：注入 Codex Desktop 系列02/03/04/06 两条新 Claim——治理层断供（审批链路是第二条隐藏模型调用链，断供框架从两层扩展为工具层/目录层/治理层序列，源码常量实锤 + 实测修复闭环）与分发链解剖（分发态 App bundle / 运行态用户目录、feature flag ≠ payload、签名权限进程树不可拆整体）。confirmation_policies 源码原文为"四级确认分类"Claim（系列四）提供第一方源码印证。
- 2026-09-12：按 Codex 系列事实性评审修订（09-07，commit 5768895）更正两处——分发链 Claim 的"签名/TCC/进程树不可拆整体"软化为"疑似紧耦合（推测，未直接验证）"并降置信度 0.8→0.75；治理层 Claim 补证据边界（修复为推断确认非抓包、404 归因为两证据推理）。同日注入 Blender DCC 域实证 Claim（三入口分工、Computer Use 三故障、"眼睛不做手"）。
- 2026-09-28：注入系列八两条 Claim——首次把"下一步做什么"的判断从通用 LLM 换成 typed 决策模型做单变量受控对照，并给出 Jev skill 的条件默认路由规则；系列五场景路由表因此新增"判断模型"这一维。方法层归口 [[decision-policy-executor-split]]。
- 2026-10-14：系列一 10-13 重写澄清包含关系的口径——首条 Claim 一度被误判为"撤回包含关系"而标 outdated，经用户纠正恢复 active（0.8）：重写否定的是"Chrome integration 作中间层"的三层树和"从产品设置推技术层级"，广义 Computer Use ⊃ Browser Use 仍成立；狭义原生桌面 Computer Use 与 Browser Use 并列。新增"正交维度"Claim 作补充；摘要同步改写。同日注入系列九两条 Claim：三条执行路径无固定性能/token 排名（测量纪律）与账号身份/model provider 分开（Browser Use 站点预检依赖 ChatGPT 身份，"认证三链路相互独立"修正为"用途不同、实现可能耦合"）。

## 关联概念

- [[agent-loop-architecture]] — `extends` action loop 是 agent loop 在 GUI 操作域的实例化：同一循环范式，观察对象换成屏幕状态、动作换成 UI 事件
- [[model-harness-codesign]] — `grounds` CLI 无原生 Computer Use 的产品边界推断与服务端工具全家桶现象，为第一方绑定路线提供实证
- [[skill-runtime]] — `grounds` "Skill 可见但 runtime 缺失"是 skill 声明与执行环境分离的又一实证（与 scripts 断层同构）
- [[harness-portability-spectrum]] — `grounds` Skill 跨 CLI/App 可发现但 runtime 不可移植，是可移植性分层的第 3 处独立论证
- [[system-one-model]] — `uses` action loop 里"选下一步动作"这一判断可交给 typed 决策模型（DOM 元素编号表 → Choice），执行与验收仍在执行器

## 来源日记

- [[2026-08-29-周六]] — 系列一~六成文 + Orca 补位实测（网易云音乐）
- [[2026-08-30-周日]] — 系列七成文（web search 分界）+ 社区补位生态调研（open-computer-use / cua / UI-TARS）
- [[Codex-Desktop系列02：gpt-5.4-mini与三条暗线]] — 审批链路 404 排查与 override 修复实测、三种权限模式验证纪律
- [[Codex-Desktop系列04：Computer-Use藏身之处]] — 分发链解剖：plugin payload 路径、reconciliation 机制、三个边界证据
- [[Codex-Desktop系列06：ModelInfo字段手册]] — 审批模型常量与 override 代码路径、治理四件套字段、retirement_at Informational
- [[Blender系列02：操作入口与官方MCP安装]] — 三入口分工表、Computer Use 三故障实录
- [[Blender系列03：虎式坦克实战]] — "眼睛不做手"结论的来源实操
- [[Computer-Use与Browser-Use系列一：概念与产品形态]] — 2026-10-13 重写：产品栏目/操作能力/接入方式三维度、headless 与 Profile 独立、撤回包含关系
- [[Computer-Use与Browser-Use系列九：三条执行路径对比]] — 六维度拆分、三路径多维对比、性能与 token 测量纪律、屏幕占用三问、认证与 provider 分开的实测
- [[Computer-Use与Browser-Use系列八：Jev与Codex实践]] — API/skill/执行器三层、两种接法、两 skill 与分层互斥、口径修正与单变量实验、结果表与 6 秒分解、桌面阻塞、条件默认结论与四个实验
