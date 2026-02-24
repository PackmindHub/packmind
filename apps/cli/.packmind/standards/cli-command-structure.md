# CLI Command Structure

Enforce clear separation of concerns between command definition (parameters and metadata) and handler logic (validation, execution, and output) in apps/cli commands to improve testability, maintainability, and consistency.

## Rules

* Organize commands in subdirectories under infra/commands/ grouped by their hexa or domain (e.g., infra/commands/auth/, infra/commands/standard/)
* Define command files (ending in Command.ts) using cmd-ts with only name, description, and args—do not implement handler logic inline
* Reference the corresponding handler function from the handler property of the command definition
* Create a separate handler file (ending in Handler.ts) that exports the handler function for each command
* Validate and transform input arguments at the start of the handler before any business logic
* Instantiate PackmindCliHexa with PackmindLogger within the handler after validation
* Execute the use case through the hexa instance and capture the response
* Handle known domain errors explicitly with catch blocks checking error types (e.g., PackageNotFoundError, AccessDenied)
* Use outputError() for error messages, outputSuccess() for success messages, and outputHelp() for guidance from consoleLogger utilities
* Call exit(1) after outputting error messages and exit(0) after success messages
* Include helpful contextual messages with outputHelp() when domain errors occur (e.g., suggest relevant commands to run)
* Write comprehensive tests for all handler functions covering validation, success paths, and all error scenarios
