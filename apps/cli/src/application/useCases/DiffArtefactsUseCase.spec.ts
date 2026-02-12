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
              artifactId: 'artifact-1',
              spaceId: 'space-1',
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
          artifactId: 'artifact-1',
          spaceId: 'space-1',
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
              artifactId: 'artifact-2',
              spaceId: 'space-2',
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
          artifactId: 'artifact-2',
          spaceId: 'space-2',
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
              artifactId: 'artifact-3',
              spaceId: 'space-3',
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
          artifactId: 'artifact-3',
          spaceId: 'space-3',
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
              artifactId: 'artifact-4',
              spaceId: 'space-4',
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
          artifactId: 'artifact-4',
          spaceId: 'space-4',
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
              artifactId: 'artifact-5',
              spaceId: 'space-5',
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
          artifactId: 'artifact-5',
          spaceId: 'space-5',
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
              artifactId: 'artifact-6',
              spaceId: 'space-6',
            },
            {
              path: '.claude/skills/my-skill/helper.ts',
              content: 'Server helper',
              artifactType: 'skill',
              artifactName: 'My Skill',
              artifactId: 'artifact-6',
              spaceId: 'space-6',
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
              artifactId: 'artifact-dup',
              spaceId: 'space-dup',
            },
            {
              path: '.packmind/commands/dup.md',
              content: 'Second version',
              artifactType: 'command',
              artifactName: 'Dup Command',
              artifactId: 'artifact-dup',
              spaceId: 'space-dup',
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
          artifactId: 'artifact-dup',
          spaceId: 'space-dup',
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
              artifactId: 'artifact-a',
              spaceId: 'space-a',
            },
            {
              path: '.packmind/commands/cmd-b.md',
              content: 'Server B',
              artifactType: 'command',
              artifactName: 'Command B',
              artifactId: 'artifact-b',
              spaceId: 'space-b',
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

  describe('when file modification includes artifactId and spaceId', () => {
    beforeEach(() => {
      mockGateway.deployment.pull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/commands/tracked.md',
              content: 'Server content',
              artifactType: 'command',
              artifactName: 'Tracked Command',
              artifactId: 'art-123',
              spaceId: 'spc-456',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('Local content');
    });

    it('propagates artifactId to the diff', async () => {
      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].artifactId).toBe('art-123');
    });

    it('propagates spaceId to the diff', async () => {
      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].spaceId).toBe('spc-456');
    });
  });

  describe('when file modification has no artifactId or spaceId', () => {
    beforeEach(() => {
      mockGateway.deployment.pull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/commands/untracked.md',
              content: 'Server content',
              artifactType: 'command',
              artifactName: 'Untracked Command',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue('Local content');
    });

    it('sets artifactId to undefined in the diff', async () => {
      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].artifactId).toBeUndefined();
    });

    it('sets spaceId to undefined in the diff', async () => {
      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result[0].spaceId).toBeUndefined();
    });
  });

  describe('when server and local content both have frontmatter', () => {
    beforeEach(() => {
      mockGateway.deployment.pull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/commands/my-command.md',
              content:
                "---\ndescription: 'My command'\nagent: 'agent'\n---\n\nThis is a marvelous command",
              artifactType: 'command',
              artifactName: 'My Command',
              artifactId: 'artifact-fm',
              spaceId: 'space-fm',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue(
        "---\ndescription: 'My command'\nagent: 'agent'\n---\n\nThis is a modified command",
      );
    });

    it('returns diff payload with body-only values', async () => {
      const result = await useCase.execute({
        packagesSlugs: ['test-package'],
        baseDirectory: '/test',
      });

      expect(result).toEqual([
        {
          filePath: '.packmind/commands/my-command.md',
          type: ChangeProposalType.updateCommandDescription,
          payload: {
            oldValue: 'This is a marvelous command',
            newValue: 'This is a modified command',
          },
          artifactName: 'My Command',
          artifactType: 'command',
          artifactId: 'artifact-fm',
          spaceId: 'space-fm',
        },
      ]);
    });
  });

  describe('when only frontmatter differs between server and local', () => {
    beforeEach(() => {
      mockGateway.deployment.pull.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/commands/my-command.md',
              content: "---\ndescription: 'Old description'\n---\n\nSame body",
              artifactType: 'command',
              artifactName: 'My Command',
              artifactId: 'artifact-fm2',
              spaceId: 'space-fm2',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });

      (fs.readFile as jest.Mock).mockResolvedValue(
        "---\ndescription: 'New description'\nagent: 'added-agent'\n---\n\nSame body",
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
