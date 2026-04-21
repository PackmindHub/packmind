---
description: 'Create a new buildable TypeScript package in the Packmind Nx monorepo, wiring up TypeScript paths, TypeORM, and Webpack so it can serve as a reusable shared or domain-specific library for consistent, type-safe code reuse across applications.'
agent: 'agent'
---

# Create New Package 

Create a new buildable TypeScript package in the Packmind monorepo using Nx tools and configure it for use across applications.

## When to Use

- Creating a new shared library package for common utilities or domain logic
- Setting up a domain-specific package following DDD architecture
- Establishing internal dependencies for code reuse across apps and packages
- Extracting common code into a reusable module

## Context Validation Checkpoints

* [ ] What is the package name and its primary responsibility?
* [ ] Which packages or applications will consume this package?
* [ ] Will the package be used by the API application (requires webpack config)?
* [ ] What external dependencies does the package require (e.g., TypeORM, Winston)?
* [ ] Are there any special build requirements (e.g., WASM files, assets)?

## Recipe Steps

### Step 1: Generate Package Scaffold with Nx

Run the Nx generator to create the package structure with TypeScript configs, Jest setup, ESLint config, and project.json.

```bash
nx generate @nx/js:library <package-name> \
  --directory=packages/<package-name> \
  --buildable \
  --publishable=false \
  --unitTestRunner=jest
```

### Step 2: Configure Package Metadata

Update `packages/<package-name>/package.json` with the correct name and dependencies. Always use `@packmind/` prefix and set `"private": true` for internal packages.

```json
{
  "name": "@packmind/<package-name>",
  "version": "0.0.1",
  "private": true,
  "type": "commonjs",
  "main": "./src/index.js",
  "types": "./src/index.d.ts",
  "dependencies": {
    "tslib": "^2.3.0"
  }
}
```

### Step 3: Update TypeScript Path Mappings

Add the path alias to `tsconfig.base.json` (Nx generates it without `@packmind/` prefix - fix this). Then regenerate the effective TypeScript config by running `node scripts/select-tsconfig.mjs`.

```json
{
  "compilerOptions": {
    "paths": {
      "@packmind/<package-name>": ["packages/<package-name>/src/index.ts"]
    }
  }
}
```

### Step 4: Register Package in TypeORM Datasource Files

Add the package to TypeScript path mappings in all datasource configuration files. This is required for `typeorm-ts-node-commonjs` to resolve package imports when running migrations.

**Files to update:**
- `packages/migrations/datasourceDocker.ts`
- `packages/migrations/datasource.ts`
- `packages/migrations/datasourceMigrations.ts`

```typescript
register({
  baseUrl: '../../',
  paths: {
    '@packmind/<package-name>': ['packages/<package-name>/src/index.ts'],
    // ... other existing packages
  },
});
```

### Step 5: Update Webpack Configuration (If Used by API)

If your package will be consumed by the API application, add webpack aliases to `apps/api/webpack.paths.base.js`. For proprietary-only packages, add to `apps/api/webpack.paths.proprietary.js` instead.

```javascript
module.exports = function getBaseWebpackPaths(__dirname) {
  return {
    // ... existing aliases
    '@packmind/<package-name>': join(__dirname, '../../packages/<package-name>/src'),
  };
};
```

### Step 6: Organize Source Files and Exports

Remove the auto-generated `lib/` directory and organize your code directly in `src/`. Update `src/index.ts` to export the public API. Keep test files colocated with source.

```typescript
// src/index.ts
export * from './MyClass';
export * from './types';
export type { MyInterface } from './interfaces';
```

### Step 7: Add Internal Dependencies

Add dependencies to `packages/<package-name>/package.json` (use `"*"` for internal packages). Then import in your code using the package name.

```json
{
  "dependencies": {
    "@packmind/shared": "*",
    "@packmind/logger": "*"
  }
}
```

### Step 8: Validate the Package

Run the package-specific validation commands to ensure everything builds and tests correctly. All three commands must pass before proceeding.

```bash
nx build <package-name>
nx lint <package-name>
nx test <package-name>
```

### Step 9: Run Full Quality Gate

Before committing, run the full quality gate to validate the entire monorepo. This validates typecheck, tests, linting, builds, and Packmind standards. Do not commit until this passes.

```bash
npm run quality-gate
```