## Draft Format (CLI 0.23.0)

### Standard Draft Format

For each Standard insight, create a Markdown file at `.packmind/standards/_drafts/<slug>.draft.md`:

```markdown
# Standard Name

What the standard covers and why.

## Scope

Where this standard applies (e.g., 'TypeScript files', 'React components').

## Rules

- Rule starting with an action verb
- Another rule...
```

No code examples required for this version.

### Command Draft Format

For each Command insight, create a Markdown file at `.packmind/commands/_drafts/<slug>.draft.md`:

```markdown
# Command Name

What the command does, why it's useful, and when it's relevant.

## When to Use

- Scenario when this command applies
- Another scenario...

## Checkpoints

- Question to validate before proceeding?

## Steps

### 1. Step Name

What this step does and how to implement it.

### 2. Another Step

Description of next step...
```

---

## Create Items (CLI 0.23.0)

### If user selected "Create all now"

The CLI accepts markdown files directly — no JSON conversion needed.

**IMPORTANT:** The CLI derives the artifact name and slug from the filename. Strip the `.draft` suffix before adding by copying to a temporary file without `.draft`:

**For each standard draft:**

```bash
cp .packmind/standards/_drafts/<slug>.draft.md .packmind/standards/_drafts/<slug>.md
packmind-cli playbook add --space $SPACE_SLUG .packmind/standards/_drafts/<slug>.md
rm .packmind/standards/_drafts/<slug>.md
```

**For each command draft:**

```bash
cp .packmind/commands/_drafts/<slug>.draft.md .packmind/commands/_drafts/<slug>.md
packmind-cli playbook add --space $SPACE_SLUG .packmind/commands/_drafts/<slug>.md
rm .packmind/commands/_drafts/<slug>.md
```

**After adding all items, submit:**

```bash
packmind-cli playbook submit --no-review
```

**Show progress:**
```
Sending standards and commands to your Packmind organization...
+ error-handling-pattern
+ naming-conventions
+ run-full-test-suite

Submitting...
Done: 3 submitted
```

**After a successful submit, add each item to the package:**

For each standard:
```bash
packmind-cli packages add --to @$SPACE_SLUG/$PACKAGE_SLUG --standard <slug>
```

For each command:
```bash
packmind-cli packages add --to @$SPACE_SLUG/$PACKAGE_SLUG --command <slug>
```

### If user selected "Let me review drafts first"

Print:
```
Draft files ready for review at:
  - .packmind/standards/_drafts/
  - .packmind/commands/_drafts/

Edit them as needed, then re-run this skill to continue.
```

Exit the skill.

### If user selected "Cancel"

Print:
```
Onboarding cancelled.
Draft files remain at .packmind/*/_drafts/ if you want to review them later.
```

Exit the skill.

---

### 9.1 Deploy Locally (after successful creation)

Since the onboard skill is present, the user has configured an AI agent. Deploy the created artifacts locally using the package selected/created in Step 2:

```bash
packmind-cli install @$SPACE_SLUG/$PACKAGE_SLUG
```

This deploys to agent-specific folders:

| Agent | Standards | Commands |
|-------|-----------|----------|
| Claude | `.claude/rules/packmind/standard-[slug].md` | `.claude/commands/packmind/[slug].md` |
| Cursor | `.cursor/rules/packmind/standard-[slug].mdc` | `.cursor/commands/packmind/[slug].mdc` |
| Copilot | `.github/instructions/packmind-standard-[slug].instructions.md` | `.github/prompts/packmind-[slug].prompt.md` |

### 9.2 Cleanup and Summary

Delete the draft files, then print final summary:

```
============================================================
  PUBLISHED & DEPLOYED
============================================================

Standards and commands have been sent to your Packmind organization
and deployed to your AI coding assistant's configuration files.

Standards: [N]
  - [Name] (slug: [slug])
    → .packmind/standards/[slug].md
    → [agent-specific path]

Commands: [M]
  - [Name] (slug: [slug])
    → .packmind/commands/[slug].md
    → [agent-specific path]

Draft files cleaned up.
============================================================
```

**If user declines (N):**

Print:

```
Draft files ready for review at:
  - .packmind/standards/_drafts/
  - .packmind/commands/_drafts/

Edit them as needed, then re-run this skill to create them.
```
