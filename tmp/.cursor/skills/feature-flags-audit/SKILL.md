---
name: 'feature-flags-audit'
description: 'Audit and inventory all feature flags declared in the Packmind codebase. Use when the user asks to list, audit, review, or inventory feature flags, asks which flags are active, wants to know what a flag gates, or asks which flags are opened to a given domain/user. Produces a synthetic markdown table with each flag key, its audience, an inferred functional description, its active/orphan status, and its usage locations.'
---

# Feature Flags Audit

Produce a synthetic inventory of every feature flag declared in the Packmind codebase, with audience targeting, inferred functional descriptions, and orphan detection. The result is a single markdown table the user can scan at a glance.

## Context

Packmind uses a **custom, frontend-only** feature flag system. There is no third-party library (LaunchDarkly, GrowthBook, PostHog, etc.). Flags are gated by **email domain** or **exact email** via a single central registry. There is no org-based, plan-based, percentage-rollout, or runtime-override mechanism — what's in the registry file is what's live in production.

**Canonical source of truth:**
`packages/ui/src/lib/components/content/PMFeatureFlag/PMFeatureFlag.tsx`

This file exports:
- Flag key constants ending in `_FEATURE_KEY` (e.g. `SPACES_MANAGEMENT_FEATURE_KEY = 'spaces-management'`).
- `DEFAULT_FEATURE_DOMAIN_MAP`: a `Record<string, readonly string[]>` mapping each flag's **string value** to a list of allowed entries. Entries starting with `@` are domain rules (e.g. `@packmind.com` matches any user at that domain). Entries containing `@` but not starting with `@` are exact email matches.
- The `PMFeatureFlag` React wrapper component and the `isFeatureFlagEnabled()` pure function used at call sites.

If a flag is not declared in `DEFAULT_FEATURE_DOMAIN_MAP`, it does not exist. Do not invent flags.

## Workflow

### Step 1 — Parse the canonical registry

Read `packages/ui/src/lib/components/content/PMFeatureFlag/PMFeatureFlag.tsx`. Extract:

1. Every exported constant whose name ends with `_FEATURE_KEY`, along with its string value. The string value is what appears as a key in `DEFAULT_FEATURE_DOMAIN_MAP` — keep the mapping (constant name ↔ string value) in memory.
2. The full `DEFAULT_FEATURE_DOMAIN_MAP` object. For each entry, record the flag's string value and its list of allowed domains/emails.

Build an internal list of flags with three fields so far: constant name, string value, audience (array of allowed entries).

**Cross-check constants against the map.** Every `_FEATURE_KEY` constant should have a matching entry in `DEFAULT_FEATURE_DOMAIN_MAP`, and every map entry should correspond to a declared constant. A mismatch is a real misconfiguration:
- A constant declared with no map entry produces a flag that is never enabled for anyone — dead code.
- A map entry whose string value isn't tied to any exported constant means call sites can't import it symbolically and are likely using the inlined string (fragile).

If you find either case, do not drop it from the inventory — include it and surface the mismatch in the **Summary** section.

### Step 2 — Find usages for each flag

For each flag, search the codebase for where it is consumed. Use Grep:

- First pass: search for the **constant name** (e.g. `SPACES_MANAGEMENT_FEATURE_KEY`). This is the canonical import form and catches almost all usages.
- Second pass: search for the **string value** (e.g. `'spaces-management'` or `"spaces-management"`) as a safety net. Some usages may inline the string instead of importing the constant.

Scope the search to:
- `apps/frontend/src/**`
- `packages/**`

Exclude:
- The canonical file itself: `packages/ui/src/lib/components/content/PMFeatureFlag/PMFeatureFlag.tsx`.
- Its co-located test file: `PMFeatureFlag.test.tsx`. (The parent barrel at `packages/ui/src/lib/components/content/index.ts` only re-exports the component and does not reference any `_FEATURE_KEY`, so it won't appear in the search — no explicit exclusion needed.)
- Test and spec files anywhere in the search scope: `*.test.*`, `*.spec.*`, and Storybook stories `*.stories.*`. A usage inside a test doesn't represent shipping behavior and would mislead a reader scanning the "Usage files" column. If a flag is *only* referenced from tests, treat it as an orphan (see Step 4) and note the test-only state in the description.
- Generated/build artifacts (`dist/`, `node_modules/`).

Record the list of files where each flag is actually consumed.

### Step 3 — Infer a functional description

For each flag with at least one usage, open **1 to 3 of the most representative usage files** and read enough context to understand what the flag actually gates from a user-facing perspective. Use these signals (in rough priority order):

1. The JSX wrapped inside `<PMFeatureFlag featureKeys={[FLAG]}>...</PMFeatureFlag>` — this is literally what appears or disappears.
2. The branch or value guarded by `isFeatureFlagEnabled({ featureKeys: [FLAG] })` — often an "edit" / "create" / "delete" affordance, or an entire route/tab.
3. The component or file name hosting the gated code (e.g. `SpacesManagementActions.tsx` → space management actions).
4. Button labels, section titles, or surrounding comments near the gate.

Write **one short sentence** in the functional voice — describe what the user sees (or doesn't see) when the flag is off. Avoid technical framing.

**Examples of good descriptions:**
- "Reveals the 'Move to space' action and space management UI in the recipes list."
- "Enables inline editing of change proposals in review detail pages."
- "Adds 'Propose change' links from recipes and standards to the webapp review flow."

**Examples of bad descriptions (do not write these):**
- "Wrapped by the `PMFeatureFlag` component in `SpacesManagementActions.tsx`." (tells the reader nothing functional)
- "Feature flag for spaces management." (circular, just re-states the key)

If you cannot form a confident one-liner after reading the usage sites, write a shorter description prefixed with `(uncertain)` so the user knows to double-check.

### Step 3b — Check E2E test coverage

For each flag, search `apps/e2e-tests/src/` for spec files that call `.use({ underFeatureFlag: true })`. These tests explicitly target a feature-flagged flow and represent intentional E2E coverage of the flag.

```
grep -r "underFeatureFlag: true" apps/e2e-tests/src/
```

Record which flags have associated E2E test coverage. A flag with no E2E coverage is not an orphan (orphan is determined by frontend usage, not tests), but the information is worth surfacing so the user knows which flagged features are tested end-to-end.

Add an **E2E tested** column to the output table (Step 5) with either `Yes` or `No`.

### Step 4 — Detect orphans

A flag is **orphan** if, after the two-pass search, no usage is found outside the canonical file and its test. Orphans are candidates for removal and worth surfacing — they often accumulate when a feature ships and nobody remembers to delete the gate.

For orphans:
- Set status to `Orphan`.
- Set the description to `(no usage found — candidate for removal)`.
- Set the usage-files column to `—`.

### Step 5 — Render the table

Output a single markdown table. Use these columns, in this order, with these exact headers:

| Key | Audience | Functional description | Status | E2E tested | Usage files |

**Column rules:**

- **Key** — the string value (e.g. `change-proposals`), not the constant name. It's what appears in the domain map and what a PM or stakeholder recognises.
- **Audience** — the allowed entries, comma-separated, in the same form as in the map (domains keep their `@` prefix). If the list is empty, write `(none)`.
- **Functional description** — one short sentence, functional voice. See Step 3.
- **Status** — either `Active` or `Orphan`.
- **E2E tested** — `Yes` if at least one spec file in `apps/e2e-tests/src/` uses `.use({ underFeatureFlag: true })`, otherwise `No`.
- **Usage files** — comma-separated list of repo-relative paths. Truncate to the **5 most representative** ones and append `(… +N more)` if there are more. "Most representative" is a ranked preference, in this order:
  1. Files containing a `<PMFeatureFlag featureKeys={[FLAG]}>...</PMFeatureFlag>` JSX gate — these are the literal "what appears when the flag is on".
  2. Files calling `isFeatureFlagEnabled({ featureKeys: [FLAG] })` in a branch that guards an action, route, or tab.
  3. Files that import the constant but only pass it downstream (e.g. prop-drilling, utility wiring) — lowest priority, include only if the first two tiers don't fill the 5 slots.
  
  For orphans, write `—`.

After the table, add a short **Summary** section with:
- Total flag count, active count, orphan count.
- Any audience anomaly worth flagging — e.g. a flag opened to an external company's domain (like `@monpetitplacement.fr`, `@ninaa.io`) is usually a pilot and the user will want to notice it. Mention it briefly.

### Output format

```markdown
# Feature Flags Inventory

| Key | Audience | Functional description | Status | E2E tested | Usage files |
| --- | --- | --- | --- | --- | --- |
| space-identity | @packmind.com, @promyze.com | Reveals the space identity settings panel and related configuration affordances. | Active | No | apps/frontend/src/domain/spaces/components/SpaceGeneralSettings.tsx, apps/frontend/src/domain/spaces/components/SpaceIdentityForm.tsx |
| change-proposals | @packmind.com, @promyze.com, @monpetitplacement.fr, @ninaa.io | Enables the change proposal review flow end-to-end (navigation entry points and review detail pages). | Active | Yes | apps/frontend/src/domain/change-proposals/components/StandardReviewDetail/StandardReviewDetail.tsx, apps/frontend/src/domain/change-proposals/components/SkillReviewDetail/SkillReviewDetail.tsx, apps/frontend/src/domain/change-proposals/components/CommandReviewDetail/CommandReviewDetail.tsx (… +2 more) |
| some-old-flag | @packmind.com | (no usage found — candidate for removal) | Orphan | No | — |

**Summary:** 7 flags — 6 active, 1 orphan. `change-proposals` is opened to `@monpetitplacement.fr` and `@ninaa.io` (external pilots, worth monitoring).
```

Output only the report — no preamble, no "here is the table" sentence. The user invokes this skill to get the report itself.

## Notes and edge cases

- **Do not invent flags.** Only entries in `DEFAULT_FEATURE_DOMAIN_MAP` are real flags. If the user asks about a flag that isn't there, say so explicitly.
- **Audience targeting is email-only.** Do not describe the audience as "organizations", "plans", "teams", or "percentages" — those concepts do not exist in this system. A domain like `@packmind.com` means "any user whose email is at this domain", nothing more.
- **The registry is static.** There is no env var, no remote config, no runtime override. The file is the source of truth.
- **The backend does not use feature flags.** Do not scan `apps/api/`, `apps/mcp-server/`, or `apps/cli/`. If you ever find a `_FEATURE_KEY` import there, flag it as unusual — it would be a violation of the established pattern.
- **`PMFeatureFlag` with empty `featureKeys={[]}` always renders.** This is a rare pattern but if you see it while reading usages, don't count it as a real gate.