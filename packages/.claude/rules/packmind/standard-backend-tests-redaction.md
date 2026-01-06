---
name: Backend Tests Redaction
globs: '**/*.spec.ts'
alwaysApply: false
description: Define Jest backend test patterns in the Packmind monorepo that emphasize behavioral assertions, clear describe/it organization with shared setup/teardown (including datasource.destroy, jest.clearAllMocks, and stubLogger), and single-expect deep equality to keep tests readable, maintainable, and reliable.
---

## Standard: Backend Tests Redaction

Define Jest backend test patterns in the Packmind monorepo that emphasize behavioral assertions, clear describe/it organization with shared setup/teardown (including datasource.destroy, jest.clearAllMocks, and stubLogger), and single-expect deep equality to keep tests readable, maintainable, and reliable. :

- Avoid asserting on stubbed logger output like specific messages or call counts; instead verify observable behavior or return values
- Avoid testing that a method is a function; instead invoke the method and assert its observable behavior
- Avoid testing that registry components are defined; instead test the actual behavior and functionality of the registry methods like registration, retrieval, and error handling
- Move 'when' contextual clauses from `it()` into nested `describe('when...')` blocks
- Remove explicit 'Arrange, Act, Assert' comments from tests and structure them so the setup, execution, and verification phases are clear without redundant labels
- Use afterEach to call datasource.destroy() to clean up the test database whenever you initialize it in beforeEach
- Use afterEach(() => jest.clearAllMocks()) instead of beforeEach(() => jest.clearAllMocks()) to clear mocks after each test and prevent inter-test pollution
- Use assertive, verb-first unit test names instead of starting with 'should'
- Use expect(actualArray).toEqual(expectedArray) for deep array equality in Jest tests instead of manual length and index checks
- Use one expect per test case for better clarity and easier debugging; group related tests in describe blocks with shared setup in beforeEach
- Use stubLogger() in Jest tests to get a fully typed PackmindLogger stub instead of manually creating a jest.Mocked<PackmindLogger> object with jest.fn() methods

Full standard is available here for further request: [Backend Tests Redaction](../../../.packmind/standards/backend-tests-redaction.md)
