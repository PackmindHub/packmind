import {
  ListOrganizationSpacesForManagementCommand,
  ListOrganizationSpacesForManagementResponse,
  IListOrganizationSpacesForManagementUseCase,
  SpaceManagementListItem,
  SpaceManagementListItemAdmin,
  ORGA_SPACE_MANAGEMENT_PAGE_SIZE,
} from './IListOrganizationSpacesForManagementUseCase';

describe('IListOrganizationSpacesForManagementUseCase contract', () => {
  it('exposes the page-size constant required by the spec', () => {
    expect(ORGA_SPACE_MANAGEMENT_PAGE_SIZE).toBe(1000);
  });

  it('shapes the Command type with userId, organizationId, and page', () => {
    const command: ListOrganizationSpacesForManagementCommand = {
      userId: 'user-1' as ListOrganizationSpacesForManagementCommand['userId'],
      organizationId:
        'org-1' as ListOrganizationSpacesForManagementCommand['organizationId'],
      page: 1,
    };
    expect(command.page).toBe(1);
  });

  it('shapes the Response type with items', () => {
    const response: ListOrganizationSpacesForManagementResponse = {
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: ORGA_SPACE_MANAGEMENT_PAGE_SIZE,
    };
    expect(response.items).toHaveLength(0);
  });

  it('shapes the Response type with pageSize', () => {
    const response: ListOrganizationSpacesForManagementResponse = {
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: ORGA_SPACE_MANAGEMENT_PAGE_SIZE,
    };
    expect(response.pageSize).toBe(ORGA_SPACE_MANAGEMENT_PAGE_SIZE);
  });

  it('describes admins as a list of {id, displayName}', () => {
    const admin: SpaceManagementListItemAdmin = {
      id: 'user-1' as SpaceManagementListItemAdmin['id'],
      displayName: 'Ada Lovelace',
    };
    expect(admin.displayName).toBe('Ada Lovelace');
  });

  it('aliases the IUseCase contract for the command/response pair', () => {
    const factory = (): IListOrganizationSpacesForManagementUseCase | null =>
      null;
    expect(factory()).toBeNull();
  });

  it('declares SpaceManagementListItem as Space enriched with aggregations', () => {
    const mockItem = {
      admins: [],
      memberIds: [],
      membersCount: 5,
      artifactsCount: 3,
    } as unknown as SpaceManagementListItem;

    const buildItem = (
      item: SpaceManagementListItem,
    ): Pick<
      SpaceManagementListItem,
      'admins' | 'memberIds' | 'membersCount' | 'artifactsCount'
    > => ({
      admins: item.admins,
      memberIds: item.memberIds,
      membersCount: item.membersCount,
      artifactsCount: item.artifactsCount,
    });

    const result = buildItem(mockItem);
    expect(result.membersCount).toBe(5);
  });
});
