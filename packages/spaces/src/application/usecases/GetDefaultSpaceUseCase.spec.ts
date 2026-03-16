import {
  GetDefaultSpaceCommand,
  IAccountsPort,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { userFactory } from '@packmind/accounts/test/userFactory';
import { organizationFactory } from '@packmind/accounts/test/organizationFactory';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { stubLogger } from '@packmind/test-utils';
import { DefaultSpaceNotFoundError } from '../../domain/errors/DefaultSpaceNotFoundError';
import { SpaceService } from '../services/SpaceService';
import { GetDefaultSpaceUseCase } from './GetDefaultSpaceUseCase';

describe('GetDefaultSpaceUseCase', () => {
  const organizationId = createOrganizationId('organization-id');
  const userId = createUserId('user-id');

  const organization = organizationFactory({ id: organizationId });
  const user = userFactory({
    id: userId,
    memberships: [{ userId, organizationId, role: 'member' }],
  });

  let useCase: GetDefaultSpaceUseCase;
  let spaceService: jest.Mocked<SpaceService>;
  let accountsPort: jest.Mocked<IAccountsPort>;

  const buildCommand = (
    overrides?: Partial<GetDefaultSpaceCommand>,
  ): GetDefaultSpaceCommand => ({
    userId: userId as unknown as string,
    organizationId: organizationId as unknown as string,
    ...overrides,
  });

  beforeEach(() => {
    spaceService = {
      listSpacesByOrganization: jest.fn(),
    } as unknown as jest.Mocked<SpaceService>;

    accountsPort = {
      getUserById: jest.fn().mockResolvedValue(user),
      getOrganizationById: jest.fn().mockResolvedValue(organization),
    } as unknown as jest.Mocked<IAccountsPort>;

    useCase = new GetDefaultSpaceUseCase(
      spaceService,
      accountsPort,
      stubLogger(),
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    describe('when the organization has a default space', () => {
      const defaultSpace = spaceFactory({
        organizationId,
        isDefaultSpace: true,
      });
      const otherSpace = spaceFactory({
        organizationId,
        isDefaultSpace: false,
      });

      beforeEach(() => {
        spaceService.listSpacesByOrganization.mockResolvedValue([
          otherSpace,
          defaultSpace,
        ]);
      });

      it('returns the default space', async () => {
        const result = await useCase.execute(buildCommand());

        expect(result.defaultSpace).toEqual(defaultSpace);
      });

      it('lists spaces for the correct organization', async () => {
        await useCase.execute(buildCommand());

        expect(spaceService.listSpacesByOrganization).toHaveBeenCalledWith(
          organizationId,
        );
      });
    });

    describe('when no default space exists', () => {
      beforeEach(() => {
        spaceService.listSpacesByOrganization.mockResolvedValue([
          spaceFactory({ organizationId, isDefaultSpace: false }),
        ]);
      });

      it('throws a DefaultSpaceNotFoundError', async () => {
        await expect(useCase.execute(buildCommand())).rejects.toThrow(
          DefaultSpaceNotFoundError,
        );
      });
    });

    describe('when the organization has no spaces', () => {
      beforeEach(() => {
        spaceService.listSpacesByOrganization.mockResolvedValue([]);
      });

      it('throws a DefaultSpaceNotFoundError', async () => {
        await expect(useCase.execute(buildCommand())).rejects.toThrow(
          DefaultSpaceNotFoundError,
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
