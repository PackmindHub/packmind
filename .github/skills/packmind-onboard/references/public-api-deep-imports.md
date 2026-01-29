# Public API vs Deep Import Discipline

Check whether consumers import from module entrypoints or reach into internal paths.

## Search Patterns

### Entrypoint Conventions

```
# Index files (common entrypoints)
index.ts
index.js
index.tsx
index.jsx
mod.rs
__init__.py
package.json (main, exports)

# Explicit public API
/public/
/api/
/exports/

# TypeScript barrel exports
export * from './
export { } from './
```

### Deep Import Indicators

```
# Reaching into src
from '@pkg/src/
from '@module/src/

# Reaching into internals
from '@pkg/internal/
from '@pkg/_internal/
from '@pkg/private/
from '@pkg/lib/
from '@pkg/utils/
from '@pkg/helpers/

# Skipping index
from '@pkg/components/Button/Button'  # vs '@pkg/components/Button'
from '@pkg/services/UserService/impl'  # vs '@pkg/services'

# Path depth indicator
from '@pkg/a/b/c/d'  # Deep path = likely internal
../../packages/foo/src/bar/baz  # Relative deep import
```

### Package.json Exports Field

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./utils": "./dist/utils/index.js"
  }
}
```

### TypeScript Path Mapping

```json
{
  "paths": {
    "@pkg": ["packages/pkg/src/index.ts"],
    "@pkg/*": ["packages/pkg/src/*"]  // Allows deep imports
  }
}
```

## Analysis Method

1. **Identify modules with entrypoints**: Check for index files or exports field
2. **Scan imports across codebase**: Extract all cross-module imports
3. **Classify each import**:
   - Entrypoint: imports from module root or declared export
   - Deep: imports from internal path
4. **Calculate discipline ratio**: % entrypoint vs % deep
5. **Flag modules lacking entrypoints**: No index file, consumers forced to deep import

## Import Classification

| Import Pattern | Classification |
|----------------|----------------|
| `from '@pkg'` | Entrypoint |
| `from '@pkg/index'` | Entrypoint |
| `from '@pkg/submodule'` (if exported) | Entrypoint |
| `from '@pkg/src/internal'` | Deep |
| `from '@pkg/components/X/X'` | Deep |
| `from '../pkg/src/foo'` | Deep (relative) |

## Reporting Threshold

Report only if:
- ≥3 modules exist AND
- (Deep imports ≥20% OR ≥1 module lacks entrypoint)

## Insight Template

```
INSIGHT:
  id: API-[n]
  title: "PUBLIC API: [N]% of imports bypass module entrypoints"
  summary: "Import discipline is [strong|weak|mixed]. [details]"
  confidence: [high|medium|low]
  evidence:
    stats:
      total_cross_module_imports: [N]
      entrypoint_imports: [N] ([%])
      deep_imports: [N] ([%])
    modules_lacking_entrypoint:
      - path — no index file, [N] deep imports from consumers
    worst_offenders:
      - path[:line] — deep import to [target]
```

## Standard/Command Suggestions

- **Standard**: "Import from module entrypoints only" (if deep imports common)
- **Standard**: "Every module exports via index file" (if entrypoints missing)
- **Command**: "Add module entrypoint" (create index.ts with proper exports)
