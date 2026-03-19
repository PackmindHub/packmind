import {
  CreateSpaceCommand,
  IAccountsPort,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { stubLogger } from '@packmind/test-utils';
import { SpaceSlugConflictError } from '../../domain/errors/SpaceSlugConflictError';
import { SpaceService } from '../services/SpaceService';
import { CreateSpaceUseCase } from './CreateSpaceUseCase';

describe('CreateSpaceUseCase', () => {
  const organizationId = createOrganizationId('organization-id');
  const userId = createUserId('user-id');

  const organization = organizationFactory({ id: organizationId });
  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });

  let useCase: CreateSpaceUseCase;
  let spaceService: jest.Mocked<SpaceService>;
  let accountsPort: jest.Mocked<IAccountsPort>;

  const buildCommand = (
    overrides?: Partial<CreateSpaceCommand>,
  ): CreateSpaceCommand => ({
    userId: userId as unknown as string,
    organizationId: organizationId as unknown as string,
    name: 'My Space',
    ...overrides,
  });

  beforeEach(() => {
    spaceService = {
      createSpace: jest.fn(),
    } as unknown as jest.Mocked<SpaceService>;

    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new CreateSpaceUseCase(spaceService, accountsPort, stubLogger());
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    describe('when the space is created successfully', () => {
      const createdSpace = spaceFactory({
        organizationId,
        name: 'My Space',
        isDefaultSpace: false,
      });

      beforeEach(() => {
        spaceService.createSpace.mockResolvedValue(createdSpace);
      });

      it('returns the created space', async () => {
        const result = await useCase.execute(buildCommand());

        expect(result).toEqual(createdSpace);
      });

      it('creates the space with isDefaultSpace set to false', async () => {
        await useCase.execute(buildCommand());

        expect(spaceService.createSpace).toHaveBeenCalledWith(
          'My Space',
          organizationId,
          false,
        );
      });
    });

    describe('when a space with the same slug already exists', () => {
      beforeEach(() => {
        spaceService.createSpace.mockRejectedValue(
          new SpaceSlugConflictError('My Space', organizationId),
        );
      });

      it('propagates the SpaceSlugConflictError', async () => {
        await expect(useCase.execute(buildCommand())).rejects.toThrow(
          SpaceSlugConflictError,
        );
      });
    });

    describe('when the user is not a member of the organization', () => {
      beforeEach(() => {
        accountsPort.getUserById.mockResolvedValue(
          userFactory({ id: userId, memberships: [] }),
        );
      });

      it('throws an access error', async () => {
        await expect(useCase.execute(buildCommand())).rejects.toThrow();
      });
    });
  });
});
