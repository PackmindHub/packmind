# Applying Changes

#### Pre-flight: Space Discovery

Before writing any files, discover available spaces:

1. Run `packmind-cli spaces list` to see available spaces.
2. If only **one space** exists, note its slug — the `--space` flag is optional for all commands.
3. If **multiple spaces** exist, note all slugs. The `--space` flag is **required** when staging **new** artifacts. For updates to existing artifacts, the space auto-resolves from the lock file.

#### Group Changes by Intent

Before touching any files, group the approved changes into logical **intents** — coherent units of related change that a human reviewer can understand as a single proposal.

**Grouping rules**:
- Changes that serve the same purpose belong together (e.g., "update authentication patterns" = update auth standard + update auth skill)
- Unrelated changes get separate intents (e.g., "update auth patterns" and "fix test naming convention" are 2 intents)
- A single approved change = 1 intent
- Deprecations (removals) should be their own intent unless tightly coupled with a replacement

Number the intents and present the grouping to the user:

```
## Submission Plan

Intent 1: "<description>" — changes #1, #3
Intent 2: "<description>" — change #5
```

Proceed once the user confirms the grouping, or adjust if they suggest different groupings.

#### For Each Intent (one at a time):

##### Step 1: Write or edit artifact files locally

Edit the files that belong to **your agent** — this lets the user review and test changes in their actual working environment. Do NOT edit files from other agents or the `.packmind/` source-of-truth copies. Only edit one copy per artifact; the CLI handles the rest.

Determine which agent context you are running in. The agent directories are:
- Claude Code: `.claude/`
- Cursor: `.cursor/`
- GitHub Copilot: `.github/`

**Important**: Packmind packages can be installed in subdirectories, not just the repo root. Search for `**/packmind-lock.json` across the entire project tree to find all installed locations. Each lock file lists all files per artifact with their agent — use the path matching your agent.

Before writing or editing any artifact, read the corresponding creation procedure for content format and structure guidance:
- Standard: [create-standard-procedure.md](../../references/create-standard-procedure.md)
- Command: [create-command-procedure.md](../../references/create-command-procedure.md)
- Skill: [create-skill-procedure.md](../../references/create-skill-procedure.md)

**For updated artifacts**, find and edit the file at your agent's path. The lock file tells you the exact relative path. Remember that artifacts may live in nested project directories (e.g. `packages/api/.claude/rules/packmind/`, `apps/backend/.claude/commands/`).

**For new artifacts**, write files at the agent-specific location within the directory that contains the relevant `packmind-lock.json`:

| Artifact Type | Claude Code | Cursor | GitHub Copilot |
|---|---|---|---|
| Standard | `.claude/rules/packmind/<slug>.md` | `.cursor/rules/packmind/<slug>.md` | `.github/instructions/packmind-<slug>.md` |
| Command | `.claude/commands/<slug>.md` | `.cursor/commands/<slug>.md` | `.github/prompts/<slug>.md` |
| Skill | `.claude/skills/<name>/SKILL.md` | `.cursor/skills/<name>/SKILL.md` | `.github/skills/<name>/SKILL.md` |

If there are multiple `packmind-lock.json` locations and it's unclear where the new artifact should go, ask the user which project directory to target.

**For deprecated artifacts (removal)** — do NOT delete the file yourself. The `playbook rm` command handles removal staging. Skip to Step 2.

##### Step 2: Stage changes

For each artifact written or edited in Step 1, stage it with `playbook add`:

```
packmind-cli playbook add <path-to-the-file-you-edited>
```

- If the organization has **multiple spaces** and this is a **new** artifact, add the `--space` flag: `packmind-cli playbook add <path> --space <slug>`
- For **updates**, the space auto-resolves from the lock file — no `--space` needed.
- For **deprecated artifacts**: run `packmind-cli playbook rm <path>` instead.

If any command fails, show the full error output, stop, and ask the user how to proceed — do not retry silently.

> **Mistake?** If you staged the wrong file, run `packmind-cli playbook unstage <path>` to undo it before submitting.

##### Step 3: Review staged changes

Run `packmind-cli playbook status` and present the output to the user. Verify:
- All intended changes for this intent are listed under staged changes
- No unintended changes are included
- Artifact types and change types (created/updated/removed) are correct

Ask the user: **"These changes will be submitted as: '<intent description>'. Confirm?"**

**BLOCK** — do not proceed until the user confirms.

##### Step 4: Submit this intent

Run `packmind-cli playbook submit -m "<intent description>"` to submit all staged changes as proposals for human review.

The message should be a concise summary of the intent (max 1024 characters). If this command fails, show the full error output, stop, and ask the user how to proceed — do not retry silently.

##### Step 5: Report and continue

Tell the user: **"Submitted: '<intent description>'"**

If more intents remain, proceed to the next one (back to Step 1).

#### After All Intents Are Submitted

Once every intent has been submitted, run `packmind-cli whoami` and extract the `Organization:` field from the output. Construct the review URL as `https://app.packmind.ai/org/<organization>/review-changes/`.

Tell the user: **"All change proposals sent to Packmind for review!"**
Then add in italics: *"Review and accept your change proposals at <constructed-url> — once accepted, changes will be propagated and will replace all local copies."*
