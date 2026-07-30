# Dead code audit — `packages/`

Audit of unused code across every package in `packages/`. "Dead" means an export that
is **never referenced from production code**: either referenced nowhere at all, or only
from `*.spec.ts` / `*.stories.tsx` (i.e. the only thing keeping it alive is its own test).

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

**55 dead files, ~1 130 LOC**, plus **80 dead exports** inside otherwise-live files.

| Package | Dead files | LOC | of which test-only |
| --- | --- | --- | --- |
| `types` | 26 | 530 | 2 |
| `coding-agent` | 4 | 148 | 1 |
| `accounts` | 4 | 133 | 0 |
| `ui` | 6 | 116 | 1 |
| `node-utils` | 4 | 58 | 1 |
| `migrations` | 1 | 47 | 0 |
| `skills` | 5 | 46 | 0 |
| `assets` | 1 | 16 | 0 |
| `standards` | 1 | 14 | 0 |
| `llm` | 1 | 12 | 0 |
| `editions` | 1 | 9 | 0 |
| `frontend` | 1 | 5 | 0 |

The table counts production source files only. Packages with **no** dead production
file: `commands`, `deployments`, `feature-flags`, `git`, `integration-tests`,
`linter-ast`, `linter-execution`, `spaces`, `test-utils` — though `deployments` does have
two unused files under `test/` (see §6) and several of these packages have dead
individual exports.

## Highest-value findings

### 1. `ManageOrganizationUseCase` — a fully orphaned use case (117 LOC)

`packages/accounts/src/application/useCases/manageOrganizationUseCase/ManageOrganizationUseCase.ts`
is exported from `useCases/index.ts` and referenced from nowhere else — no Hexa, no
NestJS module, no test. The largest single dead unit in `packages/`.

### 2. Unemitted domain events (11 files)

Events are published and subscribed **by class reference** (`emitter.on(eventClass.eventName, …)`
in `PackmindEventEmitterService`), so there is no dynamic string dispatch that could
hide a usage. These event classes are declared but never constructed or listened to:

- `types/src/spaces/events/`: `SpaceDeletedEvent`, `SpaceRenamedEvent`, `SpacePinnedEvent`,
  `SpaceUnpinnedEvent`, `SpaceVisibilityUpdatedEvent`
- `types/src/playbookChangeManagement/events/`: `ChangeProposalAcceptedEvent`
  (plus its `isChangeProposalEdited` helper), `ChangeProposalRejectedEvent`,
  `ChangeProposalSubmittedEvent`
- `types/src/linter/events/`: `LinterCalledEvent`, `LinterRuleSeverityUpdatedEvent`
- `types/src/spaces-management/events/`: `PlaybookArtefactMovedEvent`

`types/src/events/SystemEvent.ts` (the `SystemEvent` base class) is **test-only** — its
only consumer is `node-utils/src/hexa/events/PackmindListener.spec.ts`. Every real event
extends `UserEvent`.

### 3. `I*UseCase` contract aliases in `types/src/linter/contracts/` (~25 dead type aliases)

Each contract file declares a `Command` type, a `Response` type, and an
`IUseCase<Command, Response>` alias. Consumers (`editions/oss/linter/LinterAdapter.ts`,
`apps/cli/**/LinterGateway.ts`) import the `Command`/`Response` types and spell the
method signatures out directly, so most `I…` aliases are never used. Live counter-example:
`IGetActiveDetectionProgramForRule` *is* used by the CLI gateway, while
`IGetActiveDetectionProgram` is not — so this needs per-symbol pruning, not a folder-wide
delete. Same shape in `types/src/skills/contracts/` (`ICreateSkillUseCase`,
`IUpdateSkillUseCase`) and `packages/skills/src/domain/useCases/` (5 fully dead files).

### 4. Leftovers from finished migrations

- `coding-agent/…/packmind-update-playbook/steps/apply-changes.ts` (`APPLY_CHANGES`, 52 LOC):
  superseded by the version-routed `packmind-versions/<v>/apply-changes.ts` files.
  `UpdatePlaybookDeployer` now lists `steps/apply-changes.md` under **`deleteItems`** — the
  constant is the stranded source of a file the deployer actively removes.
- `migrations/scripts/fix-docker-imports.js`: an older `.ts`-rewriting variant of
  `fix-docker-imports.mjs`. Only the `.mjs` is referenced by `project.json`.
- `types/src/llm/AiAgentTypes.ts` (32 LOC): `AiAgentType`, `AiAgentTypes`,
  `AiAgentConfigFile`, `JunieContentCheckResult`, `ClaudeContentCheckResult` — the
  per-agent content-check types, all unused.
- `accounts/src/domain/entities/TrialActivationToken.ts`: an **empty file**.
- `node-utils/types.ts`: a stray root-level `export * from '@packmind/types'` re-export
  that nothing imports.

### 5. Documented-but-dead API

These are advertised in generated Packmind standards / skill catalogs, so agents will
keep suggesting them even though no code uses them. Either wire them up or drop them
*together with* their documentation:

| Symbol | Documented in |
| --- | --- |
| `SpaceScopedRepository` (`node-utils`, 33 LOC) | `packages/.claude/rules/packmind/standard-scoped-repository-patterns.md` + `.cursor`/`.github`/`.gitlab` mirrors |
| `PMCarousel`, `PMTwoColumnsLayout`, `PMList`, `pmUseToken`, `PMLabel` (`ui`) | `working-with-pm-design-kit` component catalog |
| `SystemEvent` (`types`) | `packages/.claude/rules/packmind/standard-domain-events.md` |
| `OPENAI_ENDPOINT`, `ANTHROPIC_ENDPOINT` (`llm`) | `packages/llm/CLAUDE.md` |
| `extractCodeFromMarkdown` (`node-utils`) | `packages/node-utils/CLAUDE.md` |
| `mockQueueFactory` (`node-utils`) | `packages/node-utils/CLAUDE.md` |

### 6. Test-only code (alive solely because of its own test)

| Symbol / file | Kept alive by |
| --- | --- |
| `coding-agent/…/GenericCommandSectionWriter.ts` (58 LOC) | `GenericCommandSectionWriter.spec.ts` only |
| `node-utils/src/text/MarkdownCleaner.ts` (`extractCodeFromMarkdown`) | `MarkdownCleaner.spec.ts` only |
| `ui/…/PMLabel/PMLabel.tsx` | three `*.stories.tsx` only |
| `types/…/applier/testHelpers.ts` | the three applier specs (legitimate test helper, but it sits in a production `src/` tree) |
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

#### `editions`

| File | LOC | Status | Exports |
|---|---|---|---|
| `src/oss/amplitude/domain/entities/AmplitudeNodeEvent.ts` | 9 | UNUSED | AmplitudeNodeEvent |

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
| `src/repositories/SpaceScopedRepository.ts` | 33 | UNUSED | SpaceScopedRepository |
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

#### `types`

| File | LOC | Status | Exports |
|---|---|---|---|
| `src/events/SystemEvent.ts` | 36 | TEST_ONLY | SystemEventPayload, SystemEvent |
| `src/linter/contracts/IAssessRuleDetectionJob.ts` | 18 | UNUSED | AssessRuleDetectionJobCommand, IAssessRuleDetectionJob |
| `src/linter/contracts/IGenerateProgramJob.ts` | 22 | UNUSED | GenerateProgramJobCommand, IGenerateProgramJob |
| `src/linter/contracts/ISoftDeleteLinterArtefactsByRule.ts` | 14 | UNUSED | SoftDeleteLinterArtefactsByRuleCommand, SoftDeleteLinterArtefactsByRuleResponse, ISoftDeleteLinterArtefactsByRule |
| `src/linter/contracts/IStartRuleDetectionAssessmentUseCase.ts` | 9 | UNUSED | IStartRuleDetectionAssessmentUseCase |
| `src/linter/contracts/IUpdateHeuristicsFollowingChatbotInput.ts` | 19 | UNUSED | UpdateHeuristicsFollowingChatbotInputCommand, UpdateHeuristicsFollowingChatbotInputResponse, IUpdateHeuristicsFollowingChatbotInput |
| `src/linter/DetectionProgramRuleInput.ts` | 13 | UNUSED | DetectionProgramRuleInput |
| `src/linter/events/LinterCalledEvent.ts` | 11 | UNUSED | LinterCalledPayload, LinterCalledEvent |
| `src/linter/events/LinterRuleSeverityUpdatedEvent.ts` | 13 | UNUSED | LinterRuleSeverityUpdatedPayload, LinterRuleSeverityUpdatedEvent |
| `src/linter/GenerateProgramInput.ts` | 16 | UNUSED | GenerateProgramInput |
| `src/llm/AiAgentTypes.ts` | 32 | UNUSED | AiAgentType, AiAgentTypes, AiAgentConfigFile, JunieContentCheckResult, … |
| `src/llm/errors/AiNotConfigured.ts` | 16 | UNUSED | AiNotConfigured |
| `src/playbookChangeManagement/applier/testHelpers.ts` | 34 | TEST_ONLY | createChangeProposalFactory |
| `src/playbookChangeManagement/contracts/IApplyCommandChangeProposalUseCase.ts` | 22 | UNUSED | ApplyCommandChangeProposalCommand, ApplyCommandChangeProposalResponse, IApplyCommandChangeProposalUseCase |
| `src/playbookChangeManagement/contracts/IListCommandChangeProposalsUseCase.ts` | 23 | UNUSED | ChangeProposalWithOutdatedStatus, ListCommandChangeProposalsCommand, ListCommandChangeProposalsResponse, IListCommandChangeProposalsUseCase |
| `src/playbookChangeManagement/contracts/IRejectCommandChangeProposalUseCase.ts` | 21 | UNUSED | RejectCommandChangeProposalCommand, RejectCommandChangeProposalResponse, IRejectCommandChangeProposalUseCase |
| `src/playbookChangeManagement/events/ChangeProposalAcceptedEvent.ts` | 50 | UNUSED | ChangeProposalAcceptedPayload, ChangeProposalAcceptedEvent, isChangeProposalEdited |
| `src/playbookChangeManagement/events/ChangeProposalRejectedEvent.ts` | 19 | UNUSED | ChangeProposalRejectedPayload, ChangeProposalRejectedEvent |
| `src/playbookChangeManagement/events/ChangeProposalSubmittedEvent.ts` | 21 | UNUSED | ChangeProposalSubmittedPayload, ChangeProposalSubmittedEvent |
| `src/skills/errors/SkillAlreadyExistsError.ts` | 42 | UNUSED | SkillAlreadyExistsError |
| `src/spaces-management/events/PlaybookArtefactMovedEvent.ts` | 17 | UNUSED | PlaybookArtefactMovedPayload, PlaybookArtefactMovedEvent |
| `src/spaces/events/SpaceDeletedEvent.ts` | 13 | UNUSED | SpaceDeletedPayload, SpaceDeletedEvent |
| `src/spaces/events/SpacePinnedEvent.ts` | 11 | UNUSED | SpacePinnedPayload, SpacePinnedEvent |
| `src/spaces/events/SpaceRenamedEvent.ts` | 14 | UNUSED | SpaceRenamedPayload, SpaceRenamedEvent |
| `src/spaces/events/SpaceUnpinnedEvent.ts` | 11 | UNUSED | SpaceUnpinnedPayload, SpaceUnpinnedEvent |
| `src/spaces/events/SpaceVisibilityUpdatedEvent.ts` | 13 | UNUSED | SpaceVisibilityUpdatedPayload, SpaceVisibilityUpdatedEvent |

#### `ui`

| File | LOC | Status | Exports |
|---|---|---|---|
| `src/lib/components/content/PMCarousel/PMCarousel.tsx` | 15 | UNUSED | PMCarousel |
| `src/lib/components/content/PMTwoColumnsLayout/PMTwoColumnsLayout.tsx` | 42 | UNUSED | PMTwoColumnsLayout |
| `src/lib/components/form/PMLabel/PMLabel.tsx` | 32 | TEST_ONLY | PMLabel |
| `src/lib/components/navigation/PMDataList/PMDataList.recipe.ts` | 22 | UNUSED | pmDataListRecipe |
| `src/lib/components/typography/PMList.tsx` | 2 | UNUSED | PMList |
| `src/lib/hooks/useToken.ts` | 3 | UNUSED | pmUseToken |

## Full inventory — dead exports inside live files

Exports with **zero** references anywhere in the repo, including inside their own file.

### `types`

`SanitizedUser`, `CreateUser` (`accounts/User.ts`) · `RepositoryDeploymentStatus`,
`TargetDeploymentStatus` (`deployments/contracts/IGetDeploymentOverview.ts`) ·
`PackageWithArtefactsResponse` (`deployments/contracts/PackageResponse.ts`) ·
`RepositorySkillDeploymentStatus`, `TargetSkillDeploymentStatus`
(`deployments/SkillDeploymentOverview.ts`) · `RepositoryStandardDeploymentStatus`,
`TargetStandardDeploymentStatus` (`deployments/StandardDeploymentOverview.ts`) ·
`GitProviderAuthMethods` (`git/GitProvider.ts`) · `getAllProgrammingLanguages`
(`languages/ProgrammingLanguage.ts`) · `getProviderMetadata`, `getAllProviders`,
`getConfigurableProviders` (`llm/LLMProviderMetadata.ts`) · `CreationChangeProposalTypes`,
`RemoveChangeProposalTypes` (`playbookChangeManagement/ChangeProposalType.ts`) ·
`IApplyChangeProposalsUseCase` (`playbookChangeManagement/contracts/IApplyChangeProposals.ts`) ·
`IRecomputeConflictsUseCase` (`playbookChangeManagement/contracts/IRecomputeConflicts.ts`) ·
`ICreateSkillUseCase` (`skills/contracts/CreateSkillUseCase.ts`) · `IUpdateSkillUseCase`
(`skills/contracts/UpdateSkillUseCase.ts`) · `isSpaceColor` (`spaces/SpaceColor.ts`) ·
`CreateStandardWithExamplesResponse` (`standards/contracts/ICreateStandardWithExamplesUseCase.ts`) ·
`PublicEmptyPackmindCommand` (`UseCase.ts`)

`types/src/linter/` — `createActiveDetectionProgramId`, `ActiveDetectionProgramWithRelations`,
`createDetectionProgramId`, `createDetectionHeuristicsId`, `RuleFeasibility`,
`AssessmentDetectionReadiness`, `createRuleDetectionAssessmentId`, `DetectionLogMessageType`,
plus the contract aliases `IComputeRuleLanguageDetectionStatusUseCase`,
`IGetStandardRulesDetectionStatusUseCase`, `ICopyDetectionHeuristics`,
`ICopyDetectionProgramsToNewRule`, `ICopyLinterArtefacts`, `ICopyRuleDetectionAssessments`,
`ICreateDetectionHeuristics`, `ICreateDetectionProgram`, `ICreateEmptyRuleDetectionAssessment`,
`ICreateNewDetectionProgramVersion`, `IGenerateProgramUseCase`, `IGetActiveDetectionProgram`,
`IGetAllDetectionProgramsByRule`, `IGetDetectionHeuristics`, `IGetDetectionProgramMetadata`,
`IGetRuleDetectionAssessment`, `IListDetectionProgramUseCase`, `IStartProgramGenerationUseCase`,
`ITestProgramExecutionUseCase`, `IUpdateActiveDetectionProgramUseCase`,
`IUpdateActiveDetectionProgramSeverityUseCase`, `IUpdateDetectionProgramUseCase`,
`IUpdateDetectionProgramStatusUseCase`, `IUpdateRuleDetectionHeuristics`,
`IUpdateRuleDetectionStatusAfterUpdateUseCase`

Also note `types/src/ai/prompts/types.ts` is not reachable from `types/src/index.ts` (the
barrel does not list `./ai`); its only importer is `types/src/linter/DetectionProgramMetadata.ts`.

### Other packages

| Package | Dead exports |
| --- | --- |
| `accounts` | `InvitationResendRecord` (`services/InvitationService.ts`) |
| `deployments` | `DEPLOYMENTS_VERSION` (`src/index.ts`), `createActiveDistributedPackagesByTarget`, `distributionFactory` (`test/`) |
| `editions` | `AmplitudeConfig` (`oss/amplitude/index.ts`), `MoveArtifactsToSpaceUseCase`, `SpaceOwnershipMismatchError` (`oss/spaces-management/index.ts`) |
| `git` | `GitlabFile`, `GitlabBranch` (`infra/repositories/gitlab/types.ts`) |
| `linter-ast` | `ParseResult` (`core/types/ast.types.ts`) |
| `llm` | `OPENAI_ENDPOINT`, `ANTHROPIC_ENDPOINT` (`constants/defaultModels.ts`) |
| `node-utils` | `mockQueueFactory` (`jobs/test/mockQueueFactory.ts`) |
| `skills` | `AllowedFrontmatterField` (`domain/SkillProperties.ts`) |
| `standards` | `getAllSampleIds` (`samples/index.ts`), `IGetRuleExamples` (`domain/useCases/IGetRuleExamples.ts`) |
| `ui` | `PMColorSwatchProps`, `PMButtonGroupProps`, `PMCheckboxCheckedChangeDetails`, `PMFieldProps`, `PMMenuRoot`, `PMMenuTrigger`, `PMSwitchCheckedChangeDetails`, `PMPortalProps` |

## Not reported as dead (deliberately)

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
   `assets/icons/ContinueIcon.tsx`, `frontend/…/SettingsPageDataTestIds.ts`.
2. `ManageOrganizationUseCase` + the two unused `accounts` error classes.
3. The 11 unemitted event classes and their payload interfaces.
4. The dead `I*UseCase` contract aliases (per symbol — keep the `Command`/`Response` types).
5. `ui` dead components/hooks, updating the `working-with-pm-design-kit` catalog in the
   same commit.
6. Test-only code: delete implementation **and** its spec together, or wire the
   implementation up if it was meant to ship.
