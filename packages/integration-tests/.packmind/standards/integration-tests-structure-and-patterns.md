# Integration Tests Structure and Patterns

Define testing patterns for integration tests in the Packmind monorepo to ensure consistent organization, proper resource management, and comprehensive test coverage using hexagonal architecture principles.

## Rules

* Wrap integration tests with integrationTestWithUser((getContext) => {...}) to provide authenticated user context
* Declare all test variables with explicit types at the top of the test suite before beforeEach hooks
* Initialize test context in beforeEach using await getContext() and assign to a local testContext variable
* Access domain adapters through testContext.testApp.<domain>Hexa.getAdapter() hexagonal architecture pattern
* Use nested describe('when...') blocks to organize test scenarios with shared setup in beforeEach
* Use verb-first test names without should prefix for assertive, clear descriptions
* Create test data using factory functions (e.g., changeProposalFactory()) for consistent, realistic test fixtures
* Use typed domain entities from @packmind/types for all test data to ensure type safety
* Mock external dependencies using jest.spyOn() instead of manual mock creation
* Restore all mocks in afterEach using jest.restoreAllMocks() after tests that use jest.spyOn()
* Clear all mocks in afterEach using jest.clearAllMocks() to prevent inter-test pollution
* Clean up database connections in afterEach with datasource.destroy() when datasource is initialized in beforeEach
* Use one primary assertion per test case for clarity and easier debugging
* Use expect.objectContaining() for partial object matching when testing subset of properties
* Use .toHaveLength() for array length assertions instead of manual .length checks
* Test both success and failure scenarios for comprehensive coverage
