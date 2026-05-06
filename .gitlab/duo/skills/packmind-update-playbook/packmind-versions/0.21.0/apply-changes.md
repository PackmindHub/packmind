# Applying Changes

> **Prerequisite**: Run `packmind-cli --version`. If it fails, stop immediately and tell the user: "The Packmind CLI is not available or not working. Please check your installation before proceeding." Do not continue.

## Step 1: Write new artifacts

For each approved **new** artifact, read the corresponding creation procedure from `references/`, then write the file(s) at the specified location:

| Artifact Type | Creation Procedure | Write Path |
|---|---|---|
| Standard | [create-standard-procedure.md](../references/create-standard-procedure.md) | `.packmind/standards/<slug>.md` |
| Command | [create-command-procedure.md](../references/create-command-procedure.md) | `.packmind/commands/<slug>.md` |
| Skill | [create-skill-procedure.md](../references/create-skill-procedure.md) | `<agent-skills-dir>/<skill-name>/SKILL.md` |

For skills: check which agent skills directory exists at the project root (`.claude/skills/`, `.cursor/skills/`, `.github/skills/`) — pick the first found in that priority order. If none exist, create `.claude/skills/`.

After writing each new artifact, run `packmind-cli diff add <path> -m "<description>"` to submit it as a change proposal. This auto-submits the new artifact. The message must be non-empty and max 1024 characters. If this command fails, show the full error output, stop, and ask the user how to proceed — do not retry silently.

## Step 2: Preview updates

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

## Step 3: Submit updates

Run `packmind-cli diff --submit -m "<concise summary of all changes>"` to submit the changes as proposals for human review on Packmind. If this command fails, show the full error output, stop, and ask the user how to proceed — do not retry silently.

Once submitted, run `packmind-cli whoami` and extract the `Organization:` field from the output. Construct the review URL as `https://app.packmind.ai/org/<organization>/space/global/review-changes/`.

Tell the user: **"✅ Successfully sent to Packmind for review!"**
Then add in italics: *"Review and accept your change proposals at <constructed-url> — once accepted, changes will be propagated and will replace all local copies."*
