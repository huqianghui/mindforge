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

## Agent Routing

| Agent | File | Role |
|-------|------|------|
| `obsidian-agent` | `.claude/agents/obsidian-agent.md` | Vault 操作主力：日记管理、任务追踪、笔记创建、wiki 页面 I/O |
| `knowledge-extractor` | `.claude/agents/knowledge-extractor.md` | 知识提取：从日记/文章中识别概念/方法/决策、提取 Claims |
| `knowledge-maintainer` | `.claude/agents/knowledge-maintainer.md` | 知识维护：更新置信度、标记 stale、生成摘要、刷新关联 |
| `conflict-detector` | `.claude/agents/conflict-detector.md` | 冲突检测：扫描 Claims 发现矛盾（只读） |
| `editor-agent` | `.claude/agents/editor-agent.md` | 文章编辑：质量润色、结构优化、格式统一 |

**路由规则**：
- 日记/任务/笔记操作 → `obsidian-agent`（via `/obsidian` 或 `/daily`）
- 知识提取/周报 → `knowledge-extractor`（via `/extract-knowledge` 或 `/weekly-review`）
- Wiki 维护 → `knowledge-maintainer`（via `/evolve-wiki`）
- 冲突检测 → `conflict-detector`（via `/detect-conflict`）
- 文章润色 → `editor-agent`

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
4. **Complete linkage** — when updating task status, also update related notes and references
5. **.pen files** — use only Pencil MCP tools (never Read/Grep) to access `.pen` file contents
6. **Diagrams** — default to Excalidraw skill; place files into root `asset/`; embed using `![alt](../asset/filename.png)`
7. **个性化记忆优先于默认行为** — 当 Memory 中的用户反馈与你的默认行为模式冲突时，**Memory 中的反馈优先**。具体执行：在做任何有多种方式的操作前（URL 访问、文件创建、格式选择等），先回忆 Memory 中是否有该场景的用户反馈，有则遵守，无则使用默认策略。

- **记忆提权**：Memory 中的行为规则（"必须/禁止"）应提权到 CLAUDE.md 或 Rules；背景知识留在 Memory。详见 `.claude/rules/memory-promotion.md`，使用 `/memory-review` 定期审查。
