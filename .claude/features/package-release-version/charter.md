# Feature: Release a numbered version of a package

- slug: `package-release-version` — the directory name under `.claude/features/`
- status: `framing`
- opened: `2026-09-14`

Frames [PackmindHub/packmind-proprietary#845](https://github.com/PackmindHub/packmind-proprietary/issues/845),
itself the output of an Example Mapping workshop. The issue is the source of every
acceptance criterion below; where this charter and the issue disagree, this charter
wins, and `Out of scope` says what was added to the issue's own non-goals.

The issue lives in the proprietary repository; the work lands here, on OSS, because
that is where `packages/deployments`, `packages/types` and `apps/frontend` live and
because proprietary picks OSS up by merge, not the other way round.

## Problem

A package is a curated set of components — commands, standards and skills — that a
space distributes to repositories. `Package` (`packages/types/src/deployments/Package.ts`)
holds `recipes: CommandId[]`, `standards: StandardId[]` and `skills: SkillId[]`: id
arrays, no versions. It is a pointer to whatever those components happen to be right
now, and it has no name for any state it has ever been in.

The machinery for pinning versions already exists, one layer down and for a different
purpose. `DistributedPackage` snapshots `standardVersions`, `recipeVersions` and
`skillVersions` at the moment a package lands on a target, and the drift readers built
on top of it — `buildPackageDriftOverview`, `componentLateness`, `PackageReachStrip` —
tell an owner how far each landing has fallen behind. So the app can already answer
"is this repository up to date with the package?". What nobody can ask is "up to date
with *what*?": the only answer available is "with the package as it stands this
second", which changes every time anyone publishes a component version.

That is the half-truth in Packmind's promise. A tech lead is supposed to be able to
say who is on which version of the playbook; today there is no version to be on. There
is nothing to communicate ("we're shipping 0.3.0 of the frontend package"), nothing to
compare two repositories against except a moving target, and no way to state that the
content a package distributes is itself behind — only that a *destination* is behind.
An owner curating a package has no moment where they say "this set, this shape, ship
it", and no record afterwards that the moment happened.

## In scope

- **A release: a named, immutable snapshot of one package.** It carries an `X.Y.Z`
  version, and pins the version of every component the package holds at the moment it
  is cut, plus the package's own title and description. Once written, nothing changes
  it — not publishing a newer component version, not renaming the package, not deleting
  a component.
- **Persistence for releases**, including whatever is needed for a release to stay
  browsable after a component it pins has been deleted. The three pinned-version types
  (`CommandVersion`, `StandardVersion`, `SkillVersion`) and the existing junction-table
  idiom of `packages/deployments/src/infra/schemas/` are the starting point, not the
  answer.
- **A change gate**: given a package and its last release, whether anything has changed
  since. Three inputs, one verdict — component versions, package details (title,
  description), component list — plus one veto: an empty package can never be released.
  The gate's answer and its *reason* are both read by the UI, because the disabled
  action has to say why.
- **Version validation**: `X.Y.Z` only, strictly greater than the current version, and
  one of the three next increments (patch, minor, major). Enforced server-side
  regardless of what the form offers.
- **The release flow in the app**, on the package detail surface
  (`apps/frontend/src/domain/deployments/components/context/`): a version area stating
  the current version or "Not released yet", a "Create a release" action that is
  enabled or disabled with its reason, and a form pre-filled with the suggested next
  version that keeps invalid input for correction rather than discarding it.
- **Browsing a released version**: its version list, and what each version pins.
- **A "released content is behind" signal on the package**, distinct from the existing
  destination drift: 0.1.0 pins "Work with Jest" v4 and v5 exists.
- **No permission check.** Any member of the organization can release — stated as
  scope, because "who may cut a release" is exactly the question a subagent would
  otherwise invent an answer to.
- **Coverage on non-skill components.** Every example in the issue uses a skill; the
  rules speak of components. A command and a standard must appear in the tests.
- **CHANGELOG under `Unreleased`, and end-user documentation under `apps/doc/`** — the
  flow is user-facing.
- **End-to-end coverage under `apps/e2e-tests/`**, added on 2026-09-16 by D-048 after S2
  closed. Every criterion above is verified either side of the HTTP boundary and none
  across it, and D-042 is a real defect living in exactly that gap. Playwright only;
  `apps/cli-e2e-tests/` stays out, because releasing from the CLI remains a non-goal.

## Out of scope

Non-goals, stated so the orchestrator can recognise one. A unit that needs something on
this list is not a design question — it is rung 4 of the escalation ladder, and halts
to the human.

From the issue:

- **Releasing from the CLI.** No file under `apps/cli` is touched. A sibling story.
- **A deleted *package* and its released versions.** Split into its own story on
  2026-09-11. Deleted **components** inside a live package's release are in scope; a
  soft-deleted package is not.
- **Choosing an intermediary version of a component.** A release always pins the latest
  version of each. There is no "release 0.2.0 with Jest v12 while v16 exists".
- **The consumer side.** Installing, pinning, or distributing a *specific released
  version* is not here. The workshop produced no example for it.

Added here, because they are the nearest plausible things and none of them is asked
for:

- **Distribution and drift semantics do not change.** `PublishPackagesUseCase`,
  `InstallPackagesUseCase`, `DistributedPackage` and every drift selector keep
  distributing and comparing exactly what they do today: the package's current content.
  A release is written alongside them and read by nobody but the release UI. Any unit
  that finds itself editing a drift selector to teach it about releases has left scope.
- **Marketplace and plugin publishing are untouched.** `renderPackageAsPlugin`,
  `isPackagePublishableAsPlugin` and the marketplace tables do not learn about versions.
- **No release notes, no per-release description, no git tag, no CHANGELOG generation.**
  A release has a number, not prose.
- **No deleting, yanking, editing or re-cutting a release.** Immutable includes
  "no undo". A mistaken 0.2.0 is followed by 0.2.1.
- **No pre-release or build-metadata versions.** `1.2.0-beta-2` is refused; that is a
  criterion, and widening to semver's full grammar later is a different decision.
- **No automatic release.** Nothing cuts a release on publish, on merge, or on a
  schedule. It is a deliberate act by a person.
- **No notification of any kind on release** — no email, no webhook, no in-app alert.

## Acceptance criteria

Each AC is **one user-observable behaviour**, and becomes at least one named test.

AC-1 to AC-11 are about the gate and the form and are observable in the frontend
against a stubbed API; AC-12 to AC-19 are about what the backend writes and refuses,
and are observable at the use-case or HTTP boundary. AC-20 is the concurrent cut, and
AC-21's whole content is that the others do not secretly assume a skill.

AC-22 to AC-25 were added on 2026-09-16 by D-048 and are different in kind from all of
the above: they are the only ones observable **across** the HTTP boundary, in a browser
against a running API and database. Everything before them is verified on one side of
that boundary or the other, which is why a defect sitting in the seam (D-042) survived
nineteen units with every criterion met.

| id | criterion | user-visible | verified by |
|----|-----------|--------------|-------------|
| AC-1 | A package that has never been released shows "Not released yet" and a "Create a release" action | yes | `nx test frontend --testNamePattern='PackageVersionArea'` — "never released" and "never released does not render the sentinel"; `nx test frontend --testNamePattern='ContextPackagePane'` — "renders the version area in the header", which proves the pane actually mounts it |
| AC-2 | A package with no components shows the action disabled with "Add at least one component" | yes | `nx test frontend --testNamePattern='PackageVersionArea'` — "empty package", for the sentence and the disabled action; `nx test deployments --testNamePattern='packageReleaseGate'` — "returns no_components when package has never been released", for the rule |
| AC-3 | A released package identical to its last release shows the action disabled with "Nothing has changed since 0.1.0" | yes | `nx test frontend --testNamePattern='PackageVersionArea'` — "unchanged since the last release"; `nx test deployments --testNamePattern='packageReleaseGate'` — "returns no_change when package is identical to its latest release" |
| AC-4 | A released package one of whose pinned components has a newer version shows it is behind on that component — v4 pinned, v5 available — and offers a release | yes | `nx test frontend --testNamePattern='PackageVersionArea'` — "behind on a component", which asserts the name, v4 and v5 together and the action still enabled; `nx test deployments --testNamePattern='packageReleaseGate'` — "returns ready when a pinned component has a newer version available" |
| AC-5 | Renaming a released package enables the action; renaming it back disables it again | yes | `nx test deployments --testNamePattern='packageReleaseGate'` — "returns ready when package name changed" for the rename, and "returns no_change when package is identical to its latest release" for renaming it back: the gate is stateless (D-006), so "renamed back" **is** the identical state and there is no other state for it to be in; `nx test frontend --testNamePattern='PackageVersionArea'` — "never released" and "unchanged since the last release" for enabled-on-`ready` and disabled-on-`no_change` |
| AC-6 | Editing the description of a released package enables the action | yes | `nx test deployments --testNamePattern='packageReleaseGate'` — "returns ready when package description changed"; the descriptions-differ-only-by-case leaf case records D-008's deliberate asymmetry with the name; `nx test frontend --testNamePattern='PackageVersionArea'` — "unchanged since the last release" for the disabled pole |
| AC-7 | A title edit that differs from the released title only by surrounding whitespace, or only by case, leaves the action disabled | yes | `nx test deployments --testNamePattern='packageReleaseGate'` — "returns no_change when the name differs only by surrounding whitespace" and "returns no_change when the name differs only by case", both driving the package through `evaluatePackageReleaseGate`. These are the two cases D-043 reserved this column for and D-046 records why: the `packageNameMatches` leaf cases were green all along and the **composition** was untested; `nx test frontend --testNamePattern='PackageVersionArea'` — "unchanged since the last release" |
| AC-8 | Adding a component enables the action, removing one enables it, and adding then removing the same one leaves it disabled | yes | `nx test deployments --testNamePattern='packageReleaseGate'` — "returns ready when a component is added" and "… is removed", both driven through the **recipe** family (AC-21), and "returns no_change when a component is added and then removed". The third clause is proven by set-equality of the resulting state (D-008), **not** by driving a sequence — a stateless gate (D-006) cannot be asked anything else; `nx test frontend --testNamePattern='PackageVersionArea'` |
| AC-9 | Removing the last component leaves the action disabled with "Add at least one component", not with a change reason — empty beats changed | yes | `nx test frontend --testNamePattern='PackageVersionArea'` — "empty beats changed", which asserts the change sentence is absent; `nx test deployments --testNamePattern='packageReleaseGate'` — "returns no_components when package HAS been released" |
| AC-10 | One change of any kind is enough: a package whose component list is back to identical but whose title differs can be released | yes | `nx test deployments --testNamePattern='packageReleaseGate'` — "returns ready when component list is unchanged but name differs", which is AC-10 verbatim, plus "returns ready when a pinned component has a newer version available" for a second independent source; `nx test frontend --testNamePattern='PackageVersionArea'` |
| AC-11 | The release form offers exactly the three next increments — 0.1.0 offers 0.1.1, 0.2.0 and 1.0.0 — and is pre-filled with the patch one | yes | `nx test frontend --testNamePattern='CreatePackageReleaseDrawer'` — "offers the three next increments", "pre-fills the patch increment" and "pre-fills 0.1.0 for a first release" |
| AC-12 | A submitted version that does not follow X.Y.Z is refused with "Version must follow X.Y.Z", and the form keeps what was typed, so `1,2,3` can be corrected | yes | `nx test frontend --testNamePattern='CreatePackageReleaseDrawer'` — "refuses a malformed version and keeps it", which asserts the field still reads `1,2,3` and the mutation was not called; `nx test deployments --testNamePattern='CreatePackageReleaseUseCase'` — "refuses a malformed version with malformed" for the server-side check |
| AC-13 | A submitted version lower than the current one is refused with "Version must be greater than 1.2.0" | yes | `nx test frontend --testNamePattern='CreatePackageReleaseDrawer'` — "refuses a lower version"; `nx test deployments --testNamePattern='CreatePackageReleaseUseCase'` — "refuses a version that is not greater with not_greater" |
| AC-14 | A submitted version equal to the current one is refused with "Version must be greater than 1.2.0" | yes | `nx test frontend --testNamePattern='CreatePackageReleaseDrawer'` — "refuses the current version"; `nx test deployments --testNamePattern='CreatePackageReleaseUseCase'` — "refuses 0.10.0 as not greater than 0.10.0" |
| AC-15 | A submitted version that is well-formed and greater but not one of the three next increments — 0.5.0 after 0.1.0 — is refused | yes | `nx test frontend --testNamePattern='CreatePackageReleaseDrawer'` — "refuses a greater non-increment"; `nx test deployments --testNamePattern='CreatePackageReleaseUseCase'` — "refuses a greater non-increment version with not_an_increment" |
| AC-16 | A release pins the latest version of each component it holds: releasing 0.2.0 over a 0.1.0 that pinned v4 and v3 records v16 and v45, and the package then lists both versions | yes | `nx test deployments --testNamePattern='CreatePackageReleaseUseCase\|ListPackageReleasesUseCase'` — "pins the latest version of every component it holds" for the pinning, and "lists them newest first by parsed triple" for the listing |
| AC-17 | Publishing a newer version of a pinned component does not change what an existing release pins: 0.1.0 still carries "Work with Jest" v4 | yes | `nx test deployments --testNamePattern='PackageReleaseRepository.*newer version'` |
| AC-18 | A component deleted after a release is still shown, at its pinned version, when browsing that release; a release cut afterwards excludes it | yes | `nx test deployments --testNamePattern='PackageReleaseRepository.*deleted'` — first clause only; the second is a consequence of the package's component list, see D-037 |
| AC-19 | A member of the organization who did not create the package can release it — no ownership or role check refuses them | yes | `nx test deployments --testNamePattern='CreatePackageReleaseUseCase\|GetPackageReleaseUseCase'` — "releases for a member who did not create the package", and "read a release the caller did not create" |
| AC-20 | Two releases of the same version cut concurrently: the first is written and the second is refused because that version already exists | yes | `nx test deployments --testNamePattern='PackageReleaseRepository'` for the constraint itself, `CreatePackageReleaseUseCase` for the 23505 translation — see D-027 on what pg-mem does and does not prove |
| AC-21 | Every rule above holds for a package whose components include a command and a standard, not only skills | no | `nx test deployments --testNamePattern='PackageReleaseRepository\|packageReleaseGate'` — the pinning fixture holds one command, one standard and one skill; the gate's change cases are driven through the **recipe** family. AC-18's block deliberately names only the command and the standard, because `SkillVersionSchema` has no soft-delete columns (D-037). S1 rules only; S2 re-checks its own |
| AC-22 | A user cuts a release in the browser against a real API, and the version it created is then shown as the package's current version | yes | |
| AC-23 | A release cut in the browser pins the package's real components, and browsing that version in the history lists them at the versions it pinned | yes | |
| AC-24 | With nothing changed since the last release, the action is disabled in the running app and states why, naming the version | yes | |
| AC-25 | A version the server refuses reaches the form carrying its reason: the sentence the user sees names the refusal, not a generic failure | yes | |

## Known unknowns

| id | question | resolve by |
|----|----------|-----------|
| UK-1 | What version is offered for a **first** release? The increment rule is defined against a current version, and a never-released package has none. Is it a free X.Y.Z, a fixed 0.1.0, or the three increments over an implied 0.0.0? | design session |
| UK-2 | Do the title's trim and case-folding comparison rules (AC-7) apply to the description too? The issue gives title scenarios only, and justifies them with "the package name is trimmed anyway" — a reason that does not transfer. | design session |
| UK-3 | Where a release lives in the schema, and how a release stays readable after a pinned component is deleted — pinning version **ids** and relying on component versions never being hard-deleted, versus copying the rendered content into the release. This decides AC-18 and most of the migration. | design session |
| UK-4 | Is the gate computed on read (compare package against its last release, every time the pane loads) or maintained as state? AC-3, AC-5, AC-8 and AC-10 all read it, and the reason string is part of the answer. | design session |
| UK-5 | What the "current version" is when releases could ever be non-monotonic, given AC-20's concurrency: greatest release, or last written? | design session |
| UK-6 | The concurrency mechanism for AC-20 — a unique constraint on (package, version) surfacing as a refusal, or an explicit check — and what message reaches the form. | design session |
| UK-7 | Feature flag: name, audience and rollback plan. The issue marks this *(inferred — confirm)*. If flagged, it joins `packages/feature-flags/src/registry.ts` and its `FeatureFlagKey` union. | design session |
| UK-8 | Amplitude: `package_version_released` and `package_release_refused` are asked for, but the analytics provider is imported from `@packmind/proprietary/frontend/domain/amplitude/...` and `packages/amplitude` is empty on OSS. Can these events be emitted from the OSS side at all, and does `package_release_refused` fire on a client-side rejection, a server-side one, or both? | design session, verified empirically |
| UK-9 | Does a release record who cut it and when, and is that shown? Nothing in the issue asks for it, and nothing forbids it. | design session |
| UK-10 | Which surface browses a released version (AC-18) — the existing context package pane with a version selector, a separate route, or a drawer — and where the version area sits relative to `PackageReachStrip` and the existing tabs. | design session |

## Size and sessions

**Empty at framing. Filled at the close of the design session.**

Coarse read: this **is one feature**. Every AC traces to the same sentence — a package
has no state anyone can name — and none of the obvious cuts survives contact. The gate
(AC-2..AC-10) without persistence has nothing to compare against; persistence
(AC-16..AC-18) without the gate can be written but never reached, because the only way
to cut a release is an action the gate enables; the version rules (AC-11..AC-15) are a
property of the release form and refuse against a current version that only persistence
knows. Shipped alone, each is inert.

Expected shape of the work: one migration and one or two new schemas in
`packages/deployments`, new types in `packages/types/src/deployments/`, a small cluster
of use cases (cut a release, read a package's releases, compute the gate), the API
controller entries they need, and a frontend release surface in the existing context
package pane. The comparison rules (AC-7, AC-8, AC-10) are pure functions and are the
cheapest, densest tests in the feature; AC-18 and AC-20 are the two with real design
risk, and they are the two that UK-3 and UK-6 have to settle first.

- rough unit count: `12-18` for S1+S2 (actual: 19), plus `3-5` for S3
- verdict: `split`
- session boundaries:

  | id | ACs | what it lands | depends on |
  |----|-----|---------------|------------|
  | S1 | AC-16, AC-17, AC-18, AC-19, AC-20, AC-21 | the four tables and their migration, the `PackageRelease` aggregate, the version module in `packages/types`, the change gate and its comparisons, the three use cases and the three routes on the existing packages controller | — |
  | S2 | AC-1..AC-15 | the version area in the package pane header, the release form, the history drawer, the Amplitude calls, `apps/doc` and the CHANGELOG | S1 |
  | S3 | AC-22, AC-23, AC-24, AC-25 | the release endpoints on `IPackmindApi`, release methods on `IPackagePage` / `PackagePage`, one Playwright spec in `apps/e2e-tests/src/features/packages/`, and D-042's wire repair | S2 |

  **S1 and S2 are complete and green.** S3 was added on 2026-09-16 by D-048, after S2
  closed; it is the session the next run picks up.

  The cut is not "backend then frontend" as a habit — it is where the contract is.
  The **rules** behind AC-2..AC-15 are built and unit-tested in S1, where they live
  (D-007, D-008, D-009, D-011, D-012); S2 is where each becomes observable in the
  wording the criterion uses. AC-4 and AC-11 are the clearest case: the payload that
  answers them is S1's (D-015), the sentence that states them is S2's (D-011).

- why here: two signals fired, and one did not.

  **The unit count is where the orchestrator's own context becomes the risk.** At 12-18
  units across six projects — `types`, `migrations`, `deployments`, `api`, `frontend`,
  `doc` — the orchestrator is the one participant with no gate on its judgement, and it
  is the one that degrades. A single run would reach the frontend units, the ones with
  the most criteria attached, at its worst.

  **S1 ends somewhere a human wants to look.** Not a half-feature: a complete,
  exercised domain — releases can be cut, refused, listed and browsed, with the race in
  AC-20 driven against the real constraint and AC-18's deleted component read back
  through `includeDeleted`. Every rule in the issue is enforced and tested before a
  single pixel is drawn, which is the right order for a feature whose entire content is
  rules.

  **And S2 is genuinely better informed by S1 having landed.** The seam is the one
  place in this feature where the contract is fully decided — the readiness payload
  (D-015), the refusal codes (D-011), the three routes (D-016) — so S2 re-decides
  nothing, but it specs its units against a payload that exists in the repository
  rather than one described in prose.

  **The signal that did not fire: no deferred unknown.** All ten were decided (UK-1→D-010,
  UK-2→D-008, UK-3→D-003+D-004, UK-4→D-006, UK-5→D-009+D-012, UK-6→D-013, UK-7→D-020,
  UK-8→D-021, UK-9→disposition table, UK-10→D-018), so the cut is a cut in the run, not
  a pause for an answer. Nothing is re-framed and nothing is re-decided between the two.

  One caveat to watch rather than split further: AC-18's content endpoint and its drawer
  are the only genuinely separable leaf in the feature, and they straddle the seam. If
  S1 runs long, that endpoint is the cheapest thing to carry into S2 — not a third
  session.

- why S3 is its own session, and not four more units on the end of S2:

  **It is a different kind of verification, with a different failure mode.** Every unit
  in S1 and S2 is judged by a test that runs in seconds against mocks or an in-memory
  database. S3's are judged by a browser driving a running frontend against a running API
  and a real Postgres. When one of those fails, the question "is the feature wrong or is
  the harness wrong" is live in a way it never is for a jest run — and answering it is
  most of the work. Mixing that into a session sized around fast feedback would make the
  fast units pay the slow ones' startup cost and the slow ones inherit the fast ones'
  assumptions.

  **The dev stack is a precondition nothing else in this feature has.** `apps/e2e-tests/`
  needs the frontend on 4200 and the API up before a single spec runs. That is the first
  thing S3 establishes and the first thing that will go wrong; it has no bearing on any
  unit before it.

  **D-042's repair is genuinely risky and belongs beside its proof.** It changes how the
  shared API client narrows errors, which every domain in `apps/frontend` depends on.
  D-042 rejected loosening `isServerErrorResponse` precisely because the blast radius is
  the whole application. Landing that change in the same session as the only test that
  watches a real 400 travel end to end is what makes it verifiable rather than hopeful;
  landing it in S2, judged by a drawer's rendering, is what D-042 refused.

  **And S3 is informed by S2 in the same way S2 was by S1.** The page objects it extends,
  the query hooks it exercises and the sentences it asserts all exist in the repository
  now, so S3 specs its units against something real rather than something described.

## Done

Every AC has a passing named test recorded in `records.jsonl`, and the full suite is
green at the feature boundary.

When the verdict was `split`, that is the bar for the **feature**, not for each
session. A session ending green with its own ACs covered is a session done; the feature
is done when the last one is.

**Status on 2026-09-16.** S1 and S2 are done: AC-1 to AC-21 each carry a `verified by`,
and `nx run-many -t test` over `types`, `deployments`, `api` and `frontend` is green
(145 files, 2170 tests). The feature is **not** done, because D-048 added S3. AC-22 to
AC-25 are open and are the next session's work.

One deliberate asymmetry in this bar, stated so it is not read as an oversight: the
`apps/doc` and CHANGELOG deliverable has no AC and no named test, because `apps/doc`
declares no test target. It is gated by `sweep` and read by a person, per D-047.
