# Use Case

**Layer**: Application
**Location**: `packages/{domain}/src/application/useCases/{name}/{name}.usecase.ts`
**Test**: `packages/{domain}/src/application/useCases/{name}/{name}.usecase.spec.ts`

A use case is the primary unit of work. Each one handles exactly one business operation.

## Authorization Levels

### Member Use Case (most common)

Requires the user to be an authenticated member of the organization.

```typescript
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import { IGetStandardByIdUseCase, GetStandardByIdCommand, GetStandardByIdResponse } from '@packmind/types';

export class GetStandardByIdUsecase
  extends AbstractMemberUseCase<GetStandardByIdCommand, GetStandardByIdResponse>
  implements IGetStandardByIdUseCase {

  constructor(
    accountsPort: IAccountsPort,
    private readonly standardService: StandardService,
  ) {
    super(accountsPort);
  }

  async executeForMembers(
    command: GetStandardByIdCommand & MemberContext,
  ): Promise<GetStandardByIdResponse> {
    // MemberContext provides: user, organization, membership
    const standard = await this.standardService.getStandardById(command.standardId);
    return { standard };
  }
}
```

`AbstractMemberUseCase` automatically:
- Validates the user exists
- Validates the user is a member of the organization
- Injects `user`, `organization`, `membership` into the command via `MemberContext`
- Throws `UserNotFoundError` or `UserNotInOrganizationError` on failure

### Admin Use Case

Requires the user to have admin role in the organization.

```typescript
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';

export class DeleteStandardUsecase
  extends AbstractAdminUseCase<DeleteStandardCommand, void> {

  constructor(
    accountsPort: IAccountsPort,
    private readonly standardService: StandardService,
  ) {
    super(accountsPort);
  }

  async executeForAdmins(
    command: DeleteStandardCommand & AdminContext,
  ): Promise<void> {
    await this.standardService.deleteStandard(command.standardId);
  }
}
```

### Public Use Case

No authentication required.

```typescript
import { IPublicUseCase } from '@packmind/types';

export class PublicGetStandardUsecase
  implements IPublicUseCase<PublicGetStandardCommand, Standard | null> {

  constructor(private readonly standardService: StandardService) {}

  async execute(command: PublicGetStandardCommand): Promise<Standard | null> {
    return this.standardService.getStandardBySlug(command.slug);
  }
}
```

## Contract Definition

Every use case has a matching contract in `packages/types/src/{domain}/contracts/`:

See [contract.md](contract.md) for the pattern.

## Conventions

- **One folder per use case** — `useCases/{camelCaseName}/{camelCaseName}.usecase.ts`
- **Use case names are verb-first** — `getStandardById`, `createRule`, `deleteStandard`
- **Use cases call services** — they orchestrate, services contain reusable logic
- **Emit events** when the operation has side effects other domains care about
- **Test file colocated** — `{name}.usecase.spec.ts` in the same folder
