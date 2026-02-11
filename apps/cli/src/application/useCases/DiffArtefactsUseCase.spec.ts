import * as fs from 'fs/promises';

import { DiffArtefactsUseCase } from './DiffArtefactsUseCase';
import { ChangeProposalType } from '@packmind/types';
import { createMockPackmindGateway } from '../../mocks/createMockGateways';

jest.mock('fs/promises');

describe('DiffArtefactsUseCase', () => {
  let useCase: DiffArtefactsUseCase;
  const mockGateway = createMockPackmindGateway();

  beforeEach(() => {
    useCase = new DiffArtefactsUseCase(mockGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when local command file differs from server', () => {
    beforeEach(() => {
      mockGateway.deployment.pull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/commands/my-command.md',
              content: 'Server content',
              artifactType: 'command',
              artifactName: 'My Command',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('Local content');
    });

    it('returns a diff with updateCommandDescription type', async () => {
      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([
        {
          filePath: '.packmind/commands/my-command.md',
          type: ChangeProposalType.updateCommandDescription,
          payload: {
            oldValue: 'Server content',
            newValue: 'Local content',
          },
          artifactName: 'My Command',
          artifactType: 'command',
        },
      ]);
    });
  });

  describe('when Cursor command file differs from server', () => {
    beforeEach(() => {
      mockGateway.deployment.pull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.cursor/commands/packmind/my-command.md',
              content: 'Server content',
              artifactType: 'command',
              artifactName: 'My Command',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('Local content');
    });

    it('returns a diff for the Cursor command file', async () => {
      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([
        {
          filePath: '.cursor/commands/packmind/my-command.md',
          type: ChangeProposalType.updateCommandDescription,
          payload: {
            oldValue: 'Server content',
            newValue: 'Local content',
          },
          artifactName: 'My Command',
          artifactType: 'command',
        },
      ]);
    });
  });

  describe('when Copilot prompt file differs from server', () => {
    beforeEach(() => {
      mockGateway.deployment.pull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.github/prompts/my-command.prompt.md',
              content: 'Server content',
              artifactType: 'command',
              artifactName: 'My Command',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('Local content');
    });

    it('returns a diff for the Copilot prompt file', async () => {
      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([
        {
          filePath: '.github/prompts/my-command.prompt.md',
          type: ChangeProposalType.updateCommandDescription,
          payload: {
            oldValue: 'Server content',
            newValue: 'Local content',
          },
          artifactName: 'My Command',
          artifactType: 'command',
        },
      ]);
    });
  });

  describe('when local standard file differs from server', () => {
    beforeEach(() => {
      mockGateway.deployment.pull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/standards/my-standard.md',
              content: 'Server standard content',
              artifactType: 'standard',
              artifactName: 'My Standard',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('Local standard content');
    });

    it('returns a diff with updateStandardDescription type', async () => {
      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([
        {
          filePath: '.packmind/standards/my-standard.md',
          type: ChangeProposalType.updateStandardDescription,
          payload: {
            oldValue: 'Server standard content',
            newValue: 'Local standard content',
          },
          artifactName: 'My Standard',
          artifactType: 'standard',
        },
      ]);
    });
  });

  describe('when local skill file differs from server', () => {
    beforeEach(() => {
      mockGateway.deployment.pull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content: 'Server skill content',
              artifactType: 'skill',
              artifactName: 'My Skill',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('Local skill content');
    });

    it('returns a diff with updateSkillDescription type', async () => {
      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([
        {
          filePath: '.claude/skills/my-skill/SKILL.md',
          type: ChangeProposalType.updateSkillDescription,
          payload: {
            oldValue: 'Server skill content',
            newValue: 'Local skill content',
          },
          artifactName: 'My Skill',
          artifactType: 'skill',
        },
      ]);
    });
  });

  describe('when multiple skill files belong to the same skill', () => {
    beforeEach(() => {
      mockGateway.deployment.pull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content: 'Server skill md',
              artifactType: 'skill',
              artifactName: 'My Skill',
            },
            {
              path: '.claude/skills/my-skill/helper.ts',
              content: 'Server helper',
              artifactType: 'skill',
              artifactName: 'My Skill',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce('Local skill md')
        .mockResolvedValueOnce('Local helper');
    });

    it('returns two diffs', async () => {
      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toHaveLength(2);
    });

    it('sets artifactName on first diff', async () => {
      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].artifactName).toBe('My Skill');
    });

    it('sets artifactName on second diff', async () => {
      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[1].artifactName).toBe('My Skill');
    });
  });

  describe('when local file does not exist', () => {
    beforeEach(() => {
      mockGateway.deployment.pull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/commands/missing.md',
              content: 'Server content',
              artifactType: 'command',
              artifactName: 'Missing Command',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockRejectedValue(
        new Error('ENOENT: no such file'),
      );
    });

    it('returns empty result', async () => {
      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([]);
    });
  });

  describe('when local content matches server content', () => {
    beforeEach(() => {
      mockGateway.deployment.pull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/commands/same.md',
              content: 'Same content',
              artifactType: 'command',
              artifactName: 'Same Command',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('Same content');
    });

    it('returns empty result', async () => {
      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([]);
    });
  });

  describe('when server returns files without artifactType', () => {
    beforeEach(() => {
      mockGateway.deployment.pull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: 'packmind.json',
              content: '{}',
            },
            {
              path: 'CLAUDE.md',
              content: '# Claude',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });
    });

    it('returns empty result', async () => {
      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([]);
    });

    it('does not read any local files', async () => {
      await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(fs.readFile).not.toHaveBeenCalled();
    });
  });

  describe('when file has no artifactName', () => {
    beforeEach(() => {
      mockGateway.deployment.pull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/commands/my-command.md',
              content: 'Server content',
              artifactType: 'command',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });
    });

    it('excludes the file from diff', async () => {
      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([]);
    });

    it('does not read any local files', async () => {
      await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(fs.readFile).not.toHaveBeenCalled();
    });
  });

  describe('when file uses sections instead of content', () => {
    beforeEach(() => {
      mockGateway.deployment.pull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.continue/config.yaml',
              sections: [{ key: 'Packmind standards', content: 'standards' }],
              artifactType: 'standard',
              artifactName: 'My Standard',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });
    });

    it('excludes section-based files from diff', async () => {
      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([]);
    });
  });

  describe('when server returns duplicate paths', () => {
    beforeEach(() => {
      mockGateway.deployment.pull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/commands/dup.md',
              content: 'First version',
              artifactType: 'command',
              artifactName: 'Dup Command',
            },
            {
              path: '.packmind/commands/dup.md',
              content: 'Second version',
              artifactType: 'command',
              artifactName: 'Dup Command',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('Local version');
    });

    it('uses the last occurrence and returns one diff', async () => {
      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([
        {
          filePath: '.packmind/commands/dup.md',
          type: ChangeProposalType.updateCommandDescription,
          payload: {
            oldValue: 'Second version',
            newValue: 'Local version',
          },
          artifactName: 'Dup Command',
          artifactType: 'command',
        },
      ]);
    });
  });

  describe('when multiple command files have changes', () => {
    beforeEach(() => {
      mockGateway.deployment.pull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/commands/cmd-a.md',
              content: 'Server A',
              artifactType: 'command',
              artifactName: 'Command A',
            },
            {
              path: '.packmind/commands/cmd-b.md',
              content: 'Server B',
              artifactType: 'command',
              artifactName: 'Command B',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce('Local A')
        .mockResolvedValueOnce('Local B');
    });

    it('returns diffs for all changed files', async () => {
      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toHaveLength(2);
    });
  });

  it('passes command parameters to the gateway pull', async () => {
    mockGateway.deployment.pull.mockResolvedValue({
      fileUpdates: { createOrUpdate: [], delete: [] },
      skillFolders: [],
    });

    await useCase.execute({
      packagesSlugs: ['pkg-1', 'pkg-2'],
      previousPackagesSlugs: ['pkg-old'],
      gitRemoteUrl: 'git@github.com:org/repo.git',
      gitBranch: 'main',
      relativePath: '/sub/',
      baseDirectory: '/test',
    });

    expect(mockGateway.deployment.pull).toHaveBeenCalledWith({
      packagesSlugs: ['pkg-1', 'pkg-2'],
      previousPackagesSlugs: ['pkg-old'],
      gitRemoteUrl: 'git@github.com:org/repo.git',
      gitBranch: 'main',
      relativePath: '/sub/',
    });
  });
});
