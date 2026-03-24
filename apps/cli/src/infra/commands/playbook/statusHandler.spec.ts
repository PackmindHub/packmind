import {
  playbookStatusHandler,
  PlaybookStatusHandlerDependencies,
} from './statusHandler';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import {
  IPlaybookLocalRepository,
  PlaybookChangeEntry,
} from '../../../domain/repositories/IPlaybookLocalRepository';
import { ILockFileRepository } from '../../../domain/repositories/ILockFileRepository';
import { PackmindLockFile } from '../../../domain/repositories/PackmindLockFile';

jest.mock('../../utils/consoleLogger', () => ({
  formatLabel: jest.fn((label: string) => label),
  logConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logWarningConsole: jest.fn(),
}));

jest.mock('../../utils/permissions', () => ({
  modeToPermissionStringOrDefault: jest.fn((mode: number) =>
    (mode & 0o777) === 0o755 ? 'rwxr-xr-x' : 'rw-r--r--',
  ),
}));

describe('playbookStatusHandler', () => {
  let mockPackmindCliHexa: PackmindCliHexa;
  let mockExit: jest.Mock;
  let mockReadFile: jest.Mock;
  let mockListDirectoryFiles: jest.Mock;
  let mockPlaybookLocalRepository: jest.Mocked<IPlaybookLocalRepository>;
  let mockLockFileRepository: jest.Mocked<ILockFileRepository>;
  let mockGetContentByVersions: jest.Mock;
  let mockLogConsole: jest.Mock;

  const repoRoot = '/project';

  beforeEach(() => {
    mockLogConsole = jest.requireMock('../../utils/consoleLogger').logConsole;

    mockGetContentByVersions = jest.fn().mockResolvedValue({
      fileUpdates: { createOrUpdate: [], delete: [] },
      skillFolders: [],
      resolvedAgents: [],
    });

    mockPackmindCliHexa = {
      configExists: jest
        .fn()
        .mockImplementation((dir: string) =>
          Promise.resolve(dir === '/project'),
        ),
      getPackmindGateway: () => ({
        deployment: { getContentByVersions: mockGetContentByVersions },
      }),
      tryGetGitRepositoryRoot: jest.fn().mockResolvedValue('/project'),
      findDescendantConfigs: jest.fn().mockResolvedValue([]),
    } as unknown as PackmindCliHexa;

    mockExit = jest.fn();
    mockReadFile = jest.fn();
    mockListDirectoryFiles = jest.fn().mockReturnValue([]);

    mockPlaybookLocalRepository = {
      addChange: jest.fn(),
      removeChange: jest.fn(),
      getChanges: jest.fn().mockReturnValue([]),
      getChange: jest.fn().mockReturnValue(null),
      clearAll: jest.fn(),
    };

    mockLockFileRepository = {
      read: jest.fn().mockResolvedValue(null),
      write: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function buildDeps(
    overrides: Partial<PlaybookStatusHandlerDependencies> = {},
  ): PlaybookStatusHandlerDependencies {
    return {
      packmindCliHexa: mockPackmindCliHexa,
      playbookLocalRepository: mockPlaybookLocalRepository,
      lockFileRepository: mockLockFileRepository,
      cwd: repoRoot,
      exit: mockExit,
      readFile: mockReadFile,
      listDirectoryFiles: mockListDirectoryFiles,
      ...overrides,
    };
  }

  describe('when there are staged changes', () => {
    beforeEach(() => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        {
          filePath: '.packmind/standards/my-standard.md',
          artifactType: 'standard',
          artifactName: 'My standard',
          codingAgent: 'packmind',
          addedAt: '2026-03-17T00:00:00.000Z',
          spaceId: 'space-123',
          content: 'content',
          changeType: 'updated',
        } as never,
        {
          filePath: '.claude/commands/my-command.md',
          artifactType: 'command',
          artifactName: 'My command',
          codingAgent: 'claude',
          addedAt: '2026-03-17T00:00:00.000Z',
          spaceId: 'space-123',
          content: 'content',
          changeType: 'created',
        } as never,
      ]);
    });

    it('displays the staged header', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith('Changes to be submitted:');
    });

    it('displays the standard with changeType and file path inline', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        '  - Standard "My standard" (updated) .packmind/standards/my-standard.md',
      );
    });

    it('displays the command with changeType and file path inline', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        '  - Command "My command" (created) .claude/commands/my-command.md',
      );
    });

    it('does not display space info for updated artifacts', async () => {
      await playbookStatusHandler(buildDeps());

      const allCalls = mockLogConsole.mock.calls.map((c: unknown[]) => c[0]);
      const standardLine = allCalls.find(
        (msg: string) => typeof msg === 'string' && msg.includes('My standard'),
      );
      expect(standardLine).not.toContain('in space');
    });

    it('displays submit hint', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        'Use `packmind playbook submit` to send them',
      );
    });
  });

  describe('when a created artifact has spaceName', () => {
    beforeEach(() => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        {
          filePath: '.packmind/standards/react-router.md',
          artifactType: 'standard',
          artifactName: 'React router',
          codingAgent: 'packmind',
          addedAt: '2026-03-17T00:00:00.000Z',
          spaceId: 'space-456',
          spaceName: 'Frontend',
          content: 'content',
          changeType: 'created',
        } as PlaybookChangeEntry,
      ]);
    });

    it('displays space name suffix for created artifact', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        '  - Standard "React router" (created) in space "Frontend" .packmind/standards/react-router.md',
      );
    });
  });

  describe('when the same artifact is staged for multiple agents', () => {
    beforeEach(() => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        {
          filePath: '.claude/commands/add-console.md',
          artifactType: 'command',
          artifactName: 'Add console',
          codingAgent: 'claude',
          addedAt: '2026-03-17T00:00:00.000Z',
          spaceId: 'space-123',
          content: 'content',
          changeType: 'updated',
        } as never,
        {
          filePath: '.packmind/commands/add-console.md',
          artifactType: 'command',
          artifactName: 'Add console',
          codingAgent: 'packmind',
          addedAt: '2026-03-17T00:00:00.000Z',
          spaceId: 'space-123',
          content: 'content',
          changeType: 'updated',
        } as never,
      ]);
    });

    it('displays the artifact header without inline path', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        '  - Command "Add console" (updated)',
      );
    });

    it('displays the first file path on its own line', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        '    .claude/commands/add-console.md',
      );
    });

    it('displays the second file path on its own line', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        '    .packmind/commands/add-console.md',
      );
    });
  });

  describe('when there are untracked changes', () => {
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: ['my-package'],
      agents: ['claude'],
      installedAt: '2026-03-17T00:00:00.000Z',
      cliVersion: '1.0.0',
      targetId: 'target-456',
      artifacts: {
        'artifact-1': {
          name: 'My standard',
          type: 'standard',
          id: 'artifact-1',
          version: 1,
          spaceId: 'space-123',
          packageIds: ['pkg-1'],
          files: [
            {
              path: '.packmind/standards/my-standard.md',
              agent: 'packmind',
            },
          ],
        },
      },
    };

    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue(lockFile);
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/standards/my-standard.md',
              content: 'deployed content',
            },
          ],
          delete: [],
        },
        skillFolders: [],
        resolvedAgents: [],
      });
      mockReadFile.mockReturnValue('local modified content');
    });

    it('displays the untracked header', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith('Changes not tracked:');
    });

    it('displays the untracked artifact with file path inline', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        '  - Standard "My standard" .packmind/standards/my-standard.md',
      );
    });

    it('displays add hint', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        'Use `packmind playbook add <path>` to track them',
      );
    });

    it('calls getContentByVersions with lock file artifacts and agents', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockGetContentByVersions).toHaveBeenCalledWith({
        artifacts: [
          {
            name: 'My standard',
            type: 'standard',
            id: 'artifact-1',
            version: 1,
            spaceId: 'space-123',
          },
        ],
        agents: ['claude'],
      });
    });
  });

  describe('when the same artifact has untracked changes for multiple agents', () => {
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: ['my-package'],
      agents: ['claude', 'packmind'],
      installedAt: '2026-03-17T00:00:00.000Z',
      cliVersion: '1.0.0',
      targetId: 'target-456',
      artifacts: {
        'artifact-1': {
          name: 'My standard',
          type: 'standard',
          id: 'artifact-1',
          version: 1,
          spaceId: 'space-123',
          packageIds: ['pkg-1'],
          files: [
            {
              path: '.packmind/standards/my-standard.md',
              agent: 'packmind',
            },
            {
              path: '.claude/rules/packmind/standard-my-standard.md',
              agent: 'claude',
            },
          ],
        },
      },
    };

    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue(lockFile);
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/standards/my-standard.md',
              content: 'deployed content',
            },
            {
              path: '.claude/rules/packmind/standard-my-standard.md',
              content: 'deployed content',
            },
          ],
          delete: [],
        },
        skillFolders: [],
        resolvedAgents: [],
      });
      mockReadFile.mockReturnValue('local modified content');
    });

    it('displays the artifact header without inline path', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith('  - Standard "My standard"');
    });

    it('displays the first file path on its own line', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        '    .packmind/standards/my-standard.md',
      );
    });

    it('displays the second file path on its own line', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        '    .claude/rules/packmind/standard-my-standard.md',
      );
    });
  });

  describe('when there are no changes', () => {
    it('displays no changes message', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith('No changes detected.');
    });
  });

  describe('when there is no lock file', () => {
    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue(null);
    });

    describe('when there are no staged changes', () => {
      it('displays no changes message', async () => {
        await playbookStatusHandler(buildDeps());

        expect(mockLogConsole).toHaveBeenCalledWith('No changes detected.');
      });
    });

    describe('when there are staged changes', () => {
      beforeEach(() => {
        mockPlaybookLocalRepository.getChanges.mockReturnValue([
          {
            filePath: '.claude/commands/my-command.md',
            artifactType: 'command',
            artifactName: 'My command',
            codingAgent: 'claude',
            addedAt: '2026-03-17T00:00:00.000Z',
            spaceId: 'space-123',
            content: 'content',
          },
        ]);
      });

      it('displays the staged header', async () => {
        await playbookStatusHandler(buildDeps());

        expect(mockLogConsole).toHaveBeenCalledWith('Changes to be submitted:');
      });
    });
  });

  describe('when there are both staged and untracked changes', () => {
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: ['my-package'],
      agents: ['claude'],
      installedAt: '2026-03-17T00:00:00.000Z',
      cliVersion: '1.0.0',
      targetId: 'target-456',
      artifacts: {
        'artifact-1': {
          name: 'Untracked standard',
          type: 'standard',
          id: 'artifact-1',
          version: 1,
          spaceId: 'space-123',
          packageIds: ['pkg-1'],
          files: [
            {
              path: '.packmind/standards/untracked.md',
              agent: 'packmind',
            },
          ],
        },
      },
    };

    beforeEach(() => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        {
          filePath: '.claude/commands/my-command.md',
          artifactType: 'command',
          artifactName: 'My command',
          codingAgent: 'claude',
          addedAt: '2026-03-17T00:00:00.000Z',
          spaceId: 'space-123',
          content: 'content',
        },
      ]);
      mockLockFileRepository.read.mockResolvedValue(lockFile);
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/standards/untracked.md',
              content: 'deployed content',
            },
          ],
          delete: [],
        },
        skillFolders: [],
        resolvedAgents: [],
      });
      mockReadFile.mockReturnValue('local modified content');
    });

    it('displays the staged header', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith('Changes to be submitted:');
    });

    it('displays the untracked header', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith('Changes not tracked:');
    });
  });

  describe('when a deployed file does not exist locally', () => {
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: ['my-package'],
      agents: ['claude'],
      installedAt: '2026-03-17T00:00:00.000Z',
      cliVersion: '1.0.0',
      targetId: 'target-456',
      artifacts: {
        'artifact-1': {
          name: 'Missing standard',
          type: 'standard',
          id: 'artifact-1',
          version: 1,
          spaceId: 'space-123',
          packageIds: ['pkg-1'],
          files: [
            {
              path: '.packmind/standards/missing.md',
              agent: 'packmind',
            },
          ],
        },
      },
    };

    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue(lockFile);
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/standards/missing.md',
              content: 'deployed content',
            },
          ],
          delete: [],
        },
        skillFolders: [],
        resolvedAgents: [],
      });
      mockReadFile.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });
    });

    it('shows the file as an untracked deletion', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        '  - Standard "Missing standard" (deleted) .packmind/standards/missing.md',
      );
    });
  });

  describe('when the project directory differs from the git root', () => {
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: ['my-package'],
      agents: ['claude'],
      installedAt: '2026-03-17T00:00:00.000Z',
      cliVersion: '1.0.0',
      targetId: 'target-456',
      artifacts: {
        'artifact-1': {
          name: 'My command',
          type: 'command',
          id: 'artifact-1',
          version: 1,
          spaceId: 'space-123',
          packageIds: ['pkg-1'],
          files: [
            {
              path: '.claude/commands/my-command.md',
              agent: 'claude',
            },
          ],
        },
      },
    };

    beforeEach(() => {
      (mockPackmindCliHexa.configExists as jest.Mock).mockImplementation(
        (dir: string) => Promise.resolve(dir === '/gitroot/subproject'),
      );
      (
        mockPackmindCliHexa.tryGetGitRepositoryRoot as jest.Mock
      ).mockResolvedValue('/gitroot');

      mockLockFileRepository.read.mockImplementation((dir: string) =>
        Promise.resolve(dir === '/gitroot/subproject' ? lockFile : null),
      );
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/commands/my-command.md',
              content: 'deployed content',
            },
          ],
          delete: [],
        },
        skillFolders: [],
        resolvedAgents: [],
      });
      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('/gitroot/subproject/')) {
          return 'local modified content';
        }
        throw new Error('ENOENT: no such file or directory');
      });
    });

    it('displays the untracked header for the subproject', async () => {
      await playbookStatusHandler(buildDeps({ cwd: '/gitroot/subproject' }));

      expect(mockLogConsole).toHaveBeenCalledWith('Changes not tracked:');
    });

    it('displays the untracked artifact with file path relative to cwd', async () => {
      await playbookStatusHandler(buildDeps({ cwd: '/gitroot/subproject' }));

      expect(mockLogConsole).toHaveBeenCalledWith(
        '  - Command "My command" .claude/commands/my-command.md',
      );
    });

    it('reads local files relative to the project directory', async () => {
      await playbookStatusHandler(buildDeps({ cwd: '/gitroot/subproject' }));

      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining(
          '/gitroot/subproject/.claude/commands/my-command.md',
        ),
      );
    });
  });

  describe('when a deployed file is already staged', () => {
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: ['my-package'],
      agents: ['claude'],
      installedAt: '2026-03-17T00:00:00.000Z',
      cliVersion: '1.0.0',
      targetId: 'target-456',
      artifacts: {
        'artifact-1': {
          name: 'Already staged',
          type: 'standard',
          id: 'artifact-1',
          version: 1,
          spaceId: 'space-123',
          packageIds: ['pkg-1'],
          files: [
            {
              path: '.packmind/standards/already-staged.md',
              agent: 'packmind',
            },
          ],
        },
      },
    };

    beforeEach(() => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        {
          filePath: '.packmind/standards/already-staged.md',
          artifactType: 'standard',
          artifactName: 'Already staged',
          codingAgent: 'packmind',
          addedAt: '2026-03-17T00:00:00.000Z',
          spaceId: 'space-123',
          content: 'local modified content',
        },
      ]);
      mockLockFileRepository.read.mockResolvedValue(lockFile);
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/standards/already-staged.md',
              content: 'deployed content',
            },
          ],
          delete: [],
        },
        skillFolders: [],
        resolvedAgents: [],
      });
      mockReadFile.mockReturnValue('local modified content');
    });

    it('does not show the untracked section', async () => {
      await playbookStatusHandler(buildDeps());

      const allCalls = mockLogConsole.mock.calls.map((c: unknown[]) => c[0]);
      const hasUntracked = allCalls.some(
        (msg: string) =>
          typeof msg === 'string' && msg.includes('Changes not tracked:'),
      );
      expect(hasUntracked).toBe(false);
    });

    it('shows the staged header', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith('Changes to be submitted:');
    });

    it('shows the artifact in staged section', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        expect.stringContaining('Already staged'),
      );
    });
  });

  describe('when getContentByVersions API fails', () => {
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: ['my-package'],
      agents: ['claude'],
      installedAt: '2026-03-17T00:00:00.000Z',
      cliVersion: '1.0.0',
      targetId: 'target-456',
      artifacts: {
        'artifact-1': {
          name: 'My standard',
          type: 'standard',
          id: 'artifact-1',
          version: 1,
          spaceId: 'space-123',
          packageIds: ['pkg-1'],
          files: [
            {
              path: '.packmind/standards/my-standard.md',
              agent: 'packmind',
            },
          ],
        },
      },
    };

    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue(lockFile);
      mockGetContentByVersions.mockRejectedValue(new Error('Network error'));
    });

    it('gracefully shows no untracked changes', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith('No changes detected.');
    });
  });

  describe('when a staged change has changeType removed', () => {
    beforeEach(() => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        {
          filePath: '.claude/commands/my-command.md',
          artifactType: 'command',
          artifactName: 'My command',
          codingAgent: 'claude',
          addedAt: '2026-03-17T00:00:00.000Z',
          spaceId: 'space-123',
          content: '',
          changeType: 'removed',
        } as PlaybookChangeEntry,
      ]);
    });

    it('displays the removed label', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        '  - Command "My command" (removed) .claude/commands/my-command.md',
      );
    });

    it('displays the staged header', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith('Changes to be submitted:');
    });

    it('displays submit hint', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        'Use `packmind playbook submit` to send them',
      );
    });
  });

  describe('when staged entry has configDir', () => {
    it('displays file path prefixed with configDir', async () => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        {
          filePath: '.claude/skills/my-skill',
          artifactType: 'skill',
          artifactName: 'My skill',
          codingAgent: 'claude',
          addedAt: '2026-03-17T00:00:00.000Z',
          spaceId: 'space-123',
          content: 'content',
          changeType: 'updated',
          configDir: 'apps/frontend',
        } as PlaybookChangeEntry,
      ]);

      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        '  - Skill "My skill" (updated) apps/frontend/.claude/skills/my-skill',
      );
    });

    it('falls back to bare filePath when configDir is undefined', async () => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        {
          filePath: '.claude/skills/my-skill',
          artifactType: 'skill',
          artifactName: 'My skill',
          codingAgent: 'claude',
          addedAt: '2026-03-17T00:00:00.000Z',
          spaceId: 'space-123',
          content: 'content',
          changeType: 'updated',
        } as PlaybookChangeEntry,
      ]);

      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        '  - Skill "My skill" (updated) .claude/skills/my-skill',
      );
    });
  });

  describe('when untracked changes exist in a configDir target', () => {
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: ['my-package'],
      agents: ['claude'],
      installedAt: '2026-03-17T00:00:00.000Z',
      cliVersion: '1.0.0',
      targetId: 'target-456',
      artifacts: {
        'artifact-1': {
          name: 'My standard',
          type: 'standard',
          id: 'artifact-1',
          version: 1,
          spaceId: 'space-123',
          packageIds: ['pkg-1'],
          files: [
            {
              path: '.packmind/standards/my-standard.md',
              agent: 'packmind',
            },
          ],
        },
      },
    };

    beforeEach(() => {
      (
        mockPackmindCliHexa.tryGetGitRepositoryRoot as jest.Mock
      ).mockResolvedValue('/project');
      (mockPackmindCliHexa.configExists as jest.Mock).mockImplementation(
        (dir: string) =>
          Promise.resolve(
            dir === '/project/apps/frontend' || dir === '/project',
          ),
      );

      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        {
          filePath: '.claude/skills/my-skill',
          artifactType: 'skill',
          artifactName: 'My skill',
          codingAgent: 'claude',
          addedAt: '2026-03-17T00:00:00.000Z',
          spaceId: 'space-123',
          content: 'content',
          changeType: 'updated',
          configDir: 'apps/frontend',
        } as PlaybookChangeEntry,
      ]);

      mockLockFileRepository.read.mockImplementation((dir: string) =>
        Promise.resolve(dir === '/project/apps/frontend' ? lockFile : null),
      );
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/standards/my-standard.md',
              content: 'deployed content',
            },
          ],
          delete: [],
        },
        skillFolders: [],
        resolvedAgents: [],
      });
      mockReadFile.mockReturnValue('local modified content');
    });

    it('displays untracked file path prefixed with configDir', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        '  - Standard "My standard" apps/frontend/.packmind/standards/my-standard.md',
      );
    });

    it('reads local files relative to the configDir project directory', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining(
          '/project/apps/frontend/.packmind/standards/my-standard.md',
        ),
      );
    });
  });

  describe('when a deployed file has been manually deleted', () => {
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: ['my-package'],
      agents: ['packmind'],
      installedAt: '2026-03-17T00:00:00.000Z',
      cliVersion: '1.0.0',
      targetId: 'target-456',
      artifacts: {
        'artifact-1': {
          name: 'Deleted standard',
          type: 'standard',
          id: 'artifact-1',
          version: 1,
          spaceId: 'space-123',
          packageIds: ['pkg-1'],
          files: [
            {
              path: '.packmind/standards/deleted-standard.md',
              agent: 'packmind',
            },
          ],
        },
      },
    };

    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue(lockFile);
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/standards/deleted-standard.md',
              content: 'deployed content',
            },
          ],
          delete: [],
        },
        skillFolders: [],
        resolvedAgents: [],
      });
      mockReadFile.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });
    });

    it('displays the untracked header', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith('Changes not tracked:');
    });

    it('displays the deleted artifact with (deleted) label', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        '  - Standard "Deleted standard" (deleted) .packmind/standards/deleted-standard.md',
      );
    });

    it('displays add hint', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        'Use `packmind playbook add <path>` to track them',
      );
    });
  });

  describe('when a deployed skill file has been deleted locally', () => {
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: ['my-package'],
      agents: ['claude'],
      installedAt: '2026-03-17T00:00:00.000Z',
      cliVersion: '1.0.0',
      targetId: 'target-456',
      artifacts: {
        'my-skill': {
          name: 'My Skill',
          type: 'skill',
          id: 'artifact-skill-1',
          version: 1,
          spaceId: 'space-123',
          packageIds: ['pkg-1'],
          files: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              agent: 'claude',
            },
            {
              path: '.claude/skills/my-skill/support/helper.py',
              agent: 'claude',
            },
          ],
        },
      },
    };

    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue(lockFile);
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content: 'skill content',
            },
            {
              path: '.claude/skills/my-skill/support/helper.py',
              content: 'print("hello")',
            },
          ],
          delete: [],
        },
        skillFolders: [],
        resolvedAgents: [],
      });
      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('SKILL.md')) return 'skill content';
        throw new Error('ENOENT: no such file or directory');
      });
    });

    it('displays the deleted skill file as untracked', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        '  - Skill "My Skill" (deleted) .claude/skills/my-skill/support/helper.py',
      );
    });

    it('does not show the unchanged SKILL.md as untracked', async () => {
      await playbookStatusHandler(buildDeps());

      const allCalls = mockLogConsole.mock.calls.map((c: unknown[]) => c[0]);
      const skillMdUntracked = allCalls.some(
        (msg: string) =>
          typeof msg === 'string' &&
          msg.includes('SKILL.md') &&
          msg.includes('not tracked'),
      );
      expect(skillMdUntracked).toBe(false);
    });

    it('displays the untracked header', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith('Changes not tracked:');
    });
  });

  describe('when a deployed skill file has changed permissions only', () => {
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: ['my-package'],
      agents: ['claude'],
      installedAt: '2026-03-17T00:00:00.000Z',
      cliVersion: '1.0.0',
      targetId: 'target-456',
      artifacts: {
        'my-skill': {
          name: 'My Skill',
          type: 'skill',
          id: 'artifact-skill-1',
          version: 1,
          spaceId: 'space-123',
          packageIds: ['pkg-1'],
          files: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              agent: 'claude',
            },
            {
              path: '.claude/skills/my-skill/references/file.md',
              agent: 'claude',
            },
          ],
        },
      },
    };

    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue(lockFile);
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content: 'skill content',
            },
            {
              path: '.claude/skills/my-skill/references/file.md',
              content: 'file content',
              skillFileId: 'file-id-1',
              skillFilePermissions: 'rw-r--r--',
            },
          ],
          delete: [],
        },
        skillFolders: [],
        resolvedAgents: [],
      });
      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('SKILL.md')) return 'skill content';
        if (filePath.includes('file.md')) return 'file content';
        throw new Error('ENOENT');
      });
    });

    it('displays file as untracked when only permissions differ', async () => {
      const mockGetFileMode = jest.fn().mockReturnValue(0o100755);

      await playbookStatusHandler(buildDeps({ getFileMode: mockGetFileMode }));

      expect(mockLogConsole).toHaveBeenCalledWith(
        '  - Skill "My Skill" .claude/skills/my-skill/references/file.md',
      );
    });

    it('does not show file as untracked when permissions match', async () => {
      const mockGetFileMode = jest.fn().mockReturnValue(0o100644);

      await playbookStatusHandler(buildDeps({ getFileMode: mockGetFileMode }));

      const allCalls = mockLogConsole.mock.calls.map((c: unknown[]) => c[0]);
      const hasUntracked = allCalls.some(
        (msg: string) =>
          typeof msg === 'string' && msg.includes('Changes not tracked:'),
      );
      expect(hasUntracked).toBe(false);
    });
  });

  describe('when a skill is already staged and a support file is deleted', () => {
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: ['my-package'],
      agents: ['claude'],
      installedAt: '2026-03-17T00:00:00.000Z',
      cliVersion: '1.0.0',
      targetId: 'target-456',
      artifacts: {
        'my-skill': {
          name: 'My Skill',
          type: 'skill',
          id: 'artifact-skill-1',
          version: 1,
          spaceId: 'space-123',
          packageIds: ['pkg-1'],
          files: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              agent: 'claude',
            },
            {
              path: '.claude/skills/my-skill/support/helper.py',
              agent: 'claude',
            },
          ],
        },
      },
    };

    beforeEach(() => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        {
          filePath: '.claude/skills/my-skill',
          artifactType: 'skill',
          artifactName: 'My Skill',
          codingAgent: 'claude',
          addedAt: '2026-03-17T00:00:00.000Z',
          spaceId: 'space-123',
          content: 'content',
          changeType: 'updated',
        } as PlaybookChangeEntry,
      ]);
      mockLockFileRepository.read.mockResolvedValue(lockFile);
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content: 'skill content',
            },
            {
              path: '.claude/skills/my-skill/support/helper.py',
              content: 'print("hello")',
            },
          ],
          delete: [],
        },
        skillFolders: [],
        resolvedAgents: [],
      });
      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('SKILL.md')) return 'skill content';
        throw new Error('ENOENT: no such file or directory');
      });
    });

    it('does not show deleted support file as untracked when skill directory is staged', async () => {
      await playbookStatusHandler(buildDeps());

      const allCalls = mockLogConsole.mock.calls.map((c: unknown[]) => c[0]);
      const hasUntracked = allCalls.some(
        (msg: string) =>
          typeof msg === 'string' && msg.includes('Changes not tracked:'),
      );
      expect(hasUntracked).toBe(false);
    });
  });

  describe('when a skill has new local files not in the deployed set', () => {
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: ['my-package'],
      agents: ['claude'],
      installedAt: '2026-03-17T00:00:00.000Z',
      cliVersion: '1.0.0',
      targetId: 'target-456',
      artifacts: {
        'my-skill': {
          name: 'My Skill',
          type: 'skill',
          id: 'artifact-skill-1',
          version: 1,
          spaceId: 'space-123',
          packageIds: ['pkg-1'],
          files: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              agent: 'claude',
            },
          ],
        },
      },
    };

    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue(lockFile);
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content: 'skill content',
            },
          ],
          delete: [],
        },
        skillFolders: [],
        resolvedAgents: [],
      });
      mockReadFile.mockReturnValue('skill content');
      mockListDirectoryFiles.mockReturnValue([
        'SKILL.md',
        'references/file.md',
      ]);
    });

    it('displays the new file as untracked', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        '  - Skill "My Skill" .claude/skills/my-skill/references/file.md',
      );
    });

    it('displays the untracked header', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith('Changes not tracked:');
    });

    it('does not show SKILL.md as untracked since it matches deployed', async () => {
      await playbookStatusHandler(buildDeps());

      const allCalls = mockLogConsole.mock.calls.map((c: unknown[]) => c[0]);
      const skillMdLine = allCalls.find(
        (msg: string) =>
          typeof msg === 'string' &&
          msg.includes('SKILL.md') &&
          msg.includes('not tracked'),
      );
      expect(skillMdLine).toBeUndefined();
    });

    it('scans the correct skill directory', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockListDirectoryFiles).toHaveBeenCalledWith(
        '/project/.claude/skills/my-skill',
      );
    });
  });

  describe('when a skill has new local files but skill is already staged', () => {
    const lockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: ['my-package'],
      agents: ['claude'],
      installedAt: '2026-03-17T00:00:00.000Z',
      cliVersion: '1.0.0',
      targetId: 'target-456',
      artifacts: {
        'my-skill': {
          name: 'My Skill',
          type: 'skill',
          id: 'artifact-skill-1',
          version: 1,
          spaceId: 'space-123',
          packageIds: ['pkg-1'],
          files: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              agent: 'claude',
            },
          ],
        },
      },
    };

    beforeEach(() => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        {
          filePath: '.claude/skills/my-skill',
          artifactType: 'skill',
          artifactName: 'My Skill',
          codingAgent: 'claude',
          addedAt: '2026-03-17T00:00:00.000Z',
          spaceId: 'space-123',
          content: 'content',
          changeType: 'updated',
        } as PlaybookChangeEntry,
      ]);
      mockLockFileRepository.read.mockResolvedValue(lockFile);
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content: 'skill content',
            },
          ],
          delete: [],
        },
        skillFolders: [],
        resolvedAgents: [],
      });
      mockReadFile.mockReturnValue('skill content');
      mockListDirectoryFiles.mockReturnValue([
        'SKILL.md',
        'references/file.md',
      ]);
    });

    it('does not show new files as untracked when skill is staged', async () => {
      await playbookStatusHandler(buildDeps());

      const allCalls = mockLogConsole.mock.calls.map((c: unknown[]) => c[0]);
      const hasUntracked = allCalls.some(
        (msg: string) =>
          typeof msg === 'string' && msg.includes('Changes not tracked:'),
      );
      expect(hasUntracked).toBe(false);
    });
  });

  describe('when cwd is a subdirectory of the git root', () => {
    describe('staged changes', () => {
      it('shows path relative to cwd when run from a sub-app directory', async () => {
        mockPlaybookLocalRepository.getChanges.mockReturnValue([
          {
            filePath: '.packmind/commands/my-command.ts',
            artifactType: 'command',
            artifactName: 'My command',
            codingAgent: 'packmind',
            addedAt: '2026-03-17T00:00:00.000Z',
            spaceId: 'space-123',
            content: 'content',
            changeType: 'updated',
            configDir: 'apps/frontend',
          } as PlaybookChangeEntry,
        ]);

        await playbookStatusHandler(
          buildDeps({ cwd: '/project/apps/frontend' }),
        );

        expect(mockLogConsole).toHaveBeenCalledWith(
          '  - Command "My command" (updated) .packmind/commands/my-command.ts',
        );
      });

      it('shows relative path with ../../ when run from an unrelated package', async () => {
        mockPlaybookLocalRepository.getChanges.mockReturnValue([
          {
            filePath: '.packmind/commands/my-command.ts',
            artifactType: 'command',
            artifactName: 'My command',
            codingAgent: 'packmind',
            addedAt: '2026-03-17T00:00:00.000Z',
            spaceId: 'space-123',
            content: 'content',
            changeType: 'updated',
            configDir: 'apps/frontend',
          } as PlaybookChangeEntry,
        ]);

        await playbookStatusHandler(
          buildDeps({ cwd: '/project/packages/whatever' }),
        );

        expect(mockLogConsole).toHaveBeenCalledWith(
          '  - Command "My command" (updated) ../../apps/frontend/.packmind/commands/my-command.ts',
        );
      });
    });

    describe('untracked changes', () => {
      const lockFile: PackmindLockFile = {
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['packmind'],
        installedAt: '2026-03-17T00:00:00.000Z',
        cliVersion: '1.0.0',
        targetId: 'target-456',
        artifacts: {
          'artifact-1': {
            name: 'My standard',
            type: 'standard',
            id: 'artifact-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: ['pkg-1'],
            files: [
              {
                path: '.packmind/standards/my-standard.md',
                agent: 'packmind',
              },
            ],
          },
        },
      };

      beforeEach(() => {
        (mockPackmindCliHexa.configExists as jest.Mock).mockImplementation(
          (dir: string) =>
            Promise.resolve(
              dir === '/project/apps/frontend' || dir === '/project',
            ),
        );
        mockLockFileRepository.read.mockImplementation((dir: string) =>
          Promise.resolve(dir === '/project/apps/frontend' ? lockFile : null),
        );
        mockGetContentByVersions.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.packmind/standards/my-standard.md',
                content: 'deployed content',
              },
            ],
            delete: [],
          },
          skillFolders: [],
          resolvedAgents: [],
        });
        mockReadFile.mockReturnValue('local modified content');
        mockPlaybookLocalRepository.getChanges.mockReturnValue([
          {
            filePath: '.packmind/standards/unrelated.md',
            artifactType: 'standard',
            artifactName: 'Unrelated',
            codingAgent: 'packmind',
            addedAt: '2026-03-17T00:00:00.000Z',
            spaceId: 'space-123',
            content: 'content',
            changeType: 'updated',
            configDir: 'apps/frontend',
          } as PlaybookChangeEntry,
        ]);
      });

      it('shows path relative to cwd when run from the sub-app directory', async () => {
        await playbookStatusHandler(
          buildDeps({ cwd: '/project/apps/frontend' }),
        );

        expect(mockLogConsole).toHaveBeenCalledWith(
          '  - Standard "My standard" .packmind/standards/my-standard.md',
        );
      });

      it('shows relative path with ../../ when run from an unrelated package', async () => {
        await playbookStatusHandler(
          buildDeps({ cwd: '/project/packages/whatever' }),
        );

        expect(mockLogConsole).toHaveBeenCalledWith(
          '  - Standard "My standard" ../../apps/frontend/.packmind/standards/my-standard.md',
        );
      });
    });
  });

  describe('when running from root and sub-target has untracked changes', () => {
    const subTargetLockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: ['my-package'],
      agents: ['packmind'],
      installedAt: '2026-03-17T00:00:00.000Z',
      cliVersion: '1.0.0',
      targetId: 'target-sub',
      artifacts: {
        'artifact-1': {
          name: 'Second standard',
          type: 'standard',
          id: 'artifact-1',
          version: 1,
          spaceId: 'space-123',
          packageIds: ['pkg-1'],
          files: [
            {
              path: '.packmind/standards/second-standard.md',
              agent: 'packmind',
            },
          ],
        },
      },
    };

    beforeEach(() => {
      (mockPackmindCliHexa.configExists as jest.Mock).mockImplementation(
        (dir: string) => Promise.resolve(dir === '/project'),
      );
      (
        mockPackmindCliHexa.findDescendantConfigs as jest.Mock
      ).mockResolvedValue(['/project/apps/frontend']);
      mockLockFileRepository.read.mockImplementation((dir: string) =>
        Promise.resolve(
          dir === '/project/apps/frontend' ? subTargetLockFile : null,
        ),
      );
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/standards/second-standard.md',
              content: 'deployed content',
            },
          ],
          delete: [],
        },
        skillFolders: [],
        resolvedAgents: [],
      });
      mockReadFile.mockReturnValue('local modified content');
    });

    it('shows the untracked header', async () => {
      await playbookStatusHandler(buildDeps({ cwd: '/project' }));

      expect(mockLogConsole).toHaveBeenCalledWith('Changes not tracked:');
    });

    it('shows the sub-target untracked change with path relative to cwd', async () => {
      await playbookStatusHandler(buildDeps({ cwd: '/project' }));

      expect(mockLogConsole).toHaveBeenCalledWith(
        '  - Standard "Second standard" apps/frontend/.packmind/standards/second-standard.md',
      );
    });

    it('reads files from the sub-target directory', async () => {
      await playbookStatusHandler(buildDeps({ cwd: '/project' }));

      expect(mockReadFile).toHaveBeenCalledWith(
        '/project/apps/frontend/.packmind/standards/second-standard.md',
      );
    });
  });
});
