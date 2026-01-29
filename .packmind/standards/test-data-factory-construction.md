# Test Data Factory Construction

**Summary:** Use factory functions for creating test data entities, enabling consistent overrides and semantic clarity in test setup.

**Description:** This standard establishes factory-based test data construction across all domain packages. Factories provide semantic test data with sensible defaults and easy per-test overrides, enabling efficient test writing while reducing duplication. The pattern uses `Factory<T>` type from `@packmind/test-utils` and stores builders in `{package}/test/{entity}Factory.ts`, colocated with domain models for discoverability.

**Why now:** Analysis of 292 test files across 21 packages shows 100% universal adoption of factory pattern; documenting standardizes approach for new tests and improves test maintainability.

## Evidence

- `packages/accounts/test/userFactory.ts:10`
- `packages/recipes/test/recipeFactory.ts:10`
- `packages/accounts/src/application/useCases/signInUser/SignInUserUseCase.spec.ts:14,31`
- `packages/recipes/src/application/services/RecipeService.spec.ts:14,99`

## Rules

### Create factory functions for each domain entity using Factory<T> type

**Rationale:** Factories enable semantic test data construction with sensible defaults and easy per-test overrides, reducing test boilerplate and improving clarity.

**Positive example:**
```typescript
// packages/accounts/test/userFactory.ts
import { Factory } from '@packmind/test-utils';
import { v4 as uuid } from 'uuid';
import { User } from '../src/domain/User';

export const userFactory: Factory<User> = (user?: Partial<User>) => ({
  id: uuid(),
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...user,
});
```

**Negative example:**
```typescript
// Inline construction in tests — loses semantic clarity and duplicates defaults
describe('UserService', () => {
  it('creates a user', async () => {
    const user = {
      id: uuid(),
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    // Test logic
  });
});
```

### Store factories in {package}/test/{entity}Factory.ts parallel to domain structure

**Rationale:** Colocates test data builders with domain models for easy discoverability and enables automatic import discovery by test tools.

**Positive example:**
```
packages/accounts/
  test/
    userFactory.ts
    organizationFactory.ts
  src/
    domain/
      User.ts
      Organization.ts
    application/
      services/UserService.ts

packages/recipes/
  test/
    recipeFactory.ts
  src/
    domain/
      Recipe.ts
```

**Negative example:**
```
packages/accounts/
  src/
    __fixtures__/
      userFixture.json
    userFactory.ts  (not in test/ directory)
    application/
      services/
        UserService.spec.ts
```

### Accept optional Partial<T> argument allowing semantic overrides with clear test intent

**Rationale:** Reduces test verbosity while allowing targeted data customization per test without mutation; makes test setup intent explicit.

**Positive example:**
```typescript
// Test setup is semantic and concise
describe('UserService', () => {
  it('creates an admin user', async () => {
    const adminUser = userFactory({ role: 'admin' });
    // adminUser has all defaults but with role='admin'
  });

  it('rejects inactive users', async () => {
    const inactiveUser = userFactory({ isActive: false });
    // inactiveUser has all defaults but with isActive=false
  });

  it('finds users by email', async () => {
    const customUser = userFactory({ email: 'specific@example.com' });
    // Semantic intent: "create a user with this email"
  });
});
```

**Negative example:**
```typescript
// Verbose and mutation-prone
it('updates user role', async () => {
  const user = userFactory();
  user.email = 'custom@example.com';  // Mutation
  user.role = 'admin';                 // Mutation
  // Intent is unclear: "modifying default data" vs "testing with specific data"
});

// Using fixtures — hard to customize per test
const user = require('__fixtures__/user.json');
user.role = 'admin';  // Mutation of shared fixture
```
