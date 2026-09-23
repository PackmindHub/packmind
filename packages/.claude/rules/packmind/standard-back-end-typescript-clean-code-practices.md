---
name: 'Back-end TypeScript Clean Code Practices'
paths:
  - "**/packages/**/*.ts"
alwaysApply: false
description: 'This standard establishes clean code practices in TypeScript for back-end development to enhance maintainability and ensure consistent patterns across services. It covers logging best practices, error handling, code organization, and dependency injection patterns. These rules apply when writing services, use cases, controllers, and any back-end TypeScript code in the Packmind monorepo. Following these practices ensures code is maintainable, debuggable, and follows established architectural patterns.'
---

# Standard: Back-end TypeScript Clean Code Practices

This standard establishes clean code practices in TypeScript for back-end development to enhance maintainability and ensure consistent patterns across services. It covers logging best practices, error... :
* Avoid excessive logger.debug in production code; use logger.info for important business events and logger.error only for failures nothing else records, adding logger.debug while debugging.
* Extend the package's `DomainError`, `PackmindInternalError` or `PackmindUpstreamError` base when defining an error class; only a family base itself extends `Error`.
* Inject PackmindLogger as a constructor parameter with a default value using a variable or a string representing the class name.
* Instantiate use cases in adapters without passing the adapter's logger; use cases must create their own logger for proper origin tracking.
* Keep all import statements at the top of the file before any other code. Never use dynamic imports in the middle of the code unless absolutely necessary for code splitting or lazy loading.

Full standard is available here for further request: [Back-end TypeScript Clean Code Practices](../../../.packmind/standards/back-end-typescript-clean-code-practices.md)