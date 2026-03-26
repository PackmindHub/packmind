export function getSkillMd(): string {
  return `---
name: packmind-update-playbook-v2
description: Use when updating, adding, fixing, changing, or deprecating Packmind playbook artifacts (standards, commands, skills). Triggers on explicit phrases like "update packmind standard", "add a packmind skill", "fix packmind command", "change packmind playbook", "deprecate a standard". Also triggers — even without an explicit request — whenever the conversation reveals an opportunity: a new coding convention was just agreed on, a recurring pattern emerged, a workflow changed, a rule was found outdated, or the user says things like "we always do X", "let us remember to Y", "that is the pattern we use". If there is any chance the conversation established a convention or exposed a gap, invoke this skill proactively. This skill defines a mandatory workflow: do NOT edit artifact files directly — follow all phases regardless of change size.
---

# Update Playbook (v2)

Evaluate the user's intent against existing Packmind artifacts (standards, commands, skills) to identify what needs creating or updating. Produce a structured change report, then apply approved changes using the \`playbook\` CLI workflow.

**⚠️ MANDATORY WORKFLOW — This skill defines a strict sequence: Understanding Your Request → Summarizing Changes → Analyzing Playbook → Change Report → Applying Changes. Do NOT skip steps or edit artifact files directly. Even for a single-line change, follow every step. The workflow ensures changes are reviewed, approved, submitted, and propagated correctly.**

### Understanding Your Request

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

> **CLI health check**: Before launching subagents, run \`packmind-cli --version\`. If it fails, stop immediately and tell the user: "The Packmind CLI is not available or not working. Please check your installation before proceeding." Do not continue.

> **No subagent support?** If the \`Task\` tool is unavailable, perform all three domain analyses sequentially in the current session — run each \`references/domain-*.md\` analysis one after another before proceeding to Change Report.

Launch all three as \`Task(general-purpose)\` subagents **simultaneously** — do not wait for one before starting the others. Each subagent handles its own listing, filtering, and deep analysis in one pass.

Construct each prompt as:

\`\`\`
## Validated Intent

<the intent summary from Summarizing Changes>

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
- **Limit scope** to the targeted artifact type when the intent is explicit and narrow (e.g., "update standard X" → standards only, no commands or unrelated skills)

### Change Report

After all subagents complete, consolidate their reports. **Before numbering, deduplicate**: if multiple subagents propose modifying the same artifact, merge those into one entry combining both rationales — do not list the same artifact twice. **Number every change sequentially** so the user can selectively approve:

\`\`\`
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
\`\`\`

**Only include sections that have actual changes** — omit empty sections entirely. Order by priority: skills first, then standards, then commands.

Present this report and ask the user for approval:
- **Single change**: ask "Do you accept this change?"
- **Multiple changes**: ask "Which changes to apply?" and accept:
  - **All**: apply every numbered change
  - **Inclusion list**: "1, 3, 5" or "only 2 and 6"
  - **Exclusion list**: "all but 4" or "everything except 2, 7"

### Applying Changes

> **IMPORTANT**: This phase uses \`packmind-cli playbook\` commands exclusively. Do NOT use \`packmind-cli diff\` commands — they are deprecated.

#### Pre-flight: Space Discovery

Before writing any files, discover available spaces:

1. Run \`packmind-cli spaces list\`. The output looks like:
   \`\`\`
   Available spaces:

   - @my-space
       Name: My Space
   \`\`\`
   Extract the slug from each \`@<slug>\` entry — use the value **without** the \`@\` prefix for the \`--space\` flag.
2. If only **one space** exists, note its slug — the \`--space\` flag is optional for all commands.
3. If **multiple spaces** exist, note all slugs. The \`--space\` flag is **required** when staging **new** artifacts. For updates to existing artifacts, the space auto-resolves from the lock file.

#### Group Changes by Intent

Before touching any files, group the approved changes into logical **intents** — coherent units of related change that a human reviewer can understand as a single proposal.

**Grouping rules**:
- Changes that serve the same purpose belong together (e.g., "update authentication patterns" = update auth standard + update auth skill)
- Unrelated changes get separate intents (e.g., "update auth patterns" and "fix test naming convention" are 2 intents)
- A single approved change = 1 intent
- Deprecations (removals) should be their own intent unless tightly coupled with a replacement

Number the intents and present the grouping to the user:

\`\`\`
## Submission Plan

Intent 1: "<description>" — changes #1, #3
Intent 2: "<description>" — change #5
\`\`\`

Proceed once the user confirms the grouping, or adjust if they suggest different groupings.

#### For Each Intent (one at a time):

##### Step 1: Write or edit artifact files locally

Edit the files that belong to **your agent** — this lets the user review and test changes in their actual working environment. Do NOT edit files from other agents or the \`.packmind/\` source-of-truth copies. Only edit one copy per artifact; the CLI handles the rest.

Determine which agent context you are running in. The agent directories are:
- Claude Code: \`.claude/\`
- Cursor: \`.cursor/\`
- GitHub Copilot: \`.github/\`

**Important**: Packmind packages can be installed in subdirectories, not just the repo root. Search for \`**/packmind-lock.json\` across the entire project tree to find all installed locations. Each lock file lists all files per artifact with their agent — use the path matching your agent.

**For updated artifacts**, find and edit the file at your agent's path. The lock file tells you the exact relative path. Remember that artifacts may live in nested project directories (e.g. \`packages/api/.claude/rules/packmind/\`, \`apps/backend/.claude/commands/\`).

**For new artifacts**, write files at the agent-specific location within the directory that contains the relevant \`packmind-lock.json\`:

| Artifact Type | Claude Code | Cursor | GitHub Copilot |
|---|---|---|---|
| Standard | \`.claude/rules/packmind/<slug>.md\` | \`.cursor/rules/packmind/<slug>.md\` | \`.github/instructions/packmind-<slug>.md\` |
| Command | \`.claude/commands/<slug>.md\` | \`.cursor/commands/<slug>.md\` | \`.github/prompts/<slug>.md\` |
| Skill | \`.claude/skills/<name>/SKILL.md\` | \`.cursor/skills/<name>/SKILL.md\` | \`.github/skills/<name>/SKILL.md\` |

If there are multiple \`packmind-lock.json\` locations and it's unclear where the new artifact should go, ask the user which project directory to target.

**For deprecated artifacts (removal)** — do NOT delete the file yourself. Skip directly to Step 2.

##### Step 2: Stage changes

Stage each artifact depending on the change type:

- **New artifact** (created in Step 1):
  \`packmind-cli playbook add <path>\`
  If the organization has **multiple spaces**, add the \`--space\` flag: \`packmind-cli playbook add <path> --space <slug>\`

- **Updated artifact** (edited in Step 1):
  \`packmind-cli playbook add <path>\`
  The space auto-resolves from the lock file — no \`--space\` needed.

- **Deprecated artifact** (no file edit — removal only):
  \`packmind-cli playbook rm <path>\`
  This stages the artifact for removal. Do NOT delete the file manually — the CLI handles cleanup after submission.

If any command fails, show the full error output, stop, and ask the user how to proceed — do not retry silently.

> **Mistake?** If you staged the wrong file, run \`packmind-cli playbook unstage <path>\` to undo it before submitting.

##### Step 3: Review staged changes

Run \`packmind-cli playbook status\` and present the output to the user. Verify:
- All intended changes for this intent are listed under staged changes
- No unintended changes are included
- Artifact types and change types (created/updated/removed) are correct

Ask the user: **"These changes will be submitted as: '<intent description>'. Confirm?"**

**BLOCK** — do not proceed until the user confirms.

##### Step 4: Submit this intent

Run \`packmind-cli playbook submit -m "<intent description>"\` to submit all staged changes as proposals for human review.

The message should be a concise summary of the intent (max 1024 characters). If this command fails, show the full error output, stop, and ask the user how to proceed — do not retry silently.

##### Step 5: Report and continue

Tell the user: **"Submitted: '<intent description>'"**

If more intents remain, proceed to the next one (back to Step 1).

#### After All Intents Are Submitted

Once every intent has been submitted, run \`packmind-cli whoami\` and extract the \`Organization:\` field from the output. Construct the review URL as \`https://app.packmind.ai/org/<organization>/review-changes/\`.

Tell the user: **"All change proposals sent to Packmind for review!"**
Then add in italics: *"Review and accept your change proposals at <constructed-url> — once accepted, changes will be propagated and will replace all local copies."*

`;
}
