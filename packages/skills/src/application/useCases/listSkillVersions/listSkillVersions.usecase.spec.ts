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
import { ISkillRepository } from '../../../domain/repositories/ISkillRepository';
import { ISkillVersionRepository } from '../../../domain/repositories/ISkillVersionRepository';
import { ListSkillVersionsUsecase } from './listSkillVersions.usecase';

describe('ListSkillVersionsUsecase', () => {
  let usecase: ListSkillVersionsUsecase;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockSkillRepository: jest.Mocked<ISkillRepository>;
  let mockSkillVersionRepository: jest.Mocked<ISkillVersionRepository>;

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

    usecase = new ListSkillVersionsUsecase(
      mockAccountsPort,
      mockSkillRepository,
      mockSkillVersionRepository,
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
      mockSkillRepository.findById.mockResolvedValue(mockSkill);
      mockSkillVersionRepository.findBySkillId.mockResolvedValue(mockVersions);
    });

    it('returns versions ordered by version number descending', async () => {
      const result = await usecase.execute(command);

      expect(result.versions).toEqual(mockVersions);
    });

    it('fetches skill by ID to validate ownership', async () => {
      await usecase.execute(command);

      expect(mockSkillRepository.findById).toHaveBeenCalledWith(skillId);
    });

    it('fetches versions by skill ID', async () => {
      await usecase.execute(command);

      expect(mockSkillVersionRepository.findBySkillId).toHaveBeenCalledWith(
        skillId,
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
    const command: ListSkillVersionsCommand = {
      skillId,
      spaceId,
      userId,
      organizationId,
    };

    beforeEach(() => {
      mockSkillRepository.findById.mockResolvedValue(null);
    });

    it('returns empty versions array', async () => {
      const result = await usecase.execute(command);

      expect(result.versions).toEqual([]);
    });

    it('does not fetch versions', async () => {
      await usecase.execute(command);

      expect(mockSkillVersionRepository.findBySkillId).not.toHaveBeenCalled();
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
      mockSkillRepository.findById.mockResolvedValue(skillInDifferentSpace);
    });

    it('returns empty versions array', async () => {
      const result = await usecase.execute(command);

      expect(result.versions).toEqual([]);
    });

    it('does not fetch versions', async () => {
      await usecase.execute(command);

      expect(mockSkillVersionRepository.findBySkillId).not.toHaveBeenCalled();
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
      mockSkillRepository.findById.mockResolvedValue(mockSkill);
      mockSkillVersionRepository.findBySkillId.mockResolvedValue([]);
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
