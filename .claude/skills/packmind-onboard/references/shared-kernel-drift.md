# Shared Kernel Drift

Find common/shared/utils packages that act as gravity wells and classify their contents.

## Search Patterns

### Shared Package Locations

```
# Common directory names
packages/common/
packages/shared/
packages/utils/
packages/core/
packages/lib/
libs/shared/
libs/common/
libs/utils/
src/common/
src/shared/
src/utils/
src/helpers/
src/lib/

# Utility modules
**/utils/
**/helpers/
**/common/
**/shared/
**/core/
**/toolkit/
```

### Content Classification Patterns

```
# Pure utilities (acceptable in shared)
date.
time.
string.
array.
object.
math.
format.
parse.
validate.
sanitize.
hash.
crypto.
uuid.
logger.
config.

# Domain concepts (should NOT be in shared)
User
Account
Order
Product
Payment
Customer
Invoice
Entity
Aggregate
ValueObject
DomainEvent

# Infrastructure concerns (questionable in shared)
Database
Repository
Http
Api
Client
Service
Cache
Queue

# Type definitions
types.
interfaces.
*.d.ts
models/
schemas/
```

### Import Analysis

```
# Count inbound dependencies
import from '@shared/
import from '@common/
import from '@utils/
import from '../common/
import from '../shared/
from common import
from shared import
```

## Analysis Method

1. **Identify shared packages**: Glob for common/shared/utils directories
2. **Count inbound dependencies**: How many modules import from shared?
3. **Classify contents**:
   - List all exports from shared package
   - Categorize: pure utility, domain concept, infrastructure
4. **Detect drift**: Domain concepts in shared = architectural smell

## Gravity Well Indicators

| Indicator          | Threshold                     | Concern                  |
| ------------------ | ----------------------------- | ------------------------ |
| **High fan-in**    | ≥50% of modules import shared | Potential coupling point |
| **Domain leakage** | ≥1 domain entity in shared    | Architecture violation   |
| **Growth rate**    | Shared package is largest     | Likely dumping ground    |
| **Mixed concerns** | Utils + domain + infra        | No clear boundary        |

## Content Categories

| Category           | Belongs in Shared? | Examples                                   |
| ------------------ | ------------------ | ------------------------------------------ |
| **Pure utilities** | Yes                | `formatDate()`, `slugify()`, `deepClone()` |
| **Type guards**    | Yes                | `isString()`, `isNonNull()`                |
| **Constants**      | Maybe              | `HTTP_STATUS`, `REGEX_PATTERNS`            |
| **Domain types**   | No                 | `User`, `Order`, `Money`                   |
| **Base classes**   | Maybe              | `AbstractRepository` (depends)             |
| **Infrastructure** | No                 | `HttpClient`, `DatabaseConnection`         |

## Reporting Threshold

Report only if:

- Shared package exists AND
- (≥5 modules depend on it OR domain concepts detected)

## Insight Template

```
INSIGHT:
  id: SHARED-[n]
  title: "SHARED KERNEL: [package] is a gravity well with [N] dependents"
  summary: "[package] contains [classification]. [concerns if any]"
  confidence: [high|medium|low]
  evidence:
    package: "path/to/shared"
    dependents: [N]
    contents:
      pure_utilities: [count]
      domain_concepts: [count] — [list if >0]
      infrastructure: [count]
    concerning_exports:
      - name — "[domain|infra] concept in shared"
```

## Standard/Command Suggestions

- **Standard**: "Shared packages contain only pure utilities" (if domain leakage found)
- **Standard**: "Domain concepts live in their bounded context" (if domain in shared)
- **Command**: "Extract domain concept from shared" (refactoring guidance)
