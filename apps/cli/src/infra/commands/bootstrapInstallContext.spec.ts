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

import { bootstrapInstallContext } from './bootstrapInstallContext';
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
  UserOrganizationRole,
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

function makeOrganizationGatewayFragment(
  role: UserOrganizationRole | null = 'admin',
): IPackmindGateway['organization'] {
  return {
    getOrganization: jest.fn(),
    getCurrentUserRole: jest.fn().mockReturnValue(role),
  } as unknown as IPackmindGateway['organization'];
}

function makeGateway(
  deploymentOverrides: {
    getRenderModeConfiguration?: jest.Mock;
    updateRenderModeConfiguration?: jest.Mock;
  } = {},
  currentUserRole: UserOrganizationRole | null = 'admin',
): jest.Mocked<IPackmindGateway> {
  return {
    deployment: makeDeploymentGatewayFragment(deploymentOverrides),
    organization: makeOrganizationGatewayFragment(currentUserRole),
  } as unknown as jest.Mocked<IPackmindGateway>;
}

const baseDirectory = '/test/project';
const cliVersion = '1.0.0';

afterEach(() => jest.clearAllMocks());

describe('bootstrapInstallContext', () => {
  describe('existing config in cwd', () => {
    let result: Awaited<ReturnType<typeof bootstrapInstallContext>>;
    let agentDetectionService: jest.Mocked<IAgentArtifactDetectionService>;
    let runInit: jest.Mock;

    beforeEach(async () => {
      const configRepository = makeConfigRepository({
        readHierarchicalConfig: jest
          .fn()
          .mockResolvedValue(makeHierarchicalResult(true)),
      });
      agentDetectionService = makeDetectionService();
      const packmindGateway = makeGateway();
      runInit = jest.fn();

      result = await bootstrapInstallContext({
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
    });

    it('returns configReady:true and warned:false without any further calls', () => {
      expect(result).toEqual({
        configReady: true,
        warned: false,
        configCreated: false,
        packagesAdded: [],
      });
    });

    it('does not call detectAgentArtifacts', () => {
      expect(agentDetectionService.detectAgentArtifacts).not.toHaveBeenCalled();
    });

    it('does not call runInit', () => {
      expect(runInit).not.toHaveBeenCalled();
    });
  });

  describe('existing config in ancestor directory', () => {
    describe('when readHierarchicalConfig reports hasConfigs:true', () => {
      it('returns configReady:true and warned:false', async () => {
        const configRepository = makeConfigRepository({
          readHierarchicalConfig: jest
            .fn()
            .mockResolvedValue(makeHierarchicalResult(true)),
        });
        const agentDetectionService = makeDetectionService();

        const result = await bootstrapInstallContext({
          configRepository,
          agentDetectionService,
          packmindGateway: makeGateway(),
          baseDirectory,
          packages: [],
          isTTY: false,
          installDefaultSkills: jest.fn(),
          cliVersion,
        });

        expect(result).toEqual({
          configReady: true,
          warned: false,
          configCreated: false,
          packagesAdded: [],
        });
      });
    });
  });

  describe('TTY + agents detected', () => {
    let result: Awaited<ReturnType<typeof bootstrapInstallContext>>;
    let configRepository: jest.Mocked<IConfigFileRepository>;
    let runInit: jest.Mock;

    beforeEach(async () => {
      configRepository = makeConfigRepository();
      const agentDetectionService = makeDetectionService([
        { agent: 'claude', artifactPath: '/test/project/.claude' },
        { agent: 'cursor', artifactPath: '/test/project/.cursor' },
      ]);
      runInit = jest.fn();

      result = await bootstrapInstallContext({
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
    });

    it('returns configReady:true', () => {
      expect(result.configReady).toBe(true);
    });

    it('calls writeConfig with detected agents', () => {
      expect(configRepository.writeConfig).toHaveBeenCalledWith(
        baseDirectory,
        expect.objectContaining({
          agents: expect.arrayContaining(['claude', 'cursor']),
        } as Partial<PackmindFileConfig>),
      );
    });

    it('does not invoke initHandler', () => {
      expect(runInit).not.toHaveBeenCalled();
    });

    describe('when bootstrap writes packmind.json from detected agents', () => {
      it('reports configCreated:true', async () => {
        const singleAgentConfigRepository = makeConfigRepository();
        const singleAgentDetectionService = makeDetectionService([
          { agent: 'claude', artifactPath: '/test/project/.claude' },
        ]);

        const singleAgentResult = await bootstrapInstallContext({
          configRepository: singleAgentConfigRepository,
          agentDetectionService: singleAgentDetectionService,
          packmindGateway: makeGateway(),
          baseDirectory,
          packages: ['@testing/cli-e2e'],
          isTTY: false,
          installDefaultSkills: jest.fn(),
          cliVersion,
          runInit: jest.fn(),
        });

        expect(singleAgentResult.configCreated).toBe(true);
      });

      it('reports packagesAdded with the given packages', async () => {
        const singleAgentConfigRepository = makeConfigRepository();
        const singleAgentDetectionService = makeDetectionService([
          { agent: 'claude', artifactPath: '/test/project/.claude' },
        ]);

        const singleAgentResult = await bootstrapInstallContext({
          configRepository: singleAgentConfigRepository,
          agentDetectionService: singleAgentDetectionService,
          packmindGateway: makeGateway(),
          baseDirectory,
          packages: ['@testing/cli-e2e'],
          isTTY: false,
          installDefaultSkills: jest.fn(),
          cliVersion,
          runInit: jest.fn(),
        });

        expect(singleAgentResult.packagesAdded).toEqual(['@testing/cli-e2e']);
      });
    });
  });

  describe('TTY + no agents detected', () => {
    let runInit: jest.Mock<Promise<InitHandlerResult>, []>;

    beforeEach(() => {
      runInit = jest
        .fn<Promise<InitHandlerResult>, []>()
        .mockResolvedValue({ success: true, errors: [] });
    });

    it('invokes initHandler once', async () => {
      const configRepository = makeConfigRepository();
      const agentDetectionService = makeDetectionService([]);

      await bootstrapInstallContext({
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
    });

    it('invokes initHandler with showOnboardHint:false', async () => {
      const configRepository = makeConfigRepository();
      const agentDetectionService = makeDetectionService([]);

      await bootstrapInstallContext({
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

      expect(runInit).toHaveBeenCalledWith(
        expect.objectContaining({ showOnboardHint: false }),
      );
    });

    describe('when init succeeds', () => {
      it('returns configReady:true and packagesAdded:[]', async () => {
        const configRepository = makeConfigRepository();
        const agentDetectionService = makeDetectionService([]);

        const result = await bootstrapInstallContext({
          configRepository,
          agentDetectionService,
          packmindGateway: makeGateway(),
          baseDirectory,
          // Even when packages are passed by the CLI, interactive init does not
          // pre-populate them — installUseCase handles that.
          packages: ['@a/x'],
          isTTY: true,
          installDefaultSkills: jest.fn(),
          cliVersion,
          runInit,
        });

        expect(result).toMatchObject({
          configReady: true,
          warned: false,
          configCreated: true,
          packagesAdded: [],
        });
      });
    });

    describe('when init fails', () => {
      it('returns configCreated:false and packagesAdded:[]', async () => {
        const configRepository = makeConfigRepository();
        const agentDetectionService = makeDetectionService([]);
        const failingRunInit = jest
          .fn<Promise<InitHandlerResult>, []>()
          .mockResolvedValue({ success: false, errors: ['boom'] });

        const result = await bootstrapInstallContext({
          configRepository,
          agentDetectionService,
          packmindGateway: makeGateway(),
          baseDirectory,
          packages: ['@a/x'],
          isTTY: true,
          installDefaultSkills: jest.fn(),
          cliVersion,
          runInit: failingRunInit,
        });

        expect(result).toEqual({
          configReady: false,
          warned: true,
          configCreated: false,
          packagesAdded: [],
        });
      });
    });
  });

  describe('non-TTY + agents detected', () => {
    let result: Awaited<ReturnType<typeof bootstrapInstallContext>>;
    let configRepository: jest.Mocked<IConfigFileRepository>;
    let runInit: jest.Mock;

    beforeEach(async () => {
      configRepository = makeConfigRepository();
      const agentDetectionService = makeDetectionService([
        { agent: 'claude', artifactPath: '/test/project/.claude' },
      ]);
      runInit = jest.fn();

      result = await bootstrapInstallContext({
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
    });

    it('returns configReady:true', () => {
      expect(result.configReady).toBe(true);
    });

    it('calls writeConfig', () => {
      expect(configRepository.writeConfig).toHaveBeenCalledTimes(1);
    });

    it('does not invoke initHandler', () => {
      expect(runInit).not.toHaveBeenCalled();
    });
  });

  describe('non-TTY + no agents detected', () => {
    it('returns configReady:false and warned:true', async () => {
      const configRepository = makeConfigRepository();
      const agentDetectionService = makeDetectionService([]);

      const result = await bootstrapInstallContext({
        configRepository,
        agentDetectionService,
        packmindGateway: makeGateway(),
        baseDirectory,
        packages: [],
        isTTY: false,
        installDefaultSkills: jest.fn(),
        cliVersion,
      });

      expect(result).toEqual({
        configReady: false,
        warned: true,
        configCreated: false,
        packagesAdded: [],
      });
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

      await bootstrapInstallContext({
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
    let updateRenderModeConfiguration: jest.Mock;

    beforeEach(async () => {
      const configRepository = makeConfigRepository({
        readConfig: jest
          .fn()
          .mockResolvedValue({ packages: {}, agents: ['claude'] }),
      });
      const agentDetectionService = makeDetectionService([
        { agent: 'claude', artifactPath: '/test/project/.claude' },
      ]);
      updateRenderModeConfiguration = jest.fn().mockResolvedValue(undefined);
      const packmindGateway = makeGateway({
        getRenderModeConfiguration: jest.fn().mockResolvedValue({
          configuration: { activeRenderModes: [] },
        }),
        updateRenderModeConfiguration,
      });

      mockInquirerPrompt.mockResolvedValueOnce({ confirm: true });

      await bootstrapInstallContext({
        configRepository,
        agentDetectionService,
        packmindGateway,
        baseDirectory,
        packages: [],
        isTTY: true,
        installDefaultSkills: jest.fn(),
        cliVersion,
      });
    });

    it('uses an inquirer list prompt', () => {
      expect(mockInquirerPrompt).toHaveBeenCalledTimes(1);
    });

    it('calls the inquirer prompt with a select type', () => {
      expect(mockInquirerPrompt).toHaveBeenCalledWith([
        expect.objectContaining({ type: 'select', name: 'confirm' }),
      ]);
    });

    it('calls updateRenderModeConfiguration with render modes derived from local config agents', () => {
      expect(updateRenderModeConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          activeRenderModes: expect.any(Array),
        }),
      );
    });
  });

  describe('TTY + configReady + org activeRenderModes empty + local config has no agents', () => {
    let updateRenderModeConfiguration: jest.Mock;

    beforeEach(async () => {
      const configRepository = makeConfigRepository({
        readConfig: jest.fn().mockResolvedValue({ packages: {}, agents: [] }),
      });
      const agentDetectionService = makeDetectionService([
        { agent: 'claude', artifactPath: '/test/project/.claude' },
      ]);
      updateRenderModeConfiguration = jest.fn();
      const packmindGateway = makeGateway({
        getRenderModeConfiguration: jest.fn().mockResolvedValue({
          configuration: { activeRenderModes: [] },
        }),
        updateRenderModeConfiguration,
      });

      await bootstrapInstallContext({
        configRepository,
        agentDetectionService,
        packmindGateway,
        baseDirectory,
        packages: [],
        isTTY: true,
        installDefaultSkills: jest.fn(),
        cliVersion,
      });
    });

    it('skips the prompt', () => {
      expect(mockInquirerPrompt).not.toHaveBeenCalled();
    });

    it('does not call updateRenderModeConfiguration', () => {
      expect(updateRenderModeConfiguration).not.toHaveBeenCalled();
    });
  });

  describe('TTY + configReady + org activeRenderModes empty + user is member', () => {
    let updateRenderModeConfiguration: jest.Mock;

    beforeEach(async () => {
      const configRepository = makeConfigRepository({
        readConfig: jest
          .fn()
          .mockResolvedValue({ packages: {}, agents: ['claude'] }),
      });
      const agentDetectionService = makeDetectionService([
        { agent: 'claude', artifactPath: '/test/project/.claude' },
      ]);
      updateRenderModeConfiguration = jest.fn();
      const packmindGateway = makeGateway(
        {
          getRenderModeConfiguration: jest.fn().mockResolvedValue({
            configuration: { activeRenderModes: [] },
          }),
          updateRenderModeConfiguration,
        },
        'member',
      );

      await bootstrapInstallContext({
        configRepository,
        agentDetectionService,
        packmindGateway,
        baseDirectory,
        packages: [],
        isTTY: true,
        installDefaultSkills: jest.fn(),
        cliVersion,
      });
    });

    it('skips the inquirer prompt', () => {
      expect(mockInquirerPrompt).not.toHaveBeenCalled();
    });

    it('skips the readline interface', () => {
      expect(mockCreateInterface).not.toHaveBeenCalled();
    });

    it('does not call updateRenderModeConfiguration', () => {
      expect(updateRenderModeConfiguration).not.toHaveBeenCalled();
    });
  });

  describe('TTY + configReady + org activeRenderModes empty + role is null', () => {
    let updateRenderModeConfiguration: jest.Mock;

    beforeEach(async () => {
      const configRepository = makeConfigRepository({
        readConfig: jest
          .fn()
          .mockResolvedValue({ packages: {}, agents: ['claude'] }),
      });
      const agentDetectionService = makeDetectionService([
        { agent: 'claude', artifactPath: '/test/project/.claude' },
      ]);
      updateRenderModeConfiguration = jest.fn();
      const packmindGateway = makeGateway(
        {
          getRenderModeConfiguration: jest.fn().mockResolvedValue({
            configuration: { activeRenderModes: [] },
          }),
          updateRenderModeConfiguration,
        },
        null,
      );

      await bootstrapInstallContext({
        configRepository,
        agentDetectionService,
        packmindGateway,
        baseDirectory,
        packages: [],
        isTTY: true,
        installDefaultSkills: jest.fn(),
        cliVersion,
      });
    });

    it('skips the inquirer prompt', () => {
      expect(mockInquirerPrompt).not.toHaveBeenCalled();
    });

    it('skips the readline interface', () => {
      expect(mockCreateInterface).not.toHaveBeenCalled();
    });

    it('does not call updateRenderModeConfiguration', () => {
      expect(updateRenderModeConfiguration).not.toHaveBeenCalled();
    });
  });

  describe('TTY + configReady + org activeRenderModes empty + POST returns 403', () => {
    it('resolves without rethrowing', async () => {
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
        bootstrapInstallContext({
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

      delete process.env.PACKMIND_SIMPLE_PROMPT;
    });
  });

  describe('homeAgent (single-agent home install)', () => {
    let result: Awaited<ReturnType<typeof bootstrapInstallContext>>;
    let configRepository: jest.Mocked<IConfigFileRepository>;
    let agentDetectionService: jest.Mocked<IAgentArtifactDetectionService>;
    let runInit: jest.Mock;

    beforeEach(async () => {
      configRepository = makeConfigRepository();
      agentDetectionService = makeDetectionService();
      runInit = jest.fn();

      result = await bootstrapInstallContext({
        configRepository,
        agentDetectionService,
        packmindGateway: makeGateway(),
        baseDirectory,
        packages: ['@space/pkg'],
        isTTY: true,
        installDefaultSkills: jest.fn(),
        cliVersion,
        runInit,
        homeAgent: 'claude',
      });
    });

    it('writes packmind.json with just the home agent', () => {
      expect(configRepository.writeConfig).toHaveBeenCalledWith(baseDirectory, {
        packages: { '@space/pkg': '*' },
        agents: ['claude'],
      });
    });

    it('skips agent detection', () => {
      expect(agentDetectionService.detectAgentArtifacts).not.toHaveBeenCalled();
    });

    it('does not invoke initHandler', () => {
      expect(runInit).not.toHaveBeenCalled();
    });

    it('returns the expected result shape', () => {
      expect(result).toEqual({
        configReady: true,
        warned: false,
        configCreated: true,
        packagesAdded: ['@space/pkg'],
      });
    });

    it('does not prompt for organization-level render modes', async () => {
      const separateConfigRepository = makeConfigRepository();
      const separateAgentDetectionService = makeDetectionService();
      const getRenderModeConfiguration = jest.fn();

      await bootstrapInstallContext({
        configRepository: separateConfigRepository,
        agentDetectionService: separateAgentDetectionService,
        packmindGateway: makeGateway({
          getRenderModeConfiguration,
        }),
        baseDirectory,
        packages: [],
        isTTY: true,
        installDefaultSkills: jest.fn(),
        cliVersion,
        homeAgent: 'claude',
      });

      expect(getRenderModeConfiguration).not.toHaveBeenCalled();
    });

    it('does not invoke inquirer prompt', async () => {
      const separateConfigRepository = makeConfigRepository();
      const separateAgentDetectionService = makeDetectionService();
      const getRenderModeConfiguration = jest.fn();

      await bootstrapInstallContext({
        configRepository: separateConfigRepository,
        agentDetectionService: separateAgentDetectionService,
        packmindGateway: makeGateway({
          getRenderModeConfiguration,
        }),
        baseDirectory,
        packages: [],
        isTTY: true,
        installDefaultSkills: jest.fn(),
        cliVersion,
        homeAgent: 'claude',
      });

      expect(mockInquirerPrompt).not.toHaveBeenCalled();
    });

    describe('when no packmind.json exists', () => {
      it('returns configReady:true without prompting', async () => {
        const noConfigRepository = makeConfigRepository();
        const noConfigResult = await bootstrapInstallContext({
          configRepository: noConfigRepository,
          agentDetectionService: makeDetectionService(),
          packmindGateway: makeGateway(),
          baseDirectory,
          packages: [],
          isTTY: false,
          installDefaultSkills: jest.fn(),
          cliVersion,
          homeAgent: 'claude',
        });

        expect(noConfigResult.configReady).toBe(true);
      });

      it('returns warned:false', async () => {
        const noConfigRepository = makeConfigRepository();
        const noConfigResult = await bootstrapInstallContext({
          configRepository: noConfigRepository,
          agentDetectionService: makeDetectionService(),
          packmindGateway: makeGateway(),
          baseDirectory,
          packages: [],
          isTTY: false,
          installDefaultSkills: jest.fn(),
          cliVersion,
          homeAgent: 'claude',
        });

        expect(noConfigResult.warned).toBe(false);
      });

      it('returns configCreated:true', async () => {
        const noConfigRepository = makeConfigRepository();
        const noConfigResult = await bootstrapInstallContext({
          configRepository: noConfigRepository,
          agentDetectionService: makeDetectionService(),
          packmindGateway: makeGateway(),
          baseDirectory,
          packages: [],
          isTTY: false,
          installDefaultSkills: jest.fn(),
          cliVersion,
          homeAgent: 'claude',
        });

        expect(noConfigResult.configCreated).toBe(true);
      });
    });
  });
});
