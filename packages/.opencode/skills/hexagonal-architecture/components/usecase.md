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

## Errors

- **Never `throw new Error(...)`** — a bare `Error` answers 500 with a stack logged at
  `error` level, whatever the failure actually was
- **Throw a class extending the package's `DomainError` base** — see
  [domain-layer.md](../layers/domain-layer.md); `packages/deployments/src/domain/errors/`
  is the current model for the domain family, and `git` is the model for a package raising
  all three — `packages/git/src/domain/errors/` holds its internal and upstream bases, on
  top of the domain base it shares through `packages/types/src/git/errors/GitError.ts`
- **Missing and wrong-tenant are one branch** — `if (!pkg || pkg.spaceId !== spaceId) throw
  new PackageNotFoundError(packageId, spaceId)`, one error, one message, `kind: 'not_found'`
  and never `forbidden`
- **Ids belong in `context`, not in the message** — `context` is logged, the message is
  returned to the caller
- **Broken invariants extend `PackmindInternalError`** — e.g. a record that cannot be read
  back after it was written
- **Third-party failures extend the package's `PackmindUpstreamError` subclass** — a
  provider outage, a timeout, an unreadable response or a rate limit is neither the caller's
  fault nor a broken invariant of ours; answers 502, or 429 when throttled, logged at `warn`
- **Choose the family by fault, not by status class** — the caller's fault, ours, or a
  third party's decides which base you extend; the status then follows from the table

The authorization errors the abstract base classes raise above (`UserNotFoundError`,
`UserNotInOrganizationError`, `SpaceMembershipRequiredError`) are `UserAccessError`
subclasses: carrying a `kind` is what makes them answer 404/403 rather than 500.
