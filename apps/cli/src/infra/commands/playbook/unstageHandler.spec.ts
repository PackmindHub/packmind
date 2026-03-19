import {
  playbookUnstageHandler,
  PlaybookUnstageHandlerDependencies,
} from './unstageHandler';
import { IPlaybookLocalRepository } from '../../../domain/repositories/IPlaybookLocalRepository';
import { logErrorConsole, logSuccessConsole } from '../../utils/consoleLogger';

jest.mock('../../utils/consoleLogger', () => ({
  logErrorConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
}));

describe('playbookUnstageHandler', () => {
  let mockExit: jest.Mock;
  let mockGetCwd: jest.Mock;
  let mockPlaybookLocalRepository: jest.Mocked<IPlaybookLocalRepository>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExit = jest.fn();
    mockGetCwd = jest.fn().mockReturnValue('/project');
    mockPlaybookLocalRepository = {
      addChange: jest.fn(),
      removeChange: jest.fn(),
      getChanges: jest.fn(),
      getChange: jest.fn(),
    };
  });

  function buildDeps(
    overrides: Partial<PlaybookUnstageHandlerDependencies> = {},
  ): PlaybookUnstageHandlerDependencies {
    return {
      filePath: 'path/to/file.md',
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

  describe('when the entry is not found in the playbook', () => {
    beforeEach(() => {
      mockPlaybookLocalRepository.removeChange.mockReturnValue(false);
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

  describe('when the entry is found and removed', () => {
    beforeEach(() => {
      mockPlaybookLocalRepository.removeChange.mockReturnValue(true);
    });

    it('calls removeChange with the normalized path', async () => {
      await playbookUnstageHandler(buildDeps({ filePath: 'path/to/file.md' }));

      expect(mockPlaybookLocalRepository.removeChange).toHaveBeenCalledWith(
        'path/to/file.md',
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

  describe('when filePath has leading ./', () => {
    beforeEach(() => {
      mockPlaybookLocalRepository.removeChange.mockReturnValue(true);
    });

    it('normalizes by stripping the ./ prefix', async () => {
      await playbookUnstageHandler(
        buildDeps({ filePath: './path/to/file.md' }),
      );

      expect(mockPlaybookLocalRepository.removeChange).toHaveBeenCalledWith(
        'path/to/file.md',
      );
    });
  });
});
