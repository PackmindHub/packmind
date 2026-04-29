# NestJS Module Hierarchy

Establish a consistent NestJS module structure in the API application where each resource is encapsulated in its own module with proper hierarchical organization to enhance maintainability, scalability, and clear separation of concerns across the codebase. This standard applies to all modules (new and existing) in apps/api/src/app/ and ensures that the module structure mirrors the URL hierarchy, making it easier to navigate and understand the application's architecture.

## Rules

* Configure all hierarchical routing exclusively in AppModule using RouterModule.register() with nested children arrays to ensure a single source of truth for the entire API route structure
* Create a dedicated NestJS module for each resource type, preventing controllers from handling sub-resource routes to maintain clear separation of concerns
* Define controller routes using empty @Controller() decorators to inherit path segments from RouterModule configuration and avoid path duplication
* Use organization ID from route parameters (@Param('orgId')) instead of extracting it from AuthRequest to ensure consistency with the URL hierarchy
* Import child modules in parent module's imports array and register them as children in AppModule's RouterModule configuration to establish proper module dependencies
* Include all parent resource IDs in URL paths to make hierarchical relationships explicit and enable proper resource scoping and validation
* Place module files in directories that mirror the URL path hierarchy to make the codebase structure immediately understandable
* Accept a single typed Command object as the input parameter in service methods instead of multiple individual parameters to enforce explicit intent and maintain consistency with the hexagonal architecture
