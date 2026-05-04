import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  ListOrganizationSpacesForManagementCommand,
  ORGA_SPACE_MANAGEMENT_PAGE_SIZE,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { ListOrganizationSpacesForManagementUseCase } from './ListOrganizationSpacesForManagementUseCase';
import { InvalidPageError } from '../../domain/errors/InvalidPageError';

describe('ListOrganizationSpacesForManagementUseCase', () => {
  const organizationId = createOrganizationId('org-1');
  const userId = createUserId('user-1');

  const organization = organizationFactory({ id: organizationId });
  const orgAdminUser = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'admin' }],
  });
  const orgMemberUser = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });

  let useCase: ListOrganizationSpacesForManagementUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<
    Pick<
      ISpacesPort,
      'findOrgPagePaginated' | 'findAdminsForSpaceIds' | 'countUsersForSpaceIds'
    >
  >;
  let standardsPort: jest.Mocked<Pick<IStandardsPort, 'countBySpaceIds'>>;
  let recipesPort: jest.Mocked<Pick<IRecipesPort, 'countBySpaceIds'>>;
  let skillsPort: jest.Mocked<Pick<ISkillsPort, 'countBySpaceIds'>>;

  const buildCommand = (
    overrides?: Partial<ListOrganizationSpacesForManagementCommand>,
  ): ListOrganizationSpacesForManagementCommand => ({
    userId: userId as unknown as string,
    organizationId: organizationId as unknown as string,
    page: 1,
    ...overrides,
  });

  const buildUseCase = (): ListOrganizationSpacesForManagementUseCase =>
    new ListOrganizationSpacesForManagementUseCase(
      accountsPort,
      spacesPort as unknown as ISpacesPort,
      standardsPort as unknown as IStandardsPort,
      recipesPort as unknown as IRecipesPort,
      skillsPort as unknown as ISkillsPort,
    );

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(orgAdminUser),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      findOrgPagePaginated: jest
        .fn()
        .mockResolvedValue({ items: [], totalCount: 0 }),
      findAdminsForSpaceIds: jest.fn().mockResolvedValue([]),
      countUsersForSpaceIds: jest.fn().mockResolvedValue(new Map()),
    };

    standardsPort = {
      countBySpaceIds: jest.fn().mockResolvedValue(new Map()),
    };
    recipesPort = {
      countBySpaceIds: jest.fn().mockResolvedValue(new Map()),
    };
    skillsPort = {
      countBySpaceIds: jest.fn().mockResolvedValue(new Map()),
    };

    useCase = buildUseCase();
  });

  afterEach(() => jest.clearAllMocks());

  describe('input validation', () => {
    it('throws InvalidPageError when page < 1', async () => {
      await expect(useCase.execute(buildCommand({ page: 0 }))).rejects.toThrow(
        InvalidPageError,
      );
    });

    it('throws InvalidPageError when page is negative', async () => {
      await expect(useCase.execute(buildCommand({ page: -3 }))).rejects.toThrow(
        InvalidPageError,
      );
    });

    it('throws InvalidPageError when page is not an integer', async () => {
      await expect(
        useCase.execute(buildCommand({ page: 1.5 })),
      ).rejects.toThrow(InvalidPageError);
    });

    it('does not call the spaces port when validation fails', async () => {
      await useCase.execute(buildCommand({ page: 0 })).catch(() => undefined);

      expect(spacesPort.findOrgPagePaginated).not.toHaveBeenCalled();
    });
  });

  describe('authorization', () => {
    it('rejects non-admin callers via AbstractAdminUseCase', async () => {
      accountsPort = {
        getUserById: jest.fn().mockResolvedValue(orgMemberUser),
        getOrganizationById: jest.fn().mockResolvedValue(organization),
      } as unknown as jest.Mocked<IAccountsPort>;
      useCase = buildUseCase();

      await expect(useCase.execute(buildCommand())).rejects.toThrow(/admin/i);
    });

    it('does not query spaces when caller is not an admin', async () => {
      accountsPort = {
        getUserById: jest.fn().mockResolvedValue(orgMemberUser),
        getOrganizationById: jest.fn().mockResolvedValue(organization),
      } as unknown as jest.Mocked<IAccountsPort>;
      useCase = buildUseCase();

      await useCase.execute(buildCommand()).catch(() => undefined);

      expect(spacesPort.findOrgPagePaginated).not.toHaveBeenCalled();
    });
  });

  describe('empty page', () => {
    it('returns empty items but real totalCount when page is past the last page', async () => {
      spacesPort.findOrgPagePaginated.mockResolvedValue({
        items: [],
        totalCount: 32,
      });

      const result = await useCase.execute(buildCommand({ page: 99 }));

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(32);
      expect(result.page).toBe(99);
      expect(result.pageSize).toBe(ORGA_SPACE_MANAGEMENT_PAGE_SIZE);
    });

    it('does not query aggregations when there are no spaces on the page', async () => {
      spacesPort.findOrgPagePaginated.mockResolvedValue({
        items: [],
        totalCount: 0,
      });

      await useCase.execute(buildCommand());

      expect(spacesPort.findAdminsForSpaceIds).not.toHaveBeenCalled();
      expect(spacesPort.countUsersForSpaceIds).not.toHaveBeenCalled();
      expect(standardsPort.countBySpaceIds).not.toHaveBeenCalled();
      expect(recipesPort.countBySpaceIds).not.toHaveBeenCalled();
      expect(skillsPort.countBySpaceIds).not.toHaveBeenCalled();
    });
  });

  describe('aggregation stitching', () => {
    const space1 = spaceFactory({
      id: createSpaceId('space-1'),
      organizationId,
      isDefaultSpace: true,
      name: 'Default Space',
      slug: 'default-space',
    });
    const space2 = spaceFactory({
      id: createSpaceId('space-2'),
      organizationId,
      name: 'Team Space',
      slug: 'team-space',
    });

    beforeEach(() => {
      spacesPort.findOrgPagePaginated.mockResolvedValue({
        items: [space1, space2],
        totalCount: 2,
      });
    });

    it('stitches admins, total user counts, and artifact counts per space; defaults missing entries to 0', async () => {
      spacesPort.findAdminsForSpaceIds.mockResolvedValue([
        {
          spaceId: space1.id,
          user: { id: createUserId('u1'), displayName: 'Alice' },
        },
        {
          spaceId: space2.id,
          user: { id: createUserId('u2'), displayName: 'Bob' },
        },
        {
          spaceId: space2.id,
          user: { id: createUserId('u3'), displayName: 'Carol' },
        },
      ]);
      spacesPort.countUsersForSpaceIds.mockResolvedValue(
        new Map([[space2.id, 7]]),
      );
      standardsPort.countBySpaceIds.mockResolvedValue(
        new Map([[space1.id, 4]]),
      );
      recipesPort.countBySpaceIds.mockResolvedValue(new Map([[space2.id, 3]]));
      skillsPort.countBySpaceIds.mockResolvedValue(new Map());

      const result = await useCase.execute(buildCommand());

      expect(result.items).toHaveLength(2);

      expect(result.items[0].id).toBe(space1.id);
      expect(result.items[0].admins.map((admin) => admin.displayName)).toEqual([
        'Alice',
      ]);
      expect(result.items[0].membersCount).toBe(0);
      expect(result.items[0].artifactsCount).toBe(4);

      expect(result.items[1].id).toBe(space2.id);
      expect(
        result.items[1].admins.map((admin) => admin.displayName).sort(),
      ).toEqual(['Bob', 'Carol']);
      expect(result.items[1].membersCount).toBe(7);
      expect(result.items[1].artifactsCount).toBe(3);
    });

    it('preserves the underlying space fields in the response items', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.items[0]).toMatchObject({
        id: space1.id,
        name: space1.name,
        slug: space1.slug,
        organizationId: space1.organizationId,
        isDefaultSpace: true,
      });
    });

    it('returns totalCount, page, and pageSize from pagination metadata', async () => {
      spacesPort.findOrgPagePaginated.mockResolvedValue({
        items: [space1, space2],
        totalCount: 17,
      });

      const result = await useCase.execute(buildCommand({ page: 2 }));

      expect(result.totalCount).toBe(17);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(ORGA_SPACE_MANAGEMENT_PAGE_SIZE);
    });

    it('passes spaceIds as the queried set to all aggregation ports', async () => {
      const single = spaceFactory({
        id: createSpaceId('only'),
        organizationId,
      });
      spacesPort.findOrgPagePaginated.mockResolvedValue({
        items: [single],
        totalCount: 1,
      });

      await useCase.execute(buildCommand());

      expect(spacesPort.findAdminsForSpaceIds).toHaveBeenCalledWith([
        single.id,
      ]);
      expect(spacesPort.countUsersForSpaceIds).toHaveBeenCalledWith([
        single.id,
      ]);
      expect(standardsPort.countBySpaceIds).toHaveBeenCalledWith([single.id]);
      expect(recipesPort.countBySpaceIds).toHaveBeenCalledWith([single.id]);
      expect(skillsPort.countBySpaceIds).toHaveBeenCalledWith([single.id]);
    });

    it('forwards organizationId, page, and ORGA_SPACE_MANAGEMENT_PAGE_SIZE to findOrgPagePaginated', async () => {
      await useCase.execute(buildCommand({ page: 4 }));

      expect(spacesPort.findOrgPagePaginated).toHaveBeenCalledWith(
        organizationId,
        4,
        ORGA_SPACE_MANAGEMENT_PAGE_SIZE,
      );
    });
  });
});
