---
applyTo: '**'
---
## Standard: Structured Logging with PackmindLogger and Datadog

Enforce structured logging with PackmindLogger and Datadog across Node.js/TypeScript services by creating named PackmindLogger instances with service name and LogLevel enum (default INFO) that emit structured JSON to Datadog from constructors and lifecycle initialization using logger.info/debug and logger.error with sanitized contextual metadata (organizationId, userId, recipeId, standardId, entity IDs) while never logging passwords, tokens, API keys, PII or full request payloads, avoiding console.log, using PackmindErrorHandler.throwError and error instanceof Error checks to convert errors to messages, and choosing error/warn/info/debug levels appropriately to enable reliable debugging, monitoring, observability and security compliance in development and production. :
* Create PackmindLogger instances with service name and LogLevel in constructor log info for successful operations error for failures with structured metadata including IDs and error messages never use console.log
* Define origin constant for logger name inject PackmindLogger with default LogLevel.INFO in constructor log initialization lifecycle events with info and debug use try-catch to log initialization errors before throwing
* Log metadata with userId organizationId recipeId standardId and sanitized error messages never log passwords tokens API keys PII or full request payloads to prevent sensitive data exposure
* Use error for failures requiring investigation warn for unexpected but recoverable issues info for significant business events and debug for detailed diagnostic information choose appropriate level based on production relevance
* Use logger.info for operation start and success logger.error with full error context before rethrowing errors include entity IDs operation context and convert error to message using error instanceof Error check
* Use PackmindErrorHandler.throwError instead of this.handleError(error);

Full standard is available here for further request: [Structured Logging with PackmindLogger and Datadog](../../.packmind/standards/structured-logging-with-packmindlogger-and-datadog.md)