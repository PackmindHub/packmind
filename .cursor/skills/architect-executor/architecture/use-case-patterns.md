# Use Case Architecture Patterns

Use cases are the entry points to domain logic. Each use case corresponds to a single business operation and must be properly typed, validated, and accessible through a clean contract interface.

## Contract File Structure

Every use case has a contract file at:
```
packages/types/src/{domain}/contracts/{UseCaseName}.ts
```

Each contract file exports exactly **three** things:
- `{Name}Command` — input parameters
- `{Name}Response` — return value
- `I{Name}UseCase` — interface combining both

## Use Case Types

| Type | Base class | Method | When to use |
|---|---|---|---|
| Member operation | `AbstractMemberUseCase` | `executeForMembers` | Requires org membership |
| Admin operation | `AbstractAdminUseCase` | `executeForAdmins` | Requires admin role |
| Public operation | implements `IPublicUseCase` | `execute` | No authentication |

`PackmindCommand` for authenticated commands (includes userId + organizationId).
`PublicPackmindCommand` for unauthenticated commands.

## Rules

- Accept a single typed `Command` object — never spread as multiple arguments
- Only the execute/executeForMembers/executeForAdmins method is public — no other public methods
- Use cases are thin orchestrators: validate → call domain services → emit events → return result
- Validation lives in the use case; services receive already-validated data
- Reuse existing use cases through port interfaces, never by direct instantiation
