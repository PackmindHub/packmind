# Releasing packmind-cli

Update the [CHANGELOG](./CHANGELOG.MD) file:

- Update the `[Unreleased]` section to add the new version and release date
- Update the `[Unreleased]` link at the bottom of the Changelog:

```markdown
[X.Y.X]: https://github.com/PackmindHub/packmind/compare/release-cli/<previous release number>...release-cli/X.Y.Z
```

- Update version in the [package.json](./package.json) file.
- Commit this, create the `relase-cli/X.Y.Z` tag and push to GitHub.
- Add a new section `[Unreleased]` section in the Changelog:

```markdown
# [Unreleased]

## Added

## Changed

## Fixed

## Removed
```

Add a link for the unreleased section at the bottom of the file:

```markdown
[Unreleased]: https://github.com/PackmindHub/packmind/compare/release-cli/<previous release number>...HEAD
```
