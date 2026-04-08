import {
  BrowseSpacesCommand,
  createOrganizationId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  SpaceType,
  UserSpaceRole,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { BrowseSpacesUseCase } from './BrowseSpacesUseCase';

describe('BrowseSpacesUseCase', () => {
  const organizationId = createOrganizationId('org-1');
  const userId = createUserId('user-1');

  const organization = organizationFactory({ id: organizationId });
  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });

  let useCase: BrowseSpacesUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<
    Pick<
      ISpacesPort,
      | 'listUserSpaces'
      | 'listSpacesByOrganization'
      | 'findMembershipsByUserAndOrganization'
    >
  >;

  const buildCommand = (
    overrides?: Partial<BrowseSpacesCommand>,
  ): BrowseSpacesCommand => ({
    userId: userId as unknown as string,
    organizationId: organizationId as unknown as string,
    ...overrides,
  });

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      listUserSpaces: jest.fn(),
      listSpacesByOrganization: jest.fn(),
      findMembershipsByUserAndOrganization: jest.fn(),
    };

    useCase = new BrowseSpacesUseCase(
      accountsPort,
      spacesPort as unknown as ISpacesPort,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('when the user belongs to some spaces', () => {
    const memberSpace = spaceFactory({
      id: createSpaceId('space-1'),
      name: 'My Team',
      organizationId,
      type: SpaceType.open,
    });

    const openSpace = spaceFactory({
      id: createSpaceId('space-2'),
      name: 'Open Space',
      organizationId,
      type: SpaceType.open,
    });

    const restrictedSpace = spaceFactory({
      id: createSpaceId('space-3'),
      name: 'Restricted Space',
      organizationId,
      type: SpaceType.restricted,
    });

    const privateSpace = spaceFactory({
      id: createSpaceId('space-4'),
      name: 'Secret Space',
      organizationId,
      type: SpaceType.private,
    });

    const defaultSpace = spaceFactory({
      id: createSpaceId('space-default'),
      name: 'Global',
      organizationId,
      type: SpaceType.open,
      isDefaultSpace: true,
    });

    beforeEach(() => {
      spacesPort.listUserSpaces.mockResolvedValue({
        spaces: [defaultSpace, memberSpace],
      });
      spacesPort.listSpacesByOrganization.mockResolvedValue([
        defaultSpace,
        memberSpace,
        openSpace,
        restrictedSpace,
        privateSpace,
      ]);
      spacesPort.findMembershipsByUserAndOrganization.mockResolvedValue([
        {
          userId,
          spaceId: defaultSpace.id,
          role: UserSpaceRole.MEMBER,
          createdBy: userId,
        },
        {
          userId,
          spaceId: memberSpace.id,
          role: UserSpaceRole.MEMBER,
          createdBy: userId,
        },
      ]);
    });

    it('returns user spaces in mySpaces', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.mySpaces).toEqual([defaultSpace, memberSpace]);
    });

    it('returns open and restricted non-member spaces in allSpaces', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.allSpaces).toEqual([
        { id: openSpace.id, name: openSpace.name, type: SpaceType.open },
        {
          id: restrictedSpace.id,
          name: restrictedSpace.name,
          type: SpaceType.restricted,
        },
      ]);
    });

    it('excludes private spaces from allSpaces', async () => {
      const result = await useCase.execute(buildCommand());

      const privateIds = result.allSpaces.filter(
        (s) => s.type === SpaceType.private,
      );
      expect(privateIds).toEqual([]);
    });

    it('excludes default space from allSpaces', async () => {
      const result = await useCase.execute(buildCommand());

      const defaultIds = result.allSpaces.filter(
        (s) => s.id === defaultSpace.id,
      );
      expect(defaultIds).toEqual([]);
    });

    it('excludes already-member spaces from allSpaces', async () => {
      const result = await useCase.execute(buildCommand());

      const memberIds = result.allSpaces.filter((s) => s.id === memberSpace.id);
      expect(memberIds).toEqual([]);
    });
  });

  describe('when there are no discoverable spaces', () => {
    const memberSpace = spaceFactory({
      id: createSpaceId('space-1'),
      name: 'Only Space',
      organizationId,
      type: SpaceType.private,
    });

    beforeEach(() => {
      spacesPort.listUserSpaces.mockResolvedValue({
        spaces: [memberSpace],
      });
      spacesPort.listSpacesByOrganization.mockResolvedValue([memberSpace]);
      spacesPort.findMembershipsByUserAndOrganization.mockResolvedValue([
        {
          userId,
          spaceId: memberSpace.id,
          role: UserSpaceRole.MEMBER,
          createdBy: userId,
        },
      ]);
    });

    it('returns empty allSpaces', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.allSpaces).toEqual([]);
    });
  });

  describe('when the user is an organization admin', () => {
    const adminUser = userFactory({
      id: userId,
      memberships: [{ userId, organizationId, role: 'admin' }],
    });

    const memberSpace = spaceFactory({
      id: createSpaceId('space-1'),
      name: 'My Team',
      organizationId,
      type: SpaceType.open,
    });

    const privateSpace = spaceFactory({
      id: createSpaceId('space-4'),
      name: 'Secret Space',
      organizationId,
      type: SpaceType.private,
    });

    const defaultSpace = spaceFactory({
      id: createSpaceId('space-default'),
      name: 'Global',
      organizationId,
      type: SpaceType.open,
      isDefaultSpace: true,
    });

    beforeEach(() => {
      accountsPort.getUserById.mockResolvedValue(adminUser);

      spacesPort.listUserSpaces.mockResolvedValue({
        spaces: [defaultSpace, memberSpace],
      });
      spacesPort.listSpacesByOrganization.mockResolvedValue([
        defaultSpace,
        memberSpace,
        privateSpace,
      ]);
      spacesPort.findMembershipsByUserAndOrganization.mockResolvedValue([
        {
          userId,
          spaceId: defaultSpace.id,
          role: UserSpaceRole.MEMBER,
          createdBy: userId,
        },
        {
          userId,
          spaceId: memberSpace.id,
          role: UserSpaceRole.MEMBER,
          createdBy: userId,
        },
      ]);
    });

    it('includes private spaces in allSpaces', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.allSpaces).toEqual([
        {
          id: privateSpace.id,
          name: privateSpace.name,
          type: SpaceType.private,
        },
      ]);
    });

    it('still excludes already-member spaces from allSpaces', async () => {
      const result = await useCase.execute(buildCommand());

      const memberIds = result.allSpaces.filter((s) => s.id === memberSpace.id);
      expect(memberIds).toEqual([]);
    });

    it('still excludes default space from allSpaces', async () => {
      const result = await useCase.execute(buildCommand());

      const defaultIds = result.allSpaces.filter(
        (s) => s.id === defaultSpace.id,
      );
      expect(defaultIds).toEqual([]);
    });
  });
});
