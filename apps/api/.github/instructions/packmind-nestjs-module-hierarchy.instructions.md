---
applyTo: '**/*.controller.ts,**/*.module.ts,**/*.service.ts'
---
## Standard: NestJS Module Hierarchy

Enforce a NestJS module structure where AppModule configures all hierarchical routes via RouterModule.register() and each resource lives in its own module with empty @Controller() paths, URL-mirroring directories, explicit parent IDs (using @Param('orgId')), and command-object service inputs to improve maintainability, scalability, and separation of concerns. :
* Accept a single typed Command object as the input parameter in service methods instead of multiple individual parameters to enforce explicit intent and maintain consistency with the hexagonal architecture
* Configure all hierarchical routing exclusively in AppModule using RouterModule.register() with nested children arrays to ensure a single source of truth for the entire API route structure
* Create a dedicated NestJS module for each resource type, preventing controllers from handling sub-resource routes to maintain clear separation of concerns
* Define controller routes using empty @Controller() decorators to inherit path segments from RouterModule configuration and avoid path duplication
* Import child modules in parent module's imports array and register them as children in AppModule's RouterModule configuration to establish proper module dependencies
* Include all parent resource IDs in URL paths to make hierarchical relationships explicit and enable proper resource scoping and validation
* Place module files in directories that mirror the URL path hierarchy to make the codebase structure immediately understandable
* Use organization ID from route parameters (@Param('orgId')) instead of extracting it from AuthRequest to ensure consistency with the URL hierarchy

Full standard is available here for further request: [NestJS Module Hierarchy](../../.packmind/standards/nestjs-module-hierarchy.md)