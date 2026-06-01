import { IConfigFileRepository } from '../../domain/repositories/IConfigFileRepository';
import { IAgentArtifactDetectionService } from '../../application/services/AgentArtifactDetectionService';
import {
  EnsureCliVersionFunction,
  initHandler,
  InitHandlerDependencies,
  InstallDefaultSkillsFunction,
} from './initHandler';
import * as consoleLogger from '../utils/consoleLogger';
import * as configAgentsHandlerModule from './config/configAgentsHandler';
import * as incompatibleSkillsHandler from './skills/incompatibleSkillsHandler';
import { createMockPackmindGateway } from '../../mocks/createMockGateways';

jest.mock('../utils/consoleLogger', () => ({
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logWarningConsole: jest.fn(),
  logConsole: jest.fn(),
  formatCommand: jest.fn((text: string) => `[CMD:${text}]`),
}));

jest.mock('./config/configAgentsHandler', () => ({
  configAgentsHandler: jest.fn(),
}));

jest.mock('./skills/incompatibleSkillsHandler', () => ({
  handleIncompatibleInstalledSkillsSilently: jest.fn(),
}));

const mockConsoleLogger = consoleLogger as jest.Mocked<typeof consoleLogger>;
const mockConfigAgentsHandler =
  configAgentsHandlerModule.configAgentsHandler as jest.MockedFunction<
    typeof configAgentsHandlerModule.configAgentsHandler
  >;
const mockIncompatibleSkillsHandler = incompatibleSkillsHandler as jest.Mocked<
  typeof incompatibleSkillsHandler
>;

describe('initHandler', () => {
  let mockConfigRepository: jest.Mocked<IConfigFileRepository>;
  let mockAgentDetectionService: jest.Mocked<IAgentArtifactDetectionService>;
  let mockInstallDefaultSkills: jest.MockedFunction<InstallDefaultSkillsFunction>;
  let mockEnsureCliVersion: jest.MockedFunction<EnsureCliVersionFunction>;
  let deps: InitHandlerDependencies;

  beforeEach(() => {
    mockConfigRepository = {
      readConfig: jest.fn().mockResolvedValue({
        packages: {},
        agents: ['claude'],
      }),
      writeConfig: jest.fn(),
      configExists: jest.fn(),
      addPackagesToConfig: jest.fn(),
      findDescendantConfigs: jest.fn(),
      readHierarchicalConfig: jest.fn(),
      findAllConfigsInTree: jest.fn(),
      updateConfig: jest.fn(),
      updateAgentsConfig: jest.fn(),
    } as unknown as jest.Mocked<IConfigFileRepository>;

    mockAgentDetectionService = {
      detectAgentArtifacts: jest.fn(),
    } as unknown as jest.Mocked<IAgentArtifactDetectionService>;

    mockInstallDefaultSkills = jest.fn();
    mockEnsureCliVersion = jest.fn().mockResolvedValue({ kind: 'no-lockfile' });

    deps = {
      configRepository: mockConfigRepository,
      agentDetectionService: mockAgentDetectionService,
      packmindGateway: createMockPackmindGateway(),
      baseDirectory: '/project',
      installDefaultSkills: mockInstallDefaultSkills,
      ensureCliVersion: mockEnsureCliVersion,
      cliVersion: '1.2.3',
      isTTY: true,
    };

    mockConfigAgentsHandler.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when calling configAgentsHandler', () => {
    beforeEach(async () => {
      mockInstallDefaultSkills.mockResolvedValue({
        filesCreated: 0,
        filesUpdated: 0,
        errors: [],
        skippedSkillsCount: 0,
        skippedIncompatibleSkillNames: [],
        incompatibleInstalledSkills: [],
      });

      await initHandler(deps);
    });

    it('passes configRepository to configAgentsHandler', () => {
      expect(mockConfigAgentsHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          configRepository: mockConfigRepository,
        }),
      );
    });

    it('passes agentDetectionService to configAgentsHandler', () => {
      expect(mockConfigAgentsHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          agentDetectionService: mockAgentDetectionService,
        }),
      );
    });

    it('passes baseDirectory to configAgentsHandler', () => {
      expect(mockConfigAgentsHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          baseDirectory: '/project',
        }),
      );
    });

    it('passes isTTY to configAgentsHandler', () => {
      expect(mockConfigAgentsHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          isTTY: true,
        }),
      );
    });
  });

  describe('when calling installDefaultSkills', () => {
    beforeEach(async () => {
      mockInstallDefaultSkills.mockResolvedValue({
        filesCreated: 0,
        filesUpdated: 0,
        errors: [],
        skippedSkillsCount: 0,
        skippedIncompatibleSkillNames: [],
        incompatibleInstalledSkills: [],
      });

      await initHandler(deps);
    });

    it('passes includeBeta as false', () => {
      expect(mockInstallDefaultSkills).toHaveBeenCalledWith(
        expect.objectContaining({
          includeBeta: false,
        }),
      );
    });

    it('passes cliVersion from deps', () => {
      expect(mockInstallDefaultSkills).toHaveBeenCalledWith(
        expect.objectContaining({
          cliVersion: '1.2.3',
        }),
      );
    });
  });

  describe('when skills installed successfully with files created/updated', () => {
    let result: { success: boolean; errors: string[] };

    beforeEach(async () => {
      mockInstallDefaultSkills.mockResolvedValue({
        filesCreated: 3,
        filesUpdated: 2,
        errors: [],
        skippedSkillsCount: 0,
        skippedIncompatibleSkillNames: [],
        incompatibleInstalledSkills: [],
      });

      result = await initHandler(deps);
    });

    it('displays "Installing default skills..."', () => {
      expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
        'Installing default skills...',
      );
    });

    it('displays "Default skills installed successfully!"', () => {
      expect(mockConsoleLogger.logSuccessConsole).toHaveBeenCalledWith(
        'Default skills installed successfully!',
      );
    });

    it('displays files created count', () => {
      expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
        '  Files created: 3',
      );
    });

    it('displays files updated count', () => {
      expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
        '  Files updated: 2',
      );
    });

    it('displays "Packmind initialized successfully!"', () => {
      expect(mockConsoleLogger.logSuccessConsole).toHaveBeenCalledWith(
        'Packmind initialized successfully!',
      );
    });

    it('displays next step message about /packmind-onboard', () => {
      expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
        expect.stringContaining('/packmind-onboard'),
      );
    });

    it('returns success true', () => {
      expect(result.success).toBe(true);
    });

    it('returns empty errors array', () => {
      expect(result.errors).toEqual([]);
    });
  });

  describe('when only files created', () => {
    beforeEach(async () => {
      mockInstallDefaultSkills.mockResolvedValue({
        filesCreated: 5,
        filesUpdated: 0,
        errors: [],
        skippedSkillsCount: 0,
        skippedIncompatibleSkillNames: [],
        incompatibleInstalledSkills: [],
      });

      await initHandler(deps);
    });

    it('displays files created count', () => {
      expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
        '  Files created: 5',
      );
    });

    it('does not display files updated count', () => {
      expect(mockConsoleLogger.logInfoConsole).not.toHaveBeenCalledWith(
        expect.stringContaining('Files updated'),
      );
    });
  });

  describe('when only files updated', () => {
    beforeEach(async () => {
      mockInstallDefaultSkills.mockResolvedValue({
        filesCreated: 0,
        filesUpdated: 4,
        errors: [],
        skippedSkillsCount: 0,
        skippedIncompatibleSkillNames: [],
        incompatibleInstalledSkills: [],
      });

      await initHandler(deps);
    });

    it('does not display files created count', () => {
      expect(mockConsoleLogger.logInfoConsole).not.toHaveBeenCalledWith(
        expect.stringContaining('Files created'),
      );
    });

    it('displays files updated count', () => {
      expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
        '  Files updated: 4',
      );
    });
  });

  describe('when skills already up to date (0 files)', () => {
    let result: { success: boolean; errors: string[] };

    beforeEach(async () => {
      mockInstallDefaultSkills.mockResolvedValue({
        filesCreated: 0,
        filesUpdated: 0,
        errors: [],
        skippedSkillsCount: 0,
        skippedIncompatibleSkillNames: [],
        incompatibleInstalledSkills: [],
      });

      result = await initHandler(deps);
    });

    it('displays "Default skills are already up to date."', () => {
      expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
        'Default skills are already up to date.',
      );
    });

    it('does not display "Default skills installed successfully!"', () => {
      expect(mockConsoleLogger.logSuccessConsole).not.toHaveBeenCalledWith(
        'Default skills installed successfully!',
      );
    });

    it('displays "Packmind initialized successfully!"', () => {
      expect(mockConsoleLogger.logSuccessConsole).toHaveBeenCalledWith(
        'Packmind initialized successfully!',
      );
    });

    it('displays next step message about /packmind-onboard', () => {
      expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
        expect.stringContaining('/packmind-onboard'),
      );
    });

    it('returns success true', () => {
      expect(result.success).toBe(true);
    });

    it('returns empty errors array', () => {
      expect(result.errors).toEqual([]);
    });
  });

  describe('when skills init fails with errors', () => {
    let result: { success: boolean; errors: string[] };
    const skillErrors = [
      'Error installing skill 1',
      'Error installing skill 2',
    ];

    beforeEach(async () => {
      mockInstallDefaultSkills.mockResolvedValue({
        filesCreated: 0,
        filesUpdated: 0,
        errors: skillErrors,
        skippedSkillsCount: 0,
        skippedIncompatibleSkillNames: [],
        incompatibleInstalledSkills: [],
      });

      result = await initHandler(deps);
    });

    it('returns success false', () => {
      expect(result.success).toBe(false);
    });

    it('returns errors from installDefaultSkills', () => {
      expect(result.errors).toEqual(skillErrors);
    });

    it('does not display "Default skills installed successfully!"', () => {
      expect(mockConsoleLogger.logSuccessConsole).not.toHaveBeenCalledWith(
        'Default skills installed successfully!',
      );
    });

    it('does not display "Packmind initialized successfully!"', () => {
      expect(mockConsoleLogger.logSuccessConsole).not.toHaveBeenCalledWith(
        'Packmind initialized successfully!',
      );
    });

    it('does not display next step message', () => {
      expect(mockConsoleLogger.logInfoConsole).not.toHaveBeenCalledWith(
        expect.stringContaining('/packmind-onboard'),
      );
    });
  });

  describe('when isTTY is false', () => {
    beforeEach(async () => {
      deps.isTTY = false;
      mockInstallDefaultSkills.mockResolvedValue({
        filesCreated: 0,
        filesUpdated: 0,
        errors: [],
        skippedSkillsCount: 0,
        skippedIncompatibleSkillNames: [],
        incompatibleInstalledSkills: [],
      });

      await initHandler(deps);
    });

    it('passes isTTY false to configAgentsHandler', () => {
      expect(mockConfigAgentsHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          isTTY: false,
        }),
      );
    });
  });

  describe('when isTTY is undefined', () => {
    beforeEach(async () => {
      deps.isTTY = undefined;
      mockInstallDefaultSkills.mockResolvedValue({
        filesCreated: 0,
        filesUpdated: 0,
        errors: [],
        skippedSkillsCount: 0,
        skippedIncompatibleSkillNames: [],
        incompatibleInstalledSkills: [],
      });

      await initHandler(deps);
    });

    it('passes isTTY undefined to configAgentsHandler', () => {
      expect(mockConfigAgentsHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          isTTY: undefined,
        }),
      );
    });
  });

  describe('when configured agents do not support skills', () => {
    let result: { success: boolean; errors: string[] };

    beforeEach(async () => {
      mockConfigRepository.readConfig.mockResolvedValue({
        packages: {},
        agents: ['agents_md'],
      });

      result = await initHandler(deps);
    });

    it('does not call installDefaultSkills', () => {
      expect(mockInstallDefaultSkills).not.toHaveBeenCalled();
    });

    it('does not display "Installing default skills..."', () => {
      expect(mockConsoleLogger.logInfoConsole).not.toHaveBeenCalledWith(
        'Installing default skills...',
      );
    });

    it('does not display "Default skills are already up to date."', () => {
      expect(mockConsoleLogger.logInfoConsole).not.toHaveBeenCalledWith(
        'Default skills are already up to date.',
      );
    });

    it('logs a warning explaining the configured agents do not support skills', () => {
      expect(mockConsoleLogger.logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('do not support skills'),
      );
    });

    it('lists the offending configured agent in the warning', () => {
      expect(mockConsoleLogger.logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('agents_md'),
      );
    });

    it('includes the actionable hint pointing to packmind-cli config agents', () => {
      expect(mockConsoleLogger.logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('packmind-cli config agents'),
      );
    });

    it('still displays "Packmind initialized successfully!"', () => {
      expect(mockConsoleLogger.logSuccessConsole).toHaveBeenCalledWith(
        'Packmind initialized successfully!',
      );
    });

    it('returns success true', () => {
      expect(result.success).toBe(true);
    });
  });

  describe('when no agents are configured at all', () => {
    beforeEach(async () => {
      mockConfigRepository.readConfig.mockResolvedValue({
        packages: {},
      });

      await initHandler(deps);
    });

    it('does not call installDefaultSkills', () => {
      expect(mockInstallDefaultSkills).not.toHaveBeenCalled();
    });

    it('logs a warning specific to having zero configured agents', () => {
      expect(mockConsoleLogger.logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('no coding agents are configured'),
      );
    });
  });

  describe('when readConfig returns null', () => {
    beforeEach(async () => {
      mockConfigRepository.readConfig.mockResolvedValue(null);

      await initHandler(deps);
    });

    it('does not call installDefaultSkills', () => {
      expect(mockInstallDefaultSkills).not.toHaveBeenCalled();
    });

    it('warns that no agents are configured', () => {
      expect(mockConsoleLogger.logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('no coding agents are configured'),
      );
    });
  });

  describe('when configured agents are mixed and include a capable one', () => {
    beforeEach(async () => {
      mockConfigRepository.readConfig.mockResolvedValue({
        packages: {},
        agents: ['agents_md', 'claude'],
      });
      mockInstallDefaultSkills.mockResolvedValue({
        filesCreated: 0,
        filesUpdated: 0,
        errors: [],
        skippedSkillsCount: 0,
      });

      await initHandler(deps);
    });

    it('still calls installDefaultSkills', () => {
      expect(mockInstallDefaultSkills).toHaveBeenCalled();
    });

    it('does not log the no-capable-agent warning', () => {
      expect(mockConsoleLogger.logWarningConsole).not.toHaveBeenCalledWith(
        expect.stringContaining('do not support skills'),
      );
    });
  });

  describe('when showOnboardHint is false', () => {
    beforeEach(async () => {
      mockInstallDefaultSkills.mockResolvedValue({
        filesCreated: 1,
        filesUpdated: 0,
        errors: [],
        skippedSkillsCount: 0,
        skippedIncompatibleSkillNames: [],
        incompatibleInstalledSkills: [],
      });

      await initHandler({ ...deps, showOnboardHint: false });
    });

    it('still displays "Packmind initialized successfully!"', () => {
      expect(mockConsoleLogger.logSuccessConsole).toHaveBeenCalledWith(
        'Packmind initialized successfully!',
      );
    });

    it('does not display the /packmind-onboard hint', () => {
      expect(mockConsoleLogger.logInfoConsole).not.toHaveBeenCalledWith(
        expect.stringContaining('/packmind-onboard'),
      );
    });
  });

  describe('CLI version drift detection (ensureCliVersion)', () => {
    beforeEach(() => {
      mockInstallDefaultSkills.mockResolvedValue({
        filesCreated: 0,
        filesUpdated: 0,
        errors: [],
        skippedSkillsCount: 0,
        skippedIncompatibleSkillNames: [],
        incompatibleInstalledSkills: [],
      });
    });

    describe('when calling ensureCliVersion', () => {
      beforeEach(async () => {
        await initHandler(deps);
      });

      it('calls ensureCliVersion exactly once', () => {
        expect(mockEnsureCliVersion).toHaveBeenCalledTimes(1);
      });

      it('calls ensureCliVersion with the running CLI version', () => {
        expect(mockEnsureCliVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            baseDirectory: '/project',
            currentCliVersion: '1.2.3',
            includeBeta: false,
          }),
        );
      });
    });

    describe('when ensureCliVersion returns "older"', () => {
      let driftWarnings: string[];

      beforeEach(async () => {
        mockEnsureCliVersion.mockResolvedValue({
          kind: 'older',
          lockVersion: '99.0.0',
        });

        await initHandler(deps);

        const warnings = mockConsoleLogger.logWarningConsole.mock.calls.map(
          ([msg]) => msg,
        );
        driftWarnings = warnings.filter((msg: string) =>
          msg.includes('older than the version recorded in packmind-lock.json'),
        );
      });

      it('emits exactly one drift warning', () => {
        expect(driftWarnings).toHaveLength(1);
      });

      it('includes the lock version in the warning', () => {
        expect(driftWarnings[0]).toContain('99.0.0');
      });
    });

    describe('when ensureCliVersion returns "newer"', () => {
      beforeEach(async () => {
        mockEnsureCliVersion.mockResolvedValue({
          kind: 'newer',
          lockVersion: '0.0.1',
          upgraded: true,
        });

        await initHandler(deps);
      });

      it('emits an info line about CLI upgrade detected', () => {
        expect(mockConsoleLogger.logInfoConsole).toHaveBeenCalledWith(
          expect.stringContaining('CLI upgrade detected'),
        );
      });
    });

    describe('when ensureCliVersion returns "match"', () => {
      let warnings: string[];
      let upgradeInfos: string[];

      beforeEach(async () => {
        mockEnsureCliVersion.mockResolvedValue({ kind: 'match' });

        await initHandler(deps);

        warnings = mockConsoleLogger.logWarningConsole.mock.calls
          .map(([msg]) => msg)
          .filter((msg: string) =>
            msg.includes('older than the version recorded'),
          );
        upgradeInfos = mockConsoleLogger.logInfoConsole.mock.calls
          .map(([msg]) => msg)
          .filter((msg: string) => msg.includes('CLI upgrade detected'));
      });

      it('emits no drift-related warnings', () => {
        expect(warnings).toHaveLength(0);
      });

      it('emits no upgrade info lines', () => {
        expect(upgradeInfos).toHaveLength(0);
      });
    });

    describe('when ensureCliVersion throws', () => {
      let result: { success: boolean; errors: string[] };

      beforeEach(async () => {
        mockEnsureCliVersion.mockRejectedValue(new Error('boom'));

        result = await initHandler(deps);
      });

      it('continues init and returns success', () => {
        expect(result.success).toBe(true);
      });

      it('still calls installDefaultSkills', () => {
        expect(mockInstallDefaultSkills).toHaveBeenCalled();
      });
    });

    describe('when no ensureCliVersion dependency is provided', () => {
      beforeEach(async () => {
        const depsWithoutEnsure: InitHandlerDependencies = {
          ...deps,
          ensureCliVersion: undefined,
        };

        await initHandler(depsWithoutEnsure);
      });

      it('skips ensureCliVersion', () => {
        expect(mockEnsureCliVersion).not.toHaveBeenCalled();
      });
    });
  });

  describe('silent cleanup of obsolete default skills', () => {
    describe('when default-skills reports obsolete skills', () => {
      const incompatibleInstalledSkills = [
        {
          skillName: 'obsolete-skill',
          filePaths: ['.packmind/skills/obsolete-skill.md'],
        },
      ];

      beforeEach(async () => {
        mockInstallDefaultSkills.mockResolvedValue({
          filesCreated: 0,
          filesUpdated: 0,
          errors: [],
          skippedSkillsCount: 0,
          skippedIncompatibleSkillNames: [],
          incompatibleInstalledSkills,
        });

        await initHandler(deps);
      });

      it('invokes the silent cleanup helper', () => {
        expect(
          mockIncompatibleSkillsHandler.handleIncompatibleInstalledSkillsSilently,
        ).toHaveBeenCalledWith(incompatibleInstalledSkills, '/project');
      });
    });

    describe('when none are reported', () => {
      beforeEach(async () => {
        mockInstallDefaultSkills.mockResolvedValue({
          filesCreated: 0,
          filesUpdated: 0,
          errors: [],
          skippedSkillsCount: 0,
          skippedIncompatibleSkillNames: [],
          incompatibleInstalledSkills: [],
        });

        await initHandler(deps);
      });

      it('does not invoke the silent cleanup helper', () => {
        expect(
          mockIncompatibleSkillsHandler.handleIncompatibleInstalledSkillsSilently,
        ).not.toHaveBeenCalled();
      });
    });
  });
});
