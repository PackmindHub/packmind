import { spaceFactory } from '@packmind/spaces/test';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger, createMockInstance } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  ListUserSpacesResponse,
  Space,
  UserSpaceWithRole,
  UserSpaceRole,
} from '@packmind/types';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { SpacesService } from '../../spaces/spaces.service';
import { OrganizationsSpacesController } from './spaces.controller';

describe('OrganizationsSpacesController', () => {
  let controller: OrganizationsSpacesController;
  let spacesService: jest.Mocked<SpacesService>;
  let logger: jest.Mocked<PackmindLogger>;

  const userId = createUserId('test-user-id');
  const mockReq = {
    user: { userId },
  } as unknown as AuthenticatedRequest;

  beforeEach(() => {
    logger = stubLogger();
    spacesService = createMockInstance(SpacesService);
    controller = new OrganizationsSpacesController(spacesService, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listSpaces', () => {
    describe('when listing user spaces', () => {
      const orgId = createOrganizationId('test-org-id');
      const mockSpaces: UserSpaceWithRole[] = [
        {
          ...spaceFactory({
            id: createSpaceId('space-1'),
            name: 'Space 1',
            slug: 'space-1',
            organizationId: orgId,
          }),
          role: UserSpaceRole.MEMBER,
          pinned: false,
        },
        {
          ...spaceFactory({
            id: createSpaceId('space-2'),
            name: 'Space 2',
            slug: 'space-2',
            organizationId: orgId,
          }),
          role: UserSpaceRole.MEMBER,
          pinned: false,
        },
      ];
      let result: ListUserSpacesResponse;

      beforeEach(async () => {
        spacesService.listUserSpaces.mockResolvedValue({ spaces: mockSpaces });
        result = await controller.listSpaces(mockReq, orgId);
      });

      it('returns user spaces for the organization', () => {
        expect(result).toEqual({ spaces: mockSpaces });
      });

      it('calls service with correct user ID and organization ID', () => {
        expect(spacesService.listUserSpaces).toHaveBeenCalledWith(
          userId,
          orgId,
        );
      });
    });
  });

  describe('getSpaceBySlug', () => {
    describe('when space exists', () => {
      const orgId = createOrganizationId('test-org-id');
      const slug = 'test-space';
      const mockSpace: Space = spaceFactory({
        id: createSpaceId('test-space-id'),
        name: 'Test Space',
        slug,
        organizationId: orgId,
      });
      let result: Space;

      beforeEach(async () => {
        spacesService.getSpaceBySlug.mockResolvedValue(mockSpace);
        result = await controller.getSpaceBySlug(orgId, slug);
      });

      it('returns the space', () => {
        expect(result).toEqual(mockSpace);
      });

      it('calls service with correct params', () => {
        expect(spacesService.getSpaceBySlug).toHaveBeenCalledWith(slug, orgId);
      });
    });
  });
});
