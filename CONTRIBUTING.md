# Packmind contribution guide

## Starting the stack:

You will need node 22.17 and docker to start the development stack:

```shell
nvm use
npm i
npm run chakra:typegen
PACKMIND_EDITION=oss node scripts/select-tsconfig.mjs
docker compose up
```

The app should be available at [http://localhost:4200](http://localhost:4200)

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
