---
name: create-em-spec
description: 'Scaffold and run a new end-to-end spec file. Use when asked to write a new e2e test or spec from scratch.'
disallowed-tools:
  - Monitor
  - AskUserQuestions
---

# Create E2E Spec

Scaffold and run a new Playwright end-to-end spec file against the Packmind dev stack.

## Steps

1. Identify the feature or user flow to test.
2. Create a new spec file under `apps/e2e-tests/src/`.
3. Use the project fixtures (never raw `test()`).
4. Run with `./node_modules/.bin/nx e2e e2e-tests`.
