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

  it('shapes the Response type with items, totalCount, page, and pageSize', () => {
    const response: ListOrganizationSpacesForManagementResponse = {
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: ORGA_SPACE_MANAGEMENT_PAGE_SIZE,
    };
    expect(response.items).toHaveLength(0);
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
    const buildItem = (
      item: SpaceManagementListItem,
    ): Pick<
      SpaceManagementListItem,
      'admins' | 'membersCount' | 'artifactsCount'
    > => ({
      admins: item.admins,
      membersCount: item.membersCount,
      artifactsCount: item.artifactsCount,
    });
    expect(typeof buildItem).toBe('function');
  });
});
