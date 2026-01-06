---
name: Back-end TypeScript Clean Code Practices
globs: '**/packages/**/*.ts'
alwaysApply: false
description: Apply back-end TypeScript clean code practices by implementing logging best practices, error handling with custom error types, and organized code structure to enhance maintainability and ensure consistent patterns across services in the Packmind monorepo when writing services, use cases, controllers, and any back-end TypeScript code.
---

## Standard: Back-end TypeScript Clean Code Practices

Apply back-end TypeScript clean code practices by implementing logging best practices, error handling with custom error types, and organized code structure to enhance maintainability and ensure consistent patterns across services in the Packmind monorepo when writing services, use cases, controllers, and any back-end TypeScript code. :

- Avoid excessive logger.debug calls in production code and limit logging to essential logger.info statements. Use logger.info for important business events, logger.error for error handling, and add logger.debug manually only when debugging specific issues.
- Inject PackmindLogger as constructor parameter with origin constant for consistent logging across services. Define a const origin at the top of the file with the class name, then inject PackmindLogger with a default value using that origin.
- Keep all import statements at the top of the file before any other code. Never use dynamic imports in the middle of the code unless absolutely necessary for code splitting or lazy loading.
- Omit the logger parameter when instantiating use cases or services since PackmindLogger has a default value with the class origin.
- Use dedicated error types instead of generic Error instances to enable precise error handling and improve code maintainability. Create custom error classes that extend Error with descriptive names and context-specific information.

Full standard is available here for further request: [Back-end TypeScript Clean Code Practices](../../../.packmind/standards/back-end-typescript-clean-code-practices.md)
