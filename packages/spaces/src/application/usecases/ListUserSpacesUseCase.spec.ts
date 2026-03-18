import {
  createOrganizationId,
  createUserId,
  ListUserSpacesCommand,
} from '@packmind/types';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { SpaceService } from '../services/SpaceService';
import { ListUserSpacesUseCase } from './ListUserSpacesUseCase';

describe('ListUserSpacesUseCase', () => {
  const organizationId = createOrganizationId('organization-id');
  const userId = createUserId('user-id');

  let useCase: ListUserSpacesUseCase;
  let spaceService: jest.Mocked<SpaceService>;

  const buildCommand = (
    overrides?: Partial<ListUserSpacesCommand>,
  ): ListUserSpacesCommand => ({
    userId,
    organizationId,
    ...overrides,
  });

  beforeEach(() => {
    spaceService = {
      listSpacesByOrganization: jest.fn(),
    } as unknown as jest.Mocked<SpaceService>;

    useCase = new ListUserSpacesUseCase(spaceService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('execute', () => {
    describe('when the organization has spaces', () => {
      const space1 = spaceFactory({ organizationId });
      const space2 = spaceFactory({ organizationId });

      beforeEach(() => {
        spaceService.listSpacesByOrganization.mockResolvedValue([
          space1,
          space2,
        ]);
      });

      it('returns all organization spaces', async () => {
        const result = await useCase.execute(buildCommand());

        expect(result.spaces).toEqual([space1, space2]);
      });

      it('returns an empty discoverableSpaces list', async () => {
        const result = await useCase.execute(buildCommand());

        expect(result.discoverableSpaces).toEqual([]);
      });

      it('lists spaces for the correct organization', async () => {
        await useCase.execute(buildCommand());

        expect(spaceService.listSpacesByOrganization).toHaveBeenCalledWith(
          organizationId,
        );
      });
    });

    describe('when the organization has no spaces', () => {
      beforeEach(() => {
        spaceService.listSpacesByOrganization.mockResolvedValue([]);
      });

      it('returns an empty spaces list', async () => {
        const result = await useCase.execute(buildCommand());

        expect(result.spaces).toEqual([]);
      });
    });
  });
});
