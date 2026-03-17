import {
  playbookStatusHandler,
  PlaybookStatusHandlerDependencies,
} from './playbookStatusHandler';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { IPlaybookLocalRepository } from '../../domain/repositories/IPlaybookLocalRepository';
import { ILockFileRepository } from '../../domain/repositories/ILockFileRepository';
import { PackmindLockFile } from '../../domain/repositories/PackmindLockFile';

jest.mock('../utils/consoleLogger', () => ({
  formatLabel: jest.fn((label: string) => label),
  logConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logWarningConsole: jest.fn(),
}));

describe('playbookStatusHandler', () => {
  let mockPackmindCliHexa: PackmindCliHexa;
  let mockExit: jest.Mock;
  let mockReadFile: jest.Mock;
  let mockPlaybookLocalRepository: jest.Mocked<IPlaybookLocalRepository>;
  let mockLockFileRepository: jest.Mocked<ILockFileRepository>;
  let mockGetDeployed: jest.Mock;
  let mockLogConsole: jest.Mock;

  const repoRoot = '/project';

  beforeEach(() => {
    mockLogConsole = jest.requireMock('../utils/consoleLogger').logConsole;

    mockGetDeployed = jest.fn().mockResolvedValue({
      fileUpdates: { createOrUpdate: [], delete: [] },
      skillFolders: [],
      targetId: 'target-456',
      resolvedAgents: [],
    });

    mockPackmindCliHexa = {
      getDefaultSpace: jest.fn().mockResolvedValue({
        id: 'space-123',
        name: 'Global',
        slug: 'global',
        organizationId: 'org-1',
      }),
      configExists: jest
        .fn()
        .mockImplementation((dir: string) =>
          Promise.resolve(dir === '/project'),
        ),
      readFullConfig: jest
        .fn()
        .mockImplementation((dir: string) =>
          Promise.resolve(
            dir === '/project'
              ? { packages: { 'my-package': '*' }, agents: [] }
              : null,
          ),
        ),
      tryGetGitRepositoryRoot: jest.fn().mockResolvedValue('/project'),
      getGitRemoteUrlFromPath: jest
        .fn()
        .mockReturnValue('git@github.com:org/repo.git'),
      getCurrentBranch: jest.fn().mockReturnValue('main'),
      getPackmindGateway: () => ({
        deployment: { getDeployed: mockGetDeployed },
      }),
    } as unknown as PackmindCliHexa;

    mockExit = jest.fn();
    mockReadFile = jest.fn();

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
      repoRoot,
      exit: mockExit,
      readFile: mockReadFile,
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

    it('displays the standard with updated changeType', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        '  - Standard "My standard" (updated). packmind',
      );
    });

    it('displays the command with created changeType', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        '  - Command "My command" (created). claude',
      );
    });

    it('displays submit hint', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        'Use `packmind playbook submit` to send them',
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
      mockGetDeployed.mockResolvedValue({
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
        targetId: 'target-456',
        resolvedAgents: [],
      });
      mockReadFile.mockReturnValue('local modified content');
    });

    it('displays the untracked header', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith('Changes not tracked:');
    });

    it('displays the untracked artifact', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith('  - Standard "My standard"');
    });

    it('displays add hint', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith(
        'Use `packmind playbook add <path>` to track them',
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
      mockGetDeployed.mockResolvedValue({
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
        targetId: 'target-456',
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
      mockGetDeployed.mockResolvedValue({
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
        targetId: 'target-456',
        resolvedAgents: [],
      });
      mockReadFile.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });
    });

    it('skips the file and shows no untracked changes', async () => {
      await playbookStatusHandler(buildDeps());

      expect(mockLogConsole).toHaveBeenCalledWith('No changes detected.');
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
      mockGetDeployed.mockResolvedValue({
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
        targetId: 'target-456',
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
});
