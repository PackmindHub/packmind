---
name: 'Typescript good practices'
paths:
  - "**/*.ts"
alwaysApply: false
description: 'Generic practices that can be applied for all TS code in our app'
---

# Standard: Typescript good practices

Generic practices that can be applied for all TS code in our app :
* Do not use `Object.setPrototypeOf` when defining errors.
* When defining a presentation DTO that enriches a domain type, use an intersection type (`DomainType & { extraField: T }`) instead of manually re-declaring the domain type's fields, so that structural drift is caught at compile time.

Full standard is available here for further request: [Typescript good practices](../../../.packmind/standards/typescript-good-practices.md)