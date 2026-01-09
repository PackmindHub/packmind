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
import { SkillFileService } from '../../services/SkillFileService';
import { SkillService } from '../../services/SkillService';
import { SkillVersionService } from '../../services/SkillVersionService';
import { GetSkillWithFilesUsecase } from './getSkillWithFiles.usecase';

describe('GetSkillWithFilesUsecase', () => {
  let usecase: GetSkillWithFilesUsecase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockSkillService: jest.Mocked<SkillService>;
  let mockSkillVersionService: jest.Mocked<SkillVersionService>;
  let mockSkillFileService: jest.Mocked<SkillFileService>;

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
    trial: false,
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

    mockSkillService = {
      getSkillById: jest.fn(),
      findSkillBySlug: jest.fn(),
      listSkillsBySpace: jest.fn(),
      addSkill: jest.fn(),
      updateSkill: jest.fn(),
      deleteSkill: jest.fn(),
    } as unknown as jest.Mocked<SkillService>;

    mockSkillVersionService = {
      listSkillVersions: jest.fn(),
      getLatestSkillVersion: jest.fn(),
      getSkillVersionById: jest.fn(),
      getSkillVersion: jest.fn(),
      addSkillVersion: jest.fn(),
    } as unknown as jest.Mocked<SkillVersionService>;

    mockSkillFileService = {
      findByVersionId: jest.fn(),
    } as unknown as jest.Mocked<SkillFileService>;

    usecase = new GetSkillWithFilesUsecase(
      mockAccountsPort,
      mockSkillService,
      mockSkillVersionService,
      mockSkillFileService,
      stubLogger(),
    );

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
      mockSkillService.findSkillBySlug.mockResolvedValue(mockSkill);
      mockSkillVersionService.getLatestSkillVersion.mockResolvedValue(
        mockSkillVersion,
      );
      mockSkillFileService.findByVersionId.mockResolvedValue(mockSkillFiles);
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

      expect(mockSkillService.findSkillBySlug).toHaveBeenCalledWith(
        slug,
        organizationId,
      );
    });

    it('fetches latest version by skill ID', async () => {
      await usecase.execute(command);

      expect(
        mockSkillVersionService.getLatestSkillVersion,
      ).toHaveBeenCalledWith(skillId);
    });

    it('fetches files by version ID', async () => {
      await usecase.execute(command);

      expect(mockSkillFileService.findByVersionId).toHaveBeenCalledWith(
        skillVersionId,
      );
    });

    it('fetches user by ID for member validation', async () => {
      await usecase.execute(command);

      expect(mockAccountsPort.getUserById).toHaveBeenCalledWith(userId);
    });

    it('fetches organization by ID for member validation', async () => {
      await usecase.execute(command);

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
      mockSkillService.findSkillBySlug.mockResolvedValue(null);
    });

    it('returns null skillWithFiles', async () => {
      const result = await usecase.execute(command);

      expect(result.skillWithFiles).toBeNull();
    });

    it('does not fetch version', async () => {
      await usecase.execute(command);

      expect(
        mockSkillVersionService.getLatestSkillVersion,
      ).not.toHaveBeenCalled();
    });

    it('does not fetch files', async () => {
      await usecase.execute(command);

      expect(mockSkillFileService.findByVersionId).not.toHaveBeenCalled();
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
      mockSkillService.findSkillBySlug.mockResolvedValue(mockSkill);
      mockSkillVersionService.getLatestSkillVersion.mockResolvedValue(null);
    });

    it('returns null skillWithFiles', async () => {
      const result = await usecase.execute(command);

      expect(result.skillWithFiles).toBeNull();
    });

    it('does not fetch files', async () => {
      await usecase.execute(command);

      expect(mockSkillFileService.findByVersionId).not.toHaveBeenCalled();
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
      mockSkillService.findSkillBySlug.mockResolvedValue(mockSkill);
      mockSkillVersionService.getLatestSkillVersion.mockResolvedValue(
        mockSkillVersion,
      );
      mockSkillFileService.findByVersionId.mockResolvedValue([]);
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
      mockSkillService.findSkillBySlug.mockResolvedValue(skillInDifferentSpace);
    });

    it('returns null skillWithFiles', async () => {
      const result = await usecase.execute(command);

      expect(result.skillWithFiles).toBeNull();
    });

    it('does not fetch version', async () => {
      await usecase.execute(command);

      expect(
        mockSkillVersionService.getLatestSkillVersion,
      ).not.toHaveBeenCalled();
    });

    it('does not fetch files', async () => {
      await usecase.execute(command);

      expect(mockSkillFileService.findByVersionId).not.toHaveBeenCalled();
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

    describe('when user not found', () => {
      beforeEach(() => {
        mockAccountsPort.getUserById.mockResolvedValue(null);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `User not found: ${userId}`,
        );
      });
    });

    describe('when organization not found', () => {
      beforeEach(() => {
        mockAccountsPort.getOrganizationById.mockResolvedValue(null);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `Organization ${organizationId} not found`,
        );
      });
    });

    describe('when user is not member of organization', () => {
      beforeEach(() => {
        const otherOrganizationId = createOrganizationId('other-org');
        const userInOtherOrg: User = {
          ...mockUser,
          memberships: [
            { organizationId: otherOrganizationId, role: 'member', userId },
          ],
        };
        mockAccountsPort.getUserById.mockResolvedValue(userInOtherOrg);
      });

      it('throws error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `User ${userId} is not a member of organization ${organizationId}`,
        );
      });
    });
  });
});
