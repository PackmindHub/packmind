import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { createOrganizationId, createSpaceId, Space } from '@packmind/types';
import { SpacesService } from '../../spaces/spaces.service';
import { OrganizationsSpacesController } from './spaces.controller';

describe('OrganizationsSpacesController', () => {
  let controller: OrganizationsSpacesController;
  let spacesService: jest.Mocked<SpacesService>;
  let logger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    logger = stubLogger();
    spacesService = {
      listSpacesByOrganization: jest.fn(),
      getSpaceBySlug: jest.fn(),
    } as unknown as jest.Mocked<SpacesService>;
    controller = new OrganizationsSpacesController(spacesService, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listSpaces', () => {
    it('returns all spaces for an organization', async () => {
      const orgId = createOrganizationId('test-org-id');
      const mockSpaces: Space[] = [
        {
          id: createSpaceId('space-1'),
          name: 'Space 1',
          slug: 'space-1',
          organizationId: orgId,
        },
        {
          id: createSpaceId('space-2'),
          name: 'Space 2',
          slug: 'space-2',
          organizationId: orgId,
        },
      ];
      spacesService.listSpacesByOrganization.mockResolvedValue(mockSpaces);

      const result = await controller.listSpaces(orgId);

      expect(result).toEqual(mockSpaces);
      expect(spacesService.listSpacesByOrganization).toHaveBeenCalledWith(
        orgId,
      );
    });
  });

  describe('getSpaceBySlug', () => {
    it('returns a space by slug within an organization', async () => {
      const orgId = createOrganizationId('test-org-id');
      const slug = 'test-space';
      const mockSpace: Space = {
        id: createSpaceId('test-space-id'),
        name: 'Test Space',
        slug,
        organizationId: orgId,
      };
      spacesService.getSpaceBySlug.mockResolvedValue(mockSpace);

      const result = await controller.getSpaceBySlug(orgId, slug);

      expect(result).toEqual(mockSpace);
      expect(spacesService.getSpaceBySlug).toHaveBeenCalledWith(slug, orgId);
    });
  });
});
