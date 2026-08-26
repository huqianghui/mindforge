#!/bin/bash
# L1 Hook: Guard private journal directory
#
# ALLOWED: Normal read/edit/write, obsidian-agent, editor-agent
# BLOCKED:
#   1. git operations that could leak private content to GitHub
#   2. ALL knowledge-related agents/skills accessing private journal:
#      - knowledge-extractor, knowledge-maintainer, conflict-detector
#      - extract-knowledge, evolve-wiki, detect-conflict, weekly-review skills

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // empty')

PJ="personal-journal"
DW="daily-work-item"

# --- Rule 1: Block git operations involving private directories ---
if [ "$TOOL_NAME" = "Bash" ]; then
  COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // empty')
  if echo "$COMMAND" | grep -qE '\bgit\b' && echo "$COMMAND" | grep -qi "$PJ"; then
    echo "BLOCKED: git operations involving the private journal directory are forbidden." >&2
    exit 2
  fi
  # daily-work-item: block mutating git subcommands (add/commit/rm/mv/stash/apply/update-index)
  if echo "$COMMAND" | grep -qE '\bgit\b.*\b(add|commit|rm|mv|stash|apply|update-index)\b' && echo "$COMMAND" | grep -qi "$DW"; then
    echo "BLOCKED: daily-work-item/ must NEVER be committed to git/GitHub. .gitignore is the privacy boundary." >&2
    exit 2
  fi
  # Block any attempt to bypass gitignore or git hooks
  if echo "$COMMAND" | grep -qE '\bgit\b.*\badd\b.*(-f|--force)\b' || echo "$COMMAND" | grep -qE '\bgit\b.*--no-verify\b'; then
    echo "BLOCKED: bypassing .gitignore (git add -f) or git hooks (--no-verify) is forbidden in this vault." >&2
    exit 2
  fi
fi

# --- Rule 2: Block knowledge-related agents from accessing private journal ---
if [ "$TOOL_NAME" = "Agent" ]; then
  PROMPT=$(echo "$TOOL_INPUT" | jq -r '.prompt // empty')
  SUBAGENT=$(echo "$TOOL_INPUT" | jq -r '.subagent_type // empty')

  # Check if prompt references private journal
  if echo "$PROMPT" | grep -qi "$PJ"; then
    # Allow agents that legitimately need personal-journal access
    if echo "$SUBAGENT" | grep -qiE '(cultivation-master|obsidian-agent|editor-agent)'; then
      exit 0
    fi

    # Block knowledge-related agent types
    if echo "$SUBAGENT" | grep -qiE '(knowledge-extractor|knowledge-maintainer|conflict-detector)'; then
      echo "BLOCKED: $SUBAGENT must NEVER process the private journal directory." >&2
      exit 2
    fi

    # Block any agent with knowledge extraction intent in prompt
    if echo "$PROMPT" | grep -qiE '(extract|knowledge|wiki|claim|concept|evolve|conflict|detect|maintain)'; then
      echo "BLOCKED: knowledge operations on the private journal directory are forbidden." >&2
      exit 2
    fi
  fi
fi

# --- Rule 3: Block knowledge-related skills targeting private journal ---
if [ "$TOOL_NAME" = "Skill" ]; then
  SKILL=$(echo "$TOOL_INPUT" | jq -r '.skill // empty')
  ARGS=$(echo "$TOOL_INPUT" | jq -r '.args // empty')

  if echo "$ARGS" | grep -qi "$PJ"; then
    if echo "$SKILL" | grep -qiE '(extract-knowledge|evolve-wiki|detect-conflict|weekly-review|knowledge)'; then
      echo "BLOCKED: $SKILL must NEVER target the private journal directory." >&2
      exit 2
    fi
  fi
fi

exit 0
