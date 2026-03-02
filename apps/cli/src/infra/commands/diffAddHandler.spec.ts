import { diffAddHandler, DiffAddHandlerDependencies } from './diffAddHandler';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { ChangeProposalType } from '@packmind/types';

jest.mock('../utils/consoleLogger', () => ({
  logErrorConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
}));

jest.mock('../utils/editorMessage', () => ({
  openEditorForMessage: jest.fn(() => 'editor message'),
  validateMessage: jest.fn((msg: string) => {
    const trimmed = msg.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Message cannot be empty.' };
    }
    return { valid: true, message: trimmed };
  }),
}));

const VALID_COMMAND_PATH = '/project/.claude/commands/my-command.md';
const VALID_COMMAND_CONTENT = '---\nname: My Command\n---\nDo something useful';

describe('diffAddHandler', () => {
  let mockSubmitDiffs: jest.Mock;
  let mockGetGlobal: jest.Mock;
  let mockPackmindCliHexa: PackmindCliHexa;
  let mockExit: jest.Mock;
  let mockGetCwd: jest.Mock;
  let mockReadFile: jest.Mock;

  beforeEach(() => {
    mockSubmitDiffs = jest.fn().mockResolvedValue({
      submitted: 1,
      alreadySubmitted: 0,
      skipped: [],
      errors: [],
    });

    mockGetGlobal = jest.fn().mockResolvedValue({
      id: 'space-123',
      name: 'Global',
      slug: 'global',
      organizationId: 'org-1',
    });

    mockPackmindCliHexa = {
      submitDiffs: mockSubmitDiffs,
      getPackmindGateway: () => ({
        spaces: { getGlobal: mockGetGlobal },
      }),
    } as unknown as PackmindCliHexa;

    mockExit = jest.fn();
    mockGetCwd = jest.fn().mockReturnValue('/project');
    mockReadFile = jest.fn().mockReturnValue(VALID_COMMAND_CONTENT);

    // Reset stdin.isTTY for each test
    Object.defineProperty(process.stdin, 'isTTY', {
      value: false,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function buildDeps(
    overrides: Partial<DiffAddHandlerDependencies> = {},
  ): DiffAddHandlerDependencies {
    return {
      packmindCliHexa: mockPackmindCliHexa,
      filePath: '.claude/commands/my-command.md',
      message: 'Add new command',
      exit: mockExit,
      getCwd: mockGetCwd,
      readFile: mockReadFile,
      ...overrides,
    };
  }

  describe('missing filePath', () => {
    it('logs error and exits with 1', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffAddHandler(buildDeps({ filePath: undefined }));

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Missing file path'),
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not call submitDiffs', async () => {
      await diffAddHandler(buildDeps({ filePath: undefined }));

      expect(mockSubmitDiffs).not.toHaveBeenCalled();
    });
  });

  describe('unsupported file path', () => {
    it('logs error and exits with 1', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffAddHandler(buildDeps({ filePath: 'src/index.ts' }));

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Unsupported file path'),
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not call submitDiffs', async () => {
      await diffAddHandler(buildDeps({ filePath: 'src/index.ts' }));

      expect(mockSubmitDiffs).not.toHaveBeenCalled();
    });
  });

  describe('file not found', () => {
    it('logs error and exits with 1 when readFile throws', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');
      const error = new Error('ENOENT: no such file or directory');
      mockReadFile.mockImplementation(() => {
        throw error;
      });

      await diffAddHandler(buildDeps());

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read file'),
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('parse error', () => {
    it('logs error and exits with 1 when file is empty', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');
      mockReadFile.mockReturnValue('');

      await diffAddHandler(buildDeps());

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse command file'),
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('missing message in non-TTY mode', () => {
    it('logs error about requiring -m flag and exits', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        writable: true,
        configurable: true,
      });

      await diffAddHandler(buildDeps({ message: undefined }));

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Non-interactive mode requires -m flag'),
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('happy path with -m flag', () => {
    it('calls submitDiffs with correct diff structure', async () => {
      await diffAddHandler(buildDeps());

      expect(mockSubmitDiffs).toHaveBeenCalledWith(
        [
          [
            expect.objectContaining({
              filePath: VALID_COMMAND_PATH,
              type: ChangeProposalType.createCommand,
              payload: { name: 'My Command', content: VALID_COMMAND_CONTENT },
              artifactName: 'My Command',
              artifactType: 'command',
              spaceId: 'space-123',
            }),
          ],
        ],
        'Add new command',
      );
    });

    it('fetches the global space', async () => {
      await diffAddHandler(buildDeps());

      expect(mockGetGlobal).toHaveBeenCalled();
    });

    it('exits with 0 on success', async () => {
      await diffAddHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('logs success summary', async () => {
      const { logSuccessConsole } = jest.requireMock('../utils/consoleLogger');

      await diffAddHandler(buildDeps());

      expect(logSuccessConsole).toHaveBeenCalledWith(
        expect.stringContaining('1 submitted'),
      );
    });

    it('logs message info when submitted', async () => {
      const { logInfoConsole } = jest.requireMock('../utils/consoleLogger');

      await diffAddHandler(buildDeps());

      expect(logInfoConsole).toHaveBeenCalledWith(
        expect.stringContaining('Add new command'),
      );
    });
  });

  describe('submitted count correctness', () => {
    it('displays correct count when multiple are submitted', async () => {
      const { logSuccessConsole } = jest.requireMock('../utils/consoleLogger');
      mockSubmitDiffs.mockResolvedValue({
        submitted: 1,
        alreadySubmitted: 0,
        skipped: [],
        errors: [],
      });

      await diffAddHandler(buildDeps());

      expect(logSuccessConsole).toHaveBeenCalledWith('Summary: 1 submitted');
    });

    it('includes alreadySubmitted in summary', async () => {
      const { logSuccessConsole } = jest.requireMock('../utils/consoleLogger');
      mockSubmitDiffs.mockResolvedValue({
        submitted: 0,
        alreadySubmitted: 1,
        skipped: [],
        errors: [],
      });

      await diffAddHandler(buildDeps());

      expect(logSuccessConsole).toHaveBeenCalledWith(
        'Summary: 1 already submitted',
      );
    });
  });

  describe('API errors', () => {
    it('logs errors from result.errors and exits with 1', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');
      mockSubmitDiffs.mockResolvedValue({
        submitted: 0,
        alreadySubmitted: 0,
        skipped: [],
        errors: [
          { name: 'My Command', message: 'Server error', code: 'INTERNAL' },
        ],
      });

      await diffAddHandler(buildDeps());

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Failed to submit "My Command"'),
      );
      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('1 error'),
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('shows error summary when there are both submitted and errors', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');
      mockSubmitDiffs.mockResolvedValue({
        submitted: 0,
        alreadySubmitted: 0,
        skipped: [],
        errors: [{ name: 'cmd', message: 'fail' }],
      });

      await diffAddHandler(buildDeps());

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Summary'),
      );
    });
  });

  describe('message validation with -m flag', () => {
    it('logs validation error for empty message', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffAddHandler(buildDeps({ message: '   ' }));

      expect(logErrorConsole).toHaveBeenCalledWith('Message cannot be empty.');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('file path without frontmatter', () => {
    it('uses filename as command name', async () => {
      mockReadFile.mockReturnValue('Just plain content');

      await diffAddHandler(buildDeps());

      expect(mockSubmitDiffs).toHaveBeenCalledWith(
        [
          [
            expect.objectContaining({
              artifactName: 'My command',
              payload: { name: 'My command', content: 'Just plain content' },
            }),
          ],
        ],
        'Add new command',
      );
    });
  });
});
