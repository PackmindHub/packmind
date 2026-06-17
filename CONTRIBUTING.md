# Packmind contribution guide

## Starting the stack:

The apps (api, frontend, mcp-server) run **natively on your host**; only Postgres
and Redis run in Docker. This gives real file-watch events and fast HMR. You need
**Docker** and **Node 24.15.0 + pnpm 11**.

Recommended — pin the toolchain with [`mise`](https://mise.jdx.dev) (reads
`mise.toml`), then two commands:

```shell
mise install        # installs the pinned Node + pnpm (via corepack)
pnpm install
pnpm dev            # Postgres + Redis up → run migrations → serve all 3 apps
```

Without mise, provide Node/pnpm yourself (corepack — no global install needed):

```shell
nvm use
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

The app should be available at [http://localhost:4200](http://localhost:4200)
(api on `:3000`, mcp-server on `:3001`).

`pnpm dev` bakes in the local connection wiring; create a `.env` (see
`.env.example`) only to override a default or supply a secret. Useful scripts:
`pnpm dev:infra` (infra only), `pnpm dev:infra:down`, `pnpm dev:reset` (wipe data
volumes), `pnpm migrate`.

pnpm settings (overrides, `allowBuilds`, hoisting) live in `pnpm-workspace.yaml`,
not `.npmrc` or the `package.json` `pnpm` field, as required since pnpm 11.

> **Legacy stack (transitional):** the old full-in-container setup
> (`PACKMIND_EDITION=oss docker compose --profile=dev up`) still works as a
> fallback but is being retired. Do not run it at the same time as `pnpm dev` /
> `docker-compose.dev.yml` — they share ports 5432/6379.

## Migrating an existing checkout from npm to pnpm

If you previously worked with npm, run the one-shot migration script from the
repo root. It removes stale `node_modules` and `package-lock.json`, activates
pnpm via corepack, installs against the lockfile, and regenerates the tsconfig:

```shell
./pnpm_migrate.sh
```

The script is safe to re-run.

## Switching packmind-cli versions (pvm)

`pvm` is a lightweight dev tool (inspired by nvm) to manage multiple packmind-cli versions locally.

Source it into your shell:

```shell
source scripts/pvm.sh
```

To load it automatically, add this to your `.zshrc` or `.bashrc`:

```shell
[ -s "/path/to/packmind/scripts/pvm.sh" ] && . "/path/to/packmind/scripts/pvm.sh"
```

Then use it:

```shell
pvm ls            # list available versions from GitHub releases
pvm use 0.24.0    # switch to a version (downloads if not installed)
```

Versions are stored in `~/.pvm/versions/`.

## Releasing

Update the [CHANGELOG](./CHANGELOG.MD) file:

- Update the `[Unreleased]` section to add the new version and release date
- Update the `[Unreleased]` link at the bottom of the Changelog:

```markdown
[X.Y.X]: https://github.com/PackmindHub/packmind/compare/release/<previous release number>...release/X.Y.Z
```

Create the `relase/X.Y.Z` tag and push to GitHub.

Add a new section `[Unreleased]` section in the Changelog:

```markdown
# [Unreleased]

## Added

## Changed

## Fixed

## Removed
```

Add a link for the unreleased section at the bottom of the file:

```markdown
[Unreleased]: https://github.com/PackmindHub/packmind/compare/release/<previous release number>...HEAD
```
