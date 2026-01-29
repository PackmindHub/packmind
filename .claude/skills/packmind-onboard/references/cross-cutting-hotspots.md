# Cross-Cutting Hotspot Detection

Identify "god files/modules" by fan-in/fan-out heuristics and recommend refactor boundaries.

## Search Patterns

### High Fan-In Indicators (Many Dependents)

```
# Files imported by many others
# Detect by counting: grep -r "from './[file]" | wc -l

# Common hotspot names
utils.
helpers.
common.
shared.
constants.
types.
index. (barrel exports)
config.
```

### High Fan-Out Indicators (Many Dependencies)

```
# Files with many imports
# Count import statements per file

# Long import blocks
import {
import {
import {
import {
import {
...

# Many from different modules
from '@module-a/
from '@module-b/
from '@module-c/
from '@module-d/
```

### God File Patterns

```
# Very large files
# Lines > 500-1000

# Many exports
export const
export function
export class
export type
export interface
export enum

# Many public methods
public method1(
public method2(
public method3(
...

# Multiple responsibilities in name
UserOrderPaymentService
EverythingManager
MasterController
```

### Coupling Patterns

```
# Circular dependency indicators
# A imports B, B imports C, C imports A

# Tight coupling
# Multiple files import same set of dependencies

# Facade that knows too much
# Single file orchestrating many modules
```

## Analysis Method

1. **Build dependency graph**: For each file, track imports and importers
2. **Calculate metrics**:
   - Fan-in: Number of files that import this file
   - Fan-out: Number of files this file imports
   - Coupling score: Fan-in × Fan-out
3. **Identify hotspots**: Files with high coupling score
4. **Analyze hotspot contents**: What responsibilities does it have?
5. **Recommend boundaries**: How to split the hotspot?

## Hotspot Thresholds

| Metric             | Threshold | Interpretation                       |
| ------------------ | --------- | ------------------------------------ |
| **Fan-in**         | >10       | Many dependents, high impact changes |
| **Fan-out**        | >10       | Many dependencies, fragile           |
| **Coupling score** | >50       | Critical hotspot                     |
| **Lines of code**  | >500      | Likely too many responsibilities     |
| **Exports**        | >20       | Possible kitchen sink                |

## Hotspot Categories

| Type             | Fan-in | Fan-out | Example                             |
| ---------------- | ------ | ------- | ----------------------------------- |
| **Gravity well** | High   | Low     | `utils.ts`, `constants.ts`          |
| **Octopus**      | Low    | High    | Orchestrator with too many deps     |
| **God object**   | High   | High    | Central service doing everything    |
| **Stable base**  | High   | Low     | Core types, interfaces (acceptable) |

## Refactoring Recommendations

| Hotspot Type         | Recommendation                        |
| -------------------- | ------------------------------------- |
| **Gravity well**     | Split by domain/concern               |
| **Octopus**          | Introduce facades, reduce direct deps |
| **God object**       | Extract single-responsibility classes |
| **Barrel re-export** | Consider direct imports               |

## Reporting Threshold

Report only if:

- ≥1 file with coupling score >50 OR
- ≥3 files with fan-in >10

## Insight Template

```
INSIGHT:
  id: HOTSPOT-[n]
  title: "HOTSPOTS: [N] files have critical coupling scores"
  summary: "High-coupling files detected that may impede maintainability."
  confidence: [high|medium|low]
  evidence:
    hotspots:
      - path:
          fan_in: [N] (files that import this)
          fan_out: [N] (files this imports)
          coupling_score: [N]
          lines: [N]
          exports: [N]
          type: "[gravity-well|octopus|god-object]"
          top_importers:
            - path
          top_dependencies:
            - path
    recommended_splits:
      - path:
          reason: "[too many responsibilities]"
          suggested_modules:
            - "[extracted-concern-1]"
            - "[extracted-concern-2]"
```

## Standard/Command Suggestions

- **Standard**: "Keep files under 500 lines"
- **Standard**: "Limit module fan-out to 10 direct dependencies"
- **Standard**: "Split utility files by domain concern"
- **Command**: "Analyze module coupling" (run this analysis on demand)
