# Playbook Change Applier Package

Applies accepted change proposals to playbook artifacts, producing a new version of each.

## One applier per artifact type

`ApplyPlaybookUseCase` (`src/ApplyPlaybookUseCase.ts`) does the orchestration and picks an applier
per step through the `getApplierForType(itemType)` switch, keyed on
`'standard' | 'command' | 'skill'`:

| `itemType` | Applier | Port it needs |
| --- | --- | --- |
| `standard` | `StandardChangesApplier` | `IStandardsPort` |
| `command` | `CommandChangesApplier` | `ICommandsPort` |
| `skill` | `SkillChangesApplier` | `ISkillsPort` |

Each implements `IChangesProposalApplier<Version>` (`src/appliers/IChangesProposalApplier.ts`). The
orchestrator calls only three of its four methods, in this order:

1. `getVersion(artefactId)` — load the current version
2. `applyChangeProposals(source, changeProposals)` — **pure**, returns an
   `ApplyChangeProposalsResult<Version>`; no persistence here
3. `saveNewVersion(version, userId, spaceId, organizationId)` — the only step that writes

Keeping step 2 pure is what lets a proposal be previewed without being applied — don't collapse it
into `saveNewVersion`.

> **`areChangesApplicable` is on the interface but nothing calls it.** It is implemented and unit
> tested in the `@packmind/types` `*ChangeProposalApplier` base classes, yet `ApplyPlaybookUseCase`
> never invokes it. Validation placed there is dead code and will not stop an unsupported proposal
> from reaching `getVersion`/`saveNewVersion` — put guards in `applyChangeProposals` (or fix the
> orchestrator) instead of relying on it.

## Adding an artifact type

The `'standard' | 'command' | 'skill'` union is written out inline in several signatures and switched
on in **six** places inside `ApplyPlaybookUseCase`. Widening it and adding one applier is not enough:
the reporting and rollback paths will silently omit the new type.

1. Add the version type to `ApplierObjectVersions` in
   `packages/types/src/playbookChangeManagement/applier/`, alongside the per-type
   `*ChangeProposalApplier` helpers the appliers build on, and extend
   `getItemTypeFromChangeProposalType`.
2. Add `src/appliers/<Type>ChangesApplier.ts` and import it directly in `ApplyPlaybookUseCase.ts` (there
   is no `src/appliers/index.ts` barrel).
3. Widen every inline `itemType: 'standard' | 'command' | 'skill'` annotation, then update each
   switch in `ApplyPlaybookUseCase`:
   - `getApplierForType` — applier selection
   - `getVersionId` — extracts the saved version's id
   - `addToIdBucket` and `addToUpdatedBucket` — the created/updated result buckets
   - `rollback` — **two** switches, one per `entry.action` (`'created'` → `hardDelete<X>`,
     `'updated'` → `hardDelete<X>Version`), so the port must expose both hard-delete methods or a
     failed apply cannot be rolled back
4. Check the buckets and rollback in a test: only `getVersionId` is exhaustive over the union, so the
   others compile happily with the new type missing.

> **Watch the `command` ↔ `recipe` translation.** The applier side says `command`, but
> `RollbackEntry.type` and the bucket switches use `'standard' | 'recipe' | 'skill'`, with
> `step.itemType === 'command' ? 'recipe' : step.itemType` converting between them. Copying a
> `case 'command'` into a bucket switch silently does nothing. See
> [../commands/CLAUDE.md](../commands/CLAUDE.md) for the wider rename.

## Note

`@packmind/playbook-change-management` is a **different** module — in OSS it aliases to
`packages/editions`. This package (`@packmind/playbook-change-applier`) is the applier itself and has
its own alias. See [../editions/CLAUDE.md](../editions/CLAUDE.md).

Shared package conventions (env tags, layout, `/test` subpath, branded IDs): [../CLAUDE.md](../CLAUDE.md)
