import * as fs from 'fs/promises';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import {
  installPackagesHandler,
  uninstallPackagesHandler,
  recursiveInstallHandler,
  statusHandler,
  InstallHandlerDependencies,
} from './installPackagesHandler';

jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock the consoleLogger module to avoid chalk ESM issues
jest.mock('../utils/consoleLogger', () => ({
  logErrorConsole: jest.fn(),
  logWarningConsole: jest.fn(),
  formatSlug: jest.fn((slug: string) => slug),
  formatLabel: jest.fn((label: string) => label),
}));

import * as consoleLogger from '../utils/consoleLogger';

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

  describe('installPackagesHandler', () => {
    describe('when config parsing fails', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.readFullConfig.mockRejectedValue(
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
        mockPackmindCliHexa.readFullConfig.mockResolvedValue(null);

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
        mockPackmindCliHexa.readFullConfig.mockResolvedValue(null);

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

    describe('playbook clearing after successful install', () => {
      let mockPlaybookRepo: { clearAll: jest.Mock };

      beforeEach(() => {
        mockPlaybookRepo = { clearAll: jest.fn() };
        mockPackmindCliHexa.configExists.mockResolvedValue(true);
        mockPackmindCliHexa.readFullConfig.mockResolvedValue({
          packages: { backend: '*' },
        });
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 1,
          filesUpdated: 0,
          filesDeleted: 0,
          recipesCount: 0,
          errors: [],
          deployedArtifacts: [],
        });
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);
      });

      it('clears playbook after successful install', async () => {
        await installPackagesHandler(
          { packagesSlugs: ['backend'] },
          {
            ...deps,
            playbookLocalRepository: mockPlaybookRepo as never,
          },
        );

        expect(mockPlaybookRepo.clearAll).toHaveBeenCalled();
      });

      describe('when playbookLocalRepository is not provided', () => {
        it('does not clear playbook', async () => {
          await installPackagesHandler({ packagesSlugs: ['backend'] }, deps);

          expect(mockPlaybookRepo.clearAll).not.toHaveBeenCalled();
        });
      });

      it('does not clear playbook after failed install', async () => {
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 0,
          filesUpdated: 0,
          filesDeleted: 0,
          recipesCount: 0,
          errors: ['Something went wrong'],
          deployedArtifacts: [],
        });

        await installPackagesHandler(
          { packagesSlugs: ['backend'] },
          {
            ...deps,
            playbookLocalRepository: mockPlaybookRepo as never,
          },
        );

        expect(mockPlaybookRepo.clearAll).not.toHaveBeenCalled();
      });
    });

    describe('when install succeeds with no file changes', () => {
      let result: Awaited<ReturnType<typeof installPackagesHandler>>;

      beforeEach(async () => {
        mockPackmindCliHexa.configExists.mockResolvedValue(true);
        mockPackmindCliHexa.readFullConfig.mockResolvedValue({
          packages: { backend: '*' },
        });
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
        mockPackmindCliHexa.readFullConfig.mockResolvedValue({
          packages: { backend: '*' },
        });
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
        mockPackmindCliHexa.readFullConfig.mockResolvedValue({
          packages: { backend: '*' },
        });
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
        mockPackmindCliHexa.readFullConfig.mockResolvedValue(null);
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
        mockPackmindCliHexa.readFullConfig.mockResolvedValue({
          packages: { backend: '*' },
        });
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
        mockPackmindCliHexa.readFullConfig.mockResolvedValue(null);
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
        mockPackmindCliHexa.readFullConfig.mockResolvedValue({
          packages: { frontend: '*' },
        });
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
        mockPackmindCliHexa.readFullConfig.mockResolvedValue({
          packages: { backend: '*', frontend: '*' },
        });
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

        expect(mockPackmindCliHexa.installPackages).toHaveBeenCalledWith(
          expect.objectContaining({
            baseDirectory: '/project',
            packagesSlugs: ['backend', 'frontend', 'api'],
            previousPackagesSlugs: ['backend', 'frontend'],
            agents: undefined,
          }),
        );
      });
    });

    describe('when config contains agents', () => {
      beforeEach(() => {
        mockPackmindCliHexa.configExists.mockResolvedValue(true);
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 1,
          filesUpdated: 0,
          filesDeleted: 0,
          recipesCount: 1,
          standardsCount: 0,
          errors: [],
        });
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);
      });

      describe('when config has no agents field', () => {
        beforeEach(async () => {
          mockPackmindCliHexa.readFullConfig.mockResolvedValue({
            packages: { backend: '*' },
          });

          await installPackagesHandler({ packagesSlugs: [] }, deps);
        });

        it('passes undefined agents', () => {
          expect(mockPackmindCliHexa.installPackages).toHaveBeenCalledWith(
            expect.objectContaining({
              agents: undefined,
            }),
          );
        });
      });

      describe('when config has single agent', () => {
        beforeEach(async () => {
          mockPackmindCliHexa.readFullConfig.mockResolvedValue({
            packages: { backend: '*' },
            agents: ['claude'],
          });

          await installPackagesHandler({ packagesSlugs: [] }, deps);
        });

        it('passes single agent to installPackages', () => {
          expect(mockPackmindCliHexa.installPackages).toHaveBeenCalledWith(
            expect.objectContaining({
              agents: ['claude'],
            }),
          );
        });
      });

      describe('when config has multiple agents', () => {
        beforeEach(async () => {
          mockPackmindCliHexa.readFullConfig.mockResolvedValue({
            packages: { backend: '*' },
            agents: ['claude', 'cursor', 'copilot'],
          });

          await installPackagesHandler({ packagesSlugs: [] }, deps);
        });

        it('passes all agents to installPackages', () => {
          expect(mockPackmindCliHexa.installPackages).toHaveBeenCalledWith(
            expect.objectContaining({
              agents: ['claude', 'cursor', 'copilot'],
            }),
          );
        });
      });

      describe('when config has agents filtered from mixed valid/invalid', () => {
        beforeEach(async () => {
          // After validation layer filters, only valid agents remain
          mockPackmindCliHexa.readFullConfig.mockResolvedValue({
            packages: { backend: '*' },
            agents: ['claude'], // Result after filtering ['claude', 'invalid-agent']
          });

          await installPackagesHandler({ packagesSlugs: [] }, deps);
        });

        it('passes only the valid agents to installPackages', () => {
          expect(mockPackmindCliHexa.installPackages).toHaveBeenCalledWith(
            expect.objectContaining({
              agents: ['claude'],
            }),
          );
        });
      });

      describe('when config has empty agents array after filtering all invalid', () => {
        beforeEach(async () => {
          // After validation layer filters out all invalid agents, empty array remains
          mockPackmindCliHexa.readFullConfig.mockResolvedValue({
            packages: { backend: '*' },
            agents: [], // Result after filtering ['invalid-agent', 'another-invalid']
          });

          await installPackagesHandler({ packagesSlugs: [] }, deps);
        });

        it('passes empty agents array to installPackages', () => {
          expect(mockPackmindCliHexa.installPackages).toHaveBeenCalledWith(
            expect.objectContaining({
              agents: [],
            }),
          );
        });
      });
    });

    describe('config writing with order preservation', () => {
      beforeEach(() => {
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 1,
          filesUpdated: 0,
          filesDeleted: 0,
          recipesCount: 1,
          standardsCount: 0,
          errors: [],
        });
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);
        mockPackmindCliHexa.addPackagesToConfig.mockResolvedValue(undefined);
      });

      describe('when no new packages are provided (refresh existing)', () => {
        beforeEach(async () => {
          mockPackmindCliHexa.configExists.mockResolvedValue(true);
          mockPackmindCliHexa.readFullConfig.mockResolvedValue({
            packages: { backend: '*', frontend: '*' },
          });

          await installPackagesHandler({ packagesSlugs: [] }, deps);
        });

        it('does not call addPackagesToConfig', () => {
          expect(
            mockPackmindCliHexa.addPackagesToConfig,
          ).not.toHaveBeenCalled();
        });
      });

      describe('when config has unprefixed package slugs', () => {
        beforeEach(async () => {
          mockPackmindCliHexa.normalizePackageSlugs.mockImplementation(
            async (slugs: string[]) =>
              slugs.map((s) => (s.startsWith('@') ? s : `@my-space/${s}`)),
          );
          mockPackmindCliHexa.configExists.mockResolvedValue(true);
          mockPackmindCliHexa.readFullConfig.mockResolvedValue({
            packages: { backend: '*' },
          });
          mockPackmindCliHexa.writeConfig.mockResolvedValue(undefined);

          await installPackagesHandler({ packagesSlugs: [] }, deps);
        });

        it('calls writeConfig with the normalized slugs', () => {
          expect(mockPackmindCliHexa.writeConfig).toHaveBeenCalledWith(
            '/project',
            ['@my-space/backend'],
          );
        });

        it('does not call addPackagesToConfig', () => {
          expect(
            mockPackmindCliHexa.addPackagesToConfig,
          ).not.toHaveBeenCalled();
        });
      });

      describe('when normalizePackageSlugs throws (e.g. multiple spaces)', () => {
        beforeEach(async () => {
          mockPackmindCliHexa.configExists.mockResolvedValue(true);
          mockPackmindCliHexa.readFullConfig.mockResolvedValue({
            packages: { backend: '*' },
          });
          mockPackmindCliHexa.normalizePackageSlugs.mockRejectedValue(
            new Error(
              'Your organization has multiple spaces. Please specify the space for each package using the @space/package format (e.g. @my-space/my-package).',
            ),
          );

          await installPackagesHandler({ packagesSlugs: ['backend'] }, deps);
        });

        it('calls error with the error message', () => {
          expect(mockError).toHaveBeenCalledWith(
            expect.stringContaining('multiple spaces'),
          );
        });

        it('calls exit(1)', () => {
          expect(mockExit).toHaveBeenCalledWith(1);
        });

        it('does not call installPackages', () => {
          expect(mockPackmindCliHexa.installPackages).not.toHaveBeenCalled();
        });
      });

      describe('when all packages already exist in config', () => {
        beforeEach(async () => {
          mockPackmindCliHexa.configExists.mockResolvedValue(true);
          mockPackmindCliHexa.readFullConfig.mockResolvedValue({
            packages: { backend: '*', frontend: '*' },
          });

          await installPackagesHandler(
            { packagesSlugs: ['backend', 'frontend'] },
            deps,
          );
        });

        it('does not call addPackagesToConfig', () => {
          expect(
            mockPackmindCliHexa.addPackagesToConfig,
          ).not.toHaveBeenCalled();
        });
      });

      describe('when new packages are provided', () => {
        beforeEach(async () => {
          mockPackmindCliHexa.configExists.mockResolvedValue(true);
          mockPackmindCliHexa.readFullConfig.mockResolvedValue({
            packages: { backend: '*' },
          });

          await installPackagesHandler(
            { packagesSlugs: ['frontend', 'api'] },
            deps,
          );
        });

        it('calls addPackagesToConfig with only new packages', () => {
          expect(mockPackmindCliHexa.addPackagesToConfig).toHaveBeenCalledWith(
            '/project',
            ['frontend', 'api'],
          );
        });
      });

      describe('when some packages are new and some exist', () => {
        beforeEach(async () => {
          mockPackmindCliHexa.configExists.mockResolvedValue(true);
          mockPackmindCliHexa.readFullConfig.mockResolvedValue({
            packages: { backend: '*' },
          });

          await installPackagesHandler(
            { packagesSlugs: ['backend', 'frontend'] },
            deps,
          );
        });

        it('calls addPackagesToConfig with only the new package', () => {
          expect(mockPackmindCliHexa.addPackagesToConfig).toHaveBeenCalledWith(
            '/project',
            ['frontend'],
          );
        });
      });

      describe('when no config exists and new packages are provided', () => {
        beforeEach(async () => {
          mockPackmindCliHexa.configExists.mockResolvedValue(false);
          mockPackmindCliHexa.readFullConfig.mockResolvedValue(null);

          await installPackagesHandler({ packagesSlugs: ['backend'] }, deps);
        });

        it('calls addPackagesToConfig with all packages', () => {
          expect(mockPackmindCliHexa.addPackagesToConfig).toHaveBeenCalledWith(
            '/project',
            ['backend'],
          );
        });
      });
    });

    describe('default skills installation', () => {
      beforeEach(() => {
        mockPackmindCliHexa.configExists.mockResolvedValue(true);
        mockPackmindCliHexa.readFullConfig.mockResolvedValue({
          packages: { backend: '*' },
        });
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

        it('does not pass agents to installDefaultSkills', async () => {
          mockPackmindCliHexa.readFullConfig.mockResolvedValue({
            packages: { backend: '*' },
            agents: [
              { name: 'claude-code', isEnabled: true },
              { name: 'cursor', isEnabled: false },
            ],
          });
          mockPackmindCliHexa.installDefaultSkills.mockResolvedValue({
            filesCreated: 1,
            filesUpdated: 0,
            errors: [],
          });

          await installPackagesHandler({ packagesSlugs: [] }, deps);

          expect(
            mockPackmindCliHexa.installDefaultSkills,
          ).not.toHaveBeenCalledWith(
            expect.objectContaining({
              agents: expect.anything(),
            }),
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

    describe('when --path is provided', () => {
      describe('with a valid directory', () => {
        beforeEach(() => {
          mockFs.stat.mockResolvedValue({
            isDirectory: () => true,
          } as unknown as Awaited<ReturnType<typeof fs.stat>>);
          mockPackmindCliHexa.configExists.mockResolvedValue(true);
          mockPackmindCliHexa.readFullConfig.mockResolvedValue({
            packages: { 'existing-pkg': '*' },
          });
          mockPackmindCliHexa.installPackages.mockResolvedValue({
            filesCreated: 1,
            filesUpdated: 0,
            filesDeleted: 0,
            recipesCount: 0,
            standardsCount: 1,
            skillsCount: 0,
            errors: [],
          });
          mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);
          mockPackmindCliHexa.addPackagesToConfig.mockResolvedValue(undefined);
          mockPackmindCliHexa.installDefaultSkills.mockResolvedValue({
            filesCreated: 0,
            filesUpdated: 0,
            errors: [],
          });
        });

        it('displays the target packmind.json path', async () => {
          await installPackagesHandler(
            { packagesSlugs: ['new-pkg'], path: 'apps/frontend' },
            deps,
          );

          expect(mockLog).toHaveBeenCalledWith(
            'Installing in ./apps/frontend/packmind.json...',
          );
        });

        it('resolves the path and installs in the target directory', async () => {
          await installPackagesHandler(
            { packagesSlugs: ['new-pkg'], path: 'apps/frontend' },
            deps,
          );

          expect(mockPackmindCliHexa.installPackages).toHaveBeenCalledWith(
            expect.objectContaining({
              baseDirectory: '/project/apps/frontend',
            }),
          );
        });
      });

      describe('with a non-existent path', () => {
        beforeEach(() => {
          mockFs.stat.mockRejectedValue(new Error('ENOENT'));
        });

        it('logs error message for non-existent path', async () => {
          await installPackagesHandler(
            { packagesSlugs: ['pkg'], path: 'does/not/exist' },
            deps,
          );

          expect(consoleLogger.logErrorConsole).toHaveBeenCalledWith(
            'Path does not exist: /project/does/not/exist',
          );
        });

        it('exits with code 1 for non-existent path', async () => {
          await installPackagesHandler(
            { packagesSlugs: ['pkg'], path: 'does/not/exist' },
            deps,
          );

          expect(mockExit).toHaveBeenCalledWith(1);
        });
      });

      describe('with a path pointing to a file', () => {
        beforeEach(() => {
          mockFs.stat.mockResolvedValue({
            isDirectory: () => false,
          } as unknown as Awaited<ReturnType<typeof fs.stat>>);
        });

        it('logs error message for non-directory path', async () => {
          await installPackagesHandler(
            { packagesSlugs: ['pkg'], path: 'apps/frontend/index.ts' },
            deps,
          );

          expect(consoleLogger.logErrorConsole).toHaveBeenCalledWith(
            'Path is not a directory: /project/apps/frontend/index.ts',
          );
        });

        it('exits with code 1 for non-directory path', async () => {
          await installPackagesHandler(
            { packagesSlugs: ['pkg'], path: 'apps/frontend/index.ts' },
            deps,
          );

          expect(mockExit).toHaveBeenCalledWith(1);
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
        mockPackmindCliHexa.readFullConfig.mockResolvedValue({
          packages: { backend: '*' },
        });
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
          mockPackmindCliHexa.readFullConfig.mockResolvedValue({
            packages: { backend: '*' },
          });
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
          mockPackmindCliHexa.readFullConfig.mockResolvedValue({
            packages: { backend: '*' },
          });
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
        mockPackmindCliHexa.readFullConfig.mockResolvedValue({
          packages: { backend: '*' },
        });
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
        mockPackmindCliHexa.readFullConfig.mockResolvedValue({
          packages: { backend: '*' },
        });
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
            mockPackmindCliHexa.readFullConfig.mockResolvedValue({
              packages: { backend: '*' },
            });
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
            mockPackmindCliHexa.readFullConfig.mockResolvedValue({
              packages: { backend: '*' },
            });
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
            mockPackmindCliHexa.readFullConfig.mockResolvedValue({
              packages: { backend: '*' },
            });
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
            mockPackmindCliHexa.readFullConfig.mockResolvedValue({
              packages: { backend: '*' },
            });
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
            mockPackmindCliHexa.readFullConfig.mockResolvedValue({
              packages: { backend: '*' },
            });
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
        mockPackmindCliHexa.readFullConfig.mockResolvedValue({
          packages: { backend: '*' },
        });
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
          mockPackmindCliHexa.readFullConfig
            .mockResolvedValueOnce({ packages: { backend: '*' } })
            .mockResolvedValueOnce({ packages: { nestjs: '*' } });
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
        mockPackmindCliHexa.readFullConfig.mockResolvedValue({
          packages: { backend: '*' },
        });
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
        mockPackmindCliHexa.readFullConfig.mockResolvedValue({
          packages: { backend: '*' },
        });
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
          mockPackmindCliHexa.readFullConfig.mockRejectedValue(
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
        mockPackmindCliHexa.readFullConfig.mockResolvedValue({
          packages: { backend: '*' },
        });
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

    describe('when --path is provided', () => {
      describe('with a valid directory', () => {
        beforeEach(() => {
          mockFs.stat.mockResolvedValue({
            isDirectory: () => true,
          } as unknown as Awaited<ReturnType<typeof fs.stat>>);
          mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
            '/project',
          );
          mockPackmindCliHexa.findAllConfigsInTree.mockResolvedValue({
            configs: [
              {
                targetPath: '/apps/frontend',
                absoluteTargetPath: '/project/apps/frontend',
                packages: { frontend: '*' },
              },
            ],
            hasConfigs: true,
            basePath: '/project/apps/frontend',
          });
          mockPackmindCliHexa.readFullConfig.mockResolvedValue({
            packages: { frontend: '*' },
          });
          mockPackmindCliHexa.installPackages.mockResolvedValue({
            filesCreated: 2,
            filesUpdated: 0,
            filesDeleted: 0,
            recipesCount: 1,
            standardsCount: 1,
            skillsCount: 0,
            errors: [],
          });
        });

        it('resolves the path relative to cwd and scopes findAllConfigsInTree to that directory', async () => {
          await recursiveInstallHandler({ path: 'apps/frontend' }, deps);

          expect(mockPackmindCliHexa.findAllConfigsInTree).toHaveBeenCalledWith(
            '/project/apps/frontend',
            '/project/apps/frontend',
          );
        });

        it('processes configs found within the scoped path', async () => {
          const result = await recursiveInstallHandler(
            { path: 'apps/frontend' },
            deps,
          );

          expect(result.directoriesProcessed).toBe(1);
        });

        it('counts files created from scoped configs', async () => {
          const result = await recursiveInstallHandler(
            { path: 'apps/frontend' },
            deps,
          );

          expect(result.totalFilesCreated).toBe(2);
        });

        it('displays paths relative to cwd, not to the scoped path', async () => {
          await recursiveInstallHandler({ path: 'apps/frontend' }, deps);

          expect(mockLog).toHaveBeenCalledWith(
            'Installing in ./apps/frontend/packmind.json...',
          );
        });
      });

      describe('with a non-existent path', () => {
        beforeEach(() => {
          mockFs.stat.mockRejectedValue(new Error('ENOENT'));
        });

        it('logs error message for non-existent path', async () => {
          await recursiveInstallHandler({ path: 'does/not/exist' }, deps);

          expect(consoleLogger.logErrorConsole).toHaveBeenCalledWith(
            'Path does not exist: /project/does/not/exist',
          );
        });

        it('exits with code 1 for non-existent path', async () => {
          await recursiveInstallHandler({ path: 'does/not/exist' }, deps);

          expect(mockExit).toHaveBeenCalledWith(1);
        });

        it('does not call findAllConfigsInTree', async () => {
          await recursiveInstallHandler({ path: 'does/not/exist' }, deps);

          expect(
            mockPackmindCliHexa.findAllConfigsInTree,
          ).not.toHaveBeenCalled();
        });
      });

      describe('with a path pointing to a file', () => {
        beforeEach(() => {
          mockFs.stat.mockResolvedValue({
            isFile: () => false,
            isDirectory: () => false,
          } as unknown as Awaited<ReturnType<typeof fs.stat>>);
        });

        it('logs error message for non-directory path', async () => {
          await recursiveInstallHandler(
            { path: 'apps/frontend/index.ts' },
            deps,
          );

          expect(consoleLogger.logErrorConsole).toHaveBeenCalledWith(
            'Path is not a directory: /project/apps/frontend/index.ts',
          );
        });

        it('exits with code 1 for non-directory path', async () => {
          await recursiveInstallHandler(
            { path: 'apps/frontend/index.ts' },
            deps,
          );

          expect(mockExit).toHaveBeenCalledWith(1);
        });
      });
    });

    describe('playbook clearing after successful recursive install', () => {
      let mockPlaybookRepo: { clearAll: jest.Mock };

      beforeEach(() => {
        mockPlaybookRepo = { clearAll: jest.fn() };
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
        mockPackmindCliHexa.readFullConfig.mockResolvedValue({
          packages: { backend: '*' },
        });
        mockPackmindCliHexa.installPackages.mockResolvedValue({
          filesCreated: 1,
          filesUpdated: 0,
          filesDeleted: 0,
          recipesCount: 0,
          errors: [],
          deployedArtifacts: [],
        });
      });

      it('clears playbook after successful recursive install', async () => {
        await recursiveInstallHandler(
          {},
          {
            ...deps,
            playbookLocalRepository: mockPlaybookRepo as never,
          },
        );

        expect(mockPlaybookRepo.clearAll).toHaveBeenCalled();
      });

      it('does not clear playbook after failed recursive install', async () => {
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
        mockPackmindCliHexa.readFullConfig.mockRejectedValue(
          new Error('Invalid JSON'),
        );

        await recursiveInstallHandler(
          {},
          {
            ...deps,
            playbookLocalRepository: mockPlaybookRepo as never,
          },
        );

        expect(mockPlaybookRepo.clearAll).not.toHaveBeenCalled();
      });
    });
  });
});
