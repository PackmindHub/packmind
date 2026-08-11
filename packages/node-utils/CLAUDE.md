# Node Utils Package

The backend's shared foundation. Almost every "I need a base class / a helper for this" in a domain
package is already here — this file is the inventory, so you can check before writing your own.

Everything below is re-exported from `src/index.ts`, so import from `@packmind/node-utils` directly.

## Architecture building blocks

| Export | Location | Notes |
| --- | --- | --- |
| `BaseHexa`, `BaseService`, `HexaRegistry` | `src/hexa/` | every domain's `*Hexa.ts` extends `BaseHexa`; cross-domain lookup goes through the registry |
| `AbstractMemberUseCase`, `AbstractAdminUseCase`, `AbstractSpaceMemberUseCase`, `AbstractSpaceAdminUseCase` | `src/application/` | the auth-validating use case bases |
| `AbstractRepository` | `src/repositories/` | base repository |
| `OrganizationScopedRepository`, `SpaceScopedRepository` | `src/repositories/` | tenant-scoped repositories |
| `IBaseAdapter` | `src/adapter/` | adapter contract |
| `hexa/events` | `src/hexa/` | domain event plumbing |

Which base class to pick, and the rules for using the scoped repositories, are Packmind standards —
see `packages/.claude/rules/packmind/` (Use Case Architecture Patterns, Scoped Repository Patterns,
Port-Adapter Cross-Domain Integration, Domain Events).

Note `IRepository` and `QueryOption` come from `@packmind/types`, **not** from here.

## Infrastructure helpers

| Export | Location | Notes |
| --- | --- | --- |
| `Configuration.getConfig()` | `src/config/config/` | the only sanctioned way to read secrets/config |
| `Cache` | `src/cache/` | Redis-backed cache |
| `EncryptionService` | `src/security/` | needs `ENCRYPTION_KEY` |
| `queueFactory`, `AbstractAIDelayedJob`, `IJobQueue`, `IJobRegistry`, `IQueue`, `JobsService` | `src/jobs/` | BullMQ wrappers; `src/jobs/test` provides `MockJobQueue` and `mockQueueFactory` |
| `SSEEventPublisher`, `RedisSSEClient` | `src/sse/` | server-sent events to the frontend |
| `MailService`, `SmtpMailService` | `src/mail/` | |
| `isFeatureEnabled` | `src/featureFlags/` | backend feature-flag gate (see the `feature-flags-authoring` skill) |
| `Public`, `authRequest` | `src/nest/` | NestJS decorators/helpers usable without depending on the API app |
| `migrationColumns`, `database/schemas`, `database/types` | `src/database/` | shared TypeORM column definitions and schema helpers — use these so entities stay consistent |
| `localDataSource` | `src/dataSources/local.ts` | |

## Text and error utilities — check here first

These are the ones most often reimplemented by hand:

- `src/text/`: `extractCodeFromMarkdown`, `mergeSectionsIntoFileContent` (merges marker-delimited
  blocks into existing file content — what agent-file deployment is built on), `normalizeLineEndings`,
  `removeTrailingSlash`
- `src/skillMd/`: `parseSkillMd`, `parseSkillMdContent` — SKILL.md frontmatter + body parsing
- `src/errors/`: the shared error types

Shared package conventions (env tags, layout, `/test` subpath, branded IDs): [../CLAUDE.md](../CLAUDE.md)
