import {
  BrowseSpacesCommand,
  BrowseSpacesResponse,
  BrowsableSpace,
  createOrganizationId,
  createUserId,
  ISpacesPort,
  SpaceType,
} from '@packmind/types';

export class BrowseSpacesUseCase {
  constructor(private readonly spacesPort: ISpacesPort) {}

  async execute(command: BrowseSpacesCommand): Promise<BrowseSpacesResponse> {
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
          (space.type === SpaceType.open ||
            space.type === SpaceType.restricted),
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
