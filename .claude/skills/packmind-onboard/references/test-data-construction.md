# Test Data Construction Patterns

Determine how tests construct data: helpers/builders, inline literals, fixtures, or mixed.

## Search Patterns

### Test File Locations

```
# Directories
test/
tests/
__tests__/
spec/
specs/

# File patterns
*.test.ts
*.test.js
*.test.tsx
*.test.jsx
*.spec.ts
*.spec.js
*.spec.tsx
*.spec.jsx
*_test.go
*_test.py
test_*.py
*Test.java
*Spec.scala
```

### Helper/Builder Patterns

```
# Factory functions
Factory
factory(
createMock
buildMock
make(
build(
generate(
fake(
stub(

# Builder patterns
Builder
.build()
.create()
.with(
.having(

# Test data libraries
faker
Faker
@faker-js
factory-girl
fishery
test-data-bot
FactoryBot
factory_bot
Fabricator
```

### Fixture/Seed Patterns

```
# Fixture files
fixtures/
__fixtures__/
seeds/
mocks/
stubs/

# Fixture loading
loadFixture
readFixture
importFixture
fixture(
seed(
```

### Inline Construction Indicators

```
# Direct object creation in tests
const mock = {
let testData = {
const input = {
new TestEntity(
Object.assign(
{ ...baseData,
```

## Classification Criteria

| Pattern              | Indicators                                                 |
| -------------------- | ---------------------------------------------------------- |
| **Helpers/builders** | Dedicated factory functions reused across ≥3 test files    |
| **Inline**           | Objects created directly in test bodies; no shared helpers |
| **Fixtures**         | External JSON/YAML files or fixture directories            |
| **Mixed**            | Multiple patterns without dominant approach                |

## Sampling Method

1. List test files by path, sort ascending
2. Sample first 10 files (or all if <10)
3. For each file, classify primary data construction method
4. Detect shared builders: same helper imported in ≥3 tests

## Reporting Threshold

Report only if:

- ≥2 patterns appear in sample, OR
- Shared builder exists but many tests still use inline (inconsistency)

## Insight Template

```
INSIGHT:
  id: TEST-[n]
  title: "TEST DATA: construction patterns vary ([X]% helpers, [Y]% inline, [Z]% fixtures)"
  summary: "Test data is constructed using [dominant pattern]. [inconsistencies if any]"
  confidence: [high|medium|low]
  evidence:
    - path[:line-line] — uses [pattern]
  exceptions:
    - path[:line-line] — diverges from dominant pattern
```

## Standard/Command Suggestions

- **Standard**: "Use test factories for domain entities" (if inline dominant but factories exist)
- **Standard**: "Prefer builder pattern for complex test data" (if mixed patterns)
- **Command**: "Create test factory" (if helpers pattern established)
