import {
  playbookUnstageHandler,
  PlaybookUnstageHandlerDependencies,
} from './unstageHandler';
import {
  IPlaybookLocalRepository,
  PlaybookChangeEntry,
} from '../../../domain/repositories/IPlaybookLocalRepository';
import { logErrorConsole, logSuccessConsole } from '../../utils/consoleLogger';

jest.mock('../../utils/consoleLogger', () => ({
  logErrorConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
}));

jest.mock('../../../application/utils/findNearestConfigDir', () => ({
  findNearestConfigDir: jest.fn().mockResolvedValue('/project'),
}));

describe('playbookUnstageHandler', () => {
  let mockExit: jest.Mock;
  let mockGetCwd: jest.Mock;
  let mockPackmindCliHexa: { configExists: jest.Mock };
  let mockPlaybookLocalRepository: jest.Mocked<IPlaybookLocalRepository>;

  const makeEntry = (
    overrides: Partial<PlaybookChangeEntry> = {},
  ): PlaybookChangeEntry => ({
    filePath: 'path/to/file.md',
    artifactType: 'standard',
    artifactName: 'My Standard',
    codingAgent: 'claude',
    addedAt: '2026-03-16T10:00:00.000Z',
    spaceId: 'space-1',
    content: '# Content',
    ...overrides,
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockExit = jest.fn();
    mockGetCwd = jest.fn().mockReturnValue('/project');
    mockPackmindCliHexa = { configExists: jest.fn() };
    mockPlaybookLocalRepository = {
      addChange: jest.fn(),
      removeChange: jest.fn(),
      getChanges: jest.fn().mockReturnValue([]),
      getChange: jest.fn(),
      clearAll: jest.fn(),
    };
  });

  function buildDeps(
    overrides: Partial<PlaybookUnstageHandlerDependencies> = {},
  ): PlaybookUnstageHandlerDependencies {
    return {
      packmindCliHexa: mockPackmindCliHexa as never,
      filePath: 'path/to/file.md',
      spaceSlug: undefined,
      exit: mockExit,
      getCwd: mockGetCwd,
      playbookLocalRepository: mockPlaybookLocalRepository,
      ...overrides,
    };
  }

  describe('when filePath is missing', () => {
    it('logs an error', async () => {
      await playbookUnstageHandler(buildDeps({ filePath: undefined }));

      expect(logErrorConsole).toHaveBeenCalledWith(
        'Missing file path. Usage: packmind playbook unstage <path>',
      );
    });

    it('exits with code 1', async () => {
      await playbookUnstageHandler(buildDeps({ filePath: undefined }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when not inside a Packmind project', () => {
    beforeEach(() => {
      const { findNearestConfigDir } = jest.requireMock(
        '../../../application/utils/findNearestConfigDir',
      );
      findNearestConfigDir.mockResolvedValueOnce(null);
    });

    it('logs an error', async () => {
      await playbookUnstageHandler(buildDeps({ filePath: 'path/to/file.md' }));

      expect(logErrorConsole).toHaveBeenCalledWith(
        'Not inside a Packmind project. No packmind.json found in any parent directory.',
      );
    });

    it('exits with code 1', async () => {
      await playbookUnstageHandler(buildDeps({ filePath: 'path/to/file.md' }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when the entry is not found in the playbook', () => {
    beforeEach(() => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([]);
    });

    it('logs an error with the file path', async () => {
      await playbookUnstageHandler(buildDeps({ filePath: 'path/to/file.md' }));

      expect(logErrorConsole).toHaveBeenCalledWith(
        'No staged change found for path/to/file.md',
      );
    });

    it('exits with code 1', async () => {
      await playbookUnstageHandler(buildDeps({ filePath: 'path/to/file.md' }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when a single entry exists', () => {
    beforeEach(() => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([makeEntry()]);
      mockPlaybookLocalRepository.removeChange.mockReturnValue(true);
    });

    it('calls removeChange with filePath and spaceId', async () => {
      await playbookUnstageHandler(buildDeps({ filePath: 'path/to/file.md' }));

      expect(mockPlaybookLocalRepository.removeChange).toHaveBeenCalledWith(
        'path/to/file.md',
        'space-1',
      );
    });

    it('logs a success message', async () => {
      await playbookUnstageHandler(buildDeps({ filePath: 'path/to/file.md' }));

      expect(logSuccessConsole).toHaveBeenCalledWith(
        'Unstaged path/to/file.md from playbook',
      );
    });

    it('exits with code 0', async () => {
      await playbookUnstageHandler(buildDeps({ filePath: 'path/to/file.md' }));

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when multiple entries exist for same filePath', () => {
    beforeEach(() => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        makeEntry({ spaceId: 'space-1', spaceName: 'frontend' }),
        makeEntry({ spaceId: 'space-2', spaceName: 'global' }),
      ]);
    });

    describe('without --space flag', () => {
      it('logs an error listing the spaces', async () => {
        await playbookUnstageHandler(
          buildDeps({ filePath: 'path/to/file.md' }),
        );

        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining(
            'Multiple staged entries for path/to/file.md',
          ),
        );
      });

      it('includes space names in the error message', async () => {
        await playbookUnstageHandler(
          buildDeps({ filePath: 'path/to/file.md' }),
        );

        const message = (logErrorConsole as jest.Mock).mock.calls[0][0];
        expect(message).toContain('frontend');
      });

      it('exits with code 1', async () => {
        await playbookUnstageHandler(
          buildDeps({ filePath: 'path/to/file.md' }),
        );

        expect(mockExit).toHaveBeenCalledWith(1);
      });

      it('does not remove any entry', async () => {
        await playbookUnstageHandler(
          buildDeps({ filePath: 'path/to/file.md' }),
        );

        expect(mockPlaybookLocalRepository.removeChange).not.toHaveBeenCalled();
      });
    });

    describe('with --space flag matching a spaceName', () => {
      beforeEach(() => {
        mockPlaybookLocalRepository.removeChange.mockReturnValue(true);
      });

      it('removes only the matching entry', async () => {
        await playbookUnstageHandler(
          buildDeps({ filePath: 'path/to/file.md', spaceSlug: 'frontend' }),
        );

        expect(mockPlaybookLocalRepository.removeChange).toHaveBeenCalledWith(
          'path/to/file.md',
          'space-1',
        );
      });

      it('logs a success message with space name', async () => {
        await playbookUnstageHandler(
          buildDeps({ filePath: 'path/to/file.md', spaceSlug: 'frontend' }),
        );

        expect(logSuccessConsole).toHaveBeenCalledWith(
          'Unstaged path/to/file.md from playbook (space: frontend)',
        );
      });

      it('exits with code 0', async () => {
        await playbookUnstageHandler(
          buildDeps({ filePath: 'path/to/file.md', spaceSlug: 'frontend' }),
        );

        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });

    describe('with --space flag not matching any entry', () => {
      it('logs an error', async () => {
        await playbookUnstageHandler(
          buildDeps({ filePath: 'path/to/file.md', spaceSlug: 'unknown' }),
        );

        expect(logErrorConsole).toHaveBeenCalledWith(
          'No staged change found for path/to/file.md in space "unknown"',
        );
      });

      it('exits with code 1', async () => {
        await playbookUnstageHandler(
          buildDeps({ filePath: 'path/to/file.md', spaceSlug: 'unknown' }),
        );

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('when filePath has leading ./', () => {
    beforeEach(() => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([makeEntry()]);
      mockPlaybookLocalRepository.removeChange.mockReturnValue(true);
    });

    it('normalizes by resolving against cwd', async () => {
      await playbookUnstageHandler(
        buildDeps({ filePath: './path/to/file.md' }),
      );

      expect(mockPlaybookLocalRepository.removeChange).toHaveBeenCalledWith(
        'path/to/file.md',
        'space-1',
      );
    });
  });

  describe('when unstaging a skill via SKILL.md path', () => {
    beforeEach(() => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        makeEntry({
          filePath: 'skills/my-skill',
          artifactType: 'skill',
          artifactName: 'My Skill',
        }),
      ]);
      mockPlaybookLocalRepository.removeChange.mockReturnValue(true);
    });

    it('resolves SKILL.md to the skill directory and unstages', async () => {
      await playbookUnstageHandler(
        buildDeps({ filePath: 'skills/my-skill/SKILL.md' }),
      );

      expect(mockPlaybookLocalRepository.removeChange).toHaveBeenCalledWith(
        'skills/my-skill',
        'space-1',
      );
    });

    it('logs success with the skill directory path', async () => {
      await playbookUnstageHandler(
        buildDeps({ filePath: 'skills/my-skill/SKILL.md' }),
      );

      expect(logSuccessConsole).toHaveBeenCalledWith(
        'Unstaged skills/my-skill from playbook',
      );
    });

    it('exits with code 0', async () => {
      await playbookUnstageHandler(
        buildDeps({ filePath: 'skills/my-skill/SKILL.md' }),
      );

      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('resolves configDir from the skill directory, not cwd', async () => {
      const { findNearestConfigDir } = jest.requireMock(
        '../../../application/utils/findNearestConfigDir',
      );

      await playbookUnstageHandler(
        buildDeps({ filePath: 'skills/my-skill/SKILL.md' }),
      );

      expect(findNearestConfigDir).toHaveBeenCalledWith(
        '/project/skills',
        expect.anything(),
      );
    });
  });
});
