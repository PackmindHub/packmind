import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  DeleteSpaceCommand,
  IAccountsPort,
  ISpacesPort,
  UserSpaceRole,
} from '@packmind/types';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { SpaceNotFoundError } from '@packmind/types';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { CannotDeleteDefaultSpaceError } from '../../domain/errors/CannotDeleteDefaultSpaceError';
import { SpaceDeletionForbiddenError } from '../../domain/errors/SpaceDeletionForbiddenError';
import { DeleteSpaceUseCase } from './DeleteSpaceUseCase';

describe('DeleteSpaceUseCase', () => {
  const organizationId = createOrganizationId('org-1');
  const userId = createUserId('user-1');
  const spaceId = createSpaceId('space-1');

  let useCase: DeleteSpaceUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<
    Pick<
      ISpacesPort,
      | 'getSpaceById'
      | 'findMembership'
      | 'softDeleteMembershipsBySpaceId'
      | 'deleteSpace'
    >
  >;
  let eventEmitterService: jest.Mocked<
    Pick<PackmindEventEmitterService, 'emit'>
  >;

  const existingSpace = spaceFactory({
    id: spaceId,
    organizationId,
    isDefaultSpace: false,
    name: 'My Space',
    slug: 'my-space',
  });

  const buildCommand = (
    overrides?: Partial<DeleteSpaceCommand>,
  ): DeleteSpaceCommand => ({
    userId: userId as unknown as string,
    organizationId: organizationId as unknown as string,
    spaceId: spaceId as unknown as string,
    ...overrides,
  });

  beforeEach(() => {
    spacesPort = {
      getSpaceById: jest.fn(),
      findMembership: jest.fn(),
      softDeleteMembershipsBySpaceId: jest.fn().mockResolvedValue(3),
      deleteSpace: jest.fn().mockResolvedValue(undefined),
    };

    eventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    };
  });

  afterEach(() => jest.clearAllMocks());

  describe('when called by an organization admin', () => {
    const orgAdminUser = userFactory({
      id: userId,
      memberships: [{ userId, organizationId, role: 'admin' }],
    });
    const organization = organizationFactory({ id: organizationId });

    beforeEach(() => {
      accountsPort = {
        getUserById: jest.fn().mockResolvedValue(orgAdminUser),
        getOrganizationById: jest.fn().mockResolvedValue(organization),
      } as unknown as jest.Mocked<IAccountsPort>;

      spacesPort.getSpaceById.mockResolvedValue(existingSpace);

      useCase = new DeleteSpaceUseCase(
        accountsPort,
        spacesPort as unknown as ISpacesPort,
        eventEmitterService as unknown as PackmindEventEmitterService,
      );
    });

    it('soft-deletes all memberships for the space', async () => {
      await useCase.execute(buildCommand());

      expect(spacesPort.softDeleteMembershipsBySpaceId).toHaveBeenCalledWith(
        spaceId,
        userId,
      );
    });

    it('soft-deletes the space', async () => {
      await useCase.execute(buildCommand());

      expect(spacesPort.deleteSpace).toHaveBeenCalledWith(spaceId, userId);
    });

    it('emits a SpaceDeletedEvent', async () => {
      await useCase.execute(buildCommand());

      expect(eventEmitterService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            spaceId,
            spaceName: existingSpace.name,
            spaceSlug: existingSpace.slug,
          }),
        }),
      );
    });

    it('does not check space membership', async () => {
      await useCase.execute(buildCommand());

      expect(spacesPort.findMembership).not.toHaveBeenCalled();
    });
  });

  describe('when called by a space admin who is not an org admin', () => {
    const memberUser = userFactory({
      id: userId,
      memberships: [{ userId, organizationId, role: 'member' }],
    });
    const organization = organizationFactory({ id: organizationId });

    beforeEach(() => {
      accountsPort = {
        getUserById: jest.fn().mockResolvedValue(memberUser),
        getOrganizationById: jest.fn().mockResolvedValue(organization),
      } as unknown as jest.Mocked<IAccountsPort>;

      spacesPort.getSpaceById.mockResolvedValue(existingSpace);
      spacesPort.findMembership.mockResolvedValue({
        userId,
        spaceId,
        role: UserSpaceRole.ADMIN,
        createdBy: userId,
        updatedBy: userId,
      });

      useCase = new DeleteSpaceUseCase(
        accountsPort,
        spacesPort as unknown as ISpacesPort,
        eventEmitterService as unknown as PackmindEventEmitterService,
      );
    });

    it('soft-deletes all memberships for the space', async () => {
      await useCase.execute(buildCommand());

      expect(spacesPort.softDeleteMembershipsBySpaceId).toHaveBeenCalledWith(
        spaceId,
        userId,
      );
    });

    it('soft-deletes the space', async () => {
      await useCase.execute(buildCommand());

      expect(spacesPort.deleteSpace).toHaveBeenCalledWith(spaceId, userId);
    });

    it('emits a SpaceDeletedEvent', async () => {
      await useCase.execute(buildCommand());

      expect(eventEmitterService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            spaceId,
            spaceName: existingSpace.name,
            spaceSlug: existingSpace.slug,
          }),
        }),
      );
    });

    it('checks space membership', async () => {
      await useCase.execute(buildCommand());

      expect(spacesPort.findMembership).toHaveBeenCalledWith(userId, spaceId);
    });
  });

  describe('when the space is the default space', () => {
    const defaultSpace = spaceFactory({
      id: spaceId,
      organizationId,
      isDefaultSpace: true,
    });

    const orgAdminUser = userFactory({
      id: userId,
      memberships: [{ userId, organizationId, role: 'admin' }],
    });
    const organization = organizationFactory({ id: organizationId });

    beforeEach(() => {
      accountsPort = {
        getUserById: jest.fn().mockResolvedValue(orgAdminUser),
        getOrganizationById: jest.fn().mockResolvedValue(organization),
      } as unknown as jest.Mocked<IAccountsPort>;

      spacesPort.getSpaceById.mockResolvedValue(defaultSpace);

      useCase = new DeleteSpaceUseCase(
        accountsPort,
        spacesPort as unknown as ISpacesPort,
        eventEmitterService as unknown as PackmindEventEmitterService,
      );
    });

    it('throws CannotDeleteDefaultSpaceError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        CannotDeleteDefaultSpaceError,
      );
    });

    it('does not call deleteSpace', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);

      expect(spacesPort.deleteSpace).not.toHaveBeenCalled();
    });

    it('does not emit any event', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);

      expect(eventEmitterService.emit).not.toHaveBeenCalled();
    });
  });

  describe('when the space is not found', () => {
    const orgAdminUser = userFactory({
      id: userId,
      memberships: [{ userId, organizationId, role: 'admin' }],
    });
    const organization = organizationFactory({ id: organizationId });

    beforeEach(() => {
      accountsPort = {
        getUserById: jest.fn().mockResolvedValue(orgAdminUser),
        getOrganizationById: jest.fn().mockResolvedValue(organization),
      } as unknown as jest.Mocked<IAccountsPort>;

      spacesPort.getSpaceById.mockResolvedValue(null);

      useCase = new DeleteSpaceUseCase(
        accountsPort,
        spacesPort as unknown as ISpacesPort,
        eventEmitterService as unknown as PackmindEventEmitterService,
      );
    });

    it('throws SpaceNotFoundError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        SpaceNotFoundError,
      );
    });
  });

  describe('when the space belongs to a different organization', () => {
    const spaceFromOtherOrg = spaceFactory({
      id: spaceId,
      organizationId: createOrganizationId('other-org'),
      isDefaultSpace: false,
    });

    const orgAdminUser = userFactory({
      id: userId,
      memberships: [{ userId, organizationId, role: 'admin' }],
    });
    const organization = organizationFactory({ id: organizationId });

    beforeEach(() => {
      accountsPort = {
        getUserById: jest.fn().mockResolvedValue(orgAdminUser),
        getOrganizationById: jest.fn().mockResolvedValue(organization),
      } as unknown as jest.Mocked<IAccountsPort>;

      spacesPort.getSpaceById.mockResolvedValue(spaceFromOtherOrg);

      useCase = new DeleteSpaceUseCase(
        accountsPort,
        spacesPort as unknown as ISpacesPort,
        eventEmitterService as unknown as PackmindEventEmitterService,
      );
    });

    it('throws SpaceNotFoundError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        SpaceNotFoundError,
      );
    });
  });

  describe('when the user is neither org admin nor space admin', () => {
    const memberUser = userFactory({
      id: userId,
      memberships: [{ userId, organizationId, role: 'member' }],
    });
    const organization = organizationFactory({ id: organizationId });

    beforeEach(() => {
      accountsPort = {
        getUserById: jest.fn().mockResolvedValue(memberUser),
        getOrganizationById: jest.fn().mockResolvedValue(organization),
      } as unknown as jest.Mocked<IAccountsPort>;

      spacesPort.getSpaceById.mockResolvedValue(existingSpace);
      spacesPort.findMembership.mockResolvedValue({
        userId,
        spaceId,
        role: UserSpaceRole.MEMBER,
        createdBy: userId,
        updatedBy: userId,
      });

      useCase = new DeleteSpaceUseCase(
        accountsPort,
        spacesPort as unknown as ISpacesPort,
        eventEmitterService as unknown as PackmindEventEmitterService,
      );
    });

    it('throws SpaceDeletionForbiddenError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        SpaceDeletionForbiddenError,
      );
    });

    it('does not call deleteSpace', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);

      expect(spacesPort.deleteSpace).not.toHaveBeenCalled();
    });
  });

  describe('when the user is an org member but not a space member', () => {
    const memberUser = userFactory({
      id: userId,
      memberships: [{ userId, organizationId, role: 'member' }],
    });
    const organization = organizationFactory({ id: organizationId });

    beforeEach(() => {
      accountsPort = {
        getUserById: jest.fn().mockResolvedValue(memberUser),
        getOrganizationById: jest.fn().mockResolvedValue(organization),
      } as unknown as jest.Mocked<IAccountsPort>;

      spacesPort.getSpaceById.mockResolvedValue(existingSpace);
      spacesPort.findMembership.mockResolvedValue(null);

      useCase = new DeleteSpaceUseCase(
        accountsPort,
        spacesPort as unknown as ISpacesPort,
        eventEmitterService as unknown as PackmindEventEmitterService,
      );
    });

    it('throws SpaceDeletionForbiddenError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        SpaceDeletionForbiddenError,
      );
    });
  });
});
