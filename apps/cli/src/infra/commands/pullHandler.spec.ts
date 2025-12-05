import { PackmindCliHexa } from '../../PackmindCliHexa';
import {
  listPackagesHandler,
  showPackageHandler,
  pullPackagesHandler,
  PullHandlerDependencies,
} from './pullHandler';

// Mock the consoleLogger module to avoid chalk ESM issues
jest.mock('../utils/consoleLogger', () => ({
  logWarningConsole: jest.fn(),
  formatSlug: jest.fn((slug: string) => slug),
  formatLabel: jest.fn((label: string) => label),
}));

describe('pullHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockExit: jest.Mock;
  let mockGetCwd: jest.Mock;
  let mockLog: jest.Mock;
  let mockError: jest.Mock;
  let deps: PullHandlerDependencies;

  beforeEach(() => {
    mockPackmindCliHexa = {
      listPackages: jest.fn(),
      getPackageBySlug: jest.fn(),
      readConfig: jest.fn(),
      writeConfig: jest.fn(),
      pullData: jest.fn(),
      tryGetGitRepositoryRoot: jest.fn(),
      getGitRemoteUrlFromPath: jest.fn(),
      getCurrentBranch: jest.fn(),
      notifyDistribution: jest.fn(),
    } as unknown as jest.Mocked<PackmindCliHexa>;

    mockExit = jest.fn();
    mockGetCwd = jest.fn().mockReturnValue('/project');
    mockLog = jest.fn();
    mockError = jest.fn();

    deps = {
      packmindCliHexa: mockPackmindCliHexa,
      exit: mockExit,
      getCwd: mockGetCwd,
      log: mockLog,
      error: mockError,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listPackagesHandler', () => {
    describe('when packages are found', () => {
      it('displays sorted packages and exits with 0', async () => {
        mockPackmindCliHexa.listPackages.mockResolvedValue([
          {
            slug: 'zebra',
            name: 'Zebra Package',
            description: 'A zebra package',
          },
          {
            slug: 'alpha',
            name: 'Alpha Package',
            description: 'An alpha package',
          },
        ]);

        await listPackagesHandler({}, deps);

        expect(mockLog).toHaveBeenCalledWith(
          'Fetching available packages...\n',
        );
        expect(mockLog).toHaveBeenCalledWith('Available packages:\n');
        // First package should be alpha (sorted)
        expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('alpha'));
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when no packages are found', () => {
      it('displays message and exits with 0', async () => {
        mockPackmindCliHexa.listPackages.mockResolvedValue([]);

        await listPackagesHandler({}, deps);

        expect(mockLog).toHaveBeenCalledWith('No packages found.');
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when listing fails', () => {
      it('displays error and exits with 1', async () => {
        mockPackmindCliHexa.listPackages.mockRejectedValue(
          new Error('Network error'),
        );

        await listPackagesHandler({}, deps);

        expect(mockError).toHaveBeenCalledWith('\n❌ Failed to list packages:');
        expect(mockError).toHaveBeenCalledWith('   Network error');
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('showPackageHandler', () => {
    describe('when package is found', () => {
      it('displays package details and exits with 0', async () => {
        mockPackmindCliHexa.getPackageBySlug.mockResolvedValue({
          name: 'Test Package',
          slug: 'test-package',
          description: 'A test package',
          standards: [{ name: 'Standard 1', summary: 'A standard' }],
          recipes: [{ name: 'Recipe 1', summary: 'A recipe' }],
        });

        await showPackageHandler({ slug: 'test-package' }, deps);

        expect(mockLog).toHaveBeenCalledWith(
          "Fetching package details for 'test-package'...\n",
        );
        expect(mockLog).toHaveBeenCalledWith('Test Package (test-package):\n');
        expect(mockLog).toHaveBeenCalledWith('A test package\n');
        expect(mockLog).toHaveBeenCalledWith('Standards:');
        expect(mockLog).toHaveBeenCalledWith('Recipes:');
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when package is not found', () => {
      it('displays error and exits with 1', async () => {
        mockPackmindCliHexa.getPackageBySlug.mockRejectedValue(
          new Error('Package not found'),
        );

        await showPackageHandler({ slug: 'non-existent' }, deps);

        expect(mockError).toHaveBeenCalledWith(
          '\n❌ Failed to fetch package details:',
        );
        expect(mockError).toHaveBeenCalledWith('   Package not found');
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('pullPackagesHandler', () => {
    describe('when config parsing fails', () => {
      it('displays error and exits with 1', async () => {
        mockPackmindCliHexa.readConfig.mockRejectedValue(
          new Error('Invalid JSON'),
        );

        await pullPackagesHandler({ packagesSlugs: [] }, deps);

        expect(mockError).toHaveBeenCalledWith(
          'ERROR Failed to parse packmind.json',
        );
        expect(mockError).toHaveBeenCalledWith('ERROR Invalid JSON');
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when no packages provided and no config', () => {
      it('displays help and exits with 0', async () => {
        mockPackmindCliHexa.readConfig.mockResolvedValue([]);

        await pullPackagesHandler({ packagesSlugs: [] }, deps);

        expect(mockLog).toHaveBeenCalledWith(
          'Usage: packmind-cli install <package-slug> [package-slug...]',
        );
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when pull succeeds with no file changes', () => {
      it('does not notify distribution', async () => {
        mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
        mockPackmindCliHexa.pullData.mockResolvedValue({
          filesCreated: 0,
          filesUpdated: 0,
          filesDeleted: 0,
          recipesCount: 0,
          standardsCount: 0,
          errors: [],
        });

        const result = await pullPackagesHandler({ packagesSlugs: [] }, deps);

        expect(mockPackmindCliHexa.notifyDistribution).not.toHaveBeenCalled();
        expect(result.notificationSent).toBe(false);
      });
    });

    describe('when pull succeeds with file changes but not in git repo', () => {
      it('does not notify distribution', async () => {
        mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
        mockPackmindCliHexa.pullData.mockResolvedValue({
          filesCreated: 2,
          filesUpdated: 1,
          filesDeleted: 0,
          recipesCount: 1,
          standardsCount: 1,
          errors: [],
        });
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);

        const result = await pullPackagesHandler({ packagesSlugs: [] }, deps);

        expect(mockPackmindCliHexa.notifyDistribution).not.toHaveBeenCalled();
        expect(result.notificationSent).toBe(false);
      });
    });

    describe('when pull succeeds with file changes in git repo', () => {
      beforeEach(() => {
        mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
        mockPackmindCliHexa.pullData.mockResolvedValue({
          filesCreated: 2,
          filesUpdated: 1,
          filesDeleted: 0,
          recipesCount: 1,
          standardsCount: 1,
          errors: [],
        });
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
          '/project',
        );
        mockPackmindCliHexa.getGitRemoteUrlFromPath.mockReturnValue(
          'git@github.com:org/repo.git',
        );
        mockPackmindCliHexa.getCurrentBranch.mockReturnValue('main');
      });

      it('notifies distribution', async () => {
        mockPackmindCliHexa.notifyDistribution.mockResolvedValue({
          deploymentId: 'deployment-123',
        });

        const result = await pullPackagesHandler({ packagesSlugs: [] }, deps);

        expect(mockPackmindCliHexa.notifyDistribution).toHaveBeenCalledWith({
          distributedPackages: ['backend'],
          gitRemoteUrl: 'git@github.com:org/repo.git',
          gitBranch: 'main',
          relativePath: '/',
        });
        expect(mockLog).toHaveBeenCalledWith(
          'Successfully notified Packmind of the new distribution',
        );
        expect(result.notificationSent).toBe(true);
      });

      it('calculates relative path correctly in subdirectory', async () => {
        mockGetCwd.mockReturnValue('/project/src/frontend');
        mockPackmindCliHexa.notifyDistribution.mockResolvedValue({
          deploymentId: 'deployment-123',
        });

        await pullPackagesHandler({ packagesSlugs: [] }, deps);

        expect(mockPackmindCliHexa.notifyDistribution).toHaveBeenCalledWith(
          expect.objectContaining({
            relativePath: '/src/frontend/',
          }),
        );
      });

      describe('when notification fails', () => {
        it('silently ignores the error and continues', async () => {
          mockPackmindCliHexa.notifyDistribution.mockRejectedValue(
            new Error('Network error'),
          );

          const result = await pullPackagesHandler({ packagesSlugs: [] }, deps);

          expect(mockLog).not.toHaveBeenCalledWith(
            'Successfully notified Packmind of the new distribution',
          );
          expect(result.notificationSent).toBe(false);
          // Should not exit with error
          expect(mockExit).not.toHaveBeenCalledWith(1);
        });
      });
    });

    describe('when pull fails with 404 error', () => {
      it('displays package not found error and exits with 1', async () => {
        mockPackmindCliHexa.readConfig.mockResolvedValue([]);
        const error = new Error('Package not found') as Error & {
          statusCode: number;
        };
        error.statusCode = 404;
        mockPackmindCliHexa.pullData.mockRejectedValue(error);

        await pullPackagesHandler({ packagesSlugs: ['non-existent'] }, deps);

        expect(mockError).toHaveBeenCalledWith(
          '\n❌ Failed to install content:',
        );
        expect(mockError).toHaveBeenCalledWith('   Package not found');
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when pull has errors in result', () => {
      it('displays errors and exits with 1', async () => {
        mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
        mockPackmindCliHexa.pullData.mockResolvedValue({
          filesCreated: 1,
          filesUpdated: 0,
          filesDeleted: 0,
          recipesCount: 1,
          standardsCount: 0,
          errors: ['Failed to write file: permission denied'],
        });

        const result = await pullPackagesHandler({ packagesSlugs: [] }, deps);

        expect(mockLog).toHaveBeenCalledWith('\n⚠️  Errors encountered:');
        expect(mockLog).toHaveBeenCalledWith(
          '   - Failed to write file: permission denied',
        );
        expect(mockExit).toHaveBeenCalledWith(1);
        expect(result.notificationSent).toBe(false);
      });
    });

    describe('when initializing new config', () => {
      it('logs initialization message', async () => {
        mockPackmindCliHexa.readConfig.mockResolvedValue([]);
        mockPackmindCliHexa.pullData.mockResolvedValue({
          filesCreated: 1,
          filesUpdated: 0,
          filesDeleted: 0,
          recipesCount: 1,
          standardsCount: 0,
          errors: [],
        });
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);

        await pullPackagesHandler({ packagesSlugs: ['backend'] }, deps);

        expect(mockLog).toHaveBeenCalledWith('INFO initializing packmind.json');
      });
    });

    describe('when updating existing config', () => {
      it('does not log initialization message', async () => {
        mockPackmindCliHexa.readConfig.mockResolvedValue(['frontend']);
        mockPackmindCliHexa.pullData.mockResolvedValue({
          filesCreated: 1,
          filesUpdated: 0,
          filesDeleted: 0,
          recipesCount: 1,
          standardsCount: 0,
          errors: [],
        });
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);

        await pullPackagesHandler({ packagesSlugs: ['backend'] }, deps);

        expect(mockLog).not.toHaveBeenCalledWith(
          'INFO initializing packmind.json',
        );
      });
    });

    describe('when merging config and cli packages', () => {
      it('deduplicates packages', async () => {
        mockPackmindCliHexa.readConfig.mockResolvedValue([
          'backend',
          'frontend',
        ]);
        mockPackmindCliHexa.pullData.mockResolvedValue({
          filesCreated: 0,
          filesUpdated: 0,
          filesDeleted: 0,
          recipesCount: 0,
          standardsCount: 0,
          errors: [],
        });
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);

        await pullPackagesHandler({ packagesSlugs: ['backend', 'api'] }, deps);

        expect(mockPackmindCliHexa.pullData).toHaveBeenCalledWith({
          baseDirectory: '/project',
          packagesSlugs: ['backend', 'frontend', 'api'],
        });
      });
    });
  });
});
