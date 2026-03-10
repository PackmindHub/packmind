<!-- start: Packmind standards -->
# Packmind Standards

Before starting your work, make sure to review the coding standards relevant to your current task.

Always consult the sections that apply to the technology, framework, or type of contribution you are working on.

All rules and guidelines defined in these standards are mandatory and must be followed consistently.

Failure to follow these standards may lead to inconsistencies, errors, or rework. Treat them as the source of truth for how code should be written, structured, and maintained.

## Standard: Tests redaction

Apply good practices for test redaction in **/*.spec.ts files using single expectations, assertive titles, and nested describe blocks for workflows to improve test clarity and maintainability during the development and testing of TypeScript applications. :
* Tests have a single expectation
* Tests have an assertive title and do not start with should
* Tests that show a workflow uses multiple describe to nest steps

Full standard is available here for further request: [Tests redaction](../.packmind/standards/tests-redaction.md)

## Standard: Standard 1

Test standard 1. :
* Rule 1

Full standard is available here for further request: [Standard 1](../.packmind/standards/standard-1.md)

## Standard: NestJS Module Hierarchy

Establish a consistent NestJS module structure with hierarchical organization using RouterModule for routing, dedicated modules per resource, empty @Controller() decorators, and directory structures mirroring URL paths to enhance maintainability and separation of concerns in apps/api. :
* Configure all hierarchical routing exclusively in AppModule using RouterModule.register() with nested children arrays to ensure a single source of truth for the entire API route structure
* Create a dedicated NestJS module for each resource type, preventing controllers from handling sub-resource routes to maintain clear separation of concerns
* Define controller routes using empty @Controller() decorators to inherit path segments from RouterModule configuration and avoid path duplication
* Import child modules in parent module's imports array and register them as children in AppModule's RouterModule configuration to establish proper module dependencies
* Include all parent resource IDs in URL paths to make hierarchical relationships explicit and enable proper resource scoping and validation
* Place module files in directories that mirror the URL path hierarchy to make the codebase structure immediately understandable
* Use organization ID from route parameters (@Param('orgId')) instead of extracting it from AuthRequest to ensure consistency with the URL hierarchy

Full standard is available here for further request: [NestJS Module Hierarchy](../.packmind/standards/nestjs-module-hierarchy.md)

## Standard: Frontend Error Management

Use error boundaries selectively for custom error UI and isolated critical features, handle TanStack Query mutation errors with onError callbacks, wrap async operations in try-catch blocks, and display validation errors inline to ensure proper error management in React applications. :
* Avoid overusing error boundaries as they increase code complexity and make error flows harder to trace
* Display validation errors inline near the relevant form fields for better user experience
* Do NOT use error boundaries for errors that should be handled explicitly such as form validation, expected API errors, and user input errors
* Handle TanStack Query mutation errors using onError callbacks to display contextual error messages
* Only add a page-level error boundary when you need custom error UI for a specific route that differs from the default error page
* Only add component-level error boundaries for isolated critical features where partial failure is acceptable, such as independent dashboard widgets that can fail without affecting the rest of the page. Use this mainly when using components we do not manage internally (eg: CodeMirror).
* Prevent double submissions by checking mutation pending state before triggering operations
* Use typed error guards such as isPackmindError to safely extract error details from API responses before displaying to users
* Wrap async operations in try-catch blocks since error boundaries do NOT catch errors in event handlers or async code

Full standard is available here for further request: [Frontend Error Management](../.packmind/standards/frontend-error-management.md)
<!-- end: Packmind standards -->