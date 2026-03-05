export function getSkillMd(): string {
  return `---
name: packmind-update-playbook
description: Use when evaluating and updating the Packmind playbook (standards, commands, skills) after a coding session. Triggers on "update the playbook", "sync standards", "check if we need new standards", or after sessions where patterns emerged.
---

# Update Playbook

Evaluate the current conversation context against existing Packmind artifacts (standards, commands, skills) to identify what needs creating, updating, or deprecating. Produce a structured change report, then apply approved changes.

## Process

### Phase 1: Context Summary

Summarize the current conversation context before launching any subagents. Extract:
- What was built or changed
- What patterns emerged or were established
- What decisions were made and why
- What mistakes were corrected
- What problems were solved

This summary is passed as input to all subagents.

### Phase 2: Domain Analysis (parallel)

> **No subagent support?** If the \\\`Task\\\` tool is unavailable, perform all three domain analyses sequentially in the current session — run each \\\`references/domain-*.md\\\` analysis one after another before proceeding to Phase 3.

Launch all three as \\\`Task(general-purpose)\\\` subagents **simultaneously** — do not wait for one before starting the others. Each subagent handles its own listing, filtering, and deep analysis in one pass.

Construct each prompt as:

\\\`\\\`\\\`
## Conversation Context

<the context summary from Phase 1>

## Analysis Task

<full contents of the corresponding references/domain-*.md file>
\\\`\\\`\\\`

| Subagent | Reference File | Output |
|----------|----------------|--------|
| Standards | \\\`references/domain-standards.md\\\` | Standards change report |
| Commands | \\\`references/domain-commands.md\\\` | Commands change report |
| Skills | \\\`references/domain-skills.md\\\` | Skills change report |

\\\`\\\`\\\`dot
digraph phase2_skip {
    "Each domain subagent" [shape=doublecircle];
    "Clearly zero relevance to this domain?" [shape=diamond];
    "Launch subagent" [shape=box];
    "Skip subagent" [shape=box];

    "Each domain subagent" -> "Clearly zero relevance to this domain?";
    "Clearly zero relevance to this domain?" -> "Skip subagent" [label="yes"];
    "Clearly zero relevance to this domain?" -> "Launch subagent" [label="no (default)"];
}
\\\`\\\`\\\`

When in doubt, launch. Skipping is for obvious mismatches only (e.g., a CSS-only session vs. database standards).

### Phase 3: Consolidated Report

After all subagents complete, consolidate their reports. **Number every change sequentially** so the user can selectively approve:

\\\`\\\`\\\`
## Playbook Change Report

### Skill Updates (keep current)
1. [skill] <name>: <what changed and why>

### New Skills
2. [skill] <name>: <reason>

### Standard Updates
3. [standard] <name>: <what changed and why>

### New Standards (lintable rules only)
4. [standard] <name>: <reason>

### Command Updates (strong evidence only)
5. [command] <name>: <what changed and why>
<!-- New commands are never proposed — command creation is user-driven. Only updates appear here. -->

### Deprecations
6. [standard|skill] <name>: <reason>

### No Changes Needed
- [standards|commands|skills]: <brief explanation>
\\\`\\\`\\\`

**Ordering reflects priority**: skill accuracy first, then standards, then commands. New commands are never proposed.

Present this report and ask the user which changes to apply:
- **All**: apply every numbered change
- **Inclusion list**: "1, 3, 5" or "only 2 and 6"
- **Exclusion list**: "all but 4" or "everything except 2, 7"

### Phase 4: Apply Changes

For each approved change, edit the local installed files directly:

- **Standards**: \\\`.packmind/standards/<slug>.md\\\`
- **Commands**: \\\`.packmind/commands/<slug>.md\\\`
- **Skills**: \\\`.claude/skills/<skill-name>/\\\` (SKILL.md, references/, etc.)

For **new** artifacts, delegate to the corresponding creation skill (\\\`packmind-create-standard\\\`, \\\`packmind-create-command\\\`, \\\`packmind-create-skill\\\`).

#### Step 1: Preview

Run \\\`packmind-cli diff\\\` and present the output. Verify the diff matches the intended changes — no unrelated modifications should be included. If unrelated changes appear, inform the user before proceeding.

#### Step 2: Submit

Run \\\`packmind-cli diff --submit -m "<concise summary of all changes>"\\\` to submit the changes as proposals for human review on Packmind.

#### Step 3: Propagate

Ask the user whether they have validated the submitted changes on Packmind and wish to propagate them locally. If yes, run:

\\\`\\\`\\\`bash
packmind-cli install --recursive
\\\`\\\`\\\`
`;
}
