import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  SpaceColor,
  SpaceRenamedEvent,
  SpaceType,
  SpaceVisibilityUpdatedEvent,
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
import { SpaceNotFoundError } from '@packmind/types';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { userSpaceMembershipFactory } from '@packmind/spaces/test/userSpaceMembershipFactory';
import { CannotRenameDefaultSpaceError } from '../../domain/errors/CannotRenameDefaultSpaceError';
import { CannotUpdateDefaultSpaceVisibilityError } from '../../domain/errors/CannotUpdateDefaultSpaceVisibilityError';
import { InvalidSpaceColorError } from '../../domain/errors/InvalidSpaceColorError';
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
        expect.any(SpaceVisibilityUpdatedEvent),
      );
    });
  });

  describe('when updating only the name', () => {
    const existingSpace = spaceFactory({
      id: spaceId,
      organizationId,
      name: 'oddity',
      type: SpaceType.open,
    });
    const updatedSpace = spaceFactory({
      ...existingSpace,
      name: 'security',
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(existingSpace);
      spacesPort.updateSpace.mockResolvedValue(updatedSpace);
    });

    it('updates the name', async () => {
      await useCase.execute(buildCommand({ name: 'security' }));

      expect(spacesPort.updateSpace).toHaveBeenCalledWith(
        spaceId,
        expect.objectContaining({ name: 'security' }),
      );
    });

    describe('when the name changes', () => {
      it('emits SpaceRenamedEvent', async () => {
        await useCase.execute(buildCommand({ name: 'security' }));

        expect(eventEmitterService.emit).toHaveBeenCalledWith(
          expect.any(SpaceRenamedEvent),
        );
      });
    });

    it('does not emit SpaceVisibilityUpdatedEvent', async () => {
      await useCase.execute(buildCommand({ name: 'security' }));

      expect(eventEmitterService.emit).not.toHaveBeenCalledWith(
        expect.any(SpaceVisibilityUpdatedEvent),
      );
    });
  });

  describe('when updating the color', () => {
    const existingSpace = spaceFactory({
      id: spaceId,
      organizationId,
      color: 'blue',
    });

    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(existingSpace);
      spacesPort.updateSpace.mockImplementation(async (_id, fields) => ({
        ...existingSpace,
        ...fields,
      }));
    });

    it('updates the color', async () => {
      await useCase.execute(buildCommand({ color: 'purple' as SpaceColor }));

      expect(spacesPort.updateSpace).toHaveBeenCalledWith(
        spaceId,
        expect.objectContaining({ color: 'purple' }),
      );
    });

    describe('when only color changes', () => {
      it('does not emit SpaceRenamedEvent', async () => {
        await useCase.execute(buildCommand({ color: 'purple' as SpaceColor }));

        expect(eventEmitterService.emit).not.toHaveBeenCalledWith(
          expect.any(SpaceRenamedEvent),
        );
      });
    });

    describe('when color is invalid', () => {
      it('throws InvalidSpaceColorError', async () => {
        await expect(
          useCase.execute(
            buildCommand({ color: 'chartreuse' as unknown as SpaceColor }),
          ),
        ).rejects.toBeInstanceOf(InvalidSpaceColorError);
      });
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
      name: 'Global',
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

    describe('when renaming', () => {
      it('throws CannotRenameDefaultSpaceError', async () => {
        await expect(
          useCase.execute(buildCommand({ name: 'Not Global' })),
        ).rejects.toBeInstanceOf(CannotRenameDefaultSpaceError);
      });
    });

    describe('when updating color', () => {
      it('allows updating the color', async () => {
        spacesPort.updateSpace.mockImplementation(async (_id, fields) => ({
          ...defaultSpace,
          ...fields,
        }));

        await useCase.execute(buildCommand({ color: 'purple' as SpaceColor }));

        expect(spacesPort.updateSpace).toHaveBeenCalledWith(
          spaceId,
          expect.objectContaining({ color: 'purple' }),
        );
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

    describe('when org member changes type to open', () => {
      it('throws OrganizationAdminRequiredError', async () => {
        await expect(
          useCase.execute(buildCommand({ type: SpaceType.open })),
        ).rejects.toThrow(OrganizationAdminRequiredError);
      });
    });

    describe('when org member changes type to restricted', () => {
      it('throws OrganizationAdminRequiredError', async () => {
        await expect(
          useCase.execute(buildCommand({ type: SpaceType.restricted })),
        ).rejects.toThrow(OrganizationAdminRequiredError);
      });
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

  describe('when caller is an org admin without space admin role', () => {
    const existingSpace = spaceFactory({
      id: spaceId,
      organizationId,
      name: 'oddity',
    });

    beforeEach(() => {
      const orgAdmin = userFactory({
        id: userId,
        memberships: [{ userId, organizationId, role: 'admin' }],
      });
      accountsPort.getUserById.mockResolvedValue(orgAdmin);
      spacesPort.getSpaceById.mockResolvedValue(existingSpace);
      spacesPort.updateSpace.mockImplementation(async (_id, fields) => ({
        ...existingSpace,
        ...fields,
      }));
    });

    it('does not check space membership for org admins', async () => {
      await useCase.execute(buildCommand({ name: 'security' }));

      expect(spacesPort.findMembership).not.toHaveBeenCalled();
    });

    it('updates the space with the provided fields', async () => {
      await useCase.execute(buildCommand({ name: 'security' }));

      expect(spacesPort.updateSpace).toHaveBeenCalledWith(
        spaceId,
        expect.objectContaining({ name: 'security' }),
      );
    });
  });
});
