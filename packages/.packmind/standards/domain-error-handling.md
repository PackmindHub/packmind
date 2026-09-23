# Domain Error Handling

Failures raised by a use case are answered centrally by `DomainExceptionFilter`, which maps them to an HTTP status and a log level. A failure carrying no `kind` reaches Nest's `ExceptionsHandler` as an unrecognised exception: it answers 500 and logs a full stack at error level, even when the right answer was a 404. Three interfaces carrying a `kind`, whose values do not overlap, are declared in `packages/types/src/errors/` — `DomainError` (`DomainErrorKind` = `not_found` | `forbidden` | `invalid_input` | `conflict`) for failures the caller caused and can correct, `InternalError` (`kind: 'internal'`, base class `PackmindInternalError`) for broken invariants that are our own bug, and `UpstreamError` (`UpstreamErrorKind` = `upstream_unavailable` | `upstream_rate_limited`, base class `PackmindUpstreamError`) for failures owned by a third party we depend on. The three partition failures by *fault* — the caller's, ours, a third party's — and fault is the axis rather than the HTTP status class, which is why `upstream_rate_limited` answers a 4xx and is still not a `DomainErrorKind`.

| kind | HTTP | Log level | Message returned to the caller | Retried by the frontend |
| --- | --- | --- | --- | --- |
| `not_found` | 404 | warn | yes | no |
| `forbidden` | 403 | warn | yes | no |
| `invalid_input` | 400 | warn | yes | no |
| `conflict` | 409 | warn | yes | no |
| `internal` | 500 | error, with stack | no — Nest's generic body | yes, once |
| `upstream_unavailable` (`PackmindUpstreamError`) | 502 | warn | yes | yes, once |
| `upstream_rate_limited` (`PackmindUpstreamError`) | 429 | warn | yes, plus `Retry-After` | no |

Reference implementations: `packages/node-utils/src/nest/filters/DomainExceptionFilter.ts` holds the `KIND_POLICY` and `UPSTREAM_KIND_POLICY` tables and is registered as a global `APP_FILTER`; `packages/node-utils/src/application/UserAccessErrors.ts` and `packages/deployments/src/domain/errors/DeploymentsError.ts` show the class shape; `packages/deployments/src/domain/errors/SpaceNotAccessibleError.ts` shows a message that does not leak; `packages/types/src/errors/UpstreamError.ts` declares the upstream family, `packages/git/src/domain/errors/GitUpstreamError.ts` shows a package's upstream base, `packages/git/src/domain/errors/GithubRateLimitedError.ts` shows a throttle carrying `retryAfterSeconds`, and `packages/git/src/infra/repositories/http/githubRateLimit.ts` shows classifying from the provider's response instead of its message.


packages/**/*.ts,apps/api/**/*.controller.ts

## Scope

**/packages/**/*.ts, **/apps/api/**/*.controller.ts

## Rules

* Never throw `new Error(...)` from a use case; throw a class extending the package's `DomainError`, `PackmindInternalError` or `PackmindUpstreamError` base.
* Give each package one base per error family it raises — domain, internal, upstream — each with a literal `reason` union and a typed `context`.
* Throw a missing resource and a resource owned by another tenant from a single branch, with one error and one message.
* Use `kind: 'not_found'` when a resource belongs to another tenant; reserve `forbidden` for when the caller's own rights are the subject.
* Extend `PackmindInternalError` for broken invariants the caller cannot correct.
* Never map domain errors in a controller with `instanceof` and a Nest `HttpException`; the filter maps `kind` centrally.
* Classify a third-party HTTP failure from `error.response?.status` and its headers; never derive a status from a substring of `error.message`.
* Never add an upstream kind to `DomainErrorKind`: `upstream_rate_limited` answers 429 and stays an `UpstreamError`, because the axis is fault, not status class.
* Pass `retryAfterSeconds` on an upstream throttle when the provider said how long; the filter emits it as the `Retry-After` header.
* Pick the error family by fault: the caller's fault is a domain error, ours is `PackmindInternalError`, a third party's is `PackmindUpstreamError`.
* Put resource ids in the error's `context`, never in a message: an upstream error's message reaches the caller, an internal error's never does.
* Throw `upstream_unavailable` (502, not 503) for an upstream outage, and for any upstream refusal the package does not yet model.
* Never log an error you rethrow: the filter records every thrown failure once, with its level, stack and typed `context`.
