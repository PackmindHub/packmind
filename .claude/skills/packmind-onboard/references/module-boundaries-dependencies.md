# Module Boundaries & Dependency Direction

Detect allowed vs actual dependencies, deep imports, and boundary violations.

## Search Patterns

### Module/Package Detection

```
# Monorepo packages
packages/*/
apps/*/
libs/*/
modules/*/

# Domain modules (single repo)
src/modules/*/
src/domains/*/
src/features/*/
src/bounded-contexts/*/

# Layer-based
src/application/
src/domain/
src/infrastructure/
src/infra/
src/presentation/
```

### Dependency Configuration Files

```
# Nx
nx.json
project.json (implicitDependencies, tags)

# Lerna
lerna.json

# pnpm
pnpm-workspace.yaml

# Yarn
workspaces field in package.json

# TypeScript
tsconfig.json (paths, references)
tsconfig.base.json

# ESLint boundaries
.eslintrc.* (import/no-restricted-paths, boundaries/*)

# Go
go.mod
go.work

# Rust
Cargo.toml (workspace members)

# Python
pyproject.toml (packages)
```

### Import Pattern Detection

```
# Relative cross-module imports (violations)
from '../packages/
from '../../modules/
from '../../../domain/

# Absolute cross-module imports
from '@packages/
from '@modules/
from '@libs/
from '@app/

# Deep imports (potential violations)
from '@package/internal/
from '@module/src/
from '@lib/utils/helpers/
/private/
/internal/
/_internal/
```

### Dependency Direction Rules (Common)

```
# Hexagonal / Clean Architecture
domain <- application <- infrastructure
domain <- application <- presentation

# Typical violations
infrastructure -> domain (should be inverted)
presentation -> infrastructure (should go through application)

# Layer imports
/infra/ importing from /domain/ directly
/controllers/ importing from /repositories/
```

## Analysis Method

1. **Enumerate modules**: List packages/apps/modules
2. **Build dependency graph**: For each module, extract imports
3. **Infer allowed dependencies**:
   - From config (Nx tags, ESLint rules, tsconfig paths)
   - From architecture markers (hexagonal layers)
4. **Detect violations**:
   - Cross-boundary imports not in allowed list
   - Deep imports bypassing entrypoints
   - Circular dependencies

## Dependency Graph Construction

```
For each source file in module A:
  For each import statement:
    If import targets module B:
      Add edge A -> B
      Record import path (entrypoint vs deep)
```

## Violation Categories

| Violation             | Pattern                        | Severity |
| --------------------- | ------------------------------ | -------- |
| **Layer breach**      | infra imports domain internals | High     |
| **Deep import**       | `@pkg/src/internal/helper`     | Medium   |
| **Circular**          | A -> B -> C -> A               | High     |
| **Sibling coupling**  | feature-a imports feature-b    | Medium   |
| **Upward dependency** | domain imports application     | High     |

## Reporting Threshold

Report only if:

- ≥3 modules exist AND
- ≥1 boundary violation detected

## Insight Template

```
INSIGHT:
  id: DEPS-[n]
  title: "BOUNDARIES: [N] dependency violations across [M] modules"
  summary: "Module boundaries are [mostly respected|frequently violated]. [top violations]"
  confidence: [high|medium|low]
  evidence:
    violations:
      - from: "module-a"
        to: "module-b"
        type: "[layer-breach|deep-import|circular|sibling]"
        files:
          - path[:line] — imports [target]
  allowed_dependencies:
    - inferred from: "[config file or architecture]"
```

## Standard/Command Suggestions

- **Standard**: "Respect module boundaries - no deep imports" (if deep imports common)
- **Standard**: "Domain layer has no infrastructure dependencies" (if layer breaches found)
- **Standard**: "Features must not import sibling features directly" (if sibling coupling found)
