# Jest Test Suite Organization and Patterns

# Jest Test Suite Organization and Patterns

This standard defines comprehensive patterns for writing Jest tests in the Packmind monorepo, covering test structure, organization, mocking, naming conventions, and assertions.

## Test File Structure

Test files should follow this structure:

1. Imports at the top
2. Top-level `describe` block for the class/use case being tested
3. Mock service declarations with typed mocks
4. Reusable test data defined at appropriate scope level
5. `beforeEach` for setup
6. `afterEach` for cleanup
7. Nested `describe` blocks for methods and scenarios
8. Individual test cases with `it()`

## Test Organization Hierarchy

* **Level 1**: Class/UseCase name - `describe('CreateOrganizationUseCase', ...)`

* **Level 2**: Method name - `describe('execute', ...)`

* **Level 3**: Scenarios using "with..." or "when..." - `describe('with valid credentials', ...)` or `describe('when user signs in', ...)`

* **Level 4** (optional): Sub-scenarios for complex cases

## Test Execution Order

Organize tests in this order within each describe block:

1. **Happy path** - successful execution scenarios
2. **Error cases** - validation errors, not found, unauthorized
3. **Edge cases** - null, undefined, empty strings, whitespace-only, minimal valid input
4. **Complex scenarios** - multiple items, nested conditions, rate limiting

## Mock Setup Pattern

Use typed mocks with the following pattern:

```typescript
let mockService: jest.Mocked<ServiceType>;

beforeEach(() => {
  mockService = {
    methodName: jest.fn(),
    anotherMethod: jest.fn(),
  } as unknown as jest.Mocked<ServiceType>;
});
```

Alternative pattern for complex services:

```typescript
mockService = {
  methodName: jest.fn(),
} as jest.Mocked<Partial<ServiceType>> as jest.Mocked<ServiceType>;
```

## Test Data Management

* **Reusable data**: Define at the describe block level (before tests) when used across multiple tests

* **Test-specific data**: Define within individual test cases when only used once

* **Factory functions**: Use factory functions from test files (userFactory, organizationFactory)

* **ID creation**: Use factory functions from @packmind/shared (createUserId, createOrganizationId, createStandardId, etc.)

Example:

```typescript
describe('execute', () => {
  const userId = createUserId('user-123');
  const testUser: User = {
    ...userFactory({ id: userId, email: 'test@example.com' })
  };

  describe('with valid input', () => {
    it('creates user successfully', async () => {
      // Test implementation
    });
  });
});
```

## Assertion Patterns

1. **Single primary assertion**: Each test should verify one main behavior
2. **Related assertions**: It's acceptable to verify related service calls in the same test
3. **Result verification**: Test the actual result/return value
4. **Service interaction verification**: Verify services were called with correct parameters
5. **Negative assertions**: Use `.not.toHaveBeenCalled()` to verify services weren't called in error cases

Example:

```typescript
it('creates organization successfully and adds user as admin', async () => {
  mockService.createOrganization.mockResolvedValue(mockOrganization);
  
  const result = await useCase.execute(command);
  
  expect(result).toEqual({ organization: mockOrganization });
  expect(mockService.createOrganization).toHaveBeenCalledWith('Test Organization');
  expect(mockService.addMembership).toHaveBeenCalledWith(userId, organizationId, 'admin');
});
```

## Validation Testing

Test all validation edge cases systematically:

* Empty strings

* Whitespace-only strings

* null values

* undefined values

* Missing required fields

* Minimal valid input (single character when applicable)

Each validation case should be in its own describe block:

```typescript
describe('with empty organization name', () => {
  it('throws validation error', async () => {
    const invalidCommand = { userId, name: '' };
    
    await expect(useCase.execute(invalidCommand)).rejects.toThrow('Organization name is required');
    expect(mockService.createOrganization).not.toHaveBeenCalled();
  });
});
```

## Error Handling Tests

Test both Error instances and non-Error exceptions:

```typescript
describe('with service error', () => {
  it('rethrows error', async () => {
    const serviceError = new Error('Organization already exists');
    mockService.createOrganization.mockRejectedValue(serviceError);
    
    await expect(useCase.execute(command)).rejects.toThrow('Organization already exists');
  });
});

describe('with non-Error exception', () => {
  it('rethrows exception', async () => {
    const serviceError = 'Database connection failed';
    mockService.createOrganization.mockRejectedValue(serviceError);
    
    await expect(useCase.execute(command)).rejects.toBe('Database connection failed');
  });
});
```

## Complex Scenario Testing

For complex scenarios with multiple conditions:

* Use nested describe blocks to organize related tests

* Group related scenarios together (e.g., all rate limiting tests)

* Test combinations of conditions (e.g., multiple memberships, nested failures)

```typescript
describe('rate limiting', () => {
  it('throws TooManyLoginAttemptsError on rate limit exceeded', async () => {
    // Test implementation
  });
  
  it('records failed attempt for invalid password', async () => {
    // Test implementation  
  });
  
  it('clears attempts only on successful login', async () => {
    // Test implementation
  });
});
```

## Rules

* Organize describe blocks using 'with...' prefix for input/state conditions and 'when...' prefix for action-based scenarios
* Define reusable test data at the describe block level before test cases when the data is shared across multiple tests
* Use typed mocks with 'jest.Mocked<ServiceType>' and initialize them in beforeEach using the pattern '{ methodName: jest.fn() } as unknown as jest.Mocked<ServiceType>'
* Order tests within each describe block: happy path first, then error cases, then edge cases (null/undefined/empty/whitespace), then complex scenarios
* Use .not.toHaveBeenCalled() to verify services were not invoked in error or validation failure scenarios
* Test all validation edge cases systematically in separate describe blocks: empty string, whitespace-only, null, undefined, and minimal valid input
* Group related complex scenarios in dedicated describe blocks (e.g., 'rate limiting', 'multiple organizations') with multiple test cases covering different aspects
* Use `createXXXId` functions from @packmind/types (createUserId, createOrganizationId, createStandardId, createRecipeId) for creating typed IDs in test data
* Use createMockInstance to create mock instances
