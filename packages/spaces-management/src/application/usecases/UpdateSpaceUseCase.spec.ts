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
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { SpaceNotFoundError } from '@packmind/spaces';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { CannotRenameDefaultSpaceError } from '../../domain/errors/CannotRenameDefaultSpaceError';
import { InvalidSpaceColorError } from '../../domain/errors/InvalidSpaceColorError';
import { SpaceIdentityUpdateForbiddenError } from '../../domain/errors/SpaceIdentityUpdateForbiddenError';
import { UpdateSpaceUseCase } from './UpdateSpaceUseCase';

describe('UpdateSpaceUseCase', () => {
  const organizationId = createOrganizationId('org-1');
  const userId = createUserId('user-1');
  const spaceId = createSpaceId('space-1');

  let useCase: UpdateSpaceUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<
    Pick<ISpacesPort, 'getSpaceById' | 'findMembership' | 'updateSpace'>
  >;
  let eventEmitterService: jest.Mocked<
    Pick<PackmindEventEmitterService, 'emit'>
  >;

  const existingSpace = spaceFactory({
    id: spaceId,
    organizationId,
    isDefaultSpace: false,
    name: 'oddity',
    slug: 'oddity',
    color: 'blue',
  });

  const buildCommand = (
    overrides?: Partial<UpdateSpaceCommand>,
  ): UpdateSpaceCommand => ({
    userId: userId as unknown as string,
    organizationId: organizationId as unknown as string,
    spaceId,
    ...overrides,
  });

  beforeEach(() => {
    spacesPort = {
      getSpaceById: jest.fn().mockResolvedValue(existingSpace),
      findMembership: jest.fn(),
      updateSpace: jest.fn().mockImplementation(async (_id, fields) => ({
        ...existingSpace,
        ...fields,
      })),
    };
    eventEmitterService = { emit: jest.fn().mockReturnValue(true) };
  });

  afterEach(() => jest.clearAllMocks());

  const buildUseCase = (userRole: 'admin' | 'member') => {
    const user = userFactory({
      id: userId,
      memberships: [{ userId, organizationId, role: userRole }],
    });
    const organization = organizationFactory({ id: organizationId });
    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;
    return new UpdateSpaceUseCase(
      spacesPort as unknown as ISpacesPort,
      accountsPort,
      eventEmitterService as unknown as PackmindEventEmitterService,
    );
  };

  describe('when the caller is an organization admin', () => {
    beforeEach(() => {
      useCase = buildUseCase('admin');
    });

    it('updates the name', async () => {
      await useCase.execute(buildCommand({ name: 'security' }));

      expect(spacesPort.updateSpace).toHaveBeenCalledWith(
        spaceId,
        expect.objectContaining({ name: 'security' }),
      );
    });

    it('updates the color', async () => {
      await useCase.execute(buildCommand({ color: 'purple' as SpaceColor }));

      expect(spacesPort.updateSpace).toHaveBeenCalledWith(
        spaceId,
        expect.objectContaining({ color: 'purple' }),
      );
    });

    it('emits SpaceRenamedEvent when the name changes', async () => {
      await useCase.execute(buildCommand({ name: 'new-name' }));

      expect(eventEmitterService.emit).toHaveBeenCalledWith(
        expect.any(SpaceRenamedEvent),
      );
    });

    it('does not emit SpaceRenamedEvent when only color changes', async () => {
      await useCase.execute(buildCommand({ color: 'purple' as SpaceColor }));

      expect(eventEmitterService.emit).not.toHaveBeenCalledWith(
        expect.any(SpaceRenamedEvent),
      );
    });

    it('does not check space membership', async () => {
      await useCase.execute(buildCommand({ name: 'security' }));

      expect(spacesPort.findMembership).not.toHaveBeenCalled();
    });
  });

  describe('when the caller is a space admin (not org admin)', () => {
    beforeEach(() => {
      useCase = buildUseCase('member');
      spacesPort.findMembership.mockResolvedValue({
        userId,
        spaceId,
        role: UserSpaceRole.ADMIN,
      });
    });

    it('updates the space', async () => {
      await useCase.execute(buildCommand({ name: 'security' }));

      expect(spacesPort.updateSpace).toHaveBeenCalled();
    });
  });

  describe('when the caller is neither org admin nor space admin', () => {
    beforeEach(() => {
      useCase = buildUseCase('member');
      spacesPort.findMembership.mockResolvedValue({
        userId,
        spaceId,
        role: UserSpaceRole.MEMBER,
      });
    });

    it('throws SpaceIdentityUpdateForbiddenError', async () => {
      await expect(
        useCase.execute(buildCommand({ name: 'security' })),
      ).rejects.toBeInstanceOf(SpaceIdentityUpdateForbiddenError);
    });
  });

  describe('when updating the default space name', () => {
    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue({
        ...existingSpace,
        isDefaultSpace: true,
        name: 'Global',
      });
      useCase = buildUseCase('admin');
    });

    it('throws CannotRenameDefaultSpaceError', async () => {
      await expect(
        useCase.execute(buildCommand({ name: 'Not Global' })),
      ).rejects.toBeInstanceOf(CannotRenameDefaultSpaceError);
    });

    it('allows updating the color', async () => {
      await useCase.execute(buildCommand({ color: 'purple' as SpaceColor }));

      expect(spacesPort.updateSpace).toHaveBeenCalledWith(
        spaceId,
        expect.objectContaining({ color: 'purple' }),
      );
    });
  });

  describe('when the color is invalid', () => {
    beforeEach(() => {
      useCase = buildUseCase('admin');
    });

    it('throws InvalidSpaceColorError', async () => {
      await expect(
        useCase.execute(
          buildCommand({ color: 'chartreuse' as unknown as SpaceColor }),
        ),
      ).rejects.toBeInstanceOf(InvalidSpaceColorError);
    });
  });

  describe('when the space does not exist', () => {
    beforeEach(() => {
      spacesPort.getSpaceById.mockResolvedValue(null);
      useCase = buildUseCase('admin');
    });

    it('throws SpaceNotFoundError', async () => {
      await expect(
        useCase.execute(buildCommand({ name: 'x' })),
      ).rejects.toBeInstanceOf(SpaceNotFoundError);
    });
  });

  describe('when the space type changes', () => {
    beforeEach(() => {
      useCase = buildUseCase('admin');
    });

    it('emits SpaceVisibilityUpdatedEvent', async () => {
      await useCase.execute(buildCommand({ type: SpaceType.restricted }));

      expect(eventEmitterService.emit).toHaveBeenCalledWith(
        expect.any(SpaceVisibilityUpdatedEvent),
      );
    });
  });

  describe('when no fields are provided', () => {
    beforeEach(() => {
      useCase = buildUseCase('admin');
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
});
