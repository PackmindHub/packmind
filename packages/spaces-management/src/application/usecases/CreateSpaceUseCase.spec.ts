import {
  CreateSpaceCommand,
  createOrganizationId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  SpaceType,
  UserSpaceRole,
} from '@packmind/types';
import { OrganizationAdminRequiredError } from '@packmind/node-utils';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { SpaceSlugConflictError } from '@packmind/spaces';
import { CreateSpaceUseCase } from './CreateSpaceUseCase';

describe('CreateSpaceUseCase', () => {
  const organizationId = createOrganizationId('org-1');
  const userId = createUserId('user-1');

  let useCase: CreateSpaceUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<
    Pick<ISpacesPort, 'createSpace' | 'addSpaceMembership'>
  >;

  const createdSpace = spaceFactory({
    organizationId,
    name: 'My Space',
    isDefaultSpace: false,
  });

  const buildCommand = (
    overrides?: Partial<CreateSpaceCommand>,
  ): CreateSpaceCommand => ({
    userId: userId as unknown as string,
    organizationId: organizationId as unknown as string,
    name: 'My Space',
    ...overrides,
  });

  beforeEach(() => {
    spacesPort = {
      createSpace: jest.fn().mockResolvedValue(createdSpace),
      addSpaceMembership: jest.fn().mockResolvedValue({
        userId,
        spaceId: createdSpace.id,
        role: UserSpaceRole.ADMIN,
      }),
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

      useCase = new CreateSpaceUseCase(
        spacesPort as unknown as ISpacesPort,
        accountsPort,
      );
    });

    describe('when type is open', () => {
      it('creates an open space', async () => {
        await useCase.execute(buildCommand({ type: SpaceType.open }));

        expect(spacesPort.createSpace).toHaveBeenCalledWith(
          expect.objectContaining({
            type: SpaceType.open,
          }),
        );
      });
    });

    describe('when type is restricted', () => {
      it('creates a restricted space', async () => {
        await useCase.execute(buildCommand({ type: SpaceType.restricted }));

        expect(spacesPort.createSpace).toHaveBeenCalledWith(
          expect.objectContaining({
            type: SpaceType.restricted,
          }),
        );
      });
    });

    describe('when no type provided', () => {
      it('defaults to private type', async () => {
        await useCase.execute(buildCommand());

        expect(spacesPort.createSpace).toHaveBeenCalledWith(
          expect.objectContaining({
            type: SpaceType.private,
          }),
        );
      });
    });

    it('adds the creator as admin member of the space', async () => {
      await useCase.execute(buildCommand());

      expect(spacesPort.addSpaceMembership).toHaveBeenCalledWith({
        userId,
        spaceId: createdSpace.id,
        role: UserSpaceRole.ADMIN,
        createdBy: userId,
      });
    });

    it('returns the created space', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result).toEqual(createdSpace);
    });
  });

  describe('when called by a non-admin member', () => {
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

      useCase = new CreateSpaceUseCase(
        spacesPort as unknown as ISpacesPort,
        accountsPort,
      );
    });

    describe('when no type provided', () => {
      it('creates a private space', async () => {
        await useCase.execute(buildCommand());

        expect(spacesPort.createSpace).toHaveBeenCalledWith(
          expect.objectContaining({
            type: SpaceType.private,
          }),
        );
      });
    });

    describe('when type is open', () => {
      it('throws OrganizationAdminRequiredError', async () => {
        await expect(
          useCase.execute(buildCommand({ type: SpaceType.open })),
        ).rejects.toThrow(OrganizationAdminRequiredError);
      });

      it('does not create the space', async () => {
        await useCase
          .execute(buildCommand({ type: SpaceType.open }))
          .catch(() => undefined);

        expect(spacesPort.createSpace).not.toHaveBeenCalled();
      });
    });

    describe('when type is restricted', () => {
      it('throws OrganizationAdminRequiredError', async () => {
        await expect(
          useCase.execute(buildCommand({ type: SpaceType.restricted })),
        ).rejects.toThrow(OrganizationAdminRequiredError);
      });
    });

    it('adds the creator as admin member of the space', async () => {
      await useCase.execute(buildCommand());

      expect(spacesPort.addSpaceMembership).toHaveBeenCalledWith({
        userId,
        spaceId: createdSpace.id,
        role: UserSpaceRole.ADMIN,
        createdBy: userId,
      });
    });
  });

  describe('when a space with the same slug already exists', () => {
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

      spacesPort.createSpace.mockRejectedValue(
        new SpaceSlugConflictError('My Space', organizationId),
      );

      useCase = new CreateSpaceUseCase(
        spacesPort as unknown as ISpacesPort,
        accountsPort,
      );
    });

    it('propagates the SpaceSlugConflictError', async () => {
      await expect(useCase.execute(buildCommand())).rejects.toThrow(
        SpaceSlugConflictError,
      );
    });

    it('does not add a membership', async () => {
      await useCase.execute(buildCommand()).catch(() => undefined);

      expect(spacesPort.addSpaceMembership).not.toHaveBeenCalled();
    });
  });
});
