---
title: Computer Use与Browser Use系列七：Web Search与浏览器操作的分界——信息获取三级梯、执行位置与成本转移
created: 2026-08-30
tags:
  - AI
  - Agent
  - Computer-Use
  - Browser-Use
  - Web-Search
  - Codex
  - Claude-Code
  - Copilot
  - Tavily
---

# Computer Use与Browser Use系列七：Web Search与浏览器操作的分界——信息获取三级梯、执行位置与成本转移

> 系列导航：[系列一：概念与产品形态](Computer%20Use与Browser%20Use系列一：概念与产品形态——从包含关系到四种浏览器形态与认证三链路.md) ｜ [系列二：Codex 浏览器运行时解剖](Computer%20Use与Browser%20Use系列二：Codex浏览器运行时解剖——从bundled%20plugin看Agent浏览器控制的工程设计.md) ｜ [系列三：自己实现](Computer%20Use与Browser%20Use系列三：自己实现——action%20loop协议、双执行器路线与跨平台adapter矩阵.md) ｜ [系列四：产品化](Computer%20Use与Browser%20Use系列四：产品化——可审计智能RPA、Extension-Plugin-WebMCP三层选型与安全设计.md) ｜ [系列五：最佳实践](Computer%20Use与Browser%20Use系列五：最佳实践与日常使用习惯——场景路由表、内容获取链路与实战经验.md) ｜ [系列六：CLI 与 App 的能力分界](Computer%20Use与Browser%20Use系列六：Codex%20CLI与App的能力分界——同一套Skill、两条调用链与第三方生态补位.md) ｜ 本篇

## 引言：一个朴素的疑问

前六篇的主线是 GUI 操作能力——Computer Use 操作桌面、Browser Use 操作浏览器。本篇处理一个看似不相关、实则同构的问题，起点是一个日常使用中的朴素疑问：

> 为什么 Codex App、Claude.ai、GitHub Copilot 这些产品都能"自行搜索"，而我的 Claude Code 却要绑定 Tavily 或 WebIQ 才能做 web search？

追这个问题的过程中发现了两件事：其一，**web search 和 browser use 根本不在同一棵能力树上**——前者作用于互联网的数据层，后者作用于 UI 层，很多场景下的工具选择困惑来自把它们当成了同一能力的强弱版本；其二，"谁能自带搜索"的答案与系列六"CLI 为什么没有原生 Computer Use"是**同一个结构**——工具声明处处可见，执行 runtime 决定能力归属。这是这个论点的第三个实例。

## 一、本质区别：调 API vs 开浏览器

**Web search 是一次无状态的 API 调用。** 发一个查询字符串，搜索后端（Bing、Tavily、Exa……）在**预先爬好并建好索引**的数据里检索，返回结构化结果：标题、URL、摘要片段。整个过程没有浏览器、没有页面渲染、没有 JS 执行、没有登录态。它回答的问题是——**"互联网上哪里有关于 X 的信息？"**

**Browser use 是驱动一个真实浏览器实例。** 起一个浏览器（或接管已有的 Chrome），加载页面、执行 JS、渲染 DOM，然后观察（截图 / DOM snapshot / Accessibility Tree）并操作（点击、输入、滚动、提交）。它回答的问题是——**"这个具体页面上有什么？我能在上面做什么？"**

一个类比：web search 像打电话问图书馆管理员"有哪些关于 X 的书"，拿到的是书目卡片；browser use 像亲自走进图书馆，翻开那本书读，还能在借书单上签字。

五个维度的系统对照：

| 维度 | Web Search | Browser Use |
|---|---|---|
| 作用层 | 数据层（搜索索引） | UI 层（渲染后的活页面） |
| 状态 | 无状态，一问一答 | 有状态：会话、cookie、登录态、tab 生命周期 |
| 能力方向 | 只读，且读的是摘要/片段 | 读全文 + **写操作**（填表、提交、下单） |
| 内容新鲜度 | 受限于爬虫索引周期，抓不到登录墙/JS 渲染后内容 | 所见即所得——页面此刻长什么样就拿到什么 |
| 成本/延迟 | 便宜、快（一次 HTTP 调用） | 贵、慢（浏览器进程 + 多轮观察-操作循环 + 截图 token） |

## 二、信息获取三级梯

![信息获取三级梯与执行位置分界|700](../../../../asset/websearch-browseruse-ladder-2026-08-30.svg)

Search 和 browser use 之间还有一个常被混淆的第三者——**web fetch**（Claude Code 的 `WebFetch`、Tavily 的 `extract`）：给定已知 URL，抓取该页内容。它比 search 深一层（拿全文而非摘要），但比 browser use 浅一层（无登录态、通常不执行 JS、不能交互）。三者构成一个梯子：

```text
① Web Search   →  发现：哪里有信息（返回 URL + 摘要）
② Web Fetch    →  获取：这个 URL 的内容（公开、静态可达的部分）
③ Browser Use  →  到场：登录态、JS 渲染、交互操作、页面状态
```

遇到任务时的四问决策链：

1. **我知道信息在哪吗？** 不知道 → **web search**（发现阶段永远是它）
2. **知道 URL 了，页面公开且静态可达吗？** 是 → **web fetch**（最便宜的全文获取）
3. **需要登录态 / JS 渲染 / 页面此刻的状态吗？** 是 → **browser use**
4. **需要在页面上"做事"（点击、填表、提交）吗？** 是 → 只有 **browser use** 能做，前两级都是只读的

对应到本 vault 的日常配置：Tavily（search + extract 覆盖第 1、2 问）→ Playwright / Orca 内嵌 Browser / Codex `@Chrome`（覆盖第 3、4 问）。vault 的 URL 路由硬规则（认证站点直接上 Playwright、禁止先试 WebFetch）本质上就是"第 3 问答案已知为是时，跳过第 2 级"的路由捷径。

一个容易踩的认知坑值得单独点出：**browser use 并不总是"更强的 web search"**。它拿到的是 UI 层的活 DOM——这正是系列五 DOM 虚拟化教训的根源：UI 层天然是残缺的（只渲染视口附近），而 search / fetch 走的数据层反而天然是全的。所以"用更强的工具"不等于"拿到更全的内容"，**层选对了才是对的**。

## 三、"自带搜索"的真相：执行位置决定一切

### 3.1 Web search 是服务端工具，harness 只发声明

Claude Code 的 `WebSearch` 工具本身**不含任何搜索引擎**。它做的事只是在 API 请求里声明一个服务端工具类型（`web_search`），真正的搜索——查询、索引、排序——全部发生在 **Anthropic 的 API 服务端**。请求到达官方 API 时，服务端看到工具声明就执行搜索并把结果塞回响应；harness 只是转发声明的 wrapper。Codex CLI 的搜索同理（OpenAI Responses API 的 `web_search` 工具），Copilot 的 `@github #web` 同理（GitHub 服务端调 Bing）。

这和系列六的核心命题是同构的：**工具声明（Skill / tool schema）可以到处存在，但执行 runtime 决定它是否真的能用。** `WebSearch` 的"手脚"长在模型厂商服务端，不长在本地。

### 3.2 换掉模型后端，搜索执行器就消失了

当 Claude Code 的请求不走官方 API、而走 Bedrock / Vertex / Databricks 这类代理端点时，代理只做模型推理转发——请求里的 `web_search` 声明**没有人执行**。官方可用性矩阵印证了这个形状：

| 提供方 | 服务端 web search |
|---|---|
| Anthropic 官方 API | ✅ 完整支持（含动态过滤版本） |
| Amazon Bedrock | ❌ 不支持 |
| Google Vertex AI | 仅基础版（且 Claude Code 曾有集成 bug：Vertex 加了工具但 Claude Code 看不到） |
| Microsoft Foundry | Beta |
| 各类代理（Databricks、LiteLLM、OpenRouter） | ❌ 除非代理自己实现拦截 |

所以差异不在"App vs CLI"，而在**请求最终落在谁的服务端**。第一方产品（Claude.ai、Codex、Copilot）的用户从来不会遇到这个问题——不是因为架构更好，而是它们**根本不允许把模型请求指到别家端点**，链路永远是通的。用 Claude Code 换 base URL 是行使了第一方产品用户没有的自由，代价就是服务端工具全家桶（搜索、code execution 等）随之断供。

### 3.3 Codex + Azure OpenAI：断供点上移到 harness 层

把 Codex CLI 的 `model_provider` 指向 Azure OpenAI（比如 gpt-5.6-sol 部署）时，内置 web search 同样失效——但断供的位置与 Claude Code 换 Bedrock/Databricks **不在同一层**，值得单独解剖：

- **端点层其实已经通了（阉割版）**：Azure OpenAI 的 Responses API 现在有服务端 `web_search` 工具（GA，不再只有 `web_search_preview`），但官方文档明确写着 "Live internet access isn't supported"——`external_web_access` 恒为 `false`，搜的是预建索引而非实时网页；按 tool call 单独计费，且可以在订阅级用 Azure CLI 整体禁用
- **harness 层拒发声明**：Codex 的内置搜索是 OpenAI Responses 的 hosted tool，而 Codex **只在请求发往默认 OpenAI provider 时才附加这个工具声明**。一旦 `model_provider` 是自定义的（Azure、网关、vLLM），Codex 干脆不往请求里塞 `web_search`（openai/codex#3851）——`--search` / `web_search = "live"` 配了也无物可执行，哪怕端点侧其实长着执行器
- **还有兼容性摩擦**：gpt-5.6-sol 等部署下，Codex 会往请求里发 Azure 不认的内部 header 与 `additional_tools` 命名空间，请求直接被拒（openai/codex#31875），需要本地代理剥离才能跑通

所以判断"有没有 web search"要在**两层分别问**：端点层——请求落点的服务端有没有搜索执行器；harness 层——客户端愿不愿意为这个 provider 发工具声明。Claude Code + Databricks 是"端点无执行器"，Codex + Azure 是"端点有（阉割版）执行器、harness 拒发声明"——断供点上移了一层，结果殊途同归。补位路线也与 Claude Code 完全一致：在 `~/.codex/config.toml` 里配 MCP 搜索工具（Tavily / WebIQ / Exa，客户端执行、自付账单），或 browser use 反向补位（见第四节）。一个 TOML 实操坑顺带记下：顶层 `web_search` 键必须写在所有 `[section]` 头之前，否则它会静默绑定到前面的 table（变成 `model_providers.xxx.web_search`）而完全不生效。

这个论断有一次现场实锤。在 Codex **App**（ChatGPT 桌面版，非 CLI）里把 provider 配成 Azure OpenAI（gpt-5.6-sol）后问股价，模型自己说出了判决词——"**当前这次会话没有向我暴露 `web_search` 工具**"：harness 检测到自定义 provider 后没把搜索放进工具清单，模型视角里这个工具根本不存在。连第一方 App 形态也一样断供，再次印证**能力归属跟请求落点（provider）走、不跟产品形态走**。这次实验还暴露了断供最隐蔽的代价：第一轮模型没查、凭训练知识直接作答（随后自己承认"刚才是我没有实际查询"）——工具缺失时模型可能带着过期数据一本正经，用户若不追问根本发现不了。而它被追问后的补位方式也在意料之外——见 3.6 的第四条路线。

### 3.4 Copilot 的多层演示：同一个产品里的四种搜索挂载点

GitHub Copilot（VS Code 里的 Copilot 就是它）把"搜索能力可以挂在哪一层"演示得比谁都全。先消一个歧：下文的 "Web Search for Copilot" 是 VS Code Marketplace 上一个**可选扩展的专有名称**，不是泛指 Copilot 的搜索能力——命名撞车是这里最容易迷路的地方。

- **`@github #web`**（应用层挂载，第一方闭环）：GitHub 服务端执行、Bing 做后端。开关位置很说明问题——它不在 VS Code 本地设置里，而在 **GitHub 账号的服务端配置**里（Settings → Copilot → "Copilot access to Bing"），因为执行器在服务端，本地根本没有可开关的东西。但注意挂载点：Bing 执行器钉死在 `@github` 这个 chat participant 的**服务端应用管道**上，只有消息显式走这个入口才有搜索——Copilot 的模型推理 API 本身是"裸"的，agent 模式的本地工具循环够不着这个执行器
- **"Web Search for Copilot" 官方扩展**（客户端工具层）：补的正是上一条的裂缝——agent 模式的本地工具清单里没有搜索。微软自己出品，却**由 Tavily 驱动、要求用户自带 API key**。连自家有 Bing 的微软，在给 agent 工具层补搜索时，走的也是"客户端工具 + 用户自付账单"的路线——与在 Claude Code 里配 Tavily MCP 一模一样
- **Model-native web search**（推理层挂载，2026-02 起）：GitHub 宣布对部分模型（GPT-5.x 系）启用**模型原生搜索**——Copilot 服务端调模型推理时直接附加模型厂商自家的 hosted `web_search`，"其余模型继续用 Bing search"。搜索执行器从应用层下移到推理层，agent 循环从此天然继承搜索，客户端补位扩展的历史使命随之收窄（只剩不支持 hosted search 的模型还需要它）
- **Azure "Grounding with Bing Search"**（另一条产品线，第三种计费形态）：Azure AI Foundry Agent Service 的工具资源——**执行在服务端，账单在用户侧**（自己 provision 资源、按调用付 Azure 账单），介于"订阅打包"（`#web`）与"客户端自带 key"（Tavily 扩展）之间

四种形态放在一起，挂载点规律浮出来：**挂在推理 API 上，能力随模型走、所有调用场景继承；挂在上层应用入口上，能力只随那个入口走**——挂载点越靠上层覆盖面越窄，同一产品内部就越容易出现"这里有、那里没有"的裂缝。`#web`（应用层）→ Tavily 扩展（客户端补裂缝）→ model-native（推理层）这条时间线，就是挂载点一路下移、覆盖面逐步扩大的过程。

顺带消歧 **WebIQ**：2026-06 微软发布的 Web IQ 是建立在 Bing 索引之上、面向**外部 AI 系统**的 grounding API 套件（Bing Search API v7 于 2025-08 退役后的 agent 时代继任者，返回 passage 而非整页）。它是对外零售产品——在 Claude Code 里配的 WebIQ MCP 就是它的消费侧，走的正是"客户端 MCP 补位"路线；与 Copilot 内部的 Bing 管道是两回事，没有公开证据表明 `#web` 换用了它。

这坐实了一个商业逻辑：搜索有真实成本，第一方订阅把它打包进价格；一旦进入"模型后端可替换 / 开放工具层"的世界，平台方没有理由垫付开放式搜索的钱，成本就回到用户头上。

### 3.5 现场对照实验：换三个模型，管道不变、行为在变

挂载点规律可以在 VS Code 里直接做实验验证。同一个 VS Code、同一套本地工具、同一个问题（"微软今天的股价是多少？"），只换模型下拉框，跑了三次：

- **GPT-5.6 Sol**：2 步完成、全程无权限弹窗。Agent Debug Logs 里搜索步骤的 Output 是一套富 schema——`annotations[].url_citation` 把引用**锚定到回答正文的字符区间**（start_index/end_index）、`bing_searches` 字段原样吐出实际执行的 Bing 查询 URL（顺带暴露了管道把中文问题改写成了英文检索式）、正文带 `【3:0†source】` 内部占位符。搜索+阅读+成文+引用锚定在服务端一次完成，交回本地的是**成品**
- **Gemini 3.7 Flash**：Output schema 与 GPT-5.6 Sol **完全一致**（同样的 `url_citation` 锚点、`bing_searches`、`【3:5†source】`），同样静默完成、直接成文
- **Grok 4.6**：搜索同样静默完成，但模型思考日志写着"正在核对最新报价来源"——它**不满足于搜索成品，自发沿三级梯下探一级**：调用**本地 fetch 工具**抓 Yahoo Finance 原始页面交叉验证，此时 Manual permissions 模式弹出 "Fetch URL?" 要用户确认

Gemini 这个数据点起到了证伪作用——它修正了一个想当然的推断。第一次只看 GPT-5.6 Sol 时，很容易把那套 `url_citation` schema 认成"OpenAI hosted `web_search` 的厂牌指纹"（格式确实是 OpenAI Responses 风格）；但 Google 模型吐出了一模一样的格式，而 Google 自家 grounding 的格式完全是另一套（`groundingMetadata`/`groundingChunks`），且 `bing_searches` 并非 OpenAI 公开 API 的字段。唯一自洽的解释：**这套 schema 是 Copilot 服务端统一搜索管道的指纹，不是某家模型厂商的**——Copilot 的模型 API 本来就把所有厂商的模型归一化成 OpenAI 兼容格式对外，搜索管道同样是统一的、与模型无关的一层（GitHub changelog 的 model-native search 目前落在 github.com chat 链路，VS Code agent 链路从日志看走统一管道）。

```text
三个模型共用:  [Copilot 服务端统一管道: Bing 搜索+成文+引用锚定] → [本地: 登记引用到 UI]
Grok 独有的加一步:                                    ↘ [本地: fetch Yahoo 交叉验证（弹权限）]
```

于是真正的差异变量水落石出：**不是搜索挂载点（三次都一样），而是模型行为**——GPT-5.6 Sol 和 Gemini 信任搜索成品直接成文，Grok 选择对时效敏感数据做二次核验，于是三级梯的第二级（fetch）被它主动触发，本地权限系统随之现身。这本身是个有价值的观察：**管道决定能力的下限，模型性格决定实际走几级梯**。

实验同时沉淀出**判定"这个 search 是谁提供的"的五条指纹**——以及一条元教训：

1. **工具名前缀**：内置步骤名（无前缀）→ 服务端；扩展工具名（`#websearch`）→ 扩展；`mcp_` 前缀 → MCP
2. **Output schema**：鉴别的是**哪条管道格式化了结果**，不能直接等同于哪家厂商执行了搜索——`url_citation` + `bing_searches` → Copilot 统一管道（OpenAI Responses 风格）；`server_tool_use` + `web_search_tool_result` → Anthropic hosted；`groundingMetadata` → Google 原生；`score` + `raw_content` → Tavily
3. **客户端有无对应物**：没装扩展、没配 MCP 还能搜 → 只可能在服务端
4. **换模型对照**：搜索 schema 随模型变 → 挂在模型上；不变 → 挂在 harness/管道层。本实验里三个模型 schema 全同，正是"统一管道"的判据
5. **权限弹窗位置**：弹本地权限 → 客户端执行；静默完成 → 服务端执行。权限系统只能管到执行器在用户机器上的工具——这条是执行位置最硬的指纹

元教训：**单一指纹会误判**（只看 schema 曾把统一管道误认成 OpenAI hosted），要多条交叉——尤其"换模型对照"这条控制变量实验，一次就把管道层和模型层分离出来了。

实验还暴露了一个值得单独回答的问题：**为什么 Copilot 把搜索放服务端做，却把 fetch 留在本地？**技术上服务端 fetch 完全可行（OpenAI hosted 管道里的 `open_page` / `find_in_page` 就是服务端 fetch，第一方模型厂商在自己沙箱化的浏览基础设施里做掉了），Copilot 不做是三个刻意取舍：

- **下游可控性**：搜索放服务端的正面动机是**统一控制 Bing 的使用**——查询量、配额、计费都收拢在平台与 Bing 的一纸合同里，端点唯一、成本与滥用面有界；fetch 的下游是任意 URL，无从统一控制——从微软服务器对任意地址发请求等于开放代理（SSRF、内网探测跳板、爬虫法律责任、IP 信誉），平台不愿背。Azure 版 `web_search` 把 `external_web_access` 锁死 `false` 是同一保守立场的另一表现
- **本地网络位置是正收益**：本地 fetch 能到达用户能到达的地方——内网 wiki、localhost、VPN 后的文档，开发场景的刚需；服务端 fetch 反而够不着。fetch 的本地状态依赖介于 search（无）与 browser use（重登录态）之间，天然向客户端滑
- **权限与账单归位**：本地执行才能被本地权限系统管辖（"Fetch URL?" 弹窗可批可拒），带宽与下载成本也归用户

### 3.6 补位的四条路线

与系列六 Computer Use 的补位空间完全同构，服务端搜索断供后有四条补位路线：

1. **客户端 MCP 工具**（Tavily、WebIQ、Exa）——搜索做成普通自定义工具，客户端执行、结果作为 tool result 回传。最通用，与后端提供方无关；代价是自己管 key 和账单
2. **代理层拦截**（LiteLLM `websearch_interception`）——代理检测到请求里的原生 `web_search` 声明时拦截下来自己执行（可路由到 Perplexity 等），再按 Anthropic 响应格式回填。相当于在代理层重建缺失的服务端执行器，原生 `WebSearch` 在 Bedrock/Azure/Vertex 后端也能"假装"通了。目前只覆盖 `web_search`，`web_fetch` 的同类拦截还是 open feature request。**注意这条路线的前提是声明被发出来**：它只救得了"断在端点层"的场景（harness 照发声明、落点没人执行，如 Claude Code + Bedrock）；对"断在 harness 层"的场景（Codex + 自定义 provider，见 3.3——声明根本不出门）无效，代理收到的请求里没有 `web_search`，无物可拦。断供点越靠上游，下游可补位的层就越少——客户端补位之所以最通用，正因为它在整条链路的最上游，不依赖任何下游环节配合
3. **Browser use 反向补位**——见下一节
4. **通用执行工具（shell）兜底**——coding agent 特有的路线，3.3 那次现场实验里 Codex + Azure 被追问后的实际选择：没有 `web_search`、没配 MCP、也没开浏览器，模型直接用 shell 工具跑 `curl` 请求 Nasdaq 和 Yahoo Finance 的数据 API 拿到了股价。它跳过了三级梯的第一级——"数据在哪"来自训练知识（模型本来就知道这些公开 API 的形状），直接从第二级（获取）切入，且切的是干净的数据层接口而非网页。零配置、零额外账单，但适用面窄：只覆盖"模型恰好知道有公开 API"的场景，探索式检索（不知道信息在哪）仍然无解。这条路线也解释了为什么 coding agent 的搜索断供体感比 chat 产品轻——shell 这个万能工具总能兜住一部分

值得注意的是执行位置的天然倾向：web search 本来就是远程 API，放服务端或客户端执行都可行，所以代理层能拦截补位；而 **browser use 没法在代理层补**——它最大的价值之一是复用真实浏览器的登录态，登录态在用户机器上，代理摸不到。

## 四、反向补位：用 Browser Use 开 Google，省掉搜索 API

三级梯上层的工具天然向下兼容下层的只读场景——browser use 可以直接打开 Google，把搜索引擎的结果页当成普通网页来读。Codex `@Browser` 给人"自带搜索"的体感很大程度就来自这个机制：不是调了搜索 API，而是浏览器访问了 SERP。系列五场景路由表里"公开资料检索 → 内置浏览器"这一行用的正是这条路。

**没有 API key、没有搜索账单——但钱没有消失，只是换了个计价科目。**

Browser use 走 Google 的每一步都在消耗模型 token：加载结果页 → snapshot 进上下文 → 模型判断 → 点击/翻页 → 再观察。算细账：

| | 搜索 API（Tavily 等） | Browser Use 开 Google |
|---|---|---|
| 直接费用 | API 计费（Tavily 免费档每月 1000 credits） | 零 |
| Token 消耗 | 极小——精炼的结构化结果 | 大——SERP 是广告、知识卡片、相关搜索堆出来的重型页面 |
| 延迟 | 一次 HTTP 调用，秒级 | 浏览器加载 + 多轮观察-操作循环 |
| 结果形态 | 结构化，直接可用 | 模型要从页面噪声里自己扒 |
| 风控风险 | 无（厂商与搜索引擎间是正规商业通道） | 有——频率高了撞 CAPTCHA / "unusual traffic" |

准确的说法是：**browser use 搜索省下的是搜索厂商的钱，花掉的是模型厂商的钱**。两个非成本的边界也要计入：

- **反爬风控**：extension 模式带真实浏览器指纹和登录态，比 Playwright 裸开好很多，但正如系列五所说——"不是风控豁免"。放弃标准公式（自动化价值 = 重复次数 × 单次节省 − 失败风险）里，browser use 搜 Google 的失败风险项随频率上升
- **结果质量一体两面**：SERP 能拿到 API 拿不到的东西（知识卡片、实时信息框、"用户还搜了"），但有广告噪声、个性化排序、可复现性差；搜索 API 返回数据层的干净结果，但覆盖面受制于该厂商自己的索引

### 实际路由建议

- **交互式、低频、探索性检索**（聊着天顺手查一下）→ browser use 开 Google 完全合理，尤其 Codex `@Browser` 里这就是默认姿势，省心
- **Agent 工作流里的程序化检索**（一次任务发七八个查询的调研类工作）→ 搜索 API 明显更优：快、便宜、结构化、无风控风险。这也是为什么 Tavily MCP 在 Claude Code 侧是正解，而不只是"没有原生 WebSearch 的无奈补丁"
- **需要搜索引擎 UI 层独有信息**（实时信息框、购物/地图垂类结果）→ 只有 browser use 能拿到

## 五、汇入主线：同一结构的第三例

把系列六和本篇放在一起，"执行位置决定能力归属"这个论点已经有了三个实例：

| 能力 | 声明（处处可见） | 执行 runtime（决定归属） | 断供时的补位 |
|---|---|---|---|
| Computer Use | bundled Skill 文件两端共享 | App 的 `node_repl + @oai/sky` | Orca / open-computer-use（客户端） |
| Browser Use（原生入口） | `@Browser`/`@Chrome` Skill 可见 | App 的 Browser runtime | Orca 内嵌 Browser / Playwright（客户端） |
| Web Search | `WebSearch` 工具声明 / `web_search` tool type | 模型厂商服务端执行器 | Tavily MCP（客户端）/ LiteLLM 拦截（代理层）/ browser use 开 Google（反向）/ shell `curl` 调公开 API（兜底） |

三个实例的补位形态还有一条规律：**能力越贴近用户本地状态，补位就越只能发生在客户端**。Web search 无本地状态，三层（客户端/代理层/UI 层反向）都能补；browser use 依赖本地登录态，只能客户端补；computer use 依赖本地桌面和系统权限，同样只能客户端补，且要过 macOS 权限这一关。

这也给 Agent = Model + Harness 的路线之争补了一个观察角度：**第一方绑定的隐性福利之一就是服务端工具全家桶**（搜索、code execution、computer use runtime）——多模型适配路线省下的是绑定，付出的是每个服务端工具都要在客户端重新长一遍。Copilot 有趣在两边都占：`#web` 走第一方绑定，agent 工具层走客户端生态，在同一个产品里演示了两条路线的取舍。

Microsoft Scout 则演示了第三种形态——**自己不长执行器，整体挂靠别人的闭环**。Scout 是跑在 Windows 本地的个人 agent（能读本地文件、跑 PowerShell、写代码），但它不走 M365 Copilot 许可，而是连接 GitHub Copilot、消耗 Copilot Business/Enterprise credits，模型目录也直接继承自 GitHub Copilot。它的 web research（搜索、fetch、带引用综合）开箱即用，原因不是 Scout 本地长了搜索引擎，而是整条链路（Scout → GitHub Copilot 后端 → 模型 + 服务端工具）落在同一个第一方闭环里——相当于给 Copilot 的服务端全家桶套了一个本地 harness 外壳。这与 Codex + Azure 恰好是镜像：后者把请求指出闭环、工具随之断供；前者把整个 harness 挂进闭环、工具随之继承。**能力归属跟着请求落点走，不跟着产品形态走**——这条规律在两个方向上都成立。

## 小结

1. **不在同一棵树上**：web search 作用于数据层（索引），browser use 作用于 UI 层（活页面）——是两族能力，不是强弱版本；中间还有 web fetch，三者构成"发现 → 获取 → 到场"的三级梯
2. **四问路由**：不知道在哪 → search；知道 URL 且公开静态 → fetch；要登录态/JS/页面状态 → browser use；要做事 → 只有 browser use
3. **"自带搜索"= 第一方闭环的服务端工具**：Claude.ai / Codex / Copilot `#web` 能搜是因为模型和搜索执行器在同一个服务端；换成 Bedrock/Vertex/Databricks 代理后声明无人执行——与系列六"Skill 可见但 runtime 缺失"同构。且判断要**分两层**：端点层有没有执行器、harness 层肯不肯为该 provider 发声明——Codex + Azure 是"端点有（阉割版）、harness 拒发"的新形态；Scout 挂靠 GitHub Copilot 闭环则是反方向的例证
4. **挂载点决定覆盖面**：服务端工具挂在推理 API 上则能力随模型走、所有调用场景继承；挂在应用入口上则只随那个入口走——Copilot 的 `#web`（应用层）→ Tavily 扩展（客户端补裂缝）→ model-native search（推理层）演示了挂载点一路下移的时间线。三模型对照实验（GPT-5.6 Sol / Gemini / Grok）给出五条"这个 search 是谁提供的"判定指纹与一条元教训：三个模型搜索 schema 全同证明 VS Code agent 链路走 Copilot 统一管道（单看 schema 会误认成 OpenAI hosted——单一指纹会误判，要多条交叉）；Grok 独有的本地 fetch 弹权限则展示**管道决定能力下限、模型性格决定实际走几级梯**，以及最反直觉的一条指纹：**弹本地权限恰恰证明执行器在本地**
5. **反向补位有成本表**：browser use 开 Google 省的是搜索 API 费、花的是模型 token 费，且有风控风险——低频交互划算，程序化检索仍是搜索 API 更优。"能补"和"该用它补"之间隔着一张成本表
6. **层选对了才是对的**：UI 层天然残缺（虚拟化）、数据层天然完整——browser use 不是万能上位替代，DOM 虚拟化的教训在信息获取场景同样成立

## 参考

- 本系列：[系列五](Computer%20Use与Browser%20Use系列五：最佳实践与日常使用习惯——场景路由表、内容获取链路与实战经验.md)（场景路由表、DOM 虚拟化教训）、[系列六](Computer%20Use与Browser%20Use系列六：Codex%20CLI与App的能力分界——同一套Skill、两条调用链与第三方生态补位.md)（Skill ≠ 能力、补位生态）
- [Web search with the Responses API（Microsoft Foundry 官方文档，Azure `web_search` 限制说明）](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/web-search)
- [Codex built-in web search only attaches to default OpenAI provider（GitHub Issue #3851）](https://github.com/openai/codex/issues/3851)
- [Codex CLI with Azure OpenAI gpt-5.6-sol fails due to internal headers（GitHub Issue #31875）](https://github.com/openai/codex/issues/31875)
- [Microsoft Scout common questions（模型与处理链路挂靠 GitHub Copilot）](https://learn.microsoft.com/en-us/microsoft-scout/faq)
- [LiteLLM: Claude Code WebSearch Across All Providers](https://docs.litellm.ai/docs/tutorials/claude_code_websearch)
- [GCP Vertex WebSearch tool available but Claude Code can't see it（GitHub Issue #7806）](https://github.com/anthropics/claude-code/issues/7806)
- [LiteLLM Feature Request: Server-side WebFetch interception](https://github.com/BerriAI/litellm/issues/25711)
- [Web Search for Copilot（VS Code Marketplace，微软官方，Tavily 驱动）](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-websearchforcopilot)
- [Copilot can't access web even after changed setting（GitHub Community，#web 与 Bing 开关机制）](https://github.com/orgs/community/discussions/159884)
- [Improved web search in Copilot on github.com（GitHub Changelog 2026-02-25，model-native web search 名单与 Bing 兜底）](https://github.blog/changelog/2026-02-25-improved-web-search-in-copilot-on-github-com)
- [Announcing Microsoft Web IQ（Bing Search Blog 2026-06，面向外部 AI 系统的 grounding API 套件）](https://blogs.bing.com/search/June-2026/Announcing-Microsoft-Web-IQ)
- [Exa、Tavily 与 Context7——AI Agent 搜索三剑客的定位与 MCP 配置实践](../Exa、Tavily与Context7——AI%20Agent搜索三剑客的定位与MCP配置实践.md)
