import * as fsPromises from 'fs/promises';
import { RenderMode } from '@packmind/types';
import { IConfigFileRepository } from '../../../domain/repositories/IConfigFileRepository';
import { IDeploymentGateway } from '../../../domain/repositories/IDeploymentGateway';
import { createMockDeploymentGateway } from '../../../mocks/createMockGateways';
import {
  addAgentsHandler,
  AddAgentsHandlerDependencies,
} from './addAgentsHandler';
import * as consoleLogger from '../../utils/consoleLogger';

jest.mock('fs/promises');
jest.mock('inquirer', () => ({
  __esModule: true,
  default: { prompt: jest.fn() },
}));
jest.mock('../../utils/consoleLogger', () => ({
  logConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logWarningConsole: jest.fn(),
}));

const mockFs = fsPromises as jest.Mocked<typeof fsPromises>;
const mockLogger = consoleLogger as jest.Mocked<typeof consoleLogger>;

describe('addAgentsHandler', () => {
  let mockConfigRepository: jest.Mocked<IConfigFileRepository>;
  let mockExit: jest.Mock;
  let mockPromptConfirm: jest.Mock;
  let deps: AddAgentsHandlerDependencies;

  beforeEach(() => {
    jest.clearAllMocks();

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
      deleteAgentsConfig: jest.fn(),
    } as unknown as jest.Mocked<IConfigFileRepository>;

    mockExit = jest.fn();
    mockPromptConfirm = jest.fn().mockResolvedValue(true);
    deps = {
      configRepository: mockConfigRepository,
      exit: mockExit,
      getCwd: () => '/project',
      promptConfirm: mockPromptConfirm,
    };
  });

  describe('when no agent names are provided', () => {
    it('logs an error and lists valid agents', async () => {
      await addAgentsHandler({ agentNames: [] }, deps);

      expect(mockLogger.logErrorConsole).toHaveBeenCalledWith(
        'No agents specified.',
      );
    });

    it('exits with code 1', async () => {
      await addAgentsHandler({ agentNames: [] }, deps);

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when an invalid agent name is provided', () => {
    it('logs the unknown agent name', async () => {
      await addAgentsHandler({ agentNames: ['unknown-agent'] }, deps);

      expect(mockLogger.logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('unknown-agent'),
      );
    });

    it('lists valid agents', async () => {
      await addAgentsHandler({ agentNames: ['unknown-agent'] }, deps);

      expect(mockLogger.logConsole).toHaveBeenCalledWith(
        expect.stringContaining('claude'),
      );
    });

    it('exits with code 1', async () => {
      await addAgentsHandler({ agentNames: ['unknown-agent'] }, deps);

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when no packmind.json files are found', () => {
    beforeEach(() => {
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([]);
      mockConfigRepository.readConfig.mockResolvedValue(null);
    });

    it('logs a warning', async () => {
      await addAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockLogger.logWarningConsole).toHaveBeenCalledWith(
        'No packmind.json files found.',
      );
    });

    it('exits with code 0', async () => {
      await addAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when the agent is already configured in a file', () => {
    beforeEach(() => {
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([]);
      mockConfigRepository.readConfig.mockResolvedValue({
        packages: {},
        agents: ['claude', 'cursor'],
      });
    });

    it('logs a warning for the already-present agent', async () => {
      await addAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockLogger.logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('claude already configured'),
      );
    });

    it('does not call updateAgentsConfig', async () => {
      await addAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockConfigRepository.updateAgentsConfig).not.toHaveBeenCalled();
    });

    it('does not show the install reminder', async () => {
      await addAgentsHandler({ agentNames: ['claude'] }, deps);

      const warns = mockLogger.logWarningConsole.mock.calls.map(([m]) => m);
      expect(warns.some((m) => m.includes('packmind-cli install'))).toBe(false);
    });
  });

  describe('when adding a new agent to multiple files', () => {
    beforeEach(() => {
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([
        '/project/apps/api',
      ]);
      mockConfigRepository.readConfig.mockResolvedValue({
        packages: {},
        agents: ['cursor'],
      });
      mockConfigRepository.updateAgentsConfig.mockResolvedValue();
    });

    it('calls updateAgentsConfig the correct number of times', async () => {
      await addAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockConfigRepository.updateAgentsConfig).toHaveBeenCalledTimes(2);
    });

    it('calls updateAgentsConfig with merged agents', async () => {
      await addAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockConfigRepository.updateAgentsConfig).toHaveBeenCalledWith(
        '/project',
        ['cursor', 'claude'],
      );
    });

    it('logs a success message per updated file', async () => {
      await addAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockLogger.logSuccessConsole).toHaveBeenCalledTimes(2);
    });

    it('shows the install warning at the end', async () => {
      await addAgentsHandler({ agentNames: ['claude'] }, deps);

      const warnCalls = mockLogger.logWarningConsole.mock.calls.map(
        ([msg]) => msg,
      );
      expect(warnCalls.some((m) => m.includes('packmind-cli install'))).toBe(
        true,
      );
    });
  });

  describe('when startDirectory has a malformed packmind.json', () => {
    beforeEach(() => {
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([]);
      mockConfigRepository.readConfig.mockResolvedValue(null);
    });

    it('logs a warning that no files were found', async () => {
      await addAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockLogger.logWarningConsole).toHaveBeenCalledWith(
        'No packmind.json files found.',
      );
    });

    it('does not call updateAgentsConfig', async () => {
      await addAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockConfigRepository.updateAgentsConfig).not.toHaveBeenCalled();
    });
  });

  describe('when --path is used', () => {
    beforeEach(() => {
      mockFs.stat.mockResolvedValue({
        isDirectory: () => true,
      } as fsPromises.Stats);
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([]);
      mockConfigRepository.readConfig.mockResolvedValue({
        packages: {},
        agents: ['cursor'],
      });
      mockConfigRepository.updateAgentsConfig.mockResolvedValue();
    });

    it('shows the path relative to cwd, not to the --path directory', async () => {
      await addAgentsHandler(
        { agentNames: ['claude'], path: 'frontend' },
        deps,
      );

      expect(mockLogger.logSuccessConsole).toHaveBeenCalledWith(
        expect.stringContaining('./frontend/packmind.json'),
      );
    });
  });

  describe('when --path points to a non-existent directory', () => {
    beforeEach(() => {
      mockFs.stat.mockRejectedValue({ code: 'ENOENT' });
    });

    it('logs an error', async () => {
      await addAgentsHandler(
        { agentNames: ['claude'], path: './missing' },
        deps,
      );

      expect(mockLogger.logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Path does not exist'),
      );
    });

    it('exits with code 1', async () => {
      await addAgentsHandler(
        { agentNames: ['claude'], path: './missing' },
        deps,
      );

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when files use organization-level agent defaults', () => {
    let mockDeploymentGateway: jest.Mocked<IDeploymentGateway>;

    beforeEach(() => {
      mockDeploymentGateway = createMockDeploymentGateway();
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([]);
      mockConfigRepository.readConfig.mockResolvedValue({ packages: {} });
      mockConfigRepository.updateAgentsConfig.mockResolvedValue();
      mockDeploymentGateway.getRenderModeConfiguration.mockResolvedValue({
        configuration: {
          id: 'config-1',
          organizationId: 'org-1',
          activeRenderModes: [RenderMode.CLAUDE, RenderMode.CURSOR],
        },
      });
    });

    it('displays a warning about overriding organization settings', async () => {
      await addAgentsHandler(
        { agentNames: ['copilot'] },
        {
          ...deps,
          deploymentGateway: mockDeploymentGateway,
        },
      );

      expect(mockLogger.logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining(
          'currently use organization-level agent settings',
        ),
      );
    });

    it('lists the organization agents currently active', async () => {
      await addAgentsHandler(
        { agentNames: ['copilot'] },
        {
          ...deps,
          deploymentGateway: mockDeploymentGateway,
        },
      );

      expect(mockLogger.logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('claude, cursor'),
      );
    });

    it('warns that organization settings will no longer apply', async () => {
      await addAgentsHandler(
        { agentNames: ['copilot'] },
        {
          ...deps,
          deploymentGateway: mockDeploymentGateway,
        },
      );

      expect(mockLogger.logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('NO LONGER apply'),
      );
    });

    it('prompts the user for confirmation', async () => {
      await addAgentsHandler(
        { agentNames: ['copilot'] },
        {
          ...deps,
          deploymentGateway: mockDeploymentGateway,
        },
      );

      expect(mockPromptConfirm).toHaveBeenCalledWith('Do you want to proceed?');
    });

    describe('when the user confirms', () => {
      beforeEach(() => {
        mockPromptConfirm.mockResolvedValue(true);
      });

      it('proceeds with the update', async () => {
        await addAgentsHandler(
          { agentNames: ['copilot'] },
          {
            ...deps,
            deploymentGateway: mockDeploymentGateway,
          },
        );

        expect(mockConfigRepository.updateAgentsConfig).toHaveBeenCalledWith(
          '/project',
          ['copilot'],
        );
      });

      it('logs a success message', async () => {
        await addAgentsHandler(
          { agentNames: ['copilot'] },
          {
            ...deps,
            deploymentGateway: mockDeploymentGateway,
          },
        );

        expect(mockLogger.logSuccessConsole).toHaveBeenCalledWith(
          expect.stringContaining('Updated'),
        );
      });
    });

    describe('when the user declines', () => {
      beforeEach(() => {
        mockPromptConfirm.mockResolvedValue(false);
      });

      it('does not update any files', async () => {
        await addAgentsHandler(
          { agentNames: ['copilot'] },
          {
            ...deps,
            deploymentGateway: mockDeploymentGateway,
          },
        );

        expect(mockConfigRepository.updateAgentsConfig).not.toHaveBeenCalled();
      });

      it('logs an abort message', async () => {
        await addAgentsHandler(
          { agentNames: ['copilot'] },
          {
            ...deps,
            deploymentGateway: mockDeploymentGateway,
          },
        );

        expect(mockLogger.logConsole).toHaveBeenCalledWith('Aborted.');
      });

      it('exits with code 0', async () => {
        await addAgentsHandler(
          { agentNames: ['copilot'] },
          {
            ...deps,
            deploymentGateway: mockDeploymentGateway,
          },
        );

        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when some files have local agents and some do not', () => {
      beforeEach(() => {
        mockConfigRepository.findDescendantConfigs.mockResolvedValue([
          '/project/apps/api',
        ]);
        mockConfigRepository.readConfig
          .mockResolvedValueOnce({
            packages: {},
            agents: ['cursor'],
          })
          .mockResolvedValueOnce({ packages: {} });
        mockPromptConfirm.mockResolvedValue(true);
      });

      it('includes the org-default file in the warning', async () => {
        await addAgentsHandler(
          { agentNames: ['copilot'] },
          {
            ...deps,
            deploymentGateway: mockDeploymentGateway,
          },
        );

        expect(mockLogger.logWarningConsole).toHaveBeenCalledWith(
          expect.stringContaining('./apps/api/packmind.json'),
        );
      });

      it('does not include the locally configured file in the warning', async () => {
        await addAgentsHandler(
          { agentNames: ['copilot'] },
          {
            ...deps,
            deploymentGateway: mockDeploymentGateway,
          },
        );

        const orgWarning = mockLogger.logWarningConsole.mock.calls.find(
          ([msg]) => msg.includes('organization-level'),
        );
        expect(orgWarning![0]).not.toContain('./packmind.json');
      });

      it('updates both files after confirmation', async () => {
        await addAgentsHandler(
          { agentNames: ['copilot'] },
          {
            ...deps,
            deploymentGateway: mockDeploymentGateway,
          },
        );

        expect(mockConfigRepository.updateAgentsConfig).toHaveBeenCalledTimes(
          2,
        );
      });
    });
  });

  describe('when no deploymentGateway is available', () => {
    beforeEach(() => {
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([]);
      mockConfigRepository.readConfig.mockResolvedValue({ packages: {} });
      mockConfigRepository.updateAgentsConfig.mockResolvedValue();
    });

    it('does not prompt for confirmation', async () => {
      await addAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockPromptConfirm).not.toHaveBeenCalled();
    });

    it('proceeds with the update directly', async () => {
      await addAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockConfigRepository.updateAgentsConfig).toHaveBeenCalledWith(
        '/project',
        ['claude'],
      );
    });
  });

  describe('when the API call fails', () => {
    let mockDeploymentGateway: jest.Mocked<IDeploymentGateway>;

    beforeEach(() => {
      mockDeploymentGateway = createMockDeploymentGateway();
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([]);
      mockConfigRepository.readConfig.mockResolvedValue({ packages: {} });
      mockConfigRepository.updateAgentsConfig.mockResolvedValue();
      mockDeploymentGateway.getRenderModeConfiguration.mockRejectedValue(
        new Error('Unauthorized'),
      );
    });

    it('does not prompt for confirmation', async () => {
      await addAgentsHandler(
        { agentNames: ['claude'] },
        {
          ...deps,
          deploymentGateway: mockDeploymentGateway,
        },
      );

      expect(mockPromptConfirm).not.toHaveBeenCalled();
    });

    it('proceeds with the update directly', async () => {
      await addAgentsHandler(
        { agentNames: ['claude'] },
        {
          ...deps,
          deploymentGateway: mockDeploymentGateway,
        },
      );

      expect(mockConfigRepository.updateAgentsConfig).toHaveBeenCalledWith(
        '/project',
        ['claude'],
      );
    });
  });

  describe('when org has no configuration', () => {
    let mockDeploymentGateway: jest.Mocked<IDeploymentGateway>;

    beforeEach(() => {
      mockDeploymentGateway = createMockDeploymentGateway();
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([]);
      mockConfigRepository.readConfig.mockResolvedValue({ packages: {} });
      mockConfigRepository.updateAgentsConfig.mockResolvedValue();
      mockDeploymentGateway.getRenderModeConfiguration.mockResolvedValue({
        configuration: null,
      });
    });

    it('does not prompt for confirmation', async () => {
      await addAgentsHandler(
        { agentNames: ['claude'] },
        {
          ...deps,
          deploymentGateway: mockDeploymentGateway,
        },
      );

      expect(mockPromptConfirm).not.toHaveBeenCalled();
    });

    it('proceeds with the update directly', async () => {
      await addAgentsHandler(
        { agentNames: ['claude'] },
        {
          ...deps,
          deploymentGateway: mockDeploymentGateway,
        },
      );

      expect(mockConfigRepository.updateAgentsConfig).toHaveBeenCalledWith(
        '/project',
        ['claude'],
      );
    });
  });
});
