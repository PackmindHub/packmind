---
name: 'feature-flags-authoring'
description: 'Add, edit, or remove a Packmind feature flag across the shared registry, the frontend gate, and the backend helper. Use when the user wants to create a new feature flag, gate a feature behind a flag, open or restrict a flag to a domain/email, change a flag audience, retire or delete a flag, or asks how the feature-flag system is wired. This is the developer how-to counterpart to the feature-flags-audit skill.'
---

# Feature Flags Authoring

A developer how-to for the full lifecycle of a Packmind feature flag: **add**, **edit**, **remove**. Flags gate a feature by **email domain** (or exact email). The same decision function runs on frontend and backend, so behavior never diverges. Follow the steps below exactly — every flag touches three places.

For inventorying existing flags, orphan detection, and audience audits, use the **`feature-flags-audit`** skill instead. This skill changes flags; that one scans them.

## Where things live

- **Shared registry — `@packmind/feature-flags`** (pure, `env:shared`, browser-safe). The single source of truth:
  - `registry.ts` — the `*_FEATURE_KEY` constants, `DEFAULT_FEATURE_DOMAIN_MAP` (`Record<string, readonly string[]>` mapping each flag's string value to allowed entries), and the `FeatureFlagKey` union.
  - `isFeatureFlagEnabled.ts` — the pure evaluator: `isFeatureFlagEnabled({ featureKeys, featureDomainMap, userEmail })`.
- **Frontend gate** — `<PMFeatureFlag>` from `@packmind/ui` (or a direct `isFeatureFlagEnabled(...)` call). The keys, `DEFAULT_FEATURE_DOMAIN_MAP`, and `isFeatureFlagEnabled` are re-exported from `@packmind/ui` for back-compat, so existing consumers can import from either place.
- **Backend gate** — `isFeatureEnabled(flag, { userEmail })`, a plain async helper from `@packmind/node-utils`. It resolves the **env kill-switch** first, then defers to the shared email-domain rule. It is NOT a port and has no DI — import it and call it.
- **Env kill-switch** — `FF_<SCREAMING_SNAKE>` (e.g. `FF_CHANGE_PROPOSALS_IN_WEBAPP`). `on`/`all`/`true` force the flag on; `off`/`none`/`false` force it off; unset or empty falls through to the email-domain map.

Two flags exist today: `'change-proposals-in-webapp'` and `'orga-space-management'`.

## Add a flag

### 1. Register it in `@packmind/feature-flags`

Add the key constant, the audience entry, and extend the union. Do all three — a constant with no map entry is never enabled for anyone; a map entry with no union member can't be typed at call sites.

```ts
// registry.ts
export const MY_FEATURE_KEY = 'my-feature' as const;

export type FeatureFlagKey =
  | 'change-proposals-in-webapp'
  | 'orga-space-management'
  | 'my-feature';

export const DEFAULT_FEATURE_DOMAIN_MAP: Record<string, readonly string[]> = {
  // ...
  'my-feature': ['@packmind.com'], // domains keep the `@`; exact emails have no leading `@`
};
```

### 2. Gate the frontend

Wrap the UI that should appear only when the flag is on:

```tsx
import { PMFeatureFlag } from '@packmind/ui';
import { MY_FEATURE_KEY, DEFAULT_FEATURE_DOMAIN_MAP } from '@packmind/feature-flags';

<PMFeatureFlag
  featureKeys={[MY_FEATURE_KEY]}
  featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
  userEmail={currentUser.email}
>
  {/* gated UI */}
</PMFeatureFlag>
```

For a branch (route, tab, boolean), call `isFeatureFlagEnabled({ featureKeys: [MY_FEATURE_KEY], featureDomainMap: DEFAULT_FEATURE_DOMAIN_MAP, userEmail })` directly.

### 3. Gate the backend

Inside a member use case, `command.user.email` is available. Branch on the helper:

```ts
import { isFeatureEnabled } from '@packmind/node-utils';
import { MY_FEATURE_KEY } from '@packmind/feature-flags';

if (await isFeatureEnabled(MY_FEATURE_KEY, { userEmail: command.user.email })) {
  // new path
} else {
  // old path
}
```

### 4. (Optional) Env override

Set `FF_MY_FEATURE=on` to force the flag on everywhere, or `FF_MY_FEATURE=off` to force it off, regardless of the domain map. Leave unset to defer to the map. Document the var in the deploy config if you rely on it.

## Edit a flag

Change the allowed audience in `DEFAULT_FEATURE_DOMAIN_MAP` — add or remove domains (`@company.com`) or exact emails (`user@company.com`). This is the only place audience lives; the frontend and backend both read it.

Remember: the `FF_*` env kill-switch **overrides the map at runtime**. If a flag looks stuck on or off in an environment, check the env var before editing the map.

## Remove a flag

1. In `@packmind/feature-flags`: delete the `*_FEATURE_KEY` constant, its `DEFAULT_FEATURE_DOMAIN_MAP` entry, and its `FeatureFlagKey` union member.
2. Delete every call site:
   - Frontend: remove the `<PMFeatureFlag>` wrappers (keep the children — the UI ships unconditionally now) and any `isFeatureFlagEnabled` branches.
   - Backend: remove the `isFeatureEnabled` branches, keeping the winning branch inline.
3. Drop any `FF_<SCREAMING_SNAKE>` env var from deploy config.
4. Run the **`feature-flags-audit`** skill to confirm no orphaned keys, map entries, or call sites remain.

## Conventions

- **Audience is email-domain only** (Proposal A). No org, plan, team, or percentage targeting exists yet — do not describe or build it.
- **Never log an email in clear text.** If you log a flag decision, mask the email (first 6 chars + `*`) or, better, log only the flag key and the boolean outcome.
- **Keep `@packmind/feature-flags` pure and browser-safe.** No `env:node` imports (no `@packmind/node-utils`, no `Configuration.getConfig`, no `process.env`). It ships to the browser bundle.
- **The backend gate is a plain helper call, not an injected port.** Import `isFeatureEnabled` and call it directly; do not add a port/adapter/registry.

## See also

- **`feature-flags-audit`** — the review/scan counterpart: inventories every flag, its audience, its usages, and flags orphans. Run it after removing a flag and whenever you need the current state of the system.
