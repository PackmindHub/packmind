---
name: 'Domain Error Handling'
alwaysApply: true
description: 'Failures raised by a use case are answered centrally by `DomainExceptionFilter`, which maps them to an HTTP status and a log level. A failure carrying no `kind` reaches Nest''s `ExceptionsHandler` as an unrecognised exception: it answers 500 and logs a full stack at error level, even when the right answer was a 404. Two disjoint unions, both discriminating on `kind`, are declared in `packages/types/src/errors/` — `DomainError` (`DomainErrorKind` = `not_found` | `forbidden` | `invalid_input` | `conflict`) for failures the caller caused and can correct, and `InternalError` (`kind: ''internal''`, base class `PackmindInternalError`) for broken invariants that are our own bug.

| kind | HTTP | Log level | Message returned to the caller | Retried by the frontend |
| --- | --- | --- | --- | --- |
| `not_found` | 404 | warn | yes | no |
| `forbidden` | 403 | warn | yes | no |
| `invalid_input` | 400 | warn | yes | no |
| `conflict` | 409 | warn | yes | no |
| `internal` | 500 | error, with stack | no — Nest''s generic body | yes, once |

Reference implementations: `packages/node-utils/src/nest/filters/DomainExceptionFilter.ts` holds the `KIND_POLICY` table and is registered as a global `APP_FILTER`; `packages/node-utils/src/application/UserAccessErrors.ts` and `packages/deployments/src/domain/errors/DeploymentsError.ts` show the class shape; `packages/deployments/src/domain/errors/SpaceNotAccessibleError.ts` shows a message that does not leak.


packages/**/*.ts,apps/api/**/*.controller.ts'
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

Full standard is available here for further request: [Domain Error Handling](../../../.packmind/standards/domain-error-handling.md)