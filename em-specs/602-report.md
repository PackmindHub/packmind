# QA Review Report

**Spec**: 602.md | **Date**: 2026-06-08 | **Branch**: main | **Commit**: e45faf0a7
**Rules**: 1 | **Examples**: 2 | **Tech Rules**: 3 | **Events**: 0
**Domains reviewed**: Frontend (apps/frontend). Backend rename is out of scope per the spec.

## Summary

| Metric               | Count                                       |
| -------------------- | ------------------------------------------- |
| Covered              | 2                                           |
| Partially Covered    | 3                                           |
| Not Covered          | 0                                           |
| Code Findings        | 5 (Critical: 0, High: 0, Medium: 3, Low: 2) |
| Standards Violations | 0                                           |

**Verdict**: Vocabulary rebrand and the title/lead-in (Scenario 1) are done. Scenario 2 (vendor identity on each row) is the weak spot: the vendor name text is suppressed (`showLabel={false}`) so identity is icon/colour-only — fails the accessibility clause — and the icons are generic Lucide glyphs (`LuGithub`/`LuGitlab`) instead of the spec's official Simple Icons (`SiGithub`/`SiGitlab`). A few "provider" strings still leak on the live page (delete toast/confirmation, status pill). No automated test covers any spec scenario.

## Functional Coverage

### Coverage Matrix

| ID    | Rule / Item                                                                | Layer    | Status            | Evidence                                                                                                                                                                                                                | Test Coverage |
| ----- | -------------------------------------------------------------------------- | -------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| R1-E1 | Rule 1 / Example 1: page title + lead-in describe user-facing purpose      | Frontend | Covered           | Title `"Git connections"` + lead-in subtitle at `org.$orgSlug._protected.settings.git._index.tsx:14-15`; conveys access-to-repos + publish playbooks                                                                    | None          |
| R1-E2 | Rule 1 / Example 2: vendor identity reinforced visually on each row        | Frontend | Partially Covered | Icon rendered via `VendorMark`, but `showLabel={false}` in both tables suppresses the vendor name text (a11y clause unmet); uses Lucide `LuGithub`/`LuGitlab`, not Simple Icons `SiGithub`/`SiGitlab`                   | None          |
| T1    | Tech: UI rename providers→connections (titles/buttons/toasts/empty/routes) | Frontend | Partially Covered | Title, tabs, buttons, empty state, delete-dialog title all say "connection"; but `GIT_MESSAGES` toasts/confirmation still say "Git provider …" and `connectionStatus.ts` pill says "the provider"/"Provider rate limit" | None          |
| T2    | Tech: vendor icons prefixed on each row in both tables                     | Frontend | Partially Covered | `VendorMark size="md"` prefixes each row at `ConnectionsTable.tsx:144` and `CliManagedTable.tsx:182` (prefix requirement met), but generic Lucide marks (not `Si*`) and name text suppressed                            | None          |
| T3    | Tech: lead-in paragraph at top of page                                     | Frontend | Covered           | `subtitle` prop on `PMPage`, route file line 15                                                                                                                                                                         | None          |

### Gaps

#### [R1-E2 / T2] Vendor identity on each row — name text suppressed + wrong icon set

**Status**: Partially Covered
**What is missing**: Spec requires BOTH the vendor's official icon AND the vendor name as text on each row ("so the cue is not colour/icon-only (accessibility)"). The name text is suppressed via `showLabel={false}`, leaving an icon-only cue. The icon is the generic Lucide glyph, not the official Simple Icons brand mark referenced in the spec.
**Where to look**:

- `apps/frontend/src/domain/git/components/list/ConnectionsTable.tsx:144` — `<VendorMark vendor={connection.source} size="md" showLabel={false} />`
- `apps/frontend/src/domain/git/components/list/CliManagedTable.tsx:182` — `<VendorMark vendor={provider.source} size="md" showLabel={false} />`
- `apps/frontend/src/domain/git/components/shared/VendorMark.tsx:3` — imports `LuGithub`/`LuGitlab` from `react-icons/lu`; renders label only when `showLabel` truthy (lines 47-55)
- `apps/frontend/src/domain/git/components/list/ConnectionsEmptyState.tsx:3` — also `LuGithub`/`LuGitlab`
  **How to reproduce**:

1. Open `settings/git` with a mix of GitHub and GitLab connections.
2. Inspect a row in the Connections tab and a row in the CLI-managed tab.
3. Actual: only the icon tile renders; the vendor name ("GitHub"/"GitLab") is not shown as text — icon-only, failing the accessibility clause. Icon is the generic Lucide glyph. Expected: both the official vendor icon and the vendor name text appear.

Note: `VendorMark` defaults `showLabel=true` and renders the label correctly (lines 47-55); the gap is purely that both call sites pass `showLabel={false}`.

#### [T1] UI rename — residual "provider" vocabulary on the live page surface

**Status**: Partially Covered
**What is missing**: User-facing strings on the `settings/git` surface still say "provider":

- Delete success toast and confirmation body come from `GIT_MESSAGES` ("Git provider deleted successfully!", "Are you sure you want to delete the git provider …").
- Connection status pill copy says "the provider" / "Provider rate limit reached" / "Packmind can't reach this provider".
  **Where to look**:
- `apps/frontend/src/domain/git/constants/messages.ts:11,32-33` — consumed at `GitProvidersList.tsx:98` (`providerDeleted`) and `:228` (`confirmation.deleteProvider`)
- `apps/frontend/src/domain/git/components/shared/connectionStatus.ts:19-27` — surfaced via `ConnectionStatusPill` at `ConnectionsTable.tsx:165`
  **How to reproduce**:

1. On `settings/git`, delete a connection → success toast reads "Git provider deleted successfully!" (expected "connection").
2. With a rejected/rate-limited token, the status pill/tooltip reads "Token rejected by the provider" / "Provider rate limit reached" (expected "connection" wording).

## Code Review

### Findings

#### [MEDIUM] Vendor icons have no accessible name when `showLabel={false}`

- **Category**: Technical Rule Violation / A11y
- **File**: `apps/frontend/src/domain/git/components/shared/VendorMark.tsx:24-58`; consumed at `ConnectionsTable.tsx:144`, `CliManagedTable.tsx:182`, `ConnectionDrawer/ConnectionDrawer.tsx:390`
- **Description**: `VendorMark` is rendered with `showLabel={false}` in all live row surfaces, suppressing the `VENDOR_LABEL` text. The only remaining cue is `PMIcon`, which renders an SVG with `aria-hidden="true"` and no `aria-label`/`title`. Vendor identity is conveyed icon/colour-only with no accessible name — a screen-reader user cannot tell GitHub from GitLab on a row. In `ConnectionsTable` the adjacent text is the connection name/URL; in `CliManagedTable` it is the URL/host — neither guarantees the vendor name. Fails the spec's accessibility intent.
- **Spec Reference**: Rule 1 / Example 2 ("renders the vendor name as text (accessibility — not icon/colour-only)"); Standard "Front-end UI and Design Systems" (a11y intent)
- **Suggested Fix**: When `showLabel={false}`, still expose an accessible name — add `aria-label={VENDOR_LABEL[vendor]}` on the icon wrapper and/or a visually-hidden text node, or have the tables render the vendor name as visible text alongside the icon.

---

#### [MEDIUM] Icon-set mismatch: spec calls for official brand marks (`SiGithub`/`SiGitlab`), code uses Lucide (`LuGithub`/`LuGitlab`)

- **Category**: Technical Rule Violation / Inconsistency
- **File**: `apps/frontend/src/domain/git/components/shared/VendorMark.tsx:3,12-16`; `apps/frontend/src/domain/git/components/list/ConnectionsEmptyState.tsx:3,25-30`
- **Description**: Scope says vendor icons should be `SiGithub`/`SiGitlab` (Simple Icons — official vendor brand marks). Both `VendorMark` and `ConnectionsEmptyState` import generic Lucide glyphs from `react-icons/lu` instead. `react-icons/si` (`SiGithub`, `SiGitlab`) is already used elsewhere in this frontend (`SetupUseCasesPage.tsx`, `SocialLoginButtons.tsx`), so the correct set is available. Lucide marks arguably do not convey "official vendor icon".
- **Spec Reference**: Tech rule ("Vendor icons (`SiGithub`, `SiGitlab`, …) prefixed on each row"); Rule 1 / Example 2 ("the vendor's official icon")
- **Suggested Fix**: Swap to `SiGithub`/`SiGitlab` from `react-icons/si` in both files; keep a neutral fallback for the `unknown` vendor.

---

#### [MEDIUM] Duplicated vendor→icon mapping across `VendorMark` and `ConnectionsEmptyState` (drift risk)

- **Category**: Inconsistency
- **File**: `apps/frontend/src/domain/git/components/shared/VendorMark.tsx:12-16` vs `apps/frontend/src/domain/git/components/list/ConnectionsEmptyState.tsx:23-30`
- **Description**: The vendor→icon decision lives in two places: `VENDOR_ICON` in `VendorMark` (all three `GitProviderVendor` values) and an inline hardcoded `LuGithub`/`LuGitlab` pair in `ConnectionsEmptyState`. Not driven by a single source, so the icon-set swap above must be applied in both or rows and empty state will show different marks for the same vendor. The empty state also has no `unknown`/fallback tile.
- **Spec Reference**: Rule 1 / Example 2 (consistent official icon per vendor)
- **Suggested Fix**: Have `ConnectionsEmptyState` reuse `VendorMark` (or a shared `VENDOR_ICON` map) so the mapping is defined once.

---

#### [LOW] Residual "provider" vocabulary: delete confirmation + success toast

- **Category**: Technical Rule Violation (minor)
- **File**: `apps/frontend/src/domain/git/constants/messages.ts:11,32-33`, consumed at `GitProvidersList.tsx:98,228`
- **Description**: The delete dialog title is correctly "Delete connection" (`GitProvidersList.tsx:227`), but the dialog body uses `GIT_MESSAGES.confirmation.deleteProvider` ("…delete the git provider \"…\"?") and the success toast uses `providerDeleted` ("Git provider deleted successfully!"). Both surface on the rebranded page — "git provider" leaks into toasts/dialogs the rename scope explicitly lists.
- **Spec Reference**: Tech scope ("UI-only rename … across … buttons, toasts, … empty states")
- **Suggested Fix**: Reword the rendered strings to "connection" (the message keys can stay).

---

#### [LOW] Residual "Git providers" copy on adjacent Targets empty state

- **Category**: Technical Rule Violation (minor) / Inconsistency
- **File**: `apps/frontend/app/routes/org.$orgSlug._protected.settings.targets._index.tsx:111-112`
- **Description**: The Targets empty-state copy reads "Once you have **Git providers** configured, you can create targets for deployment", with a "Configure Git Settings" CTA linking to the rebranded `settings/git` page. Adjacent copy that now contradicts the new vocabulary.
- **Spec Reference**: Tech scope (UI rename of "providers" copy)
- **Suggested Fix**: Update to "Once you have Git connections configured…".

### Notes (not raised as findings)

- **Dead legacy strings**: `ManageGitProviderDialog.tsx:63` ("Edit/Add Git provider") and `GitProviderConnection.tsx` ("Git provider is required", "Failed to save git provider", "added/updated successfully!") still say "provider", but `ManageGitProviderDialog` is only re-exported from the barrel and rendered on no live route — the active add/edit paths are `AddConnectionDrawer`/`ConnectionDrawer`. Not on the page surface, so not raised. If the team intends to keep that dialog reachable, these become a Medium rename violation — worth a one-line confirmation it is retired.
- **Icon mapping completeness OK**: `GitProviderVendor` has exactly three values (`github | gitlab | unknown`, `packages/types/src/git/GitProvider.ts:6`); `VendorMark` maps all three with a `LuGitBranch` fallback for `unknown`. No crash on unknown vendor.
- **Route segment**: `/settings/git` segment is `git`, not `providers` — no UI route-segment rename needed.
- **Sidebar**: `settings.tsx` link `label="Git"` is fine; the `label="Provider"` at `settings.tsx:141` belongs to the unrelated AI/LLM section (out of scope).
- **Test gap**: No spec exists for the route, `VendorMark`, `ConnectionsTable`, `CliManagedTable`, or `ConnectionsEmptyState`. Existing git-domain specs cover only `GitHubAppConnection`, `GitProviderAdvancedPanel`, `GitProviderConnection`. The e2e POM (`apps/e2e-tests/src/infra/pages/GitSettingsPage.ts`) already asserts on `/Connections/` and "No connections yet", consistent with the rename.

---

_Static analysis only. No code was executed during this review._
