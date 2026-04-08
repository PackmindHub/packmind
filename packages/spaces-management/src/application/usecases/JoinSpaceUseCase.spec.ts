import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  JoinSpaceCommand,
  SpaceType,
  UserSpaceRole,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { JoinSpaceUseCase } from './JoinSpaceUseCase';
import { SpaceNotFoundError } from '../../domain/errors/SpaceNotFoundError';
import { SpaceNotJoinableError } from '../../domain/errors/SpaceNotJoinableError';

describe('JoinSpaceUseCase', () => {
  const organizationId = createOrganizationId('org-1');
  const userId = createUserId('user-1');
  const spaceId = createSpaceId('space-1');

  const organization = organizationFactory({ id: organizationId });
  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });

  let useCase: JoinSpaceUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<
    Pick<ISpacesPort, 'getSpaceById' | 'findMembership' | 'addSpaceMembership'>
  >;
  let eventEmitterService: jest.Mocked<
    Pick<PackmindEventEmitterService, 'emit'>
  >;

  const buildCommand = (
    overrides?: Partial<JoinSpaceCommand>,
  ): JoinSpaceCommand => ({
    userId: userId as unknown as string,
    organizationId: organizationId as unknown as string,
    spaceId: spaceId as unknown as string,
    ...overrides,
  });

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      getSpaceById: jest.fn(),
      findMembership: jest.fn(),
      addSpaceMembership: jest.fn(),
    };

    eventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    };

    useCase = new JoinSpaceUseCase(
      accountsPort,
      spacesPort as unknown as ISpacesPort,
      eventEmitterService as unknown as PackmindEventEmitterService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('when joining an open space successfully', () => {
    const openSpace = spaceFactory({
      id: spaceId,
      name: 'Open Space',
      organizationId,
      type: SpaceType.open,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(openSpace);
      spacesPort.findMembership.mockResolvedValue(null);
      spacesPort.addSpaceMembership.mockResolvedValue({
        userId,
        spaceId,
        role: UserSpaceRole.MEMBER,
        createdBy: userId,
      });
    });

    it('adds the user as a member', async () => {
      await useCase.execute(buildCommand());

      expect(spacesPort.addSpaceMembership).toHaveBeenCalledWith({
        userId,
        spaceId,
        role: UserSpaceRole.MEMBER,
        createdBy: userId,
      });
    });

    it('emits SpaceMembersAddedEvent with the joining user', async () => {
      await useCase.execute(buildCommand());

      expect(eventEmitterService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            spaceId,
            memberUserIds: [userId],
          }),
        }),
      );
    });
  });

  describe('when the space does not exist', () => {
    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(null);
    });

    it('throws SpaceNotFoundError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        SpaceNotFoundError,
      );
    });

    it('does not add a membership', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);
      expect(spacesPort.addSpaceMembership).not.toHaveBeenCalled();
    });
  });

  describe('when the space belongs to another organization', () => {
    const otherOrgSpace = spaceFactory({
      id: spaceId,
      name: 'Other Org Space',
      organizationId: createOrganizationId('other-org'),
      type: SpaceType.open,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(otherOrgSpace);
    });

    it('throws SpaceNotFoundError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        SpaceNotFoundError,
      );
    });
  });

  describe('when the space is private', () => {
    const privateSpace = spaceFactory({
      id: spaceId,
      name: 'Private Space',
      organizationId,
      type: SpaceType.private,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(privateSpace);
    });

    it('throws SpaceNotFoundError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        SpaceNotFoundError,
      );
    });
  });

  describe('when the space is restricted', () => {
    const restrictedSpace = spaceFactory({
      id: spaceId,
      name: 'Restricted Space',
      organizationId,
      type: SpaceType.restricted,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(restrictedSpace);
    });

    it('throws SpaceNotJoinableError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        SpaceNotJoinableError,
      );
    });
  });

  describe('when the user is already a member', () => {
    const openSpace = spaceFactory({
      id: spaceId,
      name: 'Open Space',
      organizationId,
      type: SpaceType.open,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(openSpace);
      spacesPort.findMembership.mockResolvedValue({
        userId,
        spaceId,
        role: UserSpaceRole.MEMBER,
        createdBy: userId,
      });
    });

    it('does not add a duplicate membership', async () => {
      await useCase.execute(buildCommand());
      expect(spacesPort.addSpaceMembership).not.toHaveBeenCalled();
    });

    it('does not emit SpaceMembersAddedEvent', async () => {
      await useCase.execute(buildCommand());

      expect(eventEmitterService.emit).not.toHaveBeenCalled();
    });
  });

  describe('when the user is an organization admin', () => {
    const adminUser = userFactory({
      id: userId,
      memberships: [{ userId, organizationId, role: 'admin' }],
    });

    beforeEach(() => {
      accountsPort.getUserById.mockResolvedValue(adminUser);
    });

    describe('when joining a private space', () => {
      const privateSpace = spaceFactory({
        id: spaceId,
        name: 'Private Space',
        organizationId,
        type: SpaceType.private,
      });

      beforeEach(() => {
        spacesPort.getSpaceById.mockResolvedValue(privateSpace);
        spacesPort.findMembership.mockResolvedValue(null);
        spacesPort.addSpaceMembership.mockResolvedValue({
          userId,
          spaceId,
          role: UserSpaceRole.ADMIN,
          createdBy: userId,
        });
      });

      it('adds the user as an admin', async () => {
        await useCase.execute(buildCommand());

        expect(spacesPort.addSpaceMembership).toHaveBeenCalledWith({
          userId,
          spaceId,
          role: UserSpaceRole.ADMIN,
          createdBy: userId,
        });
      });
    });

    describe('when joining a restricted space', () => {
      const restrictedSpace = spaceFactory({
        id: spaceId,
        name: 'Restricted Space',
        organizationId,
        type: SpaceType.restricted,
      });

      beforeEach(() => {
        spacesPort.getSpaceById.mockResolvedValue(restrictedSpace);
        spacesPort.findMembership.mockResolvedValue(null);
        spacesPort.addSpaceMembership.mockResolvedValue({
          userId,
          spaceId,
          role: UserSpaceRole.ADMIN,
          createdBy: userId,
        });
      });

      it('adds the user as an admin', async () => {
        await useCase.execute(buildCommand());

        expect(spacesPort.addSpaceMembership).toHaveBeenCalledWith({
          userId,
          spaceId,
          role: UserSpaceRole.ADMIN,
          createdBy: userId,
        });
      });
    });

    describe('when joining an open space', () => {
      const openSpace = spaceFactory({
        id: spaceId,
        name: 'Open Space',
        organizationId,
        type: SpaceType.open,
      });

      beforeEach(() => {
        spacesPort.getSpaceById.mockResolvedValue(openSpace);
        spacesPort.findMembership.mockResolvedValue(null);
        spacesPort.addSpaceMembership.mockResolvedValue({
          userId,
          spaceId,
          role: UserSpaceRole.ADMIN,
          createdBy: userId,
        });
      });

      it('adds the user as an admin', async () => {
        await useCase.execute(buildCommand());

        expect(spacesPort.addSpaceMembership).toHaveBeenCalledWith({
          userId,
          spaceId,
          role: UserSpaceRole.ADMIN,
          createdBy: userId,
        });
      });
    });
  });
});
