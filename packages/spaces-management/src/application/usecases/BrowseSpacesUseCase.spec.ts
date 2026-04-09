import {
  BrowseSpacesCommand,
  createOrganizationId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  SpaceType,
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
    Pick<ISpacesPort, 'listUserSpaces' | 'listSpacesByOrganization'>
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
    });

    it('returns user spaces in mySpaces', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.mySpaces).toEqual([defaultSpace, memberSpace]);
    });

    it('excludes user member spaces from allSpaces', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.allSpaces).toEqual([
        {
          id: openSpace.id,
          name: openSpace.name,
          slug: openSpace.slug,
          type: SpaceType.open,
        },
        {
          id: restrictedSpace.id,
          name: restrictedSpace.name,
          slug: restrictedSpace.slug,
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
  });

  describe('when the user only belongs to a private space', () => {
    const memberPrivateSpace = spaceFactory({
      id: createSpaceId('space-1'),
      name: 'Only Space',
      organizationId,
      type: SpaceType.private,
    });

    beforeEach(() => {
      spacesPort.listUserSpaces.mockResolvedValue({
        spaces: [memberPrivateSpace],
      });
      spacesPort.listSpacesByOrganization.mockResolvedValue([
        memberPrivateSpace,
      ]);
    });

    it('returns empty allSpaces', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.allSpaces).toEqual([]);
    });
  });

  describe('when there are no discoverable spaces', () => {
    const defaultSpace = spaceFactory({
      id: createSpaceId('space-default'),
      name: 'Global',
      organizationId,
      type: SpaceType.open,
      isDefaultSpace: true,
    });

    beforeEach(() => {
      spacesPort.listUserSpaces.mockResolvedValue({
        spaces: [defaultSpace],
      });
      spacesPort.listSpacesByOrganization.mockResolvedValue([defaultSpace]);
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
    });

    it('includes private spaces the admin is not a member of', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result.allSpaces).toEqual([
        {
          id: privateSpace.id,
          name: privateSpace.name,
          slug: privateSpace.slug,
          type: SpaceType.private,
        },
      ]);
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
