import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createSkillId,
  createSkillVersionId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ListSkillVersionsCommand,
  Organization,
  Skill,
  SkillVersion,
  User,
} from '@packmind/types';
import { SkillService } from '../../services/SkillService';
import { SkillVersionService } from '../../services/SkillVersionService';
import { ListSkillVersionsUsecase } from './listSkillVersions.usecase';

describe('ListSkillVersionsUsecase', () => {
  let usecase: ListSkillVersionsUsecase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockSkillService: jest.Mocked<SkillService>;
  let mockSkillVersionService: jest.Mocked<SkillVersionService>;

  const userId = createUserId('user-123');
  const organizationId = createOrganizationId('org-123');
  const spaceId = createSpaceId('space-123');
  const skillId = createSkillId('skill-123');

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
    version: 3,
    userId,
    spaceId,
  };

  const mockVersions: SkillVersion[] = [
    {
      id: createSkillVersionId('version-3'),
      skillId,
      userId,
      name: 'test-skill',
      slug: 'test-skill',
      description: 'Version 3 description',
      prompt: '# Test Skill v3',
      version: 3,
    },
    {
      id: createSkillVersionId('version-2'),
      skillId,
      userId,
      name: 'test-skill',
      slug: 'test-skill',
      description: 'Version 2 description',
      prompt: '# Test Skill v2',
      version: 2,
    },
    {
      id: createSkillVersionId('version-1'),
      skillId,
      userId,
      name: 'test-skill',
      slug: 'test-skill',
      description: 'Version 1 description',
      prompt: '# Test Skill v1',
      version: 1,
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

    usecase = new ListSkillVersionsUsecase(
      mockAccountsPort,
      mockSkillService,
      mockSkillVersionService,
      stubLogger(),
    );

    mockAccountsPort.getUserById.mockResolvedValue(mockUser);
    mockAccountsPort.getOrganizationById.mockResolvedValue(mockOrganization);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('with existing skill', () => {
    const command: ListSkillVersionsCommand = {
      skillId,
      spaceId,
      userId,
      organizationId,
    };

    beforeEach(() => {
      mockSkillService.getSkillById.mockResolvedValue(mockSkill);
      mockSkillVersionService.listSkillVersions.mockResolvedValue(mockVersions);
    });

    it('returns versions ordered by version number descending', async () => {
      const result = await usecase.execute(command);

      expect(result.versions).toEqual(mockVersions);
    });

    it('fetches skill by ID to validate ownership', async () => {
      await usecase.execute(command);

      expect(mockSkillService.getSkillById).toHaveBeenCalledWith(skillId);
    });

    it('fetches versions by skill ID', async () => {
      await usecase.execute(command);

      expect(mockSkillVersionService.listSkillVersions).toHaveBeenCalledWith(
        skillId,
      );
    });

    it('fetches user by ID for access validation', async () => {
      await usecase.execute(command);

      expect(mockAccountsPort.getUserById).toHaveBeenCalledWith(userId);
    });

    it('fetches organization by ID for access validation', async () => {
      await usecase.execute(command);

      expect(mockAccountsPort.getOrganizationById).toHaveBeenCalledWith(
        organizationId,
      );
    });
  });

  describe('when skill does not exist', () => {
    const command: ListSkillVersionsCommand = {
      skillId,
      spaceId,
      userId,
      organizationId,
    };

    beforeEach(() => {
      mockSkillService.getSkillById.mockResolvedValue(null);
    });

    it('returns empty versions array', async () => {
      const result = await usecase.execute(command);

      expect(result.versions).toEqual([]);
    });

    it('does not fetch versions', async () => {
      await usecase.execute(command);

      expect(mockSkillVersionService.listSkillVersions).not.toHaveBeenCalled();
    });
  });

  describe('when skill belongs to different space', () => {
    const differentSpaceId = createSpaceId('different-space');
    const skillInDifferentSpace: Skill = {
      ...mockSkill,
      spaceId: differentSpaceId,
    };

    const command: ListSkillVersionsCommand = {
      skillId,
      spaceId,
      userId,
      organizationId,
    };

    beforeEach(() => {
      mockSkillService.getSkillById.mockResolvedValue(skillInDifferentSpace);
    });

    it('returns empty versions array', async () => {
      const result = await usecase.execute(command);

      expect(result.versions).toEqual([]);
    });

    it('does not fetch versions', async () => {
      await usecase.execute(command);

      expect(mockSkillVersionService.listSkillVersions).not.toHaveBeenCalled();
    });
  });

  describe('when skill exists with no versions', () => {
    const command: ListSkillVersionsCommand = {
      skillId,
      spaceId,
      userId,
      organizationId,
    };

    beforeEach(() => {
      mockSkillService.getSkillById.mockResolvedValue(mockSkill);
      mockSkillVersionService.listSkillVersions.mockResolvedValue([]);
    });

    it('returns empty versions array', async () => {
      const result = await usecase.execute(command);

      expect(result.versions).toEqual([]);
    });
  });

  describe('member access validation', () => {
    const command: ListSkillVersionsCommand = {
      skillId,
      spaceId,
      userId,
      organizationId,
    };

    describe('when user is not found', () => {
      beforeEach(() => {
        mockAccountsPort.getUserById.mockResolvedValue(null);
      });

      it('throws user not found error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `User not found: ${userId}`,
        );
      });
    });

    describe('when organization is not found', () => {
      beforeEach(() => {
        mockAccountsPort.getOrganizationById.mockResolvedValue(null);
      });

      it('throws organization not found error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `Organization ${organizationId} not found`,
        );
      });
    });

    describe('when user is not a member of the organization', () => {
      const otherOrganizationId = createOrganizationId('other-org');

      beforeEach(() => {
        const userInOtherOrg: User = {
          ...mockUser,
          memberships: [
            { organizationId: otherOrganizationId, role: 'member', userId },
          ],
        };
        mockAccountsPort.getUserById.mockResolvedValue(userInOtherOrg);
      });

      it('throws membership error', async () => {
        await expect(usecase.execute(command)).rejects.toThrow(
          `User ${userId} is not a member of organization ${organizationId}`,
        );
      });
    });
  });
});
