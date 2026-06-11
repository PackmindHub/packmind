# Packmind Engineer Review Checklist

The checks human Packmind engineers raise in review, distilled from months of real issue comments. Each
entry is: **the concern**, **the signal** (how to spot it in a diff by reading code — this is what you
actually do), and a **real example** (paraphrased from past reviews). Apply the **Cross-cutting** section
to every review; apply a layer section only when the diff touches that layer.

These are heuristics, not laws. The goal is to point a reviewer's attention where it pays off — not to fire
on every match. A signal that matches is a prompt to look, not a finding by itself; confirm against the code
before reporting, and pose design judgments as questions.

## Table of contents

- [Cross-cutting](#cross-cutting) — applies to every diff
- [Domain / packages](#domain--packages) — hexagonal core
- [API](#api) — NestJS controllers
- [Frontend](#frontend)
- [CLI](#cli)
- [Tests & infra](#tests--infra)
- [Reviewer voice](#reviewer-voice) — tone and verdict conventions

---

## Cross-cutting

### X1. Does it actually do what the issue asked?

**Concern**: The implementation drifts from the issue/EM/PRD — a stated scenario isn't handled, a closed set
of values doesn't match, or the code does something the issue never mentioned.
**Signal**: List the concrete behaviors the issue describes (rules, examples, "Check also" bullets). For each,
find the implementing code in the diff. Flag any with no implementation. Conversely, flag diff behavior the
issue never asked for. For PRDs with a closed set, verify the code's enum/switch matches exactly.
**Example**: "verify the shipped status set matches the PRD's closed set (`Connected` / `Token expired` /
`Unreachable`)" (#598). "The EM does not mention `SpaceDeletedEvent` but the code does." (#425)

### X2. Cleared/empty values not propagated

**Concern**: A write is guarded by truthiness, so emptying a field never clears it downstream — the old value
sticks.
**Signal**: Look for `if (value) { write(value) }` where an empty/`undefined` value should also be written to
clear the target. Common around descriptions, names, optional settings.
**Example**: "if the plugin description is cleared in Packmind, the existing one in the .json file is not
removed as well … only rewritten when `pluginDescription` is truthy AND differs." (#532)

### X3. Duplicated logic / mapping (drift risk)

**Concern**: The same function or literal map is copy-pasted across files; they'll diverge.
**Signal**: grep the diff for new helper functions or literal maps (vendor→icon, `normalizePath`,
`parsePackageSlug`, `capitalize`, `resolveUrlBuilder`) and check whether an identical one already exists
elsewhere. Recommend extracting to a shared util.
**Example**: "Duplicated vendor→icon mapping across VendorMark and ConnectionsEmptyState (drift risk)" (#602);
"there are at least 3 separate normalizePath functions" (#346).

### X4. Vocabulary / naming drift

**Concern**: A concept was renamed but stale terms linger in copy or identifiers; or a single file mixes
casing conventions.
**Signal**: After any rename, grep for the old term across copy and code. Compare new identifiers against the
dominant casing in the same file.
**Example**: "should not we replace `provider` by `connection`?" (#602); "We use camelCase everywhere in this
file, is there a reason it's different here?" (#578).

### X5. Dead code / obsolete comments / JSDoc

**Concern**: Unreachable branches, comments or JSDoc that no longer match behavior.
**Signal**: For switch cases / branches added or touched, check reachability. Read comments and JSDoc near
changed code and verify they still describe what the code does.
**Example**: "It's actually dead code. The case you describe is the 'unknown' one." (#598); "Jsdoc of
`ISpacesManagementPort` on line 74 is obsolete." (#439).

### X6. Confirmation before destructive actions

**Concern**: A delete/irreversible action runs with no confirmation step.
**Signal**: For each destructive handler/button in the diff, verify a confirmation modal or typed-name guard
precedes execution.
**Example**: "Ask user confirmation before running the deletion" (#532).

### X7. Feature-flag cleanup after rollout

**Concern**: A flag is left in place after the feature ships.
**Signal**: If the issue marks a feature as fully shipped, grep for the flag key — gating code and the flag
definition should be gone.
**Example**: "When all above is done, remove the FF." (#439).

### X8. Redundant work / avoidable round-trip

**Concern**: A second fetch for data already in hand, or a slow call with no timeout on a hot path.
**Signal**: Look for a fetch immediately followed by another fetch for data the first already returned. Flag
network calls on interactive paths with no timeout.
**Example**: "Is it necessary to make a second API call? `resolvePackage` … then `getPackageBySlug`" (#333);
"`whoami` takes a few seconds … force a shorter timeout?" (#498).

---

## Domain / packages

The hexagonal core. These are the most frequent and highest-signal architecture checks.

### D1. Use case extends the correct Abstract base class

**Concern**: A use case extends a generic base (`AbstractMemberUseCase`) when the operation is space- or
admin-scoped and should extend `AbstractSpaceMemberUseCase` / `AbstractAdminUseCase` / `AbstractSpaceAdminUseCase`.
Extending too broad a base silently weakens access control.
**Signal**: grep the diff for `extends Abstract\w*UseCase`. For each, ask: does the operation act on a space's
data (has `spaceId`)? Is it admin-only? Match the base class to the real scope and to the issue's stated
permissions. A use case that reads `command.spaceId` but extends a non-space base is the classic tell.
**Example**: "`PinSpaceUseCase` / `UnpinSpaceUseCase` should extend `AbstractSpaceMemberUseCase`" (#443);
"`LeaveSpaceUseCase` should extend `SpaceMemberUseCase` instead of `AbstractMemberUseCase`" (#430);
"`CheckProviderAuthUseCase extends AbstractMemberUseCase` — should this be restricted to Admin?" (#598).

### D2. Command extends the correct base

**Concern**: A `*Command` type extends `PackmindCommand` when it should extend a scoped command
(`SpaceMemberCommand`), so the scoping field isn't enforced at the type level.
**Signal**: grep for `Command = PackmindCommand &`. If its paired use case is space-scoped (see D1), the
command should extend `SpaceMemberCommand`.
**Example**: "`PinSpaceCommand` / `UnpinSpaceCommand` should extend `SpaceMemberCommand`, not
`PackmindCommand`" (#443).

### D3. Adapter doesn't carry business / scoping logic

**Concern**: An adapter calls a repository directly and does scoping checks inline (e.g. comparing
`organizationId`), instead of delegating to a dedicated use case. Contract types sometimes live in the wrong
file too.
**Signal**: In adapter files, look for `this.\w*Repository.find...` followed by manual
`if (row.organizationId !== command.organizationId)` checks. Scoping belongs in a use case.
**Example**: "the main issue may come from `DeploymentAdapter.ts` that directly calls the repo … Should not it
be a dedicated use case?" (#580).

### D4. Access/permission verification before space-scoped operations

**Concern**: A use case operates on space-scoped data without first verifying the caller belongs to that
space/package.
**Signal**: For each use case touching space-scoped entities, confirm a membership/access check precedes the
data operation (either via the base class or an explicit guard).
**Example**: "PullContentUseCase: verify user belongs to the package's space before pulling /
NotifyDistributionUseCase: verify user belongs to the distribution's space" (#418, #410).

### D5. Multi-tenancy / org scoping safety

**Concern**: A uniqueness or collision check is keyed on too few discriminators (e.g. `(owner, repo)` within an
org, missing `gitProviderId`), so distinct resources collide.
**Signal**: Inspect `find*` / uniqueness lookups for the full discriminator set. `findX(orgId, owner, repo)`
without provider scoping is a red flag. Also check that name/slug uniqueness is verified before create.
**Example**: "include the `gitProviderId` to avoid collision of owner/repo within an orga" (#541); "should
`SpaceService` verify uniqueness of space↔orga before creating?" (#339).

### D6. Analytics events have a subscriber

**Concern**: Domain events are emitted but no Amplitude/analytics subscriber listens — analytics silently
dropped. This is one of the most repeated findings.
**Signal**: grep the diff for `new \w+Event(`. For each event, confirm (a) it's actually emitted somewhere
(a defined-but-never-emitted event is dead code too), and (b) a matching subscriber/handler exists in the
Amplitude layer (look for `emitAmplitudeEvent('...')` or the subscription registration). An emitted event with
no subscriber = dead analytics. **Before pinning the gap on the new event, check a sibling event in the same
domain**: if `SpaceCreatedEvent` also has no subscriber, you've found a domain-wide pattern (or an intentional
convention), not a defect unique to this PR — report it that way so the author isn't sent chasing a
non-issue.
**Example**: "PluginPublishAttemptedEvent, PluginPublishedEvent … are emitted but don't seem to be listened by
Amplitude" (#580); "`SpacePinnedEvent` / `SpaceUnpinnedEvent` have no subscribers" (#443); "`space_created`
event is not tracked" (#339).

### D7. Event payload fields are relevant and non-redundant

**Concern**: An event payload carries fields duplicated elsewhere (e.g. `actor_id` when `userId` is already
present) or with no analytical purpose.
**Signal**: Review payload-mapping callbacks for fields duplicated from the event object.
**Example**: "is `actor_id` relevant here? userId is already included in the payload" (#578).

### D8. Domain errors exist for failure cases

**Concern**: A failure path throws a generic error (or none) instead of a named domain error the API layer can
map to a meaningful status. (Pairs with B1 in the API section.)
**Signal**: For each new failure condition in a use case/service, check there's a typed domain error
(`XxxNotFoundError`, `XxxValidationError`) rather than a bare `Error`/`throw`.

---

## API

### B1. Controller maps domain errors → proper HTTP status

**Concern**: A controller doesn't catch a domain error a use case can throw, so it surfaces as an ugly 500
instead of 404/400/409/422. Very common, high impact.
**Signal**: For each use case called by a changed controller, list the domain errors it can `throw`. In the
controller, confirm each is caught and re-thrown as the right Nest exception
(`if (e instanceof SpaceNotFoundError) throw new NotFoundException(e.message)`). Any unmapped domain error =
latent 500. Also watch UUID-parse paths that 500 on a slug input.
**Example**: "SpaceNotFoundError should be handled … otherwise we'll get some kind of ugly 500 error" (#443);
"SkillValidationError surfaces as HTTP 500 … should be 400" (#469); "500 when artifact id is a slug" (#534).

### B2. Endpoint authorization matches intent

**Concern**: A mutating endpoint isn't guarded to the right role; backend may reject but the question of "who
is allowed?" wasn't settled.
**Signal**: For each new/changed endpoint, check the guard/role against the issue's stated permissions. Ask
explicitly "who can call this?" for every new mutation.
**Example**: "Should this use case be restricted to Admin and not to any org member?" (#598).

### B3. Request body DTO carries every command field

**Concern**: The controller's body class omits a field the use case needs, so the field silently never reaches
the backend even though the command type declares it.
**Signal**: Trace each command field: frontend gateway body → controller `class XxxBody` → use case. A field
present in the command type but absent from the body DTO is dropped on the wire.
**Example**: "in `playbook.controller.ts`, `directUpdate` is missing from the body" (#377).

### B4. Route carries the scoping segment

**Concern**: A space-scoped endpoint passes the scope as a query param while sibling routes use a path segment
— inconsistent and easy to forget.
**Signal**: Compare the new route shape against sibling space-scoped routes.
**Example**: "Should `.../deployments/standards/overview?spaceId=…` use the space as a segment of the route?"
(#410).

---

## Frontend

### F1. Route guard, not just backend rejection

**Concern**: A non-privileged user can navigate (often by direct URL) to an admin/owner-only page. The backend
rejects the action, but the page should never have rendered.
**Signal**: For each admin/owner-only action, verify a frontend route guard exists — not only a backend 403.
Mentally visit the route as a plain member.
**Example**: "As a regular member I could browse to .../marketplaces. We should not, despite backend rejecting"
(#541); "As a regular space member, I can browse to space settings with a direct URL" (#425).

### F2. UI reactivity — list/count refresh after a mutation

**Concern**: After create/delete/update, the list or counter doesn't update until a manual reload — a missed
query-cache invalidation. "Works after refresh" is the tell.
**Signal**: For each mutation in the diff, verify the relevant TanStack-Query keys are invalidated
(`queryClient.invalidateQueries`) for every list/count that should reflect it.
**Example**: "After deleting a space, the number of spaces is not refreshed … same when adding" (#474); "the
list of users is not refreshed after adding a new user" (#476). _(needs confirmation — verify at runtime.)_

### F3. Sort / filter correctness

**Concern**: Sorting doesn't work, breaks when a second sort is applied, or lists aren't alphabetized where
expected; search/selection retains stale state when a drawer reopens.
**Signal**: Check sort comparators and default ordering against the stated convention (usually alphabetical).
Check that drawer/modal ephemeral state resets on reopen.
**Example**: "Sort by collaborators does not work" (#476); "Packages should be sorted alphabetically" (#523);
"close the spaces Drawer and reopen — I'd expect the search bar to reset" (#421).

### F4. Layout — collapse, scroll, overflow

**Concern**: Collapsing the sidebar breaks layout/scroll/footer; long names overflow; collapsed state doesn't
persist on refresh.
**Signal**: For layout components in the diff, check overflow handling and long-string rendering (truncation/
ellipsis). Flex chains: `flex={1}` + `minH={0}` for scroll areas, `flexShrink={0}` for pinned footers.
**Example**: "Sidebar collapsed is broken" (#443); "Sidebar of spaces is not scrollable" (#403); "With a long
name, name title overflows" (#597). _(needs confirmation — verify at runtime.)_

### F5. Stale active/highlight state after navigation

**Concern**: The wrong nav item stays highlighted, or the wrong space is reselected, after navigating.
**Signal**: Check active-state logic tracks the actual route; check lists don't re-order unexpectedly after an
edit.
**Example**: "When navigating to another space, the entry matching our current space is highlighted …
'Dashboard' should not be highlighted" (#339).

### F6. Form validation — disable submit on invalid/empty, Enter to submit

**Concern**: Submitting an empty/invalid form "succeeds" with a success message; or a confirmation form can't
be submitted with Enter.
**Signal**: For each form, check the submit control is disabled when the form is empty/invalid, that backend
validates too, and that typed-name/confirmation forms accept Enter.
**Example**: "empty name for a space → 'Space updated'. Button should be disabled if the form is empty" (#439);
"I can't validate with the 'enter' key" (#430).

### F7. Locale / i18n

**Concern**: Dates rendered in en-GB ("20 Nov 2025") when en-US ("Nov 20, 2025") is the standard, or a locale
hardcoded.
**Signal**: grep for `toLocaleDateString`, `'en-GB'`, hardcoded locale strings.
**Example**: "`20 Nov 2025` is en-GB; we should favor en-US … it seems en-GB is hardcoded" (#474).

### F8. Gateway sends every command field

**Concern**: The frontend gateway body omits a command field, so it never reaches the API. (Mirror of B3 on the
frontend side.)
**Signal**: In gateway files, compare the `body: {...}` against the command type's fields.
**Example**: "in `ChangeProposalGateway.ts`, it seems we don't send `command.directUpdate`" (#377).

### F9. UX copy

**Concern**: User-facing strings that leak internals or read badly: raw UUIDs in errors, generic/unhelpful
errors, technical-sounding or alarming toasts, copy not adapted to a variant, confusing labels.
**Signal**: Read every changed toast/label/error/blank-state string from a non-technical user's POV. Flag:
interpolated `${...Id}`/UUIDs; messages too generic to act on; jargon ("space pinned", "Pending distribution");
shared copy that doesn't fit each branch; labels that differ from the identifier the user must type. Consider
the `ux-microcopy` skill for rewrites.
**Example**: "the error message should not display some uuid" (#541); "'Pending distribution' could let one
think it's ongoing in background" (#479); "this message is a bit concerning as a user" (#439).

### F10. Async feedback — pending, completion, double-click, toast duration

**Concern**: Long async work shows only an ACK; no "in progress" or completion state; re-clicking yields a
silent NO-OP or error; important toasts vanish too fast; background-job failures (e.g. 403) never surface in
the UI.
**Signal**: For each async/queued action, check for a pending state, a completion notification, a disabled-
while-pending button (or a clear "already done / nothing changed" on repeat), toast duration vs message length,
and that job errors propagate to a toast — not only logs.
**Example**: "we don't have any feedback in the UI, so as a user I think it didn't work" (#479); "notify users
when BG job is completed? We only have the ACK" (#580); "if you click 4 times, you get a NO-OP" (#580).
_(several of these need runtime confirmation.)_

### F11. Accessibility — not color/icon-only

**Concern**: Information conveyed only by icon or color, with no text fallback.
**Signal**: For status pills, vendor marks, icon-only indicators, verify an accompanying text label.
**Example**: "vendor name is also rendered as text so the cue is not colour/icon-only (accessibility)" (#602).

---

## CLI

### C1. Deprecated command has an alias + migration hint

**Concern**: A removed/renamed command has no backward-compatible alias and its error gives no migration path.
**Signal**: For each removed/renamed command, verify a deprecation alias and a migration hint in the error.
**Example**: "Deprecated command without migration alias … `standards create` … no backward-compatible alias"
(#446); "`skills add` should be marked `[Deprecated]`" (#377).

### C2. Errors guide the user

**Concern**: An error doesn't suggest the correct syntax, list valid options, or show an example; suggested
corrections are wrong.
**Signal**: For each error path, confirm it lists valid options / shows a concrete example / points to the
right command.
**Example**: "`packmind-cli list standards` → 'Did you mean lint?' is unhelpful" (#446); "packages list --space
error lacks a hint about available spaces" (#333); "maybe show an example instead?" (#362).

### C3. Deterministic output ordering

**Concern**: A generated file (`packmind-lock.json`, `AGENTS.md`, `marketplace.json`) re-orders entries on each
write, producing meaningless diff churn.
**Signal**: For code that serializes collections to a tracked file, confirm a stable sort before writing.
**Example**: "the order of artefacts in packmind-lock.json is not deterministic … it creates noise" (#498).

### C4. Name/slug derivation strips known suffixes

**Concern**: The CLI derives an artifact name from the filename without stripping suffixes like `.draft`, which
then leak into the name/slug.
**Signal**: Check name/slug derivation from filenames for suffix stripping.
**Example**: "Artifact created as `Create builtin tool.draft` (slug `create-builtin-tooldraft`)" (#446).

### C5. Consistent error formatting & identifiers

**Concern**: CLI messages mix quote styles, inconsistently prefix `packmind-cli`, or display a space/identifier
in a format different from what users type (`@space/pkg`).
**Signal**: Collect changed CLI strings and diff their formatting; the user-facing identifier format should
match input format.
**Example**: "Quote style inconsistency"; "Should consistently use @global since that's the format users type"
(#333).

### C6. Behavior parity between sibling handlers

**Concern**: Handlers that should behave identically diverge (cwd handling, client- vs server-side filtering,
skill detection, validation rules across `add` vs `submit`).
**Signal**: When several handlers share a responsibility, diff their implementations for divergence.
**Example**: "mismatch with `addHandler`/`rmHandler` and `unstageHandler` regarding `getCwd`" (#331);
"listPackagesHandler filters client-side unlike the others" (#336); name-collision blocked on `add` but not
`submit` (#362).

### C7. Cross-platform safety

**Concern**: Flows that assume a Unix editor (`vi`), Unix paths, or a TTY break on Windows or in CI/agent
contexts.
**Signal**: grep for hardcoded editor invocations, manual path splitting/joining (use shared `normalizePath`),
and editor-opening commands lacking a non-interactive (`-m`) fallback.
**Example**: "`vi` is clearly not suitable for windows" (#498); "`playbook submit` opens Vim in a
non-interactive terminal, then aborts … unusable in CI/agent contexts" (#446); "a local `normalizePath` …
makes it windows-incompatible" (#331).

### C8. Scope is never silently defaulted

**Concern**: A command silently picks a default scope (`global`) instead of prompting/erroring when ambiguous.
**Signal**: grep for hardcoded `'global'` / default-scope fallbacks. Ambiguous cases should prompt or error.
**Example**: "By default it used 'global' and submitted a creation … It should have asked me the target space"
(#362); "global is hardcoded in createCommandHandler.ts" (#336).

### C9. Summary/count output is present and correct across variants

**Concern**: A summary line ("✅ Synced N standards…") is omitted in some install paths, or counts compute
before a path remap and stay 0.
**Signal**: Compare summary output across install variants (home dir vs repo root); confirm counts are computed
after any path remapping.
**Example**: "shouldn't we have '✅ Synced N standards…'? When installing in a non-.claude dir we have it"
(#522).

### C10. Idempotency messaging

**Concern**: Re-running an applied command silently repeats or errors instead of reporting the no-op.
**Signal**: Run idempotent commands twice in your head; the second run should say "already staged/done".
**Example**: "running the same `rm` multiple times should say 'XXX is already staged for removal'" (#342).

---

## Tests & infra

### T1. Tests assert the real contract, not a mock-shaped body

**Concern**: A controller test sends a body shape that doesn't match the real command/DTO; it passes only
because the service is mocked, validating nothing.
**Signal**: Compare test request bodies against the real command/DTO type. A mismatch hidden by a full mock is
a false-green test.
**Example**: "the test passes `{ standardIds, skillIds }` but the command expects `{ artifacts }` … because the
service is mocked, the test passes silently but doesn't validate the contract" (#352).

### T2. Required tests from the spec are present

**Concern**: e2e/unit tests the issue or MIRO board called for weren't added.
**Signal**: Cross-check the issue's stated test scenarios against added `*.spec.ts` files in the diff.
**Example**: "no e2e tests in apps/cli-e2e-tests for the 4 scenarios here" (#330); "let's not forget the two
e2e tests stated in MIRO" (#352).

### T3. Types match the contract (no narrowing that hides a field)

**Concern**: An adapter/DTO/response type omits a field the port/command declares; it compiles and works today
by accident, but invites a future drop.
**Signal**: Compare adapter/DTO field sets against the port/command type and the actual runtime payload. A
narrower type than the contract is a latent bug. Also watch predicate/variable names that don't match their
collection type (copy-paste tell).
**Example**: "the adapter annotates `fields` as `{ name?, type? }` … hides `color` and can make future
refactors drop it" (#439); "skills are missing from `GetPackageSummaryResponse`" (#333).

### T4. Infra reproducibility & tracking hygiene

**Concern**: An upgrade drops a Dockerfile digest pin (loses reproducibility); or `.gitignore` shadows files
the PR tracks.
**Signal**: In infra/upgrade diffs, verify SHA256 digest pins are preserved on `FROM` lines, and that
`.gitignore` additions don't cover generated files the same PR commits.
**Example**: "Dockerfile SHA256 digest pin removed … loses image-substitution protection" (#413); "`.gitignore`
adds .gitlab/ while the PR adds 35+ files under .gitlab/duo/skills/" (#413).

### T5. Migrations are reversible and scoped

**Concern**: A schema change lacks a working `down`, or isn't consistent with the repo's migration helpers.
**Signal**: For new migrations, confirm `up`/`down` symmetry and use of the shared logging/helper patterns
(see the `how-to-write-typeorm-migrations-in-packmind` skill).

---

## Reviewer voice

Match how the team writes findings — it makes the report land as a peer review, not a robotic audit.

- **Verdicts**: `QC ✅` (clean), `LGTM otherwise ✅` (approve with minor caveats), `<N> findings` (work needed).
  A clean review should read clean — don't hedge it into sounding alarming.
- **Checkboxes**: report findings as `- [ ]` so the team can tick them off (`- [x]`) as they resolve.
- **Non-blocking framing**: prefix optional items "Not blocking but…". Distinguish a _defect_ from a
  _cleanup/consistency opportunity_ ("Not a bug, but…").
- **Questions over assertions** for design calls: "Should not we…?", "WDYT?", "Is this the expected behavior?",
  "don't you think?". Hedge when you're inferring intent.
- **Be honest about confidence**: anything depending on runtime behavior (cache invalidation, swallowed job
  errors, layout, toast timing) is _needs confirmation_ — say so and say how to verify. The team's norm is
  "But you should confirm first it's an issue :)".
- **Cite evidence**: every finding points at a real `file:line` from the diff. No file:line, no finding.
- **Ignore bot noise**: `@coderabbitai` plans and enrichment blocks are not part of the review.
- **Don't re-report automated checks**: lint/type/test/build failures are out of scope — this layer is the one
  CI can't see.
