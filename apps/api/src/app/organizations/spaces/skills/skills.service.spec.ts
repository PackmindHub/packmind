import { SkillsHexa } from '@packmind/skills';
import {
  createOrganizationId,
  createSkillFileId,
  createSkillId,
  createSkillVersionId,
  createSpaceId,
  createUserId,
  Skill,
  SkillFile,
  SkillVersion,
} from '@packmind/types';
import { SkillsService } from './skills.service';

describe('SkillsService', () => {
  let service: SkillsService;
  let mockAdapter: {
    getSkillById: jest.Mock;
    getLatestSkillVersionUseCase: jest.Mock;
    getSkillFiles: jest.Mock;
  };
  let skillsHexa: jest.Mocked<SkillsHexa>;

  const organizationId = createOrganizationId('org-123');
  const spaceId = createSpaceId('space-456');
  const userId = createUserId('user-1');
  const skillId = createSkillId('skill-789');

  beforeEach(() => {
    mockAdapter = {
      getSkillById: jest.fn(),
      getLatestSkillVersionUseCase: jest.fn(),
      getSkillFiles: jest.fn(),
    };

    skillsHexa = {
      getAdapter: jest.fn().mockReturnValue(mockAdapter),
    } as unknown as jest.Mocked<SkillsHexa>;

    service = new SkillsService(skillsHexa);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSkillWithFilesById', () => {
    const mockSkill: Skill = {
      id: skillId,
      slug: 'test-skill',
      name: 'Test Skill',
      description: 'A test skill',
      prompt: 'Test prompt',
      userId,
      version: 1,
      spaceId,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    const skillVersionId = createSkillVersionId('version-1');

    const mockLatestVersion: SkillVersion = {
      id: skillVersionId,
      skillId,
      version: 1,
      userId,
      name: 'Test Skill',
      slug: 'test-skill',
      description: 'A test skill',
      prompt: 'Test prompt',
    };

    const mockFiles: SkillFile[] = [
      {
        id: createSkillFileId('file-1'),
        skillVersionId,
        path: 'SKILL.md',
        content: '---\nname: test-skill\n---\nTest content',
        permissions: 'read',
        isBase64: false,
      },
    ];

    describe('when all adapter calls succeed', () => {
      beforeEach(() => {
        mockAdapter.getSkillById.mockResolvedValue({ skill: mockSkill });
        mockAdapter.getLatestSkillVersionUseCase.mockResolvedValue({
          skillVersion: mockLatestVersion,
        });
        mockAdapter.getSkillFiles.mockResolvedValue(mockFiles);
      });

      it('returns skill with files and latest version', async () => {
        const result = await service.getSkillWithFilesById(
          skillId,
          spaceId,
          organizationId,
          userId,
        );

        expect(result).toEqual({
          skill: mockSkill,
          files: mockFiles,
          latestVersion: mockLatestVersion,
        });
      });

      it('calls getSkillById with correct arguments', async () => {
        await service.getSkillWithFilesById(
          skillId,
          spaceId,
          organizationId,
          userId,
        );

        expect(mockAdapter.getSkillById).toHaveBeenCalledWith({
          skillId,
          spaceId,
          organizationId,
          userId,
        });
      });

      it('calls getSkillFiles with the latest version ID', async () => {
        await service.getSkillWithFilesById(
          skillId,
          spaceId,
          organizationId,
          userId,
        );

        expect(mockAdapter.getSkillFiles).toHaveBeenCalledWith(skillVersionId);
      });
    });

    describe('when skill is not found', () => {
      it('returns null', async () => {
        mockAdapter.getSkillById.mockResolvedValue({ skill: null });

        const result = await service.getSkillWithFilesById(
          skillId,
          spaceId,
          organizationId,
          userId,
        );

        expect(result).toBeNull();
      });

      it('does not call getLatestSkillVersionUseCase', async () => {
        mockAdapter.getSkillById.mockResolvedValue({ skill: null });

        await service.getSkillWithFilesById(
          skillId,
          spaceId,
          organizationId,
          userId,
        );

        expect(mockAdapter.getLatestSkillVersionUseCase).not.toHaveBeenCalled();
      });

      it('does not call getSkillFiles', async () => {
        mockAdapter.getSkillById.mockResolvedValue({ skill: null });

        await service.getSkillWithFilesById(
          skillId,
          spaceId,
          organizationId,
          userId,
        );

        expect(mockAdapter.getSkillFiles).not.toHaveBeenCalled();
      });
    });

    describe('when latest version is not found', () => {
      it('returns null', async () => {
        mockAdapter.getSkillById.mockResolvedValue({ skill: mockSkill });
        mockAdapter.getLatestSkillVersionUseCase.mockResolvedValue({
          skillVersion: null,
        });

        const result = await service.getSkillWithFilesById(
          skillId,
          spaceId,
          organizationId,
          userId,
        );

        expect(result).toBeNull();
      });

      it('does not call getSkillFiles', async () => {
        mockAdapter.getSkillById.mockResolvedValue({ skill: mockSkill });
        mockAdapter.getLatestSkillVersionUseCase.mockResolvedValue({
          skillVersion: null,
        });

        await service.getSkillWithFilesById(
          skillId,
          spaceId,
          organizationId,
          userId,
        );

        expect(mockAdapter.getSkillFiles).not.toHaveBeenCalled();
      });
    });
  });
});
