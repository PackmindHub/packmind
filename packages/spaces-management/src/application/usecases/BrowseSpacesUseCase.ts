import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  BrowseSpacesCommand,
  BrowseSpacesResponse,
  BrowsableSpace,
  createOrganizationId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  SpaceType,
} from '@packmind/types';

export class BrowseSpacesUseCase extends AbstractMemberUseCase<
  BrowseSpacesCommand,
  BrowseSpacesResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
  ) {
    super(accountsPort);
  }

  protected async executeForMembers(
    command: BrowseSpacesCommand & MemberContext,
  ): Promise<BrowseSpacesResponse> {
    const organizationId = createOrganizationId(command.organizationId);
    const userId = createUserId(command.userId);

    const [userSpacesResponse, allOrgSpaces, memberships] = await Promise.all([
      this.spacesPort.listUserSpaces(command),
      this.spacesPort.listSpacesByOrganization(organizationId),
      this.spacesPort.findMembershipsByUserAndOrganization(
        userId,
        organizationId,
      ),
    ]);

    const memberSpaceIds = new Set(memberships.map((m) => m.spaceId));

    const allSpaces: BrowsableSpace[] = allOrgSpaces
      .filter(
        (space) =>
          !memberSpaceIds.has(space.id) &&
          !space.isDefaultSpace &&
          space.type !== SpaceType.private,
      )
      .map((space) => ({
        id: space.id,
        name: space.name,
        type: space.type,
      }));

    return {
      mySpaces: userSpacesResponse.spaces,
      allSpaces,
    };
  }
}
