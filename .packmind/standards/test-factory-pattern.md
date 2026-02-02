# Test Factory Pattern

Create test data using factory functions that produce realistic, varied test entities with sensible defaults.

**Discovered:** 23 factory files in `packages/*/test/*Factory.ts` with 1166 usages across 106 test files. All follow the same structure using `Factory<T>` type.

**Evidence:** packages/standards/test/standardFactory.ts, packages/accounts/test/userFactory.ts, packages/recipes/test/recipeFactory.ts

## Rules

* Place factory files in `packages/<domain>/test/<entityName>Factory.ts`
* Use the `Factory<T>` type from `@packmind/test-utils` for type safety
* Use `createXxxId(uuidv4())` helpers from `@packmind/types` to generate typed IDs
* Provide realistic default values that can be overridden via spread operator
* Generate variety in default values (random names, different states) rather than static "Test X" strings

### Examples

**Positive (correct):**
```typescript
import { Factory } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import { createStandardId, createUserId, createSpaceId, Standard } from '@packmind/types';

export const standardFactory: Factory<Standard> = (overrides?: Partial<Standard>) => {
  const id = uuidv4();
  return {
    id: createStandardId(id),
    name: `Standard ${id.slice(0, 8)}`,  // Varied, not static "Test Standard"
    slug: `standard-${id.slice(0, 8)}`,
    description: 'Auto-generated test standard',
    version: 1,
    userId: createUserId(uuidv4()),
    spaceId: createSpaceId(uuidv4()),
    ...overrides,
  };
};
```

**Negative (incorrect):**
```typescript
// Don't create test data inline
const standard = {
  id: 'some-id' as StandardId,  // Untyped, hardcoded
  name: 'Test',
  // Missing required fields...
};

// Don't use static values that clash in multi-entity tests
export const standardFactory = () => ({
  id: createStandardId('fixed-id'),  // Always same ID - causes conflicts
  name: 'Test Standard',  // Always same name - hard to debug
});
```
