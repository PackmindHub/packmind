import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSkillFileId,
  createSkillId,
  createSkillVersionId,
  createSpaceId,
  createUserId,
  GetSkillWithFilesCommand,
  IAccountsPort,
  Organization,
  Skill,
  SkillFile,
  SkillVersion,
  User,
} from '@packmind/types';
import { ISkillFileRepository } from '../../../domain/repositories/ISkillFileRepository';
import { ISkillRepository } from '../../../domain/repositories/ISkillRepository';
import { ISkillVersionRepository } from '../../../domain/repositories/ISkillVersionRepository';
import { GetSkillWithFilesUsecase } from './getSkillWithFiles.usecase';

describe('GetSkillWithFilesUsecase', () => {
  let usecase: GetSkillWithFilesUsecase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockSkillRepository: jest.Mocked<ISkillRepository>;
  let mockSkillVersionRepository: jest.Mocked<ISkillVersionRepository>;
  let mockSkillFileRepository: jest.Mocked<ISkillFileRepository>;

  const userId = createUserId('user-123');
  const organizationId = createOrganizationId('org-123');
  const spaceId = createSpaceId('space-123');
  const skillId = createSkillId('skill-123');
  const skillVersionId = createSkillVersionId('version-123');

  const mockUser: User = {
    id: userId,
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    memberships: [{ organizationId, role: 'member', userId }],
    active: true,
  };

  const mockOrganization: Organization = {
    id: organizationId,
    name: 'Test Org',
    slug: 'test-org',
  };

  const mockSkill: Skill = {
    id: skillId,
    name: 'test-skill',
    slug: 'test-skill',
    description: 'A test skill',
    prompt: '# Test Skill\n\nThis is the skill body.',
    version: 1,
    userId,
    spaceId,
  };

  const mockSkillVersion: SkillVersion = {
    id: skillVersionId,
    skillId,
    userId,
    name: 'test-skill',
    slug: 'test-skill',
    description: 'A test skill',
    prompt: '# Test Skill\n\nThis is the skill body.',
    version: 1,
  };

  const mockSkillFiles: SkillFile[] = [
    {
      id: createSkillFileId('file-1'),
      skillVersionId,
      path: 'SKILL.md',
      content: '---\nname: test-skill\n---\n\n# Test Skill',
      permissions: 'rw-r--r--',
    },
    {
      id: createSkillFileId('file-2'),
      skillVersionId,
      path: 'helpers/utils.md',
      content: '# Helper utilities',
      permissions: 'rw-r--r--',
    },
  ];

  beforeEach(() => {
    mockAccountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    mockSkillRepository = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findByOrganizationId: jest.fn(),
      findBySpaceId: jest.fn(),
      findByUserId: jest.fn(),
      findByOrganizationAndUser: jest.fn(),
      add: jest.fn(),
      deleteById: jest.fn(),
    } as jest.Mocked<ISkillRepository>;

    mockSkillVersionRepository = {
      findById: jest.fn(),
      findBySkillId: jest.fn(),
      findLatestBySkillId: jest.fn(),
      findBySkillIdAndVersion: jest.fn(),
      updateMetadata: jest.fn(),
      add: jest.fn(),
      deleteById: jest.fn(),
    } as jest.Mocked<ISkillVersionRepository>;

    mockSkillFileRepository = {
      findById: jest.fn(),
      findBySkillVersionId: jest.fn(),
      addMany: jest.fn(),
      add: jest.fn(),
      deleteById: jest.fn(),
    } as jest.Mocked<ISkillFileRepository>;

    usecase = new GetSkillWithFilesUsecase(
      mockAccountsPort,
      mockSkillRepository,
      mockSkillVersionRepository,
      mockSkillFileRepository,
      stubLogger(),
    );

    // Default mocks for member validation
    mockAccountsPort.getUserById.mockResolvedValue(mockUser);
    mockAccountsPort.getOrganizationById.mockResolvedValue(mockOrganization);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('with existing skill', () => {
    const slug = 'test-skill';
    const command: GetSkillWithFilesCommand = {
      slug,
      spaceId,
      userId,
      organizationId,
    };

    beforeEach(() => {
      mockSkillRepository.findBySlug.mockResolvedValue(mockSkill);
      mockSkillVersionRepository.findLatestBySkillId.mockResolvedValue(
        mockSkillVersion,
      );
      mockSkillFileRepository.findBySkillVersionId.mockResolvedValue(
        mockSkillFiles,
      );
    });

    it('returns skill with files and latest version', async () => {
      const result = await usecase.execute(command);

      expect(result.skillWithFiles).toEqual({
        skill: mockSkill,
        files: mockSkillFiles,
        latestVersion: mockSkillVersion,
      });
    });

    it('fetches skill by slug', async () => {
      await usecase.execute(command);

      expect(mockSkillRepository.findBySlug).toHaveBeenCalledWith(
        slug,
        organizationId,
      );
    });

    it('fetches latest version by skill ID', async () => {
      await usecase.execute(command);

      expect(
        mockSkillVersionRepository.findLatestBySkillId,
      ).toHaveBeenCalledWith(skillId);
    });

    it('fetches files by version ID', async () => {
      await usecase.execute(command);

      expect(mockSkillFileRepository.findBySkillVersionId).toHaveBeenCalledWith(
        skillVersionId,
      );
    });

    it('validates member access', async () => {
      await usecase.execute(command);

      expect(mockAccountsPort.getUserById).toHaveBeenCalledWith(userId);
      expect(mockAccountsPort.getOrganizationById).toHaveBeenCalledWith(
        organizationId,
      );
    });
  });

  describe('when skill does not exist', () => {
    const slug = 'non-existent-skill';
    const command: GetSkillWithFilesCommand = {
      slug,
      spaceId,
      userId,
      organizationId,
    };

    beforeEach(() => {
      mockSkillRepository.findBySlug.mockResolvedValue(null);
    });

    it('returns null skillWithFiles', async () => {
      const result = await usecase.execute(command);

      expect(result.skillWithFiles).toBeNull();
    });

    it('does not fetch version or files', async () => {
      await usecase.execute(command);

      expect(
        mockSkillVersionRepository.findLatestBySkillId,
      ).not.toHaveBeenCalled();
      expect(
        mockSkillFileRepository.findBySkillVersionId,
      ).not.toHaveBeenCalled();
    });
  });

  describe('when skill exists but no version found', () => {
    const slug = 'test-skill';
    const command: GetSkillWithFilesCommand = {
      slug,
      spaceId,
      userId,
      organizationId,
    };

    beforeEach(() => {
      mockSkillRepository.findBySlug.mockResolvedValue(mockSkill);
      mockSkillVersionRepository.findLatestBySkillId.mockResolvedValue(null);
    });

    it('returns null skillWithFiles', async () => {
      const result = await usecase.execute(command);

      expect(result.skillWithFiles).toBeNull();
    });

    it('does not fetch files', async () => {
      await usecase.execute(command);

      expect(
        mockSkillFileRepository.findBySkillVersionId,
      ).not.toHaveBeenCalled();
    });
  });

  describe('when skill exists with version but no files', () => {
    const slug = 'test-skill';
    const command: GetSkillWithFilesCommand = {
      slug,
      spaceId,
      userId,
      organizationId,
    };

    beforeEach(() => {
      mockSkillRepository.findBySlug.mockResolvedValue(mockSkill);
      mockSkillVersionRepository.findLatestBySkillId.mockResolvedValue(
        mockSkillVersion,
      );
      mockSkillFileRepository.findBySkillVersionId.mockResolvedValue([]);
    });

    it('returns skill with empty files array', async () => {
      const result = await usecase.execute(command);

      expect(result.skillWithFiles).toEqual({
        skill: mockSkill,
        files: [],
        latestVersion: mockSkillVersion,
      });
    });
  });

  describe('when skill belongs to different space', () => {
    const slug = 'test-skill';
    const differentSpaceId = createSpaceId('different-space');
    const skillInDifferentSpace: Skill = {
      ...mockSkill,
      spaceId: differentSpaceId,
    };

    const command: GetSkillWithFilesCommand = {
      slug,
      spaceId,
      userId,
      organizationId,
    };

    beforeEach(() => {
      mockSkillRepository.findBySlug.mockResolvedValue(skillInDifferentSpace);
    });

    it('returns null skillWithFiles', async () => {
      const result = await usecase.execute(command);

      expect(result.skillWithFiles).toBeNull();
    });

    it('does not fetch version or files', async () => {
      await usecase.execute(command);

      expect(
        mockSkillVersionRepository.findLatestBySkillId,
      ).not.toHaveBeenCalled();
      expect(
        mockSkillFileRepository.findBySkillVersionId,
      ).not.toHaveBeenCalled();
    });
  });

  describe('member access validation', () => {
    const slug = 'test-skill';
    const command: GetSkillWithFilesCommand = {
      slug,
      spaceId,
      userId,
      organizationId,
    };

    it('throws error when user not found', async () => {
      mockAccountsPort.getUserById.mockResolvedValue(null);

      await expect(usecase.execute(command)).rejects.toThrow(
        `User not found: ${userId}`,
      );
    });

    it('throws error when organization not found', async () => {
      mockAccountsPort.getOrganizationById.mockResolvedValue(null);

      await expect(usecase.execute(command)).rejects.toThrow(
        `Organization ${organizationId} not found`,
      );
    });

    it('throws error when user is not member of organization', async () => {
      const otherOrganizationId = createOrganizationId('other-org');
      const userInOtherOrg: User = {
        ...mockUser,
        memberships: [
          { organizationId: otherOrganizationId, role: 'member', userId },
        ],
      };
      mockAccountsPort.getUserById.mockResolvedValue(userInOtherOrg);

      await expect(usecase.execute(command)).rejects.toThrow(
        `User ${userId} is not a member of organization ${organizationId}`,
      );
    });
  });
});
