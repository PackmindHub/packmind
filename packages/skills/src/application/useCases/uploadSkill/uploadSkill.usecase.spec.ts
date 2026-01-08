import { UploadSkillUsecase } from './uploadSkill.usecase';
import { SkillService } from '../../services/SkillService';
import { SkillVersionService } from '../../services/SkillVersionService';
import { ISkillFileRepository } from '../../../domain/repositories/ISkillFileRepository';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { SkillParseError } from '../../errors/SkillParseError';
import { SkillValidationError } from '../../errors/SkillValidationError';
import { SkillSpaceError } from '../../errors/SkillSpaceError';
import { createMockInstance, stubLogger } from '@packmind/test-utils';
import {
  createUserId,
  createOrganizationId,
  createSpaceId,
  createSkillId,
  createSkillVersionId,
  UploadSkillCommand,
  Skill,
  SkillVersion,
  UploadSkillFileInput,
  ISpacesPort,
} from '@packmind/types';

describe('UploadSkillUsecase', () => {
  let usecase: UploadSkillUsecase;
  let mockSkillService: jest.Mocked<SkillService>;
  let mockSkillVersionService: jest.Mocked<SkillVersionService>;
  let mockSkillFileRepository: jest.Mocked<ISkillFileRepository>;
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;

  const userId = createUserId('user-123');
  const organizationId = createOrganizationId('org-123');
  const spaceId = createSpaceId('space-123');

  beforeEach(() => {
    mockSkillService = createMockInstance(SkillService);
    mockSkillVersionService = createMockInstance(SkillVersionService);
    mockSkillFileRepository = {
      findBySkillVersionId: jest.fn(),
      addMany: jest.fn(),
    } as jest.Mocked<ISkillFileRepository>;
    mockEventEmitterService = createMockInstance(PackmindEventEmitterService);
    mockSpacesPort = {
      createSpace: jest.fn(),
      listSpacesByOrganization: jest.fn(),
      getSpaceBySlug: jest.fn(),
      getSpaceById: jest.fn(),
    } as jest.Mocked<ISpacesPort>;

    // Default: auto-select first space
    mockSpacesPort.listSpacesByOrganization.mockResolvedValue([
      {
        id: spaceId,
        name: 'Global',
        slug: 'global',
        organizationId,
      },
    ]);

    usecase = new UploadSkillUsecase(
      mockSkillService,
      mockSkillVersionService,
      mockSkillFileRepository,
      mockEventEmitterService,
      mockSpacesPort,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('with valid SKILL.md and single file', () => {
    it('creates skill with correct metadata', async () => {
      const files: UploadSkillFileInput[] = [
        {
          path: 'SKILL.md',
          content: `---
name: test-skill
description: A test skill
---

# Test Skill

This is the skill body.`,
          permissions: 'rw-r--r--',
        },
      ];

      const command: UploadSkillCommand = {
        files,
        organizationId,
        userId,
      };

      const mockSkill: Skill = {
        id: createSkillId('skill-123'),
        name: 'test-skill',
        slug: 'test-skill',
        description: 'A test skill',
        prompt: '# Test Skill\n\nThis is the skill body.',
        version: 1,
        userId,
        spaceId,
        organizationId,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSkillVersion: SkillVersion = {
        id: createSkillVersionId('version-123'),
        skillId: mockSkill.id,
        userId,
        name: 'test-skill',
        slug: 'test-skill',
        description: 'A test skill',
        prompt: '# Test Skill\n\nThis is the skill body.',
        version: 1,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSkillService.listSkillsBySpace.mockResolvedValue([]);
      mockSkillService.addSkill.mockResolvedValue(mockSkill);
      mockSkillVersionService.addSkillVersion.mockResolvedValue(
        mockSkillVersion,
      );
      mockSkillFileRepository.addMany.mockResolvedValue([]);

      const result = await usecase.execute(command);

      expect(result).toEqual(mockSkill);
    });

    it('saves all uploaded files to repository', async () => {
      const files: UploadSkillFileInput[] = [
        {
          path: 'SKILL.md',
          content: `---
name: test-skill
description: A test skill
---

Content`,
          permissions: 'rw-r--r--',
        },
      ];

      const command: UploadSkillCommand = {
        files,
        organizationId,
        userId,
      };

      const mockSkill: Skill = {
        id: createSkillId('skill-123'),
        name: 'test-skill',
        slug: 'test-skill',
        description: 'A test skill',
        prompt: 'Content',
        version: 1,
        userId,
        spaceId,
        organizationId,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSkillVersion: SkillVersion = {
        id: createSkillVersionId('version-123'),
        skillId: mockSkill.id,
        userId,
        name: 'test-skill',
        slug: 'test-skill',
        description: 'A test skill',
        prompt: 'Content',
        version: 1,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSkillService.listSkillsBySpace.mockResolvedValue([]);
      mockSkillService.addSkill.mockResolvedValue(mockSkill);
      mockSkillVersionService.addSkillVersion.mockResolvedValue(
        mockSkillVersion,
      );
      mockSkillFileRepository.addMany.mockResolvedValue([]);

      await usecase.execute(command);

      expect(mockSkillFileRepository.addMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'SKILL.md',
            content: expect.stringContaining('name: test-skill'),
            permissions: 'rw-r--r--',
          }),
        ]),
      );
    });

    it('emits SkillCreatedEvent with correct payload', async () => {
      const files: UploadSkillFileInput[] = [
        {
          path: 'SKILL.md',
          content: `---
name: test-skill
description: A test skill
---

Content`,
          permissions: 'rw-r--r--',
        },
      ];

      const command: UploadSkillCommand = {
        files,
        organizationId,
        userId,
      };

      const mockSkill: Skill = {
        id: createSkillId('skill-123'),
        name: 'test-skill',
        slug: 'test-skill',
        description: 'A test skill',
        prompt: 'Content',
        version: 1,
        userId,
        spaceId,
        organizationId,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSkillVersion: SkillVersion = {
        id: createSkillVersionId('version-123'),
        skillId: mockSkill.id,
        userId,
        name: 'test-skill',
        slug: 'test-skill',
        description: 'A test skill',
        prompt: 'Content',
        version: 1,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSkillService.listSkillsBySpace.mockResolvedValue([]);
      mockSkillService.addSkill.mockResolvedValue(mockSkill);
      mockSkillVersionService.addSkillVersion.mockResolvedValue(
        mockSkillVersion,
      );
      mockSkillFileRepository.addMany.mockResolvedValue([]);

      await usecase.execute(command);

      expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            skillId: mockSkill.id,
            spaceId,
            organizationId,
            userId,
            source: 'ui',
          }),
        }),
      );
    });
  });

  describe('with multiple files', () => {
    it('creates skill with all files saved', async () => {
      const files: UploadSkillFileInput[] = [
        {
          path: 'SKILL.md',
          content: `---
name: multi-file-skill
description: Skill with multiple files
---

Main content`,
          permissions: 'rw-r--r--',
        },
        {
          path: 'prompts/helper.md',
          content: 'Helper content',
          permissions: 'rw-r--r--',
        },
        {
          path: 'data/config.json',
          content: '{"key": "value"}',
          permissions: 'rw-r--r--',
        },
      ];

      const command: UploadSkillCommand = {
        files,
        organizationId,
        userId,
      };

      const mockSkill: Skill = {
        id: createSkillId('skill-123'),
        name: 'multi-file-skill',
        slug: 'multi-file-skill',
        description: 'Skill with multiple files',
        prompt: 'Main content',
        version: 1,
        userId,
        spaceId,
        organizationId,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSkillVersion: SkillVersion = {
        id: createSkillVersionId('version-123'),
        skillId: mockSkill.id,
        userId,
        name: 'multi-file-skill',
        slug: 'multi-file-skill',
        description: 'Skill with multiple files',
        prompt: 'Main content',
        version: 1,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSkillService.listSkillsBySpace.mockResolvedValue([]);
      mockSkillService.addSkill.mockResolvedValue(mockSkill);
      mockSkillVersionService.addSkillVersion.mockResolvedValue(
        mockSkillVersion,
      );
      mockSkillFileRepository.addMany.mockResolvedValue([]);

      await usecase.execute(command);

      expect(mockSkillFileRepository.addMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ path: 'SKILL.md' }),
          expect.objectContaining({ path: 'prompts/helper.md' }),
          expect.objectContaining({ path: 'data/config.json' }),
        ]),
      );
    });

    it('preserves nested directory structure', async () => {
      const files: UploadSkillFileInput[] = [
        {
          path: 'SKILL.md',
          content: `---
name: nested-skill
description: Nested structure
---

Content`,
          permissions: 'rw-r--r--',
        },
        {
          path: 'deep/nested/file.txt',
          content: 'Nested file content',
          permissions: 'rw-r--r--',
        },
      ];

      const command: UploadSkillCommand = {
        files,
        organizationId,
        userId,
      };

      const mockSkill: Skill = {
        id: createSkillId('skill-123'),
        name: 'nested-skill',
        slug: 'nested-skill',
        description: 'Nested structure',
        prompt: 'Content',
        version: 1,
        userId,
        spaceId,
        organizationId,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSkillVersion: SkillVersion = {
        id: createSkillVersionId('version-123'),
        skillId: mockSkill.id,
        userId,
        name: 'nested-skill',
        slug: 'nested-skill',
        description: 'Nested structure',
        prompt: 'Content',
        version: 1,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSkillService.listSkillsBySpace.mockResolvedValue([]);
      mockSkillService.addSkill.mockResolvedValue(mockSkill);
      mockSkillVersionService.addSkillVersion.mockResolvedValue(
        mockSkillVersion,
      );
      mockSkillFileRepository.addMany.mockResolvedValue([]);

      await usecase.execute(command);

      expect(mockSkillFileRepository.addMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'deep/nested/file.txt',
            content: 'Nested file content',
          }),
        ]),
      );
    });
  });

  describe('with optional metadata fields', () => {
    it('creates skill with all optional fields', async () => {
      const files: UploadSkillFileInput[] = [
        {
          path: 'SKILL.md',
          content: `---
name: full-skill
description: Complete skill
license: MIT
compatibility: Node 18+
metadata:
  author: test-author
  version: "1.0.0"
allowed-tools: Bash Read Write
---

Content`,
          permissions: 'rw-r--r--',
        },
      ];

      const command: UploadSkillCommand = {
        files,
        organizationId,
        userId,
      };

      const mockSkill: Skill = {
        id: createSkillId('skill-123'),
        name: 'full-skill',
        slug: 'full-skill',
        description: 'Complete skill',
        prompt: 'Content',
        version: 1,
        userId,
        spaceId,
        organizationId,
        allowedTools: 'Bash Read Write',
        license: 'MIT',
        compatibility: 'Node 18+',
        metadata: {
          author: 'test-author',
          version: '1.0.0',
        },
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSkillVersion: SkillVersion = {
        id: createSkillVersionId('version-123'),
        skillId: mockSkill.id,
        userId,
        name: 'full-skill',
        slug: 'full-skill',
        description: 'Complete skill',
        prompt: 'Content',
        version: 1,
        allowedTools: 'Bash Read Write',
        license: 'MIT',
        compatibility: 'Node 18+',
        metadata: {
          author: 'test-author',
          version: '1.0.0',
        },
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSkillService.listSkillsBySpace.mockResolvedValue([]);
      mockSkillService.addSkill.mockResolvedValue(mockSkill);
      mockSkillVersionService.addSkillVersion.mockResolvedValue(
        mockSkillVersion,
      );
      mockSkillFileRepository.addMany.mockResolvedValue([]);

      const result = await usecase.execute(command);

      expect(result.allowedTools).toBe('Bash Read Write');
    });
  });

  describe('when skill name conflicts', () => {
    it('generates unique slug with counter suffix', async () => {
      const files: UploadSkillFileInput[] = [
        {
          path: 'SKILL.md',
          content: `---
name: existing-skill
description: Test conflict
---

Content`,
          permissions: 'rw-r--r--',
        },
      ];

      const command: UploadSkillCommand = {
        files,
        organizationId,
        userId,
      };

      const existingSkill: Skill = {
        id: createSkillId('existing-123'),
        name: 'existing-skill',
        slug: 'existing-skill',
        description: 'Existing',
        prompt: 'Content',
        version: 1,
        userId,
        spaceId,
        organizationId,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSkill: Skill = {
        id: createSkillId('skill-123'),
        name: 'existing-skill',
        slug: 'existing-skill-1',
        description: 'Test conflict',
        prompt: 'Content',
        version: 1,
        userId,
        spaceId,
        organizationId,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSkillVersion: SkillVersion = {
        id: createSkillVersionId('version-123'),
        skillId: mockSkill.id,
        userId,
        name: 'existing-skill',
        slug: 'existing-skill-1',
        description: 'Test conflict',
        prompt: 'Content',
        version: 1,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSkillService.listSkillsBySpace.mockResolvedValue([existingSkill]);
      mockSkillService.addSkill.mockResolvedValue(mockSkill);
      mockSkillVersionService.addSkillVersion.mockResolvedValue(
        mockSkillVersion,
      );
      mockSkillFileRepository.addMany.mockResolvedValue([]);

      await usecase.execute(command);

      expect(mockSkillService.addSkill).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'existing-skill-1',
        }),
      );
    });

    it('handles multiple conflicting slugs', async () => {
      const files: UploadSkillFileInput[] = [
        {
          path: 'SKILL.md',
          content: `---
name: popular-skill
description: Many conflicts
---

Content`,
          permissions: 'rw-r--r--',
        },
      ];

      const command: UploadSkillCommand = {
        files,
        organizationId,
        userId,
      };

      const existingSkills: Skill[] = [
        {
          id: createSkillId('skill-1'),
          name: 'popular-skill',
          slug: 'popular-skill',
          description: 'First',
          prompt: 'Content',
          version: 1,
          userId,
          spaceId,
          organizationId,
          allowedTools: undefined,
          license: undefined,
          compatibility: undefined,
          metadata: undefined,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: createSkillId('skill-2'),
          name: 'popular-skill-1',
          slug: 'popular-skill-1',
          description: 'Second',
          prompt: 'Content',
          version: 1,
          userId,
          spaceId,
          organizationId,
          allowedTools: undefined,
          license: undefined,
          compatibility: undefined,
          metadata: undefined,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockSkill: Skill = {
        id: createSkillId('skill-123'),
        name: 'popular-skill',
        slug: 'popular-skill-2',
        description: 'Many conflicts',
        prompt: 'Content',
        version: 1,
        userId,
        spaceId,
        organizationId,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSkillVersion: SkillVersion = {
        id: createSkillVersionId('version-123'),
        skillId: mockSkill.id,
        userId,
        name: 'popular-skill',
        slug: 'popular-skill-2',
        description: 'Many conflicts',
        prompt: 'Content',
        version: 1,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSkillService.listSkillsBySpace.mockResolvedValue(existingSkills);
      mockSkillService.addSkill.mockResolvedValue(mockSkill);
      mockSkillVersionService.addSkillVersion.mockResolvedValue(
        mockSkillVersion,
      );
      mockSkillFileRepository.addMany.mockResolvedValue([]);

      await usecase.execute(command);

      expect(mockSkillService.addSkill).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'popular-skill-2',
        }),
      );
    });
  });

  describe('when SKILL.md is missing', () => {
    it('throws SkillParseError', async () => {
      const files: UploadSkillFileInput[] = [
        {
          path: 'README.md',
          content: 'Just a readme',
          permissions: 'rw-r--r--',
        },
      ];

      const command: UploadSkillCommand = {
        files,
        organizationId,
        userId,
      };

      await expect(usecase.execute(command)).rejects.toThrow(SkillParseError);
    });

    it('does not create skill', async () => {
      const files: UploadSkillFileInput[] = [
        {
          path: 'other.md',
          content: 'Not SKILL.md',
          permissions: 'rw-r--r--',
        },
      ];

      const command: UploadSkillCommand = {
        files,
        organizationId,
        userId,
      };

      await expect(usecase.execute(command)).rejects.toThrow();
    });
  });

  describe('when SKILL.md has invalid YAML', () => {
    it('throws SkillParseError', async () => {
      const files: UploadSkillFileInput[] = [
        {
          path: 'SKILL.md',
          content: `---
name: [invalid yaml syntax
---

Content`,
          permissions: 'rw-r--r--',
        },
      ];

      const command: UploadSkillCommand = {
        files,
        organizationId,
        userId,
      };

      await expect(usecase.execute(command)).rejects.toThrow(SkillParseError);
    });
  });

  describe('when name is missing', () => {
    it('throws SkillValidationError', async () => {
      const files: UploadSkillFileInput[] = [
        {
          path: 'SKILL.md',
          content: `---
description: Missing name field
---

Content`,
          permissions: 'rw-r--r--',
        },
      ];

      const command: UploadSkillCommand = {
        files,
        organizationId,
        userId,
      };

      await expect(usecase.execute(command)).rejects.toThrow(
        SkillValidationError,
      );
    });
  });

  describe('when description is missing', () => {
    it('throws SkillValidationError', async () => {
      const files: UploadSkillFileInput[] = [
        {
          path: 'SKILL.md',
          content: `---
name: valid-name
---

Content`,
          permissions: 'rw-r--r--',
        },
      ];

      const command: UploadSkillCommand = {
        files,
        organizationId,
        userId,
      };

      await expect(usecase.execute(command)).rejects.toThrow(
        SkillValidationError,
      );
    });
  });

  describe('when name has invalid format', () => {
    it('throws SkillValidationError with uppercase letters', async () => {
      const files: UploadSkillFileInput[] = [
        {
          path: 'SKILL.md',
          content: `---
name: InvalidName
description: Has uppercase
---

Content`,
          permissions: 'rw-r--r--',
        },
      ];

      const command: UploadSkillCommand = {
        files,
        organizationId,
        userId,
      };

      await expect(usecase.execute(command)).rejects.toThrow(
        SkillValidationError,
      );
    });

    it('throws SkillValidationError with spaces', async () => {
      const files: UploadSkillFileInput[] = [
        {
          path: 'SKILL.md',
          content: `---
name: invalid name
description: Has spaces
---

Content`,
          permissions: 'rw-r--r--',
        },
      ];

      const command: UploadSkillCommand = {
        files,
        organizationId,
        userId,
      };

      await expect(usecase.execute(command)).rejects.toThrow(
        SkillValidationError,
      );
    });

    it('throws SkillValidationError with leading hyphen', async () => {
      const files: UploadSkillFileInput[] = [
        {
          path: 'SKILL.md',
          content: `---
name: -invalid-name
description: Starts with hyphen
---

Content`,
          permissions: 'rw-r--r--',
        },
      ];

      const command: UploadSkillCommand = {
        files,
        organizationId,
        userId,
      };

      await expect(usecase.execute(command)).rejects.toThrow(
        SkillValidationError,
      );
    });
  });

  describe('when files array is empty', () => {
    it('throws SkillParseError', async () => {
      const command: UploadSkillCommand = {
        files: [],
        organizationId,
        userId,
      };

      await expect(usecase.execute(command)).rejects.toThrow(SkillParseError);
    });
  });

  describe('Space auto-selection', () => {
    describe('when single space exists', () => {
      it('calls listSpacesByOrganization with organizationId', async () => {
        const files: UploadSkillFileInput[] = [
          {
            path: 'SKILL.md',
            content: `---
name: test-skill
description: A test skill
---

Content`,
            permissions: 'rw-r--r--',
          },
        ];

        const command: UploadSkillCommand = {
          files,
          organizationId,
          userId,
        };

        const mockSkill: Skill = {
          id: createSkillId('skill-123'),
          name: 'test-skill',
          slug: 'test-skill',
          description: 'A test skill',
          prompt: 'Content',
          version: 1,
          userId,
          spaceId,
          organizationId,
          allowedTools: undefined,
          license: undefined,
          compatibility: undefined,
          metadata: undefined,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockSkillVersion = {
          id: createSkillVersionId('version-123'),
          skillId: mockSkill.id,
          userId,
          name: 'test-skill',
          slug: 'test-skill',
          description: 'A test skill',
          prompt: 'Content',
          version: 1,
          allowedTools: undefined,
          license: undefined,
          compatibility: undefined,
          metadata: undefined,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockSpacesPort.listSpacesByOrganization.mockResolvedValue([
          {
            id: spaceId,
            name: 'Global',
            slug: 'global',
            organizationId,
          },
        ]);

        mockSkillService.listSkillsBySpace.mockResolvedValue([]);
        mockSkillService.addSkill.mockResolvedValue(mockSkill);
        mockSkillVersionService.addSkillVersion.mockResolvedValue(
          mockSkillVersion,
        );
        mockSkillFileRepository.addMany.mockResolvedValue([]);

        await usecase.execute(command);

        expect(mockSpacesPort.listSpacesByOrganization).toHaveBeenCalledWith(
          organizationId,
        );
      });

      it('uses auto-selected spaceId for skill creation', async () => {
        const files: UploadSkillFileInput[] = [
          {
            path: 'SKILL.md',
            content: `---
name: test-skill
description: A test skill
---

Content`,
            permissions: 'rw-r--r--',
          },
        ];

        const command: UploadSkillCommand = {
          files,
          organizationId,
          userId,
        };

        const mockSkill: Skill = {
          id: createSkillId('skill-123'),
          name: 'test-skill',
          slug: 'test-skill',
          description: 'A test skill',
          prompt: 'Content',
          version: 1,
          userId,
          spaceId,
          organizationId,
          allowedTools: undefined,
          license: undefined,
          compatibility: undefined,
          metadata: undefined,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockSkillVersion = {
          id: createSkillVersionId('version-123'),
          skillId: mockSkill.id,
          userId,
          name: 'test-skill',
          slug: 'test-skill',
          description: 'A test skill',
          prompt: 'Content',
          version: 1,
          allowedTools: undefined,
          license: undefined,
          compatibility: undefined,
          metadata: undefined,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockSpacesPort.listSpacesByOrganization.mockResolvedValue([
          {
            id: spaceId,
            name: 'Global',
            slug: 'global',
            organizationId,
          },
        ]);

        mockSkillService.listSkillsBySpace.mockResolvedValue([]);
        mockSkillService.addSkill.mockResolvedValue(mockSkill);
        mockSkillVersionService.addSkillVersion.mockResolvedValue(
          mockSkillVersion,
        );
        mockSkillFileRepository.addMany.mockResolvedValue([]);

        await usecase.execute(command);

        expect(mockSkillService.addSkill).toHaveBeenCalledWith(
          expect.objectContaining({ spaceId }),
        );
      });
    });

    describe('when multiple spaces exist', () => {
      it('uses first space for skill creation', async () => {
        const files: UploadSkillFileInput[] = [
          {
            path: 'SKILL.md',
            content: `---
name: test-skill
description: A test skill
---

Content`,
            permissions: 'rw-r--r--',
          },
        ];

        const command: UploadSkillCommand = {
          files,
          organizationId,
          userId,
        };

        const firstSpace = {
          id: spaceId,
          name: 'Global',
          slug: 'global',
          organizationId,
        };
        const secondSpace = {
          id: createSpaceId('space-2'),
          name: 'Other',
          slug: 'other',
          organizationId,
        };

        const mockSkill: Skill = {
          id: createSkillId('skill-123'),
          name: 'test-skill',
          slug: 'test-skill',
          description: 'A test skill',
          prompt: 'Content',
          version: 1,
          userId,
          spaceId,
          organizationId,
          allowedTools: undefined,
          license: undefined,
          compatibility: undefined,
          metadata: undefined,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockSkillVersion = {
          id: createSkillVersionId('version-123'),
          skillId: mockSkill.id,
          userId,
          name: 'test-skill',
          slug: 'test-skill',
          description: 'A test skill',
          prompt: 'Content',
          version: 1,
          allowedTools: undefined,
          license: undefined,
          compatibility: undefined,
          metadata: undefined,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockSpacesPort.listSpacesByOrganization.mockResolvedValue([
          firstSpace,
          secondSpace,
        ]);

        mockSkillService.listSkillsBySpace.mockResolvedValue([]);
        mockSkillService.addSkill.mockResolvedValue(mockSkill);
        mockSkillVersionService.addSkillVersion.mockResolvedValue(
          mockSkillVersion,
        );
        mockSkillFileRepository.addMany.mockResolvedValue([]);

        await usecase.execute(command);

        expect(mockSkillService.addSkill).toHaveBeenCalledWith(
          expect.objectContaining({ spaceId: firstSpace.id }),
        );
      });
    });

    describe('when no spaces exist', () => {
      it('throws SkillSpaceError', async () => {
        const files: UploadSkillFileInput[] = [
          {
            path: 'SKILL.md',
            content: `---
name: test-skill
description: A test skill
---

Content`,
            permissions: 'rw-r--r--',
          },
        ];

        const command: UploadSkillCommand = {
          files,
          organizationId,
          userId,
        };

        mockSpacesPort.listSpacesByOrganization.mockResolvedValue([]);

        await expect(usecase.execute(command)).rejects.toThrow(SkillSpaceError);
      });
    });
  });
});
