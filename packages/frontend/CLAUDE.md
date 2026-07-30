# Frontend Package

Despite the name, this package contains **no components, hooks or contexts**. It holds only
`data-testid` enums — the shared contract that lets `apps/frontend` components and
`apps/e2e-tests` page objects agree on selectors without hardcoding strings in two places.

(The `react` / `react-dom` entries in `package.json` are peer dependencies only; nothing here
renders. Reusable UI lives in `@packmind/ui`, and app-specific hooks and contexts live in
`apps/frontend`.)

> Nx project name is **`frontend-lib`** — `nx test frontend` runs the *app*, not this package.

## Contents

Every file is a `*DataTestIds.ts` exporting a string enum whose **members repeat their own qualified
name** as the value:

```ts
// src/domains/account/components/UsersPageDataTestIds.ts
export enum UsersPageDataTestIds {
  InviteUsersCTA = 'UsersPageDataTestIds.InviteUsersCTA',
  // ...
}
```

That redundancy is deliberate: a failing Playwright selector names the enum it came from.

## Adding a test id

1. Add the member to the relevant `*DataTestIds.ts` under `src/domains/<domain>/components/` or
   `src/routes/` (or create a new file there).
2. Export it up the barrel chain — `components/index.ts` → `<domain>/index.ts` →
   `domains/index.ts` → `src/index.ts`. A new file that stops at step 1 is invisible to both apps.
3. Consume it as `data-testid={SomeDataTestIds.Member}` in the `apps/frontend` component and via the
   same enum in the `apps/e2e-tests` page object — never as a literal string.

Tagged `env:browser`, so it must not import anything `env:node`.

Shared package conventions (env tags, layout, `/test` subpath, branded IDs): [../CLAUDE.md](../CLAUDE.md)
