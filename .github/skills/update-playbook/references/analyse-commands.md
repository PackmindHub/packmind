# Analyse Commands (Deep)

Perform a detailed analysis of the pre-filtered commands listed in the "Relevant Artifacts" section above. Determine exactly what needs to change.

## What Commands Are

Commands are reusable multi-step workflows distributed to AI coding agents. Each command has:
- A **name** and **summary**
- A **when to use** list — scenarios that trigger this command
- **Context validation checkpoints** — questions to verify before proceeding
- **Steps** — numbered, each with a name and description

Commands live in `.packmind/commands/<slug>.md`.

## Instructions

### Step 1: Read Flagged Commands

For each slug listed in the "Relevant Artifacts" section, read the full command file from `.packmind/commands/<slug>.md`. Extract all steps and checkpoints.

### Step 2: Compare Steps Against Context

For each flagged command, replay the session workflow against the command's steps:
- Were all steps followed in order? (command is up to date)
- Were extra steps needed that the command doesn't include? (add steps)
- Were some steps skipped as unnecessary? (remove or mark optional)
- Did any step cause backtracking or errors? (add checkpoint before it)
- Is the "when to use" list still accurate?

### Step 3: High Bar for Updates

Only propose updates to existing commands when there is strong evidence from the session:
- A step was clearly wrong or caused errors (not just slightly different)
- A critical step was missing and its absence caused backtracking or failure
- A step references a tool, path, or API that no longer exists

Do NOT propose updates for:
- Minor wording improvements
- Steps that were skipped but didn't cause problems
- Reordering that is merely preferential

## Output Format

```markdown
## Commands Analysis Report

### Updates to Existing Commands

#### Command Name (`<slug>`)
- **Reason**: What changed or what's missing
- **Steps to add**:
  - Step name — description (insert after step N)
- **Steps to modify**:
  - Step N: Old → New
- **Steps to remove**:
  - Step N: "step name" — reason
- **Checkpoints to add**:
  * [ ] New checkpoint question?

(If none, write "No updates needed.")

(If none, write "No updates needed.")
```
