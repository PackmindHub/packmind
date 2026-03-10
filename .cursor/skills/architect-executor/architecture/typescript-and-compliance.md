# TypeScript Practices & Compliance

## TypeScript Rules (All Code)

- Never use `Object.setPrototypeOf` in error class definitions
- No `any` where a type exists — no unnecessary type assertions
- `readonly` where mutation is not intended
- Use dedicated custom error types (extending `Error`) — never generic `Error` instances
- Keep all imports at the top of the file; no dynamic imports mid-file unless for code splitting/lazy loading

## Backend TypeScript & Logging

- Inject `PackmindLogger` as a constructor parameter with a default value (variable or class name string)
- Use cases create their own logger — adapters do NOT pass their logger into use cases
- `logger.info` for important business events, `logger.error` for errors
- Minimize `logger.debug` in production code — add only when debugging specific issues
- Use dedicated error types instead of `new Error(...)` — enables precise error handling and better stack traces

## PII Compliance — Never Log Personal Data

Logs are forwarded to external processors (e.g., Datadog). **Never log personal information in clear text at any log level.**

Sensitive data that must always be masked before logging:
- Email addresses
- Phone numbers
- IP addresses
- Any other personally identifiable information (PII)

### Email Masking Format

Use the first 6 characters followed by `*`:
```
user@example.com → user@e*
```

This format is consistent across the codebase and simplifies compliance audits.
