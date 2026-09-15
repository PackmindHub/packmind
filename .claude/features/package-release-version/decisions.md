# Decisions — Release a numbered version of a package

Append-only. A decided entry is never edited and never deleted.

**When implementation reveals a decision was wrong** — not merely ambiguous —
append a new entry carrying `supersedes: D-00n`, and append `superseded-by: D-0nn`
to the old one. That single line is the only permitted mutation of a decided entry.

---

## Inherited assumptions, surfaced before anything was decided

The charter takes five things for granted. Each is named here so that a reader can
see it was examined rather than absorbed, and each is settled by an entry below.

1. *That a release is a new thing, and not a reuse of `DistributedPackage`* — which
   already pins the three version families. → D-001, D-003.
2. *That "component" means exactly the three arrays on `Package`* — `recipes`,
   `standards`, `skills` — and nothing else a package might grow. → D-002.
3. *That the gate is a question asked about a package, not a state a package is in.*
   → D-006.
4. *That the version string is the identity of a release*, rather than an ordinal
   with a label. → D-009, D-012.
5. *That the release is written by, and read from, `packages/deployments`* — the
   package that owns `Package` and already owns every version-pinning read. → D-001.

---

## D-001 — A release is a new aggregate in `packages/deployments`, named `PackageRelease`

- status: `active`
- user-visible: `no`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-16`, `AC-17`, `UK-3`

**Decision.** A new entity `PackageRelease` — types in
`packages/types/src/deployments/PackageRelease.ts`, schema, repository, service and
use cases in `packages/deployments`. Not `PackageVersion`, and not a new Nx package.

**Reasoning.** *Why `packages/deployments`.* The change gate (D-006) has to read a
package's components, its title and its description, all owned by `PackageService`,
and has to read the latest version of each component through `ICommandsPort`,
`IStandardsPort` and `ISkillsPort` — three ports `packages/deployments` already
injects, in `PublishPackagesUseCase`. A separate `packages/releases` would need a port
back into deployments for the first read and would re-declare the other three, to buy
a boundary nothing is pushing against.

*Why not `PackageVersion`.* Three sibling types already carry that suffix —
`SkillVersion`, `CommandVersion`, `StandardVersion` — and all three mean the same
thing: one immutable revision of one artefact's content, numbered with
`version: number`. A `PackageVersion` would sit in that family and break its two
rules at once: its version is a string, `0.1.0`, and it holds no content of its own,
only pointers to other versions. The reader who assumes the family idiom would write
`release.version + 1`. `PackageRelease` costs one word and removes that reading.

**Rejected.**

- `PackageVersion` — consistency with the version family is exactly the trap; see
  above. The name also makes `packageVersion.version` mean two different kinds of
  thing one keystroke apart.
- A new `packages/releases` — needs a port into deployments for the package read and
  copies three existing port injections, for no boundary anyone is defending.
- Storing the release on `Package` itself (a `currentVersion` column) — a package has
  *many* releases (AC-16 asks for both 0.1.0 and 0.2.0 to be listed) and they are
  immutable; a column would hold the latest and lose the rest.

**Constrains implementation.** Declare `PackageRelease`, `PackageReleaseId` and
`createPackageReleaseId` in `packages/types/src/deployments/PackageRelease.ts`,
exported through `packages/types/src/deployments/index.ts`. Put the schema in
`packages/deployments/src/infra/schemas/`, the repository in
`packages/deployments/src/infra/repositories/`, and register both in
`DeploymentsRepositories` / `DeploymentsServices` the way `PackageRepository` and
`PackageService` are registered. Do not create a new Nx project. Do not name any type
`PackageVersion`.

---

## D-002 — A release pins the three component families and nothing else

- status: `active`
- user-visible: `no`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: D-026 (partial — the aggregate's relation fields, not the write surface)
- relates to: `AC-16`, `AC-21`

**Decision.** A release pins `CommandVersionId[]`, `StandardVersionId[]` and
`SkillVersionId[]` — the three arrays `Package` carries, no more. "Component" in every
criterion means one of those three, and `recipes`/`commands` are one family under two
names, as everywhere else in this codebase.

**Reasoning.** `Package` has exactly three artefact arrays and the whole distribution
path is written three times over them; there is no fourth kind to be forward-compatible
with, and a generic `{ type, id }[]` would be the first place in the tree to model them
uniformly — a refactor wearing a feature's clothes. The recipes/commands duality is
already handled at the controller boundary by the `PackageResponse` superset
(`commands` is a twin of `recipes`, same value), and a release contract that invented a
third spelling would be the only one that had to be explained.

AC-21 is the reason this is a decision and not an assumption: every example in the
issue uses a skill, and three parallel arrays are exactly the shape where a
skill-shaped implementation compiles and ships with two empty branches.

**Rejected.**

- A polymorphic `components: { type, id, versionId }[]` — uniform and tempting, but it
  would be the only place in the codebase that models the three as one, so every read
  would fan back out into three anyway to join against three tables.
- Pinning component ids plus a version *number* rather than a version id — the number
  is scoped to its artefact, so every read would need `(skillId, 4) → SkillVersion`, a
  lookup the version id already is.

**Constrains implementation.** A `PackageRelease` carries three separate arrays, named
`recipeVersionIds`, `standardVersionIds` and `skillVersionIds` — matching
`PublishPackagesUseCase`'s existing `PackageVersionsMap` naming exactly. Every test
that exercises the gate or the pinning must use a package holding at least one command,
one standard and one skill; a test fixture holding only skills is not acceptable
coverage for any criterion.

---

## D-003 — Store the release like `DistributedPackage` does: one row, three many-to-many join tables

- status: `active`
- user-visible: `no`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-16`, `AC-17`, `AC-18`, `UK-3`

**Decision.** A `package_releases` table (uuid pk, `package_id`, `version`, `name`,
`description`, timestamps), plus `package_release_command_versions`,
`package_release_standard_versions` and `package_release_skill_versions` — the exact
shape `DistributedPackageSchema` declares, with the same `many-to-many` + `joinTable`
idiom and the same column naming.

**Reasoning.** The problem — pin a set of artefact versions to one row, immutably — was
solved in this package already, for distributions, and the solution is four tables and
a schema file a reader of `DistributedPackageSchema` recognises on sight. Copying it
means the release repository's hydration code has a working model twenty lines away,
and means a future reader comparing "what a distribution pinned" with "what a release
pinned" is comparing like with like.

It also gives AC-17 for free without any code: immutability is not enforced by a flag
or a trigger, it is the absence of any write path. The release rows are inserted once,
and nothing in this feature updates them. A newer skill version is a new row in
`skill_versions`; the join row in `package_release_skill_versions` still points at the
old one.

**Rejected.**

- JSONB columns holding the three id arrays on the release row — one table instead of
  four, and the insert is trivial. Rejected because the join to the version tables is
  the only read anyone performs (browsing a release means showing its components), and
  a JSONB array cannot be joined; every read would become fetch-then-`In(...)` in
  application code, three times, which is the hydration `DistributedPackageRepository`
  gets from TypeORM.
- Copying the rendered content of each component into the release — bulletproof against
  anything happening to the version rows, and the only design that survives a *hard*
  delete. Rejected because component deletion is soft everywhere (D-004) so the version
  rows do not go away, and because it would duplicate every skill prompt and every
  standard's rules once per release, making a release cost megabytes and making
  "0.1.0 pins v4" a claim the data could no longer prove.
- Adding `deletedAt` / `softDeleteSchemas` to `package_releases` — a release is
  immutable and undeletable by this feature (charter non-goal); a soft-delete column
  nothing writes is an invitation.

**Constrains implementation.** Write one TypeORM migration under
`packages/migrations/src/migrations/`, created with
`npx typeorm migration:create packages/migrations/src/migrations/CreatePackageReleases`,
following the `how-to-write-typeorm-migrations-in-packmind` skill — `PackmindLogger`,
try/catch, and a `down` that drops all four tables. Use `uuidMigrationColumn` and
`timestampsMigrationColumns`. Model the schema file on
`packages/deployments/src/infra/schemas/DistributedPackageSchema.ts`. The
`package_id` FK is `onDelete: 'CASCADE'`, matching `DistributedPackageSchema`. Add a
unique index on `(package_id, version)` — D-013 depends on it. Never write an `UPDATE`
against `package_releases` or any of its join tables.

---

## D-004 — Deleted components stay browsable because deletion is soft and versions are never deleted

- status: `active`
- user-visible: `yes`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-18`, `UK-3`

**Decision.** AC-18 needs no mechanism of its own. `SkillSchema`, `CommandSchema` and
`StandardSchema` all carry `softDeleteSchemas`, and deleting a skill sets `deletedAt`
rather than removing rows — so the pinned version rows survive, and the join rows still
resolve. Reading a release passes `includeDeleted: true` (the option
`AbstractRepository` already exposes, and `SkillRepository`, `StandardRepository` and
`CommandRepository` all honour) so the soft-delete filter does not hide them.

**Reasoning.** This was found, not designed. `DeleteSkillUseCase` logs "Perform soft
delete"; `AbstractRepository.findById` already takes `opts?.includeDeleted`; three
repositories already pass `withDeleted` through. The feature that looked like it needed
content copying (rejected in D-003) needs one boolean.

The consequence is worth stating because it is user-visible and slightly surprising: a
component deleted from the space is still *readable* through an old release, by name
and by content, forever. That is the intent — a release is a promise about what was
shipped — but it means "delete" stops meaning "gone" for anyone browsing history.

**Rejected.**

- Rendering deleted components as a tombstone ("this component no longer exists") —
  AC-18 says browsing 0.1.0 "still shows 'Work with Jest' v4", which is the content,
  not a headstone. A tombstone also makes the release a worse record than the
  distribution that shipped it, which shows the real thing.
- Blocking component deletion once it is pinned by a release — turns every release into
  a lock on the space's content; nobody asked for that and it would make releasing feel
  dangerous.

**Constrains implementation.** Every read that hydrates a release's components must
pass `includeDeleted: true` (or `withDeleted()`, per the repository's own idiom). Do
not filter deleted components out of a release's content. Do not change any deletion
use case in `packages/skills`, `packages/commands` or `packages/standards`. Cover this
with a test that deletes the component and then reads the release — asserting on the
repository option is not the criterion.

---

## D-005 — The release snapshots the package's name and description too

- status: `active`
- user-visible: `yes`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-5`, `AC-6`, `AC-7`, `AC-18`

**Decision.** `package_releases` carries `name` and `description`, copied from the
package at the moment of the cut. The change gate compares against these columns, and
browsing a release shows the title and description as they were.

**Reasoning.** AC-5 and AC-6 make details a *change source*, which means the gate needs
a prior value to compare against, and the only honest place for it is the release
itself. The alternative — reading the package's `updatedAt` against the release's
`createdAt` — is wrong twice over: it fires on a component being added (a different
change source), and it cannot satisfy AC-5's "renaming it back disables it again",
since a revert bumps `updatedAt` like any other write.

Storing them also makes the release a complete snapshot rather than a partial one,
which is what makes AC-18's browsing readable: 0.1.0 of a package since renamed shows
the name it had.

The slug is deliberately not stored. It is derived from the name
(`packageSlugHelpers`), and a release is addressed by its package and its version, not
by a slug of its own.

**Rejected.**

- Comparing `package.updatedAt` against `release.createdAt` — cheap, and wrong for
  AC-5, AC-7, AC-8's revert cases and AC-10. Any edit-and-revert would read as a
  change.
- Storing a hash of the details instead of the values — the same gate answer, one
  column, but it cannot render AC-18's released title, and a hash mismatch can never be
  explained to anyone.
- Storing the slug as well — derived, and unused by any read here.

**Constrains implementation.** `name` and `description` are `NOT NULL` columns on
`package_releases`, written from the package at cut time and never updated. Do not
reference `packages.updated_at` anywhere in the gate.

---

## D-006 — The gate is computed on read, never stored

- status: `active`
- user-visible: `no`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-2`..`AC-10`, `UK-4`

**Decision.** "Can this package be released, and why not" is computed each time it is
asked, by comparing the package's current state against its latest release. No column,
no cached flag, no event.

**Reasoning.** Three of the four change sources happen outside `packages/deployments`
entirely: publishing a new version of a skill, a command or a standard is
`packages/skills`, `packages/commands`, `packages/standards`, and none of them knows a
package exists. A stored flag would need every one of those publish paths to notify
deployments — a new outbound dependency in three packages, in a direction that does not
currently exist, to maintain a boolean that can then be wrong.

The computation is small and bounded: one release row, its three join arrays, and one
latest-version lookup per component of the package. That is the same fan-out
`PublishPackagesUseCase` already performs on every distribution, and a package holds
components in the tens.

**Rejected.**

- A `hasChangesSinceRelease` column maintained by the write paths — needs three
  packages to learn about a fourth's concern, and is a cache with four invalidation
  sources and no way to notice when it is stale.
- Recomputing on a schedule / in a BullMQ job — same staleness, plus a job.
- Computing it in the frontend from what it already has — it has none of it:
  `PackageResponse` carries component **ids** only, never their latest versions.

**Constrains implementation.** Implement the gate as a read. Do not add a column to
`packages`, do not emit or consume an event, and do not modify any use case in
`packages/skills`, `packages/commands` or `packages/standards`.

---

## D-007 — One ordered verdict function, with `no_components` evaluated first

- status: `active`
- user-visible: `yes`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-2`, `AC-3`, `AC-9`, `AC-10`

**Decision.** The gate is one function returning one verdict, in this order:

1. the package holds no component → `no_components`
2. it has never been released → `ready`
3. nothing differs from the latest release → `no_change`
4. otherwise → `ready`

Three change sources, one gate — component versions, details, component list are
inputs to step 3, not three independent checks.

**Reasoning.** AC-9 is the whole reason the order is written down: removing the last
component *is* a change to the component list and *is* an empty package, and the issue
says the reason shown must be "Add at least one component". Two independent checks
would race to produce the message; an ordered function cannot.

AC-10 is the mirror image — one change of any kind suffices — and it is what makes
step 3 an `OR` over three comparisons rather than three separately reportable states.
The user is never told *which* source changed, only that something did, so the verdict
does not carry a breakdown.

**Rejected.**

- Three independent booleans surfaced to the UI (`detailsChanged`, `listChanged`,
  `versionsChanged`) — richer, and nothing in the issue asks for it; it would put the
  precedence decision in the renderer, where AC-9 would be got wrong.
- Reporting `no_change` for an empty never-released package — reads as "nothing has
  changed since —", which is not a sentence.

**Constrains implementation.** Write the verdict as a single pure function with the
four branches above, in that order, and test each branch by name. An empty package
returns `no_components` whether or not it has ever been released and whether or not its
content differs.

---

## D-008 — Comparison rules: names are trimmed and case-folded, descriptions are trimmed only, component lists are unordered sets, versions compare by id

- status: `active`
- user-visible: `yes`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-4`, `AC-5`, `AC-6`, `AC-7`, `AC-8`, `UK-2`

**Decision.** Four comparisons, each stated exactly:

- **name** — `trim()` then case-insensitive compare.
- **description** — `trim()` then exact compare. *Case-sensitive.*
- **component list** — compare as an unordered set of `(family, id)` pairs; order and
  arrival sequence are invisible.
- **component versions** — compare the pinned `…VersionId` against the component's
  current latest `…VersionId`. Not the version *number*.

**Reasoning.** *Name.* AC-7 asks for both, and the issue's own justification —
"the package name is trimmed anyway", "a case-only edit is not a change" — is the
identity argument: the slug is derived from the name and is unmoved by case, so
`My-Package` and `my-package` are the same package wearing the same slug.

*Description, and why it differs.* UK-2 asked whether the title's rules transfer. They
do not. A description is prose, and capitalising a sentence or lower-casing a product
name is an edit a writer meant; refusing to release it would be refusing to publish a
correction. Trim survives the transfer because trailing whitespace is never meaningful
and a textarea produces it by accident. The asymmetry is deliberate and is the kind of
thing that gets "fixed" into symmetry by a later reader, which is why it is here.

*Component list.* AC-8's "added then removed" is only disabled if the comparison is a
set. Array equality would report a change for a reordering that no user performed.

*Component versions.* AC-4 needs "v4 pinned, v5 available" for display, but the
*comparison* must be on ids: the version number is scoped to its artefact, and two
components at v4 say nothing about each other. Comparing ids also means "latest" is
whatever the port returns, with no arithmetic of ours in between.

**Rejected.**

- Case-folding the description too — symmetric, and silently refuses a real editorial
  change. See above.
- Normalising whitespace *inside* the name or description (collapsing double spaces) —
  not asked for, and it would make the gate disagree with what the edit form shows.
- Comparing component lists by a sorted-and-joined string — works, and turns a set
  comparison into a string bug waiting for an id containing the separator.
- Comparing version *numbers* — breaks the moment a component is removed and re-added,
  and is meaningless across families.

**Constrains implementation.** Implement these four comparisons as pure functions with
no I/O, in `packages/deployments`, and test them directly. Use `trim()` and
`toLowerCase()` for the name, `trim()` alone for the description. Build the component
comparison over a `Set` of `${family}:${id}` keys. Never compare `SkillVersion.version`,
`CommandVersion.version` or `StandardVersion.version` numerically to decide the gate.

---

## D-009 — `X.Y.Z` is validated by one regex and one increment function, both in `packages/types`, with no semver dependency

- status: `active`
- user-visible: `yes`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-11`..`AC-15`, `UK-1`

**Decision.** A pure module `packages/types/src/deployments/packageReleaseVersion.ts`
holding: a parser over `^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$`, a comparator on
the parsed triple, and `nextVersions(current)` returning the three increments in the
order patch, minor, major. Both the release form and the server validation call the
same functions. No `semver` package is added.

**Reasoning.** *Why one module, shared.* AC-15 exists precisely because the form's
choices and the server's check can disagree, and the issue says so in prose: "Narrowing
the choices a user can pick from does not remove the check." One module called from
both ends is the only version of that sentence that cannot rot. `packages/types` is
`env:shared`, which is what makes it reachable from `apps/frontend` (`env:browser`) and
from the API at once; and it already hosts a pure function next to a type —
`isPackagePublishableAsPlugin` lives in `Package.ts` — so this is an established idiom,
not a new one.

*Why no `semver`.* The library's job is accepting the full grammar: prereleases, build
metadata, ranges, `v` prefixes, loose mode. AC-12 refuses `1.2.0-beta-2`, so we would
parse with semver and then re-reject most of what it accepted. The grammar we do accept
is one regex, and the leading-zero rule comes with it for free — `01.2.3` is refused,
which is right, because accepting it would make two distinct strings mean one version
and break the unique constraint's job.

*Why the triple and not the string.* `0.10.0` sorts before `0.9.0` lexically. Any
ordering anywhere — the version list, "current version", the greater-than check — goes
through the parsed triple.

**Rejected.**

- `semver` from npm — accepts a grammar we then have to narrow, and adds a dependency
  to `packages/types`, which today imports nothing.
- Validating only on the server and letting the form offer three buttons — AC-12 needs
  the form to refuse `1,2,3` and keep it, which is client-side behaviour; and the two
  would drift.
- Duplicating the regex in the frontend — the same drift, written down twice.
- Storing major/minor/patch as integer columns to order in SQL — three columns that can
  disagree with the string, bought to order a list of a few dozen rows that is already
  fully loaded in memory.

**Constrains implementation.** Put the parser, the comparator and `nextVersions` in
`packages/types/src/deployments/packageReleaseVersion.ts`, exported through the
deployments barrel. That file must import nothing. Do not add `semver` to
`package.json`. Never order releases by the `version` string in SQL or with a plain
string comparison — parse, then compare the triple.

---

## D-010 — A never-released package is treated as `0.0.0`, and the first release defaults to `0.1.0`

- status: `active`
- user-visible: `yes`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-1`, `AC-11`, `UK-1`

**Decision.** With no release, the current version is `0.0.0`, so `nextVersions` offers
`0.0.1`, `0.1.0` and `1.0.0` — the same three increments as anywhere else. The
pre-filled default is the **patch** increment everywhere except the first release,
where it is the **minor**, `0.1.0`.

**Reasoning.** UK-1 asked what the increment rule means with nothing to increment from.
Treating "never released" as `0.0.0` keeps one code path: the form, the server check
and the suggestion all keep calling the same `nextVersions`, and no branch anywhere
says "unless this is the first".

The default is the one exception, and it is worth the exception. Every example in the
issue starts a package's life at `0.1.0` — "released in 0.1.0" appears in eleven
scenarios and `0.0.1` in none — and a playbook's first public version reading `0.0.1`
looks like a mistake rather than a choice. The three options are all still offered, so a
team that wants `1.0.0` is one click away.

**Rejected.**

- A free-form first version — destroys the single-source-of-truth argument of D-009 at
  the one moment it is easiest to get wrong, and makes "only the three increments" a
  rule with an exception rather than a rule.
- `0.1.0` fixed, no choice, for the first release — refuses a team that considers its
  playbook production-ready, and the increments rule already permits `1.0.0`.
- Patch (`0.0.1`) as the first default, for consistency — consistent, and wrong in the
  only direction that matters: the default is what most releases will actually be
  named.

**Constrains implementation.** When a package has no release, use `0.0.0` as the
current version for every computation. Do not special-case the first release anywhere
except the choice of pre-filled default. The version area for such a package reads
"Not released yet", not "0.0.0" — `0.0.0` is an internal sentinel and must never be
rendered.

---

## D-011 — Refusals and gate reasons are codes; the sentences live in one frontend file

- status: `active`
- user-visible: `yes`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-2`, `AC-3`, `AC-12`, `AC-13`, `AC-14`, `AC-15`, `AC-20`

**Decision.** The server answers with a code and the values the sentence needs —
`{ code: 'no_components' | 'no_change' | 'not_greater' | 'malformed' | 'not_an_increment', currentVersion }`
— and never with prose. The four sentences the criteria quote are built in
`apps/frontend/src/domain/deployments/constants/messages.ts`, beside the existing
`PACKAGE_MESSAGES`:

- `no_components` → "Add at least one component"
- `no_change` → `Nothing has changed since ${currentVersion}`
- `not_greater` → `Version must be greater than ${currentVersion}`
- `malformed`, `not_an_increment` → "Version must follow X.Y.Z"

**Reasoning.** Two of the four sentences interpolate the current version, which the
client already holds — so a server-rendered string would be the server formatting data
the client has, in a language the server does not know is the user's. And two of the
five codes are raised on the client (the form validates before it submits) while the
same two are raised on the server (AC-15, and the race in AC-20); codes let both ends
produce the identical sentence from the identical function, which is what makes a
frontend test asserting on that sentence meaningful.

`PACKAGE_MESSAGES` already exists and already does exactly this for the package domain,
including interpolating functions (`confirmation.deletePackage(name)`). This is one
more section in it, not a new idea.

**Rejected.**

- Server-rendered messages — puts copy in `packages/deployments`, splits the four
  sentences across two repositories' worth of concerns, and makes changing a word a
  backend deploy.
- A single `refused` boolean with a free-text `message` — the form has to branch on the
  code anyway (AC-12 keeps the field's value, AC-13 does not necessarily), and matching
  on message text is what `reason` fields exist to prevent.
- Reusing the existing `ServerErrorResponse.reason` channel for the *gate* reason — the
  gate is a successful read, not an error; only the refusals (D-013) travel as errors.

**Constrains implementation.** The four sentences above must appear exactly as written,
in `apps/frontend/src/domain/deployments/constants/messages.ts` only. No string
literal containing user-facing release copy may appear in `packages/deployments` or
`packages/types`. The codes are a TypeScript union in `packages/types`.

---

## D-012 — `not_greater` covers both "lower", "equal" and "already taken"

- status: `active`
- user-visible: `yes`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-13`, `AC-14`, `AC-20`, `UK-5`

**Decision.** One code, one sentence, for three criteria. AC-13 (lower), AC-14 (equal)
and AC-20 (lost the race) are all "not greater than the current version", refused with
`Version must be greater than ${currentVersion}`, where `currentVersion` is re-read at
the moment of refusal.

**Reasoning.** This is not a simplification, it is the same rule seen three times. The
issue says AC-14 is refused "because that version already exists" and AC-20 is refused
"because 1.2.1 already exists" — and once releases are monotonic (which the
greater-than rule itself guarantees), "already exists" and "not greater than the
current version" are the same statement. Concretely: current is 1.2.0, Alice cuts
1.2.1, current becomes 1.2.1, Bob submits 1.2.1 → not greater than 1.2.1. Bob is told
"Version must be greater than 1.2.1", which is both true and immediately actionable —
better than "already exists", which does not say what to do next.

The re-read at refusal time is what makes the sentence correct in the race: refusing
with the version Bob's form was holding would tell him to beat 1.2.0, which he did.

**Rejected.**

- A distinct `version_taken` code and sentence — a fourth sentence saying the same
  thing, and it would have to explain what to try instead.
- Refusing with the version the client sent as `currentVersion` — in AC-20 that is
  stale by exactly the amount that matters.

**Constrains implementation.** Compute `currentVersion` for the refusal from the
database at refusal time, not from the request. There is no `version_taken` code.

---

## D-013 — The unique constraint is the arbiter of the race; the pre-check is only for the message

- status: `active`
- user-visible: `no`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-20`, `UK-6`

**Decision.** The use case validates, then inserts. The unique index on
`(package_id, version)` is what actually decides AC-20: a unique-violation on insert is
caught and translated into the same refusal D-012 produces, after re-reading the current
version.

**Reasoning.** The check-then-insert window is exactly the race in AC-20 — both
curators are offered 1.2.1 because both pre-checks passed. Any design in which
application code is the arbiter has that window; the only question is what closes it.
The database constraint closes it for free, is the honest statement of the invariant
("a package has at most one release per version") and stays true against any future
writer, including a CLI path this feature explicitly does not build (charter non-goal)
and a migration or a script.

The pre-check stays because it produces the good message in the overwhelmingly common
non-racing case, and because AC-13/AC-14/AC-15 are refusals that never reach an insert.

**Rejected.**

- A `SERIALIZABLE` transaction or a row lock on the package — heavier, serialises
  unrelated releases of different packages if the lock is coarse, and still needs the
  constraint to be correct against anything outside the transaction.
- A Postgres advisory lock keyed on the package — same, plus a lock nobody else in this
  codebase takes, so nobody else will know to take it.
- Pre-check only — is the bug AC-20 was written to catch.

**Constrains implementation.** The unique index on `(package_id, version)` is created
in the migration (D-003) and is not optional. Catch the unique-violation from the
insert specifically — do not catch every error from the insert — and turn it into the
`not_greater` refusal of D-012. Cover AC-20 with a test that drives two cuts of the
same version against the real repository; a mock-only test does not exercise the
constraint and does not satisfy the criterion.

---

## D-014 — Pinning reads the latest version per component at cut time, and refuses rather than skipping a component that has none

- status: `active`
- user-visible: `yes`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-16`, `AC-17`

**Decision.** Cutting a release resolves each component to its latest version through
`ICommandsPort.listCommandVersions` (sorted, as `PublishPackagesUseCase` does),
`IStandardsPort.getLatestStandardVersion` and `ISkillsPort.getLatestSkillVersion`. A
component with no version at all refuses the whole release. It is never silently
skipped.

**Reasoning.** `PublishPackagesUseCase` skips such a component — `if (latestVersion)`,
no else — and that is defensible for a distribution, which is a best-effort push. It is
not defensible for a release, which is a claim: "0.2.0 contains these components". A
release that quietly contains four of five components makes AC-17's immutability
promise a lie about a set nobody can see. Refusing is loud, and the case is close to
impossible in practice — the three services create a version alongside the artefact —
which is precisely why silent skipping would never be noticed if it happened.

The port asymmetry (commands has no `getLatest`) is inherited, not fixed here: adding
`getLatestCommandVersion` to `ICommandsPort` is a change in another package's contract
for one caller's convenience, and this feature's non-goals say it does not reach into
the distribution path.

**Rejected.**

- Skipping versionless components, matching `PublishPackagesUseCase` — consistent with
  the neighbour and wrong for the reason above.
- Adding `getLatestCommandVersion` to `ICommandsPort` — tidier, and it edits a contract
  in `packages/commands` for one caller; out of scope, and a separate cleanup.
- Pinning from the package's *distributed* versions rather than the latest — the issue
  is explicit: "a release always points to the latest version of each component".

**Constrains implementation.** Resolve latest versions inside the cut, in one pass,
caching per component id the way `PublishPackagesUseCase` does. If any component
resolves to no version, throw before writing anything — the release row and its join
rows are written in one transaction or not at all.

---

## D-015 — The readiness payload carries the outdated components, computed server-side

- status: `active`
- user-visible: `yes`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: D-029 (partial — the payload carries `verdict` and no `reason`)
- relates to: `AC-4`, `AC-11`

**Decision.** The readiness read returns
`{ currentVersion: string | null, verdict, reason, nextVersions: [patch, minor, major], outdatedComponents: { family, id, name, pinnedVersion, latestVersion }[] }`.
`outdatedComponents` is the "0.1.0 is behind on Work with Jest (v4 pinned, v5
available)" of AC-4, and it is computed where the version reads already happen.

**Reasoning.** The frontend cannot compute this: `PackageResponse` carries component
**ids** and nothing else, and there is no endpoint that returns the latest version of
an arbitrary set of components. The server is already resolving exactly these versions
to answer the gate (D-006), so returning them costs one mapping and saves a second
round of reads.

`nextVersions` travels with it for the same reason it is computed at all (D-009): the
form's three choices and the server's accepted set must be the same list, and shipping
the list from the server that will validate against it removes the possibility of the
two being computed from different current versions.

`currentVersion` is `null`, not `"0.0.0"`, for a never-released package — the sentinel
of D-010 is internal and the wire must not carry it, or "Not released yet" becomes a
frontend guess.

**Rejected.**

- Returning only a count of outdated components — AC-4 names the component and both
  versions; a count cannot render it.
- Returning the full latest version entity per component — sends prompts and rule sets
  to render two integers and a name.
- Computing `nextVersions` on the client from `currentVersion` — possible, and it
  reintroduces exactly the two-implementations problem D-009 exists to close.

**Constrains implementation.** `currentVersion` is `null` when there is no release.
`outdatedComponents` is empty, not absent, when nothing is behind. `pinnedVersion` and
`latestVersion` are the integer `version` fields of the respective version entities.

---

## D-016 — Three endpoints on the existing space-scoped packages controller

- status: `active`
- user-visible: `no`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-1`, `AC-16`, `AC-18`

**Decision.** On `OrganizationsSpacesPackagesController`
(`/organizations/:orgId/spaces/:spaceId/packages`):

- `GET  /:packageId/releases` → `{ releases: PackageReleaseSummary[], readiness }`
- `POST /:packageId/releases` → `{ version }` in, the created release out
- `GET  /:packageId/releases/:version` → that release's pinned components, hydrated

Three use cases behind them, all extending `AbstractMemberUseCase`.

**Reasoning.** The controller, its `OrganizationAccessGuard`, its path inheritance
through `RouterModule` and its `DeploymentsService` wiring all already exist for this
exact resource; releases are a sub-resource of a package and belong under it.

*Why readiness rides on the list read rather than on `GET /packages/:id`.* The package
read is on the app's hottest path — the rail, the pane, every navigation — and
readiness costs a latest-version lookup per component. Bundling it would make every
package read pay for a panel most readers do not look at. Its own key also means the
release mutation invalidates exactly one cache entry.

*Why the content read is separate.* Hydrating every release's components to list the
versions would fetch the whole history's content to render a list of numbers.

*Addressing a release by `version` rather than by id.* The version is the user-facing
identity, it is unique per package by construction (D-013), and it makes the URL
readable. The id stays the primary key.

**Rejected.**

- Folding readiness into `GetPackageByIdUseCase` — makes the hottest read pay for the
  rarest panel, and couples two cache lifetimes.
- One fat `GET /releases` returning history *and* content — sends every past release's
  components to render a version list.
- A top-level `/releases` resource — loses the guard and the space scoping the existing
  controller provides for free.

**Constrains implementation.** Add the routes to
`apps/api/src/app/organizations/spaces/packages/packages.controller.ts`. Declare the
commands and responses in `packages/types/src/deployments/contracts/`, one file per use
case, following `IGetPackageByIdUseCase.ts`. Add the three use cases to
`IDeploymentPort` and to `DeploymentsService`. Do not create a new controller or a new
Nest module.

---

## D-017 — Any member can release: `AbstractMemberUseCase`, and no role check anywhere

- status: `active`
- user-visible: `yes`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-19`

**Decision.** All three use cases extend `AbstractMemberUseCase` and implement
`executeForMembers`. Neither `AbstractSpaceAdminUseCase` nor `createdBy` is consulted.

**Reasoning.** AC-19 is explicit — "there is no ownership or role check" — and this is
written down as a decision rather than left as an absence because the absence is
invisible. `AbstractSpaceAdminUseCase` and `AbstractSpaceMemberUseCase` both exist and
are both used nearby; "cutting a release" reads like a privileged act, and a subagent
reaching for the admin base class would be making a reasonable-looking choice that
fails a criterion. The space membership check that `AbstractMemberUseCase` performs is
the only authorisation this feature has.

**Rejected.**

- `AbstractSpaceAdminUseCase` — refuses Bob in AC-19.
- A `createdBy` check — the package's creator is recorded and is not an owner in any
  sense the product uses.

**Constrains implementation.** Extend `AbstractMemberUseCase`. Do not read
`package.createdBy` for any purpose. Do not add a guard beyond the controller's
existing `OrganizationAccessGuard`.

---

## D-018 — The version area lives in the package pane header; the history opens in a drawer

- status: `active`
- user-visible: `yes`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-1`, `AC-2`, `AC-3`, `AC-4`, `AC-18`, `UK-10`

**Decision.** In `ContextPackagePane`'s header: a badge reading the current version or
"Not released yet", the "Create a release" action beside it (disabled with its reason
as a tooltip), and the AC-4 behind-signal on the same line. Selecting the badge opens a
**drawer** listing every release, and selecting one shows what it pins. The release
form is a drawer too. No new tab, no new route.

**Reasoning.** *Why not a third tab.* The pane's two tabs are a documented pairing —
its own docstring says the package is "read from two sides: what it holds, and where it
landed", one question asked twice. A version is neither side; it is the package's
identity, which is what the header is for.

*Why a drawer.* The pane already answers every secondary question this way —
`EditPackageDetailsDrawer`, `AddComponentsDrawer`, `MoveComponentDrawer` — so the
history and the form cost a reader nothing new, and the pane keeps its place behind
them.

*Why not a route.* `ContextPackagePane` receives its package already resolved rather
than reading it from the address, deliberately; a `/releases/:version` route would
reintroduce the resolution it was built to avoid.

**Rejected.**

- A third tab — breaks the two-sided sentence the pane is built around, and buries a
  one-line fact behind a click.
- A panel always expanded under `PackageReachStrip` — the strip is deliberately "a
  sentence rather than a panel", per its own docstring; a second panel undoes the
  argument the first one won.
- A dedicated route — duplicates package resolution; see above.

**Constrains implementation.** Put the version area in `ContextPackagePane`'s header
region, not inside either tab's body. Model the drawers on the existing
`EditPackageDetailsDrawer`. Build the UI from `@packmind/ui` PM-prefixed components
only (`working-with-pm-design-kit`). Do not add a route and do not touch
`buildComponentDetail`'s tab constants.

---

## D-019 — The release form keeps invalid input and validates on submit

- status: `active`
- user-visible: `yes`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-11`, `AC-12`

**Decision.** The version field is a free-text input pre-filled per D-010, with the
three offered increments presented as one-click fills beside it. It never rewrites or
filters what is typed. Validation runs on submit; on refusal the field keeps its value
and the message appears beside it.

**Reasoning.** AC-12 is the whole decision: `1,2,3` typed on a French keyboard must be
refused *and kept*, so the user fixes two separators instead of retyping. That rules
out every input that sanitises as you type — masked inputs, number steppers, a
select — because each would either eat the commas or refuse the keystroke, and the
criterion describes a submit that happened.

The three increments still have to be offered (AC-11), hence the one-click fills: they
fill the field, they do not replace it. A pure `<select>` of three options would satisfy
AC-11 and make AC-12 unreachable — and AC-15 (a well-formed, greater, non-increment
version submitted "anyway") describes a user who got past the offered set, which a
select does not permit.

**Rejected.**

- A select or segmented control of the three increments — makes AC-12 and AC-15
  unreachable through the UI, and the issue insists the check survives whatever the
  form offers.
- A masked or numeric-only input — eats the commas AC-12 requires to survive.
- Validating on every keystroke — turns "1" into a refusal while the user is typing
  "1.3.0".

**Constrains implementation.** The version input is an uncontrolled-value text field
whose content is never transformed. Do not clear it on refusal. The three increment
buttons set the field's value and nothing else.

---

## D-020 — No feature flag

- status: `active`
- user-visible: `no`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `UK-7`

**Decision.** The feature ships unflagged. Nothing is added to
`packages/feature-flags/src/registry.ts`.

**Reasoning.** The issue marked the flag *(inferred — confirm)*, so it is a proposal,
not a requirement. The registry holds three keys and every one of them is mapped to
`['@packmind.com', '@promyze.com']` — it is a mechanism for pinning a demo to staff, not
a rollout or a kill switch, and it has no per-organization audience that a real
progressive rollout would need.

Against that: this lands on the most-used surface in the product, and a flag would let
it be merged half-built. But the pipeline does not merge half-built features — the
orchestrator ships a feature green at its boundary or not at all — and the feature is
purely additive: new tables, new endpoints, a new header element. Nothing that exists
today changes behaviour, so the rollback is a revert, and the blast radius of a bug is
a panel not rendering.

Recorded rather than assumed because the issue asked for it, and because reversing this
is cheap and disturbs nothing else: one `*_FEATURE_KEY` constant, one entry in
`DEFAULT_FEATURE_DOMAIN_MAP`, one addition to the `FeatureFlagKey` union, and one gate
around the version area (D-018). No other decision in this log depends on the answer.

**Rejected.**

- A `package-releases` flag gated to `@packmind.com` / `@promyze.com` — pins the
  feature to staff, which is a demo strategy, not a rollout; and it would have to be
  removed in a follow-up nobody schedules.

**Constrains implementation.** Do not edit `packages/feature-flags`. Do not wrap the
version area in a `useFeatureFlag` gate.

---

## D-021 — Amplitude events are emitted from the frontend, via the proprietary `useAnalytics`

- status: `active`
- user-visible: `no`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `UK-8`

**Decision.** `package_version_released` and `package_release_refused` are tracked in
the frontend, in the release form's success and failure handlers, through
`useAnalytics` from
`@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider` —
`analytics.track('package_version_released', { … })`, the call shape every existing
site uses. Nothing is emitted server-side.

**Reasoning.** UK-8 asked whether this is possible on OSS at all. It is, and only this
way: `packages/amplitude` contains nothing but `node_modules` here, while
`apps/frontend` already imports the proprietary `useAnalytics` from six places
(`ContextCreateMenu`, `DownloadSkillPopover`, `SkillFileEditor`, …). There is no
server-side analytics port to call.

That settles the second half of UK-8 by consequence: `package_release_refused` fires
wherever the refusal is *seen*, which covers both a client-side rejection and a
server-side one surfaced to the form. That is also the product's meaning of "refused" —
a user tried and was told no — rather than "the API returned 4xx".

**Rejected.**

- Emitting from the use case in `packages/deployments` — no analytics dependency
  reaches it, and adding one would put a proprietary import into an OSS domain package.
- Emitting only on server refusals — misses AC-12's `1,2,3`, which is the refusal most
  likely to be common and most likely to be a usability signal.

**Constrains implementation.** Track `package_version_released` with `packageId`,
`version`, `componentsCount` and `changeSources`; track `package_release_refused` with
`packageId`, `attemptedVersion` and `refusalReason` (the D-011 code). Both calls live
in the release form component. Mock the analytics provider in the component's tests the
way `SkillFileEditor.test.tsx` does.

---

## D-022 — Releases are inert: nothing else in the product reads them

- status: `active`
- user-visible: `no`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: every AC

**Decision.** No existing read or write path learns about releases. Distribution,
installation, drift and marketplace publishing keep operating on the package's current
content, exactly as today.

**Reasoning.** The charter says this in its non-goals; it is repeated here as a
decision because non-goals are read once and constraints are quoted into every spec.
The temptation is concrete and will arrive mid-feature: a subagent implementing AC-4's
"behind" signal will find `buildPackageDriftOverview` computing a strikingly similar
thing for destinations, and "reuse" will look like the right instinct. It is not — the
two answer different questions (is this *destination* behind the package, versus is
this *release* behind the package's content), and merging them would silently change
what every existing drift surface means.

The consumer side — installing or pinning a released version — is the sibling story
that makes releases do something. Until it exists, a release is a record.

**Rejected.**

- Teaching `PublishPackagesUseCase` to distribute the latest release instead of current
  content — changes the behaviour of every existing distribution, and is the
  out-of-scope consumer story.
- Reusing `PackageDrift` / `installDriftEntries` for AC-4 — different question, shared
  cache, and the existing surfaces would inherit the change.

**Constrains implementation.** Do not modify `PublishPackagesUseCase`,
`InstallPackagesUseCase`, `PullContentUseCase`, `DistributedPackage`,
`ListActiveDistributedPackagesBySpaceUseCase`, `renderPackageAsPlugin`, or any selector
under `apps/frontend/src/domain/deployments/components/redesign/selectors/`. If a unit
believes it must, that is rung 4 — halt.

---

## D-023 — Documentation goes to `apps/doc/concepts/packages-management.mdx`, CHANGELOG to `Unreleased / Added`

- status: `active`
- user-visible: `yes`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: charter `In scope`

**Decision.** The release flow is documented as a section of the existing
`apps/doc/concepts/packages-management.mdx`, not as a new page. One CHANGELOG entry
under `# [Unreleased]` → `## Added`, in `CHANGELOG.MD` at the repository root.

**Reasoning.** A release is a property of a package, and a reader looking for it will
be on the page that explains what a package is. `apps/doc/playbook-maintenance/` is the
other candidate and is about keeping artefacts current — auto-update, change proposals,
external sources — which is what a release is measured *against*, not what it is.

CHANGELOG at the OSS root is the only correct side: shared files are edited here and
the proprietary repository picks them up by merge, never the reverse.

**Rejected.**

- A new `apps/doc/concepts/package-releases.mdx` — splits one concept across two pages
  and needs a `docs.json` navigation entry to be found at all.
- `playbook-maintenance/` — that section is about artefacts drifting; a release is about
  naming a state.

**Constrains implementation.** Follow the
`creating-end-user-documentation-for-packmind` skill: task-oriented, no implementation
detail. Write the CHANGELOG entry in the voice the existing `Added` entries use — one
paragraph, present tense, describing what a user can now do. Do not edit `CHANGELOG.MD`
in any repository but this one.

---

## D-024 — The flag is a teammate's, later; keep the version area gate-ready

- status: `active`
- user-visible: `no`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `UK-7`, `D-020`, `D-018`

**Decision.** D-020 stands and is confirmed: this feature adds no feature flag. A
teammate will add one separately, at their own moment. The only obligation that falls
on this feature is that the version area must be **one mountable element**, so wrapping
it in a gate later is a one-line change and not a hunt.

**Reasoning.** D-020 argued the flag was not this feature's to add; the confirmation
adds the fact that one is coming from someone else. That changes nothing about what to
build and one thing about how: a feature that will be gated later is worth building so
it *can* be, and the cheap way to lose that is to scatter the release UI across the
pane's header, its two tab bodies and a menu entry. Gathering it into a single
component costs nothing now and is the difference between a one-line gate and a
four-site one.

Deliberately not anticipated further: no placeholder key, no commented-out
`useFeatureFlag`, no "flag-ready" indirection layer. Scaffolding for a flag whose name,
audience and owner are all someone else's decision is the kind of guess that gets
inherited as a requirement.

**Rejected.**

- Adding the flag anyway so the teammate only has to set the audience — commits them to
  a key name and a gate placement they have not chosen, in a registry whose every
  entry so far is a staff pin.
- Leaving a commented-out gate or a TODO at the call site — a note that rots, where a
  single component is a fact that does not.

**Constrains implementation.** Build the version area (badge, action, behind-signal) as
one component mounted at one place in `ContextPackagePane`'s header, so that a later
gate wraps exactly one JSX element. Do not add anything to `packages/feature-flags`,
do not import `useFeatureFlag`, and do not leave a placeholder key or a TODO.

---

## D-025 — The analytics call is a typed no-op on OSS; the two events go into the stub's `AnalyticsEventMap`

- status: `active`
- user-visible: `no`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `UK-8`, `D-021`

**Decision.** D-021 stands: both events are tracked from the release form via
`useAnalytics`. On this repository that call does nothing, by design, and that is the
finished state here. What this feature must also do is add `package_version_released`
and `package_release_refused` to the event map of the OSS stub —
`apps/frontend/src/domain/editions/stubs/domain/amplitude/providers/types.ts` — because
without them the call does not compile. The proprietary side adds the same two entries
to its own provider and is where the events actually reach Amplitude.

**Reasoning.** Verified, and it is the part D-021 could not have known. On OSS,
`vite.config.ts` and `tsconfig.paths.oss.json` both redirect
`@packmind/proprietary/frontend/*` to `apps/frontend/src/domain/editions/stubs/*`,
where `Analytics` is a `NoopAnalyticsService` whose `track` body is a comment. So the
call is inert here — exactly as intended, and not a bug for anyone to chase.

But `track` is generic: `track<E extends AnalyticsEventName>(event: E, payload:
AnalyticsEventMap[E])`, and `AnalyticsEventName = keyof AnalyticsEventMap`, a closed
map of fourteen literal event names in that same stub. `analytics.track('package_version_released', …)`
is therefore a **type error** until the map lists it. An implementer who hits that error
with no guidance has three tempting exits — cast the event name, silence the call, or
drop the tracking — and all three ship something wrong. The fix is one entry per event
in the map, declaring the payload shape D-021 specified.

This is also the right side of the OSS/proprietary seam: shared files are edited here
and the proprietary repository picks them up by merge, never the reverse. The stub's
map is the OSS copy; the proprietary provider's map is its twin, and keeping the two
event names and payload shapes identical is what makes the merge a no-op.

**Rejected.**

- Casting the event name (`as AnalyticsEventName`) or the payload — compiles, and
  defeats the only thing the typed map exists for: that a call site and the provider
  agree on the payload. It would also hide the divergence at exactly the merge where it
  matters.
- Skipping the `track` calls on OSS behind an edition check — the call site is the
  shared artefact; making it conditional means proprietary would have to add it back,
  which is the merge direction this repository does not use.
- Declaring the events only in the proprietary repository — the OSS build would not
  compile, so this is not an option, only a thing someone might attempt.

**Constrains implementation.** Add two entries to `AnalyticsEventMap` in
`apps/frontend/src/domain/editions/stubs/domain/amplitude/providers/types.ts`:
`package_version_released: { packageId: string; version: string; componentsCount: number; changeSources: string[] }`
and
`package_release_refused: { packageId: string; attemptedVersion: string; refusalReason: string }`.
Change nothing else in that stub — in particular, do not give `NoopAnalyticsService` a
body. Do not assert in any test that an event was delivered; assert only that `track`
was called with the right name and payload, against a mocked provider, the way
`SkillFileEditor.test.tsx` mocks it.

---

## Known unknowns — disposition

| id | disposition |
|----|-------------|
| UK-1 | decided — D-010 |
| UK-2 | decided — D-008 (descriptions are trimmed, not case-folded; deliberately asymmetric with the name) |
| UK-3 | decided — D-003 + D-004 |
| UK-4 | decided — D-006 |
| UK-5 | decided — D-009 (ordering by parsed triple) + D-012 |
| UK-6 | decided — D-013 |
| UK-7 | decided — D-020, confirmed by D-024: no flag here, a teammate adds one later |
| UK-8 | decided — D-021, refined by D-025: the call is a typed no-op on OSS and its event names must be declared in the stub's map |
| UK-9 | decided by D-003's timestamps: a release carries `createdAt` through `timestampsMigrationColumns`, and that is all. **No `createdBy`, and nothing is rendered.** AC-19 says any member can release, so "who cut it" answers no question the criteria ask; adding a column and a byline nobody asked for is scope. A later story that wants attribution adds the column then |
| UK-10 | decided — D-018 |

None deferred.

---

## D-026 — The `PackageRelease` aggregate holds hydrated version entities; only the write surface speaks in ids

- status: `active`
- user-visible: `no`
- decided: `2026-09-14`
- supersedes: D-002 (partial)
- superseded-by: —
- relates to: `AC-16`, `AC-18`, `D-002`, `D-003`

**Decision.** `PackageRelease` declares `recipeVersions: CommandVersion[]`,
`standardVersions: StandardVersion[]` and `skillVersions: SkillVersion[]` — the three
many-to-many relations, hydrated, exactly as `DistributedPackage` declares them. The
**write** surface keeps D-002's names: the repository's `add*Versions` methods and the
create-a-release command take `recipeVersionIds`, `standardVersionIds` and
`skillVersionIds`.

**Reasoning.** D-002 and D-003 pull against each other once the storage is settled, and
the contradiction is only visible with the schema in front of you. D-002 says the
aggregate "carries three separate arrays, named `recipeVersionIds`,
`standardVersionIds` and `skillVersionIds`". D-003 says store it the way
`DistributedPackageSchema` does — and that means TypeORM `many-to-many` relations,
where the entity property *is* the relation. Declaring `skillVersionIds: SkillVersionId[]`
while mapping that same property `many-to-many` to `SkillVersion` makes the type lie
about what TypeORM puts there on every read.

Reading decides it. AC-18 requires browsing a release to show a deleted component *at
its pinned version* — its name and its version number, which is content, not an id. So
the read type must be entities; an id array would force a second fetch-then-`In(...)`
in application code, which is precisely the cost D-003 rejected JSONB storage for.

D-002's intent is fully preserved, because that intent was about the write: it cites
`PublishPackagesUseCase`'s `PackageVersionsMap` naming, and that map is a map of ids
being written. The existing `DistributedPackage` does exactly this split already — the
type holds entity arrays, while `addStandardVersions(ids)` raw-inserts ids into the
join table — so this is the neighbour's shape, not a new one.

**Rejected.**

- Id arrays on the aggregate, hydrated separately at read time — honours D-002's letter
  and reintroduces the per-read fan-out D-003 rejected, three times over, for every
  release browsed.
- Both on the type (`skillVersions` *and* `skillVersionIds`) — two sources of truth for
  one relation, and every writer has to decide which one it is responsible for filling.
  The first reader to trust the empty one has a bug that typechecks.
- Renaming the write surface to `...Versions` for symmetry — loses the one thing D-002
  was pinning down, which is that the three families are written as three separate id
  arrays and never as a polymorphic list.

**Constrains implementation.** The `PackageRelease` type's relation fields are named
`recipeVersions`, `standardVersions` and `skillVersions`. Any parameter, command or
repository method that *writes* them takes id arrays named `recipeVersionIds`,
`standardVersionIds` and `skillVersionIds`. Do not declare both shapes on the type.

---

## D-027 — AC-20 is proven against pg-mem's unique index, not a real Postgres race

- status: `active`
- user-visible: `no`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-20`, `D-013`

**Decision.** The AC-20 test uses `createTestDatasourceFixture` from
`@packmind/test-utils` — the pg-mem-backed fixture that
`packages/deployments/src/infra/repositories/PackageRepository.spec.ts` already uses —
declares the unique index on the `EntitySchema` so `synchronize()` materialises it, and
asserts that the second insert of the same `(package_id, version)` is refused by the
database. No new test infrastructure is added.

**Reasoning.** D-013 says a mock-only test "does not exercise the constraint and does
not satisfy the criterion", and that is the requirement this honours: pg-mem is a real
SQL engine, not a stub, and it enforces unique indices at the SQL layer. The test fails
if the index is missing from the schema, which is the regression D-013 exists to catch.

What it does **not** prove is stated here so that nobody later reads the test as
stronger than it is: pg-mem is single-threaded and in-process, so two "concurrent" cuts
execute strictly in call order. The test demonstrates that the constraint is the
arbiter; it does not demonstrate behaviour under genuine overlapping transactions with
real MVCC. Nothing in this repository can: there is no `testcontainers`, no
`better-sqlite3`, no live-Postgres Jest harness, and no CI workflow that starts one —
every repository and integration spec in the monorepo runs on pg-mem.

Building a real-Postgres harness is new shared test infrastructure that every package
would then be expected to adopt. That is a larger change than the feature that
provoked it, it is not in the charter, and the marginal assurance is small: the
constraint either exists in the schema and the migration or it does not, and the
pg-mem test answers exactly that.

The corollary that matters for the code: the refusal path must be driven by catching
the database's unique-violation, not by a pre-check that happens to run first. A test
that passes only because application code checked first would pass on a real Postgres
race too — and then fail in production.

**Rejected.**

- Adding `testcontainers` and a real Postgres for this one criterion — new
  infrastructure for the whole monorepo, introduced by a feature that does not own it,
  and it would make this package's suite need Docker where nothing else does.
- Asserting the race with mocks and a spy on the pre-check — exactly what D-013 forbids;
  it tests the code's intention rather than the constraint.
- Dropping AC-20 to a unit test of the error translation only — that half is worth
  testing and is not sufficient: it never proves an index exists.

**Constrains implementation.** Declare the unique index on `(packageId, version)` in
the `EntitySchema`'s `indices` array **as well as** in the migration — the fixture
builds tables with `synchronize()` from the schema and never runs migrations, so an
index declared only in the migration is invisible to every test. Catch the
unique-violation from the insert specifically and translate it per D-012; do not let a
pre-check be the only thing standing between two cuts.

---

## D-028 — The write is transactional, and that transaction is unverifiable here; do not test it

- status: `active`
- user-visible: `no`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-16`, `AC-20`, `D-003`, `D-027`

**Decision.** `createWithVersions` writes the release row and all three sets of join
rows inside `this.repository.manager.transaction(...)`, per D-003's "one transaction or
not at all". **No test asserts the rollback**, in this unit or any later one. A test
that drives a failing write asserts only that the write is refused, never that nothing
was left behind.

**Reasoning.** Found during U-002, not designed. pg-mem's TypeORM/pg adapter treats
`ROLLBACK` as a no-op: an insert issued inside a `BEGIN` survives an explicit rollback.
This was verified standalone, and it showed up first as a failing assertion — the
release row and two of its three join rows were still there after the transaction threw.

So the harness cannot distinguish a correctly-rolled-back write from one that was never
transactional at all. An assertion of the form "leaves no release row behind" would pass
against code with no transaction whatsoever, which makes it worse than no test: it is a
green check that certifies nothing, in the exact place a reader would most trust it.

The transaction stays in the code, because it is right against real PostgreSQL, which is
what production runs. What cannot happen is a test pretending to prove it. This pairs
with D-027: pg-mem is a real SQL engine for constraints and a fiction for transaction
semantics, and the two halves of that sentence have to be held at once.

**Rejected.**

- Asserting row-absence after a failed write anyway — passes on pg-mem whether or not
  the code is transactional; certifies nothing while looking like assurance.
- Dropping the transaction because it cannot be tested here — it is correct against the
  database the product actually runs on, and testability of the harness is not the
  standard for correctness of the code.
- Adding a real-Postgres harness to test it — the same new shared infrastructure D-027
  rejected, for the same reasons, now for a second criterion.
- Hand-rolling compensating deletes instead of a transaction — more code, a second
  failure mode when the compensation fails, and still untestable here.

**Constrains implementation.** Keep the `manager.transaction(...)` wrapper on any write
that touches the release row and its join rows together. Do not write a test asserting
what a rollback left behind; where the temptation arises, assert the rejection and leave
a comment naming pg-mem's no-op rollback so the next reader does not add one.

---

## D-029 — Readiness carries one tri-state verdict; there is no separate `reason` field

- status: `active`
- user-visible: `yes`
- decided: `2026-09-14`
- supersedes: D-015 (partial)
- superseded-by: —
- relates to: `AC-2`, `AC-3`, `AC-9`, `D-007`, `D-011`, `D-015`

**Decision.** The gate's answer is one field:

```ts
type PackageReleaseVerdict = 'ready' | 'no_components' | 'no_change';
```

`ready` means the action is enabled. Any other value means it is disabled, and that
value *is* the message key D-011 maps to a sentence. The readiness payload of D-015
therefore carries `verdict` and **not** a separate `reason`.

**Reasoning.** D-007 fixes the verdict values as exactly these three, and D-015 — written
in the same session — lists `verdict` and `reason` as two fields. Read together they
would put the same code in the payload twice, and two fields carrying one fact can
disagree.

That is not a theoretical worry here, because of which fact it is. AC-9 is a precedence
rule: removing the last component is *both* an empty package and a change to the
component list, and the criterion says the user must be told "Add at least one
component". D-007 exists to make that precedence unloseable by resolving it in one
ordered function. A payload with both `verdict` and `reason` hands the renderer two
values and an implicit question about which one to believe — which is precisely the
decision D-007 took away from the renderer. One field cannot be inconsistent with
itself.

`reason` also has no reader. The frontend needs two things: whether to enable the
action, and which sentence to show. A tri-state answers both, because `verdict !==
'ready'` is the first and the value is the second.

Refusals are a different channel and keep their own codes (D-011, D-012): they travel as
errors from a submitted release, not as a field of a successful read. Nothing here
changes them.

**Rejected.**

- `verdict: 'ready' | 'blocked'` plus `reason: code | null` — the shape D-015's wording
  suggests. Two fields, one fact, and the renderer inherits the AC-9 precedence question
  that D-007 was written to settle centrally.
- Keeping both and defining `reason` as "equal to `verdict` unless ready" — redundancy
  with a rule attached, which is a rule someone will eventually break.
- A boolean `canRelease` plus a nullable code — same as the first, and it loses the
  ability to add a fourth blocking reason without changing the field's type.

**Constrains implementation.** The pure gate function returns the tri-state above and
nothing else. The readiness payload has no `reason` key. The frontend enables the action
on `verdict === 'ready'` and maps any other value to its sentence through the single
messages file of D-011.

---

## D-030 — A release read defeats soft-delete with `withDeleted()` on its own relations, and AC-18 is tested by deleting a command or a standard

- status: `active`
- user-visible: `yes`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: D-037 (partial — which object the AC-18 test deletes, and why)
- relates to: `AC-18`, `AC-21`, `D-004`, `D-026`

**Decision.** The mechanism D-004 named no longer applies as written, and this is the
replacement. `PackageReleaseRepository` hydrates its three version relations itself and
never calls `SkillRepository`, `CommandRepository` or `StandardRepository`, so there is
no `includeDeleted: true` option to pass. The release read defeats the soft-delete
filter with `withDeleted()` on its own query, which is the same intent expressed in the
idiom the read actually uses.

The AC-18 test **deletes a command or a standard, not a skill.**

**Reasoning.** D-004 was written before D-026 settled that the aggregate hydrates its own
relations. Its *intent* — a release stays browsable after a component is deleted, because
deletion is soft and version rows survive — is untouched and still correct. Only its
named mechanism was made obsolete, and an obsolete mechanism in a constraint is worse
than none: an implementer would go looking for a repository option that this read does
not have, and the likeliest exits are to drop the requirement or to route the read
through three repositories it has no reason to touch.

The choice of which component to delete is not arbitrary and is the part most likely to
be got wrong by picking the issue's own example. Every scenario in the issue uses a
skill. AC-21 exists precisely because a skill-shaped test can pass while two families are
broken, and here the asymmetry is concrete rather than hypothetical: the soft-delete
columns that would hide a pinned version live on the command and standard version
schemas. A test that deletes a skill may never exercise a filter at all, and would then
prove nothing while appearing to cover the criterion.

**Rejected.**

- Routing the release's component reads back through `ICommandsPort`, `IStandardsPort`
  and `ISkillsPort` so that D-004's `includeDeleted: true` applies literally — three
  extra fan-out reads per release browsed, to honour the letter of a constraint whose
  substance `withDeleted()` already delivers, and it re-introduces the per-read
  fetch-then-`In(...)` that D-003 rejected JSONB for.
- Dropping the soft-delete concern because version rows might not be soft-deleted at all
  — that is an assumption about three schemas this feature does not own, and if it is
  ever false AC-18 breaks silently, which is the failure the criterion was written to
  prevent.
- Testing AC-18 by deleting a skill, following the issue's examples — the criterion
  would pass without ever exercising a soft-delete filter.

**Constrains implementation.** Use `withDeleted()` on the relation hydration in
`PackageReleaseRepository`'s read methods. The AC-18 test deletes a **command or a
standard** that a release pins, then reads that release back and asserts the component is
still present at its pinned version; it then cuts a later release and asserts the
component is absent from that one. Do not change any deletion use case in
`packages/skills`, `packages/commands` or `packages/standards`.

---

## D-031 — The refusal codes are their own union, `PackageReleaseRefusal`, beside the verdict

- status: `active`
- user-visible: `yes`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-12`, `AC-13`, `AC-14`, `AC-15`, `AC-20`, `D-011`, `D-029`

**Decision.** D-029 split D-011's five-code union in two. The gate half landed as
`PackageReleaseVerdict`. The refusal half is declared alongside it, in
`packages/types/src/deployments/PackageRelease.ts`:

```ts
export type PackageReleaseRefusal =
  | 'malformed'
  | 'not_greater'
  | 'not_an_increment';
```

Exactly those three members, in that file, under that name.

**Reasoning.** D-011 listed five codes as one union because the gate reason and the
refusal reason were one channel. D-029 separated them for a good reason — a successful
read and a rejected write are different answers — but it named only the half it kept,
which leaves the other half homeless. Two places will need it next: the cut use case
that raises these codes, and S2's messages file that turns them into the sentences the
criteria quote. Unnamed, each invents its own spelling, and the mismatch surfaces as a
sentence that never renders.

Three members, not four: D-012 already decided that "lower", "equal" and "already taken"
are one code, `not_greater`, because once releases are monotonic they are the same
statement. There is no `version_taken`.

`no_components` and `no_change` are deliberately **not** here. They are gate verdicts,
not refusals — a package that cannot be released yet is a successful read with an answer,
and nothing was submitted to refuse.

**Rejected.**

- One five-member union spanning both channels, as D-011 first wrote it — makes a type
  that can express `{ verdict: 'malformed' }` and `{ refusal: 'no_change' }`, neither of
  which is a thing, and it is what D-029 separated.
- A separate contracts file for three string literals — the verdict lives in
  `PackageRelease.ts` and these are its counterpart; splitting them across two files
  makes the pair harder to find than either alone.
- Reusing the frontend's message keys as the wire codes — D-011 put the sentences in one
  frontend file precisely so the wire carries codes; this would invert that.

**Constrains implementation.** Declare `PackageReleaseRefusal` in
`packages/types/src/deployments/PackageRelease.ts` with exactly the three members above.
The cut use case's refusals carry one of these plus the `currentVersion` the sentence
needs (D-011, D-012). No fourth member is added without a new decision.

---

## D-032 — The unique violation is detected by Postgres error code `23505`, with the constraint name as a secondary check

- status: `active`
- user-visible: `no`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-20`, `D-013`, `D-027`

**Decision.** The catch around the insert tests the driver error's `code` field for
`'23505'` — Postgres's `unique_violation` — and, when the constraint name is available,
that it is `idx_package_releases_unique`. Any error that is not a `23505` is rethrown
untouched.

**Reasoning.** D-013 and D-027 both say to catch the unique violation "specifically" and
neither says by what. That is the gap where an implementer reaches for the nearest thing
to hand — and the nearest thing to hand is whatever shape pg-mem happens to throw,
because D-027 fixed pg-mem as the only harness that will ever run this path. Detection
written against pg-mem's error and never against the driver's would pass every test here
and fail in production, on the one code path that exists to be correct under a race. That
is the worst failure this pipeline can produce: green, plausible, and wrong where nobody
looks.

`23505` is the standard, driver-independent identifier, stable across `pg` versions and
independent of message wording or locale. The constraint name narrows it further, so that
a future second unique index on the table cannot be silently translated into "that
version already exists" — but it is secondary, because pg-mem may not populate it, and a
detection that *requires* the name would fail open in the only harness available.

If pg-mem turns out not to surface `code: '23505'` either, the test asserts the refusal
through the repository's public behaviour rather than the error's internals, and the
`23505` check stays in the production path regardless. What must not happen is the
predicate being weakened to match pg-mem.

**Rejected.**

- Matching on the error message text — locale- and version-dependent, and exactly the
  string-matching that error codes exist to replace.
- Catching every error from the insert and calling it a duplicate — turns a connection
  failure into "Version must be greater than 1.2.0", which is a lie the user cannot act
  on. D-013 says catch the unique violation *specifically* for this reason.
- Requiring the constraint name as the primary test — fails open where the name is absent,
  including possibly the only harness that runs it.
- Pre-checking only and dropping the catch — the bug AC-20 was written to catch.

**Constrains implementation.** Test `error.code === '23505'` on the caught error; treat
anything else as unrelated and rethrow it. Translate a confirmed violation into the
`not_greater` refusal of D-012, re-reading `currentVersion` from the database at refusal
time. Do not weaken this predicate to match what pg-mem throws; if the harness cannot
reach it, say so in the record rather than changing the production path.

---

## D-033 — Release timestamps stay out of the wire contracts

- status: `active`
- user-visible: `yes`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-18`, `D-016`, `UK-9`

**Decision.** `PackageReleaseSummary` and the release-content response carry no
`createdAt` and no `updatedAt`. The columns exist on the table and the entity keeps
`createdAt?: Date`; neither crosses the controller boundary.

**Reasoning.** UK-9 already decided the substance: a release carries `createdAt` through
`timestampsMigrationColumns`, there is no `createdBy`, and **nothing is rendered**. AC-19
says any member can release, so "who cut it, and when" answers no question the criteria
ask.

What made this worth writing down is a type divergence that would otherwise surface at
the S1/S2 seam. The entity declares `createdAt?: Date`, while sibling wire types in this
area — `Distribution`, `PackagesDeployment` — declare `createdAt: string`, because JSON
has no date. A `PackageReleaseSummary` that carried the entity's field forward would
declare a `Date` that is a string at runtime, and optional besides, so S2 would branch on
a field it should never have been handed. Keeping timestamps off the wire removes the
divergence rather than resolving it, and costs nothing, because no criterion reads them.

A later story that wants "released 3 days ago" adds the field then, in the shape the wire
actually needs, and decides the format once.

**Rejected.**

- Carrying `createdAt` as an ISO string "since it is free" — it is not free: it is a
  field S2 must decide whether to render, and a format decision nobody has made.
- Changing the entity to `createdAt: string` to match the siblings — the entity is what
  TypeORM hydrates, and it hydrates a `Date`; lying about that to suit a wire shape is
  backwards.
- Making the entity's `createdAt` required — it is absent on the object handed to
  `createWithVersions` before the database fills it, which is why U-002 made it optional.

**Constrains implementation.** No `createdAt` or `updatedAt` key on any release response
contract in `packages/types/src/deployments/contracts/`. Do not map them in the
controller. The entity's optional `createdAt?: Date` stays as it is.

---

## D-034 — A refused cut reports four codes; `no_components` is enforced server-side and `no_change` is not

- status: `active`
- user-visible: `yes`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-2`, `AC-3`, `AC-9`, `AC-16`, `D-011`, `D-029`, `D-031`

**Decision.** The write channel has its own code type, in
`packages/types/src/deployments/PackageRelease.ts`:

```ts
export type PackageReleaseRefusalCode = PackageReleaseRefusal | 'no_components';
```

Four members: `malformed`, `not_greater`, `not_an_increment`, `no_components`. The cut
use case refuses an empty package with `no_components`. It does **not** refuse a package
that has nothing changed since its last release.

**Reasoning.** D-029 split the read's verdict from the write's refusal, and D-031 named
the version-rule half. Neither said what a *submitted* cut does about content, and the
answer is not the same for the two content reasons — which is why this is a decision and
not an oversight being tidied.

*Why `no_components` is enforced.* The charter states it as a veto: "an empty package can
never be released". That is a rule about releases, not a statement about a button. A
release is a claim that a version contains a set of components; one containing none is
not a weaker claim but a meaningless one, and it would make AC-16 false for that row
forever, with no way to repair it because releases are immutable. AC-15's principle
applies directly — narrowing what a form offers does not remove the check behind it — and
an empty package is reachable by a POST from a stale page whose package was emptied in
another tab.

*Why `no_change` is not.* Nothing in the issue makes an unchanged release invalid; AC-3
says the **action is disabled**, which is an affordance, not an invariant. And a release
with identical content is a legitimate act: cutting 1.0.0 over 0.9.0 to mark a playbook
stable changes nothing but the number, and that is the whole point of the number. The
version rules already prevent the only real hazard, a duplicate, because every cut must
be strictly greater than the last. Enforcing `no_change` server-side would refuse a
deliberate, meaningful act in order to defend a disabled button.

The asymmetry is the point and it is why both halves are written down: one of these two
reasons is a rule and the other is a UI state, and they look identical in the gate's
tri-state.

**Rejected.**

- Enforcing both, for symmetry with the gate — refuses the legitimate "mark it stable"
  release, and treats an affordance as an invariant.
- Enforcing neither, leaving `no_components` to the frontend — lets a stale page write a
  release that pins nothing, permanently, into an immutable table.
- Reusing `PackageReleaseVerdict` as the refusal type — it contains `ready`, which is not
  a refusal, so every consumer would have to handle a case that cannot occur.
- Re-merging into D-011's original five-code union — puts `no_change` on the write
  channel, where this decision says it does not belong.

**Constrains implementation.** Declare `PackageReleaseRefusalCode` as above. The cut
refuses an empty package with `no_components` **before** validating the version, so an
empty package with a malformed version reports the empty package — the same precedence
D-007 fixed for the gate. Do not refuse on `no_change`. Do not call the gate function
from the cut: the cut needs one veto, not a verdict.

---

## D-035 — D-017's authorisation is organization membership, not space membership

- status: `active`
- user-visible: `no`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-19`, `D-017`

**Decision.** D-017 stands: the release use cases extend `AbstractMemberUseCase`. Its
reasoning contains one factual slip, corrected here rather than left to mislead — it says
"the space membership check that `AbstractMemberUseCase` performs", and that class checks
**organization** membership. There is no space-level check, and that is intended.

**Reasoning.** The base class validates the user against the organization and yields a
`MemberContext` of user, organization and org membership. Space membership is checked by
a different base, `AbstractSpaceMemberUseCase`, which the design session did not mention
and which a reader comparing the neighbours would reasonably reach for —
`GetPackageByIdUseCase`, the closest sibling, uses exactly that one.

Organization membership is the correct level here, because it is what AC-19 asks for: "a
member of the organization who did not create the package can release it — no ownership
or role check refuses them". The charter says the same in scope: "Any member of the
organization can release."

The consequence, stated plainly because it is the kind of thing a security review asks
about later: an organization member who does not belong to a space can cut a release of a
package in that space, since the route's `OrganizationAccessGuard` and this base class
both stop at the organization boundary. That follows from "no permission check" being an
explicit scope item rather than an omission. A story that wants space-level scoping on
releases changes this deliberately, and will find this entry.

**Rejected.**

- `AbstractSpaceMemberUseCase`, matching the neighbouring package read — adds a space
  membership check nothing asked for, and AC-19 is written against organization
  membership.
- Silently leaving D-017's wording — the slip names a check that does not happen, so a
  later reader would believe space scoping exists and build on it.
- Editing D-017's reasoning in place — the log is append-only for exactly this case.

**Constrains implementation.** Extend `AbstractMemberUseCase` and implement
`executeForMembers`. Do not inject `ISpacesPort` for an authorisation check. Do not read
`package.createdBy`. The command still carries `spaceId`, because the route is
space-scoped and the package is looked up within it — that is addressing, not
authorisation.

---

## D-036 — Latest-version resolution and current-version derivation are shared, not duplicated

- status: `active`
- user-visible: `no`
- decided: `2026-09-14`
- supersedes: —
- superseded-by: —
- relates to: `AC-4`, `AC-11`, `AC-16`, `D-006`, `D-009`, `D-014`, `D-015`

**Decision.** The two derivations `CreatePackageReleaseUseCase` currently keeps private
become shared and are called by both the cut and the readiness read:

- **`currentVersionOf(releases)`** — the greatest release by parsed triple, `'0.0.0'` for
  an empty list — becomes a pure function over releases already read.
- **latest-version resolution across the three families** becomes a module-level helper in
  `application/services/`, taking the three ports as arguments. It returns, per component,
  `{ family, componentId, name, versionId, versionNumber }`, plus a list of components it
  could not resolve.

Neither use case keeps a private copy.

**Reasoning.** The readiness read exists to tell a user whether a cut will be accepted and
what version it will be offered. If the two answers come from two implementations, the
pane can say "ready" while the cut refuses, or offer increments computed from a current
version the validation does not use. That is not duplication of style; it is two sources
of truth for one answer, and the failure it produces is a user being told something the
next click contradicts.

The richer return shape is what AC-4 needs and the cut does not: "0.1.0 is behind on Work
with Jest (v4 pinned, v5 available)" requires a name and two version *numbers*, while the
cut needs only ids (D-002). One resolution producing both is cheaper than two resolutions
and cannot drift; the cut simply projects it down to `PackageReleaseVersionIds`.

*Why a module-level helper and not a service class.* `DeploymentsServices` is constructed
from repositories alone and holds no ports; giving it the three artefact ports to host one
resolver would widen a constructor every existing use case depends on. A function taking
its ports as arguments is the smaller change and stays pure in the sense that matters —
it has no state to get stale.

*The unresolved components, and why the two callers differ.* A component with no version
at all refuses the whole cut (D-014) — that stands. The readiness read must not throw: the
pane has to render. So readiness simply omits an unresolved component from the snapshot it
compares, which makes the package look different from its release and yields `ready`. That
is the honest answer — something *is* wrong — and the cut will then say so loudly. The
alternative, inventing a readiness code for a case no acceptance criterion describes,
would add a fifth thing for the frontend to render and a sentence nobody has written.

**Rejected.**

- Duplicating both loops in the readiness use case, matching the existing idiom — two
  implementations of one answer, and the drift is invisible until a user sees the pane and
  the refusal disagree.
- Making the private methods public on `CreatePackageReleaseUseCase` and calling it from
  the other use case — the repository's use-case standard forbids both a use case
  instantiating another and exposing methods beyond `execute`.
- Putting the resolver on `PackageReleaseService` too — it would need the three artefact
  ports, which is not what a release service is for, and it would drag them into
  `DeploymentsServices`.
- Making `currentVersionOf` a `PackageReleaseService` method taking a `packageId` — it
  would change what every existing spec has to mock, which turns a behaviour-preserving
  extraction into one that cannot be checked against the tests that already pass. A pure
  function over releases the caller has already read needs no mock at all.
- Having readiness throw on an unresolved component, matching the cut — the readiness read
  is what renders the pane, and a package with one broken component would render nothing
  at all rather than showing the problem.

**Constrains implementation.** `currentVersionOf(releases: PackageRelease[]): string` is a
pure function — parse each version and compare the triple, never the string (D-009).
Extract the resolution loop into one exported function in
`packages/deployments/src/application/services/`, keeping the per-component-id caching and
the descending `version` sort for commands (`ICommandsPort` still has no
`getLatestCommandVersion`, and adding one is still out of scope). `CreatePackageReleaseUseCase`
must call both and keep no private copy. Its existing tests must pass unchanged — this
extraction changes no behaviour.

---

## D-037 — AC-18 is proven by soft-deleting the pinned **version row**, not its parent

- status: `active`
- user-visible: `yes`
- decided: `2026-09-15`
- supersedes: D-030 (partial — the premise about which schemas carry soft-delete, and which object the test deletes)
- superseded-by: —
- relates to: `AC-18`, `AC-21`, `D-004`, `D-030`

**Decision.** The AC-18 test soft-deletes a pinned `CommandVersion` or `StandardVersion`
row directly, through that repository's `deleteById`, and then reads the release back.
It does **not** delete the parent `Command`/`Standard`/`Skill`, and it does not use a
skill for this case at all.

**Reasoning.** D-030 required "a command or a standard, not a skill" on the stated
grounds that those are the two version schemas carrying soft-delete columns. The
grounds were wrong; the conclusion happens to be right, for a different reason, and the
difference decides whether the test proves anything.

The facts, checked: `CommandSchema`, `CommandVersionSchema`, `StandardSchema`,
`StandardVersionSchema` and `SkillSchema` all spread `softDeleteSchemas`. Only
`SkillVersionSchema` has none — no `deletedAt`, no `deletedBy`. So a skill *version*
cannot be soft-deleted at all, and `withDeleted()` has nothing to filter for it. That is
why the skill leg cannot carry this criterion, and it is the one real asymmetry among
the three families.

The sharper point is which object to delete. **Soft delete is an `UPDATE`, so the
`onDelete: 'CASCADE'` on the version relations never fires.** Deleting a parent
`Command` sets `deleted_at` on that row and leaves every `CommandVersion` row untouched
— `CommandVersionService` soft-deletes versions in an explicit loop precisely because
nothing cascades. A release's hydration joins the **version** tables, so a test that
deletes the parent would pass identically with or without `withDeleted()`: it would
assert a filter that was never engaged. That is the green-and-meaningless shape this
feature has now avoided three times (D-027, D-028, D-032), and it would be the worst
instance of it, because AC-18 is the criterion the mechanism exists for.

`withDeleted()` is already unconditional in `PackageReleaseRepository.hydratedQuery()`,
landed with the repository. This test is therefore a regression test on behaviour that
already works, and it is expected to pass on first run. That is the right shape: it
fails if anyone ever makes the hydration conditional.

**On AC-18's second half.** "A release cut afterwards excludes it" is not a repository
behaviour and is not covered here. Whether a deleted component leaves the package's
component list is owned by the artefact-removal path, which this feature does not touch
(D-022); and if a package still lists a component whose versions are all soft-deleted,
D-014 makes the next cut refuse outright rather than silently exclude it. That is a
consequence worth knowing and is not a gap in this unit.

**Rejected.**

- Deleting the parent `Command`, as the most natural reading of "a component deleted" —
  proves nothing, because the join reads version rows the parent's deletion never
  touched.
- Using a skill, following every example in the issue — `SkillVersionSchema` has no
  soft-delete columns, so there is no filter to defeat and the assertion is vacuous.
- Adding soft-delete columns to `SkillVersionSchema` for symmetry — a schema change in
  another package to make one test shapelier, and squarely outside this charter.
- Skipping the test because the behaviour already works — the value is the regression,
  and an unconditional `withDeleted()` with nothing asserting it is one refactor away
  from silently becoming conditional.

**Constrains implementation.** Soft-delete the pinned `CommandVersion` **and** the
pinned `StandardVersion` rows via their repositories' `deleteById`, then assert the
release still hydrates both at their pinned versions. Do not delete the parent entities.
Do not assert anything about a deleted skill version. Do not change
`PackageReleaseRepository`'s reads — they already pass `withDeleted()`; if the new test
fails, that is a real regression and the fix belongs in the repository, not the test.

---

## D-038 — `withDeleted()` must be called before the joins, not after

- status: `active`
- user-visible: `yes`
- decided: `2026-09-15`
- supersedes: —
- superseded-by: —
- relates to: `AC-18`, `D-004`, `D-030`, `D-037`

**Decision.** In `PackageReleaseRepository.hydratedQuery()`, `.withDeleted()` is called
immediately after `createQueryBuilder(...)` and **before** the three `leftJoinAndSelect`
calls, with a comment saying why the order matters.

**Reasoning.** This was landed wrong and shipped green. The original spelling —
three joins, then `.withDeleted()` — produced SQL carrying
`AND ("recipeVersion"."deleted_at" IS NULL)` on the joined aliases, so a release stopped
showing any command or standard version that had been soft-deleted. That is AC-18
failing outright: the promise a release makes about what was shipped, broken by the
deletion the criterion is specifically about.

The cause is that TypeORM reads the flag at two different times. In
`SelectQueryBuilder.join()` it is read **eagerly**, while the join is registered, and the
predicate is written permanently into that join's condition:

```js
if (joinAttributeMetadata.deleteDateColumn && !this.expressionMap.withDeleted) {
    const conditionDeleteColumn = `${aliasName}.${...deleteDateColumn.propertyName} IS NULL`;
    joinAttribute.condition = joinAttribute.condition
        ? ` ${joinAttribute.condition} AND ${conditionDeleteColumn}`
        : `${conditionDeleteColumn}`;
}
```

For the **root** alias the same flag is read late, in `createWhereExpression`, so the root
is unaffected by call order. That asymmetry is the whole trap: the two spellings are
indistinguishable at a glance, both compile, both read as obviously equivalent, and the
wrong one behaves correctly for the root entity — which is where most uses of
`withDeleted()` in this codebase live.

**Why it survived until now.** Nothing asserted it. The method carried a comment
declaring the behaviour and no test exercised it, so the claim and the code were never
compared. It took a test that soft-deletes the pinned **version row** to expose it —
deleting the parent `Command`, which is the natural reading of "a component was deleted",
leaves the version row untouched and passes either way (D-037). The feature came within
one plausible test of shipping the bug behind a green check.

**Rejected.**

- Overriding the condition per join with an explicit
  `leftJoinAndSelect(Entity, 'alias', 'alias.id = …')` — hand-maintained SQL for every
  relation, to buy what one reordered line already gives.
- Loading the relations separately and merging in application code — reintroduces the
  per-read fan-out D-003 rejected JSONB storage for.
- Treating the empty arrays as a pg-mem limitation and recording it as untestable, the
  way D-027 and D-028 record genuine harness limits — it was checked, and it is not:
  pg-mem executes the join correctly, and a hand-written raw join over the same tables
  returns the soft-deleted row. The harness proved the defect rather than fabricating it.

**Constrains implementation.** `.withDeleted()` precedes every `leftJoinAndSelect` in
`hydratedQuery()`. Keep a comment at the call site stating that the order is load-bearing,
because the two spellings look interchangeable and a later tidy-up would silently
reintroduce the bug. The three AC-18 tests stay exactly as written — they are correct and
they are what makes the ordering permanent.

**Noted for elsewhere, not fixed here.** This shape is likely repeated: the repository's
own TypeORM standard tells authors to "handle soft-deleted entities properly using
`withDeleted()`" without mentioning that placement matters. Auditing other repositories
is outside this charter (D-022) and belongs in its own story.

---

## D-039 — The two release responses carry a content type that has no timestamps

- status: `active`
- user-visible: `no`
- decided: `2026-09-15`
- supersedes: —
- superseded-by: —
- relates to: `AC-16`, `AC-18`, `D-016`, `D-026`, `D-033`

**Decision.** `PackageRelease.ts` declares

```ts
export type PackageReleaseContent = Omit<PackageRelease, 'createdAt' | 'updatedAt'>;
```

and both `CreatePackageReleaseResponse` and `GetPackageReleaseResponse` key their
`release` on that type rather than on `PackageRelease`. The entity keeps its optional
`createdAt?: Date` / `updatedAt?: Date`; nothing else changes.

**Reasoning.** D-033 decided the substance — no timestamp crosses the controller
boundary — and named the exact harm: a field declared `Date | undefined` that is an ISO
string at runtime, which S2 would then branch on. The S1 boundary reconcile found the
decision was honoured in the one place it was applied (`PackageReleaseSummary` is
`{ version: string }` and nothing else) and unhonoured in the two it was not, because
both responses key `release` on the hydrated entity and nothing strips it.

No unit deviated to produce this, which is why it needs an entry rather than a fix note.
D-033 landed between U-005 and U-007 and was applied by the unit that read it; U-005 and
U-009 had already shipped `{ release: PackageRelease }`, and U-011 correctly passed
through what it was handed. Three defensible local choices, one wrong wire.

This entry exists because D-033 stated the rule and not its mechanism, and a rule with no
named type is a rule each response re-decides. One `Omit` alias, referenced twice, is the
mechanism — and it fails the build if a third response is ever added that forgets.

*Why an alias and not `Omit<...>` written inline twice.* Two inline spellings are two
places to forget the second field, and the name is what a reader of S2's drawer sees.

**Rejected.**

- Making the entity's `createdAt` non-optional and mapping it to an ISO string in the
  controller — D-033 rejected this already: the entity is what TypeORM hydrates, and it
  hydrates a `Date`; the wire is what should bend.
- Stripping the keys in the controller with a destructure — invisible to the type system,
  so the contract would still promise a `Date` that never arrives.
- Leaving it and letting S2 ignore the fields — the type says `Date`, the wire says
  string, and the first `toLocaleDateString()` call is the bug.

**Constrains implementation.** Declare `PackageReleaseContent` in
`packages/types/src/deployments/PackageRelease.ts` and key `release` on it in both
`ICreatePackageReleaseUseCase.ts` and `IGetPackageReleaseUseCase.ts`. Do not change the
`PackageRelease` entity, the repository, or the controller's pass-through. Do not add a
mapper. Timestamps on the *nested* version entities are out of this entry's scope — D-033
speaks about the release's own.

---

## D-040 — The unique-violation predicate is `23505` alone, deliberately

- status: `active`
- user-visible: `no`
- decided: `2026-09-15`
- supersedes: —
- superseded-by: —
- relates to: `AC-20`, `D-013`, `D-027`, `D-032`

**Decision.** `CreatePackageReleaseUseCase` tests `error.code === '23505'` and nothing
else. D-032's secondary check — that the constraint name is `idx_package_releases_unique`
— is **not** implemented, and that is a choice, not an omission.

**Reasoning.** D-032's *Constrains implementation* line mandates only the `23505` test,
so the shipped code satisfies the binding half of that entry; its Decision paragraph also
describes the name as a secondary narrowing, and the S1 reconcile correctly noticed the
gap between the two halves. Left unrecorded, the next reader finds a decision that asks
for two checks and code that does one, and cannot tell which is authoritative.

The narrowing buys one thing: that a *second* unique index on `package_releases` could not
be mistranslated into "that version already exists". There is exactly one unique index on
that table today (`(package_id, version)`, D-003), this feature never writes another, and
releases are immutable so no future update path adds one. The check therefore defends
against a table shape nobody has proposed, at the cost of a predicate that is harder to
reason about and — because D-032 itself concedes pg-mem may not populate the name — can
only ever be exercised in production.

The risk being accepted is named plainly: if a second unique constraint is ever added to
`package_releases`, violating it will refuse the cut with `not_greater` and tell the user
to pick a higher version, which will be wrong and confusing. The trigger is specific and
the fix is one clause, which is what makes this worth accepting rather than pre-empting.

**Rejected.**

- Implementing the name check now, as D-032's prose describes — defends a table shape that
  does not exist, and cannot be tested in the only harness available (D-027).
- Appending a `supersedes: D-032` entry — D-032's binding constraint is satisfied as
  written; only its prose overreached, and superseding it would discard the `23505`
  reasoning, which is right and load-bearing.

**Constrains implementation.** Keep the predicate as `error.code === '23505'`, rethrowing
anything else. If a second unique index is ever added to `package_releases`, this entry is
the one to revisit, and the narrowing becomes required rather than optional.

---

## D-041 — The gate's reason is visible text, not a tooltip

- status: `active`
- user-visible: `yes`
- decided: `2026-09-15`
- supersedes: D-018 (partial — how the disabled action carries its reason)
- superseded-by: —
- relates to: `AC-2`, `AC-3`, `AC-9`, `D-011`, `D-018`, `D-029`

**Decision.** When the verdict is not `ready`, the version area renders the D-011
sentence as **visible text beside the disabled action**. The action is not wrapped in a
`PMTooltip`, and the reason is not carried by `title` or `aria-label` alone.

**Reasoning.** D-018 said "disabled with its reason as a tooltip", written before anyone
had the button in front of them. A disabled button receives no pointer events, so a
tooltip anchored to it never opens on hover — which means the sentence AC-2, AC-3 and
AC-9 each quote would be, in practice, unreachable. The criteria are written from the
user's side: the package "shows the action disabled with 'Add at least one component'".
A sentence nobody can surface does not satisfy that, however correct the string is.

The second reason is that a tooltip's content is only in the DOM while it is open, so no
frontend test can assert the sentence without driving a hover that a disabled control
will not emit. That would leave the three criteria verifiable only by eye, in the one
session whose entire job is to make them observable.

The codebase does contain the pattern this rejects — `ContextPackagePane` wraps a
disabled `PMButton` in `PMTooltip label={headerActions.update.lockTooltip}`. That is
precedent for the spelling, not evidence that it works; it has the same defect and is
out of scope to fix here (D-022).

**Rejected.**

- A tooltip, as D-018 wrote it — unreachable on a disabled control, and unassertable.
- Keeping the button enabled and refusing on click so the tooltip works — turns a
  disabled affordance into a trap, and AC-2 and AC-3 both say *disabled*.
- A wrapper span around the disabled button to catch hover — restores the tooltip at the
  cost of a nonstandard control; the sentence is short and belongs on screen anyway.
- Visible text *and* a tooltip carrying the same string — the sentence would appear twice
  in the accessibility tree and twice in any `getByText`.

**Constrains implementation.** The reason renders as visible text whenever
`verdict !== 'ready'`, taken from the single messages file of D-011. Do not wrap the
action in `PMTooltip`. Do not render any reason text when the verdict is `ready`. Do not
change the existing `headerActions.update` tooltip in `ContextPackagePane`.
