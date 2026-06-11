# QA Review Report — Issue #357: `disallowed-tools` Frontmatter Support

**Spec**: `.agent/artifacts/issue-357/issue-357-em-spec.md`  
**Reviewer**: Michel autonomous agent  
**Date**: 2026-06-11  
**Pass**: detection only — no source code modified

---

## Scope

Changed files mapped to domains:

| Path                                                             | Domain                   |
| ---------------------------------------------------------------- | ------------------------ |
| `packages/types/src/skills/skillAdditionalProperties.ts`         | Packages                 |
| `packages/types/src/skills/skillAdditionalProperties.spec.ts`    | Packages                 |
| `.claude/skills/create-em-spec/SKILL.md`                         | Packages (test artifact) |
| `apps/cli/src/application/services/PackmindIgnoreReader.spec.ts` | CLI (unrelated)          |
| `.agent/artifacts/issue-357/*`                                   | Artifacts                |
| `packmind-lock.json`                                             | Config                   |

Domains reviewed: **Packages**, **CLI**, **API**, **Frontend**.  
Note: Only `packages/types` files are new in this branch. All other domain implementations (`CLI`, `API`, `Frontend`, `coding-agent`) are pre-existing. The branch diff is thin — this review covers both the new additions and the gaps they leave against the spec.

---

## Rule 1 — `disallowed-tools` is a registered Claude Code additional field

### Implementation

**File**: `packages/types/src/skills/skillAdditionalProperties.ts`

| Requirement                                                                 | Status  | Evidence                   |
| --------------------------------------------------------------------------- | ------- | -------------------------- |
| `CLAUDE_CODE_ADDITIONAL_FIELDS['disallowed-tools'] === 'disallowedTools'`   | ✅ PASS | Line 67                    |
| `CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER` last element is `'disallowedTools'`   | ✅ PASS | Line 87 (index 12 / final) |
| `'shell'` is immediately before `'disallowedTools'` in that array           | ✅ PASS | Lines 86–87                |
| `CAMEL_TO_YAML_KEY` derived from inverse of `CLAUDE_CODE_ADDITIONAL_FIELDS` | ✅ PASS | Lines 94–99                |
| `CAMEL_TO_YAML_KEY['disallowedTools'] === 'disallowed-tools'`               | ✅ PASS | Lines 94–99 (derived)      |
| `sortAdditionalPropertiesKeys` places `disallowedTools` after `shell`       | ✅ PASS | Lines 138–153              |

### Test coverage

**File**: `packages/types/src/skills/skillAdditionalProperties.spec.ts`

| Example                                                                                 | Verdict     | Notes                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1.1** – `CLAUDE_CODE_ADDITIONAL_FIELDS['disallowed-tools']` lookup                    | ⚠️ INDIRECT | No explicit test for the forward lookup; covered only through the round-trip test at lines 73–76. `CLAUDE_CODE_ADDITIONAL_FIELDS` is not imported in the spec — a direct assertion (`expect(CLAUDE_CODE_ADDITIONAL_FIELDS['disallowed-tools']).toBe('disallowedTools')`) is missing. |
| **1.2** – `CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER` last element + shell immediately before | ❌ MISSING  | `CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER` is **not imported** in the spec file. No test reads the array's final two positions directly. The ordering is verified indirectly by the `sortAdditionalPropertiesKeys` test, but the spec example targets the constant itself.                |
| **1.3** – `CAMEL_TO_YAML_KEY['disallowedTools']` round-trip                             | ✅ PASS     | Line 92–93 explicitly asserts `disallowedTools: 'disallowed-tools'`.                                                                                                                                                                                                                 |
| **1.4** – `sortAdditionalPropertiesKeys({ shell: true, disallowedTools: ['Monitor'] })` | ⚠️ PARTIAL  | Test at lines 152–164 uses `{ disallowedTools, shell, model }` (three keys). The spec example uses exactly `{ shell, disallowedTools }` (two keys). Behaviour is equivalent, but the literal case from the spec is untested.                                                         |

**Gaps for Rule 1:**

- Missing import and direct test for `CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER` (Example 1.2).
- No explicit forward lookup test on `CLAUDE_CODE_ADDITIONAL_FIELDS` for the new key (Example 1.1).

---

## Rule 2 — `playbook add` succeeds for skills with `disallowed-tools`

### Implementation

**File**: `apps/cli/src/application/utils/parseSkillDirectory.ts` (lines 115–124) — uses `CLAUDE_CODE_ADDITIONAL_FIELDS` mapping to extract `disallowedTools` into `additionalProperties`. Since `'disallowed-tools'` is now registered, it is correctly mapped and included in the staged payload.

**File**: `apps/cli/src/infra/commands/playbook/addHandler.ts` (line 273–278) — calls `parseSkillDirectory`, returns early with non-zero exit on failure.

| Example                                                                  | Verdict        | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2.1** – Add skill with YAML-list `disallowed-tools` → exit 0, no error | ✅ PASS (code) | `parseSkillDirectory` maps `disallowed-tools` → `disallowedTools` and includes it in `additionalProperties`. The staging operation succeeds.                                                                                                                                                                                                                                                                                                      |
| **2.2** – Unrecognised frontmatter key rejected → exit non-zero          | ❌ BUG         | `parseSkillDirectory.ts` silently drops unknown YAML keys (lines 116–121: `if (camelKey) { ... }` — no `else` branch that reports an error). A skill with `totally-unknown-key: true` is staged without complaint. `SkillValidator.validateUnexpectedFields` is never called in the `playbook add` path. The validator IS wired up in the `SkillParser` (packages/skills) → API path, but that runs only on submit/upload, not on `playbook add`. |

**Root cause of 2.2 bug**: The CLI's `parseSkillDirectory` bypasses `SkillValidator`. Only the API-side `SkillParser` + `SkillValidator` chain propagates unknown YAML keys as validation errors. The CLI needs either to call `SkillValidator` locally or to forward unrecognised keys to the error path.

### Test coverage

- No new tests added to `apps/cli-e2e-tests/src/playbook/playbook-add.spec.ts` for `disallowed-tools` (grep confirms zero hits). Both examples 2.1 and 2.2 lack automated coverage.

---

## Rule 3 — `playbook submit --no-verify` persists `disallowedTools`

### Implementation

The persistence infrastructure is pre-existing and works generically for any `additionalProperties` key:

- `parseSkillDirectory.ts` populates `payload.additionalProperties.disallowedTools` for both array and string YAML values.
- The API's `SkillVersionSchema` stores `additionalProperties` as JSONB (nullable) — no migration needed.
- Submit path: CLI `submitHandler` → API POST → `skillsService.uploadSkill` → hexagonal port → JSONB persistence.

| Example                                                                   | Verdict        | Notes                                                                                                                                       |
| ------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **3.1** – Array form `[Monitor, AskUserQuestions]` persisted as array     | ✅ PASS (code) | `parseSkillMdContent` parses a YAML sequence directly as a JS array; `parseSkillDirectory` stores it verbatim.                              |
| **3.2** – String form `"Monitor, AskUserQuestions"` accepted as non-empty | ✅ PASS (code) | The implementation stores whatever YAML parses to — a string is stored as-is. The spec only requires "non-empty value", which is satisfied. |

**Note**: The `formatAdditionalPropertyYaml` in `YamlFrontmatterUtils.ts` serialises simple arrays as inline YAML (`disallowed-tools: ['Monitor', 'AskUserQuestions']`), not as a YAML block list. This differs from the block-list form shown in the spec examples but is semantically identical and Claude Code accepts both. Not a bug, but worth noting for round-trip fidelity.

### Test coverage

- No new tests added to `apps/cli-e2e-tests/src/playbook/submit-without-review.spec.ts` (the file matching the spec's `playbook-submit.spec.ts`). Both examples 3.1 and 3.2 lack automated end-to-end coverage.

---

## Rule 4 — UI displays `disallowed-tools` in the frontmatter panel

### Implementation

**File**: `apps/frontend/src/domain/skills/components/SkillFrontmatterInfo.tsx` (lines 133–155)

- Calls `sortAdditionalPropertiesKeys(skillVersion.additionalProperties)` — ensures `disallowedTools` appears after `shell`.
- Converts keys with `camelToKebab(key)` → renders label as `disallowed-tools:`.
- Handles both scalar and complex/array values via `isDeepValue`/`toYamlLike`.
- When `additionalProperties` is absent or empty, the block is not rendered (covering Example 4.2 implicitly).

| Example                                                              | Verdict        | Notes                                                                                                                                                                                             |
| -------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **4.1** – Frontmatter panel shows `disallowed-tools` row with values | ✅ PASS (code) | Component renders all entries in `additionalProperties` using `sortAdditionalPropertiesKeys` + `camelToKebab`. A skill with `disallowedTools: ['Monitor', 'AskUserQuestions']` will show the row. |
| **4.2** – Skill without `disallowed-tools` shows no such row         | ✅ PASS (code) | Guard at line 133: `skillVersion.additionalProperties && Object.keys(...).length > 0` prevents rendering empty/absent map.                                                                        |

### Test coverage

- `apps/e2e-tests/src/features/skills/SkillFrontmatterDisallowedTools.spec.ts` **does not exist**. No browser e2e tests for examples 4.1 or 4.2. The entire `apps/e2e-tests/src/features/skills/` directory does not exist.

---

## Rule 5 — `SkillMdContentBuilder` emits `disallowed-tools` in canonical sorted order

### Implementation

**File**: `packages/coding-agent/src/infra/repositories/utils/SkillMdContentBuilder.ts` (lines 48–58)

```typescript
for (const [camelKey, value] of sortAdditionalPropertiesKeys(
  skillVersion.additionalProperties,
)) {
  const yamlKey = CAMEL_TO_YAML_KEY[camelKey] ?? camelToKebab(camelKey);
  frontmatterFields.push(formatAdditionalPropertyYaml(yamlKey, value));
}
```

- `sortAdditionalPropertiesKeys` is called — canonical order is applied.
- `CAMEL_TO_YAML_KEY['disallowedTools']` resolves to `'disallowed-tools'` — correct YAML key emitted.
- `formatAdditionalPropertyYaml` handles arrays (rendered as `['Monitor', 'AskUserQuestions']`).
- Two renders of the same skill object call the same deterministic `sortAdditionalPropertiesKeys` — output is identical (Example 5.2 is satisfied by construction).

| Example                                                    | Verdict        | Notes                                                                                                                                                  |
| ---------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **5.1** – `disallowed-tools` emitted after `shell` in YAML | ✅ PASS (code) | `CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER` positions `shell` at index 11, `disallowedTools` at index 12. `sortAdditionalPropertiesKeys` follows this order. |
| **5.2** – Two renders produce identical YAML               | ✅ PASS (code) | `sortAdditionalPropertiesKeys` is deterministic (stable sort by index; fallback to `localeCompare`). `formatAdditionalPropertyYaml` is pure.           |

### Test coverage

**File**: `packages/coding-agent/src/infra/repositories/utils/SkillMdContentBuilder.spec.ts`

- Lines 72–78: Generic test for `additionalProperties` rendering (`someKey` → `some-key`). Does NOT verify ordering of `disallowedTools` relative to `shell`.
- No test for a skill with both `shell` and `disallowedTools` verifying `shell` appears before `disallowed-tools` in the output (Example 5.1).
- No determinism / double-render test (Example 5.2).
- `SkillParser.spec.ts` (packages/skills): Tests `shell`, `paths`, `hooks`, and many other Claude Code fields, but **no test for `disallowed-tools`** extraction.

---

## Summary Table

| Rule | Example                                          | Code   | Test                           |
| ---- | ------------------------------------------------ | ------ | ------------------------------ |
| 1    | 1.1 CLAUDE_CODE_ADDITIONAL_FIELDS lookup         | ✅     | ⚠️ Indirect                    |
| 1    | 1.2 CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER ordering | ✅     | ❌ Missing                     |
| 1    | 1.3 CAMEL_TO_YAML_KEY round-trip                 | ✅     | ✅                             |
| 1    | 1.4 sortAdditionalPropertiesKeys ordering        | ✅     | ⚠️ Partial (extra key in test) |
| 2    | 2.1 playbook add happy path                      | ✅     | ❌ No e2e                      |
| 2    | 2.2 unknown key rejected                         | ❌ Bug | ❌ No e2e                      |
| 3    | 3.1 submit persists array form                   | ✅     | ❌ No e2e                      |
| 3    | 3.2 submit persists string form                  | ✅     | ❌ No e2e                      |
| 4    | 4.1 UI shows disallowed-tools row                | ✅     | ❌ No e2e                      |
| 4    | 4.2 UI hides row when absent                     | ✅     | ❌ No e2e                      |
| 5    | 5.1 disallowed-tools after shell in YAML         | ✅     | ❌ Missing unit test           |
| 5    | 5.2 two renders identical                        | ✅     | ❌ Missing unit test           |

---

## Issues — Prioritised

### P1 — Bug: Example 2.2 (unknown frontmatter key not rejected at `playbook add` time)

**Location**: `apps/cli/src/application/utils/parseSkillDirectory.ts`, lines 115–124.

`parseSkillDirectory` silently drops unrecognised YAML keys via the `if (camelKey) { ... }` guard with no error path. The spec requires `playbook add` to exit non-zero when the frontmatter contains a key that is neither a standard Agent Skills field nor a registered Claude Code additional field. The `SkillValidator.validateUnexpectedFields` method that would catch this is never invoked in the CLI's add flow.

**Impact**: A skill with typo'd or unsupported frontmatter is silently staged and submitted. The inconsistency is notable because `SkillParser` (used in the API path) correctly passes unknown keys through to `SkillValidator`.

**Fix direction**: In `parseSkillDirectory`, after extracting known fields, check if any remaining `properties` keys are neither in `SPEC_FIELDS` nor in `CLAUDE_CODE_ADDITIONAL_FIELDS`, and return `{ success: false, error: 'unexpected fields in frontmatter: …' }` for those.

---

### P2 — Missing unit tests: `CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER` (Example 1.2)

**Location**: `packages/types/src/skills/skillAdditionalProperties.spec.ts`

`CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER` is not imported in the spec file. Add:

```typescript
it('has disallowedTools as the last element', () => {
  const last =
    CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER[
      CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER.length - 1
    ];
  expect(last).toBe('disallowedTools');
});

it('places shell immediately before disallowedTools', () => {
  const idx = CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER.indexOf('disallowedTools');
  expect(CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER[idx - 1]).toBe('shell');
});
```

---

### P2 — Missing unit tests: `SkillMdContentBuilder` (Examples 5.1, 5.2)

**Location**: `packages/coding-agent/src/infra/repositories/utils/SkillMdContentBuilder.spec.ts`

No test covers `disallowedTools` rendering or verifies that `shell` precedes `disallowed-tools` in output. Add:

```typescript
it('emits disallowed-tools after shell in YAML frontmatter', () => {
  const content = generateSkillMdContent(
    makeSkill({
      additionalProperties: { shell: 'bash', disallowedTools: ['Monitor'] },
    }),
  );
  const shellIdx = content.indexOf('shell:');
  const dtIdx = content.indexOf('disallowed-tools:');
  expect(shellIdx).toBeGreaterThan(-1);
  expect(dtIdx).toBeGreaterThan(shellIdx);
});

it('produces identical output on two renders', () => {
  const skill = makeSkill({
    additionalProperties: { disallowedTools: ['Monitor'] },
  });
  expect(generateSkillMdContent(skill)).toBe(generateSkillMdContent(skill));
});
```

---

### P3 — Missing CLI e2e tests (Examples 2.1, 2.2, 3.1, 3.2)

**Location**: `apps/cli-e2e-tests/src/playbook/playbook-add.spec.ts` and `submit-without-review.spec.ts`

Neither file has any `disallowed-tools` test case. The spec's Automated Test Mapping requires:

- `playbook-add.spec.ts`: add skill with `disallowed-tools`, and verify unknown key rejection.
- `playbook-submit.spec.ts`: submit skill with array form and string form, verify API persistence.

These are integration tests that require a running stack; they should be added in a follow-up but are noted as missing coverage.

---

### P3 — Missing browser e2e tests (Examples 4.1, 4.2)

**Location**: `apps/e2e-tests/src/features/skills/SkillFrontmatterDisallowedTools.spec.ts`

This file does not exist. The spec requires a Playwright test that:

- Signs in, opens a skill with `disallowedTools`, expands Frontmatter → "More details", asserts the row is present.
- Opens a skill without the field, asserts the row is absent.

---

### P3 — Missing `SkillParser.spec.ts` test for `disallowed-tools`

**Location**: `packages/skills/src/application/parser/SkillParser.spec.ts`

The spec file tests `shell`, `paths`, `hooks`, `when_to_use`, and others but skips `disallowed-tools`. Parity test needed:

```typescript
it('extracts disallowed-tools as an array into additionalProperties', () => {
  const content = `---\nname: s\ndescription: d.\ndisallowed-tools:\n  - Monitor\n  - AskUserQuestions\n---\n\nbody\n`;
  const result = parser.parse(content);
  expect(result.metadata.additionalProperties).toEqual({
    disallowedTools: ['Monitor', 'AskUserQuestions'],
  });
});
```

---

## Additional Observations (non-blocking)

- **`PackmindIgnoreReader.spec.ts`** is in the diff but is unrelated to `disallowed-tools`. It adds a pre-existing-behavior test; it does not affect this feature.
- **`packmind-lock.json`** updated — reflects the re-submission of `create-em-spec` with the new `disallowed-tools` frontmatter. Correct.
- **`create-em-spec/SKILL.md`** now has `disallowed-tools: [Monitor, AskUserQuestions]` — this is the live demo artifact and correctly exercises the feature.
- **Array serialisation format**: `SkillMdContentBuilder` emits `disallowed-tools: ['Monitor', 'AskUserQuestions']` (inline array) rather than the block-list form shown in spec examples. Both are valid YAML and Claude Code accepts both. No action required.
