export const DOMAIN_COMMANDS = `# Commands Domain Analysis

Scan existing commands, identify which are relevant to the session, then perform deep analysis on those in one pass.

## What Commands Are

Commands are reusable multi-step workflows distributed to AI coding agents. Each command has a name, summary, "when to use" list, context validation checkpoints, and numbered steps. Files live in \\\`.packmind/commands/<slug>.md\\\`.

## Instructions

### Step 1: List Commands

Run \\\`packmind-cli commands list\\\` to get slugs and names. Do NOT read individual command files yet.

### Step 2: Filter Relevant Commands

For each command in the list, ask: **Did this session follow, partially follow, or deviate from this command's workflow?**

Relevant means: the session performed the workflow this command describes, followed similar steps with differences, or the command was implicitly used with missing or outdated steps. Match by workflow topic using slug and name — no deep reading yet.

Do NOT propose new commands — command creation is a deliberate, user-driven process.

### Step 3: Deep Analyze Flagged Commands

For each relevant command, read \\\`.packmind/commands/<slug>.md\\\`. Replay the session workflow against the command's steps:
- All steps followed in order → command is up to date
- Extra steps were needed → propose adding them
- Steps were skipped without issue → consider marking optional
- A step caused backtracking or errors → propose adding a checkpoint before it
- "When to use" list is no longer accurate → propose updating it

Apply a HIGH BAR — only propose updates when there is strong evidence:
- A step was clearly wrong or caused errors (not just slightly different)
- A critical step was missing and its absence caused backtracking or failure
- A step references a tool, path, or API that no longer exists

Do NOT propose updates for minor wording, steps that were skipped without problems, or preferential reordering.

## Output Format

\\\`\\\`\\\`markdown
## Commands Change Report

### Command Updates
(If none: "No updates needed.")

#### Command Name (\\\`<slug>\\\`)
- **Reason**: what changed or what's missing
- **Steps to add**: step name — description (insert after step N)
- **Steps to modify**: Step N: old → new
- **Steps to remove**: Step N: "step name" — reason
- **Checkpoints to add**: checkpoint question?
\\\`\\\`\\\`
`;
