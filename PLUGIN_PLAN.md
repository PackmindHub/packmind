# Packmind Plugin System Architecture

## Overview

This document outlines the architecture for adding plugin support to Packmind, allowing external repositories to build and bundle Hexa domains (and eventually frontend components) that can be loaded dynamically at runtime.

**Status**: Phase 1 (Backend Hexa Loading) is **COMPLETED** ✅. Plugin loading is functional and integrated into API and MCP Server.

## Core Principles

1. **Pure Runtime Loading**: Plugins are loaded entirely at runtime - the build process only copies files
2. **Build Independence**: The build process does not analyze, validate, or bundle plugin content
3. **Hot-Pluggable**: Plugins can be added/removed without rebuilding the main applications
4. **Multi-App Support**: Plugins work across all Packmind applications (api, mcp-server, cli, frontend)

## Plugin Structure

### Directory Layout

```
plugins/
  my-plugin/
    manifest.json          # Plugin metadata and configuration
    hexaBundle.cjs         # Backend Hexa bundle (CommonJS)
    frontendBundle.cjs     # Frontend routes/components bundle (CommonJS)
    # Optional: assets, migrations, etc.
```

### Manifest Structure

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "id": "my-plugin",
  "description": "Plugin description",
  "backend": {
    "hexaBundle": "hexaBundle.cjs",
    "hexaExport": "MyPluginHexa", // Export name in the bundle
    "opts": {} // Optional: Hexa constructor options
  },
  "frontend": {
    "bundle": "frontendBundle.cjs",
    "routes": [
      // Route definitions
      {
        "path": "org/:orgSlug/my-feature",
        "component": "MyFeatureRoute",
        "loader": "myFeatureLoader" // Optional: loader function name
      }
    ]
  },
  "dependencies": {
    "packmind": "^1.3.0"
  },
  "typeorm": {
    "entities": [] // Optional: TypeORM entity classes
  }
}
```

## File Locations

### Source Location

- **Development**: `plugins/` at monorepo root
- **Production**: `dist/plugins/` (copied during build)

### Runtime Resolution

- **Development**: Load from `plugins/` (relative to process.cwd())
- **Production**: Load from `dist/plugins/` (relative to process.cwd())
- **Configurable**: Via `PACKMIND_PLUGINS_DIR` environment variable

## Build Process

### Simple File Copy

The build process **only copies** plugin files without any analysis:

```json
// In each app's project.json or build config
{
  "assets": [
    {
      "input": "plugins",
      "glob": "**/*",
      "output": "plugins"
    }
  ]
}
```

**Key Points:**

- ✅ Build does NOT analyze plugin content
- ✅ Build does NOT validate plugins
- ✅ Build does NOT modify plugin files
- ✅ Build does NOT bundle plugins into app code
- ✅ Build is a simple file copy operation

### Build Output

```
dist/
  ├── apps/
  │   ├── api/
  │   ├── mcp-server/
  │   ├── cli/
  │   └── frontend/
  └── plugins/              # Copied from source plugins/
      └── my-plugin/
          ├── manifest.json
          ├── hexaBundle.cjs
          └── frontendBundle.cjs
```

## Runtime Loading

### Backend (api, mcp-server, cli)

**Loading Process:**

1. Scan plugin directory for `manifest.json` files
2. Read and parse manifest
3. Load `hexaBundle.cjs` using `require()` or dynamic `import()`
4. Extract Hexa class from the bundle using the `hexaExport` name
5. Validate that the class extends `BaseHexa`
6. Register Hexa with `HexaRegistry` (before initialization)
7. HexaRegistry initialization will instantiate and initialize the plugin Hexa

**Implementation:**

```typescript
// packages/node-utils/src/hexa/HexaPluginLoader.ts
export class HexaPluginLoader {
  async loadFromDirectory(pluginDir: string): Promise<LoadedPlugin[]> {
    // Scan for manifest.json files
    // Load and parse manifests
    // Load hexaBundle.cjs files
    // Extract Hexa classes
    // Return loaded plugins
  }
}
```

**Integration Points:**

- `apps/api/src/app/shared/HexaRegistryModule.ts` - Load plugins before registering built-in hexas
- `apps/mcp-server/src/hexa-registry.ts` - Load plugins before registering built-in hexas
- `apps/cli/src/PackmindCliHexaFactory.ts` - Load plugins when creating CLI hexa registry

### Frontend

**Loading Process:**

1. Scan plugin directory for `manifest.json` files
2. Read and parse manifest
3. Load `frontendBundle.cjs` using dynamic `import()`
4. Extract route components from the bundle
5. Register routes with React Router dynamically

**Implementation:**

```typescript
// apps/frontend/app/routes.tsx
import { type RouteConfig } from '@react-router/dev/routes';
import { flatRoutes } from '@react-router/fs-routes';
import { loadPluginRoutes } from '../src/plugins/pluginLoader';

export default async function routes(): Promise<RouteConfig> {
  const fileBasedRoutes = flatRoutes();
  const pluginRoutes = await loadPluginRoutes();
  return mergeRoutes(fileBasedRoutes, pluginRoutes);
}
```

**Route Registration:**

- Plugin routes are merged with file-based routes
- Routes follow React Router v7 conventions
- Routes can be organization-scoped or space-scoped

## Plugin Development

### Development Workflow

When developing a plugin in a separate repository while working on the core Packmind project:

1. **Setup plugin development link:**

   ```bash
   npm run setup-plugin-dev /path/to/plugin/repository
   ```

   This script:
   - Creates a symlink from `plugins/plugin-name` to the plugin repository
   - Sets up npm links for `@packmind/node-utils` and `@packmind/types` in the plugin repo
   - Ensures the plugin can resolve core packages from the monorepo

2. **Build core packages (if needed):**

   ```bash
   nx build node-utils
   nx build types
   ```

3. **Develop plugin:**
   - Work on plugin code in the separate repository
   - Plugin can import from `@packmind/node-utils` and `@packmind/types`
   - Changes to core packages require rebuilding them

4. **Test plugin:**
   - Plugin is automatically loaded from `plugins/plugin-name` in development
   - No rebuild of core apps needed when plugin changes

### Creating a Plugin

1. **Create plugin structure:**

   ```
   my-plugin/
     src/
       MyPluginHexa.ts
       frontend/
         MyFeatureRoute.tsx
     package.json
     manifest.json
   ```

2. **Plugin package.json:**

   ```json
   {
     "name": "my-plugin",
     "version": "1.0.0",
     "dependencies": {
       "@packmind/node-utils": "workspace:*",
       "@packmind/types": "workspace:*"
     }
   }
   ```

3. **Build hexaBundle.cjs:**
   - Bundle `MyPluginHexa.ts` and dependencies
   - Export as CommonJS
   - Export the Hexa class with the name specified in manifest
   - **Important**: Bundle must include `@packmind/node-utils` and `@packmind/types` or mark them as external

4. **Build frontendBundle.cjs:**
   - Bundle React components and routes
   - Export as CommonJS
   - Export route components

5. **Create manifest.json:**
   - Define plugin metadata
   - Specify bundle file names
   - Define route configurations

### Plugin Hexa Requirements

Plugins must export a class that:

- Extends `BaseHexa` from `@packmind/node-utils`
- Implements all abstract methods:
  - `initialize(registry: HexaRegistry): Promise<void>`
  - `getAdapter(): TPort`
  - `getPortName(): string`
  - `destroy(): void`

**Example:**

```typescript
import { BaseHexa, BaseHexaOpts, HexaRegistry } from '@packmind/node-utils';
import { DataSource } from 'typeorm';

export class MyPluginHexa extends BaseHexa<BaseHexaOpts, IMyPluginPort> {
  constructor(dataSource: DataSource, opts?: Partial<BaseHexaOpts>) {
    super(dataSource, opts);
    // Initialize repositories, services, etc.
  }

  async initialize(registry: HexaRegistry): Promise<void> {
    // Access other hexas via registry
    // Set up adapters
    // Async initialization
  }

  getAdapter(): IMyPluginPort {
    return this.adapter;
  }

  getPortName(): string {
    return 'IMyPluginPort';
  }

  destroy(): void {
    // Cleanup
  }
}
```

## Implementation Phases

### Phase 1: Backend Hexa Loading ✅ COMPLETED

- [x] Create `HexaPluginLoader` utility
- [x] Add plugin directory scanning
- [x] Implement manifest parsing
- [x] Implement hexaBundle.cjs loading
- [x] Integrate with HexaRegistry in api, mcp-server
- [x] Error handling and validation
- [x] Logging and debugging support
- [x] Build, test, and lint fixes
- [ ] Add build asset copying (for production builds)
- [ ] Integrate with CLI (packmind-cli)

### Phase 2: Frontend Route Loading (Future)

- [ ] Create frontend plugin loader
- [ ] Implement dynamic route registration
- [ ] Update React Router configuration
- [ ] Handle plugin route components
- [ ] Support plugin route loaders
- [ ] Navigation integration

### Phase 3: Advanced Features (Future)

- [ ] TypeORM entity support
- [ ] Plugin dependencies
- [ ] Plugin lifecycle hooks
- [ ] Plugin configuration UI
- [ ] Plugin marketplace/discovery

## Error Handling

### Plugin Loading Errors

- Invalid manifest.json → Log error, skip plugin
- Missing bundle file → Log error, skip plugin
- Invalid Hexa class → Log error, skip plugin
- Hexa registration failure → Log error, skip plugin

### Runtime Errors

- Plugin Hexa initialization failure → Log error, continue with other hexas
- Plugin route loading failure → Log error, continue with other routes

## Security Considerations

- Plugins are loaded from a controlled directory
- Plugins must export valid Hexa classes
- Plugin code runs with same privileges as main app
- Consider sandboxing for untrusted plugins (future)

## Configuration

### Environment Variables

- `PACKMIND_PLUGINS_DIR`: Override default plugin directory path
- `PACKMIND_PLUGINS_ENABLED`: Enable/disable plugin loading (default: true)

### Development vs Production

- **Development**: Load from `plugins/` (source directory)
- **Production**: Load from `dist/plugins/` (build output)

## Testing Strategy

1. **Unit Tests**: Test HexaPluginLoader in isolation
2. **Integration Tests**: Test plugin loading in each app
3. **E2E Tests**: Test plugin Hexa registration and initialization
4. **Plugin Examples**: Create example plugins for testing

## Open Questions

1. **TypeORM Entities**: How should plugins provide their own entities?
   - Option A: Plugins register entities in their Hexa constructor
   - Option B: Plugins export entity classes, main app registers them
   - Option C: Plugins use existing entity registration mechanism

2. **Plugin Dependencies**: How to handle plugin-to-plugin dependencies?
   - Option A: Load plugins in dependency order (requires dependency graph)
   - Option B: Plugins access other plugins via HexaRegistry

3. **Frontend Bundle Format**: Should frontend bundles be ESM or CommonJS?
   - React Router v7 supports both
   - CommonJS might be simpler for initial implementation

4. **Plugin Versioning**: How to handle plugin updates?
   - Hot-reload plugins?
   - Restart required?
   - Version compatibility checks?

## Plugin Development Setup - DX Challenges & Solutions

### The Challenge

Developing plugins in a separate repository while working on the core Packmind project presents several DX challenges:

1. **Package Resolution**: `@packmind/node-utils` and `@packmind/types` are not published to npm
2. **Build Dependencies**: Plugin needs access to built packages, not source
3. **TypeScript Support**: Plugin needs type definitions for IDE/type checking
4. **Hot Reload**: Changes to core packages should be reflected in plugin development
5. **Bundling Strategy**: Should plugins bundle core packages or mark them external?

### DX Challenges to Solve

#### Challenge 1: Package Resolution

**Problem**: Plugin repo can't use `workspace:*` because it's not part of the monorepo workspace.

**Options:**

- **Option A: npm link** (Global symlinks)
  - ✅ Works across repos
  - ❌ Global state, can be fragile
  - ❌ Requires packages to be built first
  - ❌ Paths are absolute, breaks if monorepo moves

- **Option B: file: protocol** (Relative paths in package.json)
  - ✅ Simple, no global state
  - ❌ Requires absolute or relative paths
  - ❌ Breaks if plugin repo moves
  - ❌ Need to update package.json manually

- **Option C: pnpm link** (If using pnpm)
  - ✅ Better than npm link
  - ❌ Requires pnpm in plugin repo
  - ❌ Still requires built packages

- **Option D: Manual node_modules symlinks**
  - ✅ Full control
  - ❌ Manual setup, error-prone
  - ❌ Breaks on npm install

**Recommendation**: Use npm link with a setup script that handles the complexity.

#### Challenge 2: Build Requirements

**Problem**: Core packages must be built before plugin can use them.

**Questions:**

- Should setup script auto-build if packages aren't built?
- Should it watch for changes and rebuild?
- How to handle when core packages change during development?

**Proposed Solution:**

- Setup script checks if packages are built, builds if needed
- Provide separate command: `npm run build-core-packages`
- Document that core changes require rebuild

#### Challenge 3: TypeScript Type Resolution

**Problem**: Plugin needs `.d.ts` files for TypeScript/IDE support.

**Questions:**

- Do built packages include `.d.ts` files? (Yes, they should)
- Does npm link preserve type definitions?
- How to configure plugin's tsconfig.json?

**Proposed Solution:**

- Built packages include `.d.ts` files in `dist/packages/*/src/*.d.ts`
- npm link should preserve types
- Plugin tsconfig can reference linked packages normally

#### Challenge 4: Bundling Strategy

**Problem**: When building plugin bundle, should `@packmind/node-utils` and `@packmind/types` be:

- Bundled into the plugin? (Larger bundle, duplicates code)
- Marked as external? (Requires runtime resolution)

**Considerations:**

- Runtime loading: Plugin loader runs in Packmind context where packages already exist
- Bundle size: External is smaller
- Version conflicts: External avoids conflicts
- Runtime errors: External requires packages to be available

**Recommendation**: Mark as external - plugins run in Packmind context where packages are already loaded.

#### Challenge 5: Development Workflow Friction

**Questions:**

- How often do developers need to rebuild core packages?
- Should there be a watch mode for core packages?
- How to test plugin changes without restarting Packmind apps?
- What happens if plugin repo has its own node_modules?

**Proposed Workflow:**

1. Initial setup: `npm run setup-plugin-dev /path/to/plugin`
2. Develop plugin in separate repo
3. When core packages change: `npm run build-core-packages` (or auto-detect)
4. Plugin changes: Rebuild plugin bundle, Packmind auto-reloads (runtime loading)

#### Challenge 6: Symlink Conflicts

**Problem**: Symlinking plugin repo to `plugins/` might conflict with:

- Plugin repo's own `.gitignore`
- Plugin repo's `node_modules`
- Plugin repo's build artifacts

**Questions:**

- Should plugin repo have its own `node_modules`?
- Should we symlink the entire repo or just the dist folder?
- How to handle plugin repo's git state?

**Proposed Solution:**

- Symlink entire plugin repo (simpler)
- Plugin repo manages its own `node_modules` (separate from core)
- Core's `.gitignore` should ignore `plugins/` directory (contains copied plugin files)
- Plugin's `.gitignore` should ignore its own build artifacts
- **Docker Support**: The `plugins/` directory is automatically available in Docker containers via the volume mount `.:/packmind` in docker-compose.yml

### Proposed Setup Script Behavior

```bash
npm run setup-plugin-dev /path/to/plugin/repository
```

**What it should do:**

1. ✅ Validate plugin repo path exists
2. ✅ Read plugin name from `package.json` or `manifest.json`
3. ✅ Check if core packages are built, build if needed
4. ✅ Create symlink: `plugins/{plugin-name}` → `/path/to/plugin/repository`
5. ✅ Navigate to plugin repo
6. ✅ Run `npm link` for `@packmind/node-utils` and `@packmind/types` pointing to `dist/packages/*`
7. ✅ Run `npm install` in plugin repo (to install other dependencies)
8. ✅ Verify setup (check that packages resolve)

**What it should NOT do:**

- ❌ Modify plugin repo's package.json
- ❌ Create files in plugin repo
- ❌ Assume plugin repo structure

### Open Questions

1. **Package Manager**: Should we support both npm and pnpm? (Currently using npm)
2. **Watch Mode**: Should setup script offer a watch mode for core packages?
3. **Multiple Plugins**: How to handle multiple plugin repos?
4. **Cleanup**: Should there be a `teardown-plugin-dev` command?
5. **Plugin Structure**: Should we enforce a specific plugin repo structure?
6. **Error Handling**: What happens if link fails? How to recover?
7. **Cross-Platform**: Will symlinks work on Windows? (Need junction on Windows)

## Implementation Status

### ✅ Completed (Phase 1)

1. **HexaPluginLoader Utility** (`packages/node-utils/src/hexa/HexaPluginLoader.ts`)
   - Scans plugin directory for `manifest.json` files
   - Loads and parses plugin manifests
   - Dynamically loads `hexaBundle.cjs` files
   - Extracts and validates Hexa classes
   - Comprehensive error handling and logging

2. **Integration Points**
   - ✅ Integrated into `HexaRegistryModule` (NestJS API)
   - ✅ Integrated into `hexa-registry.ts` (MCP Server)
   - ⏳ CLI integration pending

3. **Sample Plugin Repository**
   - Created `/home/croquette/Code/packmind-plugin` with:
     - Sample Hexa implementation (`SamplePluginHexa`)
     - Nx build configuration
     - Setup script for core dependencies (`setup-core-deps.js`)
     - Manifest structure

4. **Development Workflow**
   - Plugin repository structure established
   - Core dependency copying script (`setup-core-deps.js`)
   - File-based package resolution using `file:` protocol
   - Symlink support for plugin development

5. **Quality Assurance**
   - ✅ All tests passing (node-utils: 114 tests, api: 101 tests)
   - ✅ Build successful for node-utils and api
   - ✅ Lint passing for node-utils and api

### 🔄 Next Steps

1. **Build Asset Copying**
   - Add plugin directory copying to build configs (api, mcp-server, cli)
   - Ensure plugins are copied to `dist/plugins/` during build

2. **CLI Integration**
   - Integrate plugin loading into `PackmindCliHexaFactory`

3. **Testing**
   - Test plugin loading with sample plugin
   - Verify plugin Hexa initialization
   - Test plugin error handling

4. **Documentation**
   - Create plugin development guide
   - Document plugin manifest structure
   - Document bundling requirements

5. **Future Enhancements**
   - Frontend plugin loading (Phase 2)
   - TypeORM entity support
   - Plugin dependencies management
   - Plugin lifecycle hooks
