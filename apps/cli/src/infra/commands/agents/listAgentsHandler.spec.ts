import * as fsPromises from 'fs/promises';
import { IConfigFileRepository } from '../../../domain/repositories/IConfigFileRepository';
import {
  listAgentsHandler,
  ListAgentsHandlerDependencies,
} from './listAgentsHandler';
import * as consoleLogger from '../../utils/consoleLogger';

jest.mock('fs/promises');
jest.mock('../../utils/consoleLogger', () => ({
  logConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  logWarningConsole: jest.fn(),
  formatBold: jest.fn((t: string) => t),
  formatFilePath: jest.fn((t: string) => t),
}));

const mockFs = fsPromises as jest.Mocked<typeof fsPromises>;
const mockLogger = consoleLogger as jest.Mocked<typeof consoleLogger>;

describe('listAgentsHandler', () => {
  let mockConfigRepository: jest.Mocked<IConfigFileRepository>;
  let mockExit: jest.Mock;
  let deps: ListAgentsHandlerDependencies;

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

  describe('when no packmind.json files are found', () => {
    beforeEach(() => {
      mockConfigRepository.readConfig.mockResolvedValue(null);
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([]);
    });

    it('logs a warning', async () => {
      await listAgentsHandler({}, deps);

      expect(mockLogger.logWarningConsole).toHaveBeenCalledWith(
        'No packmind.json files found.',
      );
    });

    it('exits with code 0', async () => {
      await listAgentsHandler({}, deps);

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when configs have different agent combinations', () => {
    beforeEach(() => {
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([
        '/project/apps/api',
        '/project/apps/frontend',
        '/project/apps/cli',
      ]);
      mockConfigRepository.readConfig
        .mockResolvedValueOnce({ packages: {}, agents: ['claude', 'cursor'] })
        .mockResolvedValueOnce({ packages: {}, agents: ['claude', 'cursor'] })
        .mockResolvedValueOnce({
          packages: {},
          agents: ['claude', 'cursor', 'copilot'],
        })
        .mockResolvedValueOnce({ packages: {} });
    });

    it('groups configs with the same agents together', async () => {
      await listAgentsHandler({}, deps);

      const calls = mockLogger.logConsole.mock.calls.map(([msg]) => msg);
      const groupLine = calls.find((c) => c.includes('claude, cursor'));
      expect(groupLine).toContain('2 files');
    });

    it('shows configs with no agents in a separate group', async () => {
      await listAgentsHandler({}, deps);

      const calls = mockLogger.logConsole.mock.calls.map(([msg]) => msg);
      const noneGroup = calls.find((c) => c.includes('no agents configured'));
      expect(noneGroup).toBeDefined();
    });

    it('exits with code 0', async () => {
      await listAgentsHandler({}, deps);

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when --path points to a non-existent directory', () => {
    beforeEach(() => {
      mockFs.stat.mockRejectedValue({ code: 'ENOENT' });
    });

    it('logs an error', async () => {
      await listAgentsHandler({ path: './missing' }, deps);

      expect(mockLogger.logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Path does not exist'),
      );
    });

    it('exits with code 1', async () => {
      await listAgentsHandler({ path: './missing' }, deps);

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when --path points to a file instead of a directory', () => {
    beforeEach(() => {
      mockFs.stat.mockResolvedValue({
        isDirectory: () => false,
      } as fsPromises.Stats);
    });

    it('logs an error', async () => {
      await listAgentsHandler({ path: './somefile.json' }, deps);

      expect(mockLogger.logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Path is not a directory'),
      );
    });

    it('exits with code 1', async () => {
      await listAgentsHandler({ path: './somefile.json' }, deps);

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when all configs share the same agents', () => {
    beforeEach(() => {
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([
        '/project/apps/api',
      ]);
      mockConfigRepository.readConfig.mockResolvedValue({
        packages: {},
        agents: ['claude', 'cursor'],
      });
    });

    it('shows a single group with the correct file count', async () => {
      await listAgentsHandler({}, deps);

      const calls = mockLogger.logConsole.mock.calls.map(([msg]) => msg);
      const groupLine = calls.find((c) => c.includes('claude, cursor'));
      expect(groupLine).toContain('2 files');
    });
  });
});
