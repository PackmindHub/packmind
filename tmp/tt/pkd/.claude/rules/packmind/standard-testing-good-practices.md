---
name: Testing good practices
globs: ["**/*.spec.ts", "**/*.spec.tsx", "**/*.test.ts", "**/*.test.tsx"]
alwaysApply: false
description: Standardize unit test structure and naming in TypeScript/TSX test files using verb-first descriptions, Arrange-Act-Assert flow without comments, nested describe('when...') context blocks, and single-expect test cases to improve readability, maintainability, and debugging.
---

## Standard: Testing good practices

Standardize unit test structure and naming in TypeScript/TSX test files using verb-first descriptions, Arrange-Act-Assert flow without comments, nested describe('when...') context blocks, and single-expect test cases to improve readability, maintainability, and debugging. :
* Follow  'Arrange, Act, Assert' pattern
* Move 'when' contextual clauses from `it()` into nested `describe('when...')` blocks
* Remove explicit 'Arrange, Act, Assert' comments from tests and structure them so the setup, execution, and verification phases are clear without redundant labels
* Use assertive, verb-first unit test names instead of starting with 'should'
* Use one expect per test case for better clarity and easier debugging; group related tests in describe blocks with shared setup in beforeEach

Full standard is available here for further request: [Testing good practices](../../../.packmind/standards/testing-good-practices.md)