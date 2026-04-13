import { PackmindCliHexa } from '../../PackmindCliHexa';
import {
  uninstallPackagesHandler,
  statusHandler,
  InstallHandlerDependencies,
} from './installPackagesHandler';

// Mock the consoleLogger module to avoid chalk ESM issues
jest.mock('../utils/consoleLogger', () => ({
  logErrorConsole: jest.fn(),
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
      configExists: jest.fn(),
      readConfig: jest.fn(),
      readFullConfig: jest.fn(),
      writeConfig: jest.fn(),
      addPackagesToConfig: jest.fn(),
      installPackages: jest.fn(),
      normalizePackageSlugs: jest
        .fn()
        .mockImplementation(async (slugs: string[]) => slugs),
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
        mockPackmindCliHexa.readFullConfig.mockResolvedValue(null);

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
        mockPackmindCliHexa.readFullConfig.mockResolvedValue({ packages: {} });

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
        mockPackmindCliHexa.readFullConfig.mockResolvedValue({
          packages: { backend: '*' },
        });
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
          agents: undefined,
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

    describe('space-aware slug matching', () => {
      const installPackagesSuccess = {
        filesCreated: 0,
        filesUpdated: 0,
        filesDeleted: 3,
        recipesCount: 0,
        standardsCount: 0,
        errors: [],
      };

      beforeEach(() => {
        mockPackmindCliHexa.configExists.mockResolvedValue(true);
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);
        mockPackmindCliHexa.installPackages.mockResolvedValue(
          installPackagesSuccess,
        );
      });

      describe('when config has unprefixed slug and user provides prefixed slug', () => {
        beforeEach(() => {
          mockPackmindCliHexa.readFullConfig.mockResolvedValue({
            packages: { backend: '*' },
          });
          // Simulate single-space org: normalizes 'backend' → '@my-space/backend'
          mockPackmindCliHexa.normalizePackageSlugs.mockImplementation(
            async (slugs: string[]) =>
              slugs.map((s) => (s.startsWith('@') ? s : `@my-space/${s}`)),
          );
        });

        it('removes the unprefixed config entry', async () => {
          await uninstallPackagesHandler(
            { packagesSlugs: ['@my-space/backend'] },
            deps,
          );

          expect(mockPackmindCliHexa.writeConfig).toHaveBeenCalledWith(
            '/project',
            [],
          );
        });

        it('does not exit with error', async () => {
          await uninstallPackagesHandler(
            { packagesSlugs: ['@my-space/backend'] },
            deps,
          );

          expect(mockExit).not.toHaveBeenCalled();
        });
      });

      describe('when config has prefixed slug and user provides unprefixed slug', () => {
        beforeEach(() => {
          mockPackmindCliHexa.readFullConfig.mockResolvedValue({
            packages: { '@my-space/backend': '*' },
          });
          // Simulate single-space org: normalizes 'backend' → '@my-space/backend'
          mockPackmindCliHexa.normalizePackageSlugs.mockImplementation(
            async (slugs: string[]) =>
              slugs.map((s) => (s.startsWith('@') ? s : `@my-space/${s}`)),
          );
        });

        it('removes the prefixed config entry', async () => {
          await uninstallPackagesHandler({ packagesSlugs: ['backend'] }, deps);

          expect(mockPackmindCliHexa.writeConfig).toHaveBeenCalledWith(
            '/project',
            [],
          );
        });

        it('does not exit with error', async () => {
          await uninstallPackagesHandler({ packagesSlugs: ['backend'] }, deps);

          expect(mockExit).not.toHaveBeenCalled();
        });
      });

      describe('when organization has multiple spaces and user provides unprefixed slug', () => {
        beforeEach(() => {
          mockPackmindCliHexa.readFullConfig.mockResolvedValue({
            packages: { backend: '*' },
          });
          mockPackmindCliHexa.normalizePackageSlugs.mockRejectedValue(
            new Error(
              'Your organization has multiple spaces. Please specify the space for each package using the @space/package format (e.g. @space-a/my-package).',
            ),
          );
        });

        it('displays the multi-space error', async () => {
          await uninstallPackagesHandler({ packagesSlugs: ['backend'] }, deps);

          expect(mockError).toHaveBeenCalledWith(
            expect.stringContaining('multiple spaces'),
          );
        });

        it('exits with 1', async () => {
          await uninstallPackagesHandler({ packagesSlugs: ['backend'] }, deps);

          expect(mockExit).toHaveBeenCalledWith(1);
        });
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
});
