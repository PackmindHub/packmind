import * as fsPromises from 'fs/promises';
import { RenderMode } from '@packmind/types';
import { IConfigFileRepository } from '../../../domain/repositories/IConfigFileRepository';
import { IDeploymentGateway } from '../../../domain/repositories/IDeploymentGateway';
import { createMockDeploymentGateway } from '../../../mocks/createMockGateways';
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

function getLoggedLines(): string[] {
  return mockLogger.logConsole.mock.calls.map(([msg]) => msg);
}

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

    it('displays a header row containing all agent names and source', async () => {
      await listAgentsHandler({}, deps);

      const lines = getLoggedLines();
      const headerLine = lines.find(
        (l) =>
          l.includes('claude') &&
          l.includes('copilot') &&
          l.includes('cursor') &&
          l.includes('source'),
      );
      expect(headerLine).toBeDefined();
    });

    it('sorts agent names alphabetically in the header row', async () => {
      await listAgentsHandler({}, deps);

      const lines = getLoggedLines();
      const headerLine = lines.find(
        (l) =>
          l.includes('claude') && l.includes('copilot') && l.includes('cursor'),
      )!;
      expect(headerLine.indexOf('claude')).toBeLessThan(
        headerLine.indexOf('cursor'),
      );
    });

    it('displays rows sorted by depth first then alphabetically', async () => {
      await listAgentsHandler({}, deps);

      const lines = getLoggedLines();
      const fileLines = lines.filter(
        (l) => l.includes('./') && l.includes('packmind.json'),
      );
      const firstPath = fileLines[0].trim().split(/\s+/)[0];
      expect(firstPath).toBe('./packmind.json');
    });

    it('marks configured agents with a checkmark', async () => {
      await listAgentsHandler({}, deps);

      const lines = getLoggedLines();
      const rootLine = lines.find((l) => l.startsWith('./packmind.json'));
      expect(rootLine).toContain('\u2713');
    });

    it('does not show checkmarks for unconfigured agents', async () => {
      await listAgentsHandler({}, deps);

      const lines = getLoggedLines();
      const cliLine = lines.find((l) => l.includes('./apps/cli/packmind.json'));
      expect(cliLine).not.toContain('\u2713');
    });

    it('shows dashes for unconfigured agents', async () => {
      await listAgentsHandler({}, deps);

      const lines = getLoggedLines();
      const cliLine = lines.find((l) => l.includes('./apps/cli/packmind.json'));
      expect(cliLine).toContain('-');
    });

    it('shows local source label for files with local agents', async () => {
      await listAgentsHandler({}, deps);

      const lines = getLoggedLines();
      const rootLine = lines.find((l) => l.startsWith('./packmind.json'));
      expect(rootLine).toContain('local (`agents` property in packmind.json)');
    });

    it('shows organization source label for files without local agents', async () => {
      await listAgentsHandler({}, deps);

      const lines = getLoggedLines();
      const cliLine = lines.find((l) => l.includes('./apps/cli/packmind.json'));
      expect(cliLine).toContain('Organization settings');
    });

    it('exits with code 0', async () => {
      await listAgentsHandler({}, deps);

      expect(mockExit).toHaveBeenCalledWith(0);
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
        agents: ['claude'],
      });
    });

    it('shows the path relative to cwd in a matrix row', async () => {
      await listAgentsHandler({ path: 'frontend' }, deps);

      const lines = getLoggedLines();
      const pathLine = lines.find((l) =>
        l.includes('./frontend/packmind.json'),
      );
      expect(pathLine).toBeDefined();
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

    it('displays checkmarks for all files', async () => {
      await listAgentsHandler({}, deps);

      const lines = getLoggedLines();
      const dataLines = lines.filter((l) => l.includes('./'));
      expect(dataLines.every((l) => l.includes('\u2713'))).toBe(true);
    });

    it('does not display dashes for any file', async () => {
      await listAgentsHandler({}, deps);

      const lines = getLoggedLines();
      const dataLines = lines.filter((l) => l.includes('./'));
      expect(dataLines.some((l) => l.includes('-'))).toBe(false);
    });
  });

  describe('when no agents are configured in any file', () => {
    beforeEach(() => {
      mockConfigRepository.findDescendantConfigs.mockResolvedValue([
        '/project/apps/api',
      ]);
      mockConfigRepository.readConfig.mockResolvedValue({ packages: {} });
    });

    describe('when no deploymentGateway is provided', () => {
      it('displays a message that no agents are configured', async () => {
        await listAgentsHandler({}, deps);

        const lines = getLoggedLines();
        const messageLine = lines.find((l) =>
          l.includes('No agents configured'),
        );
        expect(messageLine).toBeDefined();
      });

      it('lists the root packmind.json path', async () => {
        await listAgentsHandler({}, deps);

        const lines = getLoggedLines();
        expect(lines.some((l) => l.includes('./packmind.json'))).toBe(true);
      });

      it('lists the descendant packmind.json path', async () => {
        await listAgentsHandler({}, deps);

        const lines = getLoggedLines();
        expect(lines.some((l) => l.includes('./apps/api/packmind.json'))).toBe(
          true,
        );
      });

      it('exits with code 0', async () => {
        await listAgentsHandler({}, deps);

        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });
  });

  describe('when org-level default agents fallback is used', () => {
    let mockDeploymentGateway: jest.Mocked<IDeploymentGateway>;

    beforeEach(() => {
      mockDeploymentGateway = createMockDeploymentGateway();
    });

    describe('when all files have no local agents and org defaults exist', () => {
      beforeEach(() => {
        mockConfigRepository.findDescendantConfigs.mockResolvedValue([
          '/project/apps/api',
        ]);
        mockConfigRepository.readConfig.mockResolvedValue({ packages: {} });
        mockDeploymentGateway.getRenderModeConfiguration.mockResolvedValue({
          configuration: {
            id: 'config-1',
            organizationId: 'org-1',
            activeRenderModes: [RenderMode.CLAUDE, RenderMode.CURSOR],
          },
        });
      });

      it('displays org default agents in the matrix', async () => {
        await listAgentsHandler(
          {},
          { ...deps, deploymentGateway: mockDeploymentGateway },
        );

        const lines = getLoggedLines();
        const headerLine = lines.find(
          (l) => l.includes('claude') && l.includes('cursor'),
        );
        expect(headerLine).toBeDefined();
      });

      it('shows checkmarks for org default agents on all files', async () => {
        await listAgentsHandler(
          {},
          { ...deps, deploymentGateway: mockDeploymentGateway },
        );

        const lines = getLoggedLines();
        const dataLines = lines.filter((l) => l.includes('./'));
        expect(dataLines.every((l) => l.includes('\u2713'))).toBe(true);
      });

      it('shows organization source label for files using org defaults', async () => {
        await listAgentsHandler(
          {},
          { ...deps, deploymentGateway: mockDeploymentGateway },
        );

        const lines = getLoggedLines();
        const dataLines = lines.filter((l) => l.includes('./'));
        expect(
          dataLines.every((l) => l.includes('Organization settings')),
        ).toBe(true);
      });

      it('does not display the no-agents-configured message', async () => {
        await listAgentsHandler(
          {},
          { ...deps, deploymentGateway: mockDeploymentGateway },
        );

        const lines = getLoggedLines();
        expect(lines.some((l) => l.includes('No agents configured'))).toBe(
          false,
        );
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
            agents: ['claude', 'copilot'],
          })
          .mockResolvedValueOnce({ packages: {} });
        mockDeploymentGateway.getRenderModeConfiguration.mockResolvedValue({
          configuration: {
            id: 'config-1',
            organizationId: 'org-1',
            activeRenderModes: [RenderMode.CURSOR, RenderMode.PACKMIND],
          },
        });
      });

      it('preserves local agents on files that have them', async () => {
        await listAgentsHandler(
          {},
          { ...deps, deploymentGateway: mockDeploymentGateway },
        );

        const lines = getLoggedLines();
        const rootLine = lines.find((l) => l.startsWith('./packmind.json'));
        expect(rootLine).toContain('\u2713');
      });

      it('shows local source label for files with local agents', async () => {
        await listAgentsHandler(
          {},
          { ...deps, deploymentGateway: mockDeploymentGateway },
        );

        const lines = getLoggedLines();
        const rootLine = lines.find((l) => l.startsWith('./packmind.json'));
        expect(rootLine).toContain(
          'local (`agents` property in packmind.json)',
        );
      });

      it('applies org defaults to files without local agents', async () => {
        await listAgentsHandler(
          {},
          { ...deps, deploymentGateway: mockDeploymentGateway },
        );

        const lines = getLoggedLines();
        const apiLine = lines.find((l) =>
          l.includes('./apps/api/packmind.json'),
        );
        expect(apiLine).toContain('\u2713');
      });

      it('shows organization source label for files using org defaults', async () => {
        await listAgentsHandler(
          {},
          { ...deps, deploymentGateway: mockDeploymentGateway },
        );

        const lines = getLoggedLines();
        const apiLine = lines.find((l) =>
          l.includes('./apps/api/packmind.json'),
        );
        expect(apiLine).toContain('Organization settings');
      });

      it('includes both local and org agents in the header', async () => {
        await listAgentsHandler(
          {},
          { ...deps, deploymentGateway: mockDeploymentGateway },
        );

        const lines = getLoggedLines();
        const headerLine = lines.find(
          (l) =>
            l.includes('claude') &&
            l.includes('copilot') &&
            l.includes('cursor') &&
            l.includes('packmind'),
        );
        expect(headerLine).toBeDefined();
      });
    });

    describe('when the API call fails', () => {
      beforeEach(() => {
        mockConfigRepository.findDescendantConfigs.mockResolvedValue([]);
        mockConfigRepository.readConfig.mockResolvedValue({ packages: {} });
        mockDeploymentGateway.getRenderModeConfiguration.mockRejectedValue(
          new Error('Unauthorized'),
        );
      });

      it('falls back to the no-agents-configured message', async () => {
        await listAgentsHandler(
          {},
          { ...deps, deploymentGateway: mockDeploymentGateway },
        );

        const lines = getLoggedLines();
        expect(lines.some((l) => l.includes('No agents configured'))).toBe(
          true,
        );
      });
    });

    describe('when the org has no configuration', () => {
      beforeEach(() => {
        mockConfigRepository.findDescendantConfigs.mockResolvedValue([]);
        mockConfigRepository.readConfig.mockResolvedValue({ packages: {} });
        mockDeploymentGateway.getRenderModeConfiguration.mockResolvedValue({
          configuration: null,
        });
      });

      it('falls back to the no-agents-configured message', async () => {
        await listAgentsHandler(
          {},
          { ...deps, deploymentGateway: mockDeploymentGateway },
        );

        const lines = getLoggedLines();
        expect(lines.some((l) => l.includes('No agents configured'))).toBe(
          true,
        );
      });
    });
  });
});
