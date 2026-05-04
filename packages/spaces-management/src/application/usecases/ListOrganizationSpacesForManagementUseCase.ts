import { AbstractAdminUseCase, AdminContext } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import {
  createOrganizationId,
  IAccountsPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  ListOrganizationSpacesForManagementCommand,
  ListOrganizationSpacesForManagementResponse,
  ORGA_SPACE_MANAGEMENT_PAGE_SIZE,
  SpaceId,
  SpaceManagementListItem,
  SpaceManagementListItemAdmin,
} from '@packmind/types';
import { InvalidPageError } from '../../domain/errors/InvalidPageError';

const origin = 'ListOrganizationSpacesForManagementUseCase';

export class ListOrganizationSpacesForManagementUseCase extends AbstractAdminUseCase<
  ListOrganizationSpacesForManagementCommand,
  ListOrganizationSpacesForManagementResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly skillsPort: ISkillsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForAdmins(
    command: ListOrganizationSpacesForManagementCommand & AdminContext,
  ): Promise<ListOrganizationSpacesForManagementResponse> {
    const { organizationId, page } = command;

    if (!Number.isInteger(page) || page < 1) {
      throw new InvalidPageError(page);
    }

    const brandedOrganizationId = createOrganizationId(organizationId);
    const { items: spaces, totalCount } =
      await this.spacesPort.findOrgPagePaginated(
        brandedOrganizationId,
        page,
        ORGA_SPACE_MANAGEMENT_PAGE_SIZE,
      );

    if (spaces.length === 0) {
      return {
        items: [],
        totalCount,
        page,
        pageSize: ORGA_SPACE_MANAGEMENT_PAGE_SIZE,
      };
    }

    const spaceIds = spaces.map((space) => space.id);

    const [
      adminRows,
      memberCounts,
      memberIdsBySpace,
      standardsCounts,
      recipesCounts,
      skillsCounts,
    ] = await Promise.all([
      this.spacesPort.findAdminsForSpaceIds(spaceIds),
      this.spacesPort.countUsersForSpaceIds(spaceIds),
      this.spacesPort.findMemberIdsForSpaceIds(spaceIds),
      this.standardsPort.countBySpaceIds(spaceIds),
      this.recipesPort.countBySpaceIds(spaceIds),
      this.skillsPort.countBySpaceIds(spaceIds),
    ]);

    const adminsBySpace = new Map<SpaceId, SpaceManagementListItemAdmin[]>();
    for (const row of adminRows) {
      const list = adminsBySpace.get(row.spaceId) ?? [];
      list.push({ id: row.user.id, displayName: row.user.displayName });
      adminsBySpace.set(row.spaceId, list);
    }

    const items: SpaceManagementListItem[] = spaces.map((space) => ({
      ...space,
      admins: adminsBySpace.get(space.id) ?? [],
      memberIds: memberIdsBySpace.get(space.id) ?? [],
      membersCount: memberCounts.get(space.id) ?? 0,
      artifactsCount:
        (standardsCounts.get(space.id) ?? 0) +
        (recipesCounts.get(space.id) ?? 0) +
        (skillsCounts.get(space.id) ?? 0),
    }));

    this.logger.info('Listed organization spaces for management', {
      organizationId,
      page,
      itemsCount: items.length,
      totalCount,
    });

    return {
      items,
      totalCount,
      page,
      pageSize: ORGA_SPACE_MANAGEMENT_PAGE_SIZE,
    };
  }
}
