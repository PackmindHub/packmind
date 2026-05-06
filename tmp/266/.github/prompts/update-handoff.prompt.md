---
description: 'Update an existing handoff document with the current session''s progress, preserving prior work history while refreshing status and next steps. Falls back to creating a new handoff if no source file is found.'
agent: 'agent'
---

Update an existing handoff document with the current session's progress, preserving prior work history while refreshing status and next steps. Falls back to creating a new handoff if no source file is found.

## When to Use

- When you resumed from a handoff document and want to save updated progress back to the same file
- When you want to refresh an existing handoff with new discoveries, completed work, and revised next steps
- When ending a session that was started via /resume_handoff and want to persist context for the next session

## Context Validation Checkpoints

* [ ] Can you identify the handoff file to update (from argument, or from a previous /resume_handoff invocation in this conversation)?
* [ ] Is there meaningful progress (new work done, status changes, or updated next steps) to record?

## Command Steps

### Step 1: Resolve the handoff file path

Determine which handoff file to update using this priority order:
1. If an argument was provided (e.g., `$ARGUMENTS` or `$1`), use that as the handoff file path.
2. If this session was resumed from a handoff, look for a previous `/resume_handoff` invocation in the conversation history — the argument passed to it is the file path.
3. If neither is found, **fall back to creating a new handoff**: generate a new file at `./tmp/handoffs/handoff_YYYYMMDD_HHMMSS.md` and inform the user that no existing handoff was found so a new one is being created.

### Step 2: Read the existing handoff

Read the resolved handoff file to understand its current content. Parse all sections: Task, Scope, Files, Discoveries, Work Done, Status, Next Steps, and Code. This provides the baseline that will be merged with new session data.

### Step 3: Rewrite the handoff in place

Overwrite the handoff file with updated content. Follow these merge rules for each section:
- **Task**: Keep original (update only if scope fundamentally changed).
- **Scope**: Keep or refine based on new understanding.
- **Files**: Merge — combine original file references with new files touched in this session. Use `path/to/file:lineNumber` format.
- **Discoveries**: Merge — append new findings from this session to the original list. Do not remove prior discoveries.
- **Work Done**: **Append only** — add new completed work entries below the existing list. Never remove previous entries. Include commit hashes where available.
- **Status**: **Replace** — write the current state of the work (what's done now, what remains, test status).
- **Next Steps**: **Replace** — write the updated actionable checklist of remaining tasks.
- **Code**: Update with the most relevant code snippets from the current state.

Keep the document succinct but complete — another agent should be able to resume immediately with full context.

### Step 4: Confirm and summarize

After saving, confirm the file path to the user and provide a brief summary of what changed: how many new work items were added, key status changes, and the updated next steps count.
