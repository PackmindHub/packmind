import {
  listSkillsHandler,
  ListSkillsHandlerDependencies,
} from './listSkillsHandler';
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

describe('listSkillsHandler', () => {
  let mockPackmindCliHexa: jest.Mocked<PackmindCliHexa>;
  let mockExit: jest.Mock;
  let mockLog: jest.Mock;
  let mockError: jest.Mock;
  let deps: ListSkillsHandlerDependencies;

  beforeEach(() => {
    mockPackmindCliHexa = {
      listSkills: jest.fn(),
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

  describe('when skills exist', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listSkills.mockResolvedValue([
        { slug: 'zebra-skill', name: 'Zebra Skill', description: 'Desc Z' },
        { slug: 'alpha-skill', name: 'Alpha Skill', description: 'Desc A' },
      ]);

      await listSkillsHandler(deps);
    });

    it('displays header with count', () => {
      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const headerCall = logCalls.find((c: string) => c.includes('Skills (2)'));

      expect(headerCall).toBeDefined();
    });

    it('sorts skills alphabetically by slug', () => {
      const logCalls = mockLog.mock.calls.map((c) => c[0]);
      const alphaIndex = logCalls.findIndex((c: string) =>
        c.includes('alpha-skill'),
      );
      const zebraIndex = logCalls.findIndex((c: string) =>
        c.includes('zebra-skill'),
      );

      expect(alphaIndex).toBeLessThan(zebraIndex);
    });

    it('exits with code 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when no skills found', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listSkills.mockResolvedValue([]);

      await listSkillsHandler(deps);
    });

    it('displays empty message', () => {
      expect(mockLog).toHaveBeenCalledWith('No skills found.');
    });

    it('exits with code 0', () => {
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when API fails', () => {
    beforeEach(async () => {
      mockPackmindCliHexa.listSkills.mockRejectedValue(
        new Error('Network error'),
      );

      await listSkillsHandler(deps);
    });

    it('displays error header', () => {
      expect(mockError).toHaveBeenCalledWith('\n❌ Failed to list skills:');
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
          'algorithmic-art': {
            name: 'algorithmic-art',
            type: 'skill',
            id: 'skl-1',
            version: 1,
            spaceId: 'space-1',
            packageIds: [],
            files: [
              {
                path: '.claude/skills/algorithmic-art/SKILL.md',
                agent: 'claude',
                isSkillDefinition: true,
              },
              {
                path: '.claude/skills/algorithmic-art/LICENSE.txt',
                agent: 'claude',
              },
              {
                path: '.cursor/skills/algorithmic-art/SKILL.md',
                agent: 'cursor',
                isSkillDefinition: true,
              },
              {
                path: '.cursor/skills/algorithmic-art/LICENSE.txt',
                agent: 'cursor',
              },
            ],
          },
        },
      };

      beforeEach(async () => {
        mockPackmindCliHexa.listSkills.mockResolvedValue([
          {
            slug: 'algorithmic-art',
            name: 'algorithmic-art',
            description: 'Generate art',
          },
        ]);
        mockLockFileRepository.readAll.mockResolvedValue([lockFile]);

        await listSkillsHandler({
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

      it('renders file paths for multi-file skills', () => {
        const logCalls = mockLog.mock.calls.map((c) => c[0]);
        const skillFile = logCalls.find((c: string) =>
          c.includes('.claude/skills/algorithmic-art/SKILL.md'),
        );

        expect(skillFile).toBeDefined();
      });
    });

    describe('when no lock files found', () => {
      beforeEach(async () => {
        mockPackmindCliHexa.listSkills.mockResolvedValue([
          {
            slug: 'algorithmic-art',
            name: 'algorithmic-art',
            description: 'Generate art',
          },
        ]);
        mockLockFileRepository.readAll.mockResolvedValue([]);

        await listSkillsHandler({
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

      it('still displays skills without file info', () => {
        const logCalls = mockLog.mock.calls.map((c) => c[0]);
        const skillCall = logCalls.find((c: string) =>
          c.includes('algorithmic-art'),
        );

        expect(skillCall).toBeDefined();
      });
    });
  });
});
