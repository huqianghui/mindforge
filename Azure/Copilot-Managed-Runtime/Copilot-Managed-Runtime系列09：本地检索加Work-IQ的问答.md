---
title: Copilot Managed Runtime 系列 09：本地检索加 Work IQ 的问答
created: 2026-10-27
description: 在知识库 managed app 里落地带引用的问答——检索全在浏览器里做（英文词加中文二元组、idf 乘字段权重、取前 5 篇再挑段落），生成交给 Work IQ Copilot MCP 以用户身份调用的 Microsoft 365 Copilot，提示词约定行内编号与 RELATED 行，引用因此是结构化的；回答要剥六层包装，reply 为空、rawResponse 是转义过的字符串；首次授权约 74 秒、之后每次 15 到 20 秒；不需要建 Copilot Studio agent；CLI 部署超时不等于构建失败
tags: [copilot-managed-runtime, managed-apps, work-iq, m365-copilot, mcp, json-rpc, rag, retrieval, prompt-engineering, citations, connector]
---

# Copilot Managed Runtime 系列 09：本地检索加 Work IQ 的问答

> [!IMPORTANT]
> Work IQ Copilot MCP Connector 撰写时（2026-10）是 **Preview**。本文的返回格式、耗时都是在一个企业租户里的实测结果，官方文档没有写到这一层，升级后要重新核对。

[系列 05](Copilot-Managed-Runtime系列05：在应用里调用AI的几条路.md) 列了在 managed app 里调 AI 的几条路，路线 ② 的依据是拆解一个已上线应用。本篇是在自己的知识库应用上把这条路完整走一遍：从检索算法、提示词，到返回格式和部署时的坑。

先做这一条而不是 Copilot Studio agent，原因有两个：**不需要建 agent**（少一个要分享、要发布、要维护知识源的东西）；**引用由应用自己控制**——来源是应用检索出来的，不是从回答文本里猜的。

## 结论先行

- **分工**：检索在浏览器里做，生成交给 Microsoft 365 Copilot。整条路径只有一跳出应用域名。
- **检索不需要向量和分词库**：英文按词、中文按相邻两字切，idf 乘字段权重给文章打分，取前 5 篇，再在段落级挑最相关的两段。索引在构建期生成，约 530 KB，只在问答页加载。
- **引用靠输出协议**：段落带编号写进提示词，要求行内用 `[n]` 标注、最后一行写 `RELATED: 1, 3`。应用把编号渲染成原文链接，用到的和没用到的来源分开显示。
- **回答要剥六层**：SDK 结构 → 可能是 SSE → JSON-RPC → 外层 JSON 加一行 CorrelationId → `reply` 为空、`rawResponse` 是字符串化的会话 → `messages` 的最后一条。每层失败都退回原文。
- **耗时**：每个用户首次调用要授权，连同授权约 74 秒；之后每次 15–20 秒。
- **CLI 部署超时不等于构建失败**，先查 `ms app build-status`。

---

## 一、全景

![一次提问的完整路径：检索在应用里，生成在 Microsoft 365 Copilot|900](../../asset/managed-runtime-ask-pipeline-2026-10-27.svg)

图里青绿色的 ①–③ 都在浏览器里，毫秒级完成，不调用任何 Connector；琥珀色的 ④–⑥ 是唯一经 Connector 的往返。下面按这个顺序讲。

![问答页：行内编号引用，下方实心标签是用到的来源、空心是检索到但没用上的|900](../../asset/mindforge-app-ask-2026-10-27.png)

---

## 二、本地检索

### 2.1 索引：构建期生成的每篇摘要

同步时（[系列 07](Copilot-Managed-Runtime系列07：零Connector的分析页面.md) 的管道）多生成一个检索索引：每篇只存**标题、描述、标签、各级标题、开头一段**和路径，386 篇约 530 KB。正文不进索引——命中之后再按需拉正文，索引保持小。

### 2.2 打分

1. **切词**：英文按词（保留 `c#`、`gpt-4o` 这类带符号的词），中文按相邻两字切成二元组。一个汉字单独成段时保留单字。不引入中文分词库，bundle 不变大。
2. **去虚词**：问句里的"什么""如何""区别""之间"这类二元组几乎每篇都有，只会拉低区分度，直接去掉。
3. **打分**：每个词的 idf（出现的篇数越少越重要）× 字段权重 × 命中次数（同一字段最多算 3 次）。字段权重是**标题 4、标签 3、描述 2、各级标题 2、开头段 1**。取得分最高的 5 篇。

从文章页点"就这篇提问"进来时，当前文章固定排第一，其余按得分补齐。

### 2.3 挑段落

对这 5 篇拉正文，去掉 front matter、代码块和图片，按 Markdown 标题切成段，用同一套打分给段落排序，每篇取最相关的 2 段，按原文顺序拼接。每段最多 900 字、每篇最多 1600 字；没有一段命中时取开头一段。

> [!NOTE]
> 这套检索在个人知识库这个规模（几百篇、标题和标签写得规范）上够用。它的天花板也很清楚：同义词、换种说法的问题检索不到。到那一步，再考虑构建期离线生成向量、前端算相似度，或者换成 [系列 05](Copilot-Managed-Runtime系列05：在应用里调用AI的几条路.md) 的路线 ③。

---

## 三、提示词与输出协议

提示词的结构参考了系列 05 拆解的那个应用，核心是把模型的自由度收紧：

```text
You are the help assistant inside <应用名>, a personal knowledge base about ...
Answer ONLY from the SOURCES below. Do not search files, mail, chats or the web, and do not use other knowledge.
If the SOURCES do not contain the answer, say so plainly (in Chinese: 知识库里没有相关内容) ...
Rules: answer in the language of the question; at most 300 Chinese characters or 200 English words; no tables;
cite sources inline as [n]; keep product names, commands and code identifiers exactly as written.
End with one last line exactly like: RELATED: 1, 3   (RELATED: none if you used none).

SOURCES
[1] <标题> (<路径>)
<段落摘录>
...
EARLIER IN THIS CONVERSATION      ← 最近 2 轮，每轮回答截到 400 字
QUESTION
<用户的问题>
```

几处取舍：

- **明确禁止搜索邮件、聊天和网页。** M365 Copilot 默认会用用户的企业数据；不禁止的话，回答可能混进一封邮件里的内容，引用就对不上了。
- **不用表格。** 回答框窄，表格渲染出来很难读；也减少模型输出长篇结构的倾向。
- **产品名、命令照抄原文。** 否则模型会把 CLI 参数"润色"成另一种写法。
- **多轮靠提示词。** 每次调用都会新开一个 Copilot 会话（`conversationId` 每次不同），所以上下文只能自己带。只带最近两轮、每轮截断，控制提示词长度。

**解析 RELATED**：从后往前找第一行以 `RELATED:` 开头的（兼容加粗和中文冒号），取出 1..N 范围内的编号去重，然后把这一行从正文里删掉。模型没守约时 RELATED 为空，界面照样列出全部检索结果——这是 [系列 05](Copilot-Managed-Runtime系列05：在应用里调用AI的几条路.md) 说的"引用靠输出协议"的完整形态。

实测模型遵守了协议：回答按 `[1][2]` 标注，检索到但没用上的来源不会出现在 RELATED 里。界面上用到的来源是实心标签，没用上的是空心标签——读者一眼能看出模型的回答依据了哪几篇。

---

## 四、接入

```bash
ms connector list-actions --connector shared_a365copilotchatmcp
#   Work IQ Copilot (Preview)   Allowed   mcp_m365copilot
ms app add data-source --connector shared_a365copilotchatmcp --as action --use-sso --non-interactive
```

生成的 Service 只有一个方法，返回类型声明是 `void`，实际内容要自己解析。请求体是 MCP 的 JSON-RPC，**直接 `tools/call`，不需要先 `initialize`**：

```ts
const res = await WorkIQCopilotMCPService.mcp_m365copilot(undefined, {
  jsonrpc: '2.0',
  id: crypto.randomUUID(),
  method: 'tools/call',
  params: { name: 'copilot_chat', arguments: { message: prompt } },
});
// SDK 不抛异常，失败体现在 success 上
if (!res.success) throw res.error ?? new Error('Work IQ Copilot 调用失败');
```

`copilot_chat` 还有一个可选参数 `agentId`（"Agent ID for the Microsoft Copilot conversation"）。本篇的后端没有用它，由 M365 Copilot 本体作答。后来实测：把 Copilot Studio Standard agent 发布到 Microsoft 365 Copilot，再用它的 titleId 作 `agentId`，同一条链路就能把问题交给这个 agent——问答页的第二种后端就是这样接上的，见 [系列 10](Copilot-Managed-Runtime系列10：经Work-IQ调用Copilot-Studio-Agent.md)。

---

## 五、返回格式：要剥六层

![Work IQ 的回答要剥六层才拿得到|900](../../asset/managed-runtime-workiq-unwrap-2026-10-27.svg)

这是整个实现里最花时间的部分。`result.content[0].text` **不是回答本身**：

- 外层是一段 JSON（`conversationId`、`timeZone`、`reply`、`rawResponse`、`message`），后面还跟一行 `CorrelationId: …, TimeStamp: …`；
- `reply` **实测为空**，不能直接用；
- `rawResponse` 是**字符串化**的 Graph `copilotConversation`。服务端序列化器把引号、中文、`+`、反引号都转义成了 `\uXXXX`，第一版界面原样显示时看起来像乱码。其实这是合法的 JSON 转义，`JSON.parse` 一次就全部还原；
- `messages` 的第一条是我们发出去的提示词，**最后一条**才是回答。

解析代码因此写成一串"尝试—退回"：去掉 CorrelationId 行 → 解析外层 → 有非空 `reply` 就用它 → 否则解析 `rawResponse` → 取最后一条文本不等于提示词的消息。任何一步失败都返回上一层的原文。

> [!TIP]
> 遇到"看起来像乱码"的返回，先数一数是不是 `\u` 加四位十六进制。是的话，问题不在编码，而在于少解析了一层 JSON。

---

## 六、实测记录

| 观察 | 说明 |
|---|---|
| 首次调用时宿主弹出 "Allow … to access your data?"，列出 Work IQ Copilot MCP | 每个用户第一次用都要同意；同意后平台为这个应用建一条新连接，挂起的那次调用随后正常返回，连同授权共约 74 秒 |
| 之后每次 15–20 秒 | 超过 10 秒，界面显示"仍在处理"；回答下方标出耗时 |
| `ms app dev` 可用 | Connector 调用在本地宿主里能跑（App state 不行，见 [系列 08](Copilot-Managed-Runtime系列08：用App-state保存用户数据.md)）；纯 Vite 下问答页只做检索，并提示需要在宿主中运行 |
| 改了平台调用相关的文件后，Vite 整页刷新 iframe | 宿主里的问答状态会丢，测试时要重新提问 |
| 一次部署时，平台构建跑了约 20 分钟 | 见下 |

**CLI 超时不等于构建失败。** `ms app deploy` 轮询构建状态时两次网络超时并退出（exit 1），但平台上的构建一直在继续。用 `ms app build-status --commit <sha>` 看到 Succeeded 后，再执行一次 `ms app deploy --commit <sha>`，CLI 提示已有缓存的构建、直接部署，几秒就上线了。所以看到 deploy 失败，第一步是查 build-status，而不是重新推一个提交。

---

## 七、和另外两种后端怎么比

这条路线解决了"不建 agent、引用可控"，代价也清楚：

- **模型不可选**，由 M365 Copilot 决定；每次 15–20 秒，比直接调模型慢。
- **要求每个用户都有 M365 Copilot**，Work IQ 的调用另外计费。
- **依赖 Preview Connector**，返回格式可能变——所以第五节的"每层退回原文"不是过度防御。

路线图上的下一步是两种对比实验：

1. **Copilot Studio Standard agent**：已作为问答页可切换的第二种后端上线。原计划经 Copilot Studio Connector 的 `ExecuteCopilotAsyncV2` 调用，实测走不通（回调式动作），改为发布到 M365 Copilot 后经本篇同一个 Work IQ 工具传 `agentId`，见 [系列 10](Copilot-Managed-Runtime系列10：经Work-IQ调用Copilot-Studio-Agent.md)。
2. **Azure OpenAI Connector + 同一套前端检索**：检索不变，只换生成端，看"模型可选、更快"能换来多少。

另一个方向是把问答和其他页面串起来：洞察页的一条 Claim、建议页的一张卡片，都可以加"问 Copilot"入口，用 `#/ask?q=` 预填问题——[系列 07](Copilot-Managed-Runtime系列07：零Connector的分析页面.md) 里规则引擎刻意不做的"这条结论还成立吗"，正好交给这里。

---

## 参考资料

- [Connect a Managed Runtime app to data](https://learn.microsoft.com/en-us/microsoft-365/managed-apps/developer/connect-to-data?view=o365-worldwide)
- [Model Context Protocol specification](https://modelcontextprotocol.io/specification)
- [CLI command reference](https://learn.microsoft.com/en-us/microsoft-365/managed-apps/developer/ms-cli-command-reference?view=o365-worldwide)
- [Copilot Managed Runtime licensing FAQ](https://learn.microsoft.com/en-us/microsoft-365/admin/manage/apps/licensing-faq)

相关文章：

- [Copilot Managed Runtime 系列 05：在应用里调用 AI 的几条路](Copilot-Managed-Runtime系列05：在应用里调用AI的几条路.md)
- [Copilot Managed Runtime 系列 06：参考应用拆解与功能模式](Copilot-Managed-Runtime系列06：参考应用拆解与功能模式.md)
- [Copilot Studio 系列 05：Agent 的存储与标识](../Copilot-Studio/Copilot-Studio系列05：Agent的存储与标识.md)
- [Copilot Managed Runtime 系列 10：经 Work IQ 调用 Copilot Studio Agent](Copilot-Managed-Runtime系列10：经Work-IQ调用Copilot-Studio-Agent.md)
