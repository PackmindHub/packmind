import { PackmindCliHexa } from '../../PackmindCliHexa';
import {
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
