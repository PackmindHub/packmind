# CLI Use Case Structure

Enforce clean separation between domain contracts and application logic in apps/cli use cases, ensuring use cases focus purely on business operations without presentation concerns like user output or generic error handling.

## Rules

* Define use case interfaces in src/domain/useCases/ directory
* Base all use case interfaces on IPublicUseCase<Command, Response> from @packmind/types
* Define Command and Response types in the same file as the use case interface
* Implement use cases in src/application/useCases/ directory
* Keep use cases focused on business logic without any user output (no console logging, no outputError/outputSuccess calls)
* Throw custom domain errors defined in src/domain/errors/ instead of generic Error instances
* Create new error classes for domain-specific failure scenarios when existing errors do not apply
* Name error classes descriptively to indicate the specific failure condition (e.g., PackageNotFoundError, AccessDenied, InvalidStandardFormat)
* Export error classes from individual files in src/domain/errors/ for reusability across use cases
* Document the errors that a use case can throw so handlers know which error types to catch
