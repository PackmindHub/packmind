# Dead code audit — `packages/`

Audit of unused code across the packages in `packages/`. "Dead" means an export that
is **never referenced from production code**: either referenced nowhere at all, or only
from `*.spec.ts` / `*.stories.tsx` (i.e. the only thing keeping it alive is its own test).

## Scope

**`packages/types` and `packages/editions` are excluded.** Both are shared with a
proprietary repository that is not visible here, so an export that looks unused from
inside this monorepo may well be consumed there. Neither package can be judged from this
repo alone.

For `editions` the structure makes this visible: `src/index.ts` re-exports only `./oss/*`,
implying a paired non-OSS tree outside this repo, and `oss/linter` declares
`linterSchemas: [] = []` while re-declaring its own copies of the linter entity types —
an OSS stub whose real implementation lives elsewhere.

### Cross-checked against `PackmindHub/packmind-proprietary`

Every remaining candidate was re-checked against the proprietary repo (cloned at
`ed74410`). That repo is a **superset** of this monorepo: it vendors the same `packages/`
and `apps/` trees and adds proprietary-only packages (`linter`, `plugins`,
`spaces-management`, `playbook-change-management`, `amplitude`, `crisp`,
`import-practices-legacy`).

Two consequences:

1. **All 28 candidate files exist in the proprietary repo** — it carries its own copy of
   each. So "does the file exist there" cannot discriminate; only "is the symbol
   *referenced* there" can.
2. **Mirrored copies can diverge.** `apps/api/src/app/shared/PackmindApp.spec.ts` uses
   `mockQueueFactory` in the proprietary repo and does not in this one. So the check had
   to scan the whole proprietary tree, not just its proprietary-only packages.

The cross-check rescued three items, now excluded from the results:

| Symbol | Referenced in proprietary by |
| --- | --- |
| `SpaceScopedRepository` (`node-utils`, 33 LOC) | `packages/playbook-change-management/src/infra/repositories/ChangeProposalRepository.ts` — proprietary-only |
| `PMList` (`ui`) | `apps/frontend/src/domain/detection/components/ActiveConfigurationSection/sections/ToReviewSection.tsx`, `…/DetectionAccordions/DetectabilitySection.tsx` — proprietary-only |
| `mockQueueFactory` (`node-utils`) | `apps/api/src/app/shared/PackmindApp.spec.ts` — diverged copy, test-only |

Everything else below is **dead in both repos**. Notably the `I<UseCase>` ports in
`skills` / `standards` / `coding-agent` — the previous open question — are implemented
nowhere in either repo.

**Removal caveat:** because the proprietary repo vendors these same files, deleting one
here without the matching deletion there will simply reappear on the next sync (and any
mirrored spec still referencing it will break that build). Deletions need to land in both.

## Method

Two complementary passes over all git-tracked files in the repo (`apps/` + `packages/`):

1. **Import graph** — module specifiers (static, dynamic, `require`) resolved through
   `tsconfig.base.json` path aliases, to find files no production file imports.
2. **Symbol reachability** — every exported symbol of every `packages/**` source file
   matched against an identifier index of the whole repo (which also catches
   string-literal and JSX references).

Re-export mentions inside `packages/**/index.ts` barrels are not counted as usage — a
barrel only widens the public surface, it does not consume anything.

Every candidate was then re-checked against **all** file types (`project.json`,
Dockerfiles, `docker-compose*.yml`, jest configs, `*.md`) to catch code wired in by
path or by name rather than by import. That pass eliminated these false positives,
which are **live** and were dropped from the results:

| File | Wired in by |
| --- | --- |
| `migrations/src/runMigrationsDocker.ts` | `dockerfile/Dockerfile.api` entrypoint, both compose files |
| `migrations/scripts/fix-docker-imports.mjs` | `migrations/project.json` build target |
| `migrations/src/migrations/*.ts` (123 classes) | glob-loaded — `migrations: ['…/migrations/*.js']` |
| `standards/samples/generateSamples.ts` | `standards/project.json` `generate-samples` target |
| `ui/src/test-setup.ts` | `ui/jest.config.ts` `setupFilesAfterEach` |

**Caveat:** this is static analysis, not a type-checker run. Confirm intent before
deleting anything that is deliberately staged for near-term work.

## Summary

Excluding `packages/types` and `packages/editions`, and after the proprietary cross-check:
**26 dead files, ~560 LOC**, plus **20 dead exports** inside otherwise-live files.

| Package | Dead files | LOC | of which test-only |
| --- | --- | --- | --- |
| `coding-agent` | 4 | 148 | 1 |
| `accounts` | 4 | 133 | 0 |
| `ui` | 5 | 114 | 1 |
| `migrations` | 1 | 47 | 0 |
| `skills` | 5 | 46 | 0 |
| `node-utils` | 3 | 25 | 1 |
| `assets` | 1 | 16 | 0 |
| `standards` | 1 | 14 | 0 |
| `llm` | 1 | 12 | 0 |
| `frontend` | 1 | 5 | 0 |

The table counts production source files only. Packages with **no** dead production
file: `commands`, `deployments`, `feature-flags`, `git`, `integration-tests`,
`linter-ast`, `linter-execution`, `spaces`, `test-utils` — though `deployments` does have
two unused files under `test/` (see §5) and several of these packages have dead
individual exports.

## Highest-value findings

### 1. `ManageOrganizationUseCase` — a fully orphaned use case (117 LOC)

`packages/accounts/src/application/useCases/manageOrganizationUseCase/ManageOrganizationUseCase.ts`
is exported from `useCases/index.ts` and referenced from nowhere else — no Hexa, no
NestJS module, no test. The largest single dead unit in scope.

Alongside it, two error classes that nothing throws or catches:
`InvitationConfigurationError`, `PasswordResetConfigurationError`.

### 2. Unimplemented use-case ports (8 files)

Port interfaces with no implementation, no injection site and no test:

- `skills/src/domain/useCases/`: `ICreateSkill`, `IDeleteSkill`, `IFindSkillBySlug`,
  `IGetSkillById`, `IListSkillsBySpace` — the whole directory
- `coding-agent/src/domain/useCases/`: `IPrepareCommandsDeploymentUseCase`,
  `IPrepareStandardsDeploymentUseCase` (plus their `…Command` types)
- `standards/src/domain/useCases/IDeployStandardsToGit.ts` (`DeployStandardsToGitCommand`)

Also `standards/src/domain/useCases/IGetRuleExamples.ts` (`IGetRuleExamples`) as a dead
export inside a file that is otherwise reachable.

Confirmed: none of these ports is implemented in the proprietary repo either.

### 3. Leftovers from finished migrations

- `coding-agent/…/packmind-update-playbook/steps/apply-changes.ts` (`APPLY_CHANGES`, 52 LOC):
  superseded by the version-routed `packmind-versions/<v>/apply-changes.ts` files.
  `UpdatePlaybookDeployer` now lists `steps/apply-changes.md` under **`deleteItems`** — the
  constant is the stranded source of a file the deployer actively removes.
- `migrations/scripts/fix-docker-imports.js`: an older `.ts`-rewriting variant of
  `fix-docker-imports.mjs`. Only the `.mjs` is referenced by `project.json`.
- `accounts/src/domain/entities/TrialActivationToken.ts`: an **empty file**.
- `node-utils/types.ts`: a stray root-level `export * from '@packmind/types'` re-export
  that nothing imports.
- `llm/src/types/LLMRuntimeConfig.ts` (`LLMRuntimeConfig`): unused config type.
- `frontend/src/domains/account/components/SettingsPageDataTestIds.ts`
  (`SettingsPageDataTestId`): a `data-testid` enum no component or page object uses.
- `assets/icons/ContinueIcon.tsx`: unreferenced icon.

### 4. Documented-but-dead API

These are advertised in generated Packmind standards / skill catalogs, so agents will
keep suggesting them even though no code uses them. Either wire them up or drop them
*together with* their documentation:

| Symbol | Documented in |
| --- | --- |
| `PMCarousel`, `PMTwoColumnsLayout`, `pmUseToken`, `PMLabel` (`ui`) | `working-with-pm-design-kit` component catalog |
| `OPENAI_ENDPOINT`, `ANTHROPIC_ENDPOINT` (`llm`) | `packages/llm/CLAUDE.md` |
| `extractCodeFromMarkdown` (`node-utils`) | `packages/node-utils/CLAUDE.md` |

### 5. Test-only code (alive solely because of its own test)

| Symbol / file | Kept alive by |
| --- | --- |
| `coding-agent/…/GenericCommandSectionWriter.ts` (58 LOC) | `GenericCommandSectionWriter.spec.ts` only |
| `node-utils/src/text/MarkdownCleaner.ts` (`extractCodeFromMarkdown`) | `MarkdownCleaner.spec.ts` only |
| `ui/…/PMLabel/PMLabel.tsx` | three `*.stories.tsx` only |
| `deployments/test/distributionFactory.ts`, `deployments/test/activeDistributedPackagesByTargetFactory.ts` | nothing at all — unused *test* factories |

Note `GenericCommandSectionWriter` / `GenericStandardSectionWriter` still appear in
`packages/coding-agent/CLAUDE.md`, so check whether the generic section-writer path was
abandoned mid-refactor before deleting.

## Full inventory — dead files

#### `accounts`

| File | LOC | Status | Exports |
|---|---|---|---|
| `src/application/useCases/manageOrganizationUseCase/ManageOrganizationUseCase.ts` | 117 | UNUSED | CreateOrganizationRequest, ManageOrganizationUseCase |
| `src/domain/entities/TrialActivationToken.ts` | 1 | UNUSED | — |
| `src/domain/errors/InvitationConfigurationError.ts` | 8 | UNUSED | InvitationConfigurationError |
| `src/domain/errors/PasswordResetConfigurationError.ts` | 7 | UNUSED | PasswordResetConfigurationError |

#### `assets`

| File | LOC | Status | Exports |
|---|---|---|---|
| `icons/ContinueIcon.tsx` | 16 | UNUSED | ContinueIcon |

#### `coding-agent`

| File | LOC | Status | Exports |
|---|---|---|---|
| `src/domain/useCases/IPrepareCommandsDeploymentUseCase.ts` | 19 | UNUSED | PrepareCommandsDeploymentCommand, IPrepareCommandsDeploymentUseCase |
| `src/domain/useCases/IPrepareStandardsDeploymentUseCase.ts` | 19 | UNUSED | PrepareStandardsDeploymentCommand, IPrepareStandardsDeploymentUseCase |
| `src/infra/repositories/defaultSkillsDeployer/skills/packmind-update-playbook/steps/apply-changes.ts` | 52 | UNUSED | APPLY_CHANGES |
| `src/infra/repositories/genericSectionWriter/GenericCommandSectionWriter.ts` | 58 | TEST_ONLY | GenericCommandSectionWriterOpts, GenericCommandSectionWriter |

#### `frontend`

| File | LOC | Status | Exports |
|---|---|---|---|
| `src/domains/account/components/SettingsPageDataTestIds.ts` | 5 | UNUSED | SettingsPageDataTestId |

#### `llm`

| File | LOC | Status | Exports |
|---|---|---|---|
| `src/types/LLMRuntimeConfig.ts` | 12 | UNUSED | LLMRuntimeConfig |

#### `migrations`

| File | LOC | Status | Exports |
|---|---|---|---|
| `scripts/fix-docker-imports.js` | 47 | UNUSED | — |

#### `node-utils`

| File | LOC | Status | Exports |
|---|---|---|---|
| `src/jobs/domain/QueueFactory.ts` | 7 | UNUSED | QueueFactory |
| `src/text/MarkdownCleaner.ts` | 16 | TEST_ONLY | extractCodeFromMarkdown |
| `types.ts` | 2 | UNUSED | — |

#### `skills`

| File | LOC | Status | Exports |
|---|---|---|---|
| `src/domain/useCases/ICreateSkill.ts` | 6 | UNUSED | ICreateSkill |
| `src/domain/useCases/IDeleteSkill.ts` | 10 | UNUSED | IDeleteSkill |
| `src/domain/useCases/IFindSkillBySlug.ts` | 10 | UNUSED | IFindSkillBySlug |
| `src/domain/useCases/IGetSkillById.ts` | 8 | UNUSED | IGetSkillById |
| `src/domain/useCases/IListSkillsBySpace.ts` | 12 | UNUSED | IListSkillsBySpace |

#### `standards`

| File | LOC | Status | Exports |
|---|---|---|---|
| `src/domain/useCases/IDeployStandardsToGit.ts` | 14 | UNUSED | DeployStandardsToGitCommand |

#### `ui`

| File | LOC | Status | Exports |
|---|---|---|---|
| `src/lib/components/content/PMCarousel/PMCarousel.tsx` | 15 | UNUSED | PMCarousel |
| `src/lib/components/content/PMTwoColumnsLayout/PMTwoColumnsLayout.tsx` | 42 | UNUSED | PMTwoColumnsLayout |
| `src/lib/components/form/PMLabel/PMLabel.tsx` | 32 | TEST_ONLY | PMLabel |
| `src/lib/components/navigation/PMDataList/PMDataList.recipe.ts` | 22 | UNUSED | pmDataListRecipe |
| `src/lib/hooks/useToken.ts` | 3 | UNUSED | pmUseToken |

## Full inventory — dead exports inside live files

Exports with **zero** references anywhere in the repo, including inside their own file.

| Package | Dead exports | File |
| --- | --- | --- |
| `accounts` | `InvitationResendRecord` | `src/application/services/InvitationService.ts` |
| `deployments` | `DEPLOYMENTS_VERSION` | `src/index.ts` |
| `deployments` | `createActiveDistributedPackagesByTarget` | `test/activeDistributedPackagesByTargetFactory.ts` |
| `deployments` | `distributionFactory` | `test/distributionFactory.ts` |
| `git` | `GitlabFile`, `GitlabBranch` | `src/infra/repositories/gitlab/types.ts` |
| `linter-ast` | `ParseResult` | `src/core/types/ast.types.ts` |
| `llm` | `OPENAI_ENDPOINT`, `ANTHROPIC_ENDPOINT` | `src/constants/defaultModels.ts` |
| `skills` | `AllowedFrontmatterField` | `src/domain/SkillProperties.ts` |
| `standards` | `getAllSampleIds` | `samples/index.ts` |
| `standards` | `IGetRuleExamples` | `src/domain/useCases/IGetRuleExamples.ts` |
| `ui` | `PMColorSwatchProps` | `src/lib/components/content/PMColorSwatch.tsx` |
| `ui` | `PMButtonGroupProps` | `src/lib/components/form/PMButton/PMButton.tsx` |
| `ui` | `PMCheckboxCheckedChangeDetails` | `src/lib/components/form/PMCheckbox/PMCheckbox.tsx` |
| `ui` | `PMFieldProps` | `src/lib/components/form/PMField/PMField.tsx` |
| `ui` | `PMMenuRoot`, `PMMenuTrigger` | `src/lib/components/form/PMMenu/PMMenu.tsx` |
| `ui` | `PMSwitchCheckedChangeDetails` | `src/lib/components/form/PMSwitch/PMSwitch.tsx` |
| `ui` | `PMPortalProps` | `src/lib/components/layout/PMPortal/PMPortal.tsx` |

## Not reported as dead (deliberately)

- **`packages/types`, `packages/editions`** — out of scope, shared with a proprietary
  repository.
- **`ui` `*Props` types** — a design kit's prop types are public API even when only the
  component itself references them. Only `Props` types with *zero* references anywhere
  (listed above) are flagged.
- **`migrations/src/migrations/*.ts`** — glob-loaded by TypeORM, never imported.
- **`packages/test-utils`, `packages/integration-tests`** — test-only by design.
- **Over-exported internal helpers** — e.g. `formatYamlScalar` / `formatEntryValue` in
  `coding-agent/…/YamlFrontmatterUtils.ts`, `GIT_PROVIDER_DISPLAY_NAME_MAX_LENGTH` in
  `git/…/validateDisplayName.ts`, `NAME_MAX_LENGTH` / `COMPATIBILITY_MAX_LENGTH` in
  `skills/…/SkillValidator.ts`. These are used inside their own file; the `export`
  keyword is redundant but the code is not dead.

## Suggested order of removal

Cheapest and lowest-risk first, one commit per step:

1. Zero-risk deletes: empty `accounts/…/TrialActivationToken.ts`, `node-utils/types.ts`,
   `migrations/scripts/fix-docker-imports.js`, `coding-agent/…/steps/apply-changes.ts`,
   `assets/icons/ContinueIcon.tsx`, `frontend/…/SettingsPageDataTestIds.ts`,
   `llm/…/LLMRuntimeConfig.ts`.
2. `ManageOrganizationUseCase` + the two unused `accounts` error classes.
3. `ui` dead components/hooks, updating the `working-with-pm-design-kit` catalog in the
   same commit.
4. Dead individual exports (`git` GitLab types, `linter-ast` `ParseResult`,
   `deployments` unused test factories, `ui` prop types, …).
5. Test-only code: delete implementation **and** its spec together, or wire the
   implementation up if it was meant to ship.
6. The unimplemented use-case ports (§2) — cleared by the proprietary cross-check.

Each step must be mirrored in `PackmindHub/packmind-proprietary`, which vendors the same
files.
