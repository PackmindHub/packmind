import {
  listStandardsHandler,
  ListStandardsHandlerDependencies,
} from './listStandardsHandler';
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

describe('listStandardsHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockExit: jest.Mock;
  let mockLog: jest.Mock;
  let mockError: jest.Mock;
  let deps: ListStandardsHandlerDependencies;

  beforeEach(() => {
    mockPackmindCliHexa = {
      listStandards: jest.fn(),
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

  describe('when standards exist', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listStandards.mockResolvedValue([
        {
          id: 'id-z',
          slug: 'zebra-standard',
          name: 'Zebra Standard',
          description: 'Desc Z',
        },
        {
          id: 'id-a',
          slug: 'alpha-standard',
          name: 'Alpha Standard',
          description: 'Desc A',
        },
      ]);

      await listStandardsHandler(deps);
    });

    it('displays header with count', () => {
      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const headerCall = logCalls.find((c: string) =>
        c.includes('Standards (2)'),
      );

      expect(headerCall).toBeDefined();
    });

    it('sorts standards alphabetically by slug', () => {
      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const alphaIndex = logCalls.findIndex((c: string) =>
        c.includes('alpha-standard'),
      );
      const zebraIndex = logCalls.findIndex((c: string) =>
        c.includes('zebra-standard'),
      );

      expect(alphaIndex).toBeLessThan(zebraIndex);
    });

    it('exits with code 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when no standards found', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listStandards.mockResolvedValue([]);

      await listStandardsHandler(deps);
    });

    it('displays empty message', () => {
      expect(mockLog).toHaveBeenCalledWith('No standards found.');
    });

    it('exits with code 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when API fails', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listStandards.mockRejectedValue(
        new Error('Network error'),
      );

      await listStandardsHandler(deps);
    });

    it('displays error header', () => {
      expect(mockError).toHaveBeenCalledWith('\n❌ Failed to list standards:');
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
        agents: ['claude', 'cursor', 'packmind'],
        installedAt: '2026-01-01T00:00:00.000Z',
        cliVersion: '1.0.0',
        artifacts: {
          'angular-best-practices': {
            name: 'Angular Best Practices',
            type: 'standard',
            id: 'std-1',
            version: 2,
            spaceId: 'space-1',
            packageIds: ['pkg-1'],
            files: [
              {
                path: '.claude/rules/packmind/standard-angular-best-practices.md',
                agent: 'claude',
              },
              {
                path: '.cursor/rules/packmind/standard-angular-best-practices.mdc',
                agent: 'cursor',
              },
              {
                path: '.packmind/standards/angular-best-practices.md',
                agent: 'packmind',
              },
            ],
          },
        },
      };

      beforeEach(async () => {
        mockPackmindCliHexa.listStandards.mockResolvedValue([
          {
            id: 'std-1',
            slug: 'angular-best-practices',
            name: 'Angular Best Practices',
            description: 'Angular conventions',
          },
        ]);
        mockLockFileRepository.readAll.mockResolvedValue([lockFile]);

        await listStandardsHandler({
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
          c.includes(
            '.claude/rules/packmind/standard-angular-best-practices.md',
          ),
        );

        expect(claudeFile).toBeDefined();
      });
    });

    describe('when no lock files found', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listStandards.mockResolvedValue([
          {
            id: 'std-1',
            slug: 'angular-best-practices',
            name: 'Angular Best Practices',
            description: 'Angular conventions',
          },
        ]);
        mockLockFileRepository.readAll.mockResolvedValue([]);

        await listStandardsHandler({
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

      it('still displays standards without file info', () => {
        const logCalls = mockLog.mock.calls.map((c) => c[0]);
        const standardCall = logCalls.find((c: string) =>
          c.includes('angular-best-practices'),
        );

        expect(standardCall).toBeDefined();
      });
    });
  });
});
