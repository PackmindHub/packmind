---
name: 'Frontend testing'
paths: '**/*.test.tsx'
alwaysApply: false
description: 'Enforce behavioral tests for components in files matching **/*.test.tsx using Jest and React Testing Library to assert functionality (e.g., that a button triggers the expected action) rather than mere presence, improving test reliability and preventing regressions.'
---

## Standard: Frontend testing

Enforce behavioral tests for components in files matching \*_/_.test.tsx using Jest and React Testing Library to assert functionality (e.g., that a button triggers the expected action) rather than mere presence, improving test reliability and preventing regressions. :

- Do not write test checking if a button is there, check that it actually works as expected

Full standard is available here for further request: [Frontend testing](../../../.packmind/standards/frontend-testing.md)
