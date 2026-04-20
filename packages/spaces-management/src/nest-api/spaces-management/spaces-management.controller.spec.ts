import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  createOrganizationId,
  createSpaceId,
  createStandardId,
  createSkillId,
  ArtifactReference,
  MoveArtifactsToSpaceResponse,
  SpaceColor,
  SpaceType,
} from '@packmind/types';
import { OrganizationAdminRequiredError } from '@packmind/node-utils';
import { SpaceNotFoundError, SpaceSlugConflictError } from '@packmind/spaces';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
import { CannotDeleteDefaultSpaceError } from '../../domain/errors/CannotDeleteDefaultSpaceError';
import { SpaceDeletionForbiddenError } from '../../domain/errors/SpaceDeletionForbiddenError';
import { CannotRenameDefaultSpaceError } from '../../domain/errors/CannotRenameDefaultSpaceError';
import { InvalidSpaceColorError } from '../../domain/errors/InvalidSpaceColorError';
import { SpaceIdentityUpdateForbiddenError } from '../../domain/errors/SpaceIdentityUpdateForbiddenError';
import { SpaceNotJoinableError } from '../../domain/errors/SpaceNotJoinableError';
import { SpacesManagementController } from './spaces-management.controller';
import { SpacesManagementService } from './spaces-management.service';

describe('SpacesManagementController', () => {
  let controller: SpacesManagementController;
  let service: jest.Mocked<SpacesManagementService>;
  let logger: jest.Mocked<PackmindLogger>;

  const organizationId = createOrganizationId('org-123');
  const mockRequest = {
    user: {
      userId: 'user-123',
      email: 'test@example.com',
    },
  } as unknown as AuthenticatedRequest;

  beforeEach(() => {
    logger = stubLogger();
    service = {
      createSpace: jest.fn(),
      updateSpace: jest.fn(),
      moveArtifactsToSpace: jest.fn(),
      browseSpaces: jest.fn(),
      joinSpace: jest.fn(),
      deleteSpace: jest.fn(),
    } as unknown as jest.Mocked<SpacesManagementService>;
    controller = new SpacesManagementController(service, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSpace', () => {
    describe('when creating a space with a valid name and type', () => {
      const mockSpace = spaceFactory({
        id: createSpaceId('space-1'),
        name: 'New Space',
        slug: 'new-space',
        organizationId,
      });
      let result: typeof mockSpace;

      beforeEach(async () => {
        service.createSpace.mockResolvedValue(mockSpace);
        result = await controller.createSpace(
          organizationId,
          { name: 'New Space', type: SpaceType.restricted },
          mockRequest,
        );
      });

      it('returns the created space', () => {
        expect(result).toEqual(mockSpace);
      });

      it('calls service with correct params including type', () => {
        expect(service.createSpace).toHaveBeenCalledWith({
          name: 'New Space',
          type: SpaceType.restricted,
          organizationId,
          userId: 'user-123',
        });
      });
    });

    describe('when creating a space without specifying type', () => {
      const mockSpace = spaceFactory({
        id: createSpaceId('space-1'),
        name: 'New Space',
        slug: 'new-space',
        organizationId,
      });

      beforeEach(async () => {
        service.createSpace.mockResolvedValue(mockSpace);
        await controller.createSpace(
          organizationId,
          { name: 'New Space' },
          mockRequest,
        );
      });

      it('calls service with undefined type', () => {
        expect(service.createSpace).toHaveBeenCalledWith({
          name: 'New Space',
          type: undefined,
          organizationId,
          userId: 'user-123',
        });
      });
    });

    describe('when name is empty', () => {
      it('throws BadRequestException', async () => {
        await expect(
          controller.createSpace(organizationId, { name: '' }, mockRequest),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('when slug conflicts', () => {
      it('throws ConflictException', async () => {
        service.createSpace.mockRejectedValue(
          new SpaceSlugConflictError('new-space', organizationId),
        );

        await expect(
          controller.createSpace(
            organizationId,
            { name: 'New Space' },
            mockRequest,
          ),
        ).rejects.toThrow(ConflictException);
      });
    });
  });

  describe('moveArtifactsToSpace', () => {
    describe('when moving artifacts with valid params', () => {
      const sourceSpaceId = createSpaceId('source-space');
      const destinationSpaceId = createSpaceId('dest-space');
      const expectedResponse: MoveArtifactsToSpaceResponse = {
        movedCount: 3,
      };
      let result: MoveArtifactsToSpaceResponse;

      const artifacts: ArtifactReference[] = [
        { id: createStandardId('std-1'), type: 'standard' },
        { id: createStandardId('std-2'), type: 'standard' },
        { id: createSkillId('skill-1'), type: 'skill' },
      ];

      beforeEach(async () => {
        service.moveArtifactsToSpace.mockResolvedValue(expectedResponse);
        result = await controller.moveArtifactsToSpace(
          organizationId,
          mockRequest,
          {
            sourceSpaceId,
            destinationSpaceId,
            artifacts,
          },
        );
      });

      it('returns the move result', () => {
        expect(result).toEqual({ movedCount: 3 });
      });

      it('calls service with correct command', () => {
        expect(service.moveArtifactsToSpace).toHaveBeenCalledWith({
          userId: 'user-123',
          organizationId,
          sourceSpaceId,
          destinationSpaceId,
          artifacts,
        });
      });
    });

    describe('when sourceSpaceId is missing', () => {
      it('throws BadRequestException', async () => {
        await expect(
          controller.moveArtifactsToSpace(organizationId, mockRequest, {
            sourceSpaceId: '' as never,
            destinationSpaceId: createSpaceId('dest-space'),
            artifacts: [],
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('when destinationSpaceId is missing', () => {
      it('throws BadRequestException', async () => {
        await expect(
          controller.moveArtifactsToSpace(organizationId, mockRequest, {
            sourceSpaceId: createSpaceId('source-space'),
            destinationSpaceId: '' as never,
            artifacts: [],
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('when artifacts is empty', () => {
      it('throws BadRequestException', async () => {
        await expect(
          controller.moveArtifactsToSpace(organizationId, mockRequest, {
            sourceSpaceId: createSpaceId('source-space'),
            destinationSpaceId: createSpaceId('dest-space'),
            artifacts: [],
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('browseSpaces', () => {
    describe('when browsing spaces successfully', () => {
      const mockResponse = {
        mySpaces: [
          spaceFactory({
            id: createSpaceId('space-1'),
            name: 'My Space',
            organizationId,
          }),
        ],
        allSpaces: [
          {
            id: createSpaceId('space-2'),
            name: 'Open Space',
            type: SpaceType.open,
          },
        ],
      };
      let result: typeof mockResponse;

      beforeEach(async () => {
        service.browseSpaces.mockResolvedValue(mockResponse);
        result = await controller.browseSpaces(organizationId, mockRequest);
      });

      it('returns the browse response', () => {
        expect(result).toEqual(mockResponse);
      });

      it('calls service with correct params', () => {
        expect(service.browseSpaces).toHaveBeenCalledWith({
          userId: 'user-123',
          organizationId,
        });
      });
    });
  });

  describe('joinSpace', () => {
    const spaceId = 'space-1';

    describe('when joining a space successfully', () => {
      beforeEach(async () => {
        service.joinSpace.mockResolvedValue(undefined);
        await controller.joinSpace(organizationId, spaceId, mockRequest);
      });

      it('calls service with correct params', () => {
        expect(service.joinSpace).toHaveBeenCalledWith({
          userId: 'user-123',
          organizationId,
          spaceId,
        });
      });
    });

    describe('when the space is not found', () => {
      beforeEach(() => {
        service.joinSpace.mockRejectedValue(new SpaceNotFoundError(spaceId));
      });

      it('throws NotFoundException', async () => {
        await expect(
          controller.joinSpace(organizationId, spaceId, mockRequest),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('when the space is not joinable', () => {
      beforeEach(() => {
        service.joinSpace.mockRejectedValue(new SpaceNotJoinableError(spaceId));
      });

      it('throws ForbiddenException', async () => {
        await expect(
          controller.joinSpace(organizationId, spaceId, mockRequest),
        ).rejects.toThrow(ForbiddenException);
      });
    });
  });

  describe('updateSpace', () => {
    const spaceId = createSpaceId('space-1');
    const mockUpdatedSpace = spaceFactory({
      id: spaceId,
      organizationId,
      name: 'Updated',
      color: 'purple',
    });

    describe('when the body includes a color', () => {
      beforeEach(() => {
        service.updateSpace.mockResolvedValue(mockUpdatedSpace);
      });

      it('forwards color to the service', async () => {
        await controller.updateSpace(
          organizationId,
          spaceId,
          { color: 'purple' as SpaceColor },
          mockRequest,
        );

        expect(service.updateSpace).toHaveBeenCalledWith(
          expect.objectContaining({ color: 'purple' }),
        );
      });
    });

    describe('when the service throws CannotRenameDefaultSpaceError', () => {
      beforeEach(() => {
        service.updateSpace.mockRejectedValue(
          new CannotRenameDefaultSpaceError(spaceId),
        );
      });

      it('responds with 422', async () => {
        await expect(
          controller.updateSpace(
            organizationId,
            spaceId,
            { name: 'x' },
            mockRequest,
          ),
        ).rejects.toThrow(UnprocessableEntityException);
      });
    });

    describe('when the service throws SpaceIdentityUpdateForbiddenError', () => {
      beforeEach(() => {
        service.updateSpace.mockRejectedValue(
          new SpaceIdentityUpdateForbiddenError('user-123', spaceId),
        );
      });

      it('responds with 403', async () => {
        await expect(
          controller.updateSpace(
            organizationId,
            spaceId,
            { name: 'x' },
            mockRequest,
          ),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('when the service throws InvalidSpaceColorError', () => {
      beforeEach(() => {
        service.updateSpace.mockRejectedValue(
          new InvalidSpaceColorError('chartreuse'),
        );
      });

      it('responds with 400', async () => {
        await expect(
          controller.updateSpace(
            organizationId,
            spaceId,
            { color: 'chartreuse' as unknown as SpaceColor },
            mockRequest,
          ),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('deleteSpace', () => {
    const spaceId = 'space-1';

    describe('when deleting a space successfully', () => {
      beforeEach(async () => {
        service.deleteSpace.mockResolvedValue(undefined);
        await controller.deleteSpace(organizationId, spaceId, mockRequest);
      });

      it('calls service with correct params', () => {
        expect(service.deleteSpace).toHaveBeenCalledWith({
          userId: 'user-123',
          organizationId,
          spaceId,
        });
      });
    });

    describe('when the space is not found', () => {
      beforeEach(() => {
        service.deleteSpace.mockRejectedValue(new SpaceNotFoundError(spaceId));
      });

      it('throws NotFoundException', async () => {
        await expect(
          controller.deleteSpace(organizationId, spaceId, mockRequest),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('when the space is the default space', () => {
      beforeEach(() => {
        service.deleteSpace.mockRejectedValue(
          new CannotDeleteDefaultSpaceError(spaceId),
        );
      });

      it('throws UnprocessableEntityException', async () => {
        await expect(
          controller.deleteSpace(organizationId, spaceId, mockRequest),
        ).rejects.toThrow(UnprocessableEntityException);
      });
    });

    describe('when the user is not authorized to delete the space', () => {
      beforeEach(() => {
        service.deleteSpace.mockRejectedValue(
          new SpaceDeletionForbiddenError('user-123', spaceId),
        );
      });

      it('throws ForbiddenException', async () => {
        await expect(
          controller.deleteSpace(organizationId, spaceId, mockRequest),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('when the user is not an organization admin', () => {
      beforeEach(() => {
        service.deleteSpace.mockRejectedValue(
          new OrganizationAdminRequiredError({
            userId: 'user-123',
            organizationId,
          }),
        );
      });

      it('throws ForbiddenException', async () => {
        await expect(
          controller.deleteSpace(organizationId, spaceId, mockRequest),
        ).rejects.toThrow(ForbiddenException);
      });
    });
  });
});
