import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  PinSpaceCommand,
  UserSpaceRole,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { PinSpaceUseCase } from './PinSpaceUseCase';
import { CannotPinDefaultSpaceError } from '../../domain/errors/CannotPinDefaultSpaceError';
import { SpaceMembershipNotFoundError } from '../../domain/errors/SpaceMembershipNotFoundError';

describe('PinSpaceUseCase', () => {
  const organizationId = createOrganizationId('org-1');
  const userId = createUserId('user-1');
  const spaceId = createSpaceId('space-1');

  const organization = organizationFactory({ id: organizationId });
  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });

  let useCase: PinSpaceUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<
    Pick<
      ISpacesPort,
      'getSpaceById' | 'findMembership' | 'updateMembershipPinned'
    >
  >;
  let eventEmitterService: jest.Mocked<
    Pick<PackmindEventEmitterService, 'emit'>
  >;

  const buildCommand = (
    overrides?: Partial<PinSpaceCommand>,
  ): PinSpaceCommand => ({
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
      updateMembershipPinned: jest.fn(),
    };

    eventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    };

    useCase = new PinSpaceUseCase(
      accountsPort,
      spacesPort as unknown as ISpacesPort,
      eventEmitterService as unknown as PackmindEventEmitterService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('when membership exists and space is not default', () => {
    const space = spaceFactory({
      id: spaceId,
      name: 'Test Space',
      organizationId,
      isDefaultSpace: false,
    });

    beforeEach(() => {
      spacesPort.findMembership.mockResolvedValue({
        userId,
        spaceId,
        role: UserSpaceRole.MEMBER,
        pinned: false,
        createdBy: userId,
      });
      spacesPort.getSpaceById.mockResolvedValue(space);
      spacesPort.updateMembershipPinned.mockResolvedValue(true);
    });

    it('calls updateMembershipPinned with true', async () => {
      await useCase.execute(buildCommand());

      expect(spacesPort.updateMembershipPinned).toHaveBeenCalledWith(
        userId,
        spaceId,
        true,
      );
    });

    it('emits SpacePinnedEvent', async () => {
      await useCase.execute(buildCommand());

      expect(eventEmitterService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            spaceId,
            userId,
            organizationId,
          }),
        }),
      );
    });
  });

  describe('when the space is the default space', () => {
    const defaultSpace = spaceFactory({
      id: spaceId,
      name: 'Global',
      organizationId,
      isDefaultSpace: true,
    });

    beforeEach(() => {
      spacesPort.findMembership.mockResolvedValue({
        userId,
        spaceId,
        role: UserSpaceRole.MEMBER,
        pinned: false,
        createdBy: userId,
      });
      spacesPort.getSpaceById.mockResolvedValue(defaultSpace);
    });

    it('throws CannotPinDefaultSpaceError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        CannotPinDefaultSpaceError,
      );
    });

    it('does not call updateMembershipPinned', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);

      expect(spacesPort.updateMembershipPinned).not.toHaveBeenCalled();
    });
  });

  describe('when membership does not exist', () => {
    const space = spaceFactory({
      id: spaceId,
      name: 'Test Space',
      organizationId,
      isDefaultSpace: false,
    });

    beforeEach(() => {
      spacesPort.findMembership.mockResolvedValue(null);
      spacesPort.getSpaceById.mockResolvedValue(space);
    });

    it('throws SpaceMembershipNotFoundError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        SpaceMembershipNotFoundError,
      );
    });

    it('does not call updateMembershipPinned', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);

      expect(spacesPort.updateMembershipPinned).not.toHaveBeenCalled();
    });

    it('does not emit an event', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);

      expect(eventEmitterService.emit).not.toHaveBeenCalled();
    });
  });

  describe('when the space does not exist', () => {
    beforeEach(() => {
      spacesPort.findMembership.mockResolvedValue({
        userId,
        spaceId,
        role: UserSpaceRole.MEMBER,
        pinned: false,
        createdBy: userId,
      });
      spacesPort.getSpaceById.mockResolvedValue(null);
    });

    it('throws SpaceNotFoundError', async () => {
      const { SpaceNotFoundError } =
        await import('../../domain/errors/SpaceNotFoundError');
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        SpaceNotFoundError,
      );
    });

    it('does not call updateMembershipPinned', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);

      expect(spacesPort.updateMembershipPinned).not.toHaveBeenCalled();
    });
  });
});
