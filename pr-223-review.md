# PR #223 Review: Add `additionalProperties` support for skills

## Bug 1 (High): Non-canonical JSON comparison causes false change detection

**File**: `packages/skills/src/application/useCases/uploadSkill/uploadSkill.usecase.ts`

```typescript
if (
  JSON.stringify(latestVersion.additionalProperties ?? {}) !==
  JSON.stringify(newContent.additionalProperties ?? {})
) {
  return false;
}
```

`JSON.stringify` is key-order-dependent, but PostgreSQL JSONB does **not** preserve insertion order (it sorts keys). This means `latestVersion.additionalProperties` retrieved from the DB may have a different key order than `newContent.additionalProperties` parsed from YAML.

**Impact**: False "changed" detections, triggering **unnecessary version bumps on every upload** even when nothing actually changed.

**Fix**: Use `canonicalJsonStringify` (already available in `@packmind/node-utils`) instead of `JSON.stringify`.

---

## Bug 2 (Medium): `canonicalJsonStringify(undefined)` returns `undefined` instead of a string

**File**: `packages/node-utils/src/skillMd/parseSkillMdContent.ts`

The test confirms: `canonicalJsonStringify(undefined)` returns `undefined`. But `ParsedSkillMd.additionalProperties` is typed as `Record<string, string>`. In `parseSkillMd.ts`:

```typescript
additionalProperties[camelKey] = canonicalJsonStringify(value);
```

`JSON.stringify(undefined)` returns `undefined` (not the string `"undefined"`), so the function's actual return type is `string | undefined`, not `string`. While unlikely to be triggered via YAML parsing (YAML produces `null`, not `undefined`), this is a **type-safety gap** that could silently introduce `undefined` values into the record.

**Fix**: Guard the return type or handle the `undefined` case explicitly.

---

## Bug 3 (Medium): Asymmetric null sentinel values in diff strategy

**File**: `apps/cli/src/application/useCases/diffStrategies/SkillDiffStrategy.ts`

```typescript
const serverValue = serverProps[key] ?? 'null';  // absent → 'null'
const localValue = localProps[key] ?? '';          // absent → ''
```

The two sides use **different sentinel values** for "property doesn't exist": `'null'` for server, `''` for local. While the pipeline currently handles this (the validator uses `?? 'null'` for `oldValue` and the applier checks `newValue === ''` for deletion), this asymmetry is fragile.

**Edge case**: If a property has an explicit `null` value in YAML (`model: null`), its canonical JSON is `'null'` — identical to the "absent on server" sentinel. This means the diff strategy **cannot distinguish** between "server has this property set to `null`" and "server doesn't have this property at all", which could mask real diffs.

**Fix**: Use a consistent sentinel (e.g. always `'null'` for absent, or introduce a dedicated `ABSENT` constant).

---

## Bug 4 (Low): Missing canonical field ordering in creation applier

**File**: `packages/playbook-change-management/src/application/useCases/applyCreationChangeProposals/SkillCreateChangeProposalApplier.ts`

```typescript
for (const [camelKey, value] of Object.entries(metadata.additionalProperties)) {
  const kebabKey = camelKey.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  frontmatter.push(`${kebabKey}: ${JSON.stringify(value)}`);
}
```

Unlike `ClaudeDeployer` which uses `sortAdditionalPropertiesKeys()` to order fields canonically (known fields first in `CLAUDE_CODE_ADDITIONAL_FIELDS_ORDER`, then unknown alphabetically), this applier uses `Object.entries()` which gives arbitrary insertion order.

**Impact**: SKILL.md generated during **creation** could have a different field order than SKILL.md generated during **deployment**, potentially causing spurious diffs on the next `diff` run.

**Fix**: Reuse `sortAdditionalPropertiesKeys` or equivalent ordering logic.

---

## Issue 5 (Code Smell): Significant code duplication across packages

Several utility functions are duplicated with "keep in sync" comments:

| Function | Locations |
|---|---|
| `deepSortKeys` / `canonicalJsonStringify` | `parseSkillMdContent.ts`, `computeOutdatedProposalIds.ts` (frontend) |
| `camelToKebab` | `ClaudeDeployer.ts`, `SkillFrontmatterInfo.tsx`, `skillMdUtils.ts`, `SkillCreateChangeProposalApplier.ts` |
| `sortAdditionalPropertiesKeys` | `ClaudeDeployer.ts`, `SkillFrontmatterInfo.tsx` |
| `ADDITIONAL_FIELDS_ORDER` | `parseSkillMd.ts`, `SkillFrontmatterInfo.tsx`, `skillMdUtils.ts` |

The frontend duplication of `canonicalJsonStringify` is understandable (can't easily share Node-only code), but the **backend-to-backend duplication** (e.g., `camelToKebab` in 3 packages) increases the risk of drift and makes updates error-prone.

**Suggestion**: Extract shared helpers to `@packmind/node-utils` or a shared constants package.

---

## Issue 6 (Minor): Diff UI displays `null` as "previous value" for newly-added properties

**File**: `apps/frontend/src/domain/change-proposals/utils/extractProposalDiffValues.ts`

When a property is **added** (didn't exist before), `oldValue` is the string `'null'`. Since `'null'` is truthy, the display renders `key: null` as the old value in the diff UI. This could confuse users — it looks like the value **changed from `null`** to something, rather than being **newly added**.

**Fix**: Treat `'null'` as equivalent to empty for display purposes, or show a dedicated "Added" label.

---

## Summary

| # | Severity | Issue | File |
|---|---|---|---|
| 1 | **High** | `JSON.stringify` instead of `canonicalJsonStringify` causes false change detection | `uploadSkill.usecase.ts` |
| 2 | **Medium** | `canonicalJsonStringify(undefined)` returns `undefined`, not a string | `parseSkillMdContent.ts` |
| 3 | **Medium** | Asymmetric null sentinels (`'null'` vs `''`) in diff strategy | `SkillDiffStrategy.ts` |
| 4 | **Low** | Missing canonical field ordering in creation applier | `SkillCreateChangeProposalApplier.ts` |
| 5 | **Code Smell** | Heavy duplication of utility functions across 5+ files | Multiple |
| 6 | **Minor** | `null` displayed as old value for newly-added properties | `extractProposalDiffValues.ts` |
