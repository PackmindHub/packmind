# Node 24 Migration — Proprietary Edition

> Companion guide to [PackmindHub/packmind#232](https://github.com/PackmindHub/packmind/pull/232) (OSS).
> When the OSS PR lands and syncs upstream, most files arrive automatically; this guide lists the
> proprietary-only delta plus the full PR scope so the migration can be reproduced end-to-end in
> the proprietary repo.

---

## 1. PR #232 scope (synced automatically from OSS)

The upstream PR is a coordinated runtime + tooling bump. Once `sync-from-oss-repository.yml`
runs, the following files land in the proprietary repo:

### Runtime & engines
| File | Change |
|---|---|
| `.nvmrc` | `22.17.0` → `24.15.0` |
| `package.json` | `engines.node` `22.17.0` → `24.15.0`, `engines.npm` `10.9.2` → `11.12.1` |
| `package.json` workspaces | Drop `packages/linter-ast/parsers/*` entry |
| `package-lock.json` | Regenerated for npm 11 |

### Toolchain bumps (root `package.json`)
| Dependency | From | To |
|---|---|---|
| `nx` + every `@nx/*` package | `21.6.8` (and `@nx/react ^22.3.3`) | `22.7.2` |
| `@nx/vitest` | — (new) | `22.7.2` |
| `vite` | `^6.3.6` | `^8.0.3` |
| `@vitejs/plugin-react` | `^4.2.0` | `^5.2.0` |
| `storybook` + `@storybook/*` | `^9.x` | `10.4.0` |
| `eslint-plugin-storybook` | — (new) | `10.3.3` |
| `react-router` + `@react-router/*` | `^7.12.0` | `7.15.1` |
| `@swc-node/register` | `~1.11.1` | `1.11.1` |
| `@swc/cli` | `~0.8.0` | `0.7.10` |
| `@swc/core` | `~1.15.18` | `1.15.8` |
| `@swc/helpers` | `~0.5.19` | `0.5.20` |
| `@infisical/sdk` | `^5.0.0` | `5.0.2` |
| `@playwright/test` | `^1.58.2` | `1.58.2` |
| `esbuild-loader` | `^4.3.0` | `^4.4.2` |
| (new dep) `@emotion/react` | — | `^11.14.0` |

### Jest config CJS conversion (Node 24 strip-types compat)

Node 24's `--experimental-strip-types` clashes with Jest's TS config loader. Every project-level
`jest.config.ts` is rewritten to CJS (`require(...)` / `module.exports = {...}`) while keeping
the `.ts` extension. PR #232 converts these OSS configs:

```
apps/api/jest.config.ts
apps/cli/jest.config.ts
apps/cli-e2e-tests/jest.config.ts
apps/frontend/jest.config.ts
apps/mcp-server/jest.config.ts
packages/accounts/jest.config.ts
packages/coding-agent/jest.config.ts
packages/deployments/jest.config.ts
packages/editions/jest.config.ts
packages/git/jest.config.ts
packages/integration-tests/jest.config.ts
packages/linter-ast/jest.config.ts
packages/linter-execution/jest.config.ts
packages/llm/jest.config.ts
packages/logger/jest.config.ts
packages/migrations/jest.config.ts
packages/node-utils/jest.config.ts
packages/playbook-change-applier/jest.config.ts
packages/recipes/jest.config.ts
packages/skills/jest.config.ts
packages/spaces/jest.config.ts
packages/standards/jest.config.ts
packages/test-utils/jest.config.ts
packages/types/jest.config.ts
tools/packmind-plugin/jest.config.ts
```

**Conversion pattern**:

```typescript
// BEFORE (ESM)
import { compilerOptions } from '../../tsconfig.base.effective.json';
import { swcTransform, ... } from '../../jest-utils';
export default { ... };

// AFTER (CJS)
const { compilerOptions } = require('../../tsconfig.base.effective.json');
const { swcTransform, ... } = require('../../jest-utils.ts');
module.exports = { ... };
```

> The `.ts` extension is preserved (Jest's resolver still loads it via `@swc-node/register`).

### Docker & infrastructure
| File | Change |
|---|---|
| `docker-compose.yml` | `node:22.17.0-alpine3.21` → `node:24.15.0-alpine3.23` (6 services); replace `npx nx` with `./node_modules/.bin/nx`; drop `node scripts/select-tsconfig.mjs` from `nx-daemon` |
| `docker-compose.production.yml` | Same image bump (4 services) |
| `dockerfile/Dockerfile.api` | `FROM node:22.17.1-alpine@sha256:...` → `FROM node:24.15.0-alpine3.23`; `apk update && apk add openssl=3.5.6-r0 bash=5.3.3-r1 ca-certificates=20260413-r0`; apk removal merged into install layer |
| `dockerfile/Dockerfile.mcp` | Same Node + apk treatment |
| `docker-local.sh` | Minor cleanup |
| `apps/api/docker-package.json` | Regen for new deps |

> `dockerfile/Dockerfile.frontend` runs nginx — untouched.

### CI workflows
| File | Change |
|---|---|
| `.github/workflows/main.yml` | All `node-version: 22.17.0` → `24.15.0`; drop `pull_request.branches: ['main']` filter; drop `docker.if:` guard |
| `.github/workflows/build.yml` | Append ` --no-experimental-strip-types` to every `NODE_OPTIONS` env (12 occurrences); rest of file unchanged |
| `.github/workflows/publish-cli-release.yml` | `NODE_VERSION: '22.17.0'` → `'24.15.0'` |
| `.github/workflows/tmp-cli-lint-windows.yml` | `node-version: '22.17.0'` → `'24.15.0'` |
| `.github/workflows/docker.yml` | Comment cleanup only |

### Build + frontend config
| File | Change |
|---|---|
| `nx.json` | Drop `testTargetName` from `@nx/vite/plugin` options |
| `apps/frontend/vite.config.ts` | Add `resolve.dedupe: ['react', 'react-dom', 'react-router']`; drop `build.commonjsOptions.transformMixedEsModules` (Vite 8 default) |
| `apps/frontend/react-router.config.ts` | Minor adjustment |
| `packages/ui/vite.config.ts` | Vite 8 compat |
| `eslint.config.mjs` | Storybook plugin wiring |
| `.prettierignore` | Adjusted |

### Test scripts in root `package.json`
| Script | Change |
|---|---|
| `test` | Append ` --no-experimental-strip-types` to `NODE_OPTIONS` |
| `test:staged` | Same |

### `.gitignore` additions
```
.claude/worktrees
.claude/settings.local.json
.nx/polygraph
.nx/self-healing
```

### Helper scripts (new)
- `migrate_node24.sh` — workspace cleanup before switching to Node 24 (docker down, nx reset, drop `.nx/`, drop `node_modules`).
- `downgrade_node22.sh` — symmetrical rollback helper.

### Spec / source touch-ups
Small adjustments needed under Vite 8 / Storybook 10 / react-router 7.15:
- `apps/frontend/app/routes/org.$orgSlug._protected.error-demo.tsx`
- `apps/frontend/src/domain/accounts/components/UsersList.tsx`
- `apps/frontend/src/domain/deployments/components/RecipeCentricView/RecipeCentricView.spec.tsx`
- `apps/frontend/src/domain/deployments/components/StandardCentricView/StandardCentricView.spec.tsx`
- `apps/frontend/src/domain/rules/components/RuleDetails.spec.tsx`
- `apps/frontend/src/domain/setup/components/SetupUseCasesPage.tsx`
- `apps/frontend/src/domain/standards/components/StandardSamplesModal/SampleIcon.tsx`
- `packages/coding-agent/src/application/services/DeployerService.spec.ts`
- `packages/coding-agent/src/infra/repositories/packmind/PackmindDeployer.ts`
- `packages/deployments/src/application/services/PackmindLockFileService.spec.ts`
- `packages/test-utils/src/factories/deployments/{deploymentOverviewFactory,standardDeploymentOverviewFactory,targetFactory,index}.ts` (dead-code drop)
- `packages/test-utils/src/factories/git/{gitRepoFactory,index}.ts`

> These are part of the OSS PR and will arrive via the sync.

---

## 2. Proprietary-only delta (apply manually)

The OSS sync does **not** touch packages that exist only in the proprietary edition. Apply the
same Jest CJS pattern to these six configs:

| Package | Jest Config | Transform |
|---|---|---|
| `amplitude` | `packages/amplitude/jest.config.ts` | `swcTransformWithDecorators` |
| `crisp` | `packages/crisp/jest.config.ts` | `swcTransform` |
| `import-practices-legacy` | `packages/import-practices-legacy/jest.config.ts` | `swcTransformWithDecorators` |
| `linter` | `packages/linter/jest.config.ts` | `swcTransformWithDecorators` |
| `playbook-change-management` | `packages/playbook-change-management/jest.config.ts` | `swcTransform` |
| `spaces-management` | `packages/spaces-management/jest.config.ts` | `swcTransformWithDecorators` |

### Proprietary projects with no action

- `plugins` — no test setup
- `assets` — static assets only
- `doc` — Mintlify documentation app
- `e2e-tests` — Playwright, not Jest
- `playground` — Vite prototype app
- `ui` — no `jest.config.ts` in either edition

---

## 3. Proprietary-only CI workflows

Most workflows take `node-version` from the calling workflow and need no change.

| Workflow | Node reference | Action needed |
|---|---|---|
| `quality.yml` | `${{ inputs.node-version }}` | None |
| `deploy-staging-and-release.yml` | Inherited via `main.yml` (now `24.15.0`) | None |
| `release.yml` | `node -p` for version extraction | None |
| `sync-from-oss-repository.yml` | Pure git operations | None |
| `weekly-doc-review.yml` | Claude Code action | None |

If any proprietary workflow still pins `22.17.0` directly, update it to `24.15.0`.

---

## 4. Known issues & workarounds

From the OSS PR test results:

| Issue | Workaround |
|---|---|
| Jest fails under Node 24's native `--experimental-strip-types` | Always run tests with `NODE_OPTIONS=--no-experimental-strip-types` (root `package.json` test scripts and CI envs already updated) |
| `DEP0180`: `fs.Stats` constructor deprecated | Informational only — no action |
| `MODULE_TYPELESS_PACKAGE_JSON` warning on frontend build | Informational only — no action |
| `nx reset` needed when switching from 22 → 24 (or back) | Run `./migrate_node24.sh` (or `./downgrade_node22.sh`) |

---

## 5. Verification checklist

After the OSS sync lands and the proprietary delta from section 2 is applied:

- [ ] `nvm use` → `node --version` reports `v24.15.0`
- [ ] `npm --version` reports `11.12.1`
- [ ] `./migrate_node24.sh` succeeds (Docker volumes + `.nx` + `node_modules` cleaned)
- [ ] `npm install` completes without errors
- [ ] `nx test amplitude` passes
- [ ] `nx test crisp` passes
- [ ] `nx test import-practices-legacy` passes
- [ ] `nx test linter` passes
- [ ] `nx test playbook-change-management` passes
- [ ] `nx test spaces-management` passes
- [ ] `npm run test:staged` passes (full affected suite)
- [ ] `nx run-many -t lint` passes
- [ ] `nx build api`, `nx build frontend`, `nx build mcp-server`, `nx build-publish packmind-cli` all green
- [ ] `docker compose up` starts every service
- [ ] CI `Main CI/CD Pipeline` (`.github/workflows/main.yml`) is green on the migration branch
