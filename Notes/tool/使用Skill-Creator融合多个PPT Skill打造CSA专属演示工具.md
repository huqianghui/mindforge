---
title: 使用 Skill-Creator 融合多个 PPT Skill 打造 CSA 专属演示工具
created: 2026-03-23
tags: [AI, claude-code, skill-creator, skill, ppt, csa, azure, workflow, orchestration, plugin, eval, sub-agent, multi-agent]
---

# 使用 Skill-Creator 融合多个 PPT Skill 打造 CSA 专属演示工具

作为 Azure CSA（Cloud Solution Architect），做 PPT 是日常高频任务。客户方案演示、内部技术分享、Workshop 培训、架构评审、AI Tour 活动......场景多样，格式各异。在 Claude Code 中积累了多个 PPT 相关的 skill 后，一个自然的想法浮现出来：**能不能用 skill-creator 把它们融合成一个 CSA 专属的 PPT skill？**

本文记录了这次实践的完整过程和关键收获。

---

## 1. 起点：五个 PPT Skill + 若干 MCP Server

在开始之前，手头已经有以下 5 个 PPT 相关的 skill：

| Skill | 核心能力 | 输出格式 | 技术栈 |
|-------|---------|---------|--------|
| **azure-diagrams** | 700+ Azure 组件架构图、泳道图、ERD、Timeline | PNG/SVG | Python diagrams + matplotlib |
| **excalidraw-diagram** | 手绘风格概念图、流程图 | .excalidraw + PNG | Excalidraw JSON + Playwright 渲染 |
| **frontend-slides** | 动画丰富的 HTML 演示，中文友好 | 单 HTML 文件 | 纯 HTML/CSS/JS |
| **pptx** | 底层 OOXML 操作，HTML 转 PPTX | .pptx | Node.js + Python |
| **skywork-ppt** | 本地快速生成/编辑 PPT，模板复用 | .pptx | python-pptx |

此外还有 MCP Server 可配合使用：Tavily（web search）、Figma、Pencil 等。

**目标**：融合这些 skill，做一个 CSA 专属的 PPT skill——不是简单拼接，而是一个能根据场景自动选择最优工具组合的**智能编排层**。

---

## 2. 使用 /skill-creator 启动创建流程

在 Claude Code 中执行 `/skill-creator`，skill-creator 首先询问了几个关键问题来理解需求：

**Q1：统一 skill 的核心工作流应该是怎样的？**
- 回答：混合模式——自动判断 + 可手动选择

**Q2：最终输出格式的优先级？**
- 回答：按场景灵活选择，不固定

**Q3：是否需要模板复用？**
- 回答：两者都要——自有模板 + 外部给的模板

**Q4：最常见使用场景？**
- 客户方案演示
- 内部技术分享
- Workshop/培训
- 架构评审
- AI Tour 活动 PPT
- HR 给模板填内容

这些回答帮助 skill-creator 精准理解了 CSA 角色的实际需求。

---

## 3. Explore Agent 自动分析现有 Skill

skill-creator 启动了 **Explore agent**，花了约 2 分钟（38 次工具调用）详细分析了所有 5 个 skill 的结构和能力。这个过程完全自动，不需要手动介入。

Explore agent 做的事情包括：
- 读取每个 skill 的 `SKILL.md`
- 分析引用的脚本和模板文件
- 梳理每个 skill 的输入输出能力
- 识别能力重叠和互补关系
- 生成完整的**能力矩阵**

这一步的价值在于：它比人手动对比 5 个 skill 要全面得多，尤其是对工具链细节（比如哪个工具的 CJK 字体处理更好）的挖掘。

---

## 4. 核心设计：编排层而非合并层

这是整个过程中**最关键的架构决策**。

skill-creator 设计出的 csa-ppt skill **不复制**子 skill 的代码，而是作为一个**智能编排层**，通过 Decision Framework 做路由。

### Decision Framework 的四个维度

**维度 1：内容类型 --> 选择图表工具**

| 内容需求 | 推荐工具 |
|---------|---------|
| Azure 架构图 | azure-diagrams |
| 手绘/概念图 | excalidraw-diagram |
| 泳道/业务流程 | azure-diagrams（matplotlib） |
| 设计稿/线框图 | Figma 或 Pencil MCP |

**维度 2：交付格式 --> 选择 Deck 工具**

| 交付场景 | 推荐工具 |
|---------|---------|
| 给了 .pptx 模板 | skywork-ppt 或 pptx（OOXML） |
| 客户正式交付 | pptx（html2pptx）或 skywork-ppt |
| 内部分享/演示 | frontend-slides（动画/中文多时）或 skywork-ppt |
| Workshop 教学 | frontend-slides |

**维度 3：语言编码**

| 语言特征 | 推荐路线 |
|---------|---------|
| 中文为主 | 优先 frontend-slides（彻底避开字体嵌入问题） |
| 必须 .pptx 且中文 | pptx 的 html2pptx.js（CJK 处理优于 python-pptx） |

**维度 4：模板处理**

| 模板需求 | 推荐工具 |
|---------|---------|
| 简单文字 + 图片填充 | skywork-ppt |
| 复杂格式/严格占位符 | pptx OOXML |

---

## 5. 三种编排模式

基于 Decision Framework，skill 定义了三种典型的编排模式：

### Pattern 1：Diagrams + Deck（最常用）

1. 先用 azure-diagrams 或 excalidraw 生成图表，保存为高分辨率 PNG
2. 再用 pptx 或 skywork-ppt 组装 Deck，引用生成的图片
3. 验证渲染结果

**典型场景**：客户架构方案演示——先画架构图，再组装成 PPT。

### Pattern 2：Research + Content + Deck

1. Tavily 搜索研究（Azure 文档、案例、最新价格）
2. 组织叙事结构
3. 生成图表
4. 组装 Deck

**典型场景**：内部技术分享——需要先做主题调研再做 PPT。

### Pattern 3：Template + Content Fill

1. 分析模板结构（占位符、版式、品牌元素）
2. 研究内容
3. 生成图表
4. 填充模板
5. 验证

**典型场景**：AI Tour 活动给的品牌模板、HR 给的公司模板做季度分享。

---

## 6. 场景映射速查表

| 场景 | 推荐路线 |
|------|---------|
| AI Tour 活动给的品牌模板 | skywork-ppt --mode template |
| HR 给的公司模板做季度分享 | skywork-ppt --mode template |
| 客户给的模板（格式严格） | pptx OOXML（更精确控制） |
| 需要在模板中嵌入架构图 | azure-diagrams 生成图片 --> skywork-ppt 填充模板 |
| 中文多的内部分享 | frontend-slides |
| 需要丰富动画效果 | frontend-slides |
| 正式客户交付 | pptx（html2pptx）或 skywork-ppt |

---

## 7. 迭代演进：从编排层到 Sub-Agent 架构

初版 skill-creator 生成的是一个简单的编排层 + references 文件。在 Eval 测试和实际使用中，发现对于大型 deck（10+ 页）单一 orchestrator 效率不足，于是进一步演进为**Sub-Agent 架构**。

### 7.1 七个 Sub-Skill

最终版本包含 7 个 sub-skill（比初版多了 planning-with-files）：

| Skill | 描述 |
|-------|------|
| **csa-ppt** | 智能编排器——分析请求并路由到最佳工具链 |
| **azure-diagrams** | 700+ Azure 图标、架构图、泳道流程图、ERD、Timeline |
| **excalidraw-diagram** | 手绘风格图表，适合头脑风暴和概念可视化 |
| **frontend-slides** | 零依赖 HTML 演示，中文内容和代码块友好 |
| **pptx** | OOXML 级 PowerPoint 创建和编辑 |
| **skywork-ppt** | 快速 PPT 生成、模板填充 |
| **planning-with-files** | 基于文件的任务规划和进度跟踪 |

### 7.2 六个 Sub-Agent

编排器**按需调度** sub-agent——不是每次都用全部，而是根据 deck 大小和复杂度决定：

| Agent | 阶段 | 角色 | 何时调度 |
|-------|------|------|---------|
| **Research Agent** | Phase 1 | 收集 Azure 文档、功能、案例、行业背景 | 主题需要 web 调研 |
| **Diagram Agent** | Phase 2 | 生成架构图和技术图表 | Deck 包含架构图 |
| **Slide Builder Agent** | Phase 3 | 逐页构建 slide，按内容智能选择中间格式（可并行） | 大型 deck（10+ 页） |
| **Assembly Agent** | Phase 4 | 归一化混合格式 + 合并 slides + 图表为最终 deck | 多个 builder 产出了不同文件 |
| **Review Agent** | Phase 5 | 7 个维度的质量审查，最多 2 轮 | 5+ 页的 deck 始终执行 |
| **Fix Agent** | Phase 5 | 根据审查报告执行定向修复 | 审查发现问题时 |

### 7.3 按 Deck 大小的调度策略

| Deck 大小 | Orchestrator 直接做 | Sub-Agent 处理 |
|-----------|-------------------|---------------|
| 小型（< 5 页） | 全部直接完成，快速自检 | — |
| 中型（5-10 页） | Phase 1, 2, 4 | Slide Builder（Phase 3）, Review + Fix（Phase 5） |
| 大型（10+ 页） | 仅协调 | 全部 6 个 agent，Slide Builder 并行运行 |

### 7.4 五阶段工作流

```
Plan → Style Contract → Research → Diagrams → Slides → Assembly → Review → Fix → Deliver
                         Phase 1    Phase 2    Phase 3   Phase 4    Phase 5
```

1. **Plan** — 将 deck 拆分为任务（每页/每章一个任务）
2. **Define Style** — 锁定颜色、字体、布局规则到 Style Contract
3. **Execute** — 调研 + 图表 + slides（尽可能并行）
4. **Assemble** — 归一化混合中间格式 + 合并为最终 .pptx 或 HTML
5. **Review & Fix** — 独立质量审查 + 修复循环（最多 2 轮）

### 7.5 智能中间格式选择

Slide Builder Agent **按每页内容选择最佳中间格式**——不强制匹配最终输出格式：

| 内容特征 | 中间格式 | 原因 |
|---------|---------|------|
| 简单要点、英文内容 | `.pptx`（python-pptx） | 直接生成，无转换开销 |
| 纯图表页 | `.pptx`（python-pptx） | 简单图片嵌入 |
| 中文为主（中文为主） | `.html` | CJK 字体渲染更好 |
| 带语法高亮的代码块 | `.html` | 原生代码渲染 |
| 复杂多列布局 | `.html` | CSS flexbox/grid 灵活性 |

Assembly Agent 负责处理格式混合——在合并到最终 deck 之前，归一化所有 slides 到目标格式。

### 7.6 Workspace：可检查的中间产物

每个演示文稿都会在 `outputs/` 下创建一个工作空间文件夹，所有中间文件写入磁盘，可以在最终 deck 组装前**随时审查、编辑或调整**：

```
outputs/{project-name}/
├── task_plan.md              ← Slide 计划（带 checkbox）——可编辑调整顺序
├── progress.md               ← 会话日志——查看进度
├── style_contract.md         ← 颜色、字体、布局规则——可编辑改变外观
├── findings.md               ← 调研结果——在建 slides 前审查
├── diagrams/
│   ├── manifest.md           ← 已生成图表列表
│   ├── rag-architecture.png  ← 架构图——可预览
│   └── data-pipeline.png     ← 流程图——可替换为自己的
├── slides/
│   ├── manifest.md           ← 每页格式（pptx/html）和状态
│   ├── slide-1.pptx          ← 单页 slide——可在 PowerPoint 中查看
│   ├── slide-1-notes.md      ← 演讲备注——可编辑
│   ├── slide-2.html          ← HTML slide——可在浏览器中预览
│   └── ...
└── final/
    ├── final-deck.pptx       ← 组装完成的 deck——最终交付物
    ├── assembly-report.md    ← 合并了什么、做了哪些格式转换
    ├── review_report.md      ← 质量审查结果（逐页 PASS/FIX）
    └── fix_summary.md        ← 审查后修复了什么
```

**人机协作要点**：可以在任何阶段介入——编辑 `task_plan.md` 调整页面、修改 `style_contract.md` 改变风格、替换 `diagrams/` 中的图片、编辑演讲备注等，所有修改都会被下一阶段自动拾取。

### 7.7 Plugin 项目结构

```
csa-ppt-plugin/
├── .claude-plugin/
│   ├── plugin.json              # Plugin manifest
│   └── marketplace.json         # Marketplace 注册
├── skills/
│   ├── csa-ppt/                 # 主编排器
│   │   ├── SKILL.md             # 路由逻辑、工作流、Style Contract
│   │   ├── agents/              # 6 个专业 sub-agent
│   │   │   ├── research-agent.md
│   │   │   ├── diagram-agent.md
│   │   │   ├── slide-builder-agent.md
│   │   │   ├── assembly-agent.md
│   │   │   ├── review-agent.md
│   │   │   └── fix-agent.md
│   │   └── references/          # 各场景工作流指南
│   │       ├── workflow-customer-demo.md
│   │       ├── workflow-tech-sharing.md
│   │       ├── workflow-workshop.md
│   │       ├── workflow-architecture-review.md
│   │       └── workflow-template-fill.md
│   ├── azure-diagrams/          # 700+ Azure 图标、图表脚本
│   ├── excalidraw-diagram/      # 手绘风格图表
│   ├── frontend-slides/         # HTML 演示
│   ├── pptx/                    # OOXML PowerPoint
│   ├── skywork-ppt/             # 快速 PPT 生成
│   └── planning-with-files/     # 任务规划系统
└── README.md
```

---

## 8. 关键收获

### 8.1 Skill-Creator 的工作方式

skill-creator 不是简单拼接代码，它的工作流程是：
1. **充分了解角色和需求场景**——通过对话确认
2. **自动探索所有现有 skill 的能力边界**——Explore agent 深度分析
3. **设计编排层**——不合并，而是路由
4. **为每个典型场景生成具体操作流程文档**——可执行的 reference
5. **迭代演进**——通过 Eval 测试发现瓶颈，从简单路由升级到 Sub-Agent 架构

### 8.2 编排层 vs 合并层

这是最重要的设计理念。编排层带来三个好处：
- **子 skill 更新时，csa-ppt 自动获益**——因为不复制代码，只引用
- **职责清晰**——每个工具做自己最擅长的事
- **灵活组合**——比如 azure-diagrams 生成图 + skywork-ppt 填模板，两个工具各司其职

反过来，如果做"合并层"（把所有代码堆在一起），会导致维护困难、能力退化、版本不同步等一系列问题。

### 8.3 Sub-Agent 架构的价值

从初版的单一编排器到 6 个 Sub-Agent 的演进，解决了两个核心问题：
- **并行执行**——Slide Builder Agent 可以并行处理多页，大型 deck 效率显著提升
- **质量保障**——独立的 Review Agent + Fix Agent 形成审查闭环，不依赖生成者自检

这也是 Agent 架构的一个通用模式：**生成与审查分离**——让写代码/做 slide 的 agent 和审查质量的 agent 互相独立，避免"自己审自己"的盲区。

### 8.4 中文 PPT 的处理方案

这是 CSA 工作中的实际痛点。skill 通过智能中间格式选择给出了更精细的方案：
- **中文多的内容** --> 中间格式用 `.html`，Assembly Agent 负责转换到最终 `.pptx`
- **必须 .pptx 且中文** --> 用 pptx 的 html2pptx.js，比 python-pptx 的 CJK 处理更好
- **英文为主的客户交付** --> 中间格式直接用 `.pptx`，无转换开销
- **混合场景** --> 同一个 deck 中不同页可以用不同中间格式，Assembly Agent 统一归一化

### 8.5 MCP Server 的配合

skill 设计充分利用了已有的 MCP 生态：
- **Tavily**：做内容研究（Azure 文档、案例、最新价格）
- **Figma/Pencil**：设计稿 --> 演示内容
- **Playwright**：截取 Azure Portal 界面截图嵌入 PPT

MCP Server 和 Skill 的配合，本质上是**数据获取**和**内容生成**的协作。Skill 定义"怎么做"，MCP 提供"做什么"。

### 8.6 质量清单与 Review Agent

初版用的是静态质量检查清单，迭代后升级为 **Review Agent 的 7 维度审查**，最多执行 2 轮修复循环。这比一次性检查清单更有效——因为它能发现并修复问题，而不只是列出问题。

---

## 9. Eval 测试验证

skill-creator 还内置了测试评估流程。针对 csa-ppt 设计了 **3 个测试用例**，分别覆盖最核心的使用场景，并同时跑 **with-skill** 和 **baseline**（无 skill 对照组），共 6 个 subagent 并行运行。

### 测试用例设计

| # | 场景 | 测试重点 |
|---|------|---------|
| 1 | 客户 RAG 方案演示（.pptx + 架构图） | 路由到 azure-diagrams 生成架构图 + pptx 组装 deck，中文处理 |
| 2 | 内部 AKS→ACA 技术分享（HTML） | 自动判断用 frontend-slides（中文多 + 内部分享），对比表格 + 迁移步骤 |
| 3 | HR 模板填充（template fill） | 分析模板结构 → 映射内容 → 保持模板风格填充 |

每个测试用例都有 5-6 个断言（assertions）来量化评估，比如：`correct_routing`（路由正确性）、`architecture_diagram_exists`（架构图是否生成）、`chinese_rendering`（中文渲染）、`template_style_preserved`（模板样式保留）等。

### 测试结果

| 测试 | With-Skill | Baseline | 对比 |
|------|-----------|----------|------|
| **Eval 1：客户 RAG 演示** | 10 页 pptx + 2 个架构图 PNG + HTML slides | 10 页 pptx + 2 个 SVG + 演讲稿 | Skill 版用 azure-diagrams 生成了真正的架构图并嵌入 pptx |
| **Eval 2：ACA 技术分享** | 26 页 HTML（Noto Sans SC, viewport 适配, 388s/76K tokens） | 26 页 HTML（暗色主题, 234s/56K tokens） | Skill 版明确路由到 frontend-slides，中文字体 + 响应式更规范 |
| **Eval 3：模板填充** | 8 页 pptx（**166s**/65K tokens） | 8 页 pptx（**370s**/66K tokens） | Skill 版快了 **2.2 倍**（直接路由到 skywork-ppt 模板流程） |

### 关键发现

- **模板场景（Eval 3）收益最大**——with-skill 版本因为 Decision Framework 直接路由到 skywork-ppt 的模板工作流，跳过了 baseline 中的"摸索最佳工具"阶段，速度提升 2.2 倍
- **HTML 场景（Eval 2）质量更高**——with-skill 版本明确使用了 Noto Sans SC 中文字体、viewport 适配（`clamp()` + responsive breakpoints）、`prefers-reduced-motion` 无障碍适配等规范做法
- **架构图场景（Eval 1）路由更精准**——with-skill 版本自动调用 azure-diagrams 生成包含 Azure OpenAI、AI Search 等组件的专业架构图
- Baseline 在没有 skill 指导时也能产出不错的结果（Claude Code 本身能力强），但需要更多时间去"发现"最佳路线

---

## 10. Plugin 打包与发布

创建了 skill 之后，下一步是让同事也能方便地安装和使用。csa-ppt 编排器 + 6 个子 skill + planning-with-files，全部打包成一个 plugin，一键安装即可获得完整能力。

### GitHub 仓库

**[huqianghui/csa-ppt-plugin](https://github.com/huqianghui/csa-ppt-plugin)** — All-in-one presentation toolkit for Azure Cloud Solution Architects

### 安装方式

**方式一：Marketplace 安装（推荐）**

```bash
/plugin marketplace add huqianghui/csa-ppt-plugin
/plugin install csa-ppt@csa-skills
```

**方式二：本地加载测试**

```bash
claude --plugin-dir /path/to/csa-ppt-plugin
```

### 使用方式

安装后用自然语言描述需求即可，csa-ppt 自动触发：

- `"帮我做一个给客户演示Azure RAG方案的PPT"`
- `"做一个内部AKS迁移到ACA的技术分享，中文，HTML格式"`
- `"用这个模板帮我填写季度工作汇报"`
- `"画一个Azure Landing Zone的架构图"`

csa-ppt 会自动完成：分析请求 → 初始化 workspace → 选择工具链和中间格式 → 按 deck 大小调度 sub-agent → 组装归一化 → 质量审查与修复 → 交付。

### 前置依赖

| 依赖 | 用途 |
|------|------|
| Python 3.8+ with `python-pptx` | skywork-ppt 和 azure-diagrams |
| Node.js | pptx 的 html2pptx 转换 |
| `graphviz` 系统包 | azure-diagrams 图表渲染 |
| `diagrams` + `matplotlib` Python 库 | azure-diagrams |

### 其他发布渠道

| 渠道 | 说明 |
|------|------|
| **GitHub Marketplace（当前方式）** | 同事先 `marketplace add` 再 `install`，两步搞定 |
| **Anthropic 官方 Marketplace** | 提交到 `claude.ai/settings/plugins/submit`，审核通过后所有用户可在 `/plugin → Discover` 中搜到 |
| **npm 发布** | `npm publish --access public`，适合已有 npm 生态的团队 |

---

## 11. 总结与建议

这次实践展示了 Claude Code skill 生态的一个重要玩法：**用 skill-creator 将多个专项 skill 编排成一个面向角色的统一 skill**。对于像 CSA 这种需要频繁输出多种格式演示内容的角色，这种编排模式大幅降低了选择工具的心智负担——不用每次都想"这次该用哪个 skill"，直接告诉 csa-ppt 你要做什么，它会帮你选。

**给想做类似事情的人的建议**：

1. **先积累足够多的专项 skill**（至少 3-5 个覆盖不同能力），这是编排的基础
2. **明确自己的角色和典型场景**，这决定了编排层的路由逻辑
3. **让 skill-creator 做编排层设计**，不要手动拼接——它对 skill 能力的分析比人更全面
4. **为每个典型工作流写一个 reference 文档**，让执行时有章可循
5. **保持子 skill 独立**——编排层只做路由，不做执行

最终，这不只是一个工具层面的优化，更是一种**角色化 AI 工具链**的思路：围绕具体角色的工作场景，将散落的 AI 能力编排成一个统一的、智能的、可演进的工作流。

## 相关文章

- [[Claude Code扩展三剑客：Command、Skill与Agent的区别与协作]] — Skill 扩展机制详解
- [[Claude Code的Agent与Subagent架构解析——以Superpowers为例]] — Superpowers Agent 架构
