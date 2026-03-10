# Triage Commands

Quickly scan all existing commands and determine which ones are relevant to the work done in this session. Also flag if any new commands should be created.

## What Commands Are

Commands are reusable multi-step workflows distributed to AI coding agents. Each command has:
- A **name** and **summary**
- A **when to use** list — scenarios that trigger this command
- **Steps** — numbered procedure

Commands are managed org-wide via the Packmind CLI and installed via `packmind.json` packages.

## Instructions

### Step 1: List All Commands via CLI

Run `packmind-cli commands list` to get the full catalog. The output provides slug and name for each command.

Do NOT read individual command files at this stage.

### Step 2: Check Relevance

For each command in the list, answer one question: **Did this session follow, partially follow, or deviate from this command's workflow?**

A command is relevant if:
- The session performed the workflow this command describes
- The session's workflow was similar but steps differed
- The command was implicitly followed but with missing or outdated steps

Match by workflow topic using the slug and name — no deep step-by-step analysis.

### Step 3: New Commands

Do NOT propose new commands. Command creation is a deliberate, user-driven process. Only flag existing commands that need updates.

## Output Format

Return exactly this format:

```markdown
## Commands Triage

### Relevant Existing Commands
- `<slug>`: <one-line reason why it's relevant>

(If none, write "No existing commands are relevant to this session.")
```
