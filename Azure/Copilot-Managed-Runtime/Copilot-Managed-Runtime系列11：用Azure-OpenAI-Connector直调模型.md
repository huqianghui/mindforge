---
title: Copilot Managed Runtime 系列 11：用 Azure OpenAI Connector 直调模型
created: 2026-10-28
description: 给知识库 managed app 的问答页加第三种后端，经 Azure OpenAI Connector 直接调模型部署，检索与提示词和 Work IQ 后端完全相同；Entra ID Integrated 连接在企业租户里报 AADSTS50011 建不出来，只能用可共享的 API Key 连接，部署时平台强制声明 allowedActions 白名单，而 ms app dev 不做这项检查；部署名是每次调用的参数而不在连接里；资源名填成完整网址会得到 502 而连接仍显示 Connected；同一问题实测 4.6 秒，比 Work IQ 快 3 到 8 倍，代价是自己管 Azure 资源和共享身份
tags: [copilot-managed-runtime, managed-apps, azure-openai, connector, shared-connection, allowed-actions, api-key, entra-id, chat-completions, work-iq, copilot-studio, latency, citations]
---

# Copilot Managed Runtime 系列 11：用 Azure OpenAI Connector 直调模型

> [!IMPORTANT]
> 资料截至 2026-10-28，是在一个企业租户里对已部署 managed app 的实测记录。Azure OpenAI Connector 的 Entra ID 认证能否创建取决于 connector 侧的应用注册，微软修复后结论可能改变；`allowedActions` 的校验规则目前只见于部署报错信息，官方文档还没有展开。

[系列 09](Copilot-Managed-Runtime系列09：本地检索加Work-IQ的问答.md) 用 Work IQ 直调 Microsoft 365 Copilot 做出了带引用的问答页，[系列 10](Copilot-Managed-Runtime系列10：经Work-IQ调用Copilot-Studio-Agent.md) 又经同一个 Work IQ 工具加上了 Copilot Studio agent 后端。两种后端都要经过 M365 Copilot 的编排，最快也要 15 秒，模型要么不可选、要么要去 Copilot Studio 里改。

路线图上剩下的是 [系列 05](Copilot-Managed-Runtime系列05：在应用里调用AI的几条路.md) 的路线 ③：**Azure OpenAI Connector**。检索不变、提示词不变，只把生成端换成直接调模型部署，看"快、可控"能换来多少，又要付出什么。

## 结论先行

- **代码最少的一种后端。** 一个生成的 Service 方法、三个参数（请求体、部署名、api-version），返回是标准的 Chat Completions 响应——不用像 Work IQ 那样剥六层包装，还多拿到 `model` 和 `usage`。
- **认证只剩 API Key 一条路。** Entra ID Integrated 在企业租户里创建连接时报 `AADSTS50011`：connector 的第一方应用没有登记回调地址，错误发生在登录页之前，用户侧无解。Managed Identity 只适用于 Logic Apps。
- **API Key 连接是共享连接，平台要求声明 `allowedActions`。** 应用分享出去，所有人共用这把 key 和这份配额；所以部署时必须列出应用经这条连接能调的动作，只放行 Chat Completions。`ms app dev` 不做这项检查，本地能跑、部署才报错。
- **部署名不在连接里。** 连接只认资源，`deployment-id` 是每次调用的参数，同一条连接能调这个资源下的任何部署。
- **资源名只填裸名。** 填成 `https://….openai.azure.com/` 会被 connector 拼坏，表现是 502，而连接状态照样显示 Connected。
- **同一问题实测 4.6 秒**，Work IQ 本体 15–26 秒，agent 25–36 秒。快和可控的代价是：自己的 Azure 资源、key 管理、共享身份，以及没有企业 grounding 和网页兜底。

---

## 一、链路：只换生成端

![经 Azure OpenAI Connector 直接调模型的完整链路|900](../../asset/managed-runtime-aoai-call-chain-2026-10-28.svg)

图里六个编号就是一次提问经过的六步。和前两种后端比，左边第一张卡片完全相同——同一份检索结果、同一套 `[n]` 与 `RELATED` 引用协议，这是三种后端能公平对比的前提；差别从第二步开始。

### 1.1 加数据源

```bash
ms connector list-actions --connector shared_azureopenai      # 先确认动作是 Allow
```

加数据源的命令和其他动作型 Connector 相同（见 [系列 04](Copilot-Managed-Runtime系列04：SDK与数据接入.md)），区别是 API Key 连接不支持 SSO，用的是事先在 Power Apps 里建好的那条连接。生成物也一样：`ms.config.json` 里多一个 `connectionReferences` 条目，外加一份数据源描述、一个模型文件和一个 Service 类。Service 里有 Chat Completions、Embeddings（单条与批量）和 On Your Data 扩展四个方法，本篇只用第一个。

### 1.2 调用

```ts
const DEPLOYMENT = '<部署名>';
const API_VERSION = '2024-10-21';

export async function askAzureOpenAI(prompt: string) {
  const res = await AzureOpenAIService.ChatCompletions_Create_2024Feb15Preview(
    { messages: [{ role: 'user', content: prompt }] },
    DEPLOYMENT,
    API_VERSION,
  );
  if (!res.success) throw new Error(JSON.stringify(res.error).slice(0, 500));
  const choice = res.data.choices?.[0];
  const text = choice?.message?.content;
  if (!text) throw new Error(`返回了空回答（finish_reason: ${choice?.finish_reason ?? '未知'}）`);
  return {
    text,
    model: res.data.model,
    promptTokens: res.data.usage?.prompt_tokens,
    completionTokens: res.data.usage?.completion_tokens,
  };
}
```

三个值得注意的地方：

- **方法名里的 `2024Feb15Preview` 是 connector 动作的名字，不是实际用的 API 版本。** 真正发给 Azure OpenAI 的 api-version 是第三个参数，这里传的是 GA 版本 `2024-10-21`。
- **整个提示词放进一条 `user` 消息。** 规则、SOURCES、最近两轮对话都在里面，和 Work IQ 后端一字不差（Work IQ 的 `copilot_chat` 只接受一个 `message` 字符串），没有拆成 system + user。以后单独优化这个后端时，把规则挪进 `system` 是第一件可做的事。
- **空回答要报出 `finish_reason`。** `content` 为空通常是被内容过滤或长度截断，把原因显示出来，比显示一个空气泡好排查得多。

### 1.3 返回与显示

返回就是标准的 OpenAI 响应：`choices[0].message.content` 是回答，交给与 Work IQ 后端共用的解析器拆出 `[n]` 和 `RELATED` 行。另外两个字段 Work IQ 给不了：

- **`model`**：实际作答的模型版本（带日期后缀），部署升级了能直接看出来；
- **`usage`**：输入 / 输出 token，成本可以逐条算。

问答页在每条回答下方显示"耗时 · 后端 · 模型版本 · 输入 / 输出 token"。

![问答页切到 Azure OpenAI 后端：4.6 秒，下方显示模型版本与 token 用量|900](../../asset/mindforge-app-ask-aoai-2026-10-28.png)

截图里的问题是"Prompt Cache 新旧两代有什么区别"。回答按要点列出断点、缓存键、计费、门槛、保留期五项差别，只引用了检索到的第 2 篇；第一行小字是 `4.6 秒 · Azure OpenAI · <模型版本> · 输入 2954 / 输出 265 token`。

---

## 二、连接：理想的那种建不出来

![Azure OpenAI 连接的三种认证方式，以及从建连接到上线的四道坎|900](../../asset/managed-runtime-aoai-connection-pitfalls-2026-10-28.svg)

### 2.1 三种认证方式

Azure OpenAI Connector 声明支持三种认证，图上半部分是它们在一个企业租户里的实际结果。

**Microsoft Entra ID Integrated 本来是最理想的。** 只要填资源名；每个用户用自己的身份调用，需要在资源上有 Cognitive Services OpenAI User 角色；连接不共享，谁调的一清二楚——和 Work IQ 一样是"每人各自连接"的模型。

但创建连接时，登录弹窗直接报 **`AADSTS50011`**：connector 的第一方应用没有登记 `https://global.consent.azure-apim.net/redirect/azureopenai` 这个回调地址。判断这不是自己的问题有两条依据：

1. 错误发生在**输入账号之前**——这是 Entra 在受理登录请求时对应用注册做的校验，和账号、权限无关；
2. Chrome 与 Firefox、清不清缓存，结果完全一致。

> [!NOTE]
> 即使 Entra 方式能建连接，还有一层跨租户问题：connector 的登录走 `/common`，令牌由账号的主租户签发；资源若在另一个租户，通常会被拒。本机用 `az account get-access-token --subscription <资源所在租户的订阅> --resource https://cognitiveservices.azure.com` 直接调能通，那是因为令牌直接从资源所在租户取——connector 没有这个选项。所以第一个资源在别的租户时，最后换成了一个与账号同租户的资源。

**Managed Identity 只适用于 Logic Apps**，managed app 和 Power Apps 里用不上。

剩下的 **API Key** 能用：填资源名和 key，key 只保存在 Power Platform 的连接对象里，不进代码、不进 `ms.config.json`、不进仓库。代价是这条连接是**共享**的——下一节的约束全部由此而来。

### 2.2 部署名不在连接里

建连接时只填资源名，不选模型。部署是每次调用的参数 `deployment-id`，所以**同一条连接能调这个资源下的任何部署**——资源里有好几代 GPT 部署，以后在页面上加一个模型切换，只需要改这个参数，连接、授权都不用动。

这和 Work IQ 正好相反：那边连接是用户自己的，模型却由 M365 Copilot 决定；这边连接是共享的，模型完全由应用决定。

### 2.3 踩坑：资源名填成了完整网址

第一次调用一直返回 **502 BadGateway**，内层是 500 Internal server error，换 api-version 也一样。连接状态显示 Connected，看不出问题。

最后用 Power Apps API 查这条连接的非机密参数才找到原因：

```text
GET …/apis/shared_azureopenai/connections/<连接 ID>
→ properties.connectionParametersSet.values
```

资源名一栏填的是 `https://<资源名>.openai.azure.com/`。connector 会自己拼 `https://<资源名>.openai.azure.com/…`，填进完整网址就拼成了一个不存在的主机。改成只填 `<资源名>` 后正常。

> [!WARNING]
> **连接状态 Connected 只说明凭据还有效，不校验资源名这类参数。** API Key 连接出现 502 / 500，先查连接的参数值，再怀疑 api-version、部署名或模型本身。

---

## 三、部署：共享连接必须声明 allowedActions

### 3.1 部署被拒

本地 `ms app dev` 一切正常，第一次 `ms app deploy` 却被拒：

```text
connectionReferences.<id>.allowedActions: Shared connection references without dataset tables
must declare connector-level allowedActions.
```

原因在 `ms.config.json` 里这个条目的形状。和 Work IQ（`certOauth`、每人各自连接）不同，它带着一个 `sharedConnectionId`：

```json
"authenticationType": "keyBasedAuth",
"sharedConnectionId": "/providers/Microsoft.PowerApps/apis/shared_azureopenai/connections/<连接 ID>",
"dataSets": {},
"allowedActions": ["ChatCompletions_Create_2024Feb15Preview"]
```

最后一行是补上的。规则的逻辑是：**共享连接意味着别人在用你的凭据**。应用分享给同事后，同事的浏览器里跑的也是这条连接；如果不加限制，任何能打开应用的人都可以借它调用这个 connector 的任意动作。所以对"没有数据集表"的共享连接——也就是动作型 Connector——平台要求在部署时列出白名单。

只放行用到的那一个动作：别人借这条连接只能调 Chat Completions，调不了 Embeddings 或 On Your Data 扩展。

> [!TIP]
> `ms app dev` 不做 `allowedActions` 检查，只有部署时才校验。加任何**共享**连接的数据源后，先手动补上 `allowedActions` 再提交，不要等部署报错；以后用到新动作（比如 Embeddings），也要同步加进白名单。

### 3.2 线上首问：两条连接的授权框

上线后第一次提问，宿主弹出授权框，同时列出两条连接：Azure OpenAI（标明是共享连接）和 Work IQ。

点 Allow 之前的等待被算进了那次提问的计时，显示 230 秒；授权之后线上实测 **8.4 秒**（输入 5087 / 输出 179 token）。

> [!CAUTION]
> 测延迟一定要用授权之后的数字。首问计时里混着人在授权框前停留的时间，会把一个 5 秒的后端测成 4 分钟。

---

## 四、三种后端对比

![同一个问题，三种后端经过的层与实测耗时|900](../../asset/managed-runtime-ask-three-backends-2026-10-28.svg)

图的上半部分是请求经过的层。Azure OpenAI 只有"应用检索 → connector → 部署"三跳；Work IQ 多了 Copilot 编排和企业搜索 grounding，还会自动抓取提示词里的网址作 grounding（[系列 10](Copilot-Managed-Runtime系列10：经Work-IQ调用Copilot-Studio-Agent.md) 第四节的 `fileUris`）；agent 再多一层 agent 编排，资料外的问题还要做一次网页搜索。每多一层，就多大约十秒。

同一问题"Prompt Cache 新旧两代有什么区别？"的实测：

| | Azure OpenAI | Work IQ（M365 Copilot 本体） | Copilot Studio agent（Work IQ + agentId） |
|---|---|---|---|
| 耗时 | **4.6 秒** | 15–26 秒 | 25–36 秒 |
| 模型 | 应用传 `deployment-id`，随时切 | M365 Copilot 自动路由 | 在 agent 里选，改了要重新发布 |
| 连接身份 | 共享一把 API Key | 每个用户自己，SSO | 同 Work IQ |
| 用户前提 | 无 | 每人有 M365 Copilot 许可 | 同 Work IQ，且能看到这个 agent |
| 资料外的问题 | 只能说没有（提示词禁止） | 只能说没有 | 查公开网络并声明来源 |
| 返回解析 | 一层，带 `model` 与 `usage` | 剥六层包装 | 同 Work IQ |
| 计费 | 资源所在订阅按 token | Work IQ API 按量 | 同 Work IQ |

三者的引用都遵守 `[n]` + `RELATED` 协议。这正是 [系列 05](Copilot-Managed-Runtime系列05：在应用里调用AI的几条路.md) 的原则：**事实由应用给，模型只负责组织语言**——检索和协议固定在应用里，生成端就可以像插件一样替换，换谁主要影响速度、成本和治理。

### 怎么选

- **要快、要可控、要算清成本，或者用户没有 M365 Copilot** → Azure OpenAI。前提是有自己的 Azure 资源，并接受共享身份：资源侧看不到是谁在调，用量治理只能靠 `allowedActions` 和资源配额。
- **要用户自己的身份、不想管 Azure 资源，能接受十几秒** → Work IQ 本体。
- **要固定或比较模型、要网页兜底、同一个回答者还要在 Teams 里给人直接用** → Copilot Studio agent。

问答页把三种后端都留着，用切换按钮选择，每条回答都标注由谁作答、耗时多少。

---

## 五、还没做的

- **把规则挪进 `system` 消息。** 现在为了与 Work IQ 后端对齐，整个提示词塞在一条 `user` 消息里。
- **流式输出。** Azure OpenAI 本身支持流式，但 Connector 经宿主转发，只能一次性返回（[系列 03](Copilot-Managed-Runtime系列03：宿主沙箱与安全边界.md)）；5 秒的等待目前还能接受。
- **向量检索。** 现在检索仍是构建期索引 + 前端关键词打分。Connector 里有 Embeddings 动作，但每次提问都多一次调用、白名单也要放开；更合适的是构建期离线算好向量随应用发布，运行期只在前端算余弦相似度。
- **页面上切换部署。** 部署是调用参数，加一个下拉框就能在几代模型之间做 A/B。

---

## 参考资料

- [Azure OpenAI connector reference](https://learn.microsoft.com/en-us/connectors/azureopenai/)
- [Azure OpenAI REST API reference](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/reference)
- [Connect a Managed Runtime app to data](https://learn.microsoft.com/en-us/microsoft-365/managed-apps/developer/connect-to-data?view=o365-worldwide)
- [CLI command reference](https://learn.microsoft.com/en-us/microsoft-365/managed-apps/developer/ms-cli-command-reference?view=o365-worldwide)

相关文章：

- [Copilot Managed Runtime 系列 05：在应用里调用 AI 的几条路](Copilot-Managed-Runtime系列05：在应用里调用AI的几条路.md)
- [Copilot Managed Runtime 系列 09：本地检索加 Work IQ 的问答](Copilot-Managed-Runtime系列09：本地检索加Work-IQ的问答.md)
- [Copilot Managed Runtime 系列 10：经 Work IQ 调用 Copilot Studio Agent](Copilot-Managed-Runtime系列10：经Work-IQ调用Copilot-Studio-Agent.md)
- [Copilot Studio 系列 02：Connector 与连接](../Copilot-Studio/Copilot-Studio系列02：Connector与连接.md)
