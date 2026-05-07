---
name: 'Back-end TypeScript Clean Code Practices'
paths:
  - "**/packages/**/*.ts"
alwaysApply: false
description: 'Apply back-end TypeScript clean code practices by implementing logging best practices, error handling with custom error types, and organized code structure to enhance maintainability and ensure consistent patterns across services in the Packmind monorepo when writing services, use cases, controllers, and any back-end TypeScript code.'
---

# Standard: Back-end TypeScript Clean Code Practices

Apply back-end TypeScript clean code practices by implementing logging best practices, error handling with custom error types, and organized code structure to enhance maintainability and ensure consistent patterns across services in the Packmind monorepo when writing services, use cases, controllers, and any back-end TypeScript code. :
* Avoid excessive logger.debug calls in production code and limit logging to essential logger.info statements. Use logger.info for important business events, logger.error for error handling, and add logger.debug manually only when debugging specific issues.
* Inject PackmindLogger as a constructor parameter with a default value using a variable or a string representing the class name.
* Instantiate use cases in adapters without passing the adapter's logger; use cases must create their own logger for proper origin tracking.
* Keep all import statements at the top of the file before any other code. Never use dynamic imports in the middle of the code unless absolutely necessary for code splitting or lazy loading.
* Use dedicated error types instead of generic Error instances to enable precise error handling and improve code maintainability. Create custom error classes that extend Error with descriptive names and context-specific information.

Full standard is available here for further request: [Back-end TypeScript Clean Code Practices](../../../.packmind/standards/back-end-typescript-clean-code-practices.md)