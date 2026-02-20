import { DetectionSeverity } from '@packmind/types';
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

import { logInfoConsole, logWarningConsole } from '../utils/consoleLogger';

jest.mock('../utils/consoleLogger', () => ({
  logInfoConsole: jest.fn(),
  logWarningConsole: jest.fn(),
}));

describe('lintHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockHumanLogger: jest.Mocked<HumanReadableLogger>;
  let mockIDELogger: jest.Mocked<IDELintLogger>;
  let mockExit: jest.Mock;
  let mockResolvePath: jest.Mock;
  let deps: LintHandlerDependencies;

  beforeEach(() => {
    mockPackmindCliHexa = {
      tryGetGitRepositoryRoot: jest.fn(),
      readHierarchicalConfig: jest.fn(),
      lintFilesFromConfig: jest.fn(),
      lintFilesAgainstRule: jest.fn(),
    } as unknown as jest.Mocked<PackmindCliHexa>;

    mockHumanLogger = {
      logViolations: jest.fn(),
    } as unknown as jest.Mocked<HumanReadableLogger>;

    mockIDELogger = {
      logViolations: jest.fn(),
    } as unknown as jest.Mocked<IDELintLogger>;

    mockExit = jest.fn();
    mockResolvePath = jest.fn((path) => `/absolute/${path}`);

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
        mockPackmindCliHexa.lintFilesAgainstRule.mockResolvedValue({
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
        hasConfigs: true,
        configs: [{ path: '/project/packmind.json' }],
      });
    });

    describe('when no violations are found', () => {
      it('exits with code 0', async () => {
        mockPackmindCliHexa.lintFilesFromConfig.mockResolvedValue({
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
              {
                line: 1,
                character: 0,
                rule: 'test-rule',
                standard: 'test',
                severity: DetectionSeverity.ERROR,
              },
            ],
          },
        ];

        mockPackmindCliHexa.lintFilesFromConfig.mockResolvedValue({
          violations,
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
                {
                  line: 1,
                  character: 0,
                  rule: 'test-rule',
                  standard: 'test',
                  severity: DetectionSeverity.ERROR,
                },
              ],
            },
          ];

          mockPackmindCliHexa.lintFilesFromConfig.mockResolvedValue({
            violations,
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
          mockPackmindCliHexa.lintFilesFromConfig.mockResolvedValue({
            violations: [],
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
        hasConfigs: true,
        configs: [{ path: '/project/packmind.json' }],
      });
      mockPackmindCliHexa.lintFilesFromConfig.mockResolvedValue({
        violations: [],
      });
    });

    describe('when logger is "human"', () => {
      beforeEach(async () => {
        await lintHandler(createArgs({ logger: Loggers.human }), deps);
      });

      it('calls HumanReadableLogger', () => {
        expect(mockHumanLogger.logViolations).toHaveBeenCalled();
      });

      it('does not call IDELintLogger', () => {
        expect(mockIDELogger.logViolations).not.toHaveBeenCalled();
      });
    });

    describe('when logger is "ide"', () => {
      beforeEach(async () => {
        await lintHandler(createArgs({ logger: Loggers.ide }), deps);
      });

      it('calls IDELintLogger', () => {
        expect(mockIDELogger.logViolations).toHaveBeenCalled();
      });

      it('does not call HumanReadableLogger', () => {
        expect(mockHumanLogger.logViolations).not.toHaveBeenCalled();
      });
    });
  });

  describe('linting mode selection', () => {
    describe('when no config files exist', () => {
      it('throws clear error message', async () => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
          '/project',
        );
        mockPackmindCliHexa.readHierarchicalConfig.mockResolvedValue({
          hasConfigs: false,
          configs: [],
        });

        await expect(lintHandler(createArgs(), deps)).rejects.toThrow(
          'No packmind.json config found. Run `packmind-cli install <some-package>` first to set up linting.',
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
        beforeEach(async () => {
          mockPackmindCliHexa.readHierarchicalConfig.mockResolvedValue({
            hasConfigs: true,
            configs: [{ path: '/project/packmind.json' }],
          });
          mockPackmindCliHexa.lintFilesFromConfig.mockResolvedValue({
            violations: [],
          });

          await lintHandler(createArgs(), deps);
        });

        it('calls lintFilesFromConfig', () => {
          expect(mockPackmindCliHexa.lintFilesFromConfig).toHaveBeenCalled();
        });

        it('does not call lintFilesAgainstRule', () => {
          expect(
            mockPackmindCliHexa.lintFilesAgainstRule,
          ).not.toHaveBeenCalled();
        });
      });

      describe('when no config files exist', () => {
        it('throws error asking to install a package', async () => {
          mockPackmindCliHexa.readHierarchicalConfig.mockResolvedValue({
            hasConfigs: false,
            configs: [],
          });

          await expect(lintHandler(createArgs(), deps)).rejects.toThrow(
            'No packmind.json config found. Run `packmind-cli install <some-package>` first to set up linting.',
          );
        });
      });

      describe('when arguments are provided even if config exists', () => {
        beforeEach(async () => {
          mockPackmindCliHexa.readHierarchicalConfig.mockResolvedValue({
            hasConfigs: true,
            configs: [{ path: '/project/packmind.json' }],
          });
          mockPackmindCliHexa.lintFilesAgainstRule.mockResolvedValue({
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
        });

        it('calls lintFilesAgainstRule', () => {
          expect(mockPackmindCliHexa.lintFilesAgainstRule).toHaveBeenCalled();
        });

        it('does not call lintFilesFromConfig', () => {
          expect(
            mockPackmindCliHexa.lintFilesFromConfig,
          ).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('diff mode validation', () => {
    describe('when diff mode is used outside git repository', () => {
      it('throws error', async () => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);

        await expect(
          lintHandler(createArgs({ diff: DiffMode.FILES }), deps),
        ).rejects.toThrow(
          'The --changed-files and --changed-lines options require the project to be in a Git repository',
        );
      });
    });

    describe('when diff mode is used in a git repository', () => {
      it('does not throw', async () => {
        mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(
          '/project',
        );
        mockPackmindCliHexa.readHierarchicalConfig.mockResolvedValue({
          hasConfigs: true,
          configs: [{ path: '/project/packmind.json' }],
        });
        mockPackmindCliHexa.lintFilesFromConfig.mockResolvedValue({
          violations: [],
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
        hasConfigs: true,
        configs: [{ path: '/project/packmind.json' }],
      });
      mockPackmindCliHexa.lintFilesFromConfig.mockResolvedValue({
        violations: [],
      });

      await lintHandler(createArgs(), deps);

      expect(logInfoConsole).toHaveBeenCalledWith(
        expect.stringMatching(/^Lint completed in \d+\.\d+s$/),
      );
    });
  });

  describe('--continue-on-missing-key flag', () => {
    beforeEach(() => {
      mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue('/project');
      mockPackmindCliHexa.readHierarchicalConfig.mockResolvedValue({
        hasConfigs: true,
        configs: [{ path: '/project/packmind.json' }],
      });
    });

    describe('when not logged in and flag is set', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.lintFilesFromConfig.mockRejectedValue(
          new NotLoggedInError(),
        );

        await lintHandler(createArgs({ continueOnMissingKey: true }), deps);
      });

      it('logs warning message', () => {
        expect(logWarningConsole).toHaveBeenCalledWith(
          'Warning: Not logged in to Packmind, linting is skipped. Run `packmind-cli login` to authenticate.',
        );
      });

      it('exits with code 0', () => {
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when not logged in and flag is not set', () => {
      it('throws error', async () => {
        mockPackmindCliHexa.lintFilesFromConfig.mockRejectedValue(
          new NotLoggedInError(),
        );

        await expect(
          lintHandler(createArgs({ continueOnMissingKey: false }), deps),
        ).rejects.toThrow("You're not logged in to Packmind");
      });
    });

    describe('when non-API-key errors occur even with flag set', () => {
      it('rethrows the error', async () => {
        mockPackmindCliHexa.lintFilesFromConfig.mockRejectedValue(
          new Error('Some other error'),
        );

        await expect(
          lintHandler(createArgs({ continueOnMissingKey: true }), deps),
        ).rejects.toThrow('Some other error');
      });
    });

    describe('when not logged in error occurs in local linting mode', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.readHierarchicalConfig.mockResolvedValue({
          hasConfigs: true,
          configs: [{ path: '/project/packmind.json' }],
        });
        mockPackmindCliHexa.lintFilesFromConfig.mockRejectedValue(
          new NotLoggedInError(),
        );

        await lintHandler(createArgs({ continueOnMissingKey: true }), deps);
      });

      it('logs warning message', () => {
        expect(logWarningConsole).toHaveBeenCalledWith(
          'Warning: Not logged in to Packmind, linting is skipped. Run `packmind-cli login` to authenticate.',
        );
      });

      it('exits with code 0', () => {
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });
  });
});
