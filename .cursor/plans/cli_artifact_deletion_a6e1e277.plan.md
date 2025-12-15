---
name: CLI Artifact Deletion
overview: Implement artifact deletion support in the CLI with both automatic change detection and an explicit uninstall command, matching the API's new deletion capabilities introduced in commits ba31f1bc and 168ac148.
todos:
  - id: update-types
    content: Add previousPackagesSlugs to PullContentCommand type
    status: completed
  - id: update-cli-pull-usecase
    content: Modify CLI PullDataUseCase to read existing config and pass to gateway
    status: completed
  - id: update-gateway
    content: Update PackmindGateway to include previousPackagesSlugs in API request
    status: completed
  - id: implement-api-removal-detection
    content: Add removal detection logic to PullContentUseCase (compute removed packages, fetch artifacts, generate deletion paths)
    status: completed
  - id: update-install-handler
    content: Update pullHandler's installPackagesHandler to read config before pull and display deletion counts
    status: completed
  - id: create-uninstall-handler
    content: Create uninstallPackagesHandler in pullHandler.ts with validation and user feedback
    status: completed
  - id: register-uninstall-command
    content: Add uninstall command with 'remove' alias in main.ts and PullCommand.ts
    status: completed
  - id: expose-hexa-method
    content: Add uninstall method to PackmindCliHexa.ts
    status: completed
  - id: add-tests
    content: Add comprehensive tests for automatic removal, explicit uninstall, and edge cases
    status: completed
  - id: run-quality-gate
    content: Run npm run quality-gate and fix any issues
    status: completed
  - id: commit-changes
    content: "Commit changes with reference to issue #38"
    status: completed
---

# CLI Artifact Deletion Implementation

## Context

The API now supports tracking removed artifacts (recipes/standards) through:

- **Commit 168ac148**: Restructured `renderArtifacts` to accept `installed` and `removed` artifact parameters
- **Commit ba31f1bc**: Implemented deletion logic that generates file paths for removed artifacts
- **Issue #38**: Track and delete artifacts when packages are removed

The CLI currently only handles installation but doesn't track or clean up removed packages.

## Approach: Dual Strategy

We'll implement two complementary approaches:

1. **Automatic Change Detection**: Compare `packmind.json` packages with API response to detect removals during `install`
2. **Explicit Uninstall Command**: New `uninstall` command (with `remove` alias) for explicit package removal

This provides both convenience (automatic) and control (explicit).

## Key Files to Modify

### 1. CLI Commands

- `apps/cli/src/infra/commands/PullCommand.ts` - Add uninstall command and aliases
- `apps/cli/src/infra/commands/pullHandler.ts` - Add `uninstallPackagesHandler`
- `apps/cli/src/main.ts` - Register uninstall command with aliases

### 2. CLI Domain & Infrastructure

- `apps/cli/src/domain/useCases/IPullDataUseCase.ts` - Update command/result types
- `apps/cli/src/application/useCases/PullDataUseCase.ts` - Add removal detection logic
- `apps/cli/src/infra/repositories/PackmindGateway.ts` - Pass removed packages to API
- `apps/cli/src/PackmindCliHexa.ts` - Expose uninstall method

### 3. API Backend (PullContentUseCase)

- `packages/deployments/src/application/useCases/PullContentUseCase.ts` - Detect removed packages and compute removed artifacts

### 4. Types Package

- `packages/types/src/deployments/contracts/IPullContentUseCase.ts` - Add removed packages to command

## Implementation Steps

### Step 1: Update Types for Pull Command

Add support for tracking previously installed packages in the pull command:

```typescript
// packages/types/src/deployments/contracts/IPullContentUseCase.ts
export type PullContentCommand = PackmindCommand & {
  packagesSlugs: string[];
  previousPackagesSlugs?: string[]; // Previously installed packages
};
```

### Step 2: Modify CLI to Track Previous Packages

Update `PullDataUseCase` to read the current config before executing pull, then pass both current and previous packages to the API:

```typescript
// apps/cli/src/application/useCases/PullDataUseCase.ts
- Read existing packmind.json to get previously installed packages
- Pass both packagesSlugs (new) and previousPackagesSlugs to gateway
- Process delete operations from API response
```

### Step 3: Update API PullContentUseCase

Add logic to compute removed packages and artifacts (similar to `PublishArtifactsUseCase`):

```typescript
// packages/deployments/src/application/useCases/PullContentUseCase.ts
1. Compare previousPackagesSlugs with packagesSlugs to find removed packages
2. Fetch recipe/standard versions for removed packages
3. Generate file updates for removed artifacts using deployers
4. Add deletion paths to FileUpdates.delete array
```

Key methods to implement (inspired by `PublishArtifactsUseCase.ts:131-138`):

- `computeRemovedPackages()` - Identify packages to remove
- `fetchArtifactsForRemovedPackages()` - Get recipe/standard versions for removed packages
- `generateDeletionPaths()` - Use deployers to generate file paths for deletion

### Step 4: Update CLI Install Handler

Modify `pullHandler.ts` to:

- Read current config before pull operation
- Pass previous packages to `pullData()`
- Display deletion counts alongside creation/update counts

### Step 5: Add Uninstall Command

Create new uninstall command with the following behavior:

**Command Structure**:

```bash
packmind-cli uninstall <package-slug> [package-slug...]
packmind-cli remove <package-slug> [package-slug...]  # alias
```

**Handler Logic** (`pullHandler.ts:uninstallPackagesHandler`):

```typescript
1. Read current packmind.json to get installed packages
2. Validate that specified packages are currently installed
3. Remove packages from the list
4. Call pullData with:
   - packagesSlugs: remaining packages (after removal)
   - previousPackagesSlugs: all packages (before removal)
5. Update packmind.json with remaining packages
6. Display uninstall results
```

**User Experience**:

```bash
$ packmind-cli uninstall backend
Uninstalling package: backend
Removing 5 recipes and 3 standards...

removed 12 files

Package 'backend' has been uninstalled.
```

**Error Handling**:

- Package not found in packmind.json → warn and skip
- Last package removal → confirm if user wants to remove all packages
- No packmind.json → error with helpful message

### Step 6: Register Commands in main.ts

Add uninstall command with aliases:

```typescript
// apps/cli/src/main.ts
const uninstall = command({
  name: 'uninstall',
  aliases: ['remove'],
  args: {
    packagesSlugs: positional({ 
      type: array(string), 
      displayName: 'package-slug' 
    }),
  },
  handler: (args) => uninstallPackagesHandler(args, deps),
});

subcommands({
  name: 'packmind-cli',
  cmds: {
    install,
    uninstall,  // Add uninstall
    status,
    list,
    show,
    // ... other commands
  },
});
```

### Step 7: Update Tests

Add comprehensive tests for:

**Automatic Removal (install command)**:

- Detecting removed packages during install
- Computing removed recipe/standard versions
- Generating correct deletion file paths
- CLI handler showing deletion counts

**Explicit Uninstall Command**:

- Uninstalling single package
- Uninstalling multiple packages
- Package not installed error
- Empty packmind.json after uninstall
- Using `remove` alias

**Edge Cases**:

- All packages removed
- No changes
- Uninstall non-existent package
- Uninstall with no packmind.json

## Command Examples

### Automatic Removal (during install)

```bash
# User manually edits packmind.json to remove "backend"
$ packmind-cli install
Fetching 1 package: frontend...
Installing 3 recipes and 2 standards...

added 0 files, changed 1 file, removed 8 files
```

### Explicit Uninstall

```bash
# Remove specific package
$ packmind-cli uninstall backend
Uninstalling package: backend
Removing 5 recipes and 3 standards...
removed 12 files
Package 'backend' has been uninstalled.

# Remove multiple packages
$ packmind-cli remove backend frontend
Uninstalling packages: backend, frontend
Removing 8 recipes and 5 standards...
removed 20 files
Packages have been uninstalled.

# Using alias
$ packmind-cli remove backend
```

## Architecture Alignment

This approach mirrors the API's `PublishArtifactsUseCase` pattern:

**API Pattern (PublishArtifactsUseCase.ts:129-138)**:

```typescript
const removedRecipeVersions = this.computeRemovedRecipeVersions(
  previousRecipeVersions,
  recipeVersions,
);
```

**CLI Pattern (PullContentUseCase.ts)**:

```typescript
const removedPackages = this.computeRemovedPackages(
  previousPackagesSlugs,
  packagesSlugs,
);
```

Both use the same underlying deletion mechanism in `CodingAgentServices.renderArtifacts()` (ba31f1bc).

## Testing Strategy

1. **Unit Tests**: Test removal detection logic in isolation
2. **Integration Tests**: Test end-to-end pull with removals
3. **CLI Tests**: Verify user-facing output and file system changes
4. **Command Tests**: Test uninstall command with various scenarios

## Success Criteria

- **Automatic**: When a package is removed from `packmind.json`, the next `install` command automatically deletes related artifact files
- **Explicit**: `uninstall` command successfully removes packages and cleans up files
- **Aliases**: `remove` alias works identically to `uninstall`
- Deletion counts are displayed to users
- Index files are properly updated (removed artifacts no longer listed)
- All tests pass including quality-gate checks
- Error messages are helpful and guide users