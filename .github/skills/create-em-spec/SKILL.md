---
name: 'create-em-spec'
description: 'Create or iterate on an Example Mapping specification from various inputs (GitHub issue, Miro screenshots). Produces a structured EM spec for use with the qa-review skill.'
---

# Create Example Mapping Specification

You are helping the user build an Example Mapping (EM) specification file iteratively. The spec may start from a GitHub issue, Miro screenshots, or a combination of inputs provided over multiple exchanges.

## Core Principles

- **Iterative by design**: The spec is a living document. Each interaction refines it — adding rules, examples, edge cases, or correcting existing ones.
- **Never overwrite silently**: When updating an existing spec, show the user what changed (new rules, modified examples, etc.).
- **No TBD allowed**: The spec is the canonical reference for agents working on the codebase. Never write `TBD`, placeholders, or deferred items. If something is unclear or ambiguous, **stop and ask the user** for clarification before writing it into the spec.
- **Always output in English**: The spec must always be written in English, regardless of the input language. If input is in another language, translate it.

## Workflow

### 1. Determine Input Type

Ask the user what they are starting from, presenting these options:

| Option | Description |
|--------|-------------|
| GitHub issue | A GitHub issue URL containing the user story and acceptance criteria |
| Miro screenshots | Screenshots from an Example Mapping workshop on a Miro board |

Load the corresponding input handler from the `inputs/` directory:
- GitHub issue -> read `inputs/github-issue.md`
- Miro screenshots -> read `inputs/miro-screenshots.md`

Follow the instructions in the input handler to extract the initial content.

**Skip this step** if the user has already provided the input in their message (e.g., pasted a URL or attached screenshots). Detect the input type and load the appropriate handler directly.

### 2. Determine Output Path

Ask the user where to save the spec file. Suggest a default based on the user story title: `em-specs/{slugified-title}.md`.

If a file already exists at that path, read it — this is a **continuation**, not a fresh start. Inform the user and proceed to update the existing spec.

**On subsequent iterations** (the output path was already established earlier in the conversation), skip this step entirely.

### 3. Generate or Update the Spec

Using the extracted content from the input handler, produce (or update) the spec following the **Output Format** below.

When **creating** a new spec:
- Generate all sections from the input
- If anything is unclear, ask the user before writing it
- Present the full spec to the user for review

When **updating** an existing spec:
- Merge new information into the existing structure
- Highlight what was added or changed
- Do not remove existing content unless the user explicitly asks
- If new input **contradicts** existing spec content, highlight the conflict to the user and ask which version to keep. Do not silently overwrite.

### 4. Self-Review (mandatory before presenting)

Before showing the spec to the user, perform **at least two** self-review passes:

1. **Pass 1 — Completeness**: Re-read the original input (re-read the image for Miro screenshots, re-read the issue for GitHub issues). Cross-reference every item in the source against the spec. Check:
   - Every rule from the source is present and correctly titled
   - Every example is placed under the correct rule
   - No examples or rules were missed, duplicated, or swapped between rules
   - Technical rules, events, and check-also items are all accounted for

2. **Pass 2 — Spec quality**: Re-read the source input again. This time check:
   - No `TBD` or placeholders snuck in
   - Examples preserve the original wording verbatim (not reformulated)
   - E2E tags are present where indicated in the source
   - The spec follows the exact output format
   - English translation is accurate (if source was non-English)

Fix any issues found **silently** — do not mention the self-review to the user. Only present the corrected final version.

> **Why two passes?** ~90% of inconsistencies (misplaced examples, missed stickies, reformulated text) are caught by simply looking at the source a second time. The source is already in context, so there is no cost to re-reading it.

### 5. Review and Iterate

After writing the spec, ask the user:

> "Here's the current state of the spec. Would you like to:
> - Add more input (another screenshot, more context)?
> - Refine existing rules or examples?
> - Mark it as done?"

Repeat steps 1-5 until the user marks the spec as done.

## Output Format

The spec MUST follow this exact structure to be compatible with the `qa-review` skill:

```markdown
User Story Review: {Title of the user story}

# Rule 1: {Short rule title describing the expected behavior}

## Example 1

{Setup: describe the initial state}

{Action: describe what the user does}

{Outcome: describe the expected result}

## Example 2 <!-- E2E -->

{Setup}

{Action}

{Outcome}

# Rule 2: {Short rule title}

## Example 1

{Setup}

{Action}

{Outcome}

# Technical rules

- {Implementation constraint, e.g., "`slugify()` must be deterministic and locale-independent"}
- {Performance or infrastructure constraint, e.g., "The operation must be idempotent"}
- {Security or authorization constraint, e.g., "Only `OrganizationAdmin` can perform this action"}
- {Data constraint, e.g., "Max length for the `name` field: 64 characters"}

# User Events

- `{event_name}`: emitted when {trigger description}. Properties: `{property1}`, `{property2}`

---

Check also the following rules are applied:

- {Additional business rule or constraint}
- {Edge case to verify}
```

### Writing Guidelines

- **Rules** should be behavior-focused, not implementation-focused. Write them as "what should happen", not "how to code it."
- **Examples**: **Never reformulate.** Transcribe examples exactly as they appear in the input (sticky note, issue, etc.). Only restructure into Setup / Action / Outcome sections if needed — but keep the original wording verbatim. Do NOT add UI navigation steps, embellishments, or rephrase the content.
- **Technical rules** capture cross-cutting constraints (validation limits, idempotency, authorization, etc.).
- **User Events** list analytics or domain events that should be emitted.
- **Check Also** captures edge cases and additional constraints that don't fit neatly into a rule.
- Use backtick-quoted references for code concepts (class names, field names, event names) so `qa-review` can grep for them.
- Mark examples that should be covered by end-to-end tests with `<!-- E2E -->` after the `## Example N` heading.
- Never write `TBD` or placeholders. If something is uncertain, ask the user before including it.