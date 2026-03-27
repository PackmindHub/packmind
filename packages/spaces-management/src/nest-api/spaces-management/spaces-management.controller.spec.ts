import { BadRequestException, ConflictException } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  createOrganizationId,
  createSpaceId,
  MoveArtifactsToSpaceResponse,
  Space,
} from '@packmind/types';
import { SpaceSlugConflictError } from '@packmind/spaces';
import { ArtifactNameConflictError } from '../../domain/errors/ArtifactNameConflictError';
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
    describe('when creating a space with a valid name', () => {
      const mockSpace: Space = {
        id: createSpaceId('space-1'),
        name: 'New Space',
        slug: 'new-space',
        organizationId,
      };
      let result: Space;

      beforeEach(async () => {
        service.createSpace.mockResolvedValue(mockSpace);
        result = await controller.createSpace(
          organizationId,
          { name: 'New Space' },
          mockRequest,
        );
      });

      it('returns the created space', () => {
        expect(result).toEqual(mockSpace);
      });

      it('calls service with correct params', () => {
        expect(service.createSpace).toHaveBeenCalledWith({
          name: 'New Space',
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
          new SpaceSlugConflictError('new-space'),
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

      beforeEach(async () => {
        service.moveArtifactsToSpace.mockResolvedValue(expectedResponse);
        result = await controller.moveArtifactsToSpace(
          organizationId,
          mockRequest,
          {
            sourceSpaceId,
            destinationSpaceId,
            standardIds: ['std-1', 'std-2'],
            skillIds: ['skill-1'],
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
          standardIds: ['std-1', 'std-2'],
          skillIds: ['skill-1'],
        });
      });
    });

    describe('when sourceSpaceId is missing', () => {
      it('throws BadRequestException', async () => {
        await expect(
          controller.moveArtifactsToSpace(organizationId, mockRequest, {
            sourceSpaceId: '' as never,
            destinationSpaceId: createSpaceId('dest-space'),
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
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('when service throws an error', () => {
      it('rethrows the error', async () => {
        service.moveArtifactsToSpace.mockRejectedValue(
          new Error('Move failed'),
        );

        await expect(
          controller.moveArtifactsToSpace(organizationId, mockRequest, {
            sourceSpaceId: createSpaceId('source-space'),
            destinationSpaceId: createSpaceId('dest-space'),
          }),
        ).rejects.toThrow('Move failed');
      });
    });

    describe('when an artifact name conflicts in the destination space', () => {
      it('throws ConflictException', async () => {
        service.moveArtifactsToSpace.mockRejectedValue(
          new ArtifactNameConflictError('skill', 'commit', 'frontend'),
        );

        await expect(
          controller.moveArtifactsToSpace(organizationId, mockRequest, {
            sourceSpaceId: createSpaceId('source-space'),
            destinationSpaceId: createSpaceId('dest-space'),
          }),
        ).rejects.toThrow(ConflictException);
      });
    });
  });
});
