import { UploadSkillUsecase } from './uploadSkill.usecase';
import { SkillService } from '../../services/SkillService';
import { SkillVersionService } from '../../services/SkillVersionService';
import { ISkillFileRepository } from '../../../domain/repositories/ISkillFileRepository';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { SkillParseError } from '../../errors/SkillParseError';
import { SkillValidationError } from '../../errors/SkillValidationError';
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
  IAccountsPort,
  ISpacesPort,
  User,
  Organization,
  Space,
  UserOrganizationMembership,
  SkillUpdatedEvent,
} from '@packmind/types';

describe('UploadSkillUsecase', () => {
  let usecase: UploadSkillUsecase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let mockSkillService: jest.Mocked<SkillService>;
  let mockSkillVersionService: jest.Mocked<SkillVersionService>;
  let mockSkillFileRepository: jest.Mocked<ISkillFileRepository>;
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;

  const userId = createUserId('user-123');
  const organizationId = createOrganizationId('org-123');
  const spaceId = createSpaceId('space-123');

  const mockUser: User = {
    id: userId,
    email: 'test@example.com',
    memberships: [
      {
        organizationId,
        role: 'member',
      } as UserOrganizationMembership,
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrganization: Organization = {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSpace: Space = {
    id: spaceId,
    name: 'Test Space',
    slug: 'test-space',
    organizationId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    mockAccountsPort = {
      getUserById: jest.fn().mockResolvedValue(mockUser),
      getOrganizationById: jest.fn().mockResolvedValue(mockOrganization),
    } as jest.Mocked<IAccountsPort>;

    mockSpacesPort = {
      getSpaceById: jest.fn().mockResolvedValue(mockSpace),
      createSpace: jest.fn(),
      listSpacesByOrganization: jest.fn(),
      getSpaceBySlug: jest.fn(),
    } as jest.Mocked<ISpacesPort>;

    mockSkillService = createMockInstance(SkillService);
    mockSkillVersionService = createMockInstance(SkillVersionService);
    mockSkillFileRepository = {
      findBySkillVersionId: jest.fn(),
      addMany: jest.fn(),
    } as jest.Mocked<ISkillFileRepository>;
    mockEventEmitterService = createMockInstance(PackmindEventEmitterService);

    usecase = new UploadSkillUsecase(
      mockAccountsPort,
      mockSpacesPort,
      mockSkillService,
      mockSkillVersionService,
      mockSkillFileRepository,
      mockEventEmitterService,
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
        spaceId,
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

    it('does not save SKILL.md to repository since data is extracted into SkillVersion', async () => {
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
        spaceId,
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

      expect(mockSkillFileRepository.addMany).toHaveBeenCalledWith([]);
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
        spaceId,
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
            source: 'cli',
            fileCount: 0,
          }),
        }),
      );
    });
  });

  describe('with multiple files', () => {
    it('saves only supporting files excluding SKILL.md', async () => {
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
        spaceId,
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
          expect.objectContaining({ path: 'prompts/helper.md' }),
          expect.objectContaining({ path: 'data/config.json' }),
        ]),
      );
    });

    it('excludes SKILL.md from saved files', async () => {
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
      ];

      const command: UploadSkillCommand = {
        files,
        organizationId,
        userId,
        spaceId,
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

      const savedFiles = mockSkillFileRepository.addMany.mock.calls[0][0];
      const skillMdSaved = savedFiles.some(
        (f: { path: string }) => f.path === 'SKILL.md',
      );

      expect(skillMdSaved).toBe(false);
    });

    it('preserves nested directory structure for supporting files', async () => {
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
        spaceId,
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

      expect(mockSkillFileRepository.addMany).toHaveBeenCalledWith([
        expect.objectContaining({
          path: 'deep/nested/file.txt',
          content: 'Nested file content',
        }),
      ]);
    });

    it('emits SkillCreatedEvent with file count excluding SKILL.md', async () => {
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
        spaceId,
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

      expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            fileCount: 2,
          }),
        }),
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
        spaceId,
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

  describe('when skill slug already exists', () => {
    const existingSkillId = createSkillId('existing-123');

    const existingSkill: Skill = {
      id: existingSkillId,
      name: 'existing-skill',
      slug: 'existing-skill',
      description: 'Existing',
      prompt: 'Old content',
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

    const files: UploadSkillFileInput[] = [
      {
        path: 'SKILL.md',
        content: `---
name: existing-skill
description: Updated description
---

New content`,
        permissions: 'rw-r--r--',
      },
    ];

    const command: UploadSkillCommand = {
      files,
      organizationId,
      userId,
      spaceId,
    };

    beforeEach(() => {
      mockSkillService.listSkillsBySpace.mockResolvedValue([existingSkill]);
    });

    it('updates the existing skill instead of creating a new one', async () => {
      const updatedSkill: Skill = {
        ...existingSkill,
        description: 'Updated description',
        prompt: 'New content',
        version: 2,
      };

      const mockSkillVersion: SkillVersion = {
        id: createSkillVersionId('version-123'),
        skillId: existingSkillId,
        userId,
        name: 'existing-skill',
        slug: 'existing-skill',
        description: 'Updated description',
        prompt: 'New content',
        version: 2,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSkillService.updateSkill.mockResolvedValue(updatedSkill);
      mockSkillVersionService.addSkillVersion.mockResolvedValue(
        mockSkillVersion,
      );
      mockSkillFileRepository.addMany.mockResolvedValue([]);

      await usecase.execute(command);

      expect(mockSkillService.updateSkill).toHaveBeenCalledWith(
        existingSkillId,
        expect.objectContaining({
          version: 2,
          description: 'Updated description',
          prompt: 'New content',
        }),
      );
    });

    it('increments the version number', async () => {
      const updatedSkill: Skill = {
        ...existingSkill,
        version: 2,
      };

      const mockSkillVersion: SkillVersion = {
        id: createSkillVersionId('version-123'),
        skillId: existingSkillId,
        userId,
        name: 'existing-skill',
        slug: 'existing-skill',
        description: 'Updated description',
        prompt: 'New content',
        version: 2,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSkillService.updateSkill.mockResolvedValue(updatedSkill);
      mockSkillVersionService.addSkillVersion.mockResolvedValue(
        mockSkillVersion,
      );
      mockSkillFileRepository.addMany.mockResolvedValue([]);

      const result = await usecase.execute(command);

      expect(result.version).toBe(2);
    });

    it('creates a new skill version', async () => {
      const updatedSkill: Skill = {
        ...existingSkill,
        version: 2,
      };

      const mockSkillVersion: SkillVersion = {
        id: createSkillVersionId('version-123'),
        skillId: existingSkillId,
        userId,
        name: 'existing-skill',
        slug: 'existing-skill',
        description: 'Updated description',
        prompt: 'New content',
        version: 2,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSkillService.updateSkill.mockResolvedValue(updatedSkill);
      mockSkillVersionService.addSkillVersion.mockResolvedValue(
        mockSkillVersion,
      );
      mockSkillFileRepository.addMany.mockResolvedValue([]);

      await usecase.execute(command);

      expect(mockSkillVersionService.addSkillVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          skillId: existingSkillId,
          version: 2,
        }),
      );
    });

    it('does not create a new skill', async () => {
      const updatedSkill: Skill = {
        ...existingSkill,
        version: 2,
      };

      const mockSkillVersion: SkillVersion = {
        id: createSkillVersionId('version-123'),
        skillId: existingSkillId,
        userId,
        name: 'existing-skill',
        slug: 'existing-skill',
        description: 'Updated description',
        prompt: 'New content',
        version: 2,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSkillService.updateSkill.mockResolvedValue(updatedSkill);
      mockSkillVersionService.addSkillVersion.mockResolvedValue(
        mockSkillVersion,
      );
      mockSkillFileRepository.addMany.mockResolvedValue([]);

      await usecase.execute(command);

      expect(mockSkillService.addSkill).not.toHaveBeenCalled();
    });

    it('emits SkillUpdatedEvent instead of SkillCreatedEvent', async () => {
      const updatedSkill: Skill = {
        ...existingSkill,
        version: 2,
      };

      const mockSkillVersion: SkillVersion = {
        id: createSkillVersionId('version-123'),
        skillId: existingSkillId,
        userId,
        name: 'existing-skill',
        slug: 'existing-skill',
        description: 'Updated description',
        prompt: 'New content',
        version: 2,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSkillService.updateSkill.mockResolvedValue(updatedSkill);
      mockSkillVersionService.addSkillVersion.mockResolvedValue(
        mockSkillVersion,
      );
      mockSkillFileRepository.addMany.mockResolvedValue([]);

      await usecase.execute(command);

      expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
        expect.any(SkillUpdatedEvent),
      );
    });

    it('emits SkillUpdatedEvent with cli source', async () => {
      const updatedSkill: Skill = {
        ...existingSkill,
        version: 2,
      };

      const mockSkillVersion: SkillVersion = {
        id: createSkillVersionId('version-123'),
        skillId: existingSkillId,
        userId,
        name: 'existing-skill',
        slug: 'existing-skill',
        description: 'Updated description',
        prompt: 'New content',
        version: 2,
        allowedTools: undefined,
        license: undefined,
        compatibility: undefined,
        metadata: undefined,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSkillService.updateSkill.mockResolvedValue(updatedSkill);
      mockSkillVersionService.addSkillVersion.mockResolvedValue(
        mockSkillVersion,
      );
      mockSkillFileRepository.addMany.mockResolvedValue([]);

      await usecase.execute(command);

      expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            skillId: existingSkillId,
            spaceId,
            source: 'cli',
          }),
        }),
      );
    });

    describe('with supporting files', () => {
      const filesWithSupporting: UploadSkillFileInput[] = [
        {
          path: 'SKILL.md',
          content: `---
name: existing-skill
description: Updated description
---

New content`,
          permissions: 'rw-r--r--',
        },
        {
          path: 'helper.md',
          content: 'Helper content',
          permissions: 'rw-r--r--',
        },
      ];

      const commandWithFiles: UploadSkillCommand = {
        files: filesWithSupporting,
        organizationId,
        userId,
        spaceId,
      };

      it('saves supporting files for the new version', async () => {
        const updatedSkill: Skill = {
          ...existingSkill,
          version: 2,
        };

        const mockSkillVersion: SkillVersion = {
          id: createSkillVersionId('version-123'),
          skillId: existingSkillId,
          userId,
          name: 'existing-skill',
          slug: 'existing-skill',
          description: 'Updated description',
          prompt: 'New content',
          version: 2,
          allowedTools: undefined,
          license: undefined,
          compatibility: undefined,
          metadata: undefined,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockSkillService.updateSkill.mockResolvedValue(updatedSkill);
        mockSkillVersionService.addSkillVersion.mockResolvedValue(
          mockSkillVersion,
        );
        mockSkillFileRepository.addMany.mockResolvedValue([]);

        await usecase.execute(commandWithFiles);

        expect(mockSkillFileRepository.addMany).toHaveBeenCalledWith([
          expect.objectContaining({
            path: 'helper.md',
            content: 'Helper content',
          }),
        ]);
      });

      it('emits SkillUpdatedEvent with correct file count', async () => {
        const updatedSkill: Skill = {
          ...existingSkill,
          version: 2,
        };

        const mockSkillVersion: SkillVersion = {
          id: createSkillVersionId('version-123'),
          skillId: existingSkillId,
          userId,
          name: 'existing-skill',
          slug: 'existing-skill',
          description: 'Updated description',
          prompt: 'New content',
          version: 2,
          allowedTools: undefined,
          license: undefined,
          compatibility: undefined,
          metadata: undefined,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockSkillService.updateSkill.mockResolvedValue(updatedSkill);
        mockSkillVersionService.addSkillVersion.mockResolvedValue(
          mockSkillVersion,
        );
        mockSkillFileRepository.addMany.mockResolvedValue([]);

        await usecase.execute(commandWithFiles);

        expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              fileCount: 1,
            }),
          }),
        );
      });
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
        spaceId,
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
        spaceId,
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
        spaceId,
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
        spaceId,
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
        spaceId,
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
        spaceId,
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
        spaceId,
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
        spaceId,
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
        spaceId,
      };

      await expect(usecase.execute(command)).rejects.toThrow(SkillParseError);
    });
  });

  describe('when spaceId is provided', () => {
    it('uses provided spaceId for skill creation', async () => {
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
        spaceId,
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

  describe('member validation', () => {
    it('validates user exists', async () => {
      mockAccountsPort.getUserById.mockResolvedValue(null);

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
        spaceId,
      };

      await expect(usecase.execute(command)).rejects.toThrow();
    });

    it('validates user is member of organization', async () => {
      const userWithoutMembership: User = {
        ...mockUser,
        memberships: [],
      };
      mockAccountsPort.getUserById.mockResolvedValue(userWithoutMembership);

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
        spaceId,
      };

      await expect(usecase.execute(command)).rejects.toThrow();
    });

    it('validates space exists', async () => {
      mockSpacesPort.getSpaceById.mockResolvedValue(null);

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
        spaceId,
      };

      await expect(usecase.execute(command)).rejects.toThrow(
        `Space with id ${spaceId} not found`,
      );
    });

    it('validates space belongs to organization', async () => {
      const differentOrgId = createOrganizationId('different-org');
      const spaceInDifferentOrg: Space = {
        ...mockSpace,
        organizationId: differentOrgId,
      };
      mockSpacesPort.getSpaceById.mockResolvedValue(spaceInDifferentOrg);

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
        spaceId,
      };

      await expect(usecase.execute(command)).rejects.toThrow(
        `Space ${spaceId} does not belong to organization ${organizationId}`,
      );
    });
  });
});
