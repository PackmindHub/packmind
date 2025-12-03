---
applyTo: '**/*.spec.ts,**/*.test.ts,**/*.spec.tsx,**/*.test.tsx'
---
## Standard: Jest Test Suite Organization and Patterns

Establish Jest test suite organization and patterns governing test file structure, describe/it hierarchy, typed mocking using jest.Mocked<ServiceType> and createMockInstance, factory-based test data and @packmind/types createUserId/createOrganizationId/createStandardId helpers, assertion conventions (single primary assertion, .not.toHaveBeenCalled()), test ordering (happy path, error cases, edge cases, complex scenarios), and validation/error-handling patterns for TypeScript/Node.js monorepo code (including Express or frontend React/Vue components where applicable) and toolchains (ESLint, Prettier, Webpack/Vite) with CI/infrastructure considerations (Docker, Kubernetes, AWS) to ensure reliable, maintainable, and debuggable unit and integration tests when writing or refactoring test suites with Jest. :
* Define reusable test data at the describe block level before test cases when the data is shared across multiple tests
* Group related complex scenarios in dedicated describe blocks (e.g., 'rate limiting', 'multiple organizations') with multiple test cases covering different aspects
* Order tests within each describe block: happy path first, then error cases, then edge cases (null/undefined/empty/whitespace), then complex scenarios
* Organize describe blocks using 'with...' prefix for input/state conditions and 'when...' prefix for action-based scenarios
* Test all validation edge cases systematically in separate describe blocks: empty string, whitespace-only, null, undefined, and minimal valid input
* Use .not.toHaveBeenCalled() to verify services were not invoked in error or validation failure scenarios
* Use `createXXXId` functions from @packmind/types (createUserId, createOrganizationId, createStandardId, createRecipeId) for creating typed IDs in test data
* Use createMockInstance to create mock instances
* Use typed mocks with 'jest.Mocked<ServiceType>' and initialize them in beforeEach using the pattern '{ methodName: jest.fn() } as unknown as jest.Mocked<ServiceType>'

Full standard is available here for further request: [Jest Test Suite Organization and Patterns](../../.packmind/standards/jest-test-suite-organization-and-patterns.md)