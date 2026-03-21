---
title: Coding Agent Plugin 生态调研——协议、最佳实践与自定义 plugin 开发
created: 2026-03-21
tags: [AI, claude-code, plugin, skill, agent, MCP, coding-agent, extension, marketplace, devtools]
---

# Coding Agent Plugin 生态调研——协议、最佳实践与自定义 plugin 开发

## 一句话结论

**Plugin 是 Coding Agent 从"工具"走向"平台"的关键拐点。** Claude Code 的插件体系将 Skill、Command、Subagent、Hook、MCP Server 等零散扩展点统一封装为可安装、可共享、可版本化的模块——这让 AI 编程助手第一次拥有了类似 VS Code Extension 的生态能力。

---

## 1. 从 Command 到 Skill 再到 Plugin——扩展机制的三次演进

Claude Code 的扩展机制经历了三个清晰的阶段：

### 1.1 Slash Command（命令）——最简单的扩展

Slash Command 是以 `/` 开头的快捷命令，本质上是**固定的提示模板**：

- 用户手动触发（如 `/deploy`、`/commit`）
- 编写简单：一个 Markdown 文件，放在 `.claude/commands/` 目录下
- 功能有限：只能封装一段预设的 prompt，没有条件判断、没有辅助脚本
- 命名空间：无隔离，多个项目的命令可能重名冲突

**适用场景**：简单重复的操作，如固定的 PR 创建模板、代码格式化指令等。

### 1.2 Skill（技能）——更智能的扩展

Skill 是更复杂、更灵活的扩展单元：

- 以独立的 `SKILL.md` 文件形式存在，内含 AI 指令、决策流程和可选辅助脚本
- **可自动触发**：Claude Code 根据当前任务上下文按需加载相应 Skill，不需要用户手动调用
- 内容更丰富：可包含分步工作流说明、参考文档、Python 脚本等
- **跨平台兼容**：同一份 SKILL.md 不仅能在 Claude Code 中运行，也可在 Chat API、OpenAI Codex、Gemini CLI 等其它 AI Agent 中使用，被视为 "Agent Skills" 的事实标准

**典型例子**：一个"代码审核" Skill 可以包含安全审核检查清单、自动化静态分析脚本、OWASP 安全指南引用等。

### 1.3 Plugin（插件）——平台级的扩展

Plugin 是 2025 年 10 月 Anthropic 随 Claude Code 2.0 推出的**最高级别扩展形式**，将多种扩展机制统一到一个框架下：

| 特性 | Command | Skill | Plugin |
|------|---------|-------|--------|
| 触发方式 | 手动（`/xxx`） | 自动 + 手动 | 自动 + 手动 |
| 封装粒度 | 单个提示模板 | 单个工作流 | 多个组件的组合 |
| 可包含内容 | Prompt 文本 | Prompt + 脚本 + 文档 | Command + Skill + Agent + Hook + MCP + LSP |
| 命名空间 | 无 | 无 | 有（`plugin-name:skill-name`） |
| 版本管理 | 无 | 无 | 有（SemVer） |
| 分发机制 | 手动复制文件 | 手动复制文件 | Marketplace 一键安装 |
| 跨项目复用 | 困难 | 困难 | 原生支持 |

Plugin 的三大核心优势：

1. **封装性**——一个插件就是一个"工具箱"，可以将多个 Command、Skill、Subagent、MCP 连接和 Hook 封装为一组。例如，一个前端开发插件可以同时提供 UI 设计最佳实践 Skill、构建部署脚本 Command、以及浏览器自动化工具
2. **命名空间隔离**——插件中的技能和命令带有插件名前缀（如 `my-plugin` 中的技能 `review` 注册为 `/my-plugin:review`），避免不同插件之间的重名冲突
3. **共享与分发**——通过 Marketplace 打包发布，提供规范的元数据（名称、版本、描述、作者）和版本管理，支持 Git 仓库或插件商店进行发布更新

> **演进的本质逻辑**：随着 Claude Code 用户建立了越来越多复杂自定义设置并希望分享给团队和社区，单独的 Command/Skill 已无法满足规模化复用和管理的需要。Plugin 体系应运而生——Anthropic 官方明确表示：**未来 Plugin 将成为标准的 Claude Code 功能扩展方式**。

---

## 2. Plugin 架构与技术细节

### 2.1 目录结构

每个 Plugin 是一个独立的文件夹，内部包含清单文件和多个子目录：

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # 插件元数据清单（名称、版本、描述、作者）
├── commands/                 # Slash 命令模板
│   └── deploy.md
├── skills/                   # 技能说明文件
│   └── review/
│       └── SKILL.md
├── agents/                   # 子代理配置
│   └── security-scanner.md
├── hooks.json                # 事件钩子设置
├── .mcp.json                 # MCP 服务配置
└── .lsp.json                 # 语言服务器配置
```

### 2.2 plugin.json 清单

最小清单只需 `name` 和 `version`：

```json
{
  "name": "my-first-plugin",
  "description": "示例问候插件",
  "version": "1.0.0",
  "author": { "name": "Your Name" }
}
```

注意：插件名称采用 **kebab-case**（小写短横线风格），以确保技能前缀合法。

### 2.3 运行时行为——Plugin 是分发单元，不是运行时单元

理解 Plugin 运行时机制的关键在于：**Plugin 在安装后会被"拆包"，里面的组件进入各自独立的子系统。** 运行时，model 看到的永远是一个个独立的 tool、skill、command，而不是"一个 plugin 整体"。

#### 2.3.1 安装时：拆包到各子系统

当用户 `/plugin install` 一个 Plugin 时，Claude Code 做的事情是：

```
Plugin 安装包
    │
    ├── .mcp.json       ──→  MCP 子系统：启动独立进程，tool 描述注册到 tool list
    ├── .lsp.json       ──→  LSP 子系统：启动语言服务器进程
    ├── hooks.json      ──→  Hook 子系统：注册到事件监听器
    ├── skills/         ──→  Skill 子系统：短描述加入可用列表
    ├── commands/       ──→  Command 子系统：注册为 /namespace:cmd
    └── agents/         ──→  Agent 子系统：注册为可用 subagent 类型
```

Plugin 的 `plugin.json` 清单在安装/管理阶段使用（版本号、描述、依赖等），**运行时 model 完全不感知"Plugin"这个概念**——它只看到拆包后的各个组件。

#### 2.3.2 Session 启动时：分层加载

每次启动 Claude Code 会话时，各子系统按不同策略加载：

| 组件类型 | 加载时机 | 加载内容 | 是否占用 context |
|----------|----------|----------|------------------|
| **MCP tools** | Session 启动 | MCP 进程启动，所有 tool 的 JSON Schema 描述注入 system prompt | **是**——tool 描述始终在 context 中（每轮都能看到） |
| **LSP** | Session 启动 | 语言服务器进程启动 | **否**——作为外部进程运行，只有调用结果进入 context |
| **Hook** | Session 启动 | 注册到事件系统 | **否**——由 harness 层执行，不占模型 context |
| **Skill** | Session 启动 | **仅短描述**加入 system-reminder 的可用技能列表 | **极少**——只占几行描述文字 |
| **Command** | Session 启动 | 注册为 `/namespace:cmd` | **否**——只是注册入口，不加载内容 |
| **Agent** | Session 启动 | 注册为可用 subagent 类型 | **极少**——只是类型名 |

#### 2.3.3 对话过程中：按需注入 Skill 全文

这是最关键的机制——以当前这个对话为例，可以直接观察到：

**你能看到的系统消息中有这样的内容：**

```
The following skills are available for use with the Skill tool:
- obsidian: 使用 obsidian-agent 处理 Obsidian vault 操作请求
- excalidraw-diagram: Create Excalidraw diagram JSON files...
- frontend-design: Create distinctive, production-grade frontend interfaces...
  ...（几十个 skill 的短描述）
```

**注意**：这里只有**短描述**（每个 skill 一两行），不是完整的 SKILL.md 内容。Model 根据这些短描述判断哪个 skill 与当前任务相关。

**当 model 决定触发某个 skill 时**（手动 `/plugin:skill` 或自动判断），harness 才将该 skill 的**完整 SKILL.md 内容**注入到当前上下文——这就是"按需注入"。

#### 2.3.4 完整的请求处理流程

```
用户输入 "帮我做一个前端页面"
    │
    ▼
Harness 层构建 system prompt：
    ├── 基础指令（Claude Code 核心行为规范）
    ├── CLAUDE.md 项目规范
    ├── MCP tool 描述（Pencil、Figma、Draw.io 等所有 tool 的 JSON Schema）  ← 始终在
    ├── Skill 可用列表（短描述）                                            ← 始终在
    └── 当前上下文（文件内容、对话历史等）
    │
    ▼
Model 看到 tool 列表 + skill 列表，做出决策：
    ├── 调用 MCP tool？→ 直接调 tool，结果返回到 context
    ├── 触发 Skill？   → Harness 加载完整 SKILL.md 内容到 context
    │                     Model 按 SKILL.md 指令执行多步工作流
    └── 直接回复？     → 不需要额外加载
```

**所以回答你的核心问题**：

1. ~~Plugin 的元数据太少，没法了解里面的内容~~ → **不是通过 plugin 元数据来了解的**。Plugin 安装后就拆包了，里面的 MCP tool 描述和 Skill 短描述各自进入模型可见的列表
2. ~~触发 plugin 才加载组件~~ → **不存在"触发 plugin"这个动作**。Plugin 拆包后，MCP tool 描述始终可见，Skill 短描述始终可见，model 直接选择调用哪个 tool 或触发哪个 skill
3. **真正的"按需加载"发生在 Skill 层面**：Skill 的完整指令（可能很长）只在被触发时才注入 context，平时只保留短描述

#### 2.3.5 其他运行时特性

- **隔离加载**：Claude Code 启用插件时会将插件内容复制到本地缓存（`~/.claude/plugins/cache`），防止不受信任的插件直接访问用户文件系统
- **命名空间**：同名的 Skill/Command 不会冲突，因为前缀了插件名
- **自动更新**：用户安装插件后，Claude Code 自动检查市场更新，发布新版本时用户启动时收到升级提示

### 2.4 与 IDE 的集成

Claude Code 的插件体系与 VS Code 无缝集成：

- Anthropic 官方 VS Code 扩展支持在 VS Code 中通过 `/plugin` 命令安装和管理插件
- TypeScript LSP、Python Pyright LSP 等插件可在 VS Code 中直接提供实时错误检查和智能补全
- 开发者既可以在终端用 CLI，也可以在 VS Code 图形界面中使用插件

---

## 3. 插件市场生态现状

### 3.1 生态规模

自 2025 年 10 月公测以来，Claude Code 插件生态增长迅速：

- Anthropic 官方插件目录（`anthropics/claude-plugins-official`）：**13,500+ 星标、1,300+ Fork**
- 截至 2026 年初，官方市场已有**数十款经过认证的插件**
- 第三方开发者通过公共/私有插件市场发布自己的插件，拓展了长尾应用
- 热门插件安装量超过**数十万**

### 3.2 主流插件分类

| 类别 | 代表插件 | 功能描述 |
|------|----------|----------|
| **前端开发** | Frontend Design（官方） | 前端界面设计最佳实践，生成高质量 HTML/CSS，避免千篇一律样式 |
| **代码审查** | Code Review（官方） | AI 智能审查：安全检查（SQL/XSS 注入）、风格规范、性能问题提示 |
| **开发工作流** | Feature Dev（官方） | 多 Agent 协同：需求分析、设计、评审并行处理 |
| **外部服务** | GitHub MCP、Atlassian | 直接调用 GitHub API / Jira+Confluence，项目管理自动化 |
| **数据库** | Supabase | 通过 MCP 执行 SQL 查询、管理项目、身份认证和存储 |
| **自动化测试** | Playwright（微软） | 浏览器 E2E 测试：点击、表单填写、截图、UI 回归 |
| **代码智能** | TypeScript LSP、Python Pyright LSP | 语言服务器集成：类型检查、错误诊断、跳转定义 |
| **安全** | Security Guidance | 开发时自动扫描 XSS、命令注入等安全问题 |
| **文档检索** | Context7 | 实时从版本库/文档中提取相关代码段供 AI 参考 |
| **技能开发** | Skill Creator（官方） | 辅助创建、改进和评估自定义 Skill 的元插件 |

### 3.3 开源与自定义

- 官方插件多采用 **Apache-2.0** 许可，开发者可自由阅读、Fork 和定制
- 部分插件安装即用；部分需要 API 密钥或环境变量（如 GitHub Token、Jira 凭证）
- 由于插件本身由 Markdown、JSON 和脚本文件构成，具备**高度可定制性**

### 3.4 行业影响

- **企业团队**：通过自建插件强制执行代码规范和安全策略，新工程师安装团队插件即获标准化开发环境
- **开源社区**：维护者为项目编写插件，引导贡献者快速了解项目并执行必要步骤
- **竞争格局**：Claude Code 通过插件系统率先将 AI 编程助手变成"可扩展平台"，其他平台（OpenAI GPT Actions、LangChain Deep Agents）也在跟进类似思路

---

## 4. 何时应该开发自己的 Plugin

### 4.1 决策框架

```
需要在多个项目中复用同一套配置？  ──── Yes ──→ 开发 Plugin
                │
                No
                ↓
需要分享给团队成员？  ──── Yes ──→ 开发 Plugin
                │
                No
                ↓
需要版本管理和更新维护？  ──── Yes ──→ 开发 Plugin
                │
                No
                ↓
留在项目 .claude/ 目录下作为本地配置即可
```

### 4.2 三个典型场景

**场景一：跨项目复用**

如果有一套通用的开发流程、规范或脚本需要在多个项目中重复使用，Plugin 提供版本化和命名空间特性，避免每个项目都手动配置。

**场景二：团队协作**

团队需要共享最佳实践时，Plugin 可以封装：
- 代码规范（通过 CLAUDE.md 和 Skills）
- CI/CD 步骤（通过 Hooks 和 Commands）
- 内部系统接口（通过 MCP Servers）

例如，一个"QA 检查"插件包含代码风格检查 Hook + Bug 提醒 Skill，让每位团队成员自动应用相同标准。

**场景三：社区分发**

当你的自定义配置具有普适价值时（如安全扫描 Hook、数据库优化 Skill），打包成 Plugin 开源发布到 Marketplace 是最好的做法。

### 4.3 Anthropic 官方建议

> **先从本地独立配置开始，验证有效后再打包为 Plugin。**

具体路径：
1. 先在项目的 `.claude/` 下创建自定义 Skill 或 Command
2. 验证效果——确认这些自定义内容确实有用
3. 如果需要分享或跨项目复用，再将其打包成 Plugin
4. 添加版本号，提交到公共 Marketplace

---

## 5. Plugin 开发实战指南

### 5.1 Step 1：创建目录和清单

```bash
mkdir -p my-plugin/.claude-plugin
```

编写 `.claude-plugin/plugin.json`：

```json
{
  "name": "my-first-plugin",
  "description": "示例问候插件",
  "version": "1.0.0",
  "author": { "name": "Your Name" }
}
```

### 5.2 Step 2：添加 Skill

```bash
mkdir -p my-plugin/skills/hello
```

创建 `my-plugin/skills/hello/SKILL.md`：

```markdown
---
name: hello
description: 打招呼技能
---

当被调用时，亲切地用用户的名字问候，并询问有什么可以帮助的。
用户名字：$ARGUMENTS
```

安装后，此技能通过 `/my-first-plugin:hello` 调用。`$ARGUMENTS` 占位符会提取命令中冒号后输入的参数。

### 5.3 Step 3：（可选）添加其他组件

根据需要加入：
- **子代理**（`agents/` 目录）——定义特定任务的 AI 角色及行为
- **钩子**（`hooks.json`）——编写事件触发的动作
- **MCP 工具**（`.mcp.json`）——定义外部服务连接
- **LSP**（`.lsp.json`）——指定语言服务器配置

### 5.4 Step 4：本地测试与调试

使用 `--plugin-dir` 参数加载本地插件：

```bash
claude --plugin-dir ./my-first-plugin
```

启动后输入 `/my-first-plugin:hello World`，验证 Skill 是否正常响应。

**调试技巧**：

| 操作 | 命令 |
|------|------|
| 重新加载插件 | `/reload-plugins` |
| 调试模式 | `claude --debug` 或运行中输入 `/debug` |
| 校验插件结构 | `claude plugin validate` |

调试模式会输出插件加载详情和错误日志，包括 `plugin.json` 语法错误、引用的脚本不存在等问题的明确提示。

### 5.5 Step 5：版本管理

持续开发时更新 `plugin.json` 中的版本号，遵循 [SemVer](https://semver.org/lang/zh-CN/)：

- **MAJOR**：不兼容的 API 变更
- **MINOR**：向后兼容的新功能
- **PATCH**：向后兼容的 Bug 修复

---

## 6. Plugin 发布与分发

### 6.1 三种分发方式

**方式一：私有使用（团队内部）**

将插件目录添加到版本库，团队成员克隆后通过 `claude --plugin-dir` 加载：

```bash
# 方式 A：独立目录
claude --plugin-dir ./team-plugins/qa-checker

# 方式 B：放入项目 .claude/ 目录，随项目一起分发
```

**方式二：自建 Marketplace**

Anthropic 的插件体系允许任何人托管自己的市场：

1. 创建 Git 仓库
2. 在根目录提供 `.claude-plugin/marketplace.json`，列出可用插件清单
3. 用户通过 `/plugin marketplace add <仓库地址>` 添加市场

**方式三：提交官方目录**

将插件通过 Pull Request 添加到 `anthropics/claude-plugins-official` 的 `/external_plugins` 列表，通过审核后获得 **"Anthropic Verified"** 标识。

### 6.2 发布 Checklist

- [ ] `plugin.json` 包含完整的元数据（name、version、description、author）
- [ ] 版本号遵循 SemVer
- [ ] 附带 README 说明（安装和使用指南）
- [ ] 附带开源许可证（推荐 Apache-2.0）
- [ ] 在干净环境中完整测试所有功能
- [ ] `claude plugin validate` 通过
- [ ] `claude --debug` 无加载错误或冲突

---

## 7. CLI 命令速览

| 命令 | 说明 |
|------|------|
| `claude` | 启动交互式会话 |
| `claude --debug` | 调试模式启动 |
| `claude --plugin-dir <目录>` | 加载开发中的本地插件 |
| `/plugin` | 进入插件管理界面（浏览市场、查看已安装） |
| `/plugin install <名称>` | 安装插件 |
| `/plugin disable/enable <名称>` | 禁用/启用插件 |
| `/plugin uninstall <名称>` | 卸载插件 |
| `/plugin marketplace add <URL>` | 添加第三方市场 |
| `/plugin update` | 检查并更新插件 |
| `/reload-plugins` | 重新加载所有插件 |
| `claude plugin validate` | 校验插件结构 |
| `/agents` | 查看和管理 AI 子代理 |
| `/debug` | 运行中开启/关闭调试模式 |
| `/help` | 查看所有命令和技能列表 |

---

## 8. 与本项目已有知识的关联

本文是 "learn-claude-code" 系列的延伸。之前的文章从不同角度剖析了 Claude Code 的扩展体系：

- [[Claude Code的Agent与Subagent架构解析——以Superpowers为例]]——聚焦 Agent/Subagent 的运行时架构，解释了 model 如何通过 harness 层调度子代理
- [[Claude Code扩展三剑客：Command、Skill与Agent的区别与协作]]——详细对比了三种扩展类型的定位和使用场景
- [[learn-claude-code——打开Coding Agent黑盒]]——从源码层面还原了 Claude Code 的 Agent Loop、Tool 系统和 Permission 设计

**Plugin 是这些概念的"包装层"**——它不引入新的运行时机制，而是将 Command、Skill、Agent、Hook、MCP 等已有组件统一封装为可分发的模块。理解前面的文章后，Plugin 的设计逻辑就非常自然：

```
Plugin = Command + Skill + Agent + Hook + MCP + LSP
       + 命名空间隔离
       + 版本管理
       + Marketplace 分发
```

从 [[learn-claude-code——打开Coding Agent黑盒]] 提出的 Harness 公式来看：

```
Harness = Tools + Knowledge + Observation + Action Interfaces + Permissions
```

Plugin 本质上是**一种标准化的 Harness 分发格式**——让开发者可以把自己精心调教的 Harness 配置打包分享给他人。

---

## 9. 思考与展望

### 9.1 Plugin 的本质

Plugin 的出现标志着 Coding Agent 从"工具"到"平台"的转变。正如 VS Code 从文本编辑器变成了"万能 IDE"，关键转折点就是 Extension API 的成熟——Claude Code 的 Plugin 体系正在走同样的路。

### 9.2 对开发者的启示

1. **先 Skill 后 Plugin**：不要一上来就开发 Plugin。先在 `.claude/` 目录下验证 Skill 效果，确认有复用价值后再打包
2. **组合优于发明**：Plugin 的威力在于组合——一个好的 Plugin 往往是把已有的 MCP Server + Skill + Hook 巧妙组合，而不是从零发明新能力
3. **关注命名空间**：随着安装的 Plugin 增多，命名空间隔离变得越来越重要。设计 Plugin 时选择有意义且不易冲突的名称
4. **版本纪律**：严格遵循 SemVer，让使用者可以安全升级

### 9.3 未来方向

- **Plugin 组合**：Plugin 之间的依赖和组合机制（类似 npm 的依赖管理）
- **企业治理**：通过托管策略限定员工可使用的 Plugin 范围，保障安全合规
- **跨 Agent 兼容**：Skill 已经具备跨平台兼容性（Claude Code / Codex / Gemini CLI），Plugin 格式是否也能标准化？
- **AI 自动发现**：让 model 根据任务上下文自动从 Marketplace 搜索并推荐合适的 Plugin

---

## 参考资源

- [Claude Code 官方文档——Plugins](https://code.claude.com)
- [Anthropic 官方插件目录](https://github.com/anthropics/claude-plugins-official)（13,500+ Stars）
- [Claude Code Skill 规范](https://morphllm.com)
- [Plugin Developer Toolkit](https://claude.com)——Anthropic 官方的插件开发辅助工具
- [learn-claude-code](https://github.com/shareAI-lab/learn-claude-code)——Claude Code 源码分析与逆向工程
