import { BadRequestException, ConflictException } from '@nestjs/common';
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
  SpaceType,
} from '@packmind/types';
import { SpaceSlugConflictError } from '@packmind/spaces';
import { spaceFactory } from '@packmind/spaces/test/spaceFactory';
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
      moveArtifactsToSpace: jest.fn(),
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
});
