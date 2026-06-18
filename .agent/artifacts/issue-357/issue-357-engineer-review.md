# Engineer Review — #357 Support Claude Skill frontmatter `disallowed-tools`

**Issue**: #357 | **Branch**: agent/issue-357 | **Base**: main | **Files changed**: 11
**Layers touched**: Domain/packages (`packages/types`), CLI infra (`PackmindIgnoreReader.spec.ts`), Tests (`skillAdditionalProperties.spec.ts`)

## Verdict

LGTM otherwise ✅, 2 points below

## Findings

#### [MEDIUM] CLI e2e tests for `playbook add` / `playbook submit` with `disallowed-tools` not added

- [ ] **Category**: Required tests from the spec (T2)
- **File**: `apps/cli-e2e-tests/src/playbook/playbook-add.spec.ts` (not modified) and `apps/cli-e2e-tests/src/playbook/submit-without-review.spec.ts` (not modified)
- **What**: The EM spec (`.agent/artifacts/issue-357/issue-357-em-spec.md`) explicitly maps examples 2.1 (happy path: `playbook add` a skill with YAML-list `disallowed-tools`) and 3.1 (`playbook submit` persists `disallowedTools` as an array) to the existing CLI e2e test files. Both files exist in the repo but no new `describeWithUserSignedUp` cases were added. These are the canonical integration tests for the feature — they're the only layer that exercises the full round-trip: CLI parser → staging → API storage.
- **Why it matters**: The unit tests in `skillAdditionalProperties.spec.ts` verify the type registration; they do not verify that the CLI parser actually recognises `disallowed-tools` in a real SKILL.md, that no validation error is emitted on `playbook add`, or that the stored `additionalProperties.disallowedTools` array survives the `playbook submit` round-trip to the API. The SVG demo artifacts capture a one-time manual run but are not reproducible in CI.
- **Suggested check/fix**: Add at minimum one `it` case to `playbook-add.spec.ts` covering example 2.1 (SKILL.md with `disallowed-tools: [Monitor, AskUserQuestions]` → exit 0, no error text) and one case to `submit-without-review.spec.ts` covering example 3.1 (persisted skill has `additionalProperties.disallowedTools`). Counter-example 2.2 and the comma-separated string path (3.2) test pre-existing/shared behaviour and are lower priority.
- **Confidence**: certain (gap visible from diffed files vs. EM spec test-mapping table)

---

#### [LOW] Demo skill uses `AskUserQuestions` (plural) — actual Claude Code tool is `AskUserQuestion` (singular)

- [ ] **Category**: UX copy / correctness of demo artifact
- **File**: `.claude/skills/create-em-spec/SKILL.md:5`
- **What**: The `disallowed-tools` list in the demo SKILL.md reads `- AskUserQuestions`, but the actual Claude Code tool name is `AskUserQuestion` (singular — confirmed by the available-tools list in this session). Packmind stores and displays the string verbatim, so the UI screenshot and webm show the misspelled name. The issue description also wrote it plural, so the implementation faithfully follows the spec — but the shipped skill file in `.claude/skills/create-em-spec/` will persist this incorrect tool name.
- **Why it matters**: The demo SKILL.md is a real skill in the repo (tracked in `packmind-lock.json`). If a developer invokes this skill via Claude Code, `disallowed-tools: [AskUserQuestions]` will silently not block `AskUserQuestion` calls because the name won't match. Low runtime impact since it's a demo, but it ships a misleading artefact.
- **Suggested check/fix**: Correct `.claude/skills/create-em-spec/SKILL.md` line 5 from `- AskUserQuestions` to `- AskUserQuestion`, re-run `playbook add` + `playbook submit`, and re-capture the screenshot/SVG artifacts. Also update the scenario.md line confirming the UI value.
- **Confidence**: certain (static comparison of SKILL.md content vs. Claude Code tool registry)

---

## Open questions

- **SkillMdContentBuilder unit test (EM spec examples 5.1/5.2)**: The EM spec maps examples 5.1 (disallowedTools rendered after shell) and 5.2 (two renders are byte-for-byte identical) to `packages/coding-agent/src/infra/repositories/utils/SkillMdContentBuilder.spec.ts`. No new cases were added there. In practice the gap is low-risk — `CAMEL_TO_YAML_KEY['disallowedTools'] === 'disallowed-tools'` is tested in `skillAdditionalProperties.spec.ts`, `sortAdditionalPropertiesKeys` is tested with `disallowedTools`, and the builder already has a generic `additionalProperties` test. Whether a dedicated `disallowedTools` case in the builder spec is required is a judgment call — noting it here in case the team wants to close the EM spec mapping completely.

- **`packmind-lock.json` UUIDs from local dev stack**: The committed lock file entry for `create-em-spec` embeds a `spaceId` and artifact `id` from the agent's local stack run. This follows the same pattern as other skills already in the file (pre-existing design), so it's not a defect of this PR — but worth confirming the UUIDs are stable / intentional if the team later rotates the dev seed data.

---

_Static review only — no code was executed. Findings marked "needs confirmation" should be reproduced before acting. Automated checks (lint, build, e2e) are out of scope here by design._
