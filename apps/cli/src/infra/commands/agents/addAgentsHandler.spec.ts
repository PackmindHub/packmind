import * as fsPromises from 'fs/promises';
import { IConfigFileRepository } from '../../../domain/repositories/IConfigFileRepository';
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
    } as unknown as jest.Mocked<IConfigFileRepository>;

    mockExit = jest.fn();
    deps = {
      configRepository: mockConfigRepository,
      exit: mockExit,
      getCwd: () => '/project',
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
      mockConfigRepository.configExists.mockResolvedValue(false);
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
      mockConfigRepository.configExists.mockResolvedValue(true);
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
  });

  describe('when adding a new agent to multiple files', () => {
    beforeEach(() => {
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([
        '/project/apps/api',
      ]);
      mockConfigRepository.configExists.mockResolvedValue(true);
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
});
