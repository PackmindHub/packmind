# Packmind contribution guide

## Starting the stack:

You will need node 22.17 and docker to start the development stack:

```shell
nvm use
npm i
PACKMIND_EDITION=oss node scripts/select-tsconfig.mjs
docker compose --profile=dev up
```

The app should be available at [http://localhost:4200](http://localhost:4200)

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
