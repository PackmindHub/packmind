export function getSkillMd(): string {
  return `---
name: packmind-update-playbook
description: >-
  Use when the user explicitly wants to update, add, fix, change, or deprecate
  Packmind playbook artifacts (standards, commands, skills). Triggers on phrases
  like "update packmind standard", "add a packmind skill", "fix packmind command",
  "change packmind playbook", "deprecate a standard", or similar explicit references
  to modifying Packmind artifacts. Do NOT auto-trigger on general coding sessions.
---

# Update Playbook

Evaluate the user's explicit intent against existing Packmind artifacts (standards, commands, skills) to identify what needs creating, updating, or deprecating. Produce a structured change report, then apply approved changes.

## **MANDATORY GATE — Phase 0: Intent Validation**

**STOP. This phase runs FIRST, before anything else. No file reads, no CLI commands, no subagents until this gate passes.**

Analyze the user's input to determine their intent:

#### Case A: No prior conversation / empty input

The skill was invoked standalone with no context. Ask:

"What Packmind artifact do you want to modify? For example: a **standard** (coding rule/convention), a **command** (multi-step workflow), or a **skill** (specialized capability). Please describe what you'd like to change."

**BLOCK** — do not proceed until the user responds.

#### Case B: Prior conversation exists but no playbook-related intent

If the conversation contains no references to updating, adding, fixing, or changing Packmind artifacts, tell the user:

"I didn't detect any intent to modify the Packmind playbook in our conversation. What artifact would you like to update — a standard, command, or skill? Please describe the change."

**BLOCK** — do not proceed until the user responds.

#### Case C: Clear intent found

Extract an **intent summary**:
- **Target artifact(s)**: which standard(s), command(s), or skill(s) to modify (or "new")
- **Kind of change**: create, update, deprecate, fix
- **Specifics**: any details the user provided about the change

Proceed to Phase 1 with this validated intent.

### Phase 1: Intent Summary

> Only proceed after Phase 0 confirms explicit playbook update intent.

Summarize the validated intent before launching any subagents. Extract:
- Which artifact(s) the user wants to modify and what kind of change
- Any specifics the user provided about the desired change
- If prior conversation exists, relevant context that supports the intent (patterns observed, decisions made, problems encountered)

This intent summary is passed as input to all subagents.

### Phase 2: Domain Analysis (parallel)

> **No subagent support?** If the \`Task\` tool is unavailable, perform all three domain analyses sequentially in the current session — run each \`references/domain-*.md\` analysis one after another before proceeding to Phase 3.

Launch all three as \`Task(general-purpose)\` subagents **simultaneously** — do not wait for one before starting the others. Each subagent handles its own listing, filtering, and deep analysis in one pass.

Construct each prompt as:

\`\`\`
## Validated Intent

<the intent summary from Phase 1>

## Analysis Task

<full contents of the corresponding references/domain-*.md file>
\`\`\`

| Subagent | Reference File | Output |
|----------|----------------|--------|
| Standards | \`references/domain-standards.md\` | Standards change report |
| Commands | \`references/domain-commands.md\` | Commands change report |
| Skills | \`references/domain-skills.md\` | Skills change report |

For each domain, decide whether to launch or skip based on the validated intent's **target artifact type**:
- **Launch** if the intent mentions or affects that artifact type (standard, command, or skill)
- **Always launch skills** — skill accuracy must be checked against any behavioral change
- **Skip** if the intent exclusively targets a different artifact type (e.g., "update standard X" → skip commands and skills)

### Phase 3: Consolidated Report

After all subagents complete, consolidate their reports. **Number every change sequentially** so the user can selectively approve:

\`\`\`
## Playbook Change Report

<!-- Only include sections that have changes. Omit empty sections entirely. -->
<!-- Ordering reflects priority: skill accuracy first, then standards, then commands. -->
<!-- New commands are never proposed — command creation is user-driven. -->

### Skill Updates
1. [skill] <name>: <what changed and why>

### New Skills
2. [skill] <name>: <reason>

### Standard Updates
3. [standard] <name>: <what changed and why>

### New Standards
4. [standard] <name>: <reason>

### Command Updates
5. [command] <name>: <what changed and why>

### Deprecations
6. [standard|skill] <name>: <reason>
\`\`\`

**Only include sections that have actual changes** — omit empty sections entirely. Order by priority: skills first, then standards, then commands.

Present this report and ask the user for approval:
- **Single change**: ask "Do you accept this change?"
- **Multiple changes**: ask "Which changes to apply?" and accept:
  - **All**: apply every numbered change
  - **Inclusion list**: "1, 3, 5" or "only 2 and 6"
  - **Exclusion list**: "all but 4" or "everything except 2, 7"

### Phase 4: Apply Changes

For each approved change, edit the local installed files directly:

- **Standards**: \`.packmind/standards/<slug>.md\`
- **Commands**: \`.packmind/commands/<slug>.md\`
- **Skills**: \`.claude/skills/<skill-name>/\` (SKILL.md, references/, etc.)

For **new** artifacts, delegate to the corresponding creation skill (\`packmind-create-standard\`, \`packmind-create-command\`, \`packmind-create-skill\`).

#### Step 1: Preview

Run \`packmind-cli diff\` and present the output. Verify the diff matches the intended changes — no unrelated modifications should be included. If unrelated changes appear, inform the user before proceeding.

#### Step 2: Submit

Run \`packmind-cli diff --submit -m "<concise summary of all changes>"\` to submit the changes as proposals for human review on Packmind.

#### Step 3: Propagate

Ask the user whether they have validated the submitted changes in the **Review Changes** module in Packmind and wish to propagate them locally. If yes, run:

\`\`\`bash
packmind-cli install --recursive
\`\`\`
`;
}
