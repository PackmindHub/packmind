---
name: 'packmind-update-playbook'
description: 'Use when updating, adding, fixing, changing, or deprecating Packmind playbook artifacts (standards, commands, skills). Triggers on explicit phrases like "update packmind standard", "add a packmind skill", "fix packmind command", "change packmind playbook", "deprecate a standard". Also triggers — even without an explicit request — whenever the conversation reveals an opportunity: a new coding convention was just agreed on, a recurring pattern emerged, a workflow changed, a rule was found outdated, or the user says things like "we always do X", "let us remember to Y", "that is the pattern we use". If there is any chance the conversation established a convention or exposed a gap, invoke this skill proactively. This skill defines a mandatory workflow: do NOT edit artifact files directly — follow all phases regardless of change size.'
---

# Update Playbook
Run "packmind-cli --version" to get the current cli installation.
    
Find the highest version at or below the cli version in this list:
- 0.21.0
- 0.23.0
Remember this value as $PACKMIND_CLI_VERSION for the rest of the skill.

Evaluate the user's intent against existing Packmind artifacts (standards, commands, skills) to identify what needs creating or updating. Produce a structured change report, then apply approved changes using the `playbook` CLI workflow.

**⚠️ MANDATORY WORKFLOW — This skill defines a strict sequence: Understanding Your Request → Summarizing Changes → Analyzing Playbook → Change Report → Applying Changes. Do NOT skip steps or edit artifact files directly. Even for a single-line change, follow every step. The workflow ensures changes are reviewed, approved, submitted, and propagated correctly.**

## **Understanding Your Request**

**STOP. This phase runs FIRST, before anything else. No file reads, no CLI commands, no subagents until this gate passes.**

Analyze the user's input and conversation context to determine intent:

#### Case A: No prior conversation / empty input

The skill was invoked standalone with no context. Ask:

"What Packmind artifact do you want to modify? For example: a **standard** (coding rule/convention), a **command** (multi-step workflow), or a **skill** (specialized capability). Please describe what you'd like to change."

**BLOCK** — do not proceed until the user responds.

#### Case B: Explicit intent found

The user explicitly asked to update, add, fix, or change a Packmind artifact. Extract an **intent summary**:
- **Target artifact(s)**: which standard(s), command(s), or skill(s) to modify (or "new")
- **Kind of change**: create or update
- **Specifics**: any details the user provided about the change

Proceed to Summarizing Changes with this validated intent.

#### Case C: Opportunity detected from conversation

The conversation reveals a playbook update opportunity — e.g., a convention was established, a pattern emerged, a workflow was changed, or a known artifact is now stale — but the user did not explicitly ask for a playbook update. Summarize the opportunity and ask:

"I noticed an opportunity to update the Packmind playbook: **<brief description>**. Would you like me to run the update workflow?"

**BLOCK** — do not proceed until the user confirms.

#### Case D: No intent and no opportunity

If the conversation contains no references to modifying Packmind artifacts and no detectable update opportunity, tell the user:

"I didn't detect any intent or opportunity to modify the Packmind playbook. What artifact would you like to update — a standard, command, or skill? Please describe the change."

**BLOCK** — do not proceed until the user responds.

### Summarizing Changes

> Only proceed after Understanding Your Request validates intent (explicit request or confirmed opportunity).

Summarize the validated intent before launching any subagents. Extract:
- Which artifact(s) the user wants to modify and what kind of change
- Any specifics the user provided about the desired change
- If prior conversation exists, relevant context that supports the intent (patterns observed, decisions made, problems encountered)

This intent summary is passed as input to all subagents.

### Analyzing Playbook

> **CLI health check**: Before launching subagents, run `packmind-cli --version`. If it fails, stop immediately and tell the user: "The Packmind CLI is not available or not working. Please check your installation before proceeding." Do not continue.

> **No subagent support?** If the `Task` tool is unavailable, perform all three domain analyses sequentially in the current session — run each `steps/analyze-*.md` analysis one after another before proceeding to Change Report.

Launch all three as `Task(general-purpose)` subagents **simultaneously** — do not wait for one before starting the others. Each subagent handles its own listing, filtering, and deep analysis in one pass.

Construct each prompt as:

```
## Validated Intent

<the intent summary from Summarizing Changes>

## Analysis Task

<full contents of the corresponding steps/analyze-*.md file>
```

| Subagent | Step File | Output |
|----------|-----------|--------|
| Standards | `steps/analyze-standards.md` | Standards change report |
| Commands | `steps/analyze-commands.md` | Commands change report |
| Skills | `steps/analyze-skills.md` | Skills change report |

For each domain, decide whether to launch or skip based on the validated intent's **target artifact type**:
- **Launch** if the intent mentions or affects that artifact type (standard, command, or skill)
- **Always launch skills** — skill accuracy must be checked against any behavioral change
- **Limit scope** to the targeted artifact type when the intent is explicit and narrow (e.g., "update standard X" → standards only, no commands or unrelated skills)

### Change Report

After all subagents complete, consolidate their reports. **Before numbering, deduplicate**: if multiple subagents propose modifying the same artifact, merge those into one entry combining both rationales — do not list the same artifact twice. **Number every change sequentially** so the user can selectively approve:

```
## Playbook Change Report

<!-- Only include sections that have changes. Omit empty sections entirely. -->
<!-- Ordering reflects priority: skill accuracy first, then standards, then commands. -->
<!-- New commands have a high bar — see domain-commands.md for criteria. -->

### Skill Updates
1. [skill] <name>: <what changed and why>

### New Skills
2. [skill] <name>: <reason>

### Standard Updates
3. [standard] <name>: <what changed and why>

### New Standards
4. [standard] <name>: <reason>

### New Commands
5. [command] <name>: <reason>

### Command Updates
6. [command] <name>: <what changed and why>
```

**Only include sections that have actual changes** — omit empty sections entirely. Order by priority: skills first, then standards, then commands.

Present this report and ask the user for approval:
- **Single change**: ask "Do you accept this change?"
- **Multiple changes**: ask "Which changes to apply?" and accept:
  - **All**: apply every numbered change
  - **Inclusion list**: "1, 3, 5" or "only 2 and 6"
  - **Exclusion list**: "all but 4" or "everything except 2, 7"

### Applying Changes

Follow the procedure in [`packmind-versions/<$PACKMIND_CLI_VERSION>/apply-changes.md`](packmind-versions/<$PACKMIND_CLI_VERSION>/apply-changes.md).
Pass it the list of approved changes (with their numbers and details) from the Change Report above.


