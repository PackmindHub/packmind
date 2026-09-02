# API Application

Main backend API for Packmind, built with NestJS. Business logic follows hexagonal (ports & adapters) architecture in the `packages/*` libraries consumed by this app; `apps/api/src` itself is organized as NestJS feature modules that wire those libraries together.

## Architecture

- **Framework**: NestJS 11, feature modules under `apps/api/src/app` (e.g. `auth`, `accounts`, `organizations`, `spaces`, `sse`); domain/application/infrastructure layering lives in the `packages/*` libraries consumed by the API
- **Database**: PostgreSQL with TypeORM 0.3 for entity persistence
- **Authentication**: JWT-based authentication via `@nestjs/jwt` (cookie and API-key based), no Passport strategy or refresh tokens
- **Background Jobs**: BullMQ (via shared `packages/node-utils` and other packages) for asynchronous task processing
- **Error Tracking**: Sentry, initialised in `apps/api/src/instrument.ts`
- **Tracing**: OpenTelemetry in `apps/api/src/otel.ts`, entirely gated on
  `OTEL_EXPORTER_OTLP_ENDPOINT` — unset (the local default) means no exporter is started. It also
  refuses to export when that endpoint is set but `OTEL_RESOURCE_ATTRIBUTES` carries no deployment
  environment, rather than mislabel the deployment. Postgres statement spans are an opt-in on top,
  via `PACKMIND_OTEL_INSTRUMENT_PG=true`.
- **API Style**: RESTful (no OpenAPI/Swagger documentation set up)

## Technologies

- **NestJS**: v11 - Dependency injection, modules, guards, interceptors
- **TypeORM**: v0.3 - Entity management, migrations, query builder
- **PostgreSQL**: Primary database
- **Redis**: Used for SSE pub/sub across instances and caching
- **BullMQ**: Background job processing (via shared packages)
- **Sentry**: Error tracking and monitoring
- **OpenTelemetry**: Traces and logs export, off unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set

## Main Commands

- Build: `./node_modules/.bin/nx build api`
- Test: `./node_modules/.bin/nx test api`
- Type check: `./node_modules/.bin/nx typecheck api`
- Lint: `./node_modules/.bin/nx lint api`

## Configuration

- **Port**: 3000 (default)
- **Database**: Configured via TypeORM config in app module. The connection pool is sized in
  `apps/api/src/app/database-pool.config.ts` and overridable per deployment with
  `DATABASE_POOL_MIN` (default 8), `DATABASE_POOL_MAX` (default 20) and
  `DATABASE_POOL_CONNECTION_TIMEOUT_MS` (default 30 000). `max` times the pod count has to stay
  under Postgres' `max_connections`; anything unparseable falls back to the default. The `min`
  connections are opened at boot by `warmUpDatabasePool`, which is why the floor lives in a module
  of its own rather than inline in `app.module.ts`.
- **Redis**: Configured for cache and BullMQ
