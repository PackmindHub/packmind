---
applyTo: '**'
---
# Standard: Domain Error Handling

Failures raised by a use case are answered centrally by `DomainExceptionFilter`, which maps them to an HTTP status and a log level. A failure carrying no `kind` reaches Nest's `ExceptionsHandler` as a... :
* Extend `PackmindInternalError` for broken invariants the caller cannot correct.
* Give each package one error base extending `Error` and implementing `DomainError`, carrying a `kind`, a literal `reason` union and a typed `context`.
* Never map domain errors in a controller with `instanceof` and a Nest `HttpException`; the filter maps `kind` centrally.
* Never throw `new Error(...)` from a use case; throw a class extending the package's `DomainError` base or `PackmindInternalError`.
* Put resource ids in the error's `context`, never in its user-facing message.
* Throw a missing resource and a resource owned by another tenant from a single branch, with one error and one message.
* Use `kind: 'not_found'` when a resource belongs to another tenant; reserve `forbidden` for when the caller's own rights are the subject.

Full standard is available here for further request: [Domain Error Handling](../../.packmind/standards/domain-error-handling.md)