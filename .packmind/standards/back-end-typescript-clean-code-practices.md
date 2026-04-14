# Back-end TypeScript Clean Code Practices

This standard establishes clean code practices in TypeScript for back-end development to enhance maintainability and ensure consistent patterns across services. It covers logging best practices, error handling, code organization, and dependency injection patterns. These rules apply when writing services, use cases, controllers, and any back-end TypeScript code in the Packmind monorepo. Following these practices ensures code is maintainable, debuggable, and follows established architectural patterns.

## Rules

* Avoid excessive logger.debug calls in production code and limit logging to essential logger.info statements. Use logger.info for important business events, logger.error for error handling, and add logger.debug manually only when debugging specific issues.
* Inject PackmindLogger as a constructor parameter with a default value using a variable or a string representing the class name.
* Keep all import statements at the top of the file before any other code. Never use dynamic imports in the middle of the code unless absolutely necessary for code splitting or lazy loading.
* Use dedicated error types instead of generic Error instances to enable precise error handling and improve code maintainability. Create custom error classes that extend Error with descriptive names and context-specific information.
* Instantiate use cases in adapters without passing the adapter's logger; use cases must create their own logger for proper origin tracking.
