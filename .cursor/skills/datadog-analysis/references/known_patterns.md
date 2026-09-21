# Known Error Patterns

Pre-catalogued recurring error patterns and their codebase entry points. Consult during Phase 3 when an error matches a known signature — jump straight to the listed entry point and skip ad-hoc grepping.

## API (`api-proprietary`)

| Pattern | Datadog query | Codebase entry point |
|---------|--------------|---------------------|
| Redis connection failure | `service:api-proprietary status:error ETIMEDOUT OR ECONNREFUSED` | `ioredis` client, infra-level |
| Space membership check | `service:api-proprietary status:error SpaceMembershipRequiredError` | `packages/node-utils/src/application/AbstractSpaceMemberUseCase.ts` |
| Recipe not found | `service:api-proprietary status:error "Recipe" "not found"` | `packages/recipes/src/application/services/RecipeService.ts` |
| Artefact not found | `service:api-proprietary status:error "Artefact" "not found"` | `packages/playbook-change-management/src/application/services/validateArtefactInSpace.ts` |
| Sign-in failure | `service:api-proprietary status:error "Failed to sign in"` | `apps/api/src/app/auth/auth.controller.ts` |
| Onboarding status failure | `service:api-proprietary status:error "onboarding status"` | `apps/api/src/app/auth/auth.service.ts` |
| Amplitude tracking failure | `service:api-proprietary status:error Amplitude` | Amplitude Node.js SDK (external) |
| PG concurrent query | `service:api-proprietary status:error "client.query() when the client is already executing"` | `pg` driver through TypeORM |

## Frontend (`frontend-proprietary`)

| Pattern | Datadog query | Codebase entry point |
|---------|--------------|---------------------|
| Nginx PID unlink permission denied | `service:frontend-proprietary "unlink" "nginx.pid"` | `dockerfile/Dockerfile.frontend:17` + `dockerfile/nginx.*.conf:3` |
| Nginx notice logs misclassified | `service:frontend-proprietary status:error "[notice]"` | Datadog log pipeline config (not code) |
