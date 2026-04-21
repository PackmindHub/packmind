## Step 2 — Package Handling

Handle package creation or selection.

### Check existing packages

List available packages by following [`packmind-versions/$PACKMIND_CLI_VERSION/list-packages.md`](packmind-versions/$PACKMIND_CLI_VERSION/list-packages.md).

Parse the output to get package names and slugs.

### No packages exist

Auto-create a package using the repository name. Follow [`packmind-versions/$PACKMIND_CLI_VERSION/create-package.md`](packmind-versions/$PACKMIND_CLI_VERSION/create-package.md) using `${REPO_NAME}-standards` as the package name.

The create-package step will determine the space. Capture the chosen space slug as `$SPACE_SLUG` and the new package slug as `$PACKAGE_SLUG`.

Print:
```
No existing packages found — created a new one: ${REPO_NAME}-standards
```

### One package exists

Ask via AskUserQuestion:
- "Add to `{package-name}`?"
- "Create new package instead"

### Multiple packages exist

Ask via AskUserQuestion:
- List each existing package as an option
- Include "Create new package" option

### If "Create new package" is selected

- Ask for package name (suggest `${REPO_NAME}-standards` as default)
- Follow [`packmind-versions/$PACKMIND_CLI_VERSION/create-package.md`](packmind-versions/$PACKMIND_CLI_VERSION/create-package.md) using the chosen name.
- The create-package step will determine the space. Capture the chosen space slug as `$SPACE_SLUG` and the new package slug as `$PACKAGE_SLUG`.

### If an existing package is selected

Follow [`packmind-versions/$PACKMIND_CLI_VERSION/select-package.md`](packmind-versions/$PACKMIND_CLI_VERSION/select-package.md).

### After this step

Remember `$PACKAGE_SLUG` (the slug of the selected/created package) and `$SPACE_SLUG` for later reference — they will be used together in Step 9 to ensure items are added to the correct package in the correct space (as `@$SPACE_SLUG/$PACKAGE_SLUG`).
