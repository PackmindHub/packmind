# Packmind contribution guide

## Starting the stack:

You will need node 24.15.0 and docker to start the development stack. This repo
uses **pnpm 11** (pinned via `packageManager` in `package.json`); enable it through
corepack — no global install needed. pnpm settings (overrides, `allowBuilds`,
hoisting) live in `pnpm-workspace.yaml`, not `.npmrc` or the `package.json` `pnpm`
field, as required since pnpm 11:

```shell
nvm use
corepack enable
pnpm install --frozen-lockfile
PACKMIND_EDITION=oss node scripts/select-tsconfig.mjs
docker compose --profile=dev up
```

The app should be available at [http://localhost:4200](http://localhost:4200)

> **Nx state in Docker:** the containers keep their Nx cache and project
> graph in a dedicated `dev-nx` Docker volume, isolated from the host's
> `.nx/` directory. This prevents the Linux/Alpine containers and your
> host (e.g. macOS) from sharing — and corrupting — the same Nx store. To
> reset only the containers' Nx state, run:
>
> ```shell
> docker volume ls -q --filter name=dev-nx | xargs -r docker volume rm -f
> ```
>
> For a full reset (including the database), use `docker compose down -v`.

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
