import * as fsPromises from 'fs/promises';
import { IConfigFileRepository } from '../../../../domain/repositories/IConfigFileRepository';
import {
  removeAgentsHandler,
  RemoveAgentsHandlerDependencies,
} from './removeAgentsHandler';
import * as consoleLogger from '../../../utils/consoleLogger';

jest.mock('fs/promises');
jest.mock('inquirer', () => ({
  __esModule: true,
  default: { prompt: jest.fn() },
}));
jest.mock('../../../utils/consoleLogger', () => ({
  formatCommand: jest.fn((text: string) => text),
  logConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logWarningConsole: jest.fn(),
}));

const mockFs = fsPromises as jest.Mocked<typeof fsPromises>;
const mockLogger = consoleLogger as jest.Mocked<typeof consoleLogger>;

describe('removeAgentsHandler', () => {
  let mockConfigRepository: jest.Mocked<IConfigFileRepository>;
  let mockExit: jest.Mock;
  let deps: RemoveAgentsHandlerDependencies;

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
    deps = {
      configRepository: mockConfigRepository,
      exit: mockExit,
      getCwd: () => '/project',
    };
  });

  describe('when no agent names are provided', () => {
    beforeEach(() => {
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([]);
      mockConfigRepository.readConfig.mockResolvedValue({
        packages: {},
        agents: ['claude', 'cursor'],
      });
    });

    it('logs an error', async () => {
      await removeAgentsHandler({ agentNames: [] }, deps);

      expect(mockLogger.logErrorConsole).toHaveBeenCalledWith(
        'No agents specified.',
      );
    });

    it('shows configured agents from packmind.json files', async () => {
      await removeAgentsHandler({ agentNames: [] }, deps);

      expect(mockLogger.logConsole).toHaveBeenCalledWith(
        'Configured agents: claude, cursor',
      );
    });

    it('exits with code 1', async () => {
      await removeAgentsHandler({ agentNames: [] }, deps);

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when an invalid agent name is provided', () => {
    beforeEach(() => {
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([]);
      mockConfigRepository.readConfig.mockResolvedValue({
        packages: {},
        agents: ['claude', 'cursor'],
      });
    });

    it('logs the unknown agent', async () => {
      await removeAgentsHandler({ agentNames: ['unknown-agent'] }, deps);

      expect(mockLogger.logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('unknown-agent'),
      );
    });

    it('shows only configured agents as hint', async () => {
      await removeAgentsHandler({ agentNames: ['unknown-agent'] }, deps);

      expect(mockLogger.logConsole).toHaveBeenCalledWith(
        'Configured agents: claude, cursor',
      );
    });

    it('exits with code 1', async () => {
      await removeAgentsHandler({ agentNames: ['unknown-agent'] }, deps);

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when an invalid agent name is provided and no agents are configured', () => {
    beforeEach(() => {
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([]);
      mockConfigRepository.readConfig.mockResolvedValue({
        packages: {},
      });
    });

    it('shows organization settings message', async () => {
      await removeAgentsHandler({ agentNames: ['unknown-agent'] }, deps);

      expect(mockLogger.logConsole).toHaveBeenCalledWith(
        'No agents are currently configured in any packmind.json file — all projects use organization settings.',
      );
    });
  });

  describe('when an invalid agent name is provided with agents from multiple files', () => {
    beforeEach(() => {
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([
        '/project/apps/api',
      ]);
      mockConfigRepository.readConfig
        .mockResolvedValueOnce({ packages: {}, agents: ['cursor', 'claude'] })
        .mockResolvedValueOnce({ packages: {}, agents: ['claude', 'copilot'] });
    });

    it('shows sorted deduplicated union of configured agents', async () => {
      await removeAgentsHandler({ agentNames: ['unknown-agent'] }, deps);

      expect(mockLogger.logConsole).toHaveBeenCalledWith(
        'Configured agents: claude, copilot, cursor',
      );
    });
  });

  describe('when no packmind.json files are found', () => {
    beforeEach(() => {
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([]);
      mockConfigRepository.readConfig.mockResolvedValue(null);
    });

    it('logs a warning', async () => {
      await removeAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockLogger.logWarningConsole).toHaveBeenCalledWith(
        'No packmind.json files found.',
      );
    });

    it('exits with code 0', async () => {
      await removeAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when the agent is not configured in a file', () => {
    beforeEach(() => {
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([]);
      mockConfigRepository.readConfig.mockResolvedValue({
        packages: {},
        agents: ['cursor'],
      });
    });

    it('logs a warning for the absent agent', async () => {
      await removeAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockLogger.logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('claude not configured'),
      );
    });

    it('does not call updateAgentsConfig', async () => {
      await removeAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockConfigRepository.updateAgentsConfig).not.toHaveBeenCalled();
    });

    it('does not show the install reminder', async () => {
      await removeAgentsHandler({ agentNames: ['claude'] }, deps);

      const infos = mockLogger.logInfoConsole.mock.calls.map(([m]) => m);
      expect(infos.some((m) => m.includes('packmind install'))).toBe(false);
    });
  });

  describe('when removing an agent from multiple files', () => {
    beforeEach(() => {
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([
        '/project/apps/api',
      ]);
      mockConfigRepository.readConfig.mockResolvedValue({
        packages: {},
        agents: ['claude', 'cursor'],
      });
      mockConfigRepository.updateAgentsConfig.mockResolvedValue();
    });

    it('calls updateAgentsConfig with the agent removed', async () => {
      await removeAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockConfigRepository.updateAgentsConfig).toHaveBeenCalledWith(
        '/project',
        ['cursor'],
      );
    });

    it('logs a success message per updated file', async () => {
      await removeAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockLogger.logSuccessConsole).toHaveBeenCalledTimes(2);
    });

    it('shows the install info at the end', async () => {
      await removeAgentsHandler({ agentNames: ['claude'] }, deps);

      const infoCalls = mockLogger.logInfoConsole.mock.calls.map(
        ([msg]) => msg,
      );
      expect(infoCalls.some((m) => m.includes('packmind install'))).toBe(true);
    });
  });

  describe('when removing the last agent from a file', () => {
    beforeEach(() => {
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([]);
      mockConfigRepository.readConfig.mockResolvedValue({
        packages: {},
        agents: ['claude'],
      });
      mockConfigRepository.deleteAgentsConfig.mockResolvedValue(undefined);
    });

    it('calls deleteAgentsConfig with the correct directory', async () => {
      await removeAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockConfigRepository.deleteAgentsConfig).toHaveBeenCalledWith(
        '/project',
      );
    });

    it('does not call updateAgentsConfig', async () => {
      await removeAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockConfigRepository.updateAgentsConfig).not.toHaveBeenCalled();
    });

    it('logs a success message', async () => {
      await removeAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockLogger.logSuccessConsole).toHaveBeenCalledTimes(1);
    });

    it('warns that organization settings will be used', async () => {
      await removeAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockLogger.logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('organization settings will be used'),
      );
    });
  });

  describe('when startDirectory has a malformed packmind.json', () => {
    beforeEach(() => {
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([]);
      mockConfigRepository.readConfig.mockResolvedValue(null);
    });

    it('logs a warning that no files were found', async () => {
      await removeAgentsHandler({ agentNames: ['claude'] }, deps);

      expect(mockLogger.logWarningConsole).toHaveBeenCalledWith(
        'No packmind.json files found.',
      );
    });

    it('does not call updateAgentsConfig', async () => {
      await removeAgentsHandler({ agentNames: ['claude'] }, deps);

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
        agents: ['claude', 'cursor'],
      });
      mockConfigRepository.updateAgentsConfig.mockResolvedValue();
    });

    it('shows the path relative to cwd, not to the --path directory', async () => {
      await removeAgentsHandler(
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
      await removeAgentsHandler(
        { agentNames: ['claude'], path: './missing' },
        deps,
      );

      expect(mockLogger.logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Path does not exist'),
      );
    });

    it('exits with code 1', async () => {
      await removeAgentsHandler(
        { agentNames: ['claude'], path: './missing' },
        deps,
      );

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
