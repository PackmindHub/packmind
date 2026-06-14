---
issue: 357
title: 'Support Claude Skill frontmatter `disallowed-tools`'
date: 2026-06-11
---

# Example Mapping: Support `disallowed-tools` in Claude Skill Frontmatter

## Story

As a developer authoring Claude Code skills,  
I want to declare `disallowed-tools` in a skill's YAML frontmatter,  
So that Claude Code can restrict which tools are available when invoking the skill,  
and Packmind stores and displays that constraint faithfully.

---

## Rules and Examples

### Rule 1 — `disallowed-tools` is a registered Claude Code additional field

`CLAUDE_CODE_ADDITIONAL_FIELDS` must include `'disallowed-tools': 'disallowedTools'`, and
`CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER` must append `'disallowedTools'` (after `shell`).
The inverse map `CAMEL_TO_YAML_KEY` must therefore include `'disallowedTools': 'disallowed-tools'`.

#### Example 1.1 — YAML key `disallowed-tools` maps to camelCase storage key `disallowedTools`

```gherkin
Given CLAUDE_CODE_ADDITIONAL_FIELDS is imported from skillAdditionalProperties
When the entry for 'disallowed-tools' is looked up
Then the value equals 'disallowedTools'
```

#### Example 1.2 — `disallowedTools` is the last entry in `CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER`

```gherkin
Given CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER is imported from skillAdditionalProperties
When the last element is read
Then it equals 'disallowedTools'
And 'shell' is the element immediately before it
```

#### Example 1.3 — `CAMEL_TO_YAML_KEY` round-trips the new entry

```gherkin
Given CAMEL_TO_YAML_KEY is imported from skillAdditionalProperties
When the entry for 'disallowedTools' is looked up
Then the value equals 'disallowed-tools'
```

#### Example 1.4 — `sortAdditionalPropertiesKeys` places `disallowedTools` after `shell`

```gherkin
Given a properties object { shell: true, disallowedTools: ['Monitor'] }
When sortAdditionalPropertiesKeys is called on the object
Then the returned entries are [['shell', true], ['disallowedTools', ['Monitor']]]
```

---

### Rule 2 — `playbook add` succeeds for skills whose SKILL.md contains `disallowed-tools`

Running `playbook add <skill-path>` on a skill with `disallowed-tools` in its frontmatter
must exit with code 0 and emit no validation errors.

#### Example 2.1 — Happy path: add skill with a YAML-list `disallowed-tools`

```gherkin
Given the Packmind dev stack is running at http://localhost:4200
And .claude/skills/create-em-spec/SKILL.md has the frontmatter:
  ---
  name: create-em-spec
  description: 'Scaffold and run a new end-to-end spec file.'
  disallowed-tools:
    - Monitor
    - AskUserQuestions
  ---
When `node ./dist/apps/cli/main.cjs playbook add .claude/skills/create-em-spec` is run
Then the command exits with code 0
And stdout contains no text matching /error|unknown field|invalid/i
```

#### Example 2.2 — Counter-example: unrecognised frontmatter key is still rejected

```gherkin
Given a SKILL.md whose frontmatter contains the key `totally-unknown-key: true`
When `playbook add` is run on that skill
Then the command exits with a non-zero code
And stdout contains a message indicating the field is unrecognised
```

---

### Rule 3 — `playbook submit --no-verify` persists `disallowedTools` to the API without error

After adding the skill, submitting it must transmit `disallowedTools` inside the skill's
`additionalProperties` payload and receive a 2xx response from the API.

#### Example 3.1 — Submit stores `disallowedTools` as an array

```gherkin
Given .claude/skills/create-em-spec/SKILL.md has `disallowed-tools: [Monitor, AskUserQuestions]`
And `playbook add .claude/skills/create-em-spec` has already succeeded
When `node ./dist/apps/cli/main.cjs playbook submit --no-verify` is run
Then the command exits with code 0
And the API returns no error response
And the persisted skill has additionalProperties.disallowedTools equal to ['Monitor', 'AskUserQuestions']
```

#### Example 3.2 — `disallowed-tools` given as a comma-separated string is also accepted

```gherkin
Given .claude/skills/create-em-spec/SKILL.md has `disallowed-tools: "Monitor, AskUserQuestions"`
And `playbook add` has succeeded
When `playbook submit --no-verify` is run
Then the command exits with code 0
And the persisted skill has additionalProperties.disallowedTools set to a non-empty value
```

---

### Rule 4 — The Packmind UI displays `disallowed-tools` in the skill's frontmatter panel

After the skill is submitted, the skill detail page must show a `disallowed-tools` row in
its Frontmatter section (under "More details") with the correct values.

#### Example 4.1 — Frontmatter panel renders `disallowed-tools` with its values

```gherkin
Given the skill `create-em-spec` has been submitted with:
  disallowed-tools: [Monitor, AskUserQuestions]
When a signed-in user opens the skill detail page in the Packmind UI
And expands the Frontmatter → "More details" section
Then the panel shows a row labelled `disallowed-tools`
And the row value contains "Monitor" and "AskUserQuestions"
```

#### Example 4.2 — A skill without `disallowed-tools` shows no such row

```gherkin
Given a skill submitted without a `disallowed-tools` frontmatter key
When a signed-in user opens that skill's detail page
And expands the Frontmatter section
Then no row labelled `disallowed-tools` is displayed
```

---

### Rule 5 — The Claude Code deployer emits `disallowed-tools` in canonical sorted order

When `SkillMdContentBuilder` writes a skill file for the Claude Code agent, it must call
`sortAdditionalPropertiesKeys` so that `disallowed-tools` appears after `shell` in the
rendered YAML frontmatter, producing deterministic output.

#### Example 5.1 — `disallowed-tools` is emitted after `shell` in the YAML

```gherkin
Given a skill whose stored additionalProperties include { shell: true, disallowedTools: ['Monitor'] }
When SkillMdContentBuilder renders the SKILL.md content
Then the emitted YAML frontmatter contains `shell` before `disallowed-tools`
```

#### Example 5.2 — Two renders of the same skill produce identical YAML

```gherkin
Given a skill with additionalProperties including disallowedTools
When SkillMdContentBuilder renders the skill twice in sequence
Then both outputs are byte-for-byte identical
```

---

## Questions

_No open questions — all acceptance criteria and field semantics are fully specified in
the issue and in the upstream Claude Code documentation._

---

## Automated Test Mapping

| Example(s)            | Test type   | Suggested location                                                                           |
| --------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| 1.1 · 1.2 · 1.3 · 1.4 | Unit        | `packages/types/src/skills/skillAdditionalProperties.spec.ts`                                |
| 2.1 · 2.2             | CLI E2E     | `apps/cli-e2e-tests/src/playbook-add.spec.ts` — `describeWithUserSignedUp`                   |
| 3.1 · 3.2             | CLI E2E     | `apps/cli-e2e-tests/src/playbook-submit.spec.ts` — `describeWithUserSignedUp`                |
| 4.1 · 4.2             | Browser E2E | `apps/e2e-tests/src/features/skills/SkillFrontmatterDisallowedTools.spec.ts` — `testWithApi` |
| 5.1 · 5.2             | Unit        | `packages/coding-agent/src/SkillMdContentBuilder.spec.ts`                                    |
