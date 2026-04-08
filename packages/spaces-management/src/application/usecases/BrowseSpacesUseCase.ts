import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  BrowseSpacesCommand,
  BrowseSpacesResponse,
  BrowsableSpace,
  createOrganizationId,
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

    const [userSpacesResponse, allOrgSpaces] = await Promise.all([
      this.spacesPort.listUserSpaces(command),
      this.spacesPort.listSpacesByOrganization(organizationId),
    ]);

    const isOrgAdmin = command.membership.role === 'admin';
    const userSpaceIds = new Set(userSpacesResponse.spaces.map((s) => s.id));

    const allSpaces: BrowsableSpace[] = allOrgSpaces
      .filter(
        (space) =>
          !space.isDefaultSpace &&
          !userSpaceIds.has(space.id) &&
          (isOrgAdmin || space.type !== SpaceType.private),
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
