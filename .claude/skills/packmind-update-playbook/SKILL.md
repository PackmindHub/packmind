---
name: packmind-update-playbook
description: Use when updating, adding, fixing, changing, or deprecating Packmind playbook artifacts (standards, commands, skills). Triggers on explicit phrases like "update packmind standard", "add a packmind skill", "fix packmind command", "change packmind playbook", "deprecate a standard". Also triggers — even without an explicit request — whenever the conversation reveals an opportunity: a new coding convention was just agreed on, a recurring pattern emerged, a workflow changed, a rule was found outdated, or the user says things like "we always do X", "let us remember to Y", "that is the pattern we use". If there is any chance the conversation established a convention or exposed a gap, invoke this skill proactively. This skill defines a mandatory workflow: do NOT edit artifact files directly — follow all phases regardless of change size.
---

# Update Playbook

Evaluate the user's intent against existing Packmind artifacts (standards, commands, skills) to identify what needs creating or updating. Produce a structured change report, then apply approved changes.

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

> **No subagent support?** If the `Task` tool is unavailable, perform all three domain analyses sequentially in the current session — run each `references/domain-*.md` analysis one after another before proceeding to Change Report.

Launch all three as `Task(general-purpose)` subagents **simultaneously** — do not wait for one before starting the others. Each subagent handles its own listing, filtering, and deep analysis in one pass.

Construct each prompt as:

```
## Validated Intent

<the intent summary from Summarizing Changes>

## Analysis Task

<full contents of the corresponding references/domain-*.md file>
```

| Subagent | Reference File | Output |
|----------|----------------|--------|
| Standards | `references/domain-standards.md` | Standards change report |
| Commands | `references/domain-commands.md` | Commands change report |
| Skills | `references/domain-skills.md` | Skills change report |

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

#### Step 1: Write new artifacts

For each approved **new** artifact, read the corresponding creation procedure from `references/`, then write the file(s) at the specified location:

| Artifact Type | Creation Procedure | Write Path |
|---|---|---|
| Standard | [create-standard-procedure.md](references/create-standard-procedure.md) | `.packmind/standards/<slug>.md` |
| Command | [create-command-procedure.md](references/create-command-procedure.md) | `.packmind/commands/<slug>.md` |
| Skill | [create-skill-procedure.md](references/create-skill-procedure.md) | `<agent-skills-dir>/<skill-name>/SKILL.md` |

For skills: check which agent skills directory exists at the project root (`.claude/skills/`, `.cursor/skills/`, `.github/skills/`) — pick the first found in that priority order. If none exist, create `.claude/skills/`.

After writing each new artifact, run `packmind-cli diff add <path> -m "<description>"` to submit it as a change proposal. This auto-submits the new artifact. The message must be non-empty and max 1024 characters. If this command fails, show the full error output, stop, and ask the user how to proceed — do not retry silently.

#### Step 2: Preview updates

For each approved **update** to an existing artifact, edit the local installed files directly. Search the project root **and all subdirectories** (e.g. `src/backend/.cursor/skills/`, `packages/api/.packmind/standards/`):

- **Standards**: `**/.packmind/standards/<slug>.md` (source of truth). Installed copies also exist in:
  - Claude Code: `**/.claude/rules/packmind/`
  - Cursor: `**/.cursor/rules/packmind/`
  - GitHub Copilot: `**/.github/instructions/packmind-*`
- **Commands**: `**/.packmind/commands/<slug>.md` (source of truth). Installed copies also exist in:
  - Claude Code: `**/.claude/commands/`
  - Cursor: `**/.cursor/commands/`
  - GitHub Copilot: `**/.github/prompts/`
- **Skills**: no `.packmind/` source — skills live directly in agent directories:
  - Claude Code: `**/.claude/skills/<skill-name>/`
  - Cursor: `**/.cursor/skills/<skill-name>/`
  - GitHub Copilot: `**/.github/skills/<skill-name>/`

If the same artifact exists in multiple agent directories, edit the one matching the current session context: Claude Code → `.claude/`, Cursor → `.cursor/`, GitHub Copilot → `.github/`. If the context is unclear and multiple directories exist, list them and ask the user which agent directory to update.

Run `packmind-cli diff` and present the output. List all artifacts included in the diff. Since it is not possible to select individual changes, **all detected modifications will be submitted together**.

- If the diff contains only the intended changes, proceed to Step 3.
- If the diff contains **additional or unrelated artifacts**, inform the user by listing them and clarifying that they will be included in the submission as well.

#### Step 3: Submit updates

Run `packmind-cli diff --submit -m "<concise summary of all changes>"` to submit the changes as proposals for human review on Packmind. If this command fails, show the full error output, stop, and ask the user how to proceed — do not retry silently.

Once submitted, run `packmind-cli whoami` and extract the `Organization:` field from the output. Construct the review URL as `https://app.packmind.ai/org/<organization>/space/global/review-changes/`.

Tell the user: **"✅ Successfully sent to Packmind for review!"**
Then add in italics: *"Review and accept your change proposals at <constructed-url> — once accepted, changes will be propagated and will replace all local copies."*

