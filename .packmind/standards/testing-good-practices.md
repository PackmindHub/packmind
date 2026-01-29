# Testing good practices

Good practices when writing tests

## Rules

* Use assertive, verb-first unit test names instead of starting with 'should'
* Follow  'Arrange, Act, Assert' pattern
* Remove explicit 'Arrange, Act, Assert' comments from tests and structure them so the setup, execution, and verification phases are clear without redundant labels
* Move 'when' contextual clauses from `it()` into nested `describe('when...')` blocks
* Use one expect per test case for better clarity and easier debugging; group related tests in describe blocks with shared setup in beforeEach
