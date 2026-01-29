# Create Test Factory

Create a new test factory following the established Factory pattern with typed IDs and realistic defaults.

## When to Use

- Adding a new domain entity that needs test coverage
- Creating test data for a new aggregate root
- Setting up fixtures for integration tests

## Context Validation Checkpoints

* [ ] What is the entity name? (e.g., Standard, Recipe, User)
* [ ] Which package does it belong to? (e.g., standards, recipes, accounts)
* [ ] What are the required fields of the entity?
* [ ] Does the entity have typed ID fields (e.g., StandardId, UserId)?

## Recipe Steps

### Step 1: Create Factory File

Create `packages/<domain>/test/<entityName>Factory.ts` with the standard structure.

```typescript
import { Factory } from '@packmind/test-utils';
import { v4 as uuidv4 } from 'uuid';
import {
  create{Entity}Id,
  createUserId,
  createSpaceId,
  {Entity},
} from '@packmind/types';

export const {entity}Factory: Factory<{Entity}> = (
  overrides?: Partial<{Entity}>,
) => {
  const id = uuidv4();
  return {
    id: create{Entity}Id(id),
    name: `{Entity} ${id.slice(0, 8)}`,
    // Add all required fields with sensible defaults
    userId: createUserId(uuidv4()),
    spaceId: createSpaceId(uuidv4()),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};
```

### Step 2: Export from Test Index

Add the factory to `packages/<domain>/test/index.ts` exports.

```typescript
export * from './{entity}Factory';
```

### Step 3: Use in Tests

Import and use the factory in test files.

```typescript
import { {entity}Factory } from '../../test/{entity}Factory';

describe('{Entity}Service', () => {
  it('processes entity correctly', async () => {
    const entity = {entity}Factory({ name: 'Custom Name' });

    const result = await service.process(entity);

    expect(result).toBeDefined();
  });
});
```
