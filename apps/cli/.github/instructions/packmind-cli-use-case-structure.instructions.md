---
applyTo: 'Use case files in apps/cli/src/domain/useCases/ and apps/cli/src/application/useCases/'
---
## Standard: CLI Use Case Structure

Enforce CLI use case separation by defining IPublicUseCase<Command, Response> interfaces with co-located Command/Response types in apps/cli/src/domain/useCases/ and implementing business-only logic in apps/cli/src/application/useCases/ using custom errors from apps/cli/src/domain/errors/ (no console or output handlers) to improve modularity, reuse, and predictable error handling. :
* Base all use case interfaces on IPublicUseCase<Command, Response> from @packmind/types
* Create new error classes for domain-specific failure scenarios when existing errors do not apply
* Define Command and Response types in the same file as the use case interface
* Define use case interfaces in src/domain/useCases/ directory
* Document the errors that a use case can throw so handlers know which error types to catch
* Export error classes from individual files in src/domain/errors/ for reusability across use cases
* Implement use cases in src/application/useCases/ directory
* Keep use cases focused on business logic without any user output (no console logging, no outputError/outputSuccess calls)
* Name error classes descriptively to indicate the specific failure condition (e.g., PackageNotFoundError, AccessDenied, InvalidStandardFormat)
* Throw custom domain errors defined in src/domain/errors/ instead of generic Error instances

Full standard is available here for further request: [CLI Use Case Structure](../../.packmind/standards/cli-use-case-structure.md)