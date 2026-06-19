import {
  PackmindEventEmitterService,
  SpaceMembershipRequiredError,
} from '@packmind/node-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  LeaveSpaceCommand,
  UserSpaceRole,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { SpaceNotFoundError } from '@packmind/types';
import { LeaveSpaceUseCase } from './LeaveSpaceUseCase';
import { CannotLeaveDefaultSpaceError } from '../../domain/errors/CannotLeaveDefaultSpaceError';

describe('LeaveSpaceUseCase', () => {
  const organizationId = createOrganizationId('org-1');
  const userId = createUserId('user-1');
  const spaceId = createSpaceId('space-1');

  const organization = organizationFactory({ id: organizationId });
  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });

  let useCase: LeaveSpaceUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<
    Pick<
      ISpacesPort,
      'getSpaceById' | 'findMembership' | 'removeSpaceMembership'
    >
  >;
  let eventEmitterService: jest.Mocked<
    Pick<PackmindEventEmitterService, 'emit'>
  >;

  const buildCommand = (
    overrides?: Partial<LeaveSpaceCommand>,
  ): LeaveSpaceCommand => ({
    userId: userId as unknown as string,
    organizationId: organizationId as unknown as string,
    spaceId,
    ...overrides,
  });

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      getSpaceById: jest.fn(),
      findMembership: jest.fn().mockResolvedValue({
        userId,
        spaceId,
        role: UserSpaceRole.MEMBER,
        createdBy: userId,
      }),
      removeSpaceMembership: jest.fn().mockResolvedValue(true),
    };

    eventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    };

    useCase = new LeaveSpaceUseCase(
      spacesPort as unknown as ISpacesPort,
      accountsPort,
      eventEmitterService as unknown as PackmindEventEmitterService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('when leaving a non-default space as a member', () => {
    const space = spaceFactory({
      id: spaceId,
      name: 'My Space',
      organizationId,
      isDefaultSpace: false,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(space);
    });

    it('removes the membership', async () => {
      await useCase.execute(buildCommand());

      expect(spacesPort.removeSpaceMembership).toHaveBeenCalledWith(
        userId,
        spaceId,
      );
    });

    it('emits SpaceMembersRemovedEvent', async () => {
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

  describe('when leaving a non-default space as an admin', () => {
    const adminUser = userFactory({
      id: userId,
      memberships: [{ userId, organizationId, role: 'admin' }],
    });

    const space = spaceFactory({
      id: spaceId,
      name: 'My Space',
      organizationId,
      isDefaultSpace: false,
    });

    beforeEach(() => {
      accountsPort.getUserById.mockResolvedValue(adminUser);
      spacesPort.getSpaceById.mockResolvedValue(space);
      spacesPort.findMembership.mockResolvedValue({
        userId,
        spaceId,
        role: UserSpaceRole.ADMIN,
        createdBy: userId,
      });
    });

    it('removes the membership', async () => {
      await useCase.execute(buildCommand());

      expect(spacesPort.removeSpaceMembership).toHaveBeenCalledWith(
        userId,
        spaceId,
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

    it('does not remove a membership', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);

      expect(spacesPort.removeSpaceMembership).not.toHaveBeenCalled();
    });
  });

  describe('when the space belongs to another organization', () => {
    const otherOrgSpace = spaceFactory({
      id: spaceId,
      name: 'Other Org Space',
      organizationId: createOrganizationId('other-org'),
      isDefaultSpace: false,
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

  describe('when the space is the default space', () => {
    const defaultSpace = spaceFactory({
      id: spaceId,
      name: 'Default Space',
      organizationId,
      isDefaultSpace: true,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(defaultSpace);
    });

    it('throws CannotLeaveDefaultSpaceError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        CannotLeaveDefaultSpaceError,
      );
    });

    it('does not remove a membership', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);

      expect(spacesPort.removeSpaceMembership).not.toHaveBeenCalled();
    });
  });

  describe('when the user is not a member of the space', () => {
    beforeEach(() => {
      spacesPort.findMembership.mockResolvedValue(null);
    });

    it('throws SpaceMembershipRequiredError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toBeInstanceOf(
        SpaceMembershipRequiredError,
      );
    });

    it('does not attempt to remove a membership', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);

      expect(spacesPort.removeSpaceMembership).not.toHaveBeenCalled();
    });

    it('does not emit an event', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);

      expect(eventEmitterService.emit).not.toHaveBeenCalled();
    });
  });
});
