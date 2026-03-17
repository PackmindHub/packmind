# API Application

Main backend API for Packmind, built with NestJS and hexagonal architecture.

## Architecture

- **Framework**: NestJS 11 with hexagonal (ports & adapters) architecture
- **Database**: PostgreSQL with TypeORM 0.3 for entity persistence
- **Authentication**: JWT-based authentication with refresh tokens
- **Background Jobs**: BullMQ for asynchronous task processing
- **Error Tracking**: Sentry for production error monitoring
- **API Style**: RESTful with OpenAPI documentation

## Technologies

- **NestJS**: v11 - Dependency injection, modules, guards, interceptors
- **TypeORM**: v0.3 - Entity management, migrations, query builder
- **PostgreSQL**: Primary database
- **Redis**: Caching and BullMQ job queue
- **BullMQ**: Background job processing
- **Passport**: JWT authentication strategy
- **Sentry**: Error tracking and monitoring

## Main Commands

- Build: `./node_modules/.bin/nx build api`
- Test: `./node_modules/.bin/nx test api`
- Serve (development): `./node_modules/.bin/nx serve api` *(for isolated testing only; use `docker compose up` for regular local development)*
- Start (production): `./node_modules/.bin/nx start api`
- Type check: `./node_modules/.bin/nx typecheck api`
- Lint: `./node_modules/.bin/nx lint api`

## Configuration

- **Port**: 3000 (default)
- **Database**: Configured via TypeORM config in app module
- **Redis**: Configured for cache and BullMQ
