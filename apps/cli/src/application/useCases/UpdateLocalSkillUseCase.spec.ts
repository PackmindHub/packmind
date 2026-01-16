import { UpdateLocalSkillUseCase } from './UpdateLocalSkillUseCase';
import { AgentType } from '../../domain/constants/AgentPaths';

describe('UpdateLocalSkillUseCase', () => {
  let useCase: UpdateLocalSkillUseCase;
  let mockPathExists: jest.Mock;
  let mockReadDirectory: jest.Mock;
  let mockWriteFile: jest.Mock;
  let mockDeleteFile: jest.Mock;
  let mockReadFile: jest.Mock;
  let mockListFiles: jest.Mock;
  let mockMkdir: jest.Mock;

  beforeEach(() => {
    mockPathExists = jest.fn();
    mockReadDirectory = jest.fn();
    mockWriteFile = jest.fn();
    mockDeleteFile = jest.fn();
    mockReadFile = jest.fn();
    mockListFiles = jest.fn();
    mockMkdir = jest.fn();

    useCase = new UpdateLocalSkillUseCase({
      pathExists: mockPathExists,
      readDirectory: mockReadDirectory,
      writeFile: mockWriteFile,
      deleteFile: mockDeleteFile,
      readFile: mockReadFile,
      listFiles: mockListFiles,
      mkdir: mockMkdir,
    });
  });

  describe('when source path does not exist', () => {
    beforeEach(() => {
      mockPathExists.mockResolvedValue(false);
    });

    it('throws error', async () => {
      await expect(
        useCase.execute({
          baseDirectory: '/project',
          skillName: 'test-skill',
          sourcePath: '/source/test-skill',
        }),
      ).rejects.toThrow('Source path does not exist: /source/test-skill');
    });
  });

  describe('when source path does not contain SKILL.md', () => {
    beforeEach(() => {
      mockPathExists.mockImplementation((p: string) =>
        Promise.resolve(!p.includes('SKILL.md')),
      );
    });

    it('throws error', async () => {
      await expect(
        useCase.execute({
          baseDirectory: '/project',
          skillName: 'test-skill',
          sourcePath: '/source/test-skill',
        }),
      ).rejects.toThrow(
        'Source path must contain SKILL.md: /source/test-skill',
      );
    });
  });

  describe('when skill exists in target agent directories', () => {
    beforeEach(() => {
      mockPathExists.mockResolvedValue(true);
      mockReadDirectory.mockResolvedValue([
        { relativePath: 'SKILL.md', content: '# New Skill', isBase64: false },
        { relativePath: 'helper.ts', content: 'export {}', isBase64: false },
      ]);
      mockListFiles.mockResolvedValue(['SKILL.md', 'old-file.ts']);
      mockReadFile.mockResolvedValue('# Old content');
      mockWriteFile.mockResolvedValue(undefined);
      mockDeleteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);
    });

    it('updates files in all agent directories', async () => {
      const result = await useCase.execute({
        baseDirectory: '/project',
        skillName: 'test-skill',
        sourcePath: '/source/test-skill',
      });

      expect(result.updatedPaths).toContain(
        '/project/.claude/skills/test-skill',
      );
      expect(result.updatedPaths).toContain(
        '/project/.github/skills/test-skill',
      );
    });

    it('deletes files not in source', async () => {
      await useCase.execute({
        baseDirectory: '/project',
        skillName: 'test-skill',
        sourcePath: '/source/test-skill',
      });

      expect(mockDeleteFile).toHaveBeenCalledWith(
        '/project/.claude/skills/test-skill/old-file.ts',
      );
      expect(mockDeleteFile).toHaveBeenCalledWith(
        '/project/.github/skills/test-skill/old-file.ts',
      );
    });

    it('creates new files from source', async () => {
      await useCase.execute({
        baseDirectory: '/project',
        skillName: 'test-skill',
        sourcePath: '/source/test-skill',
      });

      expect(mockWriteFile).toHaveBeenCalledWith(
        '/project/.claude/skills/test-skill/helper.ts',
        'export {}',
      );
    });

    it('updates existing files with changed content', async () => {
      await useCase.execute({
        baseDirectory: '/project',
        skillName: 'test-skill',
        sourcePath: '/source/test-skill',
      });

      expect(mockWriteFile).toHaveBeenCalledWith(
        '/project/.claude/skills/test-skill/SKILL.md',
        '# New Skill',
      );
    });

    it('returns correct file counts', async () => {
      const result = await useCase.execute({
        baseDirectory: '/project',
        skillName: 'test-skill',
        sourcePath: '/source/test-skill',
      });

      expect(result.filesDeleted).toBe(2); // old-file.ts deleted in 2 agents
      expect(result.filesCreated).toBe(2); // helper.ts created in 2 agents
      expect(result.filesUpdated).toBe(2); // SKILL.md updated in 2 agents
    });
  });

  describe('when file content is unchanged', () => {
    beforeEach(() => {
      mockPathExists.mockResolvedValue(true);
      mockReadDirectory.mockResolvedValue([
        {
          relativePath: 'SKILL.md',
          content: '# Same content',
          isBase64: false,
        },
      ]);
      mockListFiles.mockResolvedValue(['SKILL.md']);
      mockReadFile.mockResolvedValue('# Same content');
      mockMkdir.mockResolvedValue(undefined);
    });

    it('skips unchanged files', async () => {
      const result = await useCase.execute({
        baseDirectory: '/project',
        skillName: 'test-skill',
        sourcePath: '/source/test-skill',
      });

      expect(mockWriteFile).not.toHaveBeenCalled();
      expect(result.filesUpdated).toBe(0);
    });
  });

  describe('when specific agent is specified', () => {
    beforeEach(() => {
      mockPathExists.mockResolvedValue(true);
      mockReadDirectory.mockResolvedValue([
        { relativePath: 'SKILL.md', content: '# New', isBase64: false },
      ]);
      mockListFiles.mockResolvedValue(['SKILL.md']);
      mockReadFile.mockResolvedValue('# Old');
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);
    });

    it('updates only the specified agent', async () => {
      const result = await useCase.execute({
        baseDirectory: '/project',
        skillName: 'test-skill',
        sourcePath: '/source/test-skill',
        agents: ['claude'] as AgentType[],
      });

      expect(result.updatedPaths).toEqual([
        '/project/.claude/skills/test-skill',
      ]);
      expect(result.notFoundPaths).toEqual([]);
    });
  });

  describe('when skill does not exist in target directory', () => {
    beforeEach(() => {
      mockPathExists.mockImplementation((p: string) => {
        if (p.includes('.claude/skills') || p.includes('.github/skills')) {
          return Promise.resolve(false);
        }
        return Promise.resolve(true);
      });
      mockReadDirectory.mockResolvedValue([
        { relativePath: 'SKILL.md', content: '# Skill', isBase64: false },
      ]);
    });

    it('reports paths as not found', async () => {
      const result = await useCase.execute({
        baseDirectory: '/project',
        skillName: 'test-skill',
        sourcePath: '/source/test-skill',
      });

      expect(result.notFoundPaths).toContain(
        '/project/.claude/skills/test-skill',
      );
      expect(result.notFoundPaths).toContain(
        '/project/.github/skills/test-skill',
      );
      expect(result.updatedPaths).toEqual([]);
    });
  });

  describe('when handling binary files', () => {
    beforeEach(() => {
      mockPathExists.mockResolvedValue(true);
      mockReadDirectory.mockResolvedValue([
        { relativePath: 'SKILL.md', content: '# Skill', isBase64: false },
        {
          relativePath: 'image.png',
          content: Buffer.from('binary data').toString('base64'),
          isBase64: true,
        },
      ]);
      mockListFiles.mockResolvedValue(['SKILL.md']);
      mockReadFile.mockResolvedValue('# Old');
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);
    });

    it('writes binary files as buffers', async () => {
      await useCase.execute({
        baseDirectory: '/project',
        skillName: 'test-skill',
        sourcePath: '/source/test-skill',
        agents: ['claude'] as AgentType[],
      });

      expect(mockWriteFile).toHaveBeenCalledWith(
        '/project/.claude/skills/test-skill/image.png',
        Buffer.from('binary data'),
      );
    });
  });

  describe('when update fails', () => {
    beforeEach(() => {
      mockPathExists.mockResolvedValue(true);
      mockReadDirectory.mockResolvedValue([
        { relativePath: 'SKILL.md', content: '# Skill', isBase64: false },
      ]);
      mockListFiles.mockRejectedValue(new Error('Permission denied'));
    });

    it('captures error in result', async () => {
      const result = await useCase.execute({
        baseDirectory: '/project',
        skillName: 'test-skill',
        sourcePath: '/source/test-skill',
      });

      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('Permission denied');
    });
  });

  describe('when skill name is invalid', () => {
    beforeEach(() => {
      mockPathExists.mockResolvedValue(true);
    });

    describe('when skill name is empty', () => {
      it('throws error', async () => {
        await expect(
          useCase.execute({
            baseDirectory: '/project',
            skillName: '',
            sourcePath: '/source/skill',
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
            sourcePath: '/source/skill',
          }),
        ).rejects.toThrow('Skill name cannot contain path separators');
      });
    });

    describe('when skill name is ".."', () => {
      it('throws error', async () => {
        await expect(
          useCase.execute({
            baseDirectory: '/project',
            skillName: '..',
            sourcePath: '/source/skill',
          }),
        ).rejects.toThrow('Skill name cannot be "." or ".."');
      });
    });
  });

  describe('when creating files in nested directories', () => {
    beforeEach(() => {
      mockPathExists.mockResolvedValue(true);
      mockReadDirectory.mockResolvedValue([
        { relativePath: 'SKILL.md', content: '# Skill', isBase64: false },
        {
          relativePath: 'nested/dir/file.ts',
          content: 'export {}',
          isBase64: false,
        },
      ]);
      mockListFiles.mockResolvedValue(['SKILL.md']);
      mockReadFile.mockResolvedValue('# Old');
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);
    });

    it('creates parent directories', async () => {
      await useCase.execute({
        baseDirectory: '/project',
        skillName: 'test-skill',
        sourcePath: '/source/test-skill',
        agents: ['claude'] as AgentType[],
      });

      expect(mockMkdir).toHaveBeenCalledWith(
        '/project/.claude/skills/test-skill/nested/dir',
      );
    });
  });
});
