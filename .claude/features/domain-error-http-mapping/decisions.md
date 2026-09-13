# Decisions — Map domain errors to HTTP status codes

Append-only. A decided entry is never edited and never deleted.

**When implementation reveals a decision was wrong** — not merely ambiguous —
append a new entry carrying `supersedes: D-00n`, and append `superseded-by: D-0nn`
to the old one. That single line is the only permitted mutation of a decided
entry.

---

## D-001 — Put the contract in `packages/types`, and make it semantic, not numeric

- status: `active`
- user-visible: `no`
- decided: `2026-09-11`
- supersedes: —
- superseded-by: —
- relates to: `AC-1`..`AC-6`

**Decision.** A new `packages/types/src/errors/DomainError.ts` declares the whole
contract: a `DomainErrorKind` union, a `DomainError` interface carrying `kind` and a
snake_case `reason`, and a type guard. No HTTP status number appears in it.

**Reasoning.** Two separate arguments, and both are load-bearing.

*Why semantic.* The same errors are raised inside BullMQ workers, where a status code
means nothing. An error that carries `403` is asserting something false about half its
throw sites. Kind is true everywhere; the adapter layer that has a response to write is
the only layer entitled to turn kind into a number.

*Why `packages/types`.* Verified: `packages/types` is tagged `env:shared`,
`packages/node-utils` is `env:node`, and `@nx/enforce-module-boundaries` forbids
`env:browser` from depending on `env:node`. `apps/frontend` is `env:browser` and
imports `@packmind/node-utils` nowhere — the two references to it in the frontend tree
are comments. So hosting the union in `node-utils` would put it permanently out of the
frontend's reach, and the frontend is exactly the client that wants to branch on it.

**Rejected.**

- `status: number` on the error — asserts an HTTP fact at throw sites that have no HTTP
  response, and bakes the adapter's job into the domain. This is the existing disease,
  not the cure: `RepositoryNotTrackableError` already carries a prose comment about
  which status it wants, enforced 300 lines away in a controller.
- Contract in `packages/node-utils` next to the filter — colocated with its only
  current consumer, but the module-boundary rule above makes it unreachable from the
  frontend forever. Cheaper today, unfixable later.
- A decorator or registry mapping class → status — needs every error class to be
  imported somewhere central to register, which is exactly the coupling the opt-in
  design avoids.

**Constrains implementation.** Define `DomainErrorKind`, the `DomainError` shape and
its type guard in `packages/types/src/errors/DomainError.ts`, export it through
`packages/types/src/errors/index.ts` and `packages/types/src/index.ts`. This file must
not import from any other Packmind package and must not mention HTTP status numbers.

---

## D-002 — Reuse the `ServerErrorResponse` contract that already exists

- status: `active`
- user-visible: `yes`
- decided: `2026-09-11`
- supersedes: —
- superseded-by: —
- relates to: `AC-6`, `UK-1`

**Decision.** The filter writes `{ statusCode: number, message: string, reason: string }`.
No new client-side type, and no change to any client.

**Reasoning.** This was not designed; it was found. `apps/frontend/src/services/api/errors/PackmindError.ts`
already declares:

```
export type ServerErrorResponse = {
  data: { message: string; reason?: string };
  status: number;
  statusText: string;
};
```

with `reason` documented as *"Stable discriminator some endpoints add when one HTTP
status covers several distinct failures, so clients branch on a code instead of matching
on message text."* That is precisely this feature, declared and never supplied. The CLI
independently agrees: `PackmindHttpClient` reads `errorBody.message` and falls back to
the status text. And `statusCode` + `message` is what Nest's own `HttpException` body
already carries, so `AC-8`'s unannotated-error passthrough stays byte-identical.

**Rejected.**

- A new richer envelope (`{ error: { kind, reason, details } }`) — would strand both
  existing clients, and `kind` is an internal routing concept the wire does not need:
  the status already says what the kind decided.
- Serializing `.context` into the body — `.context` is where the UUIDs live. See D-008;
  putting them back on the wire undoes AC-7 in the same breath.
- Omitting `reason` and letting clients match the message — the exact failure mode the
  existing docstring was written to prevent, and it breaks on the next rewording.

**Constrains implementation.** The response body must contain exactly `statusCode`,
`message` and `reason`. Do not serialize the error's `context`, `stack`, `name` or
`cause` into the body. Do not add a field to `ServerErrorResponse` and do not edit any
file under `apps/frontend`.

---

## D-003 — Carry `kind` through the base constructor, never as a subclass class-field

- status: `active`
- user-visible: `no`
- decided: `2026-09-11`
- supersedes: —
- superseded-by: —
- relates to: `AC-1`..`AC-5`, `UK-5`

**Decision.** `kind` is a constructor parameter on the base error class, assigned once
in the base constructor. Subclasses pass it up. No subclass declares `kind` as a class
field, with or without an initializer.

**Reasoning.** Measured, not assumed. swc at `target: es2022` does not downlevel class
fields at all — it emits them and lets the runtime apply them. So the semantics follow
whichever transform the consuming suite happens to use, and this monorepo uses two:

| transform | used by | `class Sub extends Base { kind; }` |
|---|---|---|
| `swcTransform` (define semantics) | `spaces`, `standards`, `skills`, `commands`, `git`, … | `kind === undefined` |
| `swcTransformWithDefineFields` | `accounts` | `kind === 'not_found'` |

The same source, opposite results, in two suites that both have to be green. A field
*initializer* (`kind = 'not_found'`) is correct under both — but it is correct by
convention, and the failure mode when someone writes a bare declaration instead is a
silent `undefined` that turns a 403 back into a 500 in production while the author's own
package's tests pass.

Constructor assignment removes the class of bug rather than testing for it. It also
costs nothing new: `UserAccessError` already takes `reason` as a constructor parameter
and assigns it in the base. This is the same mechanism applied to a second field, so
there is no new idiom for a reader to learn.

**Rejected.**

- Field initializer plus verification through all three transforms (Jest, `@swc/cli`,
  the webpack bundle) — the original PR's answer, and it does work. Rejected because it
  makes correctness a convention a reviewer must enforce on every future annotated
  class, forever, against a failure that is invisible in the author's own package.
  Tests that must be remembered are weaker than a shape that cannot be written wrong.
- A prototype getter — also immune, but it is a second idiom for the same job that
  `reason` already does with a constructor parameter.
- Setting `useDefineForClassFields` consistently across all suites — a global change to
  how every class in the monorepo compiles, to fix one field. Wildly out of proportion,
  and `accounts` sets it deliberately for mock compatibility.

**Constrains implementation.** Add `kind` as a required constructor parameter on the
base error class and assign it there. In every subclass, pass the kind to `super(...)`.
Never write `kind` as a class field in a subclass — not `kind;` and not
`kind = 'not_found';` — because swc's class-field semantics differ between this
monorepo's Jest transforms and the declaration form silently yields `undefined` in most
packages.

---

## D-004 — Keep the filter out of the `@packmind/node-utils` barrel, on its own subpath

- status: `active`
- user-visible: `no`
- decided: `2026-09-11`
- supersedes: —
- superseded-by: —
- relates to: `AC-1`..`AC-5`, `UK-4`, `UK-6`

**Decision.** `DomainExceptionFilter` lives in a directory below `src/nest/` that
`src/nest/index.ts` does **not** re-export, reachable only through its own
`tsconfig.base.json` path entry. It uses ordinary `@Catch()` decorator syntax.
`packages/node-utils/.swcrc` gets `decorators: true`.

**Reasoning.** The constraint is real and was reproduced, not inherited. `@Catch()`
compiled with the plain transform fails with `Expression expected` — the exact error the
original PR reported. And it would be compiled by the plain transform: `tsconfig.base.json`
maps `@packmind/node-utils` to `packages/node-utils/src/index.ts`, so every consumer's
Jest transforms node-utils *source* with its own config. 17 projects import
`@packmind/node-utils`; only 5 use a decorator-capable transform. `src/index.ts` does
`export * from './nest'`, so `src/nest/index.ts` is barrel-reachable and putting the
filter there breaks the other 12.

Not exporting it is the smallest true fix. A file no consumer imports is a file no
consumer's Jest ever parses, so the decorator question never arises for them — and the
one project that does import it, `apps/api`, already uses `swcTransformWithDecorators`.
Subpath entry points are the established idiom here, not an invention for this feature:
`@packmind/accounts/test`, `@packmind/git/schemas`, `@packmind/analytics/types` and
`@packmind/coding-agent/types` all work this way.

The `.swcrc` change is required and is separate: `nx build node-utils` uses `@nx/js:swc`
against `packages/node-utils/.swcrc`, which currently says `decorators: false`, so the
build would fail on the decorator even though no consumer's Jest sees it. Flipping it
governs only node-utils' own build output. `experimentalDecorators` is already true in
`tsconfig.base.json`, so typecheck needs nothing.

**Rejected.**

- `Catch()(DomainExceptionFilter)` as a call instead of decorator syntax — the original
  PR's answer. It does work (verified: the call form parses clean under the plain
  transform) and writes identical metadata. Rejected because it is a trick that survives
  only as long as someone reads the comment explaining it, and it exists purely to let
  the file sit in a barrel it has no reason to be in. Removing the reason beats guarding
  the symptom.
- Switching the ~12 affected packages to `swcTransformWithDecoratorsOnly` — the honest
  fix, and the widest blast radius: it changes how every class in twelve unrelated
  suites compiles, to accommodate one file none of them use.
- Putting the filter in `apps/api` instead of `node-utils` — no boundary problem at all,
  but the proprietary fork needs it too, and `node-utils` is inside the OSS↔proprietary
  byte-parity contract while `apps/api` is not.

**Constrains implementation.** Create the filter under `packages/node-utils/src/nest/`
in a subdirectory with its own `index.ts`. Do **not** add it to
`packages/node-utils/src/nest/index.ts` and do **not** add it to
`packages/node-utils/src/index.ts` — a consuming package's Jest compiles node-utils
source with `decorators: false` and will fail with `Expression expected`. Add a
`tsconfig.base.json` path entry for the subpath, and set `"decorators": true` in
`packages/node-utils/.swcrc` so `nx build node-utils` compiles the file. Use normal
`@Catch()` decorator syntax.

---

## D-005 — The kind union starts at exactly two members, and the status map is total

- status: `active`
- user-visible: `no`
- decided: `2026-09-11`
- supersedes: —
- superseded-by: —
- relates to: `AC-1`..`AC-5`

**Decision.** `DomainErrorKind` is `'forbidden' | 'not_found'`. The kind→status map is
declared as a total `Record<DomainErrorKind, number>`.

**Reasoning.** Two is what the six in-scope classes need, and the charter rules out
adding kinds speculatively. Totality is the mechanism that keeps it honest: a
`Record` keyed by the union means adding a member is a compile error until someone
states its status, so the union can never drift ahead of the mapping. That is the
property that makes "later domains extend both together" enforceable rather than
aspirational.

**Rejected.**

- Seeding the union with the usual suspects (`conflict`, `invalid`, `unauthorized`) —
  speculative, explicitly out of scope per the charter, and each one is a design
  argument that should happen when a real error wants it.
- A partial map with a 500 fallback — silently maps a new kind to the exact failure this
  feature exists to eliminate, and removes the compile-time pressure entirely.

**Constrains implementation.** Declare the map as `Record<DomainErrorKind, number>`
with no index signature, no optional values and no default branch.

---

## D-006 — Kind per class, with membership following anti-enumeration

- status: `active`
- user-visible: `yes`
- decided: `2026-09-11`
- supersedes: —
- superseded-by: —
- relates to: `AC-1`..`AC-5`, `UK-3`

**Decision.**

| class | kind | status |
|---|---|---|
| `UserAccessError` (base) | `forbidden` | 403 |
| `UserNotFoundError` | `not_found` | 404 |
| `UserNotInOrganizationError` | `forbidden` | 403 |
| `OrganizationAdminRequiredError` | `forbidden` | 403 |
| `SpaceMembershipRequiredError` | `not_found` | 404 |
| `SpaceAdminRequiredError` | `forbidden` | 403 |

**Reasoning.** Three distinct arguments, not one rule.

*The base is `forbidden`* because a subclass that forgets to state a kind should degrade
to the safe, non-disclosing answer.

*`UserNotFoundError` is `not_found`* because the record that cannot be found is the one
the request is about — the caller's own user row. There is no resource to be forbidden
from; the request is genuinely unresolvable. There is no enumeration risk either, since
the only id involved is the caller's own.

*`SpaceMembershipRequiredError` is `not_found`* on anti-enumeration grounds. Dozens of
space-scoped use cases throw it with no controller handling, so a blanket 403 would turn
every one of them into an existence oracle: guess a space id, read the status, learn
whether it exists. 404 makes "no such space" and "not your space" indistinguishable by
status, and `reason` remains available to any client that has a legitimate need to tell
them apart.

*`SpaceAdminRequiredError` is `forbidden`* because reaching it already proves membership.
The caller is inside the space, so confirming it exists discloses nothing they do not
have, and 403 is the truthful answer.

The accepted cost is recorded in D-013.

**Rejected.**

- `UserNotFoundError` as `forbidden` — avoids the 404 collision described in D-013 and
  is arguably safer, but it is a false statement about a request whose subject does not
  exist, and it would leave a deleted account looking like a permissions problem the
  user could resolve by asking an admin.
- `SpaceMembershipRequiredError` as `403` — truthful to the caller and keeps 404
  meaning strictly "no such record", which would leave `SkillsGatewayApi`'s null-on-404
  honest. Rejected because it makes every space-scoped route an existence oracle, and
  that is a security property traded for a UI nicety.
- Deciding kind per *route* rather than per class — that is the controller `instanceof`
  ladder this feature exists to replace, and the charter puts those explicitly out of
  scope.

**Constrains implementation.** Assign exactly the kinds in the table above. Do not
change a controller to override any of them.

---

## D-007 — The two space errors become `UserAccessError` subclasses

- status: `active`
- user-visible: `no`
- decided: `2026-09-11`
- supersedes: —
- superseded-by: —
- relates to: `AC-6`, `UK-2`

**Decision.** `SpaceMembershipRequiredError` and `SpaceAdminRequiredError` stop extending
`Error` and extend `UserAccessError`. `UserAccessErrorReason` gains
`'space_membership_required'` and `'space_admin_required'`. Their constructors keep
their current `(userId, spaceId)` signatures.

**Reasoning.** They are access errors that happen to have been declared next to the use
cases that throw them rather than next to their siblings. Today they carry no `reason`
at all, so without this they would satisfy AC-1..AC-5 but fail AC-6 — a client could see
the status and nothing else. Extending the base gives them `reason` and `context` from
the same place the other three get them, and the base is where D-003's constructor
assignment of `kind` lives, so there is one mechanism rather than two.

Keeping the `(userId, spaceId)` positional signatures matters: both are thrown from
`AbstractSpaceMemberUseCase` / `AbstractSpaceAdminUseCase` and asserted in existing
specs. Changing the signature to the base's context-object form would ripple into call
sites this feature has no reason to touch.

**Rejected.**

- Leaving them as plain `Error` and implementing `DomainError` structurally — avoids
  moving anything, but duplicates `reason`/`context` handling and puts the `kind`
  assignment outside the base constructor, reopening D-003's hazard.
- Moving the classes into `UserAccessErrors.ts` — tidier, but they are thrown by the
  abstract use cases they currently sit beside, and relocating them churns imports
  across packages for no behavioural gain.
- Reshaping their constructors to take a context object — consistent with the base's
  three, but the ripple lands in specs and call sites that are otherwise untouched.

**Constrains implementation.** Change only the `extends` clause, the `super(...)` call
and the message in `AbstractSpaceMemberUseCase.ts` and `AbstractSpaceAdminUseCase.ts`.
Keep both constructors' existing `(userId: string, spaceId: string)` signatures. Add the
two new reasons to `UserAccessErrorReason`.

---

## D-008 — Identifiers live on `context`, never in the message

- status: `active`
- user-visible: `yes`
- decided: `2026-09-11`
- supersedes: —
- superseded-by: —
- relates to: `AC-7`

**Decision.** All five access-error messages are rewritten in the second person with no
UUID and no identifier of any kind. The ids stay on `.context`, which the filter does
not serialize. `SpaceMembershipRequiredError`'s message confirms neither that the space
exists nor that membership is what failed.

**Reasoning.** These messages have never been seen by anyone, because the body was
always `"Internal server error"`. The moment the filter ships they reach the frontend
surfaces that render `error.message` and the CLI's stderr — so this is not a cleanup
adjacent to the feature, it is a consequence of it, and it has to land in the same
change or the feature ships a regression.

Second person because the reader is the person who was denied, not an operator reading a
log. Identifier-free because a UUID tells that reader nothing they can act on, and in
the membership case it would also undo D-006: a message naming the space would confirm
the space exists after the status was carefully chosen not to.

**Rejected.**

- Keeping the messages and having the filter strip ids — needs a redaction pass over
  free text, which is exactly the fragile thing; and the message would still be wrong
  for its reader.
- Rewording in a follow-up change — the regression would ship first and be user-visible
  in the interim.
- Putting ids in a `details` field for support purposes — reintroduces the leak through
  a different key; `.context` already reaches the logs, which is where operators are.

**Constrains implementation.** Rewrite the messages of `UserNotFoundError`,
`UserNotInOrganizationError`, `OrganizationAdminRequiredError`,
`SpaceMembershipRequiredError` and `SpaceAdminRequiredError` so that no `userId`,
`organizationId`, `spaceId` or any other identifier is interpolated. Address the reader
as "you". `SpaceMembershipRequiredError`'s message must not reveal whether the space
exists. Keep the ids on `.context`. Where an existing spec asserts one of these strings,
change the assertion to assert the error class instead.

---

## D-009 — Domain errors are logged at `warn` without a stack

- status: `active`
- user-visible: `no`
- decided: `2026-09-11`
- supersedes: —
- superseded-by: —
- relates to: `AC-11`, `AC-8`

**Decision.** The filter logs a domain error at `warn` with its reason and context and
no stack trace. Anything it does not recognise keeps today's ERROR-level log with the
full stack.

**Reasoning.** `ExpectedAuthError` in `packages/accounts` has asked for exactly this in
its docstring since it was written — *"Callers (e.g. NestJS controllers, exception
filters) should log instances of this class at `warn` level without stack traces, and
map them to the appropriate HTTP response."* Nothing has ever been in a position to
honour it. A permission denial is an expected outcome of a correctly functioning system;
paging it at ERROR with a stack trace is what trains people to ignore the channel.
Context still goes to the log, which is the half of D-008 that operators need.

**Rejected.**

- Not logging domain errors at all — removes the only record that an access denial
  happened, which is exactly what an audit or an abuse investigation needs.
- Logging at ERROR without the stack — still counts as an error in every dashboard built
  on level, which is the problem.

**Constrains implementation.** In the filter, log recognised domain errors at `warn`,
including `reason` and `context`, and do not include a stack trace. Leave the handling
of unrecognised exceptions exactly as it is today.

---

## D-010 — `withSpan` stops marking domain errors as failed spans

- status: `active`
- user-visible: `no`
- decided: `2026-09-11`
- supersedes: —
- superseded-by: —
- relates to: `AC-10`

**Decision.** `withSpan` no longer calls `setStatus({ code: SpanStatusCode.ERROR })`
when the thrown error is a domain error. It still calls `recordException` for every
error, domain or not.

**Reasoning.** The span status is the service's own verdict on whether it worked. A user
being told they may not do something is the service working. Leaving it as ERROR means
the error ratio rises with ordinary permission denials, which makes the ratio useless as
an alerting signal precisely when adoption grows. The exception is still recorded, so
nothing is lost for anyone debugging a specific trace — only the aggregate verdict
changes.

**Rejected.**

- Leaving `withSpan` alone — the feature would convert 500s into clean 403s at the HTTP
  layer while still reporting them as service errors in telemetry, which is
  contradictory and would be read as a regression by whoever watches the dashboard.
- Dropping `recordException` too — throws away the per-trace detail that makes an
  individual denial diagnosable.

**Constrains implementation.** In `withSpan`'s catch path, call `recordException`
unconditionally as today, and guard only the `setStatus({ code: SpanStatusCode.ERROR })`
call behind a check that the error is not a domain error.

---

## D-011 — Register the filter as `APP_FILTER` in `apps/api`

- status: `active`
- user-visible: `no`
- decided: `2026-09-11`
- supersedes: —
- superseded-by: —
- relates to: `AC-1`..`AC-5`, `AC-9`

**Decision.** The filter is provided as `APP_FILTER` in `apps/api`'s root module. It
passes any `HttpException` straight through untouched.

**Reasoning.** `APP_FILTER` is global and DI-aware, which a `useGlobalFilters` call in
the bootstrap is not — and the filter should be able to take a logger. Passthrough for
`HttpException` is what makes the charter's "controller ladders stay" non-goal work:
those ladders already throw `HttpException`, so leaving them alone has to be free.

**Rejected.**

- `app.useGlobalFilters(...)` in `main.ts` — no dependency injection, and it sits
  outside the module graph where the integration test boots the app.
- Binding the filter per controller — twenty registrations to maintain and a silent gap
  every time someone adds the twenty-first.
- Having the filter re-map `HttpException`s to agree with the class defaults — directly
  contradicts the charter's non-goal; some controllers disagree with the default on
  purpose.

**Constrains implementation.** Add the provider to `apps/api`'s root module as
`{ provide: APP_FILTER, useClass: DomainExceptionFilter }`. The filter must return an
`HttpException` unchanged — same status, same body. Do not modify any controller.

---

## D-012 — Prove registration over HTTP, not just mapping in isolation

- status: `active`
- user-visible: `no`
- decided: `2026-09-11`
- supersedes: —
- superseded-by: —
- relates to: `AC-1`..`AC-5`, `AC-8`, `AC-9`

**Decision.** AC-1..AC-5, AC-8 and AC-9 are verified by an integration spec that boots a
real Nest application on port 0 and drives it with `fetch`. Unit specs cover the mapping
itself. No new test dependency is added.

**Reasoning.** A filter can map every kind correctly and still never be selected by
Nest — wrong metadata, wrong registration, a barrel that did not re-export it. A unit
test of the filter passes in all of those cases, and every AC would be reported green
while every endpoint still returned 500. The booted-app test is the only thing that
distinguishes "the filter is correct" from "the filter is installed", and installation
is the half that was missing for this feature's entire life.

`fetch` is in the runtime, so a real HTTP round trip costs no dependency.

Note for whoever writes it: the plain-`Error` and `HttpException` assertions pass
whether or not the filter is registered, because Nest's default handler produces the
same body for those. They guard passthrough, not registration — so do not use them to
conclude the filter is installed.

**Rejected.**

- Unit-testing the filter alone — see above; it cannot fail in the way this feature
  most plausibly fails.
- An e2e test under `apps/e2e-tests` — needs the real stack and a browser for an
  assertion about a status code, and would run far from the code it guards.
- Asserting Nest metadata on the class instead of booting — proves `@Catch()` was
  applied, not that the app installed it.

**Constrains implementation.** Write the integration spec in `apps/api`, booting the
application on port 0 and asserting real HTTP responses via `fetch`. Add no new package
to `package.json`. Assert status, `message` and `reason` for each mapped kind.

---

## D-013 — Accept that a membership 404 renders as "not found" in the frontend

- status: `active`
- user-visible: `yes`
- decided: `2026-09-11`
- supersedes: —
- superseded-by: —
- relates to: `AC-4`, `AC-6`

**Decision.** No frontend or CLI file is changed. `SkillsGatewayApi.getSkillBySlug`
keeps turning any 404 into `null`, so a caller who has lost space membership sees the
skill-not-found page rather than an access error.

**Reasoning.** This is the accepted cost of D-006, recorded here so it is not
rediscovered as a bug. `isPackmindNotFoundError` keys purely on `status === 404`, and
`getSkillBySlug` is its only consumer outside the predicate's own file. The resulting
behaviour is not wrong so much as coarse — and it is the behaviour anti-enumeration
asks for, since the whole point is that the client cannot tell the two apart unless it
looks at `reason`.

On the CLI side the charter already settles it: `packmindEdition.ts` decides
feature-absence from the `PACKMIND_EDITION` header rather than from a 404, so the
sentinel collision the original PR worked around no longer exists.

**Rejected.**

- Teaching `getSkillBySlug` to check `reason` before returning `null` — the right change
  eventually, but the charter puts `apps/cli` and client adaptation out of scope, and
  doing it here would pull one arbitrary gateway out of ~46 message-rendering surfaces.
- Choosing 403 for membership so the frontend stays honest — reopens D-006's
  enumeration hole for a UI improvement.

**Constrains implementation.** Do not edit any file under `apps/frontend` or `apps/cli`.
If a unit believes a client must adapt, that is out of scope — halt rather than change
it.

---

## D-014 — `kind` is a required parameter, not one defaulting to `forbidden`

- status: `active`
- user-visible: `no`
- decided: `2026-09-11`
- supersedes: —
- superseded-by: —
- relates to: `D-003`, `D-006`, `AC-1`..`AC-5`

**Decision.** The `kind` parameter on `UserAccessError`'s constructor is required and
has no default value. Every subclass states its kind explicitly at its `super(...)`
call. The `forbidden` on the base class's row in D-006's table describes what a
directly-constructed `UserAccessError` is given, not a fallback the language applies.

**Reasoning.** D-003 and D-006 pull in opposite directions on one point, and this
records which way it was resolved rather than leaving the next reader to guess.

D-003 says *"Add `kind` as a required constructor parameter on the base error class"*.
D-006's reasoning for giving the base `forbidden` is that *"a subclass that forgets to
state a kind should degrade to the safe, non-disclosing answer"* — which only has
meaning if forgetting is possible, i.e. if the parameter carries a default.

A required parameter is the stronger form of the same safety argument. D-006 wants a
subclass that forgets to fail safe; a required parameter means it cannot compile at all,
which is safer than failing safe at runtime, and it is the identical argument D-003
makes against the class-field form — prefer the shape that cannot be written wrong over
the convention a reviewer has to enforce. A default value would also re-open a quieter
version of D-003's hazard: a subclass that omits the argument would silently inherit
`forbidden`, turning what should be a 404 into a 403 with nothing to notice it.

**Rejected.**

- `kind: DomainErrorKind = 'forbidden'` as a defaulted parameter — literally honours
  D-006's sentence and is what a reader of D-006 alone would write. Rejected because it
  makes an omission silent, and D-003's entire argument is that a silently wrong `kind`
  is the failure mode this contract exists to remove. The cost is that D-006's base row
  becomes descriptive rather than enforced, which is the cheaper loss.
- Dropping the base row from D-006's table — tidier, but the base class is constructible
  and something has to say what a direct construction means.

**Constrains implementation.** `UserAccessError`'s constructor signature is
`(kind: DomainErrorKind, reason: UserAccessErrorReason, context, message)` with no
default on `kind`. Each of the three subclasses passes its kind from D-006's table as
the first argument to `super(...)`. Do not give `kind` a default value.

---

## D-015 — `spaceId` joins `UserAccessErrorContext` as optional, mirroring `organizationId`

- status: `active`
- user-visible: `no`
- decided: `2026-09-11`
- supersedes: —
- superseded-by: —
- relates to: `D-007`, `D-008`, `AC-4`, `AC-5`

**Decision.** `UserAccessErrorContext` gains `spaceId?: string`, and a `SpaceContext`
type is declared exactly as `OrganizationContext` already is — the base context plus
`Required<Pick<…, 'spaceId'>>`. The two space error classes build a `SpaceContext` from
their `(userId, spaceId)` arguments and pass it to `super(...)`. The base class's
`context` field keeps its single type; no subclass redeclares it.

**Reasoning.** D-007 requires the two space errors to extend `UserAccessError` and D-008
requires their ids to live on `.context`, but `.context` has nowhere to put a space id:
`UserAccessErrorContext` is built from `Pick<PackmindCommand, …>`, and `PackmindCommand`
has no `spaceId` field at all. It is added separately on `SpaceMemberCommand` /
`SpaceAdminCommand`. So `Pick<PackmindCommand, 'spaceId'>` is inexpressible and a context
type has to be written by hand either way — the only question is where the field lands.

Widening the shared context type is the option that avoids re-opening D-003's hazard. The
alternative — a narrower `context` on the subclasses — requires redeclaring
`readonly context: SpaceContext` as a class field in a subclass, and that is precisely
the construct D-003 measured as compiling to `undefined` under the swc transform most of
this monorepo's suites use. Choosing it would silently erase the whole context, not just
the space id.

Optional rather than required because the three organization errors have no space id, and
`organizationId` already establishes the idiom: optional on the base, narrowed to
required by a derived type for the classes that guarantee it.

`spaceId` is typed plain `string` even though `SpaceId` is branded, because
`Branded<T> = string & { __brand: T }` is a structural subtype of `string`. The existing
call sites already pass a branded `command.spaceId` into a plain `string` parameter and
compile; keeping `string` holds D-007's requirement that the constructors keep their
`(userId: string, spaceId: string)` signatures.

**Rejected.**

- `readonly context: SpaceContext` redeclared on each space subclass — the precise
  shape D-003 exists to forbid. Under `swcTransform` the declaration re-defines the
  property as `undefined` after `super()` has set it, so `.context` would be empty in
  most packages while the author's own suite passed.
- A separate `SpaceAccessError` base carrying its own context — a second hierarchy for
  one optional field, and it would need its own `kind` plumbing, which is the
  one-mechanism-not-two argument D-007 already settled.
- Typing `spaceId` as `SpaceId` — would force the constructors to take a branded id,
  changing the `(userId: string, spaceId: string)` signatures D-007 explicitly preserves,
  and rippling into the throw sites and specs.

**Constrains implementation.** Add `spaceId?: string` to `UserAccessErrorContext`.
Declare `SpaceContext = UserAccessErrorContext & Required<Pick<UserAccessErrorContext,
'spaceId'>>` alongside `OrganizationContext`. Do not redeclare `context` as a class
field in any subclass. Do not change the base class's `context` field type.

---

## D-016 — Two messages become subject-neutral, because the subject is not always the caller

- status: `active`
- user-visible: `yes`
- decided: `2026-09-11`
- supersedes: —
- superseded-by: —
- relates to: `D-006`, `D-008`, `AC-7`

**Decision.** `UserNotFoundError`'s message becomes `The user account could not be
found.` and `UserNotInOrganizationError`'s becomes `That user is not a member of this
organization.` The other three access-error messages keep the second person unchanged.
No call site in `packages/accounts` changes, and no new error class is introduced.

**Reasoning.** The charter's premise — *"every authenticated use case funnels through
`AbstractMemberUseCase`, that covers every authenticated endpoint at once"* — is false
for two of the six classes, and the drift check found it. `packages/accounts` re-exports
both classes and throws them about a **target** user at five sites:
`UserService.ts:270`, `ChangeUserRoleUseCase.ts:57`,
`RemoveUserFromOrganizationUseCase.ts:100`, `ActivateUserAccountUseCase.ts:68` and
`ResetPasswordUseCase.ts:67` — the last two on unauthenticated flows.

With the second-person wording, an organization admin changing the role of a user who
does not exist would be told *"Your user account could not be found"*, and an admin
removing a non-member would be told *"You are not a member of this organization"*. Both
are false statements about the person reading them. That is worse than the UUID the
rewording removed: the old message was at least about the right person.

Subject-neutral wording is true in both readings — the caller whose own record is gone,
and the target the caller named — and it costs two strings. D-008's mechanism is
untouched: still no identifier, still written for the person reading it rather than for
an operator. Only its literal "address the reader as you" yields, and only for the two
classes where the reader is not reliably the subject.

The `not_found` kind stands. D-006 justified it by the record being the caller's own,
but its other argument — that the request is genuinely unresolvable and there is no
resource to be forbidden from — holds for a target user too, and a missing target user
is exactly what 404 means.

**Rejected.**

- Distinct `TargetUserNotFoundError` / `TargetUserNotInOrganizationError` classes for
  the five `packages/accounts` sites — correct rather than merely true, and it would let
  the caller-facing messages keep their second person. Rejected on scope: the charter
  budgeted six one-line annotations, and this adds two classes, five call-site changes
  and their spec fallout. It is the right follow-up if these routes ever need to say
  something more specific.
- Accepting the falsehood and recording it as a cost, as D-013 does for the frontend's
  coarse 404 — cheapest, and the wrong message only surfaces on admin-manages-other-user
  routes. Rejected because D-013 accepts an imprecision, whereas this would knowingly
  ship a statement that is simply untrue, and the fix is two strings.

**Constrains implementation.** Change only the message strings of `UserNotFoundError`
and `UserNotInOrganizationError`. Do not change their `kind`, `reason`, `context` or
constructor signatures. Do not edit any file under `packages/accounts`. Do not
introduce a new error class. `OrganizationAdminRequiredError`,
`SpaceMembershipRequiredError` and `SpaceAdminRequiredError` keep their current
second-person messages, because they are only ever thrown about the caller.

---

## D-017 — Prove selection by booting, prove installation by reading `AppModule`'s metadata

- status: `active`
- user-visible: `no`
- decided: `2026-09-11`
- supersedes: —
- superseded-by: —
- relates to: `D-011`, `D-012`, `AC-1`..`AC-5`, `AC-8`, `AC-9`

**Decision.** The integration spec boots a **minimal** Nest application — a throwaway
module with a test controller that throws each error, and the filter registered exactly
as `AppModule` registers it, `{ provide: APP_FILTER, useClass: DomainExceptionFilter }` —
on port 0, driven with `fetch`. Separately, and in the same spec, it asserts that
`AppModule`'s own provider metadata contains that `APP_FILTER` entry, by reading the
module's Nest metadata without instantiating it.

**Reasoning.** D-012 requires proving the filter is *installed*, not merely correct, and
explicitly rejects asserting metadata *instead of* booting. Both halves are kept here;
neither replaces the other.

The obvious reading of D-012 — boot the real `AppModule` — turns out to have no
precedent and a real cost. `apps/api`'s one full-boot spec
(`shared/middleware/editionHeader.integration.spec.ts`) deliberately uses an ad-hoc
module with a single controller. Booting `AppModule` instead pulls its entire dependency
graph: TypeORM, JWT, and every domain hexa. That needs a database and a Redis to come up,
which makes it an integration test of the whole application rather than of this filter,
and makes it fail for reasons that have nothing to do with the thing under test.

Splitting the claim is what keeps both halves cheap and honest. Booting a minimal module
proves everything about the filter that can go wrong in Nest: that `@Catch()` wrote the
metadata, that Nest selects it for a thrown domain error, that the mapping produces the
right status and body, that an `HttpException` passes through, and that an unannotated
error still yields today's 500. Reading `AppModule`'s provider metadata proves the one
remaining thing a minimal module cannot — that the real application graph actually lists
the provider. Together they cover D-012's concern more completely than a full boot would,
because a full boot that failed on a missing database would prove nothing at all.

**Rejected.**

- Booting the real `AppModule` — the literal reading of D-012, and the strongest
  possible evidence if it ran. Rejected because it requires the full infrastructure to
  stand up inside a unit-test run, has no precedent in this repo to copy, and would
  couple this feature's verification to the health of every unrelated module.
- Booting the minimal module only, and trusting the registration — this is exactly the
  failure D-012 was written about: every AC would report green while the deployed app
  returned 500 for every endpoint, because nothing checked that `AppModule` lists the
  provider.
- Asserting `AppModule`'s metadata only, without booting — D-012 already rejected this:
  it proves the provider is declared, not that Nest selects the filter for a real
  request.

**Constrains implementation.** Write the spec in `apps/api`. Boot a throwaway testing
module containing a test controller and the `APP_FILTER` provider, call `listen(0)`,
read the port from `getHttpServer().address()`, drive it with global `fetch`, and close
the app in `afterAll` — the shape `editionHeader.integration.spec.ts` already uses. Add
no new package to `package.json`. Assert status, `message` and `reason` for each mapped
kind. Then assert separately that `AppModule` declares the `APP_FILTER` provider for
`DomainExceptionFilter`. If importing `AppModule` into the spec proves infeasible —
because module-load side effects require infrastructure — that is a `blocked`, not a
reason to drop the assertion silently.

---

## D-018 — node-utils' own Jest gets decorator parsing and nothing else

- status: `active`
- user-visible: `no`
- decided: `2026-09-13`
- supersedes: —
- superseded-by: —
- relates to: `D-003`, `D-004`, `AC-1`..`AC-5`

**Decision.** `packages/node-utils/jest.config.ts` switches from `swcTransform` to
`swcTransformWithDecoratorsOnly`. Not to `swcTransformWithDecorators`, and the filter's
unit spec stays colocated with the filter.

**Reasoning.** D-004 reasoned about two transforms and missed a third. It covered what
*consuming* packages' Jest does with node-utils source, and what `nx build node-utils`
does via `.swcrc`. It did not cover node-utils' **own** Jest, which uses `swcTransform`
with explicit options — and `@swc/jest` ignores `.swcrc` entirely when given explicit
options. So the package that owns the filter is the one package that cannot parse it,
and `@Catch()` fails with `Expression expected` in node-utils' own suite while the build
and every consumer are fine.

The choice of *which* decorator transform is the whole decision, and the two available
ones are not interchangeable:

| transform | decorators | `useDefineForClassFields` |
|---|---|---|
| `swcTransform` (today) | off | unset — defaults to true |
| `swcTransformWithDecoratorsOnly` | on | unset — defaults to true |
| `swcTransformWithDecorators` | on | **false** |

`swcTransformWithDecorators` would flip class-field semantics for all 31 suites in the
package — the exact axis D-003 measured, where the same source yields `kind === undefined`
under one setting and the right value under the other. Changing it to make one file parse
would silently alter how every class in node-utils compiles under test, including the
five access-error classes whose `kind` this feature depends on. That the suite happens to
pass today is not reassurance; D-003's whole point is that this failure is invisible in
the package that introduces it.

`swcTransformWithDecoratorsOnly` adds decorator parsing and changes nothing else, so the
class-field semantics of every existing node-utils suite stay bit-for-bit what they are
now. It is the smallest change that unblocks the file.

**Rejected.**

- `swcTransformWithDecorators` — what the blocked unit had verified green across all 31
  suites and 501 tests. Rejected because green is not the property at issue: it sets
  `useDefineForClassFields: false` across the package, which is precisely the setting
  D-003 identified as producing silently different runtime values for class fields. Using
  it here would undermine D-003 in the very package D-003 was written to protect.
- Moving the filter's unit spec to `apps/api`, which already parses decorators, and
  changing no transform at all — genuinely tempting, and the minimal-config option. It
  also mirrors D-004's own instinct that removing the reason beats guarding the symptom.
  Rejected because it puts a unit spec in a different project from its subject, and it
  makes every future decorator-bearing file in `src/nest/` untestable from its own
  package — a standing tax to avoid a one-word config change.
- Leaving node-utils' Jest alone and testing the filter only through the booted-app
  integration spec — D-012 explicitly wants unit specs for the mapping alongside the
  booted test, because the integration spec proves installation and would be a poor place
  to enumerate every kind.

**Constrains implementation.** In `packages/node-utils/jest.config.ts`, replace the
import and use of `swcTransform` with `swcTransformWithDecoratorsOnly` from
`jest-utils.ts`. Change nothing else in that file — not `moduleNameMapper`, not the
preset, not `testEnvironment`. Do not use `swcTransformWithDecorators`. Do not edit
`jest-utils.ts` itself.
