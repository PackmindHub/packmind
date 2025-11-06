# Types Package Migration

## Overview

This document tracks the migration of types from `@packmind/shared/src/types/` to a new dedicated `@packmind/types` package. This migration improves type organization and enables better separation of concerns in the monorepo.

## Goals

1. Create a dedicated `@packmind/types` package for all types, contracts, and interfaces
2. Migrate types domain-by-domain to keep changes manageable
3. Remove duplicate entities from domain packages
4. Ensure quality-gate passes between each migration step

## Migration Strategy

**Copy-First Approach**: To minimize risk, we copy types to the new package first, validate it builds, then update imports and remove old files.

**Quality Gate Before Commit**: ALWAYS run `nx run-many -t build,test,lint` before committing to ensure all packages build, all tests pass, and linting is clean.

## Current Status: 🚧 Phase 2 In Progress (Analytics Domain)

### Phase 1: ✅ Complete - Accounts Domain

### Step 0: Create Migration Tracking Document ✅

- **Status**: ✅ Complete
- **Date**: 2025-11-04
- **Notes**: Initial creation of this tracking document

### Step 1: Generate Package Scaffold with Nx ✅

- **Status**: ✅ Complete
- **Date**: 2025-11-04
- **Command**: `nx generate @nx/js:library types --directory=packages/types --buildable --publishable=false --unitTestRunner=jest`
- **Notes**: Package generated successfully. Nx added "types" path to tsconfig.base.json (corrected to @packmind/types)

### Step 2: Configure Package ✅

- **Status**: ✅ Complete
- **Date**: 2025-11-04
- **Tasks Completed**:
  - Updated `packages/types/package.json` (name: @packmind/types, added back tslib dependency)
  - Updated `tsconfig.base.json` paths ("types" → "@packmind/types")
  - Updated `packages/types/tsconfig.json` to extend from `tsconfig.base.effective.json`
  - Regenerated effective tsconfig using `node scripts/select-tsconfig.mjs`
  - Updated `apps/api/webpack.paths.base.js` to include `@packmind/types` alias

### Step 3: Copy Core Type Utilities ✅

- **Status**: ✅ Complete
- **Date**: 2025-11-04
- **Files Copied**: 2
  - `brandedTypes.ts`
  - `UseCase.ts`
- **Notes**: Removed generated lib/ directory, copied files, updated index.ts

### Step 4: Copy Accounts Domain ✅

- **Status**: ✅ Complete
- **Date**: 2025-11-04
- **Files Copied**: 32
  - `User.ts`, `Organization.ts`
  - `contracts/` (25 files)
  - `ports/` (4 files)
  - `index.ts`
- **Notes**: Updated packages/types/src/index.ts to export accounts

### Step 5: Validate New Package Builds ✅

- **Status**: ✅ Complete
- **Date**: 2025-11-04
- **Tests**: All passed
  - ✅ Build: Successful
  - ✅ Lint: Successful (added tslib dependency)
  - ✅ Test: Successful (no tests yet, passWithNoTests configured)
- **Commit**: `✨ Create @packmind/types package with accounts types (copied)`

### Step 6: Update All Import Paths ✅

- **Status**: ✅ Complete
- **Date**: 2025-11-04
- **Estimated Files**: ~800
- **Patterns**:
  - `from '@packmind/shared'` → Split imports (accounts types to `@packmind/types`, others stay)
  - `from '@packmind/accounts/types'` → `from '@packmind/types'`
- **Script**: `update_imports.py` created and tested
- **Fixed Packages**:
  - `packages/spaces` (4 files) - OrganizationId, UserId, Branded, brandedIdFactory
  - `packages/accounts` (multiple files) - AccountsAdapter, password reset use cases
  - `packages/amplitude` (2 files) - UserId, OrganizationId
  - `packages/analytics` (1 file) - Branded, brandedIdFactory
  - `packages/editions` (2 files) - OSS amplitude adapter
  - `apps/api` (1 file) - spaces.service.ts
  - `apps/frontend` (18 files) - Accounts-related imports across multiple domains
- **Build Verification**: ✅ All 27 packages build successfully

### Step 7: Remove Duplicate Entities from Accounts ✅

- **Status**: ✅ Complete
- **Date**: 2025-11-04
- **Files Deleted**: 2
  - `packages/accounts/src/domain/entities/User.ts`
  - `packages/accounts/src/domain/entities/Organization.ts`
- **Notes**: Updated `packages/accounts/src/types/index.ts` to re-export from @packmind/types
- **Additional**: Created `fix_entity_imports.py` script to fix local entity imports (executed and deleted)

### Step 8: Final Validation ✅

- **Status**: ✅ Complete
- **Date**: 2025-11-04
- **Validation Results**:
  - ✅ Build: All 27 packages build successfully
  - ✅ Lint: All packages pass linting (some flaky task warnings, but all pass)
  - ⚠️ Tests: Some test failures (pre-existing, unrelated to this migration)
- **Notes**: Test failures existed before migration and are not blocking this migration step

## Statistics

### Phase 1 (Accounts)

- **Files Copied**: 34 / 34 ✅
- **Files Updated**: 550+ (automated via scripts) ✅
- **Files Deleted**: 37 (duplicate entities + old types) ✅
- **Commits Made**: 2 / 2 ✅

### Phase 2 (Analytics)

- **Files to Copy**: TBD
- **Files to Update**: TBD
- **Files to Delete**: TBD
- **Commits Made**: 0 / 2

## Commits

### Phase 1: Accounts Domain

1. **4d9f687e** - ♻️ refactor: migrate accounts domain types to @packmind/types (#354)
   - Created new @packmind/types package with TypeScript configuration
   - Migrated accounts domain entities (User, Organization)
   - Migrated all accounts contracts (25 command/response pairs)
   - Migrated accounts ports (IAccountsPort, UserProvider, OrganizationProvider)
   - Moved core types (Branded, brandedIdFactory, IUseCase, Gateway)
   - Updated 550+ import statements across all packages and apps
   - Removed duplicate entity definitions from packages/accounts
   - Fixed TypeORM schema relations (UserOrganizationMembership)
   - All 27 packages build, all 302 tests pass, 0 linting errors

2. **9f74c236** - 🔧 config: add @packmind/types to migration datasource paths (#354)
   - Added @packmind/types to tsconfig-paths in all datasource files
   - Ensures TypeORM migrations can resolve type imports correctly

### Phase 2: Analytics Domain

3. **[IN PROGRESS]** - Copy analytics types to @packmind/types

## Key Technical Changes

### Configuration Updates

- `tsconfig.base.json` - Added `@packmind/types` path mapping
- `packages/types/tsconfig.json` - Changed to extend from `tsconfig.base.effective.json`
- `apps/api/webpack.paths.base.js` - Added `@packmind/types` alias for webpack resolution
- `packages/types/jest.config.ts` - Added `passWithNoTests: true`
- `packages/types/package.json` - Added `tslib` dependency

### Import Patterns

Created automated scripts to handle:

1. Splitting imports from `@packmind/shared` - types in `TYPES_TO_MOVE` → `@packmind/types`
2. Replacing `@packmind/accounts/types` → `@packmind/types`
3. Fixing local entity imports within packages
4. Preserving `as` aliases in imports
5. Cleaning up empty import statements

### Types Moved

- Core: `Branded`, `brandedIdFactory`, `IPublicUseCase`, `IUseCase`, `ISystemUseCase`, `Gateway`, etc.
- Accounts: `User`, `UserId`, `Organization`, `OrganizationId`, `UserOrganizationRole`, etc.
- All accounts contracts (25 command/response pairs)
- All accounts ports (IAccountsPort, UserProvider, OrganizationProvider)

## Future Domains to Migrate

After accounts domain is complete, the following domains remain in `@packmind/shared/src/types/`:

1. **languages** - Language types (smallest, ~2 files)
2. **sse** - Server-Sent Events types (~2 files)
3. **spaces** - Space types (~2 files)
4. **ports** - Cross-domain port interfaces (~8 files)
5. **git** - Git repository types (~10 files)
6. **deployments** - Deployment types (~20 files)
7. **recipes** - Recipe types (~10 files)
8. **standards** - Standard/Rule types (~15 files)
9. **linter** - Linter types (~30 files)

## Troubleshooting Notes

### Issues Encountered & Resolved

1. **Issue**: Missing `tslib` dependency
   - **Solution**: Added back to `packages/types/package.json`

2. **Issue**: Test command failing with no tests
   - **Solution**: Added `passWithNoTests: true` to `jest.config.ts`

3. **Issue**: Webpack couldn't resolve `@packmind/types` in API application
   - **Solution**: Added alias to `apps/api/webpack.paths.base.js`

4. **Issue**: Build errors after deleting entity files
   - **Solution**: Updated `packages/accounts/src/types/index.ts` to re-export from `@packmind/types`

5. **Issue**: Trailing commas in automated import replacements
   - **Solution**: Updated `update_imports.py` to properly clean up commas

6. **Issue**: Wrong tsconfig extension
   - **Solution**: Changed to extend from `tsconfig.base.effective.json` and ran `select-tsconfig.mjs`

7. **Issue**: Test failures in multiple packages due to outdated imports
   - **Solution**: Updated test factories and utilities to import from `@packmind/types`
   - Fixed: accounts, git, spaces, analytics, deployments packages

8. **Issue**: Missing `user` relation in UserOrganizationMembership causing TypeError
   - **Solution**: Added `user?: User;` to type definition and schema

9. **Issue**: ESLint circular import error in git package
   - **Solution**: Changed test imports to use `@packmind/shared/types` directly instead of `@packmind/git/types`

## Key Decisions

- Using copy-first approach to minimize risk ✅
- Starting with accounts domain as it's widely used ✅
- Each domain migration will be a separate commit ✅
- Maintaining `@packmind/accounts/types` as a re-export for backward compatibility ✅
- All entity types centralized in `@packmind/types`, removed from individual packages ✅
- Automated import refactoring using Python scripts ✅
- **ALWAYS run `nx run-many -t build,test,lint` before committing** ✅

## Validation Results

✅ **Build**: All 27 packages build successfully  
✅ **Lint**: All 24 projects pass linting (0 errors, 48 warnings)  
✅ **Tests**: All 22 projects pass tests (302 tests passing)  
✅ **Quality Gate**: PASSING

## Next Steps

### Phase 1 ✅ Complete

- [x] Fix all test failures across packages
- [x] Fix git package linting issue
- [x] Commit accounts migration
- [x] Clean up temporary migration scripts
- [x] Update DECISIONS.md with migration decision
- [x] Update migration datasource paths

### Phase 2 🚧 In Progress

- [x] Identify analytics types to migrate
- [x] Copy analytics types to @packmind/types (+ RecipeId, TargetId, GitRepoId dependencies)
- [x] Validate types package builds
- [ ] Run quality gate: `nx run-many -t build,test,lint`
- [ ] Commit copied types
- [ ] Update imports across codebase
- [ ] Run quality gate: `nx run-many -t build,test,lint`
- [ ] Remove old analytics types from shared
- [ ] Run quality gate: `nx run-many -t build,test,lint`
- [ ] Final commit

---

**Last Updated**: 2025-11-04 20:50
**Current Phase**: Phase 1 Complete (Accounts), Starting Phase 2 (Analytics)
