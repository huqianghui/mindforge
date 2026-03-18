# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

This is an **Obsidian vault** (not a software project). It contains daily work journals, long-form notes on AI/DevOps topics, and supporting templates. There is no build system, test suite, or package manager.

## Vault Structure

```
daily-work-item/          # Daily journals: YYYY-MM-DD.md
daily-work-item/asset/    # Embedded images (PNG) for daily notes
<directory>/asset/        # Each content directory has its own asset/ for diagrams and images
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

**Links**: Use `[[wikilinks]]` for internal notes, `[title](url)` for external. Task outputs use arrow notation: `→ [[Article Title]]`. Images use `![[filename.png]]`.

**Language**: Chinese for body text, English for technical terms (Claude Code, Superpowers, etc.). Use Chinese full-width parentheses `（）` and em dash `—`.

## Custom Agent

The `obsidian-agent` (`.claude/agents/obsidian-agent.md`) is the primary tool for vault operations. Route all daily note, task tracking, note creation, and export requests through it via `/obsidian` or by spawning it directly with `subagent_type: "obsidian-agent"`.

## Installed Obsidian Plugins

Community: calendar, copilot, dataview, excalibrain, day-planner, icon-folder, kanban, minimal-settings, pandoc, tasks-plugin, table-editor. PDF export is available via the pandoc plugin (system pandoc installed via brew).

## Operating Principles

1. **Read before writing** — always read the target file first
2. **Minimal edits** — use Edit tool for surgical changes, never rewrite whole files
3. **Format consistency** — follow the conventions above exactly; don't introduce new formats
4. **Complete linkage** — when updating task status, also update related notes and references
5. **.pen files** — use only Pencil MCP tools (never Read/Grep) to access `.pen` file contents
6. **Diagrams** — default to using the Excalidraw skill (`excalidraw-diagram`) for all diagram and illustration needs; place all generated files (`.excalidraw` and rendered `.png`) into the `asset/` subdirectory of the article's parent directory (e.g., `Azure/asset/`, `Notes/AI/asset/`)
