# Commands Domain Analysis

Scan existing commands, identify which are relevant to the user's validated intent, then perform deep analysis on those in one pass.

## What Commands Are

Commands are reusable multi-step workflows distributed to AI coding agents. Each command has a name, summary, "when to use" list, context validation checkpoints, and numbered steps. Source files live in `**/.packmind/commands/<slug>.md`. Installed copies also exist in agent directories:
- Claude Code: `**/.claude/commands/`
- Cursor: `**/.cursor/commands/`
- GitHub Copilot: `**/.github/prompt/`
Search the project root and all subdirectories.

## Instructions

### Step 1: List Commands

Run `packmind-cli commands list` to get slugs and names. Do NOT read individual command files yet.

### Step 2: Filter Relevant Commands

For each command in the list, ask: **Does the user's intent involve updating this command?**

Relevant means: the intent explicitly targets this command, describes changes to its workflow steps, or references issues with its current behavior. Match by workflow topic using slug and name — no deep reading yet.

Do NOT propose new commands — command creation is a deliberate, user-driven process.

### Step 3: Deep Analyze Flagged Commands

For each relevant command, read `**/.packmind/commands/<slug>.md`. Evaluate the command against the user's requested changes:
- Intent requests adding steps → propose adding them at the specified location
- Intent requests modifying steps → propose the specific modifications
- Intent requests removing steps → propose removal with rationale
- Intent requests updating "When to use" → propose the new triggers
- If conversation context exists, use it as supporting evidence for the evaluation

Apply a HIGH BAR — only propose updates when there is strong evidence:
- The user's intent clearly describes a needed change
- A step references a tool, path, or API that no longer exists
- A critical gap is identified that the intent highlights

Do NOT propose updates for minor wording or changes not supported by the user's intent.

## Output Format

```markdown
## Commands Change Report

### Command Updates
(If none: "No updates needed.")

#### Command Name (`<slug>`)
- **Reason**: what changed or what's missing
- **Steps to add**: step name — description (insert after step N)
- **Steps to modify**: Step N: old → new
- **Steps to remove**: Step N: "step name" — reason
- **Checkpoints to add**: checkpoint question?
```
