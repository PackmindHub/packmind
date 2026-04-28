---
description: 'Generate a structured handoff Markdown document from the current conversation with key sections and saved under `./tmp/handoffs/` to enable fast, accurate agent context transfer when handing off ongoing work to another agent.'
agent: 'agent'
---

---
description: Generate a handoff document for agent context transfer
argument-hint: [optional-filename]
---

Generate a structured handoff document from our current conversation and save it to `./tmp/handoffs/handoff_YYYYMMDD_HHMMSS.md` (or use filename if provided: $1).

Include these sections:
- **Task**: Brief task name/description / instruction
- **Scope**: What needs to be done
- **Files**: All relevant files with line numbers (format: `path/to/file:123`)
- **Discoveries**: Key findings and insights from the work
- **Work Done**: Completed tasks and implementations
- **Status**: Current state - what's done, what remains
- **Next Steps**: Actionable checklist of remaining tasks
- **Code**: Relevant code snippets with context

Make it succinct but complete - another agent should be able to resume immediately with full context.