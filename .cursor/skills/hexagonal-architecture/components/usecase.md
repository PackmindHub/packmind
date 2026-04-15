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

export class GetStandardByIdUseCase
  extends AbstractMemberUseCase<GetStandardByIdCommand, GetStandardByIdResponse>
  implements IGetStandardByIdUseCase {

  constructor(
    accountsPort: IAccountsPort,
    private readonly standardService: StandardService,
  ) {
    super(accountsPort);
  }

  protected async executeForMembers(
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

### Space Member Use Case

Requires the user to be an authenticated member of the organization **and** a member of the target space.

```typescript
import { AbstractSpaceMemberUseCase, SpaceMemberContext } from '@packmind/node-utils';
import { ISpacesPort } from '@packmind/types';
import { IListStandardsBySpaceUseCase, ListStandardsBySpaceCommand, ListStandardsBySpaceResponse } from '@packmind/types';

export class ListStandardsBySpaceUseCase
  extends AbstractSpaceMemberUseCase<ListStandardsBySpaceCommand, ListStandardsBySpaceResponse>
  implements IListStandardsBySpaceUseCase {

  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly standardService: StandardService,
  ) {
    super(spacesPort, accountsPort);
  }

  protected async executeForSpaceMembers(
    command: ListStandardsBySpaceCommand & SpaceMemberContext,
  ): Promise<ListStandardsBySpaceResponse> {
    // SpaceMemberContext provides: user, organization, membership (same as MemberContext)
    // Space membership is already verified automatically
    return this.standardService.listBySpace(command.spaceId);
  }
}
```

`AbstractSpaceMemberUseCase` extends `AbstractMemberUseCase` and additionally:
- Validates the user is a member of the target space via `spacesPort.findMembership()`
- Throws `SpaceMembershipRequiredError` if the user is not in the space
- Requires the command to extend `SpaceMemberCommand` (which includes `spaceId: SpaceId`)
- Exposes `protected readonly spacesPort` — do NOT declare a private `spacesPort` field in subclasses

**Decision guide**: Use `AbstractSpaceMemberUseCase` when the command includes `spaceId`. Use `AbstractMemberUseCase` only for org-level operations without space scoping.

### Admin Use Case

Requires the user to have admin role in the organization.

```typescript
import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';

export class DeleteStandardUseCase
  extends AbstractAdminUseCase<DeleteStandardCommand, void> {

  constructor(
    accountsPort: IAccountsPort,
    private readonly standardService: StandardService,
  ) {
    super(accountsPort);
  }

  protected async executeForAdmins(
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

export class PublicGetStandardUseCase
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
- **Use cases call services, not repositories** — use cases orchestrate via services; never access repositories directly
- **Emit events** when the operation has side effects other domains care about
- **Test file colocated** — `{name}.usecase.spec.ts` in the same folder
