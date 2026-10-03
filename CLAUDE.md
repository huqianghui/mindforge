# CLAUDE.md

This file provides guidance to Claude Code when working with this **Obsidian vault**——一个个人笔记库，通过 LLM 辅助构建和维护个人知识库（Personal Knowledge Compiler）。

## What This Is

This is an **Obsidian vault** containing daily work journals, long-form notes on AI/DevOps topics, and a **Personal Knowledge Wiki** (`wiki/`). The vault is not a software project — there is no build system, test suite, or package manager. Claude Code's role here is **knowledge maintainer**（知识编排与维护），not code developer.

## Vault Structure

```
daily-work-item/          # Daily journals: YYYY-MM-DD-周X.md
asset/                    # All images, diagrams (.excalidraw, .png)
Notes/AI/                 # AI-related articles (subdirs: Context-Engineering, Claude-Code, agent, vibe-coding, Design-Tools, RAG)
Notes/DevOps/             # DevOps-related articles
Notes/tool/               # Tool learning notes
Azure/                    # Azure cloud articles
paper/                    # Paper reading notes (YYYY-MM-DD-Title.md)
book/                     # Book notes and philosophy
product/                  # Product analysis
personal-journal/         # ⛔ Private — NEVER read or analyze
wiki/                     # Personal Knowledge Wiki — see wiki/index.md for full structure
README.md                 # Article navigation index (single source of truth for content listing)
```

## Key Rules

**Formatting details** (daily note structure, task syntax, link conventions) → see `.claude/agents/obsidian-agent.md`

Core rules that apply everywhere:
- **Links**: 分场景——**进 git 的文章**（`Notes/` `Azure/` `paper/` `book/` `product/`、README）内部链接**必须**用相对路径 markdown 链接（空格编码 `%20`，如 `[标题](../../wiki/concepts/xxx.md)`），**禁止** `[[wikilink]]`（GitHub 不渲染）；`[[wikilinks]]` 仅用于不进 git 的内容（日记、personal-journal、inbox）和 `wiki/`（知识图谱脚本依赖 `[[]]` 语法解析关系，勿转换）。External links 用 `[content-title](url)`，链接文本必须用内容标题而非平台名。
- **Images**: `![alt](relative-path)` with correct `../` depth to root `asset/`. **Never** use `![[filename.png]]` wikilink syntax (GitHub cannot render it).
- **两个渲染器的交集才是可用语法**：进 git 的文章要在 **Obsidian 和 GitHub 上都正确渲染**，所以可用语法是两者的**交集**；真正无法兼容时**优先 GitHub**（对外可见的那一面）。已踩过的具体项——
  - **引用块里禁止放表格**（以及列表之外的任何块级结构）：`> | a | b |` 在 GitHub 渲染成表格，在 Obsidian 渲染成**裸竖线文本**，整段变成不可读的流水账。`>` 只用于**单行短注**；表格、代码块、图片一律放回正常层级，正常层级两边都渲染。写补充材料时先列表格再决定要不要加注，而不是把表格塞进注里。
  - **callout 只用 GitHub alert 的五种类型**（`NOTE` `TIP` `IMPORTANT` `WARNING` `CAUTION`）：其它类型（如 `[!INFO]`）在 Obsidian 是 callout，在 GitHub 退化成普通引用块。
  - **`![alt|宽度]` 的宽度只对 Obsidian 生效**：GitHub 把 `|700` 当 alt 文本，图照样显示但不限宽。沿用它（Obsidian 侧必须限宽），需要 GitHub 也限宽时才改 `<img src width>`。
  - **判定方式**：不要凭印象断言某语法"应该支持"。改完在 Obsidian 里实际看一眼，或 `grep -c '^> *|'` 这类机械检查扫一遍全目录；渲染假设和实际不符时，相信看到的那个。
- **Language**: Chinese for body text, English for technical terms. Use `（）` and `—`.
- **Frontmatter 是 YAML**：`title` / `description` 等值里**禁止**出现英文冒号加空格（`: `）、行首 `#` 或 ` #`，否则 GitHub（Ruby Psych）整页报 "mapping values are not allowed"。代码类表述改写为无冒号形式（如 `iceTransportPolicy 设为 relay`）或改用中文冒号。写完可用 `python3 /tmp/fm_check.py` 类脚本（PyYAML 解析全部进 git 的 md frontmatter）自检。
- **personal-journal/**: 私人日志目录。正常读写编辑**允许**（Claude Code 是日记工具），但**禁止**从中提取知识到 wiki，**禁止**提交到 git（L1 Hook + `.gitignore` 双重保护）。
- **进 git 的文章默认脱敏**：文章是"技术探讨"，不是项目日志。**禁止**写入真实业务原文（面试题目、客户对话、persona 名）、软件版本号（v0.x.y）、PR/issue 号、代码路径与内部函数/文件名、"bug / 生产事故 / 真实面试" 叙事、指向内部报告的分享链接；一律改成通用示例与相对表述（"第一代/当前"、"会话构建器"、"一个案例"）。**用户提供的素材含这些信息也不得照抄**——确需保留时**必须先与用户确认**再落盘。
- **私人内容永远不进 git**：`daily-work-item/`（含其 `asset/`）与 `personal-journal/` 整目录**永远禁止**提交到 git/GitHub。**禁止** `git add -f` 绕过 `.gitignore`——它就是隐私边界。即使用户说"commit & push"，也只提交非私人路径，**不得**把私人目录列为提交选项。L1 三重 gate：`.git/hooks/pre-commit`（拦截暂存）+ `.git/hooks/pre-push`（扫描待推送 commit）+ `.claude/hooks/guard-private-journal.sh`（拦截 `git add -f`/`--no-verify` 及涉私人目录的 git 变更命令）。

## Agent Routing

| Agent | File | Role |
|-------|------|------|
| `obsidian-agent` | `.claude/agents/obsidian-agent.md` | Vault 操作主力：日记管理、任务追踪、笔记创建、wiki 页面 I/O |
| `knowledge-extractor` | `.claude/agents/knowledge-extractor.md` | 知识提取：从日记/文章中识别概念/方法/决策、提取 Claims |
| `knowledge-maintainer` | `.claude/agents/knowledge-maintainer.md` | 知识维护：更新置信度、标记 stale、生成摘要、刷新关联 |
| `conflict-detector` | `.claude/agents/conflict-detector.md` | 冲突检测：扫描 Claims 发现矛盾（只读） |
| `editor-agent` | `.claude/agents/editor-agent.md` | 文章编辑：质量润色、结构优化、格式统一 |
| `cultivation-master` | `.claude/agents/cultivation-master.md` | 修行陪伴导师：性命双修指导、打卡分析、经典导读、个人日记管理 |

**路由规则**：
- 日记/任务/笔记操作 → `obsidian-agent`（via `/obsidian` 或 `/daily`）
- 知识提取/周报 → `knowledge-extractor`（via `/extract-knowledge` 或 `/weekly-review`）
- Wiki 维护 → `knowledge-maintainer`（via `/evolve-wiki`）
- 冲突检测 → `conflict-detector`（via `/detect-conflict`）
- 文章润色 → `editor-agent`
- 修行/锻炼/个人日记/情绪管理 → `cultivation-master`（via `/guru`）

## Codex Handoff（inbox/codex 取料协议）

`inbox/codex/` 是 Codex 讨论内容的落盘交接区（Codex 侧按 AGENTS.md 约定写入，`status: raw`）。当用户说"从 inbox 取素材写文章"、"用 inbox 里的讨论成文"或类似指令时：

1. 取 `inbox/codex/` 中 `status: raw` 的文件（用户未指定时取最新，列出候选让用户确认）
2. 按 vault 规则成文（格式、脱敏、目录归属、README 导航、交叉引用、**回绑当日日记任务**——见 Operating Principles #4 双向绑定）——素材是完整问答原文，摘要取舍在这一步做
3. 成文后把源文件 frontmatter 的 `status` 改为 `processed` 并在其中补一行 `output: <成文路径>` 作溯源
4. 该目录不进 git（原始素材可能含未脱敏个人信息），成品文章正常提交

完整约定见 `inbox/codex/README.md`。

## Tools

**Obsidian Plugins**: calendar, copilot, dataview, excalibrain, day-planner, icon-folder, kanban, minimal-settings, pandoc, tasks-plugin, table-editor. PDF export via pandoc plugin (system pandoc installed via brew).

**Tavily MCP** is the default web search tool. Use `tavily_search`, `tavily_extract`, `tavily_crawl`, `tavily_map`, `tavily_research` instead of `WebSearch`. `WebFetch` can still be used for specific known URLs.

- **URL 路由**：认证网站（chatgpt.com、docs.google.com、mp.weixin.qq.com 等）**必须直接用 Playwright**，禁止先试 WebFetch/tavily。详见 `.claude/rules/url-routing.md`

**qmd** is a local hybrid search engine (BM25 + vector + LLM reranking). Collection `mindforge` indexes all `.md` files.
- Search: `qmd query "search term"` or `qmd search "keyword" -c mindforge`
- Re-index: `qmd embed`

## Knowledge Layer (LLM Wiki)

The vault includes a **Personal Knowledge Wiki** (`wiki/`) following the Karpathy LLM Wiki model: knowledge is "compiled once and kept current, not re-derived on every query."

**Full documentation**: `wiki/index.md` — contains wiki structure, knowledge schema (Concept/Method/Decision pages + Claims), workflows, relation types, and indexes.

**Key references**:
- `wiki/index.md` — Wiki 导航、Schema 说明、概念/方法/决策索引、知识工作流表
- `wiki/_relations.md` — 8 种关系类型定义（implements/grounds/extends/constrains/contrasts/part-of/uses/produces）
- `wiki/_template_concept.md` / `_template_method.md` / `_template_decision.md` — 页面模板

### Architecture Principles

1. **Vault is Source of Truth** — `wiki/` Markdown files are the persistent knowledge store. Claude Code is the maintainer, not the brain.
2. **Single-Writer** — All file I/O to `wiki/` goes through sequential command pipelines. Never have multiple agents write to the same file simultaneously.
3. **Claim-based Schema** — Knowledge is structured as assertions with evidence, confidence scores (0.0~1.0), and lifecycle status (active/conflicting/outdated/stale).
4. **Incremental Evolution** — Wiki pages evolve through repeated extraction and review cycles. Don't try to build a complete knowledge base in one pass.
5. **Atomic Concept Extraction** — 提取知识时，不仅提取复合/应用层概念，还必须识别**重要的技术性原子概念**并独立建页。判断标准（需同时满足）：① 在文章中被**定义或深入解释**（而非仅提及）；② 是某技术领域的**基础性概念**（如"控制论"、"负反馈"、"RAG"），而非通用术语（如 API、JSON）或非技术概念；③ 被 2+ 篇文章引用或作为其他概念页的理论基础。宁缺勿滥——不确定时不建页。

### Knowledge Ingest Workflow

When adding new knowledge to the vault:

1. **Collect** — save raw source into the appropriate directory
2. **Create note** — write Markdown with proper frontmatter (`title`, `created`, `tags`)
3. **Cross-reference** — add cross-links to related articles（进 git 的文章用相对路径 markdown 链接；非 git 内容才用 `[[wikilinks]]`）; check `README.md` for related topics
4. **Update README** — add article link under the correct section
5. **Refresh search** — run `qmd embed` to update the search index

## Operating Principles

1. **Read before writing** — always read the target file first
2. **Minimal edits** — use Edit tool for surgical changes, never rewrite whole files unnecessarily
3. **Format consistency** — follow the conventions above exactly; don't introduce new formats
4. **Complete linkage（双向绑定）** — when updating task status, also update related notes and references；**反向同样成立**：成文/产出物完成时，必须回绑到当日日记的对应任务（"今天主任务"或"追踪任务"下加 ✅ 行 + `[[wikilink]]`）。"文章 → README/系列导航"和"文章 → 当日任务"两个方向都要做，缺一即视为成文流程未完成
5. **.pen files** — use only Pencil MCP tools (never Read/Grep) to access `.pen` file contents
6. **Diagrams** — 按内容类型选工具：**流程/pipeline/时间线/阶段进度类必须用动态 SVG**（不要只写文字流程或 ASCII 箭头链）——SVG 原生 `animateMotion` 粒子 + CSS `@keyframes` 流动光带/呼吸脉冲，状态分层配色（已完成=青绿 `#2dd4bf` 流动、当前=琥珀 `#fbbf24` 脉冲、规划=灰暗 `#334155` 虚线），Obsidian/GitHub 均可渲染，参考样例 `asset/jalapeno-chip-pipeline-2026-08-26.svg` 与 `asset/jalapeno-timeline-2026-08-26.svg`；架构图/关系图 default to Excalidraw skill。所有图放入根 `asset/`，命名 `主题-YYYY-MM-DD.ext`，embed using `![alt](../asset/filename.ext)`。**嵌入 SVG/图片必须限宽**：alt 文本加 `|宽度` 后缀（如 `![调用链对比|700](../asset/xxx.svg)`），默认 700 左右——不限宽会在 Obsidian 中占满整个页面宽度。**SVG 文字必须可读、不得重叠（2026-10-03 踩坑）**：① 写完**必须**用 `rsvg-convert -w 1400 x.svg -o /tmp/x.png` 渲染成 PNG 并用 Read 工具实际看图核对，禁止只凭坐标推算就交付；② 时间轴/流程节点上只放短标签（如 `#4 ✗`），错误码、说明等长文本放到轴下方**阶梯式引线行**（右侧事件放高行、左侧放低行，引线才不会穿过其他行的文字），不要把长文本居中压在相邻节点上；③ 字号下限：正文 13px、节点标签 15px、标题 18px，画布宽度不少于 1000，文字多就加宽画布或拆行，不要缩字号；④ 文章嵌入宽度随之放到 `|900` 左右。参考改正后样例 `asset/voicelive-avatar-rate-limit-timeline-2026-10-03.svg`
7. **个性化记忆优先于默认行为** — 当 Memory 中的用户反馈与你的默认行为模式冲突时，**Memory 中的反馈优先**。具体执行：在做任何有多种方式的操作前（URL 访问、文件创建、格式选择等），先回忆 Memory 中是否有该场景的用户反馈，有则遵守，无则使用默认策略。
8. **添加任务只做添加** — 用户让"添加任务"时，**只**把该条任务写入日记对应区域，**禁止**附带任何多余动作：不调查/搜索任务内容、不补充链接或背景资料、不写文章或笔记、不主动扩展子项。加完即止。

- **记忆提权**：Memory 中的行为规则（"必须/禁止"）应提权到 CLAUDE.md 或 Rules；背景知识留在 Memory。详见 `.claude/rules/memory-promotion.md`，使用 `/memory-review` 定期审查。


