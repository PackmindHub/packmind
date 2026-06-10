<!--
Source: https://miro.com/app/board/uXjVGozTooo=/?moveToWidget=3458764673543780023
Generated: 2026-05-28
Target repo: PackmindHub/packmind-proprietary
Proposed title: Link and unlink Git marketplaces at the organization level
Labels: enhancement, claude-code-assisted
Assignees: (none)
Milestone: (none)
Open-questions handling: Path 3 — proposed answers promoted into Technical hints
-->

## User story

As an **organization admin**,
I want to **link and unlink Git marketplaces for my organization**,
so that **I control which marketplaces my members can use through Packmind**.

## Business value

Marketplaces live on Git (GitHub, GitLab, etc.) and are discovered by individual users today. Without an org-level governance step, every member can pull plugins from any marketplace they find — which makes it impossible for an admin to enforce a curated set of trusted sources.

Linking a marketplace at the organization level makes it visible to every member and traceable to the admin who enrolled it. Unlinking severs Packmind's governance hook without disturbing the underlying Git repo or its in-flight PRs, so admins can confidently roll a marketplace back without breaking work already in progress on the Git side.

## Acceptance criteria

### Rule: Marketplaces are organization-wide

A marketplace, once linked, is visible to all members of the organization. Only admins can link or unlink. The same marketplace cannot be linked twice in the same org.

**Scenario: Admin links a marketplace, members see it**

- **Given** repo `Acme/Marketplace` is a Claude-compatible marketplace
- **When** Quentin (admin) links it to org `Acme`
- **Then** every member of `Acme` can see the marketplace and its plugins

**Scenario: Admin can link a marketplace and is traced as the linker**

- **Given** Cédric is admin of org `Acme`
- **When** he links a new marketplace
- **Then** the marketplace is added with `addedBy = Cédric`

**Scenario: Member cannot link a marketplace**

- **Given** Emilie is a member (not admin) of org `Acme`
- **Then** she cannot link a new marketplace

**Scenario: Linking the same marketplace twice is rejected**

- **Given** `Acme/Marketplace` is already linked to `Acme`
- **When** Quentin tries to link it again
- **Then** the system returns the error: _"The marketplace Acme/Marketplace has already been linked to your organization"_

### Rule: A linkable repo must expose a valid marketplace descriptor

A Git repository can only be linked as a marketplace if it contains a valid `marketplace.json`. Without that descriptor, Packmind has no contract to govern.

**Scenario: Linking is refused when no descriptor is found**

- **Given** `acme/claude-not-a-marketplace` does not contain a `marketplace.json`
- **When** Cédric links it
- **Then** he is informed the repository cannot be managed as a marketplace

### Rule: Unlinking severs Packmind governance but leaves open PRs alive

Unlinking is a governance action on the Packmind side. It removes the marketplace from Packmind and cleans the Git-side configuration Packmind owns, but it does not touch in-flight pull requests — the Git platform decides what happens to them.

**Scenario: Marketplace can be unlinked from Packmind**

- **Given** `acme/claude-marketplace` is linked in Packmind, in org `Acme`
- **When** Cédric unlinks the marketplace
- **Then** it is removed from Packmind, open PRs are left as-is, and Packmind-owned Git repo configuration is cleaned up

## Out of scope

- **Per-user marketplace links** — marketplaces are an org-wide concept; individual members do not link their own. _(inferred — confirm)_
- **Disposition of in-flight PRs at unlink time** — the Git platform owns this; Packmind does not close, merge, or comment on PRs as part of unlinking.
- **Deleting the marketplace repo from Git** — unlinking is strictly a Packmind governance action; the underlying Git repo is never touched.

## Technical hints

- **Linking transport: GitHub App.** The link/unlink flow rides on a GitHub App — it carries the org-level OAuth scopes and the webhook for repo events that Packmind needs. (Decision parked on the workshop frame; confirm the App identifier and the required scopes before scoping the integration work.)
- **Git refresh runs as a background job.** Reconciling the marketplace state after link/unlink does not happen inline with the admin's request — the admin gets an immediate confirmation while a worker handles the refresh. (Confirm the queue/worker the job lands on, and whether retry/backoff semantics need a small spec.)
- **Likely affected areas**: marketplace domain package (link/unlink use cases), org-scoped repository for marketplace enrollments, GitHub App integration layer, background job queue, frontend admin surface for the link/unlink flow.
- **Considerations**:
  - Authorization gate must run before the linking call — surface the "member cannot link" error at the use-case boundary, not just in the UI.
  - Idempotency: the duplicate-link error message is part of the contract — wire it as a typed domain error, not a raw exception.
  - Validation of `marketplace.json` happens before persistence; fail fast with a user-visible message that names the missing descriptor.

## Links

- Example Mapping (Miro): https://miro.com/app/board/uXjVGozTooo=/?moveToWidget=3458764673543780023

## Definition of Done

- [ ] Implementation matches the acceptance criteria above
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing (where relevant)
- [ ] `nx lint` passes on edited projects
- [ ] `nx typecheck` / build passes on edited projects
- [ ] CHANGELOG updated under the Unreleased section
- [ ] End-user documentation updated under `apps/doc/` (only if user-facing)
- [ ] Feature flag wired in (only if the change is gated — name the flag, audience, and rollback plan)
- [ ] Amplitude events tracked (list each event name and the properties to capture; skip only if the change has no user-observable interaction)
