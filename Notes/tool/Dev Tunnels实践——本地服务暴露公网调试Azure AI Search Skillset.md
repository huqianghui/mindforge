---
title: Dev Tunnels实践——本地服务暴露公网调试Azure AI Search Skillset
created: 2026-05-22
tags: [dev-tunnels, azure-functions, azure-ai-search, skillset, debug, tunnel, proxy]
---

# Dev Tunnels实践——本地服务暴露公网调试Azure AI Search Skillset

## 问题场景

在开发 Azure AI Search 的 Custom Web API Skill 时，有一个经典的调试痛点：Skillset 中的自定义技能需要一个**公网可达的 HTTP 端点**，而开发阶段的 Azure Function 运行在 `localhost:7071`。

传统做法是每次修改后都部署到 Azure 再测试，周期长、反馈慢。更高效的方式是：**用隧道工具将本地服务直接暴露到公网**，让 Azure AI Search Indexer 能实时回调到本地 Function，实现"改完即测"的快速调试循环。

## Dev Tunnels 是什么

[Dev Tunnels](https://learn.microsoft.com/azure/developer/dev-tunnels/) 是微软提供的**反向隧道代理（Reverse Tunnel Proxy）**服务，可以将本地运行的服务通过安全隧道暴露到公网。它与 VS Code 和 Azure 生态深度集成，是微软官方推荐的本地调试方案。

### 工作原理

```
[Azure AI Search Indexer] → [微软云端 Relay 服务器] ←长连接← [本地 devtunnel 客户端] → [localhost:7071]
```

1. 本地 `devtunnel` 客户端启动后，与微软云端 Relay 服务建立**持久的出站 WebSocket/HTTP2 连接**
2. 云端分配公网 URL（如 `https://xxx-7071.asse.devtunnels.ms`）
3. 外部请求到达该 URL 时，Relay 通过已建立的长连接将流量转发到本地客户端
4. 本地客户端将流量转发到指定的本地端口（如 7071）

关键优势：因为是本地主动发起出站连接，**不需要公网 IP、不需要配置防火墙或路由器端口转发**。

## 安装

### macOS

```bash
brew install --cask devtunnel
```

### Windows

```powershell
winget install Microsoft.devtunnel
```

### Linux

```bash
curl -sL https://aka.ms/DevTunnelCliInstall | bash
```

## 使用步骤

### 1. 登录认证

Dev Tunnels 支持多种认证方式：

```bash
# 方式一：Microsoft Entra ID 账号（默认，弹出浏览器）
devtunnel user login

# 方式二：GitHub 账号（推荐，避免组织设备管理限制）
devtunnel user login -g

# 方式三：设备码流程（无法弹出浏览器时）
devtunnel user login -d        # Entra ID + 设备码
devtunnel user login -g -d     # GitHub + 设备码
```

> 如果组织要求设备被 Intune 管理而无法使用 Microsoft 账号，可以用 GitHub 账号作为替代。

### 2. 启动本地 Azure Functions

```bash
cd custom_skill
func host start
```

确认服务在 `localhost:7071` 正常响应。

### 3. 创建并启动隧道

#### 方式一：临时隧道（推荐用于快速调试）

```bash
devtunnel host -p 7071 --allow-anonymous
```

- `-p 7071`：转发的本地端口
- `--allow-anonymous`：允许匿名访问（Azure AI Search Indexer 不支持 Dev Tunnels 认证机制，**必须加此参数**）

启动后输出：

```
Connect via browser: https://zz08bgqx-7071.asse.devtunnels.ms
```

#### 方式二：持久隧道（适合反复调试）

```bash
# 创建隧道
devtunnel create --allow-anonymous

# 添加端口映射
devtunnel port create -p 7071

# 启动隧道
devtunnel host
```

持久隧道会保留配置，下次使用只需 `devtunnel host` 即可。

#### 方式三：VS Code 图形化操作

1. `Cmd+Shift+P` 打开命令面板
2. 搜索 **"Dev Tunnels: Create a Tunnel"**
3. 选择端口 7071，访问级别选 **Public**
4. 在 **PORTS** 面板查看转发 URL

### 4. 测试连通性

```bash
curl -X POST https://<your-tunnel-id>-7071.<region>.devtunnels.ms/api/page_content_split_http_trigger \
  -H "Content-Type: application/json" \
  -d '{
    "values": [
      {
        "recordId": "r1",
        "data": {
          "page_content": "id:5000\n\nquestion: test\n\nanswer: <Brief>test</Brief>"
        }
      }
    ]
  }'
```

### 5. 配置 Azure AI Search Skillset

将隧道 URL 作为 Custom Web API Skill 的 `uri`：

```json
{
  "@odata.type": "#Microsoft.Skills.Custom.WebApiSkill",
  "name": "page_content_split_skill",
  "uri": "https://<your-tunnel-id>-7071.<region>.devtunnels.ms/api/page_content_split_http_trigger",
  "httpMethod": "POST",
  "batchSize": 10,
  "context": "/document",
  "inputs": [
    {
      "name": "page_content",
      "source": "/document/page_content"
    }
  ],
  "outputs": [
    { "name": "product_id", "targetName": "product_id" },
    { "name": "question", "targetName": "question" },
    { "name": "brief", "targetName": "brief" },
    { "name": "specification", "targetName": "specification" }
  ]
}
```

## 典型调试工作流

```
┌─────────────────┐       ┌──────────────┐       ┌─────────────────────┐
│  Azure AI Search │──────▶│  Dev Tunnels  │──────▶│  localhost:7071     │
│  (Indexer/       │       │  (公网URL)    │       │  (Azure Functions)  │
│   Skillset)      │◀──────│              │◀──────│                     │
└─────────────────┘       └──────────────┘       └─────────────────────┘
```

开发循环：修改 Function 代码 → 本地自动热重载 → 通过 Dev Tunnel 的固定 URL 触发 Indexer → 实时看到调试输出和断点。

## 访问控制选项

| 选项 | 说明 | 适用场景 |
|------|------|----------|
| `--allow-anonymous` | 任何人可访问，无需认证 | Azure AI Search Indexer 调用 |
| 无额外参数（默认） | 需要 Microsoft 账号登录 | 仅自己调试 |
| `--access-control org` | 同组织用户可访问 | 团队协作调试 |

## 常用命令参考

| 命令 | 说明 |
|------|------|
| `devtunnel user login` | 登录 Microsoft Entra ID |
| `devtunnel user login -g` | 登录 GitHub 账号 |
| `devtunnel user show` | 查看当前登录状态 |
| `devtunnel host -p 7071 --allow-anonymous` | 创建临时隧道暴露端口 |
| `devtunnel list` | 列出所有已创建的隧道 |
| `devtunnel delete <tunnel-id>` | 删除指定隧道 |
| `devtunnel delete-all` | 删除所有隧道 |
| `devtunnel port list` | 查看端口映射 |

## 替代方案对比

| 工具 | 特点 | 使用示例 |
|------|------|----------|
| **[ngrok](https://ngrok.com/)** | 最流行，免费版有限速和临时 URL | `ngrok http 7071` |
| **[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)** | 免费、无带宽限制、需 Cloudflare 账号 | `cloudflared tunnel --url http://localhost:7071` |
| **[frp](https://github.com/fatedier/frp)** | 开源自建，需自备公网服务器 | 配置 frps + frpc |
| **[bore](https://github.com/ekzhang/bore)** | Rust 极简隧道，可自建服务端 | `bore local 7071 --to bore.pub` |
| **[localtunnel](https://github.com/localtunnel/localtunnel)** | Node.js 开源，零配置 | `lt --port 7071` |
| **[Tailscale Funnel](https://tailscale.com/kb/1223/funnel)** | 基于 WireGuard 的 mesh VPN + 公网暴露 | `tailscale funnel 7071` |

### 方案选择建议

| 场景 | 推荐 | 理由 |
|------|------|------|
| 已在微软/GitHub 生态中 | **Dev Tunnels** | 与 VS Code、Azure Functions 无缝集成 |
| 需要稳定免费生产级隧道 | **Cloudflare Tunnel** | 无带宽限制、全球 CDN |
| 快速一次性调试 | **ngrok** | 一行命令即可 |
| 完全自主控制、数据不经第三方 | **frp** | 开源自建 |
| 团队内网互联（P2P） | **Tailscale** | 数据不经过中继 |

> 对于 Azure AI Search Custom Skill 调试场景，Dev Tunnels 是首选——与 Azure 生态集成最好且原生支持 `--allow-anonymous`。如果遇到组织账号限制，Cloudflare Tunnel 或 ngrok 是最佳替代。

## 故障排查

| 问题 | 解决方案 |
|------|----------|
| 隧道启动后无法访问 | 确认本地 Functions 已启动且 `localhost:7071` 正常响应 |
| 返回 403 Forbidden | 检查是否添加了 `--allow-anonymous` 参数 |
| 返回 502 Bad Gateway | 本地服务未启动或端口不匹配 |
| 登录失败 | `devtunnel user logout` 后重新登录 |
| URL 过期或不可用 | 重新创建隧道获取新 URL |
| Functions 冷启动超时 | 先手动调用一次本地接口预热 |

## 注意事项

1. **隧道生命周期**：临时隧道在 CLI 进程结束后即关闭；持久隧道需手动删除
2. **URL 变化**：每次创建新的临时隧道 URL 都会变化，需重新配置 Skillset
3. **网络延迟**：隧道转发有额外延迟，仅建议开发调试阶段使用
4. **安全性**：`--allow-anonymous` 下隧道 URL 相当于公网暴露，勿在其中运行含敏感数据的服务
5. **区域自动选择**：Dev Tunnels 自动选择最近区域（如 `asse` = 东南亚），无需手动配置
6. **生产环境**：正式上线时应部署到 Azure Functions，不应依赖隧道
