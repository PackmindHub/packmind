# API Application

Main backend API for Packmind, built with NestJS and hexagonal architecture.

## Architecture

- **Framework**: NestJS 11 with hexagonal (ports & adapters) architecture
- **Database**: PostgreSQL with TypeORM 0.3 for entity persistence
- **Authentication**: JWT-based authentication with refresh tokens
- **Background Jobs**: BullMQ for asynchronous task processing
- **Error Tracking**: Sentry for production error monitoring
- **API Style**: RESTful with OpenAPI documentation

### Hexagonal Architecture Layers

- **Domain**: Core business logic in `packages/` (accounts, spaces, standards, recipes, skills)
- **Application**: Use cases orchestrating domain logic
- **Infrastructure**: Adapters (TypeORM repositories, HTTP controllers, BullMQ processors)
- **Presentation**: NestJS controllers and DTOs

## Technologies

- **NestJS**: v11 - Dependency injection, modules, guards, interceptors
- **TypeORM**: v0.3 - Entity management, migrations, query builder
- **PostgreSQL**: Primary database
- **Redis**: Caching and BullMQ job queue
- **BullMQ**: Background job processing
- **Passport**: JWT authentication strategy
- **class-validator**: DTO validation
- **Sentry**: Error tracking and monitoring

## Main Commands

- Build: `nx build api`
- Test: `nx test api`
- Serve (development): `nx serve api`
- Start (production): `nx start api`
- Type check: `nx typecheck api`
- Lint: `nx lint api`

## Key Patterns

### Use Case Inheritance

- Most use cases extend `AbstractUseCase` or domain-specific abstract classes (e.g., `AbstractMemberUseCase`)
- Use cases are registered in module `providers` arrays
- Use cases are injected into controllers via constructor dependency injection

### RouterModule Pattern

- Domain modules use NestJS `RouterModule.register()` to prefix routes (e.g., `/api/spaces`)
- Controllers define sub-paths (e.g., `@Controller('members')` becomes `/api/spaces/members`)

### TypeORM Migrations

- Located in `packages/migrations/`
- Follow patterns in `.claude/rules/packmind/` and skills
- Always reversible with `down()` method

### Authentication & Authorization

- Guards: `JwtAuthGuard` for authentication
- Decorators: `@CurrentUser()` for user injection
- Member role checks in use cases or guards

## Configuration

- **Port**: 3000 (default)
- **Environment Variables**: See `.env.example` in root
- **Database**: Configured via TypeORM config in app module
- **Redis**: Configured for cache and BullMQ

## Testing

- Unit tests: `*.spec.ts` files colocated with source
- Follow standards in `.claude/rules/packmind/standard-testing-good-practices.md`
- Use test factories from `packages/test-utils/`

## Related Documentation

- See `.claude/rules/packmind/` for coding standards
- See `packages/CLAUDE.md` for domain package details
- See root `CLAUDE.md` for monorepo-wide rules
