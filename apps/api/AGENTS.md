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

- Build: `nx build api`
- Test: `nx test api`
- Serve (development): `nx serve api` *(for isolated testing only; use `docker compose up` for regular local development)*
- Start (production): `nx start api`
- Type check: `nx typecheck api`
- Lint: `nx lint api`

## Configuration

- **Port**: 3000 (default)
- **Database**: Configured via TypeORM config in app module
- **Redis**: Configured for cache and BullMQ

<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

## Standard: NestJS Module Hierarchy

Establish a consistent NestJS module hierarchy using RouterModule.register() for routing and dedicated modules for each resource in the apps/api/src/app/ directory to enhance maintainability and scalability by mirroring the URL hierarchy and ensuring clear separation of concerns across the codebase, applicable to all modules including controllers, services, and modules. :
* Configure all hierarchical routing exclusively in AppModule using RouterModule.register() with nested children arrays to ensure a single source of truth for the entire API route structure
* Create a dedicated NestJS module for each resource type, preventing controllers from handling sub-resource routes to maintain clear separation of concerns
* Define controller routes using empty @Controller() decorators to inherit path segments from RouterModule configuration and avoid path duplication
* Import child modules in parent module's imports array and register them as children in AppModule's RouterModule configuration to establish proper module dependencies
* Include all parent resource IDs in URL paths to make hierarchical relationships explicit and enable proper resource scoping and validation
* Place module files in directories that mirror the URL path hierarchy to make the codebase structure immediately understandable
* Use organization ID from route parameters (@Param('orgId')) instead of extracting it from AuthRequest to ensure consistency with the URL hierarchy

Full standard is available here for further request: [NestJS Module Hierarchy](.packmind/standards/nestjs-module-hierarchy.md)
<!-- end: Packmind standards -->
