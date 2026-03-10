# Testing Standards — Unit, Use Case & Integration Tests

## Universal Jest Rules

- Verb-first test names, no "should" prefix: `it('creates the user')` not `it('should create the user')`
- One `expect` per `it` block — related side-effect assertions (e.g. service called with correct args) are acceptable in the same test
- AAA (Arrange, Act, Assert) pattern — no explicit comments labeling the phases
- `jest.clearAllMocks()` in `afterEach` (NOT `beforeEach`) — placement matters
- `jest.restoreAllMocks()` in `afterEach` when `jest.spyOn()` is used
- Never write dummy tests without logic (`expect(true).toBe(true)`)
- Use `stubLogger()` for a typed `PackmindLogger` stub — never manually mock the logger
- Use `createMockInstance` to create mock instances of classes

## Test File Structure

```
1. Imports
2. Top-level describe block (class/use case name)
3. Typed mock declarations: let mockService: jest.Mocked<ServiceType>
4. Reusable test data at describe scope
5. beforeEach — setup and mock initialization
6. afterEach — jest.clearAllMocks()
7. Nested describe blocks for methods and scenarios
```

## Typed Mock Pattern

```typescript
let mockService: jest.Mocked<ServiceType>;

beforeEach(() => {
  mockService = { methodName: jest.fn() } as unknown as jest.Mocked<ServiceType>;
});
```

## Describe Block Naming

- `describe('with...')` for input/state conditions: `describe('with empty name', ...)`
- `describe('when...')` for action-based scenarios: `describe('when user signs in', ...)`

## Test Execution Order (within each describe block)

1. Happy path — successful execution
2. Error cases — validation errors, not found, unauthorized
3. Edge cases — null, undefined, empty strings, zero, single-item arrays
4. Complex scenarios — multiple items, nested conditions

## Test Data

- Use factory functions from `@packmind/shared` (e.g., `createUserId`, `createOrganizationId`)
- Use entity factories (e.g., `userFactory()`) with `Partial<T>` overrides — never inline construction
- ID values from `createXxxId()` typed functions — never raw string literals
- Test-specific data defined inside the `it` block; shared data at `describe` scope

## Use Case Test Patterns

- Group scenarios by execution context using nested `describe` blocks with shared `beforeEach`
- Test each validation rule individually in its own `describe` + `it` — not bundled in a catch-all
- Use `.not.toHaveBeenCalled()` to verify services were NOT invoked in error paths

## Integration Test Patterns

- Wrap with `integrationTestWithUser((getContext) => {...})` for authenticated user context
- Declare test variables with explicit types at the top of the test block
- Access adapters via `testContext.testApp.<domain>Hexa.getAdapter()`
- Mock external dependencies with `jest.spyOn()` — not manual mock creation
- `datasource.destroy()` in `afterEach` to prevent connection leaks
- `expect.objectContaining()` for partial object matching
- `.toHaveLength()` for array length assertions

## Validation Testing

Test systematically: empty string, whitespace-only, null, undefined, missing required fields, minimal valid input — each in its own `describe` block.

```typescript
describe('with empty organization name', () => {
  it('throws validation error', async () => {
    await expect(useCase.execute({ ...command, name: '' })).rejects.toThrow('...')
    expect(mockService.create).not.toHaveBeenCalled()
  })
})
```
