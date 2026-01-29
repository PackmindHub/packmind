# Create UseCase

Create a new UseCase following the established Abstract*UseCase pattern with constructor injection and execute() method.

## When to Use

- Adding a new business operation to a domain
- Implementing a new feature that requires orchestration logic
- Creating application layer logic that coordinates domain services

## Context Validation Checkpoints

* [ ] What is the UseCase name? (e.g., CreateStandard, DeleteRecipe)
* [ ] Which domain/package does it belong to? (e.g., standards, recipes, accounts)
* [ ] Is this a Member-scoped or general UseCase?

## Recipe Steps

### Step 1: Create UseCase File

Create `{Name}UseCase.ts` extending the appropriate Abstract UseCase with constructor injection.

```typescript
import { AbstractMemberUseCase } from '@packmind/spaces';
import { Logger } from '@packmind/logger';
import { I{Name}Contract, {Name}Input, {Name}Output } from './contracts';

export class {Name}UseCase
  extends AbstractMemberUseCase<{Name}Input, {Name}Output>
  implements I{Name}Contract
{
  constructor(
    private readonly logger: Logger,
    // Add domain-specific dependencies
  ) {
    super();
  }

  async execute(input: {Name}Input): Promise<{Name}Output> {
    this.logger.info('{Name}UseCase.execute', { input });
    // Implementation here
  }
}
```

### Step 2: Create Test File

Create `{Name}UseCase.spec.ts` with factory-based test setup.

```typescript
import { {Name}UseCase } from './{Name}UseCase';
import { createMockInstance } from '@packmind/test-utils';
import { Logger } from '@packmind/logger';

describe('{Name}UseCase', () => {
  let useCase: {Name}UseCase;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    logger = createMockInstance(Logger);
    useCase = new {Name}UseCase(logger);
  });

  describe('execute', () => {
    it('performs the expected operation', async () => {
      // Arrange
      const input = { /* test input */ };

      // Act
      const result = await useCase.execute(input);

      // Assert
      expect(result).toBeDefined();
    });
  });
});
```

### Step 3: Add Contract to Types

Define the input/output types and contract interface in `contracts/index.ts`.

```typescript
export type {Name}Input = {
  // Define input properties
};

export type {Name}Output = {
  // Define output properties
};

export interface I{Name}Contract {
  execute(input: {Name}Input): Promise<{Name}Output>;
}
```
