import { BadRequestException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import { SkillParseError, SkillValidationError } from '@packmind/skills';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSkillId,
  createSpaceId,
  createUserId,
  Skill,
  UploadSkillFileInput,
} from '@packmind/types';
import { OrganizationsSpacesSkillsController } from './skills.controller';
import { SkillsService } from './skills.service';

describe('OrganizationsSpacesSkillsController', () => {
  let controller: OrganizationsSpacesSkillsController;
  let skillsService: jest.Mocked<SkillsService>;
  let logger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    skillsService = {
      getSkillsBySpace: jest.fn(),
      uploadSkill: jest.fn(),
    } as unknown as jest.Mocked<SkillsService>;

    logger = stubLogger();
    controller = new OrganizationsSpacesSkillsController(skillsService, logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSkills', () => {
    it('returns skills for space within organization', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-1');
      const mockSkills: Skill[] = [
        {
          id: createSkillId('skill-1'),
          slug: 'test-skill',
          name: 'Test Skill',
          content: 'Test content',
          userId,
          version: 1,
          spaceId,
        },
      ];
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;

      skillsService.getSkillsBySpace.mockResolvedValue(mockSkills);

      const result = await controller.getSkills(orgId, spaceId, request);

      expect(result).toEqual(mockSkills);
    });

    it('calls service with correct parameters', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-1');
      const mockSkills: Skill[] = [
        {
          id: createSkillId('skill-1'),
          slug: 'test-skill',
          name: 'Test Skill',
          content: 'Test content',
          userId,
          version: 1,
          spaceId,
        },
      ];
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;

      skillsService.getSkillsBySpace.mockResolvedValue(mockSkills);

      await controller.getSkills(orgId, spaceId, request);

      expect(skillsService.getSkillsBySpace).toHaveBeenCalledWith(
        spaceId,
        orgId,
        userId,
      );
    });

    it('propagates errors from service', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-1');
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;
      const error = new Error('Database error');

      skillsService.getSkillsBySpace.mockRejectedValue(error);

      await expect(
        controller.getSkills(orgId, spaceId, request),
      ).rejects.toThrow('Database error');
    });

    it('handles empty skill list', async () => {
      const orgId = createOrganizationId('org-123');
      const spaceId = createSpaceId('space-456');
      const userId = createUserId('user-1');
      const request = {
        organization: {
          id: orgId,
          name: 'Test Org',
          slug: 'test-org',
          role: 'admin',
        },
        user: {
          userId,
          name: 'Test User',
        },
      } as unknown as AuthenticatedRequest;

      skillsService.getSkillsBySpace.mockResolvedValue([]);

      const result = await controller.getSkills(orgId, spaceId, request);

      expect(result).toEqual([]);
    });
  });

  describe('uploadSkill', () => {
    const orgId = createOrganizationId('org-123');
    const spaceId = createSpaceId('space-456');
    const userId = createUserId('user-1');
    const mockFiles: UploadSkillFileInput[] = [
      {
        fileName: 'SKILL.md',
        content: '---\nname: test-skill\n---\n\nTest content',
      },
    ];
    const request = {
      organization: {
        id: orgId,
        name: 'Test Org',
        slug: 'test-org',
        role: 'admin',
      },
      user: {
        userId,
        name: 'Test User',
      },
    } as unknown as AuthenticatedRequest;

    let mockResponse: jest.Mocked<Response>;

    beforeEach(() => {
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      } as unknown as jest.Mocked<Response>;
    });

    describe('when creating a new skill', () => {
      it('returns 201 Created status', async () => {
        const mockSkill: Skill = {
          id: createSkillId('skill-1'),
          slug: 'test-skill',
          name: 'Test Skill',
          content: 'Test content',
          userId,
          version: 1,
          spaceId,
        };

        skillsService.uploadSkill.mockResolvedValue({
          skill: mockSkill,
          versionCreated: true,
        });

        await controller.uploadSkill(
          orgId,
          spaceId,
          { files: mockFiles },
          request,
          mockResponse,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CREATED);
      });

      it('returns the upload response in the response body', async () => {
        const mockSkill: Skill = {
          id: createSkillId('skill-1'),
          slug: 'test-skill',
          name: 'Test Skill',
          content: 'Test content',
          userId,
          version: 1,
          spaceId,
        };

        const uploadResponse = {
          skill: mockSkill,
          versionCreated: true,
        };

        skillsService.uploadSkill.mockResolvedValue(uploadResponse);

        await controller.uploadSkill(
          orgId,
          spaceId,
          { files: mockFiles },
          request,
          mockResponse,
        );

        expect(mockResponse.json).toHaveBeenCalledWith(uploadResponse);
      });
    });

    describe('when updating an existing skill', () => {
      it('returns 200 OK status', async () => {
        const mockSkill: Skill = {
          id: createSkillId('skill-1'),
          slug: 'test-skill',
          name: 'Test Skill',
          content: 'Test content',
          userId,
          version: 2,
          spaceId,
        };

        skillsService.uploadSkill.mockResolvedValue({
          skill: mockSkill,
          versionCreated: true,
        });

        await controller.uploadSkill(
          orgId,
          spaceId,
          { files: mockFiles },
          request,
          mockResponse,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      });

      it('returns the upload response in the response body', async () => {
        const mockSkill: Skill = {
          id: createSkillId('skill-1'),
          slug: 'test-skill',
          name: 'Test Skill',
          content: 'Updated content',
          userId,
          version: 3,
          spaceId,
        };

        const uploadResponse = {
          skill: mockSkill,
          versionCreated: true,
        };

        skillsService.uploadSkill.mockResolvedValue(uploadResponse);

        await controller.uploadSkill(
          orgId,
          spaceId,
          { files: mockFiles },
          request,
          mockResponse,
        );

        expect(mockResponse.json).toHaveBeenCalledWith(uploadResponse);
      });
    });

    describe('when content is identical to latest version', () => {
      it('returns 200 OK status', async () => {
        const mockSkill: Skill = {
          id: createSkillId('skill-1'),
          slug: 'test-skill',
          name: 'Test Skill',
          content: 'Test content',
          userId,
          version: 1,
          spaceId,
        };

        skillsService.uploadSkill.mockResolvedValue({
          skill: mockSkill,
          versionCreated: false,
        });

        await controller.uploadSkill(
          orgId,
          spaceId,
          { files: mockFiles },
          request,
          mockResponse,
        );

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      });

      it('returns versionCreated false in response', async () => {
        const mockSkill: Skill = {
          id: createSkillId('skill-1'),
          slug: 'test-skill',
          name: 'Test Skill',
          content: 'Test content',
          userId,
          version: 1,
          spaceId,
        };

        const uploadResponse = {
          skill: mockSkill,
          versionCreated: false,
        };

        skillsService.uploadSkill.mockResolvedValue(uploadResponse);

        await controller.uploadSkill(
          orgId,
          spaceId,
          { files: mockFiles },
          request,
          mockResponse,
        );

        expect(mockResponse.json).toHaveBeenCalledWith(uploadResponse);
      });
    });

    it('calls upload service with correct parameters', async () => {
      const mockSkill: Skill = {
        id: createSkillId('skill-1'),
        slug: 'test-skill',
        name: 'Test Skill',
        content: 'Test content',
        userId,
        version: 1,
        spaceId,
      };

      skillsService.uploadSkill.mockResolvedValue({
        skill: mockSkill,
        versionCreated: true,
      });

      await controller.uploadSkill(
        orgId,
        spaceId,
        { files: mockFiles },
        request,
        mockResponse,
      );

      expect(skillsService.uploadSkill).toHaveBeenCalledWith(
        mockFiles,
        orgId,
        spaceId,
        userId,
      );
    });

    describe('when validation fails', () => {
      it('throws BadRequestException with validation error details', async () => {
        const validationError = new SkillValidationError([
          {
            field: 'name',
            message: 'name must contain only lowercase characters',
          },
        ]);

        skillsService.uploadSkill.mockRejectedValue(validationError);

        await expect(
          controller.uploadSkill(
            orgId,
            spaceId,
            { files: mockFiles },
            request,
            mockResponse,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('includes validation error message in BadRequestException', async () => {
        const validationError = new SkillValidationError([
          {
            field: 'name',
            message: 'name must contain only lowercase characters',
          },
        ]);

        skillsService.uploadSkill.mockRejectedValue(validationError);

        await expect(
          controller.uploadSkill(
            orgId,
            spaceId,
            { files: mockFiles },
            request,
            mockResponse,
          ),
        ).rejects.toThrow(validationError.message);
      });

      it('handles multiple validation errors in message', async () => {
        const validationError = new SkillValidationError([
          {
            field: 'name',
            message: 'name must contain only lowercase characters',
          },
          {
            field: 'slug',
            message: 'slug cannot be empty',
          },
        ]);

        skillsService.uploadSkill.mockRejectedValue(validationError);

        await expect(
          controller.uploadSkill(
            orgId,
            spaceId,
            { files: mockFiles },
            request,
            mockResponse,
          ),
        ).rejects.toThrow(
          'Skill validation failed: name must contain only lowercase characters; slug cannot be empty',
        );
      });
    });

    describe('when parsing fails', () => {
      it('throws BadRequestException with parse error message', async () => {
        const parseError = new SkillParseError(
          'Invalid YAML in SKILL.md frontmatter',
        );

        skillsService.uploadSkill.mockRejectedValue(parseError);

        await expect(
          controller.uploadSkill(
            orgId,
            spaceId,
            { files: mockFiles },
            request,
            mockResponse,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('includes parse error message in exception', async () => {
        const parseError = new SkillParseError(
          'Invalid YAML in SKILL.md frontmatter',
        );

        skillsService.uploadSkill.mockRejectedValue(parseError);

        await expect(
          controller.uploadSkill(
            orgId,
            spaceId,
            { files: mockFiles },
            request,
            mockResponse,
          ),
        ).rejects.toThrow('Invalid YAML in SKILL.md frontmatter');
      });

      it('handles missing frontmatter error', async () => {
        const parseError = new SkillParseError(
          'SKILL.md must have frontmatter',
        );

        skillsService.uploadSkill.mockRejectedValue(parseError);

        await expect(
          controller.uploadSkill(
            orgId,
            spaceId,
            { files: mockFiles },
            request,
            mockResponse,
          ),
        ).rejects.toThrow('SKILL.md must have frontmatter');
      });
    });

    describe('when other errors occur', () => {
      it('propagates generic error unchanged', async () => {
        const error = new Error('Database connection failed');

        skillsService.uploadSkill.mockRejectedValue(error);

        await expect(
          controller.uploadSkill(
            orgId,
            spaceId,
            { files: mockFiles },
            request,
            mockResponse,
          ),
        ).rejects.toThrow('Database connection failed');
      });

      it('propagates network errors unchanged', async () => {
        const error = new Error('Network timeout');

        skillsService.uploadSkill.mockRejectedValue(error);

        await expect(
          controller.uploadSkill(
            orgId,
            spaceId,
            { files: mockFiles },
            request,
            mockResponse,
          ),
        ).rejects.toThrow('Network timeout');
      });

      it('propagates permission errors unchanged', async () => {
        const error = new Error('Insufficient permissions');

        skillsService.uploadSkill.mockRejectedValue(error);

        await expect(
          controller.uploadSkill(
            orgId,
            spaceId,
            { files: mockFiles },
            request,
            mockResponse,
          ),
        ).rejects.toThrow('Insufficient permissions');
      });
    });
  });
});
