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

Each implements `IChangesProposalApplier<Version>` (`src/appliers/IChangesProposalApplier.ts`), a
four-method contract that must be honoured in order:

1. `areChangesApplicable(changeProposals)` — cheap guard, before any I/O
2. `getVersion(artefactId)` — load the current version
3. `applyChangeProposals(source, changeProposals)` — **pure**, returns an
   `ApplyChangeProposalsResult<Version>`; no persistence here
4. `saveNewVersion(version, userId, spaceId, organizationId)` — the only step that writes

Keeping step 3 pure is what lets a proposal be previewed without being applied — don't collapse it
into `saveNewVersion`.

## Adding an artifact type

1. Add the version type to `ApplierObjectVersions` in
   `packages/types/src/playbookChangeManagement/applier/`, alongside the per-type
   `*ChangeProposalApplier` helpers the appliers build on.
2. Widen the `itemType` union and add the `case` in `getApplierForType`.
3. Add `src/appliers/<Type>ChangesApplier.ts` and export it from `src/appliers/index.ts`.

## Note

`@packmind/playbook-change-management` is a **different** module — in OSS it aliases to
`packages/editions`. This package (`@packmind/playbook-change-applier`) is the applier itself and has
its own alias. See [../editions/CLAUDE.md](../editions/CLAUDE.md).

Shared package conventions (env tags, layout, `/test` subpath, branded IDs): [../CLAUDE.md](../CLAUDE.md)
