<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

# Standard: NestJS Module Hierarchy

Establish a consistent NestJS module structure in the API application where each resource is encapsulated in its own module with proper hierarchical organization to enhance maintainability, scalabilit... :
* Accept a single typed Command object as the input parameter in service methods instead of multiple individual parameters to enforce explicit intent and maintain consistency with the hexagonal architecture
* Configure all hierarchical routing exclusively in AppModule using RouterModule.register() with nested children arrays to ensure a single source of truth for the entire API route structure
* Create a dedicated NestJS module for each resource type, preventing controllers from handling sub-resource routes to maintain clear separation of concerns
* Define controller routes using empty @Controller() decorators to inherit path segments from RouterModule configuration and avoid path duplication
* Import child modules in parent module's imports array and register them as children in AppModule's RouterModule configuration to establish proper module dependencies
* Include all parent resource IDs in URL paths to make hierarchical relationships explicit and enable proper resource scoping and validation
* Place module files in directories that mirror the URL path hierarchy to make the codebase structure immediately understandable
* Use organization ID from route parameters (@Param('orgId')) instead of extracting it from AuthRequest to ensure consistency with the URL hierarchy

Full standard is available here for further request: [NestJS Module Hierarchy](../../.packmind/standards/nestjs-module-hierarchy.md)

# Standard: REST API Endpoint Design

Conventions for designing REST API endpoints that are predictable, self-documenting, and aligned with distinct business actions. Favors dedicated action endpoints over generic status updates, and rout... :
* Create one endpoint per business action rather than a single endpoint handling multiple actions via request body
* Only include resource IDs from the ownership chain in the route — omit IDs of related but non-parent resources
* Use dedicated POST action endpoints (e.g., `/reject`, `/accept`) instead of a generic PATCH with a status field in the body

Full standard is available here for further request: [REST API Endpoint Design](../../.packmind/standards/rest-api-endpoint-design.md)
<!-- end: Packmind standards -->