---
applyTo: 'Command files in apps/cli/src/infra/commands/'
---
## Standard: CLI Command Structure

Enforce cmd-ts CLI command definitions (Command.ts) to contain only name/description/args and delegate to separate Handler.ts functions that validate inputs, run PackmindCliHexa with PackmindLogger, handle domain errors, and standardize output/exit codes via consoleLogger utilities to improve testability, maintainability, and consistent user feedback. :
* Call exit(1) after outputting error messages and exit(0) after success messages
* Create a separate handler file (ending in Handler.ts) that exports the handler function for each command
* Define command files (ending in Command.ts) using cmd-ts with only name, description, and args—do not implement handler logic inline
* Execute the use case through the hexa instance and capture the response
* Handle known domain errors explicitly with catch blocks checking error types (e.g., PackageNotFoundError, AccessDenied)
* Include helpful contextual messages with outputHelp() when domain errors occur (e.g., suggest relevant commands to run)
* Instantiate PackmindCliHexa with PackmindLogger within the handler after validation
* Organize commands in subdirectories under infra/commands/ grouped by their hexa or domain (e.g., infra/commands/auth/, infra/commands/standard/)
* Reference the corresponding handler function from the handler property of the command definition
* Use outputError() for error messages, outputSuccess() for success messages, and outputHelp() for guidance from consoleLogger utilities
* Validate and transform input arguments at the start of the handler before any business logic
* Write comprehensive tests for all handler functions covering validation, success paths, and all error scenarios

Full standard is available here for further request: [CLI Command Structure](../../.packmind/standards/cli-command-structure.md)