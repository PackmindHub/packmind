import { DiffMode } from '../../domain/entities/DiffMode';
import { LintViolation } from '../../domain/entities/LintViolation';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { HumanReadableLogger } from '../repositories/HumanReadableLogger';
import { IDELintLogger } from '../repositories/IDELintLogger';
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
    it('throws error when --draft is used without --rule', async () => {
      const args = createArgs({ draft: true });

      await expect(lintHandler(args, deps)).rejects.toThrow(
        'option --rule is required to use --draft mode',
      );
    });

    it('does not throw when --draft is used with --rule', async () => {
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

      const args = createArgs({
        draft: true,
        rule: { standardSlug: 'test-standard', ruleId: 'test-rule' as never },
      });

      await lintHandler(args, deps);

      expect(mockExit).toHaveBeenCalledWith(0);
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

    it('exits with code 0 when no violations are found', async () => {
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

    it('exits with code 1 when violations are found', async () => {
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

    describe('--continue-on-error flag', () => {
      it('exits with code 0 when violations are found and --continue-on-error is set', async () => {
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

      it('exits with code 0 when no violations and --continue-on-error is set', async () => {
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

    it('uses HumanReadableLogger when logger is "human"', async () => {
      await lintHandler(createArgs({ logger: Loggers.human }), deps);

      expect(mockHumanLogger.logViolations).toHaveBeenCalled();
      expect(mockIDELogger.logViolations).not.toHaveBeenCalled();
    });

    it('uses IDELintLogger when logger is "ide"', async () => {
      await lintHandler(createArgs({ logger: Loggers.ide }), deps);

      expect(mockIDELogger.logViolations).toHaveBeenCalled();
      expect(mockHumanLogger.logViolations).not.toHaveBeenCalled();
    });
  });

  describe('linting mode selection', () => {
    beforeEach(() => {
      mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue('/project');
    });

    it('uses local linting when config files exist and no arguments provided', async () => {
      mockPackmindCliHexa.readHierarchicalConfig.mockResolvedValue({
        hasConfigs: true,
        configs: [{ path: '/project/packmind.json' }],
      });
      mockPackmindCliHexa.lintFilesLocally.mockResolvedValue({
        violations: [],
      });

      await lintHandler(createArgs(), deps);

      expect(mockPackmindCliHexa.lintFilesLocally).toHaveBeenCalled();
      expect(mockPackmindCliHexa.lintFilesInDirectory).not.toHaveBeenCalled();
    });

    it('uses deployment linting when no config files exist', async () => {
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

    it('uses deployment linting when arguments are provided even if config exists', async () => {
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

  describe('--diff option validation', () => {
    it('throws error when --diff is used outside git repository', async () => {
      mockPackmindCliHexa.tryGetGitRepositoryRoot.mockResolvedValue(null);

      await expect(
        lintHandler(createArgs({ diff: DiffMode.FILES }), deps),
      ).rejects.toThrow(
        'The --diff option requires the project to be in a Git repository',
      );
    });

    it('does not throw when --diff is used in a git repository', async () => {
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

      await lintHandler(createArgs({ diff: DiffMode.FILES }), deps);

      expect(mockExit).toHaveBeenCalledWith(0);
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

    it('exits with code 0 and logs warning when API key is missing and flag is set', async () => {
      mockPackmindCliHexa.lintFilesInDirectory.mockRejectedValue(
        new Error(
          'Invalid API key: Please set the PACKMIND_API_KEY_V3 environment variable',
        ),
      );

      await lintHandler(createArgs({ continueOnMissingKey: true }), deps);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Warning: No PACKMIND_API_KEY_V3 set, linting is skipped.',
      );
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('throws error when API key is missing and flag is not set', async () => {
      mockPackmindCliHexa.lintFilesInDirectory.mockRejectedValue(
        new Error(
          'Invalid API key: Please set the PACKMIND_API_KEY_V3 environment variable',
        ),
      );

      await expect(
        lintHandler(createArgs({ continueOnMissingKey: false }), deps),
      ).rejects.toThrow(
        'Please set the PACKMIND_API_KEY_V3 environment variable',
      );
    });

    it('rethrows non-API-key errors even when flag is set', async () => {
      mockPackmindCliHexa.lintFilesInDirectory.mockRejectedValue(
        new Error('Some other error'),
      );

      await expect(
        lintHandler(createArgs({ continueOnMissingKey: true }), deps),
      ).rejects.toThrow('Some other error');
    });

    it('handles missing API key error in local linting mode', async () => {
      mockPackmindCliHexa.readHierarchicalConfig.mockResolvedValue({
        hasConfigs: true,
        configs: [{ path: '/project/packmind.json' }],
      });
      mockPackmindCliHexa.lintFilesLocally.mockRejectedValue(
        new Error(
          'Invalid API key: Please set the PACKMIND_API_KEY_V3 environment variable',
        ),
      );

      await lintHandler(createArgs({ continueOnMissingKey: true }), deps);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Warning: No PACKMIND_API_KEY_V3 set, linting is skipped.',
      );
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });
});
