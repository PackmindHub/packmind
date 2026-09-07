# Editions Package

The OSS side of the OSS ⇄ proprietary seam. Several `@packmind/*` specifiers that look like separate
packages are in fact TypeScript path aliases pointing at **this** package's barrel; proprietary
builds swap the aliases to real implementations.

## How the seam works

`PACKMIND_EDITION` (or `VITE_PACKMIND_EDITION`, defaulting to `oss`) is read by
`scripts/select-tsconfig.mjs`, which merges `tsconfig.base.json` with either
`tsconfig.paths.oss.json` or `tsconfig.paths.proprietary.json` and writes the **generated**
`tsconfig.base.effective.json`. Nearly every `tsconfig.json` extends it, so **nothing type-checks**
until it has been produced. Tests are more uneven: half of the `jest.config.ts` files `require` the
generated file and feed its `paths` to `pathsToModuleNameMapper` (those need it too), `deployments`
still reads the plain `tsconfig.base.json`, and the rest declare no path mapping at all and run
without it.

In OSS, all of these resolve to `packages/editions/src/index.ts`:

- `@packmind/linter`
- `@packmind/amplitude`
- `@packmind/plugins`
- `@packmind/import-practices-legacy`
- `@packmind/spaces-management`
- `@packmind/playbook-change-management` (and `@packmind/playbook-change-management/test`)
- `@packmind/marketplaces`

So a "cannot find module `@packmind/linter`" or a missing export from one of those specifiers is
almost always a missing `export *` in `src/index.ts`, not a missing dependency.

The frontend counterpart is `@packmind/proprietary/frontend/*` → `apps/frontend/src/domain/editions/stubs/*`.

## Layout

One folder per seam module, each with its own `*Hexa.ts`:

| Folder | Hexa |
| --- | --- |
| `src/oss/linter/` | `LinterHexa` |
| `src/oss/amplitude/` | `AmplitudeHexa` |
| `src/oss/spaces-management/` | `SpacesManagementHexa` |
| `src/oss/playbook-change-management/` | `PlaybookChangeManagementHexa` |
| `src/oss/practices-import-legacy/` | `ImportPracticeLegacyHexa` |
| `src/oss/marketplaces/` | `MarketplacesHexa` |

`src/oss/apiHexaPlugins.ts` exports `apiHexaPlugins`, an array of `BaseHexa` constructors the API
registers **in addition** to the core hexas. It is the documented override point for edition-specific
hexas — add a plugin hexa there rather than wiring it into the API directly.

## Constraints

- Tagged `env:shared`, so nothing `env:node`-only may be imported here.
- Every new module must be re-exported from `src/index.ts`, otherwise the aliased specifier above
  resolves to a barrel that does not expose it.

Shared package conventions (env tags, layout, `/test` subpath, branded IDs): [../CLAUDE.md](../CLAUDE.md)
