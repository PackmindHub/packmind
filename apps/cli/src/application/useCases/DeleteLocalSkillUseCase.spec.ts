import { DeleteLocalSkillUseCase } from './DeleteLocalSkillUseCase';
import { AgentType } from '../../domain/constants/AgentPaths';

describe('DeleteLocalSkillUseCase', () => {
  let useCase: DeleteLocalSkillUseCase;
  let mockPathExists: jest.Mock;
  let mockDeleteDirectory: jest.Mock;

  beforeEach(() => {
    mockPathExists = jest.fn();
    mockDeleteDirectory = jest.fn();

    useCase = new DeleteLocalSkillUseCase({
      pathExists: mockPathExists,
      deleteDirectory: mockDeleteDirectory,
    });
  });

  describe('when skill exists in all agent directories', () => {
    beforeEach(() => {
      mockPathExists.mockResolvedValue(true);
      mockDeleteDirectory.mockResolvedValue(undefined);
    });

    it('deletes skill from all agents', async () => {
      const result = await useCase.execute({
        baseDirectory: '/project',
        skillName: 'signal-capture',
      });

      expect(mockDeleteDirectory).toHaveBeenCalledWith(
        '/project/.claude/skills/signal-capture',
      );
      expect(mockDeleteDirectory).toHaveBeenCalledWith(
        '/project/.github/skills/signal-capture',
      );
      expect(result.deletedPaths).toEqual([
        '/project/.claude/skills/signal-capture',
        '/project/.github/skills/signal-capture',
      ]);
    });

    it('returns empty notFoundPaths', async () => {
      const result = await useCase.execute({
        baseDirectory: '/project',
        skillName: 'signal-capture',
      });

      expect(result.notFoundPaths).toEqual([]);
    });

    it('returns empty errors', async () => {
      const result = await useCase.execute({
        baseDirectory: '/project',
        skillName: 'signal-capture',
      });

      expect(result.errors).toEqual([]);
    });
  });

  describe('when skill exists only in claude agent directory', () => {
    beforeEach(() => {
      mockPathExists.mockImplementation((path: string) =>
        Promise.resolve(path.includes('.claude')),
      );
      mockDeleteDirectory.mockResolvedValue(undefined);
    });

    it('deletes skill only from claude agent', async () => {
      const result = await useCase.execute({
        baseDirectory: '/project',
        skillName: 'test-skill',
      });

      expect(mockDeleteDirectory).toHaveBeenCalledTimes(1);
      expect(mockDeleteDirectory).toHaveBeenCalledWith(
        '/project/.claude/skills/test-skill',
      );
      expect(result.deletedPaths).toEqual([
        '/project/.claude/skills/test-skill',
      ]);
    });

    it('reports github path as not found', async () => {
      const result = await useCase.execute({
        baseDirectory: '/project',
        skillName: 'test-skill',
      });

      expect(result.notFoundPaths).toEqual([
        '/project/.github/skills/test-skill',
      ]);
    });
  });

  describe('when specific agent is specified', () => {
    beforeEach(() => {
      mockPathExists.mockResolvedValue(true);
      mockDeleteDirectory.mockResolvedValue(undefined);
    });

    it('deletes skill only from specified agent', async () => {
      const result = await useCase.execute({
        baseDirectory: '/project',
        skillName: 'test-skill',
        agents: ['claude'] as AgentType[],
      });

      expect(mockDeleteDirectory).toHaveBeenCalledTimes(1);
      expect(mockDeleteDirectory).toHaveBeenCalledWith(
        '/project/.claude/skills/test-skill',
      );
      expect(result.deletedPaths).toEqual([
        '/project/.claude/skills/test-skill',
      ]);
    });

    it('does not check other agent directories', async () => {
      await useCase.execute({
        baseDirectory: '/project',
        skillName: 'test-skill',
        agents: ['github'] as AgentType[],
      });

      expect(mockPathExists).toHaveBeenCalledTimes(1);
      expect(mockPathExists).toHaveBeenCalledWith(
        '/project/.github/skills/test-skill',
      );
    });
  });

  describe('when skill does not exist in any agent directory', () => {
    beforeEach(() => {
      mockPathExists.mockResolvedValue(false);
    });

    it('reports all paths as not found', async () => {
      const result = await useCase.execute({
        baseDirectory: '/project',
        skillName: 'non-existent',
      });

      expect(result.deletedPaths).toEqual([]);
      expect(result.notFoundPaths).toEqual([
        '/project/.claude/skills/non-existent',
        '/project/.github/skills/non-existent',
      ]);
    });

    it('does not call deleteDirectory', async () => {
      await useCase.execute({
        baseDirectory: '/project',
        skillName: 'non-existent',
      });

      expect(mockDeleteDirectory).not.toHaveBeenCalled();
    });
  });

  describe('when deletion fails', () => {
    beforeEach(() => {
      mockPathExists.mockResolvedValue(true);
      mockDeleteDirectory.mockRejectedValue(new Error('Permission denied'));
    });

    it('captures error in result', async () => {
      const result = await useCase.execute({
        baseDirectory: '/project',
        skillName: 'test-skill',
      });

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('Permission denied');
    });

    it('returns empty deletedPaths', async () => {
      const result = await useCase.execute({
        baseDirectory: '/project',
        skillName: 'test-skill',
      });

      expect(result.deletedPaths).toEqual([]);
    });
  });

  describe('when skill name is invalid', () => {
    describe('when skill name is empty', () => {
      it('throws error', async () => {
        await expect(
          useCase.execute({
            baseDirectory: '/project',
            skillName: '',
          }),
        ).rejects.toThrow('Skill name cannot be empty');
      });
    });

    describe('when skill name is whitespace only', () => {
      it('throws error', async () => {
        await expect(
          useCase.execute({
            baseDirectory: '/project',
            skillName: '   ',
          }),
        ).rejects.toThrow('Skill name cannot be empty');
      });
    });

    describe('when skill name contains forward slash', () => {
      it('throws error', async () => {
        await expect(
          useCase.execute({
            baseDirectory: '/project',
            skillName: 'skill/name',
          }),
        ).rejects.toThrow('Skill name cannot contain path separators');
      });
    });

    describe('when skill name contains backslash', () => {
      it('throws error', async () => {
        await expect(
          useCase.execute({
            baseDirectory: '/project',
            skillName: 'skill\\name',
          }),
        ).rejects.toThrow('Skill name cannot contain path separators');
      });
    });

    describe('when skill name is "."', () => {
      it('throws error', async () => {
        await expect(
          useCase.execute({
            baseDirectory: '/project',
            skillName: '.',
          }),
        ).rejects.toThrow('Skill name cannot be "." or ".."');
      });
    });

    describe('when skill name is ".."', () => {
      it('throws error', async () => {
        await expect(
          useCase.execute({
            baseDirectory: '/project',
            skillName: '..',
          }),
        ).rejects.toThrow('Skill name cannot be "." or ".."');
      });
    });
  });
});
