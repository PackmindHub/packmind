const mockInquirerPrompt = jest.fn();
const mockCreateInterface = jest.fn();

jest.mock('inquirer', () => ({
  __esModule: true,
  default: {
    prompt: (...args: unknown[]) => mockInquirerPrompt(...args),
  },
}));

jest.mock('readline', () => ({
  createInterface: (...args: unknown[]) => mockCreateInterface(...args),
}));

jest.mock('../utils/consoleLogger', () => ({
  logConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logWarningConsole: jest.fn(),
  logErrorConsole: jest.fn(),
}));

import { installPreflightHandler } from './installPreflightHandler';
import * as consoleLogger from '../utils/consoleLogger';
import { IConfigFileRepository } from '../../domain/repositories/IConfigFileRepository';
import { IAgentArtifactDetectionService } from '../../application/services/AgentArtifactDetectionService';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { InitHandlerResult } from './initHandler';
import {
  CodingAgent,
  HierarchicalConfigResult,
  PackmindFileConfig,
  RenderMode,
} from '@packmind/types';

const mockLogger = consoleLogger as jest.Mocked<typeof consoleLogger>;

function makeHierarchicalResult(hasConfigs: boolean): HierarchicalConfigResult {
  return { packages: {}, configPaths: [], hasConfigs };
}

function makeConfigRepository(
  overrides: Partial<jest.Mocked<IConfigFileRepository>> = {},
): jest.Mocked<IConfigFileRepository> {
  return {
    writeConfig: jest.fn().mockResolvedValue(undefined),
    configExists: jest.fn().mockResolvedValue(false),
    readConfig: jest.fn().mockResolvedValue(null),
    addPackagesToConfig: jest.fn().mockResolvedValue(undefined),
    findDescendantConfigs: jest.fn().mockResolvedValue([]),
    readHierarchicalConfig: jest
      .fn()
      .mockResolvedValue(makeHierarchicalResult(false)),
    findAllConfigsInTree: jest
      .fn()
      .mockResolvedValue({ configs: [], hasConfigs: false, basePath: '/' }),
    updateConfig: jest.fn().mockResolvedValue(undefined),
    updateAgentsConfig: jest.fn().mockResolvedValue(undefined),
    deleteAgentsConfig: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeDetectionService(
  artifacts: Array<{ agent: CodingAgent; artifactPath: string }> = [],
): jest.Mocked<IAgentArtifactDetectionService> {
  return {
    detectAgentArtifacts: jest.fn().mockResolvedValue(artifacts),
  };
}

function makeDeploymentGatewayFragment(
  overrides: {
    getRenderModeConfiguration?: jest.Mock;
    updateRenderModeConfiguration?: jest.Mock;
  } = {},
): IPackmindGateway['deployment'] {
  return {
    pull: jest.fn(),
    install: jest.fn(),
    getDeployed: jest.fn(),
    getContentByVersions: jest.fn(),
    notifyDistribution: jest.fn(),
    notifyArtefactsDistribution: jest.fn(),
    getRenderModeConfiguration: jest.fn().mockResolvedValue({
      configuration: { activeRenderModes: [RenderMode.PACKMIND] },
    }),
    updateRenderModeConfiguration: jest.fn().mockResolvedValue(undefined),
    getLatestVersion: jest.fn(),
    ...overrides,
  } as unknown as IPackmindGateway['deployment'];
}

function makeGateway(
  deploymentOverrides: {
    getRenderModeConfiguration?: jest.Mock;
    updateRenderModeConfiguration?: jest.Mock;
  } = {},
): jest.Mocked<IPackmindGateway> {
  return {
    deployment: makeDeploymentGatewayFragment(deploymentOverrides),
  } as unknown as jest.Mocked<IPackmindGateway>;
}

const baseDirectory = '/test/project';
const cliVersion = '1.0.0';

afterEach(() => jest.clearAllMocks());

describe('installPreflightHandler', () => {
  describe('existing config in cwd', () => {
    it('returns configReady:true and warned:false without any further calls', async () => {
      const configRepository = makeConfigRepository({
        readHierarchicalConfig: jest
          .fn()
          .mockResolvedValue(makeHierarchicalResult(true)),
      });
      const agentDetectionService = makeDetectionService();
      const packmindGateway = makeGateway();
      const runInit = jest.fn();

      const result = await installPreflightHandler({
        configRepository,
        agentDetectionService,
        packmindGateway,
        baseDirectory,
        packages: [],
        isTTY: false,
        installDefaultSkills: jest.fn(),
        cliVersion,
        runInit,
      });

      expect(result).toEqual({ configReady: true, warned: false });
      expect(agentDetectionService.detectAgentArtifacts).not.toHaveBeenCalled();
      expect(runInit).not.toHaveBeenCalled();
    });
  });

  describe('existing config in ancestor directory', () => {
    it('returns configReady:true and warned:false when readHierarchicalConfig reports hasConfigs:true', async () => {
      const configRepository = makeConfigRepository({
        readHierarchicalConfig: jest
          .fn()
          .mockResolvedValue(makeHierarchicalResult(true)),
      });
      const agentDetectionService = makeDetectionService();

      const result = await installPreflightHandler({
        configRepository,
        agentDetectionService,
        packmindGateway: makeGateway(),
        baseDirectory,
        packages: [],
        isTTY: false,
        installDefaultSkills: jest.fn(),
        cliVersion,
      });

      expect(result).toEqual({ configReady: true, warned: false });
    });
  });

  describe('TTY + agents detected', () => {
    it('calls writeConfig with detected agents and does not call initHandler', async () => {
      const configRepository = makeConfigRepository();
      const agentDetectionService = makeDetectionService([
        { agent: 'claude', artifactPath: '/test/project/.claude' },
        { agent: 'cursor', artifactPath: '/test/project/.cursor' },
      ]);
      const runInit = jest.fn();

      const result = await installPreflightHandler({
        configRepository,
        agentDetectionService,
        packmindGateway: makeGateway({
          getRenderModeConfiguration: jest.fn().mockResolvedValue({
            configuration: { activeRenderModes: [RenderMode.PACKMIND] },
          }),
        }),
        baseDirectory,
        packages: [],
        isTTY: true,
        installDefaultSkills: jest.fn(),
        cliVersion,
        runInit,
      });

      expect(result.configReady).toBe(true);
      expect(configRepository.writeConfig).toHaveBeenCalledWith(
        baseDirectory,
        expect.objectContaining({
          agents: expect.arrayContaining(['claude', 'cursor']),
        } as Partial<PackmindFileConfig>),
      );
      expect(runInit).not.toHaveBeenCalled();
    });
  });

  describe('TTY + no agents detected', () => {
    it('invokes initHandler with showOnboardHint:false', async () => {
      const configRepository = makeConfigRepository();
      const agentDetectionService = makeDetectionService([]);
      const runInit = jest
        .fn<Promise<InitHandlerResult>, []>()
        .mockResolvedValue({ success: true, errors: [] });

      await installPreflightHandler({
        configRepository,
        agentDetectionService,
        packmindGateway: makeGateway(),
        baseDirectory,
        packages: [],
        isTTY: true,
        installDefaultSkills: jest.fn(),
        cliVersion,
        runInit,
      });

      expect(runInit).toHaveBeenCalledTimes(1);
      expect(runInit).toHaveBeenCalledWith(
        expect.objectContaining({ showOnboardHint: false }),
      );
    });
  });

  describe('non-TTY + agents detected', () => {
    it('calls writeConfig and does not invoke initHandler', async () => {
      const configRepository = makeConfigRepository();
      const agentDetectionService = makeDetectionService([
        { agent: 'claude', artifactPath: '/test/project/.claude' },
      ]);
      const runInit = jest.fn();

      const result = await installPreflightHandler({
        configRepository,
        agentDetectionService,
        packmindGateway: makeGateway(),
        baseDirectory,
        packages: [],
        isTTY: false,
        installDefaultSkills: jest.fn(),
        cliVersion,
        runInit,
      });

      expect(result.configReady).toBe(true);
      expect(configRepository.writeConfig).toHaveBeenCalledTimes(1);
      expect(runInit).not.toHaveBeenCalled();
    });
  });

  describe('non-TTY + no agents detected', () => {
    it('logs a warning and returns configReady:false and warned:true', async () => {
      const configRepository = makeConfigRepository();
      const agentDetectionService = makeDetectionService([]);

      const result = await installPreflightHandler({
        configRepository,
        agentDetectionService,
        packmindGateway: makeGateway(),
        baseDirectory,
        packages: [],
        isTTY: false,
        installDefaultSkills: jest.fn(),
        cliVersion,
      });

      expect(result).toEqual({ configReady: false, warned: true });
      expect(mockLogger.logWarningConsole).toHaveBeenCalledWith(
        'No packmind.json and no agent context detected — run `packmind-cli init` to configure.',
      );
    });
  });

  describe('TTY + configReady + org activeRenderModes empty + user accepts prompt', () => {
    it('calls updateRenderModeConfiguration with render modes derived from local config agents', async () => {
      const configRepository = makeConfigRepository({
        readConfig: jest
          .fn()
          .mockResolvedValue({ packages: {}, agents: ['claude'] }),
      });
      const agentDetectionService = makeDetectionService([
        { agent: 'claude', artifactPath: '/test/project/.claude' },
      ]);
      const updateRenderModeConfiguration = jest
        .fn()
        .mockResolvedValue(undefined);
      const packmindGateway = makeGateway({
        getRenderModeConfiguration: jest.fn().mockResolvedValue({
          configuration: { activeRenderModes: [] },
        }),
        updateRenderModeConfiguration,
      });

      process.env.PACKMIND_SIMPLE_PROMPT = '1';

      const mockClose = jest.fn();
      mockCreateInterface.mockReturnValue({
        question: jest
          .fn()
          .mockImplementationOnce((_: string, cb: (answer: string) => void) =>
            cb('y'),
          ),
        close: mockClose,
      });

      await installPreflightHandler({
        configRepository,
        agentDetectionService,
        packmindGateway,
        baseDirectory,
        packages: [],
        isTTY: true,
        installDefaultSkills: jest.fn(),
        cliVersion,
      });

      expect(updateRenderModeConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          activeRenderModes: expect.any(Array),
        }),
      );

      delete process.env.PACKMIND_SIMPLE_PROMPT;
    });
  });

  describe('TTY + configReady + org activeRenderModes empty + inquirer list prompt', () => {
    it('uses an inquirer list prompt and reuses local config agents', async () => {
      const configRepository = makeConfigRepository({
        readConfig: jest
          .fn()
          .mockResolvedValue({ packages: {}, agents: ['claude'] }),
      });
      const agentDetectionService = makeDetectionService([
        { agent: 'claude', artifactPath: '/test/project/.claude' },
      ]);
      const updateRenderModeConfiguration = jest
        .fn()
        .mockResolvedValue(undefined);
      const packmindGateway = makeGateway({
        getRenderModeConfiguration: jest.fn().mockResolvedValue({
          configuration: { activeRenderModes: [] },
        }),
        updateRenderModeConfiguration,
      });

      mockInquirerPrompt.mockResolvedValueOnce({ confirm: true });

      await installPreflightHandler({
        configRepository,
        agentDetectionService,
        packmindGateway,
        baseDirectory,
        packages: [],
        isTTY: true,
        installDefaultSkills: jest.fn(),
        cliVersion,
      });

      expect(mockInquirerPrompt).toHaveBeenCalledTimes(1);
      expect(mockInquirerPrompt).toHaveBeenCalledWith([
        expect.objectContaining({ type: 'select', name: 'confirm' }),
      ]);
      expect(updateRenderModeConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          activeRenderModes: expect.any(Array),
        }),
      );
    });
  });

  describe('TTY + configReady + org activeRenderModes empty + local config has no agents', () => {
    it('skips the prompt and does not call updateRenderModeConfiguration', async () => {
      const configRepository = makeConfigRepository({
        readConfig: jest.fn().mockResolvedValue({ packages: {}, agents: [] }),
      });
      const agentDetectionService = makeDetectionService([
        { agent: 'claude', artifactPath: '/test/project/.claude' },
      ]);
      const updateRenderModeConfiguration = jest.fn();
      const packmindGateway = makeGateway({
        getRenderModeConfiguration: jest.fn().mockResolvedValue({
          configuration: { activeRenderModes: [] },
        }),
        updateRenderModeConfiguration,
      });

      await installPreflightHandler({
        configRepository,
        agentDetectionService,
        packmindGateway,
        baseDirectory,
        packages: [],
        isTTY: true,
        installDefaultSkills: jest.fn(),
        cliVersion,
      });

      expect(mockInquirerPrompt).not.toHaveBeenCalled();
      expect(updateRenderModeConfiguration).not.toHaveBeenCalled();
    });
  });

  describe('TTY + configReady + org activeRenderModes empty + POST returns 403', () => {
    it('logs a permission info message without rethrowing', async () => {
      const configRepository = makeConfigRepository({
        readConfig: jest
          .fn()
          .mockResolvedValue({ packages: {}, agents: ['claude'] }),
      });
      const agentDetectionService = makeDetectionService([
        { agent: 'claude', artifactPath: '/test/project/.claude' },
      ]);
      const forbidden = Object.assign(new Error('Forbidden'), {
        statusCode: 403,
      });
      const packmindGateway = makeGateway({
        getRenderModeConfiguration: jest.fn().mockResolvedValue({
          configuration: { activeRenderModes: [] },
        }),
        updateRenderModeConfiguration: jest.fn().mockRejectedValue(forbidden),
      });

      process.env.PACKMIND_SIMPLE_PROMPT = '1';

      const mockClose = jest.fn();
      mockCreateInterface.mockReturnValue({
        question: jest
          .fn()
          .mockImplementationOnce((_: string, cb: (answer: string) => void) =>
            cb('y'),
          ),
        close: mockClose,
      });

      await expect(
        installPreflightHandler({
          configRepository,
          agentDetectionService,
          packmindGateway,
          baseDirectory,
          packages: [],
          isTTY: true,
          installDefaultSkills: jest.fn(),
          cliVersion,
        }),
      ).resolves.not.toThrow();

      expect(mockLogger.logInfoConsole).toHaveBeenCalledWith(
        "You don't have permission to set organization-level rendering — defaults are being used.",
      );

      delete process.env.PACKMIND_SIMPLE_PROMPT;
    });
  });
});
