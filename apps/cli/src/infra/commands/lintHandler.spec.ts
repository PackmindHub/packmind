import { DiffMode } from '../../domain/entities/DiffMode';
import { LintViolation } from '../../domain/entities/LintViolation';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { HumanReadableLogger } from '../repositories/HumanReadableLogger';
import { IDELintLogger } from '../repositories/IDELintLogger';
import { NotLoggedInError } from '../../domain/errors/NotLoggedInError';
import {
  lintHandler,
  LintHandlerArgs,
  LintHandlerDependencies,
  Loggers,
} from './lintHandler';

describe('lintHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockHumanLogger: jest.Mocked<HumanReadableLogger>;
  let mockIDELogger: jest.Mocked<IDELintLogger>;
  let mockExit: jest.Mock;
  let mockResolvePath: jest.Mock;
  let deps: LintHandlerDependencies;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    mockPackmindCliHexa = {
      tryGetGitRepositoryRoot: jest.fn(),
      readHierarchicalConfig: jest.fn(),
      lintFilesLocally: jest.fn(),
      lintFilesInDirectory: jest.fn(),
    } as unknown as jest.Mocked<PackmindCliHexa>;

    mockHumanLogger = {
      logViolations: jest.fn(),
    } as unknown as jest.Mocked<HumanReadableLogger>;

    mockIDELogger = {
      logViolations: jest.fn(),
    } as unknown as jest.Mocked<IDELintLogger>;

    mockExit = jest.fn();
    mockResolvePath = jest.fn((path) => `/absolute/${path}`);
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    deps = {
      packmindCliHexa: mockPackmindCliHexa,
      humanReadableLogger: mockHumanLogger,
      ideLintLogger: mockIDELogger,
      exit: mockExit,
      resolvePath: mockResolvePath,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createArgs = (
    overrides: Partial<LintHandlerArgs> = {},
  ): LintHandlerArgs => ({
    draft: false,
    debug: false,
    logger: Loggers.human,
    continueOnError: false,
    continueOnMissingKey: false,
    ...overrides,
  });

  describe('argument validation', () => {
    describe('when --draft is used without --rule', () => {
      it('throws error', async () => {
        const args = createArgs({ draft: true });

        await expect(lintHandler(args, deps)).rejects.toThrow(
          'option --rule is required to use --draft mode',
        );
      });
    });

    describe('when --draft is used with --rule', () => {
      it('does not throw', async () => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
          '/project',
        );
        mockPackmindCliHexa.readHierarchicalConfig.mockResolvedValue({
          hasConfigs: false,
          configs: [],
        });
        mockPackmindCliHexa.lintFilesInDirectory.mockResolvedValue({
          violations: [],
          summary: {
            totalFiles: 0,
            violatedFiles: 0,
            totalViolations: 0,
            standardsChecked: [],
          },
        });

        const args = createArgs({
          draft: true,
          rule: { standardSlug: 'test-standard', ruleId: 'test-rule' as never },
        });

        await lintHandler(args, deps);

        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });
  });

  describe('exit code behavior', () => {
    beforeEach(() => {
      mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue('/project');
      mockPackmindCliHexa.readHierarchicalConfig.mockResolvedValue({
        hasConfigs: false,
        configs: [],
      });
    });

    describe('when no violations are found', () => {
      it('exits with code 0', async () => {
        mockPackmindCliHexa.lintFilesInDirectory.mockResolvedValue({
          violations: [],
          summary: {
            totalFiles: 1,
            violatedFiles: 0,
            totalViolations: 0,
            standardsChecked: [],
          },
        });

        await lintHandler(createArgs({ path: '/project' }), deps);

        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when violations are found', () => {
      it('exits with code 1', async () => {
        const violations: LintViolation[] = [
          {
            file: '/project/file.ts',
            violations: [
              { line: 1, character: 0, rule: 'test-rule', standard: 'test' },
            ],
          },
        ];

        mockPackmindCliHexa.lintFilesInDirectory.mockResolvedValue({
          violations,
          summary: {
            totalFiles: 1,
            violatedFiles: 1,
            totalViolations: 1,
            standardsChecked: ['test'],
          },
        });

        await lintHandler(createArgs({ path: '/project' }), deps);

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('--continue-on-error flag', () => {
      describe('when violations are found and --continue-on-error is set', () => {
        it('exits with code 0', async () => {
          const violations: LintViolation[] = [
            {
              file: '/project/file.ts',
              violations: [
                { line: 1, character: 0, rule: 'test-rule', standard: 'test' },
              ],
            },
          ];

          mockPackmindCliHexa.lintFilesInDirectory.mockResolvedValue({
            violations,
            summary: {
              totalFiles: 1,
              violatedFiles: 1,
              totalViolations: 1,
              standardsChecked: ['test'],
            },
          });

          await lintHandler(
            createArgs({ path: '/project', continueOnError: true }),
            deps,
          );

          expect(mockExit).toHaveBeenCalledWith(0);
        });
      });

      describe('when no violations and --continue-on-error is set', () => {
        it('exits with code 0', async () => {
          mockPackmindCliHexa.lintFilesInDirectory.mockResolvedValue({
            violations: [],
            summary: {
              totalFiles: 1,
              violatedFiles: 0,
              totalViolations: 0,
              standardsChecked: [],
            },
          });

          await lintHandler(
            createArgs({ path: '/project', continueOnError: true }),
            deps,
          );

          expect(mockExit).toHaveBeenCalledWith(0);
        });
      });
    });
  });

  describe('logger selection', () => {
    beforeEach(() => {
      mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue('/project');
      mockPackmindCliHexa.readHierarchicalConfig.mockResolvedValue({
        hasConfigs: false,
        configs: [],
      });
      mockPackmindCliHexa.lintFilesInDirectory.mockResolvedValue({
        violations: [],
        summary: {
          totalFiles: 0,
          violatedFiles: 0,
          totalViolations: 0,
          standardsChecked: [],
        },
      });
    });

    describe('when logger is "human"', () => {
      it('uses HumanReadableLogger', async () => {
        await lintHandler(createArgs({ logger: Loggers.human }), deps);

        expect(mockHumanLogger.logViolations).toHaveBeenCalled();
        expect(mockIDELogger.logViolations).not.toHaveBeenCalled();
      });
    });

    describe('when logger is "ide"', () => {
      it('uses IDELintLogger', async () => {
        await lintHandler(createArgs({ logger: Loggers.ide }), deps);

        expect(mockIDELogger.logViolations).toHaveBeenCalled();
        expect(mockHumanLogger.logViolations).not.toHaveBeenCalled();
      });
    });
  });

  describe('linting mode selection', () => {
    describe('when not in a git repository and no config files exist', () => {
      it('throws clear error message', async () => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);
        mockPackmindCliHexa.readHierarchicalConfig.mockResolvedValue({
          hasConfigs: false,
          configs: [],
        });

        await expect(lintHandler(createArgs(), deps)).rejects.toThrow(
          'Unable to run linting: no packmind.json config found and this is not a Git repository',
        );
      });
    });

    describe('when in a git repository', () => {
      beforeEach(() => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
          '/project',
        );
      });

      describe('when config files exist and no arguments provided', () => {
        it('uses local linting', async () => {
          mockPackmindCliHexa.readHierarchicalConfig.mockResolvedValue({
            hasConfigs: true,
            configs: [{ path: '/project/packmind.json' }],
          });
          mockPackmindCliHexa.lintFilesLocally.mockResolvedValue({
            violations: [],
          });

          await lintHandler(createArgs(), deps);

          expect(mockPackmindCliHexa.lintFilesLocally).toHaveBeenCalled();
          expect(
            mockPackmindCliHexa.lintFilesInDirectory,
          ).not.toHaveBeenCalled();
        });
      });

      describe('when no config files exist', () => {
        it('uses deployment linting', async () => {
          mockPackmindCliHexa.readHierarchicalConfig.mockResolvedValue({
            hasConfigs: false,
            configs: [],
          });
          mockPackmindCliHexa.lintFilesInDirectory.mockResolvedValue({
            violations: [],
            summary: {
              totalFiles: 0,
              violatedFiles: 0,
              totalViolations: 0,
              standardsChecked: [],
            },
          });

          await lintHandler(createArgs(), deps);

          expect(mockPackmindCliHexa.lintFilesInDirectory).toHaveBeenCalled();
          expect(mockPackmindCliHexa.lintFilesLocally).not.toHaveBeenCalled();
        });
      });

      describe('when arguments are provided even if config exists', () => {
        it('uses deployment linting', async () => {
          mockPackmindCliHexa.readHierarchicalConfig.mockResolvedValue({
            hasConfigs: true,
            configs: [{ path: '/project/packmind.json' }],
          });
          mockPackmindCliHexa.lintFilesInDirectory.mockResolvedValue({
            violations: [],
            summary: {
              totalFiles: 0,
              violatedFiles: 0,
              totalViolations: 0,
              standardsChecked: [],
            },
          });

          await lintHandler(
            createArgs({
              draft: true,
              rule: { standardSlug: 'test', ruleId: 'rule-1' as never },
            }),
            deps,
          );

          expect(mockPackmindCliHexa.lintFilesInDirectory).toHaveBeenCalled();
          expect(mockPackmindCliHexa.lintFilesLocally).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('--diff option validation', () => {
    describe('when --diff is used outside git repository', () => {
      it('throws error', async () => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);

        await expect(
          lintHandler(createArgs({ diff: DiffMode.FILES }), deps),
        ).rejects.toThrow(
          'The --diff option requires the project to be in a Git repository',
        );
      });
    });

    describe('when --diff is used in a git repository', () => {
      it('does not throw', async () => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
          '/project',
        );
        mockPackmindCliHexa.readHierarchicalConfig.mockResolvedValue({
          hasConfigs: false,
          configs: [],
        });
        mockPackmindCliHexa.lintFilesInDirectory.mockResolvedValue({
          violations: [],
          summary: {
            totalFiles: 0,
            violatedFiles: 0,
            totalViolations: 0,
            standardsChecked: [],
          },
        });

        await lintHandler(createArgs({ diff: DiffMode.FILES }), deps);

        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });
  });

  describe('output', () => {
    it('logs completion time', async () => {
      mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue('/project');
      mockPackmindCliHexa.readHierarchicalConfig.mockResolvedValue({
        hasConfigs: false,
        configs: [],
      });
      mockPackmindCliHexa.lintFilesInDirectory.mockResolvedValue({
        violations: [],
        summary: {
          totalFiles: 0,
          violatedFiles: 0,
          totalViolations: 0,
          standardsChecked: [],
        },
      });

      await lintHandler(createArgs(), deps);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^Lint completed in \d+\.\d+s$/),
      );
    });
  });

  describe('--continue-on-missing-key flag', () => {
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue('/project');
      mockPackmindCliHexa.readHierarchicalConfig.mockResolvedValue({
        hasConfigs: false,
        configs: [],
      });
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    describe('when not logged in and flag is set', () => {
      it('exits with code 0 and logs warning', async () => {
        mockPackmindCliHexa.lintFilesInDirectory.mockRejectedValue(
          new NotLoggedInError(),
        );

        await lintHandler(createArgs({ continueOnMissingKey: true }), deps);

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Warning: Not logged in to Packmind, linting is skipped. Run `packmind-cli login` to authenticate.',
        );
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when not logged in and flag is not set', () => {
      it('throws error', async () => {
        mockPackmindCliHexa.lintFilesInDirectory.mockRejectedValue(
          new NotLoggedInError(),
        );

        await expect(
          lintHandler(createArgs({ continueOnMissingKey: false }), deps),
        ).rejects.toThrow("You're not logged in to Packmind");
      });
    });

    describe('when non-API-key errors occur even with flag set', () => {
      it('rethrows the error', async () => {
        mockPackmindCliHexa.lintFilesInDirectory.mockRejectedValue(
          new Error('Some other error'),
        );

        await expect(
          lintHandler(createArgs({ continueOnMissingKey: true }), deps),
        ).rejects.toThrow('Some other error');
      });
    });

    it('handles not logged in error in local linting mode', async () => {
      mockPackmindCliHexa.readHierarchicalConfig.mockResolvedValue({
        hasConfigs: true,
        configs: [{ path: '/project/packmind.json' }],
      });
      mockPackmindCliHexa.lintFilesLocally.mockRejectedValue(
        new NotLoggedInError(),
      );

      await lintHandler(createArgs({ continueOnMissingKey: true }), deps);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Warning: Not logged in to Packmind, linting is skipped. Run `packmind-cli login` to authenticate.',
      );
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });
});
