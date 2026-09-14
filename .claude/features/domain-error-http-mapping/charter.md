# Feature: Map domain errors to HTTP status codes

- slug: `domain-error-http-mapping` — the directory name under `.claude/features/`
- status: `framing`
- opened: `2026-09-11`

Redo of [PR #462](https://github.com/PackmindHub/packmind/pull/462), which addresses
`PackmindHub/packmind-proprietary#773`. The PR is the origin of this scope; it is not
the specification. Where this charter and the PR disagree, this charter wins — see
`Out of scope` for what was dropped.

## Problem

`apps/api` has no exception filter: there is no `@Catch()` and no `ExceptionFilter`
anywhere in the tree, and no `SentryModule.forRoot()` either, so not even Sentry's
filter is installed. NestJS falls back to its default `ExceptionsHandler`, which maps
every non-`HttpException` to `500 Internal Server Error` and logs it at ERROR level
with a full stack trace. So a user whose account was deleted, a user acting outside
their organization, and a user without admin rights all get the same answer as a
genuine crash: a 500 whose body reads `"Internal server error"`. The frontend can only
show a generic failure, the CLI can only print one, the on-call engineer sees a stack
trace for an ordinary permission denial, and the service error ratio counts it.

The translation layer that produces these errors is already there and already correct:
every authenticated use case funnels through `AbstractMemberUseCase.execute`, which
deliberately re-types a `UserAccessError` into `UserNotFoundError` or
`UserNotInOrganizationError`. Nothing consumes its output. `ExpectedAuthError` in
`packages/accounts` has asked for this in its docstring since it was written — *"Callers
(e.g. NestJS controllers, exception filters) should log instances of this class at
`warn` level without stack traces, and map them to the appropriate HTTP response."*
The status is a property of the error, stored everywhere except on the error: twenty
controllers grew their own `instanceof` ladders, and the HTTP intent leaked into the
domain as prose — `RepositoryNotTrackableError` carries a comment explaining which
status it should map to, enforced 300 lines away in a controller.

## In scope

- A semantic error contract in `packages/types`: an error declares a **kind** (never a
  status number — the same errors are raised inside BullMQ workers, where a status
  means nothing) and a stable snake_case **reason** for the wire. `packages/types` is
  required rather than merely convenient: it is `env:shared`, `node-utils` is
  `env:node`, and `@nx/enforce-module-boundaries` forbids `env:browser` from depending
  on the latter — hosting the contract in `node-utils` would put the kind union out of
  the frontend's reach.
- One exception filter in `packages/node-utils/src/nest/`, turning kind into status.
- Registration of that filter in `apps/api`.
- Annotating the **six** access-error classes that today produce 500s:
  `UserAccessError` and its subclasses `UserNotFoundError`,
  `UserNotInOrganizationError`, `OrganizationAdminRequiredError` (all in
  `packages/node-utils/src/application/UserAccessErrors.ts`), plus
  `SpaceMembershipRequiredError` and `SpaceAdminRequiredError` (today plain `Error`
  subclasses in `AbstractSpaceMemberUseCase.ts` / `AbstractSpaceAdminUseCase.ts`).
  Because they all funnel through `AbstractMemberUseCase`, that covers every
  authenticated endpoint at once.
- **Adoption is opt-in per error class, and that is the whole mechanism.** Once a class
  declares its kind, every site that throws it answers with the right status — no
  change at the throw site, none in the controller. An error that has not opted in
  keeps producing exactly the 500-with-stack it produces today. There is no flag day.
- Rewording the five access-error messages, which today interpolate raw UUIDs. They
  have never been seen, because the body was always `"Internal server error"`; the
  moment the filter ships they reach the frontend surfaces that render `error.message`
  and the CLI's stderr. This is coupled to the change, not adjacent to it.
- `withSpan` no longer setting `SpanStatusCode.ERROR` for a domain error, so an
  ordinary denial stops counting against the service error ratio. The exception is
  still recorded; only the span's verdict changes.

## Out of scope

Non-goals, stated so the orchestrator can recognise one. A unit that needs something on
this list is not a design question — it is rung 4 of the escalation ladder, and halts
to the human.

- **The CLI. No file under `apps/cli` is touched.** The original PR added a
  `reason`-based guard at four call sites, because the CLI read a 404 as a
  feature-absent sentinel. `main` has since fixed that properly:
  `apps/cli/src/infra/http/packmindEdition.ts` decides feature-absence from the
  `PACKMIND_EDITION` response header, not from the status, and `trackingErrors.ts` no
  longer blames the account for a 404. The special case the guard existed for is gone.
- **The controller `instanceof` ladders stay.** They throw `HttpException`, which the
  filter passes through untouched, and some of them disagree with the class default on
  purpose. Deleting them is a per-route judgement, not a cleanup.
- **The remaining ~129 typed error classes stay unannotated.** Which ones to annotate
  next should be driven by what actually still shows up as a 500 once these six are
  done, not swept.
- **The ~900 bare `throw new Error(...)` calls stay untouched**, and are unaffected.
- **`LinterGateway`'s three unguarded `onError` 404 sites stay.** Not currently
  reachable: those routes live in the proprietary `linter` package, whose controller
  wraps failures in `BadRequestException` before the filter sees them.
- **`MemberNotFoundError` (`packages/spaces`) is not fixed here.** It interpolates the
  *target* user's id and `members.controller.ts:152` returns it as a 400 today — a live
  UUID leak, but independent of this change. It wants its own issue.
- **No new HTTP status beyond what the six classes need.** Widening the kind union
  speculatively is not in scope; a later domain extends it when it has an error to
  extend it for.

## Acceptance criteria

Each AC is **one user-observable behaviour**, and becomes at least one named test.

AC-1 through AC-5 are observable **over HTTP against a booted application**, not
against the filter in isolation. That distinction is load-bearing: a filter can map
correctly and still never be selected by Nest, and no unit test would notice.

| id | criterion | user-visible | verified by |
|----|-----------|--------------|-------------|
| AC-1 | An authenticated request whose user record no longer exists is answered `404`, not `500` | yes |  `nx test api --testNamePattern='the domain exception filter over HTTP'` |
| AC-2 | A request from a user who is not a member of the target organization is answered `403` | yes |  `nx test api --testNamePattern='the domain exception filter over HTTP'` |
| AC-3 | A request on an organization-admin-only route from a non-admin is answered `403` | yes |  `nx test api --testNamePattern='the domain exception filter over HTTP'` |
| AC-4 | A request scoped to a space the caller is not a member of is answered `404`, and is byte-identical to the answer for a space that does not exist | yes |  `nx test api --testNamePattern='the domain exception filter over HTTP'` |
| AC-5 | A request on a space-admin-only route from a space member who is not a space admin is answered `403` | yes |  `nx test api --testNamePattern='the domain exception filter over HTTP'` |
| AC-6 | The response body for AC-1..AC-5 carries a stable snake_case `reason` a client can branch on without parsing prose | yes |  `nx test api --testNamePattern='the domain exception filter over HTTP'` |
| AC-7 | None of the five reworded access-error messages that reach a client contains a UUID or any other identifier | yes | `nx test node-utils --testNamePattern='access error messages'` |
| AC-8 | An error class that has not declared a kind is still answered `500` with today's body and today's ERROR-level log | no |  `nx test api --testNamePattern='the domain exception filter over HTTP'` + `nx test node-utils --testNamePattern='DomainExceptionFilter'` |
| AC-9 | An `HttpException` thrown by a controller reaches the client with its own status and its own body, untouched by the filter | no |  `nx test api --testNamePattern='the domain exception filter over HTTP'` |
| AC-10 | A domain error passing through `withSpan` does not set the span status to ERROR; a non-domain error still does, and both are still recorded as exceptions | no | `nx test node-utils --testNamePattern='withSpan'` |
| AC-11 | An access denial is logged at `warn` without a stack trace, as `ExpectedAuthError`'s docstring has always asked | no |  `nx test node-utils --testNamePattern='DomainExceptionFilter'` |

## Known unknowns

| id | question | resolve by |
|----|----------|-----------|
| UK-1 | What shape is the error response body, and does it have to match anything the frontend or the generated API client already parses? | design session |
| UK-2 | `SpaceMembershipRequiredError` and `SpaceAdminRequiredError` are plain `Error`s today with no `reason` field. Do they become `UserAccessError` subclasses, or carry the contract independently? | design session |
| UK-3 | Which kind does each of the six classes get — in particular whether a missing *caller* is `not_found` or `forbidden`, and whether space membership follows the anti-enumeration policy the space-protected route loader already states (*"'not found' and 'no access' produce the same response"*) | design session |
| UK-4 | `@Catch()` as decorator syntax broke every suite in `packages/spaces` with `Expression expected` when the file became reachable from the `@packmind/node-utils` barrel. Does that still reproduce on `main`, and if so is the fix the metadata-as-a-call trick or turning decorator parsing on per consuming package? | design session, verified empirically before deciding |
| UK-5 | SWC compiles with `useDefineForClassFields` defaulting to true, under which a declaration-only field in a subclass re-defines the property as `undefined` after `super()` has set it. Which transforms must the contract be verified through — Jest, `@swc/cli`, the webpack bundle — and is that a test or a build-time assertion? | design session |
| UK-6 | Where the filter lives relative to the `@packmind/node-utils` barrel, given UK-4 | design session |

## Size and sessions

**Empty at framing. Filled at the close of the design session.**

Coarse read: this **is one feature**. Every AC traces to the same sentence — an error's
status is a property of the error and nothing reads it — and none of them would make
sense shipped alone. AC-7 (message rewording) looks separable but is not: those
messages are only reachable *because* the rest of this ships.

Expected shape of the work: one new contract file in `packages/types`, one filter plus
its registration, six one-line annotations, two adjacent files (`withSpan`, the
messages), and the specs. No migration, no frontend change, no new dependency. The
integration-level ACs are the part with real risk, because they need a booted Nest app.

- rough unit count: `6-10`
- verdict: `one session`
- why here: every split signal was checked and none fired. **No deferred unknown** —
  all six were decided (UK-1→D-002, UK-2→D-007, UK-3→D-006, UK-4→D-004, UK-5→D-003,
  UK-6→D-004), so nothing downstream is specced on a guess. **No releasable subset** —
  this is the strongest signal against splitting here: the contract without the filter
  changes no response, the filter without annotated classes catches nothing, and the
  annotations without registration are inert. Any cut lands the orchestrator somewhere a
  human has nothing to look at. **No late AC depending on an early shape** — AC-7
  (messages) and AC-10 (`withSpan`) are independent leaves, and the integration spec
  reads the design rather than informing it. **Context is not the risk** at 6-10 units.

  The rough read, for scale only — these are not planned units and the orchestrator
  splits on its own evidence: the `packages/types` contract; the `UserAccessErrors.ts`
  base and its three subclasses; the two space errors changing supertype; the filter
  plus its subpath, path entry and `.swcrc` flag; the `APP_FILTER` registration; the
  booted-app integration spec; `withSpan`; and the dependent spec fallout in
  `commands`, `skills`, `standards` and `integration-tests` from D-008's rewording.

  One caveat worth watching rather than splitting for: D-004 is the only unit that
  touches shared build configuration (`tsconfig.base.json`, `packages/node-utils/.swcrc`).
  If it goes wrong it goes wrong loudly and monorepo-wide, so it wants running early,
  where a failure is cheap to read — not carved into its own session.

## Done

Every AC has a passing named test recorded in `records.jsonl`, and the full suite is
green at the feature boundary.

When the verdict was `split`, that is the bar for the **feature**, not for each
session. A session ending green with its own ACs covered is a session done; the feature
is done when the last one is.
