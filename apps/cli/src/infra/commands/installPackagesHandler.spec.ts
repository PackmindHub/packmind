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
      installDefaultSkills: jest.fn(),
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
      beforeEach(async () => {
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
      });

      it('logs fetching message', () => {
        expect(mockLog).toHaveBeenCalledWith(
          'Fetching available packages...\n',
        );
      });

      it('logs available packages header', () => {
        expect(mockLog).toHaveBeenCalledWith('Available packages:\n');
      });

      it('displays packages sorted alphabetically', () => {
        expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('alpha'));
      });

      it('exits with 0', () => {
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when no packages are found', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listPackages.mockResolvedValue([]);

        await listPackagesHandler({}, deps);
      });

      it('displays no packages message', () => {
        expect(mockLog).toHaveBeenCalledWith('No packages found.');
      });

      it('exits with 0', () => {
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when listing fails', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listPackages.mockRejectedValue(
          new Error('Network error'),
        );

        await listPackagesHandler({}, deps);
      });

      it('displays error header', () => {
        expect(mockError).toHaveBeenCalledWith('\n❌ Failed to list packages:');
      });

      it('displays error message', () => {
        expect(mockError).toHaveBeenCalledWith('   Network error');
      });

      it('exits with 1', () => {
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('showPackageHandler', () => {
    describe('when package is found', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.getPackageBySlug.mockResolvedValue({
          name: 'Test Package',
          slug: 'test-package',
          description: 'A test package',
          standards: [{ name: 'Standard 1', summary: 'A standard' }],
          recipes: [{ name: 'Recipe 1', summary: 'A recipe' }],
        });

        await showPackageHandler({ slug: 'test-package' }, deps);
      });

      it('logs fetching message', () => {
        expect(mockLog).toHaveBeenCalledWith(
          "Fetching package details for 'test-package'...\n",
        );
      });

      it('logs package name with slug', () => {
        expect(mockLog).toHaveBeenCalledWith('Test Package (test-package):\n');
      });

      it('logs package description', () => {
        expect(mockLog).toHaveBeenCalledWith('A test package\n');
      });

      it('logs standards section', () => {
        expect(mockLog).toHaveBeenCalledWith('Standards:');
      });

      it('logs commands section', () => {
        expect(mockLog).toHaveBeenCalledWith('Commands:');
      });

      it('exits with 0', () => {
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when package is not found', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.getPackageBySlug.mockRejectedValue(
          new Error('Package not found'),
        );

        await showPackageHandler({ slug: 'non-existent' }, deps);
      });

      it('displays error header', () => {
        expect(mockError).toHaveBeenCalledWith(
          '\n❌ Failed to fetch package details:',
        );
      });

      it('displays error message', () => {
        expect(mockError).toHaveBeenCalledWith('   Package not found');
      });

      it('exits with 1', () => {
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('installPackagesHandler', () => {
    describe('when config parsing fails', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.readConfig.mockRejectedValue(
          new Error('Invalid JSON'),
        );

        await installPackagesHandler({ packagesSlugs: [] }, deps);
      });

      it('displays parse error message', () => {
        expect(mockError).toHaveBeenCalledWith(
          'ERROR Failed to parse packmind.json',
        );
      });

      it('displays error details', () => {
        expect(mockError).toHaveBeenCalledWith('ERROR Invalid JSON');
      });

      it('exits with 1', () => {
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when no packages provided and no config file', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.configExists.mockResolvedValue(false);
        mockPackmindCliHexa.readConfig.mockResolvedValue([]);

        await installPackagesHandler({ packagesSlugs: [] }, deps);
      });

      it('displays usage help', () => {
        expect(mockLog).toHaveBeenCalledWith(
          'Usage: packmind-cli install <package-slug> [package-slug...]',
        );
      });

      it('exits with 0', () => {
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when no packages provided and config file is empty', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.configExists.mockResolvedValue(true);
        mockPackmindCliHexa.readConfig.mockResolvedValue([]);

        await installPackagesHandler({ packagesSlugs: [] }, deps);
      });

      it('displays usage help', () => {
        expect(mockLog).toHaveBeenCalledWith(
          'Usage: packmind-cli install <package-slug> [package-slug...]',
        );
      });

      it('exits with 0', () => {
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when install succeeds with no file changes', () => {
      let result: Awaited<ReturnType<typeof installPackagesHandler>>;

      beforeEach(async () => {
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

        result = await installPackagesHandler({ packagesSlugs: [] }, deps);
      });

      it('does not call notifyDistribution', () => {
        expect(mockPackmindCliHexa.notifyDistribution).not.toHaveBeenCalled();
      });

      it('returns notificationSent as false', () => {
        expect(result.notificationSent).toBe(false);
      });
    });

    describe('when install succeeds with file changes but not in git repo', () => {
      let result: Awaited<ReturnType<typeof installPackagesHandler>>;

      beforeEach(async () => {
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

        result = await installPackagesHandler({ packagesSlugs: [] }, deps);
      });

      it('does not call notifyDistribution', () => {
        expect(mockPackmindCliHexa.notifyDistribution).not.toHaveBeenCalled();
      });

      it('returns notificationSent as false', () => {
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

      describe('when notification succeeds', () => {
        let result: Awaited<ReturnType<typeof installPackagesHandler>>;

        beforeEach(async () => {
          mockPackmindCliHexa.notifyDistribution.mockResolvedValue({
            deploymentId: 'deployment-123',
          });

          result = await installPackagesHandler({ packagesSlugs: [] }, deps);
        });

        it('calls notifyDistribution with correct parameters', () => {
          expect(mockPackmindCliHexa.notifyDistribution).toHaveBeenCalledWith({
            distributedPackages: ['backend'],
            gitRemoteUrl: 'git@github.com:org/repo.git',
            gitBranch: 'main',
            relativePath: '/',
          });
        });

        it('logs success message', () => {
          expect(mockLog).toHaveBeenCalledWith(
            'Successfully notified Packmind of the new distribution',
          );
        });

        it('returns notificationSent as true', () => {
          expect(result.notificationSent).toBe(true);
        });
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
        let result: Awaited<ReturnType<typeof installPackagesHandler>>;

        beforeEach(async () => {
          mockPackmindCliHexa.notifyDistribution.mockRejectedValue(
            new Error('Network error'),
          );

          result = await installPackagesHandler({ packagesSlugs: [] }, deps);
        });

        it('does not log success message', () => {
          expect(mockLog).not.toHaveBeenCalledWith(
            'Successfully notified Packmind of the new distribution',
          );
        });

        it('returns notificationSent as false', () => {
          expect(result.notificationSent).toBe(false);
        });

        it('does not exit with error', () => {
          expect(mockExit).not.toHaveBeenCalledWith(1);
        });
      });
    });

    describe('when pull fails with 404 error', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.configExists.mockResolvedValue(false);
        mockPackmindCliHexa.readConfig.mockResolvedValue([]);
        const error = new Error('Package not found') as Error & {
          statusCode: number;
        };
        error.statusCode = 404;
        mockPackmindCliHexa.installPackages.mockRejectedValue(error);

        await installPackagesHandler({ packagesSlugs: ['non-existent'] }, deps);
      });

      it('displays error header', () => {
        expect(mockError).toHaveBeenCalledWith(
          '\n❌ Failed to install content:',
        );
      });

      it('displays error message', () => {
        expect(mockError).toHaveBeenCalledWith('   Package not found');
      });

      it('exits with 1', () => {
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when pull has errors in result', () => {
      let result: Awaited<ReturnType<typeof installPackagesHandler>>;

      beforeEach(async () => {
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

        result = await installPackagesHandler({ packagesSlugs: [] }, deps);
      });

      it('logs errors header', () => {
        expect(mockLog).toHaveBeenCalledWith('\n⚠️  Errors encountered:');
      });

      it('logs error details', () => {
        expect(mockLog).toHaveBeenCalledWith(
          '   - Failed to write file: permission denied',
        );
      });

      it('exits with 1', () => {
        expect(mockExit).toHaveBeenCalledWith(1);
      });

      it('returns notificationSent as false', () => {
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

    describe('default skills installation', () => {
      beforeEach(() => {
        mockPackmindCliHexa.configExists.mockResolvedValue(true);
        mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 2,
          filesUpdated: 1,
          filesDeleted: 0,
          recipesCount: 1,
          standardsCount: 1,
          skillsCount: 0,
          errors: [],
        });
      });

      describe('when at the root of a git repository', () => {
        beforeEach(() => {
          mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
            '/project',
          );
          mockPackmindCliHexa.getGitRemoteUrlFromPath.mockReturnValue(
            'git@github.com:org/repo.git',
          );
          mockPackmindCliHexa.getCurrentBranch.mockReturnValue('main');
          mockPackmindCliHexa.notifyDistribution.mockResolvedValue({
            deploymentId: 'deployment-123',
          });
        });

        it('installs default skills', async () => {
          mockPackmindCliHexa.installDefaultSkills.mockResolvedValue({
            filesCreated: 2,
            filesUpdated: 0,
            errors: [],
          });

          await installPackagesHandler({ packagesSlugs: [] }, deps);

          expect(mockPackmindCliHexa.installDefaultSkills).toHaveBeenCalledWith(
            expect.objectContaining({ cliVersion: expect.any(String) }),
          );
        });

        it('logs installation start message', async () => {
          mockPackmindCliHexa.installDefaultSkills.mockResolvedValue({
            filesCreated: 2,
            filesUpdated: 1,
            errors: [],
          });

          await installPackagesHandler({ packagesSlugs: [] }, deps);

          expect(mockLog).toHaveBeenCalledWith(
            '\nInstalling default skills...',
          );
        });

        it('logs files created and updated count', async () => {
          mockPackmindCliHexa.installDefaultSkills.mockResolvedValue({
            filesCreated: 2,
            filesUpdated: 1,
            errors: [],
          });

          await installPackagesHandler({ packagesSlugs: [] }, deps);

          expect(mockLog).toHaveBeenCalledWith(
            'Default skills: added 2 files, changed 1 files',
          );
        });

        describe('when default skills are already up to date', () => {
          it('logs up to date message', async () => {
            mockPackmindCliHexa.installDefaultSkills.mockResolvedValue({
              filesCreated: 0,
              filesUpdated: 0,
              errors: [],
            });

            await installPackagesHandler({ packagesSlugs: [] }, deps);

            expect(mockLog).toHaveBeenCalledWith(
              'Default skills are already up to date',
            );
          });
        });

        describe('when default skills installation has errors', () => {
          beforeEach(() => {
            mockPackmindCliHexa.installDefaultSkills.mockResolvedValue({
              filesCreated: 1,
              filesUpdated: 0,
              errors: ['Failed to write file: permission denied'],
            });
          });

          it('logs warnings', async () => {
            await installPackagesHandler({ packagesSlugs: [] }, deps);

            expect(mockLog).toHaveBeenCalledWith(
              '   Warning: Failed to write file: permission denied',
            );
          });

          it('does not fail the main install', async () => {
            await installPackagesHandler({ packagesSlugs: [] }, deps);

            expect(mockExit).not.toHaveBeenCalledWith(1);
          });
        });

        describe('when default skills installation throws', () => {
          beforeEach(() => {
            mockPackmindCliHexa.installDefaultSkills.mockRejectedValue(
              new Error('Network error'),
            );
          });

          it('returns package install result unchanged', async () => {
            const result = await installPackagesHandler(
              { packagesSlugs: [] },
              deps,
            );

            expect(result.filesCreated).toBe(2);
          });

          it('does not fail the main install', async () => {
            await installPackagesHandler({ packagesSlugs: [] }, deps);

            expect(mockExit).not.toHaveBeenCalledWith(1);
          });
        });
      });

      describe('when in a subdirectory of a git repository', () => {
        it('does not install default skills', async () => {
          mockGetCwd.mockReturnValue('/project/src/frontend');
          mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
            '/project',
          );

          await installPackagesHandler({ packagesSlugs: [] }, deps);

          expect(
            mockPackmindCliHexa.installDefaultSkills,
          ).not.toHaveBeenCalled();
        });
      });

      describe('when not in a git repository', () => {
        it('does not install default skills', async () => {
          mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);

          await installPackagesHandler({ packagesSlugs: [] }, deps);

          expect(
            mockPackmindCliHexa.installDefaultSkills,
          ).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('uninstallPackagesHandler', () => {
    describe('when no packages specified', () => {
      beforeEach(async () => {
        await uninstallPackagesHandler({ packagesSlugs: [] }, deps);
      });

      it('displays no packages error', () => {
        expect(mockError).toHaveBeenCalledWith('❌ No packages specified.');
      });

      it('displays usage help', () => {
        expect(mockLog).toHaveBeenCalledWith(
          'Usage: packmind-cli uninstall <package-slug> [package-slug...]',
        );
      });

      it('exits with 1', () => {
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when config file does not exist', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.configExists.mockResolvedValue(false);
        mockPackmindCliHexa.readConfig.mockResolvedValue([]);

        await uninstallPackagesHandler({ packagesSlugs: ['backend'] }, deps);
      });

      it('displays not found error', () => {
        expect(mockError).toHaveBeenCalledWith(
          '❌ No packmind.json found in current directory.',
        );
      });

      it('displays empty line', () => {
        expect(mockLog).toHaveBeenCalledWith('');
      });

      it('displays hint message', () => {
        expect(mockLog).toHaveBeenCalledWith(
          '💡 There are no packages to uninstall.',
        );
      });

      it('exits with 1', () => {
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when config file is empty', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.configExists.mockResolvedValue(true);
        mockPackmindCliHexa.readConfig.mockResolvedValue([]);

        await uninstallPackagesHandler({ packagesSlugs: ['backend'] }, deps);
      });

      it('displays is empty error', () => {
        expect(mockError).toHaveBeenCalledWith('❌ packmind.json is empty.');
      });

      it('displays empty line', () => {
        expect(mockLog).toHaveBeenCalledWith('');
      });

      it('displays hint message', () => {
        expect(mockLog).toHaveBeenCalledWith(
          '💡 There are no packages to uninstall.',
        );
      });

      it('exits with 1', () => {
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when removing all packages', () => {
      beforeEach(() => {
        mockPackmindCliHexa.configExists.mockResolvedValue(true);
        mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);
      });

      it('calls installPackages with empty array and previous packages', async () => {
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 0,
          filesUpdated: 0,
          filesDeleted: 5,
          recipesCount: 0,
          standardsCount: 0,
          errors: [],
        });

        await uninstallPackagesHandler({ packagesSlugs: ['backend'] }, deps);

        expect(mockPackmindCliHexa.installPackages).toHaveBeenCalledWith({
          baseDirectory: '/project',
          packagesSlugs: [],
          previousPackagesSlugs: ['backend'],
        });
      });

      it('displays correct file count from backend response', async () => {
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 0,
          filesUpdated: 0,
          filesDeleted: 12,
          recipesCount: 0,
          standardsCount: 0,
          errors: [],
        });

        await uninstallPackagesHandler({ packagesSlugs: ['backend'] }, deps);

        expect(mockLog).toHaveBeenCalledWith('\nremoved 12 files');
      });

      it('writes empty packages to config', async () => {
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 0,
          filesUpdated: 0,
          filesDeleted: 5,
          recipesCount: 0,
          standardsCount: 0,
          errors: [],
        });

        await uninstallPackagesHandler({ packagesSlugs: ['backend'] }, deps);

        expect(mockPackmindCliHexa.writeConfig).toHaveBeenCalledWith(
          '/project',
          [],
        );
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

      describe('when handler is called', () => {
        let result: Awaited<ReturnType<typeof recursiveInstallHandler>>;

        beforeEach(async () => {
          result = await recursiveInstallHandler({}, deps);
        });

        it('returns directoriesProcessed as 0', () => {
          expect(result.directoriesProcessed).toBe(0);
        });

        it('returns totalFilesCreated as 0', () => {
          expect(result.totalFilesCreated).toBe(0);
        });

        it('returns empty errors array', () => {
          expect(result.errors).toHaveLength(0);
        });
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

      describe('when processing directories', () => {
        let result: Awaited<ReturnType<typeof recursiveInstallHandler>>;

        beforeEach(async () => {
          mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
          mockPackmindCliHexa.installPackages.mockResolvedValue({
            filesCreated: 3,
            filesUpdated: 1,
            filesDeleted: 0,
            recipesCount: 2,
            standardsCount: 1,
            errors: [],
          });

          result = await recursiveInstallHandler({}, deps);
        });

        it('returns directoriesProcessed as 2', () => {
          expect(result.directoriesProcessed).toBe(2);
        });

        it('calls installPackages for each directory', () => {
          expect(mockPackmindCliHexa.installPackages).toHaveBeenCalledTimes(2);
        });
      });

      describe('when aggregating file counts', () => {
        let result: Awaited<ReturnType<typeof recursiveInstallHandler>>;

        beforeEach(async () => {
          mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
          mockPackmindCliHexa.installPackages.mockResolvedValue({
            filesCreated: 3,
            filesUpdated: 1,
            filesDeleted: 2,
            recipesCount: 2,
            standardsCount: 1,
            errors: [],
          });

          result = await recursiveInstallHandler({}, deps);
        });

        it('returns aggregated totalFilesCreated', () => {
          expect(result.totalFilesCreated).toBe(6);
        });

        it('returns aggregated totalFilesUpdated', () => {
          expect(result.totalFilesUpdated).toBe(2);
        });

        it('returns aggregated totalFilesDeleted', () => {
          expect(result.totalFilesDeleted).toBe(4);
        });
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
        describe('when notifying distributions', () => {
          beforeEach(async () => {
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
          });

          it('calls notifyDistribution twice', () => {
            expect(
              mockPackmindCliHexa.notifyDistribution,
            ).toHaveBeenCalledTimes(2);
          });

          it('notifies for root directory', () => {
            expect(mockPackmindCliHexa.notifyDistribution).toHaveBeenCalledWith(
              {
                distributedPackages: ['backend'],
                gitRemoteUrl: 'git@github.com:org/repo.git',
                gitBranch: 'main',
                relativePath: '/',
              },
            );
          });

          it('notifies for apps/api directory', () => {
            expect(mockPackmindCliHexa.notifyDistribution).toHaveBeenCalledWith(
              {
                distributedPackages: ['backend'],
                gitRemoteUrl: 'git@github.com:org/repo.git',
                gitBranch: 'main',
                relativePath: '/apps/api/',
              },
            );
          });
        });

        describe('when displaying notification summary', () => {
          let result: Awaited<ReturnType<typeof recursiveInstallHandler>>;

          beforeEach(async () => {
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

            result = await recursiveInstallHandler({}, deps);
          });

          it('logs notification count message', () => {
            expect(mockLog).toHaveBeenCalledWith(
              'Notified Packmind of 2 distributions',
            );
          });

          it('returns totalNotifications as 2', () => {
            expect(result.totalNotifications).toBe(2);
          });
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
          let result: Awaited<ReturnType<typeof recursiveInstallHandler>>;

          beforeEach(async () => {
            mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
            mockPackmindCliHexa.installPackages.mockResolvedValue({
              filesCreated: 0,
              filesUpdated: 0,
              filesDeleted: 0,
              recipesCount: 0,
              standardsCount: 0,
              errors: [],
            });

            result = await recursiveInstallHandler({}, deps);
          });

          it('does not call notifyDistribution', () => {
            expect(
              mockPackmindCliHexa.notifyDistribution,
            ).not.toHaveBeenCalled();
          });

          it('does not log notification message', () => {
            expect(mockLog).not.toHaveBeenCalledWith(
              expect.stringMatching(/Notified Packmind of/),
            );
          });

          it('returns totalNotifications as 0', () => {
            expect(result.totalNotifications).toBe(0);
          });
        });

        describe('when notifications fail', () => {
          let result: Awaited<ReturnType<typeof recursiveInstallHandler>>;

          beforeEach(async () => {
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

            result = await recursiveInstallHandler({}, deps);
          });

          it('does not log notification message', () => {
            expect(mockLog).not.toHaveBeenCalledWith(
              expect.stringMatching(/Notified Packmind of/),
            );
          });

          it('returns totalNotifications as 0', () => {
            expect(result.totalNotifications).toBe(0);
          });

          it('returns directoriesProcessed as 2', () => {
            expect(result.directoriesProcessed).toBe(2);
          });

          it('exits with 0', () => {
            expect(mockExit).toHaveBeenCalledWith(0);
          });
        });
      });
    });

    describe('when not in git repo', () => {
      let result: Awaited<ReturnType<typeof recursiveInstallHandler>>;

      beforeEach(async () => {
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
        mockPackmindCliHexa.readConfig.mockResolvedValue(['backend']);
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 2,
          filesUpdated: 0,
          filesDeleted: 0,
          recipesCount: 1,
          standardsCount: 1,
          errors: [],
        });

        result = await recursiveInstallHandler({}, deps);
      });

      it('does not call notifyDistribution', () => {
        expect(mockPackmindCliHexa.notifyDistribution).not.toHaveBeenCalled();
      });

      it('does not log notification message', () => {
        expect(mockLog).not.toHaveBeenCalledWith(
          expect.stringMatching(/Notified Packmind of/),
        );
      });

      it('returns totalNotifications as 0', () => {
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

      describe('when processing continues after failure', () => {
        let result: Awaited<ReturnType<typeof recursiveInstallHandler>>;

        beforeEach(async () => {
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

          result = await recursiveInstallHandler({}, deps);
        });

        it('returns directoriesProcessed as 2', () => {
          expect(result.directoriesProcessed).toBe(2);
        });

        it('returns totalFilesCreated as 2', () => {
          expect(result.totalFilesCreated).toBe(2);
        });

        it('returns one error', () => {
          expect(result.errors).toHaveLength(1);
        });
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

      describe('when config is invalid', () => {
        let result: Awaited<ReturnType<typeof recursiveInstallHandler>>;

        beforeEach(async () => {
          mockPackmindCliHexa.readConfig.mockRejectedValue(
            new Error('Invalid JSON'),
          );

          result = await recursiveInstallHandler({}, deps);
        });

        it('returns one error', () => {
          expect(result.errors).toHaveLength(1);
        });

        it('includes error message with Invalid JSON', () => {
          expect(result.errors[0].message).toContain('Invalid JSON');
        });
      });
    });

    describe('when findAllConfigsInTree fails', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
          '/project',
        );
        mockPackmindCliHexa.findAllConfigsInTree.mockRejectedValue(
          new Error('Permission denied'),
        );

        await recursiveInstallHandler({}, deps);
      });

      it('displays error header', () => {
        expect(mockError).toHaveBeenCalledWith(
          '\n❌ Failed to run recursive install:',
        );
      });

      it('displays error message', () => {
        expect(mockError).toHaveBeenCalledWith('   Permission denied');
      });

      it('exits with 1', () => {
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
