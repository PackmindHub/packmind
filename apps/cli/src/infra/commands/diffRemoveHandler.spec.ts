import {
  diffRemoveHandler,
  DiffRemoveHandlerDependencies,
} from './diffRemoveHandler';
import { PackmindCliHexa } from '../../PackmindCliHexa';

jest.mock('../utils/consoleLogger', () => ({
  logErrorConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

describe('diffRemoveHandler', () => {
  let mockReadFullConfig: jest.Mock;
  let mockTryGetGitRepositoryRoot: jest.Mock;
  let mockGetGitRemoteUrlFromPath: jest.Mock;
  let mockGetCurrentBranch: jest.Mock;
  let mockGetDeployed: jest.Mock;
  let mockSubmitDiffs: jest.Mock;
  let mockPackmindCliHexa: PackmindCliHexa;
  let mockExit: jest.Mock;
  let mockGetCwd: jest.Mock;
  let mockExistsSync: jest.Mock;
  let mockUnlinkSync: jest.Mock;

  beforeEach(() => {
    const fs = jest.requireMock('fs');
    mockExistsSync = fs.existsSync;
    mockExistsSync.mockReturnValue(true); // Default to file exists
    mockUnlinkSync = fs.unlinkSync;
    mockUnlinkSync.mockReturnValue(undefined); // Default to successful deletion
    mockReadFullConfig = jest.fn().mockResolvedValue({
      packages: { 'test-package': '*' },
      agents: ['packmind'],
    });

    mockTryGetGitRepositoryRoot = jest
      .fn()
      .mockResolvedValue('/project/git-root');
    mockGetGitRemoteUrlFromPath = jest
      .fn()
      .mockReturnValue('https://github.com/org/repo.git');
    mockGetCurrentBranch = jest.fn().mockReturnValue('main');

    mockSubmitDiffs = jest.fn().mockResolvedValue({
      submitted: 1,
      alreadySubmitted: 0,
      skipped: [],
      errors: [],
    });

    mockGetDeployed = jest.fn().mockResolvedValue({
      fileUpdates: {
        createOrUpdate: [
          {
            path: '.packmind/standards/my-standard.md',
            content: '# My Standard\n\n* Rule 1',
            artifactType: 'standard',
            artifactName: 'my-standard',
            artifactId: 'standard-123',
            spaceId: 'space-456',
          },
        ],
        delete: [],
      },
      skillFolders: [],
      targetId: 'target-789',
      packageIds: ['package-001'],
    });

    mockPackmindCliHexa = {
      readFullConfig: mockReadFullConfig,
      tryGetGitRepositoryRoot: mockTryGetGitRepositoryRoot,
      getGitRemoteUrlFromPath: mockGetGitRemoteUrlFromPath,
      getCurrentBranch: mockGetCurrentBranch,
      getPackmindGateway: () => ({
        deployment: { getDeployed: mockGetDeployed },
      }),
      submitDiffs: mockSubmitDiffs,
    } as unknown as PackmindCliHexa;

    mockExit = jest.fn();
    mockGetCwd = jest.fn().mockReturnValue('/project/git-root');
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.stdin.isTTY = true; // Reset to default
  });

  function buildDeps(
    overrides: Partial<DiffRemoveHandlerDependencies> = {},
  ): DiffRemoveHandlerDependencies {
    return {
      packmindCliHexa: mockPackmindCliHexa,
      filePath: '.packmind/standards/my-standard.md',
      message: 'Remove standard from project',
      exit: mockExit,
      getCwd: mockGetCwd,
      ...overrides,
    };
  }

  describe('when filePath is missing', () => {
    it('logs error message', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffRemoveHandler(buildDeps({ filePath: undefined }));

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Missing file path'),
      );
    });

    it('exits with code 1', async () => {
      await diffRemoveHandler(buildDeps({ filePath: undefined }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not call getDeployed', async () => {
      await diffRemoveHandler(buildDeps({ filePath: undefined }));

      expect(mockGetDeployed).not.toHaveBeenCalled();
    });
  });

  describe('when filePath is not in a recognized artefact directory', () => {
    it('logs error message', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffRemoveHandler(buildDeps({ filePath: 'src/index.ts' }));

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Unsupported file path'),
      );
    });

    it('exits with code 1', async () => {
      await diffRemoveHandler(buildDeps({ filePath: 'src/index.ts' }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not call getDeployed', async () => {
      await diffRemoveHandler(buildDeps({ filePath: 'src/index.ts' }));

      expect(mockGetDeployed).not.toHaveBeenCalled();
    });
  });

  describe('when message is not provided in non-interactive mode', () => {
    beforeEach(() => {
      process.stdin.isTTY = false;
    });

    it('logs error message', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffRemoveHandler(buildDeps({ message: undefined }));

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Non-interactive mode requires -m flag'),
      );
    });

    it('exits with code 1', async () => {
      await diffRemoveHandler(buildDeps({ message: undefined }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not call submitDiffs', async () => {
      await diffRemoveHandler(buildDeps({ message: undefined }));

      expect(mockSubmitDiffs).not.toHaveBeenCalled();
    });
  });

  describe('when message is empty', () => {
    it('logs error message', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffRemoveHandler(buildDeps({ message: '' }));

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Message cannot be empty'),
      );
    });

    it('exits with code 1', async () => {
      await diffRemoveHandler(buildDeps({ message: '' }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not call submitDiffs', async () => {
      await diffRemoveHandler(buildDeps({ message: '' }));

      expect(mockSubmitDiffs).not.toHaveBeenCalled();
    });
  });

  describe('when file does not exist', () => {
    beforeEach(() => {
      mockExistsSync.mockReturnValue(false);
    });

    it('logs error message', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffRemoveHandler(buildDeps());

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('File or directory does not exist'),
      );
    });

    it('exits with code 1', async () => {
      await diffRemoveHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not call getDeployed', async () => {
      await diffRemoveHandler(buildDeps());

      expect(mockGetDeployed).not.toHaveBeenCalled();
    });
  });

  describe('when config parsing fails', () => {
    beforeEach(() => {
      mockReadFullConfig.mockRejectedValue(
        new Error('Invalid JSON in packmind.json'),
      );
    });

    it('logs failed to parse message', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffRemoveHandler(buildDeps());

      expect(logErrorConsole).toHaveBeenCalledWith(
        'Failed to parse packmind.json',
      );
    });

    it('logs the error details', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffRemoveHandler(buildDeps());

      expect(logErrorConsole).toHaveBeenCalledWith(
        'Invalid JSON in packmind.json',
      );
    });

    it('exits with code 1', async () => {
      await diffRemoveHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when no packages are configured', () => {
    beforeEach(() => {
      mockReadFullConfig.mockResolvedValue({
        packages: {},
      });
    });

    it('logs error message', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffRemoveHandler(buildDeps());

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('No packages configured'),
      );
    });

    it('exits with code 1', async () => {
      await diffRemoveHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when git repository info cannot be determined', () => {
    describe('when not in a git repository', () => {
      beforeEach(() => {
        mockTryGetGitRepositoryRoot.mockResolvedValue(null);
      });

      it('logs error message', async () => {
        const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

        await diffRemoveHandler(buildDeps());

        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('Could not determine git repository info'),
        );
      });

      it('exits with code 1', async () => {
        await diffRemoveHandler(buildDeps());

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when git remote URL is missing', () => {
      beforeEach(() => {
        mockGetGitRemoteUrlFromPath.mockImplementation(() => {
          throw new Error('No remote configured');
        });
      });

      it('logs error message', async () => {
        const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

        await diffRemoveHandler(buildDeps());

        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('Could not determine git repository info'),
        );
      });

      it('exits with code 1', async () => {
        await diffRemoveHandler(buildDeps());

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('when artifact is not deployed by Packmind', () => {
    beforeEach(() => {
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/standards/another-standard.md',
              content: '# Another Standard\n\n* Rule 1',
              artifactType: 'standard',
              artifactName: 'another-standard',
            },
          ],
          delete: [],
        },
        skillFolders: [],
      });
    });

    it('logs error message for standard', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffRemoveHandler(buildDeps());

      expect(logErrorConsole).toHaveBeenCalledWith(
        'This standard does not come from Packmind',
      );
    });

    it('logs error message for command', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffRemoveHandler(
        buildDeps({ filePath: '.packmind/commands/my-command.md' }),
      );

      expect(logErrorConsole).toHaveBeenCalledWith(
        'This command does not come from Packmind',
      );
    });

    it('logs error message for skill', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      // Use claude skill path since packmind doesn't support skills (empty path)
      await diffRemoveHandler(
        buildDeps({ filePath: '.claude/skills/my-skill/SKILL.md' }),
      );

      expect(logErrorConsole).toHaveBeenCalledWith(
        'This skill does not come from Packmind',
      );
    });

    it('exits with code 1', async () => {
      await diffRemoveHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when artifact is deployed by Packmind', () => {
    it('submits change proposal for removal', async () => {
      await diffRemoveHandler(buildDeps());

      expect(mockSubmitDiffs).toHaveBeenCalledWith(
        [
          [
            expect.objectContaining({
              type: 'removeStandard',
              payload: {
                targetId: 'target-789',
                packageIds: ['package-001'],
              },
              artifactId: 'standard-123',
              spaceId: 'space-456',
            }),
          ],
        ],
        'Remove standard from project',
      );
    });

    it('logs success message', async () => {
      const { logSuccessConsole } = jest.requireMock('../utils/consoleLogger');

      await diffRemoveHandler(buildDeps());

      expect(logSuccessConsole).toHaveBeenCalledWith(
        'Change proposal for removal submitted successfully',
      );
    });

    it('exits with code 0', async () => {
      await diffRemoveHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('deletes the file', async () => {
      await diffRemoveHandler(buildDeps());

      expect(mockUnlinkSync).toHaveBeenCalledWith(
        '/project/git-root/.packmind/standards/my-standard.md',
      );
    });

    it('logs file deletion success message', async () => {
      const { logSuccessConsole } = jest.requireMock('../utils/consoleLogger');

      await diffRemoveHandler(buildDeps());

      expect(logSuccessConsole).toHaveBeenCalledWith(
        'File deleted: .packmind/standards/my-standard.md',
      );
    });

    it('calls getDeployed with correct parameters', async () => {
      await diffRemoveHandler(buildDeps());

      expect(mockGetDeployed).toHaveBeenCalledWith({
        packagesSlugs: ['test-package'],
        gitRemoteUrl: 'https://github.com/org/repo.git',
        gitBranch: 'main',
        relativePath: '/',
        agents: ['packmind'],
      });
    });
  });

  describe('when working in a subdirectory', () => {
    beforeEach(() => {
      mockGetCwd.mockReturnValue('/project/git-root/apps/frontend');
      // The file path in createOrUpdate is relative to git root
      mockGetDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: 'apps/frontend/.packmind/standards/my-standard.md',
              content: '# My Standard\n\n* Rule 1',
              artifactType: 'standard',
              artifactName: 'my-standard',
              artifactId: 'standard-123',
              spaceId: 'space-456',
            },
          ],
          delete: [],
        },
        skillFolders: [],
        targetId: 'target-789',
        packageIds: ['package-001'],
      });
    });

    describe('when file exists in deployed content', () => {
      it('logs success message', async () => {
        const { logSuccessConsole } = jest.requireMock(
          '../utils/consoleLogger',
        );

        // Use absolute path within the subdirectory
        await diffRemoveHandler(
          buildDeps({
            filePath:
              '/project/git-root/apps/frontend/.packmind/standards/my-standard.md',
          }),
        );

        expect(logSuccessConsole).toHaveBeenCalledWith(
          'Change proposal for removal submitted successfully',
        );
      });

      it('exits with code 0', async () => {
        // Use absolute path within the subdirectory
        await diffRemoveHandler(
          buildDeps({
            filePath:
              '/project/git-root/apps/frontend/.packmind/standards/my-standard.md',
          }),
        );

        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    it('passes correct relativePath to getDeployed', async () => {
      await diffRemoveHandler(
        buildDeps({
          filePath:
            '/project/git-root/apps/frontend/.packmind/standards/my-standard.md',
        }),
      );

      expect(mockGetDeployed).toHaveBeenCalledWith({
        packagesSlugs: ['test-package'],
        gitRemoteUrl: 'https://github.com/org/repo.git',
        gitBranch: 'main',
        relativePath: '/apps/frontend/',
        agents: ['packmind'],
      });
    });
  });

  describe('when file deletion fails', () => {
    beforeEach(() => {
      mockUnlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
    });

    it('logs error message', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffRemoveHandler(buildDeps());

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete file'),
      );
    });

    it('exits with code 1', async () => {
      await diffRemoveHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('still submits the change proposal', async () => {
      await diffRemoveHandler(buildDeps());

      expect(mockSubmitDiffs).toHaveBeenCalled();
    });
  });
});
