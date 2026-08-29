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
- **Links**: `[[wikilinks]]` for internal notes, `[content-title](url)` for external. External link text must use the content title, not the platform name.
- **Images**: `![alt](relative-path)` with correct `../` depth to root `asset/`. **Never** use `![[filename.png]]` wikilink syntax (GitHub cannot render it).
- **Language**: Chinese for body text, English for technical terms. Use `（）` and `—`.
- **personal-journal/**: 私人日志目录。正常读写编辑**允许**（Claude Code 是日记工具），但**禁止**从中提取知识到 wiki，**禁止**提交到 git（L1 Hook + `.gitignore` 双重保护）。
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
3. **Cross-reference** — add `[[wikilinks]]` to related articles; check `README.md` for related topics
4. **Update README** — add article link under the correct section
5. **Refresh search** — run `qmd embed` to update the search index

## Operating Principles

1. **Read before writing** — always read the target file first
2. **Minimal edits** — use Edit tool for surgical changes, never rewrite whole files unnecessarily
3. **Format consistency** — follow the conventions above exactly; don't introduce new formats
4. **Complete linkage（双向绑定）** — when updating task status, also update related notes and references；**反向同样成立**：成文/产出物完成时，必须回绑到当日日记的对应任务（"今天主任务"或"追踪任务"下加 ✅ 行 + `[[wikilink]]`）。"文章 → README/系列导航"和"文章 → 当日任务"两个方向都要做，缺一即视为成文流程未完成
5. **.pen files** — use only Pencil MCP tools (never Read/Grep) to access `.pen` file contents
6. **Diagrams** — 按内容类型选工具：**流程/pipeline/时间线/阶段进度类必须用动态 SVG**（不要只写文字流程或 ASCII 箭头链）——SVG 原生 `animateMotion` 粒子 + CSS `@keyframes` 流动光带/呼吸脉冲，状态分层配色（已完成=青绿 `#2dd4bf` 流动、当前=琥珀 `#fbbf24` 脉冲、规划=灰暗 `#334155` 虚线），Obsidian/GitHub 均可渲染，参考样例 `asset/jalapeno-chip-pipeline-2026-08-26.svg` 与 `asset/jalapeno-timeline-2026-08-26.svg`；架构图/关系图 default to Excalidraw skill。所有图放入根 `asset/`，命名 `主题-YYYY-MM-DD.ext`，embed using `![alt](../asset/filename.ext)`。**嵌入 SVG/图片必须限宽**：alt 文本加 `|宽度` 后缀（如 `![调用链对比|700](../asset/xxx.svg)`），默认 700 左右——不限宽会在 Obsidian 中占满整个页面宽度
7. **个性化记忆优先于默认行为** — 当 Memory 中的用户反馈与你的默认行为模式冲突时，**Memory 中的反馈优先**。具体执行：在做任何有多种方式的操作前（URL 访问、文件创建、格式选择等），先回忆 Memory 中是否有该场景的用户反馈，有则遵守，无则使用默认策略。

- **记忆提权**：Memory 中的行为规则（"必须/禁止"）应提权到 CLAUDE.md 或 Rules；背景知识留在 Memory。详见 `.claude/rules/memory-promotion.md`，使用 `/memory-review` 定期审查。


<!-- OMC:START -->
<!-- OMC:VERSION:4.13.5 -->

# oh-my-claudecode - Intelligent Multi-Agent Orchestration

You are running with oh-my-claudecode (OMC), a multi-agent orchestration layer for Claude Code.
Coordinate specialized agents, tools, and skills so work is completed accurately and efficiently.

<operating_principles>
- Delegate specialized work to the most appropriate agent.
- Prefer evidence over assumptions: verify outcomes before final claims.
- Choose the lightest-weight path that preserves quality.
- Consult official docs before implementing with SDKs/frameworks/APIs.
</operating_principles>

<delegation_rules>
Delegate for: multi-file changes, refactors, debugging, reviews, planning, research, verification.
Work directly for: trivial ops, small clarifications, single commands.
Route code to `executor` (use `model=opus` for complex work). Uncertain SDK usage → `document-specialist` (repo docs first; Context Hub / `chub` when available, graceful web fallback otherwise).
</delegation_rules>

<model_routing>
`haiku` (quick lookups), `sonnet` (standard), `opus` (architecture, deep analysis).
Direct writes OK for: `~/.claude/**`, `.omc/**`, `.claude/**`, `CLAUDE.md`, `AGENTS.md`.
</model_routing>

<skills>
Invoke via `/oh-my-claudecode:<name>`. Trigger patterns auto-detect keywords.
Tier-0 workflows include `autopilot`, `ultrawork`, `ralph`, `team`, and `ralplan`.
Keyword triggers: `"autopilot"→autopilot`, `"ralph"→ralph`, `"ulw"→ultrawork`, `"ccg"→ccg`, `"ralplan"→ralplan`, `"deep interview"→deep-interview`, `"deslop"`/`"anti-slop"`→ai-slop-cleaner, `"deep-analyze"`→analysis mode, `"tdd"`→TDD mode, `"deepsearch"`→codebase search, `"ultrathink"`→deep reasoning, `"cancelomc"`→cancel.
Team orchestration is explicit via `/team`.
Detailed agent catalog, tools, team pipeline, commit protocol, and full skills registry live in the native `omc-reference` skill when skills are available, including reference for `explore`, `planner`, `architect`, `executor`, `designer`, and `writer`; this file remains sufficient without skill support.
</skills>

<verification>
Verify before claiming completion. Size appropriately: small→haiku, standard→sonnet, large/security→opus.
If verification fails, keep iterating.
</verification>

<execution_protocols>
Broad requests: explore first, then plan. 2+ independent tasks in parallel. `run_in_background` for builds/tests.
Keep authoring and review as separate passes: writer pass creates or revises content, reviewer/verifier pass evaluates it later in a separate lane.
Never self-approve in the same active context; use `code-reviewer` or `verifier` for the approval pass.
Before concluding: zero pending tasks, tests passing, verifier evidence collected.
</execution_protocols>

<hooks_and_context>
Hooks inject `<system-reminder>` tags. Key patterns: `hook success: Success` (proceed), `[MAGIC KEYWORD: ...]` (invoke skill), `The boulder never stops` (ralph/ultrawork active).
Persistence: `<remember>` (7 days), `<remember priority>` (permanent).
Kill switches: `DISABLE_OMC`, `OMC_SKIP_HOOKS` (comma-separated).
</hooks_and_context>

<cancellation>
`/oh-my-claudecode:cancel` ends execution modes. Cancel when done+verified or blocked. Don't cancel if work incomplete.
</cancellation>

<worktree_paths>
State: `.omc/state/`, `.omc/state/sessions/{sessionId}/`, `.omc/notepad.md`, `.omc/project-memory.json`, `.omc/plans/`, `.omc/research/`, `.omc/logs/`
</worktree_paths>

## Setup

Say "setup omc" or run `/oh-my-claudecode:omc-setup`.
<!-- OMC:END -->
