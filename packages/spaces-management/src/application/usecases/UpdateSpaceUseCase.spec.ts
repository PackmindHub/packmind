import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  SpaceType,
  UpdateSpaceCommand,
  UserSpaceRole,
} from '@packmind/types';
import {
  OrganizationAdminRequiredError,
  PackmindEventEmitterService,
  SpaceAdminRequiredError,
} from '@packmind/node-utils';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { userSpaceMembershipFactory } from '@packmind/spaces/test/userSpaceMembershipFactory';
import { CannotUpdateDefaultSpaceVisibilityError } from '../../domain/errors/CannotUpdateDefaultSpaceVisibilityError';
import { SpaceNotFoundError } from '../../domain/errors/SpaceNotFoundError';
import { UpdateSpaceUseCase } from './UpdateSpaceUseCase';

describe('UpdateSpaceUseCase', () => {
  const organizationId = createOrganizationId('org-1');
  const userId = createUserId('user-1');
  const spaceId = createSpaceId('space-1');

  const organization = organizationFactory({ id: organizationId });
  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });
  const adminMembership = userSpaceMembershipFactory({
    userId,
    spaceId,
    role: UserSpaceRole.ADMIN,
  });

  let useCase: UpdateSpaceUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<
    Pick<ISpacesPort, 'getSpaceById' | 'updateSpace' | 'findMembership'>
  >;
  let eventEmitterService: jest.Mocked<
    Pick<PackmindEventEmitterService, 'emit'>
  >;

  const buildCommand = (
    overrides?: Partial<UpdateSpaceCommand>,
  ): UpdateSpaceCommand => ({
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
      updateSpace: jest.fn(),
      findMembership: jest.fn().mockResolvedValue(adminMembership),
    };

    eventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    };

    useCase = new UpdateSpaceUseCase(
      spacesPort as unknown as ISpacesPort,
      accountsPort,
      eventEmitterService as unknown as PackmindEventEmitterService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('when updating space type', () => {
    const existingSpace = spaceFactory({
      id: spaceId,
      organizationId,
      type: SpaceType.open,
    });
    const updatedSpace = spaceFactory({
      id: spaceId,
      organizationId,
      type: SpaceType.private,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(existingSpace);
      spacesPort.updateSpace.mockResolvedValue(updatedSpace);
    });

    it('returns the updated space', async () => {
      const result = await useCase.execute(
        buildCommand({ type: SpaceType.private }),
      );

      expect(result).toEqual(updatedSpace);
    });

    it('emits SpaceVisibilityUpdatedEvent', async () => {
      await useCase.execute(buildCommand({ type: SpaceType.private }));

      expect(eventEmitterService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            spaceId,
            newVisibility: SpaceType.private,
          }),
        }),
      );
    });
  });

  describe('when updating only the name', () => {
    const existingSpace = spaceFactory({
      id: spaceId,
      organizationId,
      type: SpaceType.open,
    });
    const updatedSpace = spaceFactory({
      ...existingSpace,
      name: 'New Name',
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(existingSpace);
      spacesPort.updateSpace.mockResolvedValue(updatedSpace);
    });

    it('does not emit SpaceVisibilityUpdatedEvent', async () => {
      await useCase.execute(buildCommand({ name: 'New Name' }));

      expect(eventEmitterService.emit).not.toHaveBeenCalled();
    });
  });

  describe('when no fields are provided', () => {
    const existingSpace = spaceFactory({
      id: spaceId,
      organizationId,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(existingSpace);
    });

    it('returns the existing space without updating', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result).toEqual(existingSpace);
    });

    it('does not emit any event', async () => {
      await useCase.execute(buildCommand());

      expect(eventEmitterService.emit).not.toHaveBeenCalled();
    });
  });

  describe('when space is the default space', () => {
    const defaultSpace = spaceFactory({
      id: spaceId,
      organizationId,
      isDefaultSpace: true,
      type: SpaceType.open,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(defaultSpace);
    });

    describe('when updating type', () => {
      it('throws CannotUpdateDefaultSpaceVisibilityError', async () => {
        await expect(
          useCase.execute(buildCommand({ type: SpaceType.private })),
        ).rejects.toThrow(CannotUpdateDefaultSpaceVisibilityError);
      });

      it('does not call updateSpace', async () => {
        await useCase
          .execute(buildCommand({ type: SpaceType.private }))
          .catch(() => undefined);

        expect(spacesPort.updateSpace).not.toHaveBeenCalled();
      });

      it('does not emit any event', async () => {
        await useCase
          .execute(buildCommand({ type: SpaceType.private }))
          .catch(() => undefined);

        expect(eventEmitterService.emit).not.toHaveBeenCalled();
      });
    });

    describe('when updating name', () => {
      it('allows updating the name', async () => {
        const updatedSpace = spaceFactory({
          ...defaultSpace,
          name: 'New Name',
        });
        spacesPort.updateSpace.mockResolvedValue(updatedSpace);

        const result = await useCase.execute(
          buildCommand({ name: 'New Name' }),
        );

        expect(result).toEqual(updatedSpace);
      });
    });
  });

  describe('when space is not found', () => {
    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(null);
    });

    it('throws SpaceNotFoundError', async () => {
      await expect(
        useCase.execute(buildCommand({ type: SpaceType.private })),
      ).rejects.toThrow(SpaceNotFoundError);
    });

    it('does not emit any event', async () => {
      await useCase
        .execute(buildCommand({ type: SpaceType.private }))
        .catch(() => undefined);

      expect(eventEmitterService.emit).not.toHaveBeenCalled();
    });
  });

  describe('when changing visibility to open or restricted', () => {
    const existingSpace = spaceFactory({
      id: spaceId,
      organizationId,
      type: SpaceType.private,
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(existingSpace);
    });

    it('throws OrganizationAdminRequiredError when org member changes type to open', async () => {
      await expect(
        useCase.execute(buildCommand({ type: SpaceType.open })),
      ).rejects.toThrow(OrganizationAdminRequiredError);
    });

    it('throws OrganizationAdminRequiredError when org member changes type to restricted', async () => {
      await expect(
        useCase.execute(buildCommand({ type: SpaceType.restricted })),
      ).rejects.toThrow(OrganizationAdminRequiredError);
    });

    it('allows org admin to change type to open', async () => {
      const orgAdmin = userFactory({
        id: userId,
        memberships: [{ userId, organizationId, role: 'admin' }],
      });
      accountsPort.getUserById.mockResolvedValue(orgAdmin);

      const updatedSpace = spaceFactory({
        id: spaceId,
        organizationId,
        type: SpaceType.open,
      });
      spacesPort.updateSpace.mockResolvedValue(updatedSpace);

      const result = await useCase.execute(
        buildCommand({ type: SpaceType.open }),
      );

      expect(result).toEqual(updatedSpace);
    });

    it('allows org member to change type to private', async () => {
      const openSpace = spaceFactory({
        id: spaceId,
        organizationId,
        type: SpaceType.open,
      });
      spacesPort.getSpaceById.mockResolvedValue(openSpace);

      const updatedSpace = spaceFactory({
        id: spaceId,
        organizationId,
        type: SpaceType.private,
      });
      spacesPort.updateSpace.mockResolvedValue(updatedSpace);

      const result = await useCase.execute(
        buildCommand({ type: SpaceType.private }),
      );

      expect(result).toEqual(updatedSpace);
    });
  });

  describe('when user is not a space admin', () => {
    beforeEach(() => {
      spacesPort.findMembership.mockResolvedValue(
        userSpaceMembershipFactory({
          userId,
          spaceId,
          role: UserSpaceRole.MEMBER,
        }),
      );
    });

    it('throws SpaceAdminRequiredError', async () => {
      await expect(
        useCase.execute(buildCommand({ type: SpaceType.private })),
      ).rejects.toThrow(SpaceAdminRequiredError);
    });
  });
});
