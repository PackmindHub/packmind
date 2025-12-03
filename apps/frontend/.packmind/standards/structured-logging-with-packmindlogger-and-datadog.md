# Structured Logging with PackmindLogger and Datadog

Use PackmindLogger from shared package with LogLevel enum to create named loggers that output structured JSON logs to Datadog with error warn info debug levels including contextual metadata like organizationId userId but never exposing passwords tokens or PII to enable effective debugging monitoring and security compliance

## Rules

* Create PackmindLogger instances with service name and LogLevel in constructor log info for successful operations error for failures with structured metadata including IDs and error messages never use console.log
* Log metadata with userId organizationId recipeId standardId and sanitized error messages never log passwords tokens API keys PII or full request payloads to prevent sensitive data exposure
* Use logger.info for operation start and success logger.error with full error context before rethrowing errors include entity IDs operation context and convert error to message using error instanceof Error check
* Define origin constant for logger name inject PackmindLogger with default LogLevel.INFO in constructor log initialization lifecycle events with info and debug use try-catch to log initialization errors before throwing
* Use error for failures requiring investigation warn for unexpected but recoverable issues info for significant business events and debug for detailed diagnostic information choose appropriate level based on production relevance
* Use PackmindErrorHandler.throwError instead of this.handleError(error);
