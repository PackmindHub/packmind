import {
  CreateSpaceCommand,
  createOrganizationId,
  createUserId,
  ISpacesPort,
  SpaceType,
  UserSpaceRole,
} from '@packmind/types';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { SpaceSlugConflictError } from '@packmind/spaces';
import { CreateSpaceUseCase } from './CreateSpaceUseCase';

describe('CreateSpaceUseCase', () => {
  const organizationId = createOrganizationId('organization-id');
  const userId = createUserId('user-id');

  let useCase: CreateSpaceUseCase;
  let spacesPort: jest.Mocked<
    Pick<ISpacesPort, 'createSpace' | 'addSpaceMembership'>
  >;

  const buildCommand = (
    overrides?: Partial<CreateSpaceCommand>,
  ): CreateSpaceCommand => ({
    userId: userId as unknown as string,
    organizationId: organizationId as unknown as string,
    name: 'My Private Space',
    ...overrides,
  });

  beforeEach(() => {
    spacesPort = {
      createSpace: jest.fn(),
      addSpaceMembership: jest.fn(),
    };

    useCase = new CreateSpaceUseCase(spacesPort as unknown as ISpacesPort);
  });

  afterEach(() => jest.clearAllMocks());

  describe('when the space is created successfully', () => {
    const createdSpace = spaceFactory({
      organizationId,
      name: 'My Private Space',
      isDefaultSpace: false,
    });

    beforeEach(() => {
      spacesPort.createSpace.mockResolvedValue(createdSpace);
      spacesPort.addSpaceMembership.mockResolvedValue({
        userId,
        spaceId: createdSpace.id,
        role: UserSpaceRole.ADMIN,
      });
    });

    it('creates the space with the provided type', async () => {
      await useCase.execute(buildCommand({ type: SpaceType.restricted }));

      expect(spacesPort.createSpace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Private Space',
          type: SpaceType.restricted,
        }),
      );
    });

    describe('when type is not provided', () => {
      it('defaults to open type', async () => {
        await useCase.execute(buildCommand());

        expect(spacesPort.createSpace).toHaveBeenCalledWith(
          expect.objectContaining({
            type: SpaceType.open,
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

    it('adds only the creator as a member', async () => {
      await useCase.execute(buildCommand());

      expect(spacesPort.addSpaceMembership).toHaveBeenCalledTimes(1);
    });

    it('returns the created space', async () => {
      const result = await useCase.execute(buildCommand());

      expect(result).toEqual(createdSpace);
    });
  });

  describe('when a space with the same slug already exists', () => {
    beforeEach(() => {
      spacesPort.createSpace.mockRejectedValue(
        new SpaceSlugConflictError('My Private Space', organizationId),
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
