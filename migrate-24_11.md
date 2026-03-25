# Node.js 24.14.1 Migration Guide — Proprietary Repo Backport

## Context

This documents the steps to backport the Node 22 -> 24 upgrade from the OSS repo to the proprietary clone, which contains additional `packages/*` modules.

## What was changed in OSS (to cherry-pick or replicate)

| File                                         | Change                                                    |
| -------------------------------------------- | --------------------------------------------------------- |
| `.nvmrc`                                     | `22.17.0` -> `24.14.1`                                    |
| `package.json`                               | engines: node `24.14.1`, npm `11.11.0`                    |
| `apps/api/docker-package.json`               | engines: node `24.14.1`, npm `11.11.0`                    |
| `docker-compose.yml`                         | 6x `node:22.17.0-alpine3.21` -> `node:24.14.0-alpine3.23` |
| `docker-compose.production.yml`              | 4x `node:22.17.0-alpine3.21` -> `node:24.14.0-alpine3.23` |
| `dockerfile/Dockerfile.api`                  | `node:22.17.1-alpine` -> `node:24.14.0-alpine3.23`        |
| `dockerfile/Dockerfile.mcp`                  | `node:22.17.1-alpine` -> `node:24.14.0-alpine3.23`        |
| `.github/workflows/main.yml`                 | comment + 4x `22.17.0` -> `24.14.1`                       |
| `.github/workflows/publish-cli-release.yml`  | `NODE_VERSION: '22.17.0'` -> `'24.14.1'`                  |
| `.github/workflows/tmp-cli-lint-windows.yml` | 2x `22.17.0` -> `24.14.1`                                 |

## Additional steps for proprietary repo

### 1. Search for any extra version references

The proprietary repo may have additional Dockerfiles, compose files, or CI workflows. Run:

```bash
grep -rn "22\.17" --include="*.yml" --include="*.yaml" --include="Dockerfile*" --include="*.json" --include=".nvmrc" .
```

Update every match to the corresponding 24.x version.

### 2. Clean install

```bash
nvm use 24.14.1
rm -rf node_modules
npm install
```

npm 11.11.0 installed cleanly on OSS. Watch for:

- **Native modules** (bcrypt, @infisical/sdk, any additional native deps in proprietary packages) — if prebuild binaries are missing for Node 24 ABI, compilation will be attempted and may require Python + make + g++.
- **Peer dependency conflicts** — npm 11 is stricter. If install fails, try `npm install --legacy-peer-deps` to identify which deps conflict.

### 3. Build all apps

```bash
PACKMIND_EDITION=proprietary ./node_modules/.bin/nx build api
PACKMIND_EDITION=proprietary ./node_modules/.bin/nx build frontend
PACKMIND_EDITION=proprietary ./node_modules/.bin/nx build packmind-cli
PACKMIND_EDITION=proprietary ./node_modules/.bin/nx build mcp-server
```

All 4 builds passed on OSS without issues.

### 4. The critical fix: `--no-experimental-strip-types`

Node 24 enables native TypeScript stripping by default (`--experimental-strip-types`). This **breaks Jest config loading** in two ways:

1. `require()` calls in `.ts` files fail with: `ReferenceError: require is not defined in ES module scope`
2. Extensionless imports (e.g., `from '../../jest-utils'`) fail with: `ERR_MODULE_NOT_FOUND`

**Workaround**: set `NODE_OPTIONS="--no-experimental-strip-types"` when running tests.

This affects **every `jest.config.ts`** that imports from `../../jest-utils`. In the OSS repo, that's 22 files. The proprietary repo's additional packages likely follow the same pattern — verify with:

```bash
grep -rn "from.*jest-utils" --include="jest.config.ts" .
grep -rn "require(" --include="jest.config.ts" .
```

Any additional `jest.config.ts` files in proprietary `packages/*` that import from `jest-utils` will need the same `--no-experimental-strip-types` flag to run.

### 5. Run tests

```bash
NODE_OPTIONS="--no-experimental-strip-types" PACKMIND_EDITION=proprietary ./node_modules/.bin/nx run-many -t test --exclude=e2e-tests --parallel=3
```

On OSS: 24/25 projects passed (cli-e2e-tests excluded — requires external API).

### 6. Run lint

```bash
PACKMIND_EDITION=proprietary ./node_modules/.bin/nx run-many -t lint --parallel=3
```

On OSS: 29/29 projects passed.

### 7. Dockerfiles: update OpenSSL pin

Both `dockerfile/Dockerfile.api` and `dockerfile/Dockerfile.mcp` pin OpenSSL:

```dockerfile
openssl=3.5.5-r0
```

Alpine 3.23 (used by `node:24.14.0-alpine3.23`) ships a different OpenSSL version. To find the correct version:

```bash
docker run --rm node:24.14.0-alpine3.23 apk info openssl
```

Update the pin accordingly in both Dockerfiles. If the proprietary repo has additional Dockerfiles, check those too.

### 8. CI workflows

Ensure `NODE_OPTIONS="--no-experimental-strip-types"` is set in any CI job that runs Jest tests. This can be done at the workflow level:

```yaml
env:
  NODE_OPTIONS: '--no-experimental-strip-types'
```

Or in the test script in `package.json`.

## Deprecation warnings (informational, no action needed)

- `[DEP0180] fs.Stats constructor is deprecated` — triggered by Nx/webpack internals during builds
- `[MODULE_TYPELESS_PACKAGE_JSON]` — triggered by React Router build output lacking `"type": "module"` in generated `package.json`

These are non-blocking and will be resolved by upstream dependency updates.

## Quick checklist

- [ ] All `22.17` version references updated
- [ ] `npm install` succeeds with Node 24.14.1 / npm 11.11.0
- [ ] All apps build with `PACKMIND_EDITION=proprietary`
- [ ] All tests pass with `NODE_OPTIONS="--no-experimental-strip-types"`
- [ ] All lint checks pass
- [ ] Dockerfile OpenSSL pin updated for Alpine 3.23
- [ ] CI workflows include `--no-experimental-strip-types` for test jobs
- [ ] Any proprietary-only Dockerfiles / compose files updated
