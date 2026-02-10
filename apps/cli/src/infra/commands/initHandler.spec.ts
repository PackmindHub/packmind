import { IConfigFileRepository } from '../../domain/repositories/IConfigFileRepository';
import { IAgentArtifactDetectionService } from '../../application/services/AgentArtifactDetectionService';
import {
  initHandler,
  InitHandlerDependencies,
  InstallDefaultSkillsFunction,
} from './initHandler';
import * as consoleLogger from '../utils/consoleLogger';
import * as configAgentsHandlerModule from './config/configAgentsHandler';
import { createMockPackmindGateway } from '../../mocks/createMockGateways';

jest.mock('../utils/consoleLogger', () => ({
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logConsole: jest.fn(),
  formatCommand: jest.fn((text: string) => `[CMD:${text}]`),
}));

jest.mock('./config/configAgentsHandler', () => ({
  configAgentsHandler: jest.fn(),
}));

const mockConsoleLogger = consoleLogger as jest.Mocked<typeof consoleLogger>;
const mockConfigAgentsHandler =
  configAgentsHandlerModule.configAgentsHandler as jest.MockedFunction<
    typeof configAgentsHandlerModule.configAgentsHandler
  >;

describe('initHandler', () => {
  let mockConfigRepository: jest.Mocked<IConfigFileRepository>;
  let mockAgentDetectionService: jest.Mocked<IAgentArtifactDetectionService>;
  let mockInstallDefaultSkills: jest.MockedFunction<InstallDefaultSkillsFunction>;
  let deps: InitHandlerDependencies;

  beforeEach(() => {
    mockConfigRepository = {
      readConfig: jest.fn(),
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

    deps = {
      configRepository: mockConfigRepository,
      agentDetectionService: mockAgentDetectionService,
      packmindGateway: createMockPackmindGateway(),
      baseDirectory: '/project',
      installDefaultSkills: mockInstallDefaultSkills,
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
});
