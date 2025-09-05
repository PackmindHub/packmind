# packmind-plugin

This is an Nx plugin that provides generators for the Packmind workspace.

## Generators

### Domain Generator

The domain generator modifies existing projects to add domain-specific features and services.

#### Usage

```bash
# Specify project directly
nx generate packmind-plugin:domain user --project=shared

# Will prompt you to select from available projects
nx generate packmind-plugin:domain user

# Short form
nx g packmind-plugin:domain user --project=shared
```

#### What it does

**When modifying existing projects:**

- Adds feature files to the specified project under `src/lib/{name}/`
- Updates the project's main `index.ts` to export new features
- Creates Angular services in the frontend app (if it exists)
- Updates configuration files

**Always does:**

- Adds npm scripts to `package.json`
- Creates services in the frontend app (if it exists)
- Updates `nx.json` with generator defaults
- Formats all modified files

#### Options

- `name` (required): Name of the domain/feature
- `project` (required): Name of existing project to modify - **Nx will show you a dropdown of available projects**

#### Examples

```bash
# Add "auth" features to existing "shared" library
nx generate packmind-plugin:domain auth --project=shared

# Add "profile" features - will prompt for project selection
nx generate packmind-plugin:domain profile
```

## Nx Project Integration

This generator uses Nx's built-in project selection features:

- **`"x-dropdown": "projects"`** - Shows a dropdown of all available projects
- **`"$source": "projectName"`** - Integrates with Nx's project context
- **`--project` flag** - Standard Nx way to target specific projects

You can run the generator in several ways:

1. **With project flag**: `nx g packmind-plugin:domain myfeature --project=shared`
2. **Interactive mode**: `nx g packmind-plugin:domain myfeature` (will prompt for project)
3. **From project directory**: `cd libs/shared && nx g packmind-plugin:domain myfeature`

## File Modification Techniques

This generator demonstrates several file modification techniques:

### 1. JSON File Updates

Uses `updateJson()` to modify `package.json` and `nx.json`:

```typescript
updateJson(tree, 'package.json', (packageJson) => {
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts[`build-${options.name}`] = `nx build ${options.project}`;
  return packageJson;
});
```

### 2. String Replacement

Modifies TypeScript files using string manipulation:

```typescript
const content = tree.read(filePath, 'utf-8');
const newContent = content.replace(/pattern/g, 'replacement');
tree.write(filePath, newContent);
```

### 3. Template Generation

Creates new files from templates with variable substitution:

```typescript
generateFiles(tree, templatePath, destinationPath, options);
```

### 4. Conditional File Operations

Checks for file existence before modification:

```typescript
if (tree.exists(filePath)) {
  // Modify file
}
```

## Building

Run `nx build packmind-plugin` to build the library.

## Running unit tests

Run `nx test packmind-plugin` to execute the unit tests via [Jest](https://jestjs.io).
