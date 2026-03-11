import {
  listCommandsHandler,
  ListCommandsHandlerDependencies,
} from './listCommandsHandler';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { ILockFileRepository } from '../../domain/repositories/ILockFileRepository';
import { PackmindLockFile } from '../../domain/repositories/PackmindLockFile';
import * as consoleLogger from '../utils/consoleLogger';

jest.mock('../utils/consoleLogger', () => {
  const actual = jest.requireActual('../utils/consoleLogger');
  return {
    ...actual,
    logWarningConsole: jest.fn(),
  };
});

describe('listCommandsHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockExit: jest.Mock;
  let mockLog: jest.Mock;
  let mockError: jest.Mock;
  let deps: ListCommandsHandlerDependencies;

  beforeEach(() => {
    mockPackmindCliHexa = {
      listCommands: jest.fn(),
    } as unknown as jest.Mocked<PackmindCliHexa>;

    mockExit = jest.fn();
    mockLog = jest.fn();
    mockError = jest.fn();

    deps = {
      packmindCliHexa: mockPackmindCliHexa,
      exit: mockExit,
      log: mockLog,
      error: mockError,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when commands exist', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listCommands.mockResolvedValue([
        { id: 'id-z', slug: 'zebra-command', name: 'Zebra Command' },
        { id: 'id-a', slug: 'alpha-command', name: 'Alpha Command' },
      ]);

      await listCommandsHandler(deps);
    });

    it('displays header with count', () => {
      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const headerCall = logCalls.find((c: string) =>
        c.includes('Commands (2)'),
      );

      expect(headerCall).toBeDefined();
    });

    it('sorts commands alphabetically by slug', () => {
      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const alphaIndex = logCalls.findIndex((c: string) =>
        c.includes('alpha-command'),
      );
      const zebraIndex = logCalls.findIndex((c: string) =>
        c.includes('zebra-command'),
      );

      expect(alphaIndex).toBeLessThan(zebraIndex);
    });

    it('exits with code 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when no commands found', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listCommands.mockResolvedValue([]);

      await listCommandsHandler(deps);
    });

    it('displays empty message', () => {
      expect(mockLog).toHaveBeenCalledWith('No commands found.');
    });

    it('exits with code 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when API fails', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listCommands.mockRejectedValue(
        new Error('Network error'),
      );

      await listCommandsHandler(deps);
    });

    it('displays error header', () => {
      expect(mockError).toHaveBeenCalledWith('\n❌ Failed to list commands:');
    });

    it('displays error message', () => {
      expect(mockError).toHaveBeenCalledWith('   Network error');
    });

    it('exits with code 1', () => {
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when --files flag is passed', () => {
    let mockLockFileRepository: jest.Mocked<ILockFileRepository>;

    beforeEach(() => {
      mockLockFileRepository = {
        read: jest.fn(),
        readAll: jest.fn(),
        write: jest.fn(),
        delete: jest.fn(),
      };
    });

    describe('when lock files exist', () => {
      const lockFile: PackmindLockFile = {
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['claude', 'cursor'],
        installedAt: '2026-01-01T00:00:00.000Z',
        cliVersion: '1.0.0',
        artifacts: {
          'release-app': {
            name: 'Release app',
            type: 'command',
            id: 'cmd-1',
            version: 1,
            spaceId: 'space-1',
            packageIds: ['pkg-1'],
            files: [
              { path: '.claude/commands/release-app.md', agent: 'claude' },
              { path: '.cursor/commands/release-app.md', agent: 'cursor' },
            ],
          },
        },
      };

      beforeEach(async () => {
        mockPackmindCliHexa.listCommands.mockResolvedValue([
          { id: 'cmd-1', slug: 'release-app', name: 'Release app' },
        ]);
        mockLockFileRepository.readAll.mockResolvedValue([lockFile]);

        await listCommandsHandler({
          ...deps,
          files: true,
          lockFileRepository: mockLockFileRepository,
          getCwd: () => '/project',
        });
      });

      it('reads lock files from cwd', () => {
        expect(mockLockFileRepository.readAll).toHaveBeenCalledWith('/project');
      });

      it('includes agents in the header', () => {
        const logCalls = mockLog.mock.calls.map((c) => c[0]);
        const headerCall = logCalls.find((c: string) => c.includes('Agents:'));

        expect(headerCall).toBeDefined();
      });

      it('renders file paths in the output', () => {
        const logCalls = mockLog.mock.calls.map((c) => c[0]);
        const claudeFile = logCalls.find((c: string) =>
          c.includes('.claude/commands/release-app.md'),
        );

        expect(claudeFile).toBeDefined();
      });

      it('exits with code 0', () => {
        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('when no lock files found', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listCommands.mockResolvedValue([
          { id: 'cmd-1', slug: 'release-app', name: 'Release app' },
        ]);
        mockLockFileRepository.readAll.mockResolvedValue([]);

        await listCommandsHandler({
          ...deps,
          files: true,
          lockFileRepository: mockLockFileRepository,
          getCwd: () => '/project',
        });
      });

      it('logs a warning about missing lock file', () => {
        expect(consoleLogger.logWarningConsole).toHaveBeenCalledWith(
          "No packmind-lock.json found. Run 'packmind install' first.",
        );
      });

      it('still displays commands without file info', () => {
        const logCalls = mockLog.mock.calls.map((c) => c[0]);
        const commandCall = logCalls.find((c: string) =>
          c.includes('release-app'),
        );

        expect(commandCall).toBeDefined();
      });
    });
  });
});
