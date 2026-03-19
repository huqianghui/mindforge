---
title: Azure Copilot 生态全景：Skills、MCP Server 与 Copilot Agents 的协作实践
created: 2026-03-19
tags: [azure, azure-copilot, azure-mcp-server, azure-skills, github-copilot, copilot-agents, mcp, vscode, devops, ai-agent, aks]
---

# Azure Copilot 生态全景：Skills、MCP Server 与 Copilot Agents 的协作实践

## 一、问题的起点

当你在 Azure Portal 中使用 Copilot 的 Deployment Agent 生成 Terraform 模板，或者让 Troubleshooting Agent 诊断 AKS 集群问题时，会自然产生一个疑问：**这些能力能否在 Portal 之外使用？能否集成到我自己的 CI/CD 管道或 AI Agent 中？**

答案并不是简单的"能"或"不能"——微软构建了一个多层次的 AI 工具生态，不同工具覆盖不同场景，它们之间既有重叠也有互补。本文梳理这个生态的三个核心组件：**Azure Skills**、**Azure MCP Server** 和 **Azure Copilot Agents**，以及它们与 GitHub Copilot / VS Code 的集成方式。

---

## 二、三个核心组件

### 2.1 Azure Copilot Agents——Portal 内的专家顾问

**Azure Copilot Agents**（预览版）是 Azure Portal 中内置的 6 类 AI Agent，定位是"**专业领域的虚拟顾问**"：

| Agent | 核心能力 | 关键限制 |
|-------|---------|---------|
| **Deployment** | 翻译业务目标为 Well-Architected 部署方案，生成 Terraform 配置，可推送到 GitHub 作为 PR | 仅支持全新部署，不能导入/修改已有基础设施；仅输出 Terraform（不支持 Bicep） |
| **Troubleshooting** | 基于实际环境的根因诊断，部分问题支持一键修复，可自动创建 Support Request | 一键修复不适用所有资源类型（如 AKS 不支持） |
| **Optimization** | VM/VMSS 成本优化建议，生成 CLI/PowerShell 脚本，成本对比图表 | 无法直接执行脚本或修改资源；单次最多 10 条建议 |
| **Observability** | 从 Monitor 告警创建调查分析，可视化推理步骤 | 目前仅支持 Application Insights 告警类型 |
| **Migration** | VMware 迁移规划、业务评估、Landing Zone 设置 | 仅 VMware 全面支持；无法执行实际迁移（复制等） |
| **Resiliency** | 可用区弹性评估、备份缺口检测、生成可部署的弹性脚本 | Zone Resiliency 脚本仅覆盖 VM、App Service、PostgreSQL 等有限服务 |

**关键事实：Azure Copilot Agents 只能通过 Portal UI 使用。** 没有公开的 REST API、SDK 或 CLI 命令。它们的独特优势在于：
- **实时环境上下文**——能感知你当前在 Portal 中查看的资源、告警和 Advisor 建议
- **深度控制面集成**——与 Azure Migrate、Azure Monitor、Well-Architected Framework 的原生集成
- **操作闭环**——一键修复、自动创建 Support Ticket、直接推送 PR 到 GitHub

> **注意**：AI Shell（`aish`）曾作为 CLI 端的 Copilot 扩展，但已于 2026 年 1 月归档，不再维护。`az copilot` 命令也不存在。

### 2.2 Azure MCP Server——统一的编程接口

**Azure MCP Server**（`@azure/mcp`，`github.com/microsoft/mcp`）是微软开源（MIT）的 MCP 协议实现，定位是"**Azure 服务的通用 AI 工具后端**"。

**核心能力**：
- 覆盖 **35+ Azure 服务**，提供 **200+ 结构化工具**
- 支持读写操作（可通过 `--read-only` 限制为只读）
- 使用 **Entra ID + Azure RBAC** 认证
- 兼容所有 MCP 客户端：Claude Code、GitHub Copilot、OpenAI Agents SDK、Semantic Kernel、Cursor、Windsurf 等

**覆盖的 Azure 服务（按类别）**：

| 类别 | 服务 |
|------|------|
| **AI & ML** | Microsoft Foundry、Azure AI Search、Azure Speech |
| **计算** | App Service、Functions、**AKS**、Service Fabric、Virtual Machines |
| **容器** | Container Registry、AKS、Service Fabric |
| **数据库** | Cosmos DB、MySQL、PostgreSQL、Redis、Azure SQL |
| **DevOps** | Bicep Schema、Azure Deploy、Monitor、Managed Grafana |
| **开发工具** | App Configuration、Application Insights、Log Analytics、Load Testing |
| **安全** | Key Vault、Confidential Ledger |
| **存储** | Blob、File Shares、Queue、Table、Data Lake |
| **集成** | Event Hubs、Service Bus、Event Grid |
| **管理** | Advisor、Policy、Pricing、Quotas、Resource Health、Well-Architected |

**安装方式**（四种包管理器）：

```bash
# npm（推荐）
npx -y @azure/mcp@latest server start

# PyPI
uvx --from msmcp-azure azmcp server start

# .NET 10+
dotnet tool install Azure.Mcp

# Docker
docker run mcr.microsoft.com/azure-sdk/azure-mcp:latest
```

**安全机制**：
- 工具标注分类：`destructive`（破坏性）、`readOnly`（只读）、`idempotent`（幂等）
- 敏感操作（如 Key Vault 密钥读取）触发用户确认（Elicitation）
- Namespace 隔离——可以只暴露特定服务（如仅 `aks` 和 `monitor`）

### 2.3 Azure Skills——专家级工作流剧本

**Azure Skills**（`github.com/microsoft/azure-skills`）是微软官方的 Agent 插件，定位是"**教 AI Agent 做 Azure 专家的剧本集**"。

每个 Skill 是一个精心编写的 Markdown 剧本（SKILL.md），定义了端到端的工作流程、决策树、最佳实践和错误恢复策略。**Skills 本身不是可执行程序**——它们是注入 AI Agent 上下文的系统级指令，Agent 根据剧本指导，通过两条路径执行实际操作：

- **Azure MCP Server 工具**（查询/读取）——如 `mcp_azure_mcp_monitor`（查日志）、`mcp_azure_mcp_applens`（AI 诊断）、`mcp_azure_mcp_resourcehealth`（健康检查）
- **CLI 命令**（部署/变更）——如 `az deployment group create`、`azd up`、`terraform apply`、`kubectl`（AKS 故障排查）

简单说：**MCP Server 负责"看"（查询状态），CLI 负责"做"（执行变更），Skills 负责"想"（决策和流程编排）。**

**22 个 Skill 完整列表**：

| # | Skill | 用途 |
|---|-------|------|
| 1 | `azure-prepare` | 生成基础设施代码（Bicep/Terraform）、Dockerfile、azure.yaml；强制执行"先计划再行动"工作流 |
| 2 | `azure-validate` | 部署前验证（Bicep 构建、Terraform validate、项目构建检查） |
| 3 | `azure-deploy` | 执行部署（azd up、terraform apply、az deployment）并处理错误恢复 |
| 4 | `azure-diagnostics` | 生产环境故障排查——Container Apps、Function Apps、**AKS**（含专用子剧本） |
| 5 | `azure-compute` | VM/VMSS 选型建议，含 **GPU 工作负载指导**（NC/ND/NV 系列推荐） |
| 6 | `azure-cost-optimization` | 订阅成本分析、孤立资源清理、右径化建议 |
| 7 | `azure-quotas` | 配额管理、容量验证、跨区域对比、配额提升请求 |
| 8 | `azure-rbac` | 最小权限角色识别、自定义角色定义、CLI 和 Bicep 生成 |
| 9 | `azure-resource-lookup` | 通过 Resource Graph（KQL）发现资源、跨订阅查询 |
| 10 | `azure-resource-visualizer` | 分析资源组并生成 Mermaid 架构图 |
| 11 | `azure-compliance` | 合规性/安全审计、Key Vault 过期监控 |
| 12 | `azure-storage` | Blob、File Shares、Queue、Table、Data Lake 操作 |
| 13 | `azure-upgrade` | 评估并执行 Azure 工作负载升级（计划/层级/SKU 变更） |
| 14 | `azure-cloud-migrate` | 跨云迁移（AWS/GCP → Azure），含 Lambda→Functions 转换 |
| 15 | `azure-ai` | 集成 Azure AI Search、Speech、OpenAI、Document Intelligence |
| 16 | `azure-aigateway` | 配置 API Management 作为 AI 网关（语义缓存、Token 限制、MCP 工具治理） |
| 17 | `azure-messaging` | Event Hubs / Service Bus SDK 故障排查 |
| 18 | `azure-kusto` | Azure Data Explorer / KQL 查询执行 |
| 19 | `azure-hosted-copilot-sdk` | 构建并部署 GitHub Copilot SDK 应用到 Azure |
| 20 | `entra-app-registration` | Entra ID 应用注册、OAuth 2.0 配置、MSAL 集成 |
| 21 | `microsoft-foundry` | Azure Foundry 完整 Agent 生命周期（创建、部署、调用、评估、追踪） |
| 22 | `appinsights-instrumentation` | Application Insights 监控接入指南（ASP.NET Core、Node.js、Python） |

**AKS 专项支持**——`azure-diagnostics` 包含 4 个专用子剧本：

| 子剧本 | 覆盖场景 |
|--------|---------|
| `aks-troubleshooting.md` | 主路由剧本——判断问题类型并分发 |
| `pod-failures.md` | CrashLoopBackOff、ImagePullBackOff、Pending、OOMKilled、探针失败 |
| `node-issues.md` | NotReady 状态、自动扩缩器故障、Spot 节点污点、多 AZ 调度、升级卡住 |
| `networking.md` | Service 不可达、DNS 解析失败、LoadBalancer Pending、Ingress 路由、NetworkPolicy 阻断 |

**GPU 工作负载支持**——`azure-compute` 的第 3 步专门处理 GPU 选型（NC/ND/NV 系列），`azure-quotas` 支持 `Microsoft.Compute` 和 `Microsoft.MachineLearningServices` 配额检查。

---

## 三、三者的关系：三层架构

Azure Skills、Azure MCP Server 和 Azure Copilot Agents 不是竞争关系，而是面向不同场景的互补工具。它们的关系可以用一个三层模型来理解：

```
┌─────────────────────────────────────────────────────────────┐
│              Azure Copilot Agents（Portal）                  │
│    6 个专业 Agent——深度集成 Portal 控制面，实时环境上下文       │
│    ★ 独有：一键修复、自动创建 Support Ticket、PR 推送          │
│    ✗ 限制：仅 Portal UI，无 API/SDK                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Azure Skills（Agent 插件——"脑"）                 │
│    22 个领域专家剧本——端到端工作流 + 决策树 + 最佳实践          │
│    ★ 独有：强制 prepare→validate→deploy 顺序、错误恢复策略     │
│    ↓ 指导 Agent 通过两条路径执行                               │
├──────────────────────────┬──────────────────────────────────┤
│  Azure MCP Server（"眼"） │  CLI 命令（"手"）                 │
│  查询/读取 Azure 状态      │  执行部署和变更操作                │
│  mcp_azure_mcp_monitor   │  az deployment group create      │
│  mcp_azure_mcp_applens   │  azd up / terraform apply        │
│  mcp_azure_mcp_*         │  kubectl（AKS）/ func（Functions）│
│  200+ 结构化工具           │  Agent 在 Shell 中执行            │
├──────────────────────────┴──────────────────────────────────┤
│              Azure 资源（AKS、VM、Storage、Monitor...）       │
└─────────────────────────────────────────────────────────────┘
```

**类比**：
- **Azure Skills** = 经验丰富的架构师（知道做什么、什么顺序、遇到问题怎么处理）
- **Azure MCP Server** = 监控仪表盘（看到系统的实时状态）
- **CLI 命令** = 操作台上的按钮和旋钮（执行实际变更）
- **Azure Copilot Agents** = 驻场维修专家（有经验也有工具，但只在工厂里工作）

**关键安装关系**：安装 Azure Skills 插件时，它会**自动安装和配置 Azure MCP Server**（两者捆绑交付），但 **CLI 工具需要单独安装**：

```json
// Azure Skills 的 .mcp.json——自动配置 MCP Server
{
  "mcpServers": {
    "azure": {
      "command": "npx",
      "args": ["-y", "@azure/mcp@latest", "server", "start"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

```bash
# CLI 工具需要单独安装（Skills 剧本执行时依赖）
az login                    # Azure CLI（必需）
azd auth login              # Azure Developer CLI（部署工作流必需）
# terraform、kubectl、func 等按需安装
```

---

## 四、与 GitHub Copilot 和 VS Code 的集成

### 4.1 集成渠道全景

| 渠道 | MCP Server | Skills | CLI 命令 | 适用场景 |
|------|-----------|--------|---------|---------|
| **Azure Portal Copilot Agents** | 否（原生控制面） | 否 | 否 | 运维人员在 Portal 内的临时操作和诊断 |
| **Azure Skills 插件** | ✅ 自动捆绑 | ✅ 22 个剧本 | ✅ az/azd/terraform/kubectl | **端到端 Azure 工作流**——从准备到部署到诊断的完整链路 |
| **VS Code + GitHub Copilot for Azure** | ✅ 自动安装 | ⚠️ 需额外安装 Skills 插件 | ✅ 通过 Agent Mode | 开发者日常：编码、部署、调试、故障排查 |
| **VS Code/Cursor/Windsurf + Azure MCP** | ✅ 手动配置 | ⚠️ 需额外安装 | ✅ Agent 可执行 | 供应商无关的 MCP 客户端 |
| **Claude Code + Azure MCP** | ✅ 配置 MCP | ✅ 可安装插件 | ✅ Agent 可执行 | Claude Code 用户的 Azure 操作 |
| **GitHub Copilot Coding Agent（云端）** | ✅ 仓库配置 | 否 | 有限（Reader 角色） | 自主 PR 创建——读取 Azure 状态辅助代码修改 |
| **Copilot Studio** | ✅ 远程部署 | 否 | 否 | 低代码 Agent 构建，多渠道分发 |

> **关键澄清**：Azure Skills 插件安装时自动配置 Azure MCP Server，两者是捆绑交付的。但 VS Code 的 GitHub Copilot for Azure 扩展**不会自动安装 Skills 插件**——它只自动安装 Azure MCP Server 扩展（`ms-azuretools.vscode-azure-mcp-server`）。要获得 22 个专家剧本的能力，需要额外安装 Azure Skills 插件。

### 4.2 Azure Skills 插件——被忽视的核心组件

Azure Skills 是这个生态中**最容易被忽视但价值最高的组件**。它不仅提供 Azure MCP Server 的工具能力，还提供了微软第一手的专家级工作流编排。

**安装方式**：

```bash
# GitHub Copilot CLI
/plugin marketplace add microsoft/azure-skills
/plugin install azure@azure-skills

# Claude Code
claude plugin marketplace add microsoft/azure-skills
claude plugin install azure@azure-skills
```

安装后自动配置 `.mcp.json`，包含 Azure MCP Server 和 Context7 文档查询服务。

**执行依赖链**：

```
Azure Skills（SKILL.md 剧本）
    │
    ├── Azure MCP Server（@azure/mcp）──→ 查询/读取 Azure 资源状态
    │       └── 认证：az login 或环境变量
    │
    └── CLI 命令（Agent 在 Shell 中执行）──→ 部署/变更操作
            ├── az CLI（必需）
            ├── azd CLI（部署工作流必需）
            ├── terraform CLI（Terraform 配方可选）
            └── kubectl（AKS 故障排查可选）
```

**Skills 的独特价值在于流程编排**：比如 `azure-deploy` 会拒绝直接部署——它强制要求先完成 `azure-prepare`（生成 IaC）和 `azure-validate`（验证配置），通过 `.azure/plan.md` 状态文件跟踪进度，防止跳步导致的部署事故。

### 4.3 VS Code + GitHub Copilot for Azure

这是目前**最推荐的开发者集成路径**，搭配 Azure Skills 插件效果最佳。

**安装**：VS Code 扩展市场搜索 `ms-azuretools.vscode-azure-github-copilot`（1.19M 安装量）。

**两种模式**：
- **Agent Mode**（推荐）——Copilot 自主完成 Azure 任务，可调用所有 Azure MCP 工具
- **Ask Mode**（`@azure`）——问答式交互，用于学习和咨询

**推荐搭配**：安装扩展后，再通过 `/plugin` 命令安装 Azure Skills，即可获得完整的"MCP 工具 + 专家剧本 + CLI 执行"三层能力。

**正在进行的迁移**：扩展底层正在从专有工具迁移到 Azure MCP Server 工具。Visual Studio 2022/2026 已经默认使用 MCP Server。VS Code 端部分工具已迁移完成（`azure_list_activity_logs`、`azure_diagnose_resource`、`azure_generate_azure_cli_command`），其余工具迁移进行中。

**AKS 故障排查**已确认支持的提示词：
- "Help me troubleshoot my AKS cluster"
- "My AKS cluster 'xxx' is having performance problems"
- "How can I get the logs of a specific pod in Azure?"
- "Do my Azure kube-apiserver logs show the last time a restart occurred?"

### 4.3 Azure Skills 安装方式

**GitHub Copilot CLI**：
```bash
/plugin marketplace add microsoft/azure-skills
/plugin install azure@azure-skills
```

**Claude Code**：
```bash
claude plugin marketplace add microsoft/azure-skills
claude plugin install azure@azure-skills
```

安装后，Skills 会作为系统级指令注入 Agent 上下文，当检测到相关意图时自动激活。

### 4.4 Azure MCP Server 手动配置（适用于任何 MCP 客户端）

**VS Code**（`.vscode/mcp.json`）：
```json
{
  "servers": {
    "azure-mcp": {
      "command": "npx",
      "args": ["-y", "@azure/mcp@latest", "server", "start"]
    }
  }
}
```

**Claude Code**（`~/.claude.json` 或项目 `.mcp.json`）：
```json
{
  "mcpServers": {
    "azure": {
      "command": "npx",
      "args": ["-y", "@azure/mcp@latest", "server", "start"]
    }
  }
}
```

**认证**：运行前需执行 `az login`，或配置环境变量 `AZURE_TENANT_ID` / `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET`。

### 4.5 GitHub Copilot Coding Agent（云端自主 Agent）

GitHub 的 Coding Agent 可以连接 Azure MCP Server，实现"分配 Issue → Agent 自主修改代码 → 创建 Draft PR"的全自动流程。

**配置方法**：
```bash
# 使用 azd 一键配置（推荐）
azd coding-agent config
```

此命令会：创建 User Managed Identity → 分配 Reader 角色 → 存储 Secret 到 GitHub → 生成 Actions Workflow → 推送分支。

**安全注意**：默认 Reader 角色——Agent 只能读取 Azure 状态辅助代码修改，不能修改线上资源。如需写权限需手动提升。Agent 自主执行时**不会逐操作确认**。

---

## 五、为什么 Azure Skills 同时使用 MCP Server 和 CLI？

### 5.1 一个自然的疑问

Azure Skills 的架构设计引出一个值得深入讨论的问题：**既然 `az` CLI 也能查看资源和日志，为什么不全部用 CLI 完成，还要引入 MCP Server？**

这个问题的答案，恰好印证了 [MCP vs CLI — 为什么开发者在重新审视 MCP](../Notes/AI/Context-Engineering/MCP%20vs%20CLI%20—%20为什么开发者在重新审视%20MCP.md) 一文中的核心框架：

> **MCP 用上下文空间换取调用精确度；CLI 用模型内置知识换取上下文节省。**

Azure Skills 的设计是这个框架的**最佳实战案例**——它不是随意地混用两种方式，而是根据操作性质做了精确的分工。

### 5.2 为什么"查询/读取"选择 MCP Server 而非 CLI

表面上看，`az monitor activity-log list` 和 `mcp_azure_mcp_monitor` 能达到相同目的。但深入分析，MCP 在查询场景有 5 个 CLI 无法提供的优势：

**1. 专有诊断能力——CLI 根本不存在等价命令**

`mcp_azure_mcp_applens`（AI 诊断引擎）调用的是 Azure 内部的 App Lens 诊断 API——这是一个**专有的 AI 诊断服务**，没有对应的 `az` CLI 命令。`mcp_azure_mcp_resourcehealth` 调用的 Resource Health API 也没有直接的 CLI 等价物。这些工具提供的是 CLI 无法触达的能力。

**2. 结构化输出 vs 纯文本解析**

```
# CLI 方式——返回大段 JSON 文本，模型需要自行解析
az monitor activity-log list --resource-group myRG --output json
→ 返回数百行 JSON，模型需要理解哪些字段有用

# MCP 方式——返回结构化、预处理的结果
mcp_azure_mcp_monitor(query="...", resourceGroup="myRG")
→ 返回精确的、已过滤的结果，减少模型解析负担
```

MCP vs CLI 文章中指出：CLI 返回值是"纯文本，需模型解析"，而 MCP 返回值是"结构化 JSON"。对于 Azure 这类复杂服务，`az` 命令返回的 JSON 往往层级很深、字段很多，模型容易在解析中出错。MCP 工具可以在 Server 端完成预处理和过滤。

**3. 安全边界控制——MCP 可以精确限制，CLI 无法细粒度控制**

```
# MCP Server 可以做到：
- 配置 --read-only 模式，物理上阻止所有写操作
- Namespace 隔离，只暴露 aks + monitor 工具
- 敏感操作（Key Vault）触发 Elicitation 确认
- 每个工具标注为 destructive / readOnly / idempotent

# CLI 做不到：
- 一旦 Agent 有 Bash 访问权，无法阻止它执行 az resource delete
- 无法限制它只用 az monitor 而不用 az vm delete
- 权限控制只能依赖 Azure RBAC（粗粒度）
```

这正是 MCP vs CLI 文章中的关键观点——内置工具（如 Read vs cat）存在的核心原因是**权限分级**。Azure MCP Server 的 `readOnly` 模式就是这种分级的 Azure 版本。

**4. 跨客户端一致性——同一个 MCP Server 服务所有 Agent**

MCP vs CLI 文章中指出 MCP 的最大价值是"一次构建，多处集成"。Azure MCP Server 可以同时被 Claude Code、VS Code、Cursor、Copilot Studio、自建 Agent 使用。而 CLI 方式依赖每个 Agent 各自的 Bash 能力——Copilot Studio 就没有 Shell 环境。

**5. 工具发现——模型不需要"认识" Azure CLI**

MCP vs CLI 文章中有一个关键洞察：CLI 依赖模型训练数据中的知识。`az` CLI 有 **数百个子命令和数千个参数组合**，模型不一定都记得正确用法——尤其是 AKS 的诊断命令（`az aks check-acr`、`az aks get-credentials --admin` 等参数组合很复杂）。MCP 通过 `tools/list` 将精确的工具定义注入上下文，模型不需要"猜"参数。

### 5.3 为什么"部署/变更"选择 CLI 而非 MCP

反过来，Azure Skills 在部署和变更操作上选择 CLI 而非 MCP，同样有充分理由：

**1. 模型已经"认识"这些命令——零上下文成本**

`azd up`、`terraform apply`、`az deployment group create`——这些是 AI 模型训练数据中的高频命令，模型不需要 MCP 的工具定义来告诉它怎么用。正如 MCP vs CLI 文章所说："CLI 知识存储在模型权重中，不占上下文窗口。"

**2. CLI 的变更能力更完整——MCP 写操作仍有限**

Azure MCP Server 的写操作覆盖面远不及 `az` CLI。例如：
- `az aks nodepool scale` → MCP 中没有等价工具
- `terraform apply` → MCP 不提供 Terraform 执行能力
- `azd up` → MCP 不提供 azd 生命周期管理（虽然有 `mcp_azure_mcp_azd` 但能力有限）

**3. 成熟的错误处理和交互模式**

`azd up` 支持交互式错误恢复、自动重试、回滚；`terraform apply` 有 `-auto-approve` 和 plan/apply 分离。这些经过多年打磨的交互模式，比 MCP 工具更可靠。

**4. 用户可审计——Shell 命令透明可见**

Skills 让 Agent 执行的部署命令是透明的 Shell 命令——用户可以直接看到 `az deployment group create --template-file main.bicep`，可以理解、审查和手动复现。如果通过 MCP 执行，用户看到的是 `mcp_azure_mcp_deploy(template="main.bicep")`——抽象层让审计变困难。

### 5.4 设计哲学总结：精确分工

| 操作性质 | 选择 | 原因 |
|---------|------|------|
| **Azure 专有诊断**（AppLens、Resource Health） | MCP | CLI 无等价命令 |
| **资源状态查询**（Monitor、Activity Log） | MCP | 结构化输出 + 安全边界控制 |
| **工具发现/参数提示** | MCP | 模型不一定记得所有 `az` 子命令的正确参数 |
| **基础设施部署** | CLI（azd/terraform/az） | 模型熟悉 + 能力完整 + 错误处理成熟 |
| **AKS 操作命令** | CLI（kubectl） | 模型训练数据丰富 + 操作透明 |
| **文件生成**（Bicep/Dockerfile） | 直接写文件 | Skills 指导 Agent 直接生成文件内容 |

**一句话总结**：Azure Skills 的设计完美体现了 MCP vs CLI 文章的核心结论——**不是替代，而是分层：MCP 用于精确查询和安全隔离，CLI 用于成熟的变更操作。**

> 更多关于 MCP 和 CLI 的权衡分析，参见 [MCP vs CLI — 为什么开发者在重新审视 MCP](../Notes/AI/Context-Engineering/MCP%20vs%20CLI%20—%20为什么开发者在重新审视%20MCP.md)

---

## 六、Azure Skills + Azure MCP Server 能否替代 Azure Copilot Agents？

这是核心问题。答案是：**大部分场景可以，但有不可替代的差异**。

### 能力对比矩阵

| 能力 | Portal Copilot Agents | Skills + MCP Server |
|------|----------------------|---------------------|
| 基础设施代码生成（Terraform/Bicep） | ✅ Deployment Agent | ✅ `azure-prepare` + MCP |
| 部署执行 | ✅ Deployment Agent（推送 PR） | ✅ `azure-deploy`（azd up、terraform apply） |
| AKS 故障排查 | ✅ Troubleshooting Agent | ✅ `azure-diagnostics`（4 个 AKS 子剧本） |
| 成本优化 | ✅ Optimization Agent | ✅ `azure-cost-optimization` + `azure-compute` |
| 告警分析 | ✅ Observability Agent | ✅ MCP Monitor/App Insights 工具 |
| 迁移规划 | ✅ Migration Agent | ✅ `azure-cloud-migrate` |
| 弹性评估 | ✅ Resiliency Agent | 部分（通过 `azure-compliance` + MCP Advisor） |
| **一键修复** | ✅ Portal 独有 | ✗ 需手动执行修复命令 |
| **自动创建 Support Ticket** | ✅ Portal 独有 | ✗ 需手动创建 |
| **实时 Portal 上下文感知** | ✅ 知道你在看什么资源 | ✗ 需在提示词中指定资源 |
| **强制工作流顺序** | ✗ 无强制 | ✅ Skills 强制 prepare→validate→deploy |
| **可编程/可集成** | ✗ 仅 Portal UI | ✅ 任何 MCP 客户端 |
| **CI/CD 集成** | ✗ | ✅ GitHub Actions、Azure Pipelines |
| **多工具协同** | ✗ | ✅ 22 个 Skills 互相调用 |

### 不可替代的 Portal Copilot 独有能力

1. **一键修复（One-click fix）**——Troubleshooting Agent 对部分已知问题可以直接在 Portal 中执行修复，无需用户编写或执行任何命令
2. **自动 Support Ticket**——诊断结果可一键转为微软技术支持工单，预填充所有上下文信息
3. **实时环境感知**——Agent 能感知你当前在 Portal 中浏览的资源刀片、告警详情、Advisor 建议
4. **Well-Architected 深度评估**——Deployment Agent 的部署方案评估基于 Well-Architected Framework 的深度集成，超越了 Skills 提供的最佳实践

### Skills + MCP Server 的独特优势

1. **可编程**——可以集成到 CI/CD、自定义 Agent、自动化管道中
2. **强制工作流**——Skills 通过 `.azure/plan.md` 状态追踪，强制 prepare→validate→deploy 顺序，防止跳步
3. **错误恢复策略**——每个 Skill 包含详细的错误处理和恢复路径
4. **供应商无关**——不绑定 VS Code 或 GitHub Copilot，任何 MCP 客户端都能使用
5. **可扩展**——可以编写自定义 Skills 扩展覆盖场景

---

## 七、最佳实践推荐

### 7.1 选择合适的工具

```
                     ┌─ 临时诊断/一键修复 ──→ Azure Portal Copilot Agents
                     │
  Azure 相关任务 ────┼─ 开发/部署/调试 ────→ VS Code + GitHub Copilot for Azure
                     │                         + Azure Skills 插件
                     │
                     ├─ 自动化/CI/CD ─────→ Azure MCP Server + 自定义 Agent
                     │
                     └─ 团队协作/审批 ────→ Copilot Studio + 远程 MCP Server
```

### 7.2 开发者日常工作流

**推荐组合**：VS Code + GitHub Copilot for Azure + Azure Skills

```
1. 在 VS Code 中用 Agent Mode 描述需求
   → Skills 自动激活 azure-prepare，生成 Bicep/Terraform + Dockerfile

2. Agent 自动调用 azure-validate 验证配置
   → 发现问题自动修复，通过后标记 "Validated"

3. 确认后 Agent 调用 azure-deploy 执行部署
   → azd up / terraform apply

4. 部署失败时 azure-diagnostics 自动介入
   → 如果是 AKS 问题，路由到 pod-failures.md 或 networking.md 子剧本

5. 遇到需要微软支持的问题 → 切换到 Portal Copilot Troubleshooting Agent
   → 一键创建 Support Ticket
```

### 7.3 安全最佳实践

1. **最小权限原则**——Azure MCP Server 默认使用当前 `az login` 的身份，确保是最小必要权限
2. **只读模式**——在不需要写操作的场景（如分析、查询）中使用 `--read-only` 标志
3. **Namespace 隔离**——不要暴露所有服务，只配置需要的 namespace
4. **提示词安全**——在提示词中不要包含密钥、连接字符串等敏感信息
5. **Coding Agent 权限**——GitHub Coding Agent 默认 Reader 角色是安全的；如需写权限，要严格评估风险

### 7.4 提示词工程模式

微软推荐的 6 步模式（Agent Mode）：

1. **指令**：先告诉 Agent "在我确认之前不要执行任何操作"
2. **描述**：用足够的细节描述需求（**包含 "Azure" 关键词**以触发 MCP 工具）
3. **提问**：让 Agent 提出澄清问题
4. **迭代**：通过对话完善理解
5. **计划**：要求 Agent "创建一个分步骤的检查清单计划让我审核"
6. **授权**：审核通过后明确授权执行

### 7.5 AKS + GPU 场景的推荐路径

针对 AKS + GPU + 模型推理性能测试这类场景：

| 阶段 | 推荐工具 | 具体用法 |
|------|---------|---------|
| **选型** | Azure Skills `azure-compute` | GPU VM 系列推荐（NC for 推理、ND for 训练） |
| **配额检查** | Azure Skills `azure-quotas` | 检查目标区域的 GPU 配额，必要时申请提升 |
| **基础设施** | Azure Skills `azure-prepare` → `azure-validate` → `azure-deploy` | 生成 AKS + GPU 节点池的 Terraform，验证并部署 |
| **诊断** | Azure Skills `azure-diagnostics` (AKS 子剧本) | Pod 调度失败、OOMKilled、节点 NotReady 等 |
| **成本** | Azure Skills `azure-cost-optimization` | GPU 节点池的成本分析和优化建议 |
| **告警** | Azure MCP Server Monitor 工具 | 配置和查询推理延迟、GPU 利用率告警 |
| **紧急问题** | Azure Portal Copilot Troubleshooting Agent | 一键修复 + Support Ticket |

---

## 八、总结

### 生态定位图

| 组件 | 定位 | 独有价值 | 执行依赖 | 限制 |
|------|------|---------|---------|------|
| **Azure Copilot Agents** | Portal 内的专家顾问 | 实时环境感知、一键修复、Support Ticket | 原生控制面 | 仅 Portal UI，无 API/SDK |
| **Azure MCP Server** | 通用 AI 工具后端（"眼"） | 开放协议、200+ 工具、任何客户端可用 | Entra ID + RBAC | 主要是查询/读取，写操作有限 |
| **Azure Skills** | 专家级工作流剧本（"脑"） | 端到端流程、决策树、错误恢复、强制顺序 | MCP Server + az/azd/terraform CLI | 需要安装多个 CLI 工具 |
| **CLI 命令** | 直接操作工具（"手"） | 最完整的 Azure 操作能力，写操作首选 | az login 认证 | 需人工或 Agent 编排 |

### 核心洞察

1. **Azure Copilot Agents 和 Skills + MCP Server 不是替代关系，而是互补关系**——前者适合临时的、交互式的 Portal 操作；后者适合可编程的、自动化的开发和运维流程
2. **Azure MCP Server 是统一的粘合层**——无论你使用哪个客户端（VS Code、Claude Code、Cursor、自建 Agent），都通过同一个 MCP 协议访问 Azure
3. **Azure Skills 是被忽视的宝藏**——22 个精心编写的专家剧本，包含微软第一手的最佳实践和错误处理经验，比通用 LLM 的 Azure 知识精确得多
4. **微软的方向很明确**——从专有工具向 MCP 开放协议迁移，GitHub Copilot for Azure 的底层已在迁移中

---

## 参考资料

- [Azure Copilot Agents (preview)](https://learn.microsoft.com/en-us/azure/copilot/agents-preview)
- [Azure Copilot Overview](https://learn.microsoft.com/en-us/azure/copilot/overview)
- [Azure MCP Server Overview](https://learn.microsoft.com/en-us/azure/developer/azure-mcp-server/overview)
- [Azure MCP Server Tools Reference](https://learn.microsoft.com/en-us/azure/developer/azure-mcp-server/tools/)
- [Azure MCP Server GitHub (microsoft/mcp)](https://github.com/microsoft/mcp)
- [Azure Skills GitHub (microsoft/azure-skills)](https://github.com/microsoft/azure-skills)
- [GitHub Copilot for Azure Introduction](https://learn.microsoft.com/en-us/azure/developer/github-copilot-azure/introduction)
- [GitHub Copilot for Azure — Troubleshoot Examples](https://learn.microsoft.com/en-us/azure/developer/github-copilot-azure/troubleshoot-examples)
- [Connect Coding Agent to Azure MCP Server](https://learn.microsoft.com/en-us/azure/developer/azure-mcp-server/how-to/github-copilot-coding-agent)
- [Deploy Azure MCP Server for Copilot Studio](https://learn.microsoft.com/en-us/azure/developer/azure-mcp-server/how-to/deploy-remote-mcp-server-copilot-studio)
