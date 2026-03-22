# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

This is an **Obsidian vault** (not a software project). It contains daily work journals, long-form notes on AI/DevOps topics, and supporting templates. There is no build system, test suite, or package manager.

## Vault Structure

```
daily-work-item/          # Daily journals: YYYY-MM-DD.md
asset/                    # All images, diagrams (.excalidraw, .png) — single root-level directory
Notes/AI/                 # AI-related articles and reading notes
Notes/DevOps/             # DevOps-related articles
template/日记模版.md       # Daily note template (used by Obsidian daily-notes plugin)
.claude/agents/           # Custom obsidian-agent definition
.claude/commands/         # Custom /obsidian slash command
```

## Key Conventions

**Daily notes** follow a strict four-section structure:
1. `## 任务打卡` — Fixed daily habits (4 items, never changes)
2. `## 追踪任务` — Multi-day tracked tasks carried from previous days
3. `## 今天主任务` — Today's work items, ordered by priority
4. `## 其他事项：` — Free-form notes (note: this heading has a colon, others don't)

**Task syntax** follows Obsidian Tasks plugin conventions:
- `- [ ]` pending, `- [x]` done, `- [/]` in-progress
- Completion: `- [x] task ✅ YYYY-MM-DD`
- Priority: `🔴` (urgent), `⏫` (high)
- Dependencies: `🆔 id` (defines ID), `⛔ id` (depends on)
- Sub-items: tab-indented under parent task

**Links**: Use `[[wikilinks]]` for internal notes, `[title](url)` for external. Task outputs use arrow notation: `→ [[Article Title]]`. Images use standard Markdown syntax `![alt](relative-path)` with relative paths from the article to `asset/` (e.g., `![desc](../asset/diagram.png)`) — this ensures both Obsidian and GitHub can render images correctly. Do NOT use `![[filename.png]]` wikilink syntax for images, as GitHub cannot render it. **External link text must use the content title** (论文标题、项目名、文章标题), NOT the website/platform name (e.g., `[Continually Self-Improving AI](https://arxiv.org/...)` not `[arxiv](...)`, `[obra/superpowers](https://github.com/...)` not `[GitHub](...)`).

**Language**: Chinese for body text, English for technical terms (Claude Code, Superpowers, etc.). Use Chinese full-width parentheses `（）` and em dash `—`.

## Custom Agent

The `obsidian-agent` (`.claude/agents/obsidian-agent.md`) is the primary tool for vault operations. Route all daily note, task tracking, note creation, and export requests through it via `/obsidian` or by spawning it directly with `subagent_type: "obsidian-agent"`.

## Installed Obsidian Plugins

Community: calendar, copilot, dataview, excalibrain, day-planner, icon-folder, kanban, minimal-settings, pandoc, tasks-plugin, table-editor. PDF export is available via the pandoc plugin (system pandoc installed via brew).

## MCP Servers

**Tavily MCP** is configured as the default web search tool in this project. When a task requires web search (finding latest news, looking up documentation, researching topics), use Tavily MCP tools (`tavily_search`, `tavily_extract`, `tavily_crawl`, `tavily_map`, `tavily_research`) instead of the built-in `WebSearch` (which is unavailable in Claude Code). `WebFetch` can still be used for fetching specific known URLs.

## Operating Principles

1. **Read before writing** — always read the target file first
2. **Minimal edits** — use Edit tool for surgical changes, never rewrite whole files
3. **Format consistency** — follow the conventions above exactly; don't introduce new formats
4. **Complete linkage** — when updating task status, also update related notes and references
5. **.pen files** — use only Pencil MCP tools (never Read/Grep) to access `.pen` file contents
6. **Diagrams** — default to using the Excalidraw skill (`excalidraw-diagram`) for all diagram and illustration needs; place all generated files (`.excalidraw` and rendered `.png`) into the root `asset/` directory; when embedding in Markdown, always use the `.png` version with standard Markdown syntax (`![alt](../asset/filename.png)`), not the `.excalidraw` source file and not wikilink syntax
