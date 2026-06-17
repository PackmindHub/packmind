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
      | 'findOrgPagePaginated'
      | 'findAdminsForSpaceIds'
      | 'countUsersForSpaceIds'
      | 'findMemberIdsForSpaceIds'
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
      findMemberIdsForSpaceIds: jest.fn().mockResolvedValue(new Map()),
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
    describe('when page < 1', () => {
      it('throws InvalidPageError', async () => {
        await expect(
          useCase.execute(buildCommand({ page: 0 })),
        ).rejects.toThrow(InvalidPageError);
      });
    });

    describe('when page is negative', () => {
      it('throws InvalidPageError', async () => {
        await expect(
          useCase.execute(buildCommand({ page: -3 })),
        ).rejects.toThrow(InvalidPageError);
      });
    });

    describe('when page is not an integer', () => {
      it('throws InvalidPageError', async () => {
        await expect(
          useCase.execute(buildCommand({ page: 1.5 })),
        ).rejects.toThrow(InvalidPageError);
      });
    });

    describe('when validation fails', () => {
      it('does not call the spaces port', async () => {
        await useCase.execute(buildCommand({ page: 0 })).catch(() => undefined);

        expect(spacesPort.findOrgPagePaginated).not.toHaveBeenCalled();
      });
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

    describe('when caller is not an admin', () => {
      it('does not query spaces', async () => {
        accountsPort = {
          getUserById: jest.fn().mockResolvedValue(orgMemberUser),
          getOrganizationById: jest.fn().mockResolvedValue(organization),
        } as unknown as jest.Mocked<IAccountsPort>;
        useCase = buildUseCase();

        await useCase.execute(buildCommand()).catch(() => undefined);

        expect(spacesPort.findOrgPagePaginated).not.toHaveBeenCalled();
      });
    });
  });

  describe('empty page', () => {
    describe('when page is past the last page', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        spacesPort.findOrgPagePaginated.mockResolvedValue({
          items: [],
          totalCount: 32,
        });
        result = await useCase.execute(buildCommand({ page: 99 }));
      });

      it('returns empty items', () => {
        expect(result.items).toEqual([]);
      });

      it('returns the real totalCount', () => {
        expect(result.totalCount).toBe(32);
      });

      it('returns the requested page number', () => {
        expect(result.page).toBe(99);
      });

      it('returns ORGA_SPACE_MANAGEMENT_PAGE_SIZE', () => {
        expect(result.pageSize).toBe(ORGA_SPACE_MANAGEMENT_PAGE_SIZE);
      });
    });

    describe('when there are no spaces on the page', () => {
      beforeEach(async () => {
        spacesPort.findOrgPagePaginated.mockResolvedValue({
          items: [],
          totalCount: 0,
        });
        await useCase.execute(buildCommand());
      });

      it('does not query findAdminsForSpaceIds', () => {
        expect(spacesPort.findAdminsForSpaceIds).not.toHaveBeenCalled();
      });

      it('does not query countUsersForSpaceIds', () => {
        expect(spacesPort.countUsersForSpaceIds).not.toHaveBeenCalled();
      });

      it('does not query findMemberIdsForSpaceIds', () => {
        expect(spacesPort.findMemberIdsForSpaceIds).not.toHaveBeenCalled();
      });

      it('does not query standardsPort.countBySpaceIds', () => {
        expect(standardsPort.countBySpaceIds).not.toHaveBeenCalled();
      });

      it('does not query recipesPort.countBySpaceIds', () => {
        expect(recipesPort.countBySpaceIds).not.toHaveBeenCalled();
      });

      it('does not query skillsPort.countBySpaceIds', () => {
        expect(skillsPort.countBySpaceIds).not.toHaveBeenCalled();
      });
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

    describe('when stitching admins and counts per space', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
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
        recipesPort.countBySpaceIds.mockResolvedValue(
          new Map([[space2.id, 3]]),
        );
        skillsPort.countBySpaceIds.mockResolvedValue(new Map());

        result = await useCase.execute(buildCommand());
      });

      it('returns two items', () => {
        expect(result.items).toHaveLength(2);
      });

      it('sets the correct admins for space1', () => {
        expect(
          result.items[0].admins.map((admin) => admin.displayName),
        ).toEqual(['Alice']);
      });

      it('defaults membersCount to 0 for space1 (missing in map)', () => {
        expect(result.items[0].membersCount).toBe(0);
      });

      it('sets the correct artifactsCount for space1', () => {
        expect(result.items[0].artifactsCount).toBe(4);
      });

      it('sets the correct admins for space2', () => {
        expect(
          result.items[1].admins.map((admin) => admin.displayName).sort(),
        ).toEqual(['Bob', 'Carol']);
      });

      it('sets the correct membersCount for space2', () => {
        expect(result.items[1].membersCount).toBe(7);
      });

      it('sets the correct artifactsCount for space2', () => {
        expect(result.items[1].artifactsCount).toBe(3);
      });
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

    describe('when returning pagination metadata', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        spacesPort.findOrgPagePaginated.mockResolvedValue({
          items: [space1, space2],
          totalCount: 17,
        });
        result = await useCase.execute(buildCommand({ page: 2 }));
      });

      it('returns the correct totalCount', () => {
        expect(result.totalCount).toBe(17);
      });

      it('returns the requested page', () => {
        expect(result.page).toBe(2);
      });

      it('returns ORGA_SPACE_MANAGEMENT_PAGE_SIZE', () => {
        expect(result.pageSize).toBe(ORGA_SPACE_MANAGEMENT_PAGE_SIZE);
      });
    });

    describe('when passing spaceIds to aggregation ports', () => {
      let singleId: ReturnType<typeof createSpaceId>;

      beforeEach(async () => {
        const single = spaceFactory({
          id: createSpaceId('only'),
          organizationId,
        });
        singleId = single.id;
        spacesPort.findOrgPagePaginated.mockResolvedValue({
          items: [single],
          totalCount: 1,
        });

        await useCase.execute(buildCommand());
      });

      it('passes the spaceId to findAdminsForSpaceIds', () => {
        expect(spacesPort.findAdminsForSpaceIds).toHaveBeenCalledWith([
          singleId,
        ]);
      });

      it('passes the spaceId to countUsersForSpaceIds', () => {
        expect(spacesPort.countUsersForSpaceIds).toHaveBeenCalledWith([
          singleId,
        ]);
      });

      it('passes the spaceId to findMemberIdsForSpaceIds', () => {
        expect(spacesPort.findMemberIdsForSpaceIds).toHaveBeenCalledWith([
          singleId,
        ]);
      });

      it('passes the spaceId to standardsPort.countBySpaceIds', () => {
        expect(standardsPort.countBySpaceIds).toHaveBeenCalledWith([singleId]);
      });

      it('passes the spaceId to recipesPort.countBySpaceIds', () => {
        expect(recipesPort.countBySpaceIds).toHaveBeenCalledWith([singleId]);
      });

      it('passes the spaceId to skillsPort.countBySpaceIds', () => {
        expect(skillsPort.countBySpaceIds).toHaveBeenCalledWith([singleId]);
      });
    });

    it('forwards organizationId, page, and ORGA_SPACE_MANAGEMENT_PAGE_SIZE to findOrgPagePaginated', async () => {
      await useCase.execute(buildCommand({ page: 4 }));

      expect(spacesPort.findOrgPagePaginated).toHaveBeenCalledWith(
        organizationId,
        4,
        ORGA_SPACE_MANAGEMENT_PAGE_SIZE,
      );
    });

    describe('when including memberIds per space', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;
      let userId1: ReturnType<typeof createUserId>;
      let userId2: ReturnType<typeof createUserId>;
      let userId3: ReturnType<typeof createUserId>;

      beforeEach(async () => {
        userId1 = createUserId('member-1');
        userId2 = createUserId('member-2');
        userId3 = createUserId('member-3');

        spacesPort.findMemberIdsForSpaceIds.mockResolvedValue(
          new Map([
            [space1.id, [userId1, userId2]],
            [space2.id, [userId3]],
          ]),
        );

        result = await useCase.execute(buildCommand());
      });

      it('returns the correct memberIds for space1', () => {
        expect(result.items[0].memberIds).toEqual([userId1, userId2]);
      });

      it('returns the correct memberIds for space2', () => {
        expect(result.items[1].memberIds).toEqual([userId3]);
      });
    });

    describe('when space has no members', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        spacesPort.findMemberIdsForSpaceIds.mockResolvedValue(new Map());
        result = await useCase.execute(buildCommand());
      });

      it('defaults space1 memberIds to empty array', () => {
        expect(result.items[0].memberIds).toEqual([]);
      });

      it('defaults space2 memberIds to empty array', () => {
        expect(result.items[1].memberIds).toEqual([]);
      });
    });
  });
});
