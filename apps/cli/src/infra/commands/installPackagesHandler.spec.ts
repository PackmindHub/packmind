import { PackmindCliHexa } from '../../PackmindCliHexa';
import {
  listPackagesHandler,
  showPackageHandler,
  installPackagesHandler,
  uninstallPackagesHandler,
  recursiveInstallHandler,
  statusHandler,
  InstallHandlerDependencies,
} from './installPackagesHandler';
import { createPackageId, createSpaceId, createUserId } from '@packmind/types';

// Mock the consoleLogger module to avoid chalk ESM issues
jest.mock('../utils/consoleLogger', () => ({
  logWarningConsole: jest.fn(),
  formatSlug: jest.fn((slug: string) => slug),
  formatLabel: jest.fn((label: string) => label),
}));

describe('installPackagesHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockExit: jest.Mock;
  let mockGetCwd: jest.Mock;
  let mockLog: jest.Mock;
  let mockError: jest.Mock;
  let deps: InstallHandlerDependencies;

  beforeEach(() => {
    mockPackmindCliHexa = {
      listPackages: jest.fn(),
      getPackageBySlug: jest.fn(),
      configExists: jest.fn(),
      readConfig: jest.fn(),
      writeConfig: jest.fn(),
      installPackages: jest.fn(),
      tryGetGitRepositoryRoot: jest.fn(),
      getGitRemoteUrlFromPath: jest.fn(),
      getCurrentBranch: jest.fn(),
      notifyDistribution: jest.fn(),
      findAllConfigsInTree: jest.fn(),
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
            id: createPackageId('zebra'),
            spaceId: createSpaceId('my-space'),
            createdBy: createUserId('my-user'),
            recipes: [],
            standards: [],
          },
          {
            slug: 'alpha',
            name: 'Alpha Package',
            description: 'An alpha package',
            id: createPackageId('alpha'),
            spaceId: createSpaceId('my-space'),
            createdBy: createUserId('my-user'),
            recipes: [],
            standards: [],
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

  describe('installPackagesHandler', () => {
    describe('when config parsing fails', () => {
      it('displays error and exits with 1', async () => {
        mockPackmindCliHexa.readConfig.mockRejectedValue(
          new Error('Invalid JSON'),
        );

        await installPackagesHandler({ packagesSlugs: [] }, deps);

        expect(mockError).toHaveBeenCalledWith(
          'ERROR Failed to parse packmind.json',
        );
        expect(mockError).toHaveBeenCalledWith('ERROR Invalid JSON');
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when no packages provided and no config file', () => {
      it('displays help with "not found" message and exits with 0', async () => {
        mockPackmindCliHexa.configExists.mockResolvedValue(false);
        mockPackmindCliHexa.readConfig.mockResolvedValue([]);

        await installPackagesHandler({ packagesSlugs: [] }, deps);

        expect(mockLog).toHaveBeenCalledWith(
          'Usage: packmind-cli install <package-slug> [package-slug...]',
        );
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when no packages provided and config file is empty', () => {
      it('displays help with "is empty" message and exits with 0', async () => {
        mockPackmindCliHexa.configExists.mockResolvedValue(true);
        mockPackmindCliHexa.readConfig.mockResolvedValue([]);

        await installPackagesHandler({ packagesSlugs: [] }, deps);

        expect(mockLog).toHaveBeenCalledWith(
          'Usage: packmind-cli install <package-slug> [package-slug...]',
        );
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when install succeeds with no file changes', () => {
      it('does not notify distribution', async () => {
        mockPackmindCliHexa.configExists.mockResolvedValue(true);
        mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 0,
          filesUpdated: 0,
          filesDeleted: 0,
          recipesCount: 0,
          standardsCount: 0,
          errors: [],
        });

        const result = await installPackagesHandler(
          { packagesSlugs: [] },
          deps,
        );

        expect(mockPackmindCliHexa.notifyDistribution).not.toHaveBeenCalled();
        expect(result.notificationSent).toBe(false);
      });
    });

    describe('when install succeeds with file changes but not in git repo', () => {
      it('does not notify distribution', async () => {
        mockPackmindCliHexa.configExists.mockResolvedValue(true);
        mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 2,
          filesUpdated: 1,
          filesDeleted: 0,
          recipesCount: 1,
          standardsCount: 1,
          errors: [],
        });
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);

        const result = await installPackagesHandler(
          { packagesSlugs: [] },
          deps,
        );

        expect(mockPackmindCliHexa.notifyDistribution).not.toHaveBeenCalled();
        expect(result.notificationSent).toBe(false);
      });
    });

    describe('when install succeeds with file changes in git repo', () => {
      beforeEach(() => {
        mockPackmindCliHexa.configExists.mockResolvedValue(true);
        mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
        mockPackmindCliHexa.installPackages.mockResolvedValue({
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

        const result = await installPackagesHandler(
          { packagesSlugs: [] },
          deps,
        );

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

        await installPackagesHandler({ packagesSlugs: [] }, deps);

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

          const result = await installPackagesHandler(
            { packagesSlugs: [] },
            deps,
          );

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
        mockPackmindCliHexa.configExists.mockResolvedValue(false);
        mockPackmindCliHexa.readConfig.mockResolvedValue([]);
        const error = new Error('Package not found') as Error & {
          statusCode: number;
        };
        error.statusCode = 404;
        mockPackmindCliHexa.installPackages.mockRejectedValue(error);

        await installPackagesHandler({ packagesSlugs: ['non-existent'] }, deps);

        expect(mockError).toHaveBeenCalledWith(
          '\n❌ Failed to install content:',
        );
        expect(mockError).toHaveBeenCalledWith('   Package not found');
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when pull has errors in result', () => {
      it('displays errors and exits with 1', async () => {
        mockPackmindCliHexa.configExists.mockResolvedValue(true);
        mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 1,
          filesUpdated: 0,
          filesDeleted: 0,
          recipesCount: 1,
          standardsCount: 0,
          errors: ['Failed to write file: permission denied'],
        });

        const result = await installPackagesHandler(
          { packagesSlugs: [] },
          deps,
        );

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
        mockPackmindCliHexa.configExists.mockResolvedValue(false);
        mockPackmindCliHexa.readConfig.mockResolvedValue([]);
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 1,
          filesUpdated: 0,
          filesDeleted: 0,
          recipesCount: 1,
          standardsCount: 0,
          errors: [],
        });
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);

        await installPackagesHandler({ packagesSlugs: ['backend'] }, deps);

        expect(mockLog).toHaveBeenCalledWith('INFO initializing packmind.json');
      });
    });

    describe('when updating existing config', () => {
      it('does not log initialization message', async () => {
        mockPackmindCliHexa.configExists.mockResolvedValue(true);
        mockPackmindCliHexa.readConfig.mockResolvedValue(['frontend']);
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 1,
          filesUpdated: 0,
          filesDeleted: 0,
          recipesCount: 1,
          standardsCount: 0,
          errors: [],
        });
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);

        await installPackagesHandler({ packagesSlugs: ['backend'] }, deps);

        expect(mockLog).not.toHaveBeenCalledWith(
          'INFO initializing packmind.json',
        );
      });
    });

    describe('when merging config and cli packages', () => {
      it('deduplicates packages', async () => {
        mockPackmindCliHexa.configExists.mockResolvedValue(true);
        mockPackmindCliHexa.readConfig.mockResolvedValue([
          'backend',
          'frontend',
        ]);
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 0,
          filesUpdated: 0,
          filesDeleted: 0,
          recipesCount: 0,
          standardsCount: 0,
          errors: [],
        });
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);

        await installPackagesHandler(
          { packagesSlugs: ['backend', 'api'] },
          deps,
        );

        expect(mockPackmindCliHexa.installPackages).toHaveBeenCalledWith({
          baseDirectory: '/project',
          packagesSlugs: ['backend', 'frontend', 'api'],
          previousPackagesSlugs: ['backend', 'frontend'],
        });
      });
    });
  });

  describe('uninstallPackagesHandler', () => {
    describe('when no packages specified', () => {
      it('displays error and exits with 1', async () => {
        await uninstallPackagesHandler({ packagesSlugs: [] }, deps);

        expect(mockError).toHaveBeenCalledWith('❌ No packages specified.');
        expect(mockLog).toHaveBeenCalledWith(
          'Usage: packmind-cli uninstall <package-slug> [package-slug...]',
        );
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when config file does not exist', () => {
      it('displays "not found" error and exits with 1', async () => {
        mockPackmindCliHexa.configExists.mockResolvedValue(false);
        mockPackmindCliHexa.readConfig.mockResolvedValue([]);

        await uninstallPackagesHandler({ packagesSlugs: ['backend'] }, deps);

        expect(mockError).toHaveBeenCalledWith(
          '❌ No packmind.json found in current directory.',
        );
        expect(mockLog).toHaveBeenCalledWith('');
        expect(mockLog).toHaveBeenCalledWith(
          '💡 There are no packages to uninstall.',
        );
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when config file is empty', () => {
      it('displays "is empty" error and exits with 1', async () => {
        mockPackmindCliHexa.configExists.mockResolvedValue(true);
        mockPackmindCliHexa.readConfig.mockResolvedValue([]);

        await uninstallPackagesHandler({ packagesSlugs: ['backend'] }, deps);

        expect(mockError).toHaveBeenCalledWith('❌ packmind.json is empty.');
        expect(mockLog).toHaveBeenCalledWith('');
        expect(mockLog).toHaveBeenCalledWith(
          '💡 There are no packages to uninstall.',
        );
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('statusHandler', () => {
    describe('when no configs are found', () => {
      beforeEach(() => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
          '/project',
        );
        mockPackmindCliHexa.findAllConfigsInTree.mockResolvedValue({
          configs: [],
          hasConfigs: false,
          basePath: '/project',
        });
      });

      it('displays no configs message', async () => {
        await statusHandler({}, deps);

        expect(mockLog).toHaveBeenCalledWith(
          'No packmind.json available in this workspace.',
        );
      });

      it('exits with 0', async () => {
        await statusHandler({}, deps);

        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when configs are found', () => {
      it('displays table header with Packages column', async () => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
          '/project',
        );
        mockPackmindCliHexa.findAllConfigsInTree.mockResolvedValue({
          configs: [
            {
              targetPath: '/',
              absoluteTargetPath: '/project',
              packages: { generic: '*' },
            },
          ],
          hasConfigs: true,
          basePath: '/project',
        });

        await statusHandler({}, deps);

        expect(mockLog).toHaveBeenCalledWith(
          expect.stringContaining('Packages'),
        );
      });

      it('displays separator line', async () => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
          '/project',
        );
        mockPackmindCliHexa.findAllConfigsInTree.mockResolvedValue({
          configs: [
            {
              targetPath: '/',
              absoluteTargetPath: '/project',
              packages: { generic: '*' },
            },
          ],
          hasConfigs: true,
          basePath: '/project',
        });

        await statusHandler({}, deps);

        expect(mockLog).toHaveBeenCalledWith(expect.stringMatching(/^-+$/));
      });

      it('sorts packages alphabetically within each row', async () => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
          '/project',
        );
        mockPackmindCliHexa.findAllConfigsInTree.mockResolvedValue({
          configs: [
            {
              targetPath: '/',
              absoluteTargetPath: '/project',
              packages: { zebra: '*', alpha: '*', middle: '*' },
            },
          ],
          hasConfigs: true,
          basePath: '/project',
        });

        await statusHandler({}, deps);

        expect(mockLog).toHaveBeenCalledWith(
          expect.stringContaining('alpha, middle, zebra'),
        );
      });

      describe('when packmind.json has empty packages', () => {
        it('displays <no packages>', async () => {
          mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
            '/project',
          );
          mockPackmindCliHexa.findAllConfigsInTree.mockResolvedValue({
            configs: [
              {
                targetPath: '/',
                absoluteTargetPath: '/project',
                packages: {},
              },
            ],
            hasConfigs: true,
            basePath: '/project',
          });

          await statusHandler({}, deps);

          expect(mockLog).toHaveBeenCalledWith(
            expect.stringContaining('<no packages>'),
          );
        });
      });

      it('displays unique package count summary with deduplication', async () => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
          '/project',
        );
        mockPackmindCliHexa.findAllConfigsInTree.mockResolvedValue({
          configs: [
            {
              targetPath: '/',
              absoluteTargetPath: '/project',
              packages: { backend: '*', shared: '*' },
            },
            {
              targetPath: '/apps/api',
              absoluteTargetPath: '/project/apps/api',
              packages: { backend: '*', nestjs: '*' },
            },
          ],
          hasConfigs: true,
          basePath: '/project',
        });

        await statusHandler({}, deps);

        expect(mockLog).toHaveBeenCalledWith(
          '\n3 unique packages currently installed.',
        );
      });

      describe('when only 1 unique package', () => {
        it('displays singular form', async () => {
          mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
            '/project',
          );
          mockPackmindCliHexa.findAllConfigsInTree.mockResolvedValue({
            configs: [
              {
                targetPath: '/',
                absoluteTargetPath: '/project',
                packages: { backend: '*' },
              },
            ],
            hasConfigs: true,
            basePath: '/project',
          });

          await statusHandler({}, deps);

          expect(mockLog).toHaveBeenCalledWith(
            '\n1 unique package currently installed.',
          );
        });
      });

      describe('when not in git repo', () => {
        it('uses cwd as fallback', async () => {
          mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);
          mockPackmindCliHexa.findAllConfigsInTree.mockResolvedValue({
            configs: [
              {
                targetPath: '/',
                absoluteTargetPath: '/project',
                packages: { test: '*' },
              },
            ],
            hasConfigs: true,
            basePath: '/project',
          });

          const result = await statusHandler({}, deps);

          expect(result.basePath).toBe('/project');
        });
      });

      it('returns configs in result', async () => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
          '/project',
        );
        const mockConfigs = [
          {
            targetPath: '/',
            absoluteTargetPath: '/project',
            packages: { test: '*' },
          },
        ];
        mockPackmindCliHexa.findAllConfigsInTree.mockResolvedValue({
          configs: mockConfigs,
          hasConfigs: true,
          basePath: '/project',
        });

        const result = await statusHandler({}, deps);

        expect(result.configs).toEqual(mockConfigs);
      });
    });

    describe('when status fails', () => {
      beforeEach(() => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockRejectedValue(
          new Error('Git error'),
        );
      });

      it('displays error message', async () => {
        await statusHandler({}, deps);

        expect(mockError).toHaveBeenCalledWith(
          '\n❌ Failed to get workspace overview:',
        );
      });

      it('displays error details', async () => {
        await statusHandler({}, deps);

        expect(mockError).toHaveBeenCalledWith('   Git error');
      });

      it('exits with 1', async () => {
        await statusHandler({}, deps);

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('recursivePullHandler', () => {
    describe('when no packmind.json files are found', () => {
      beforeEach(() => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
          '/project',
        );
        mockPackmindCliHexa.findAllConfigsInTree.mockResolvedValue({
          configs: [],
          hasConfigs: false,
          basePath: '/project',
        });
      });

      it('displays help message', async () => {
        await recursiveInstallHandler({}, deps);

        expect(mockLog).toHaveBeenCalledWith(
          'No packmind.json files found in this repository.',
        );
      });

      it('exits with 0', async () => {
        await recursiveInstallHandler({}, deps);

        expect(mockExit).toHaveBeenCalledWith(0);
      });

      it('returns zero counts', async () => {
        const result = await recursiveInstallHandler({}, deps);

        expect(result.directoriesProcessed).toBe(0);
        expect(result.totalFilesCreated).toBe(0);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('when packmind.json files are found', () => {
      beforeEach(() => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
          '/project',
        );
        mockPackmindCliHexa.findAllConfigsInTree.mockResolvedValue({
          configs: [
            {
              targetPath: '/',
              absoluteTargetPath: '/project',
              packages: { backend: '*' },
            },
            {
              targetPath: '/apps/api',
              absoluteTargetPath: '/project/apps/api',
              packages: { nestjs: '*' },
            },
          ],
          hasConfigs: true,
          basePath: '/project',
        });
      });

      it('displays count of files to process', async () => {
        mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 0,
          filesUpdated: 0,
          filesDeleted: 0,
          recipesCount: 0,
          standardsCount: 0,
          errors: [],
        });
        await recursiveInstallHandler({}, deps);

        expect(mockLog).toHaveBeenCalledWith(
          'Found 2 packmind.json file(s) to process\n',
        );
      });

      it('processes each directory', async () => {
        mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 3,
          filesUpdated: 1,
          filesDeleted: 0,
          recipesCount: 2,
          standardsCount: 1,
          errors: [],
        });

        const result = await recursiveInstallHandler({}, deps);

        expect(result.directoriesProcessed).toBe(2);
        expect(mockPackmindCliHexa.installPackages).toHaveBeenCalledTimes(2);
      });

      it('aggregates file counts from all directories', async () => {
        mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 3,
          filesUpdated: 1,
          filesDeleted: 2,
          recipesCount: 2,
          standardsCount: 1,
          errors: [],
        });

        const result = await recursiveInstallHandler({}, deps);

        expect(result.totalFilesCreated).toBe(6);
        expect(result.totalFilesUpdated).toBe(2);
        expect(result.totalFilesDeleted).toBe(4);
      });

      it('displays summary at the end', async () => {
        mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 3,
          filesUpdated: 1,
          filesDeleted: 0,
          recipesCount: 2,
          standardsCount: 1,
          errors: [],
        });

        await recursiveInstallHandler({}, deps);

        expect(mockLog).toHaveBeenCalledWith(
          'Summary: 2 directories processed, 6 files added, 2 changed, 0 removed',
        );
      });

      it('exits with 0', async () => {
        mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 0,
          filesUpdated: 0,
          filesDeleted: 0,
          recipesCount: 0,
          standardsCount: 0,
          errors: [],
        });

        await recursiveInstallHandler({}, deps);

        expect(mockExit).toHaveBeenCalledWith(0);
      });

      describe('notification', () => {
        it('notifies distribution for each directory with file changes', async () => {
          mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
          mockPackmindCliHexa.installPackages.mockResolvedValue({
            filesCreated: 2,
            filesUpdated: 1,
            filesDeleted: 0,
            recipesCount: 1,
            standardsCount: 1,
            errors: [],
          });
          mockPackmindCliHexa.getGitRemoteUrlFromPath.mockReturnValue(
            'git@github.com:org/repo.git',
          );
          mockPackmindCliHexa.getCurrentBranch.mockReturnValue('main');
          mockPackmindCliHexa.notifyDistribution.mockResolvedValue({
            deploymentId: 'deployment-123',
          });

          await recursiveInstallHandler({}, deps);

          expect(mockPackmindCliHexa.notifyDistribution).toHaveBeenCalledTimes(
            2,
          );
          expect(mockPackmindCliHexa.notifyDistribution).toHaveBeenCalledWith({
            distributedPackages: ['backend'],
            gitRemoteUrl: 'git@github.com:org/repo.git',
            gitBranch: 'main',
            relativePath: '/',
          });
          expect(mockPackmindCliHexa.notifyDistribution).toHaveBeenCalledWith({
            distributedPackages: ['backend'],
            gitRemoteUrl: 'git@github.com:org/repo.git',
            gitBranch: 'main',
            relativePath: '/apps/api/',
          });
        });

        it('displays summary message with notification count', async () => {
          mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
          mockPackmindCliHexa.installPackages.mockResolvedValue({
            filesCreated: 2,
            filesUpdated: 0,
            filesDeleted: 0,
            recipesCount: 1,
            standardsCount: 1,
            errors: [],
          });
          mockPackmindCliHexa.getGitRemoteUrlFromPath.mockReturnValue(
            'git@github.com:org/repo.git',
          );
          mockPackmindCliHexa.getCurrentBranch.mockReturnValue('main');
          mockPackmindCliHexa.notifyDistribution.mockResolvedValue({
            deploymentId: 'deployment-123',
          });

          const result = await recursiveInstallHandler({}, deps);

          expect(mockLog).toHaveBeenCalledWith(
            'Notified Packmind of 2 distributions',
          );
          expect(result.totalNotifications).toBe(2);
        });

        describe('when only one distribution', () => {
          it('displays singular form', async () => {
            mockPackmindCliHexa.findAllConfigsInTree.mockResolvedValue({
              configs: [
                {
                  targetPath: '/',
                  absoluteTargetPath: '/project',
                  packages: { backend: '*' },
                },
              ],
              hasConfigs: true,
              basePath: '/project',
            });
            mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
            mockPackmindCliHexa.installPackages.mockResolvedValue({
              filesCreated: 2,
              filesUpdated: 0,
              filesDeleted: 0,
              recipesCount: 1,
              standardsCount: 1,
              errors: [],
            });
            mockPackmindCliHexa.getGitRemoteUrlFromPath.mockReturnValue(
              'git@github.com:org/repo.git',
            );
            mockPackmindCliHexa.getCurrentBranch.mockReturnValue('main');
            mockPackmindCliHexa.notifyDistribution.mockResolvedValue({
              deploymentId: 'deployment-123',
            });

            await recursiveInstallHandler({}, deps);

            expect(mockLog).toHaveBeenCalledWith(
              'Notified Packmind of 1 distribution',
            );
          });
        });

        describe('when no files are changed', () => {
          it('does not display notification summary', async () => {
            mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
            mockPackmindCliHexa.installPackages.mockResolvedValue({
              filesCreated: 0,
              filesUpdated: 0,
              filesDeleted: 0,
              recipesCount: 0,
              standardsCount: 0,
              errors: [],
            });

            const result = await recursiveInstallHandler({}, deps);

            expect(
              mockPackmindCliHexa.notifyDistribution,
            ).not.toHaveBeenCalled();
            expect(mockLog).not.toHaveBeenCalledWith(
              expect.stringMatching(/Notified Packmind of/),
            );
            expect(result.totalNotifications).toBe(0);
          });
        });

        it('does not count failed notifications in summary', async () => {
          mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
          mockPackmindCliHexa.installPackages.mockResolvedValue({
            filesCreated: 2,
            filesUpdated: 0,
            filesDeleted: 0,
            recipesCount: 1,
            standardsCount: 1,
            errors: [],
          });
          mockPackmindCliHexa.getGitRemoteUrlFromPath.mockReturnValue(
            'git@github.com:org/repo.git',
          );
          mockPackmindCliHexa.getCurrentBranch.mockReturnValue('main');
          mockPackmindCliHexa.notifyDistribution.mockRejectedValue(
            new Error('Network error'),
          );

          const result = await recursiveInstallHandler({}, deps);

          expect(mockLog).not.toHaveBeenCalledWith(
            expect.stringMatching(/Notified Packmind of/),
          );
          expect(result.totalNotifications).toBe(0);
          expect(result.directoriesProcessed).toBe(2);
          expect(mockExit).toHaveBeenCalledWith(0);
        });
      });
    });

    describe('when not in git repo', () => {
      beforeEach(() => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);
        mockPackmindCliHexa.findAllConfigsInTree.mockResolvedValue({
          configs: [
            {
              targetPath: '/',
              absoluteTargetPath: '/project',
              packages: { backend: '*' },
            },
          ],
          hasConfigs: true,
          basePath: '/project',
        });
      });

      it('does not notify distribution and hides summary message', async () => {
        mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 2,
          filesUpdated: 0,
          filesDeleted: 0,
          recipesCount: 1,
          standardsCount: 1,
          errors: [],
        });

        const result = await recursiveInstallHandler({}, deps);

        expect(mockPackmindCliHexa.notifyDistribution).not.toHaveBeenCalled();
        expect(mockLog).not.toHaveBeenCalledWith(
          expect.stringMatching(/Notified Packmind of/),
        );
        expect(result.totalNotifications).toBe(0);
      });
    });

    describe('when one directory fails', () => {
      beforeEach(() => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
          '/project',
        );
        mockPackmindCliHexa.findAllConfigsInTree.mockResolvedValue({
          configs: [
            {
              targetPath: '/',
              absoluteTargetPath: '/project',
              packages: { backend: '*' },
            },
            {
              targetPath: '/apps/api',
              absoluteTargetPath: '/project/apps/api',
              packages: { nestjs: '*' },
            },
          ],
          hasConfigs: true,
          basePath: '/project',
        });
      });

      it('continues processing other directories', async () => {
        mockPackmindCliHexa.readConfig
          .mockResolvedValueOnce(['backend'])
          .mockResolvedValueOnce(['nestjs']);
        mockPackmindCliHexa.installPackages
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({
            filesCreated: 2,
            filesUpdated: 0,
            filesDeleted: 0,
            recipesCount: 1,
            standardsCount: 1,
            errors: [],
          });

        const result = await recursiveInstallHandler({}, deps);

        expect(result.directoriesProcessed).toBe(2);
        expect(result.totalFilesCreated).toBe(2);
        expect(result.errors).toHaveLength(1);
      });

      it('reports errors at the end', async () => {
        mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
        mockPackmindCliHexa.installPackages
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({
            filesCreated: 2,
            filesUpdated: 0,
            filesDeleted: 0,
            recipesCount: 1,
            standardsCount: 1,
            errors: [],
          });

        await recursiveInstallHandler({}, deps);

        expect(mockLog).toHaveBeenCalledWith(
          expect.stringContaining('1 error(s) encountered'),
        );
      });

      it('exits with 1', async () => {
        mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
        mockPackmindCliHexa.installPackages
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({
            filesCreated: 2,
            filesUpdated: 0,
            filesDeleted: 0,
            recipesCount: 1,
            standardsCount: 1,
            errors: [],
          });

        await recursiveInstallHandler({}, deps);

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when config parsing fails in a directory', () => {
      beforeEach(() => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
          '/project',
        );
        mockPackmindCliHexa.findAllConfigsInTree.mockResolvedValue({
          configs: [
            {
              targetPath: '/',
              absoluteTargetPath: '/project',
              packages: { backend: '*' },
            },
          ],
          hasConfigs: true,
          basePath: '/project',
        });
      });

      it('records the error and continues', async () => {
        mockPackmindCliHexa.readConfig.mockRejectedValue(
          new Error('Invalid JSON'),
        );

        const result = await recursiveInstallHandler({}, deps);

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toContain('Invalid JSON');
      });
    });

    describe('when findAllConfigsInTree fails', () => {
      it('displays error and exits with 1', async () => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
          '/project',
        );
        mockPackmindCliHexa.findAllConfigsInTree.mockRejectedValue(
          new Error('Permission denied'),
        );

        await recursiveInstallHandler({}, deps);

        expect(mockError).toHaveBeenCalledWith(
          '\n❌ Failed to run recursive install:',
        );
        expect(mockError).toHaveBeenCalledWith('   Permission denied');
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when processing single directory', () => {
      beforeEach(() => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
          '/project',
        );
        mockPackmindCliHexa.findAllConfigsInTree.mockResolvedValue({
          configs: [
            {
              targetPath: '/',
              absoluteTargetPath: '/project',
              packages: { backend: '*' },
            },
          ],
          hasConfigs: true,
          basePath: '/project',
        });
      });

      it('displays singular form in summary', async () => {
        mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 1,
          filesUpdated: 0,
          filesDeleted: 0,
          recipesCount: 1,
          standardsCount: 0,
          errors: [],
        });

        await recursiveInstallHandler({}, deps);

        expect(mockLog).toHaveBeenCalledWith(
          'Summary: 1 directory processed, 1 files added, 0 changed, 0 removed',
        );
      });
    });
  });
});
