import * as fsPromises from 'fs/promises';
import { IConfigFileRepository } from '../../../domain/repositories/IConfigFileRepository';
import {
  removeAgentsHandler,
  RemoveAgentsHandlerDependencies,
} from './removeAgentsHandler';
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
    } as unknown as jest.Mocked<IConfigFileRepository>;

    mockExit = jest.fn();
    deps = {
      configRepository: mockConfigRepository,
      exit: mockExit,
      getCwd: () => '/project',
    };
  });

  describe('when no agent names are provided', () => {
    it('logs an error', async () => {
      await removeAgentsHandler({ agentNames: [] }, deps);

      expect(mockLogger.logErrorConsole).toHaveBeenCalledWith(
        'No agents specified.',
      );
    });

    it('exits with code 1', async () => {
      await removeAgentsHandler({ agentNames: [] }, deps);

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when an invalid agent name is provided', () => {
    it('logs the unknown agent', async () => {
      await removeAgentsHandler({ agentNames: ['unknown-agent'] }, deps);

      expect(mockLogger.logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('unknown-agent'),
      );
    });

    it('exits with code 1', async () => {
      await removeAgentsHandler({ agentNames: ['unknown-agent'] }, deps);

      expect(mockExit).toHaveBeenCalledWith(1);
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

      const warns = mockLogger.logWarningConsole.mock.calls.map(([m]) => m);
      expect(warns.some((m) => m.includes('packmind-cli install'))).toBe(false);
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

    it('shows the install warning at the end', async () => {
      await removeAgentsHandler({ agentNames: ['claude'] }, deps);

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
