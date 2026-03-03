import { diffAddHandler, DiffAddHandlerDependencies } from './diffAddHandler';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { ChangeProposalType } from '@packmind/types';

jest.mock('../utils/consoleLogger', () => ({
  logErrorConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logWarningConsole: jest.fn(),
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

const VALID_STANDARD_CONTENT = [
  '# My Standard',
  '',
  'A description of the standard.',
  '',
  '## Rules',
  '',
  '* Do not use var',
  '* Always use const',
].join('\n');

const STANDARD_WITH_SCOPE_CONTENT = [
  '---',
  'globs: "**/*.ts"',
  '---',
  '## Standard: Scoped Standard',
  '',
  'Description with scope.',
  '',
  '* Rule one',
].join('\n');

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
    it('logs error', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffAddHandler(buildDeps({ filePath: undefined }));

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Missing file path'),
      );
    });

    it('exits with 1', async () => {
      await diffAddHandler(buildDeps({ filePath: undefined }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not call submitDiffs', async () => {
      await diffAddHandler(buildDeps({ filePath: undefined }));

      expect(mockSubmitDiffs).not.toHaveBeenCalled();
    });
  });

  describe('unsupported file path', () => {
    it('logs error', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffAddHandler(buildDeps({ filePath: 'src/index.ts' }));

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Unsupported file path'),
      );
    });

    it('exits with 1', async () => {
      await diffAddHandler(buildDeps({ filePath: 'src/index.ts' }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not call submitDiffs', async () => {
      await diffAddHandler(buildDeps({ filePath: 'src/index.ts' }));

      expect(mockSubmitDiffs).not.toHaveBeenCalled();
    });
  });

  describe('file not found', () => {
    describe('when readFile throws', () => {
      beforeEach(() => {
        mockReadFile.mockImplementation(() => {
          throw new Error('ENOENT: no such file or directory');
        });
      });

      it('logs error', async () => {
        const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

        await diffAddHandler(buildDeps());

        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('Failed to read file'),
        );
      });

      it('exits with 1', async () => {
        await diffAddHandler(buildDeps());

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('directory path instead of file', () => {
    describe('when readFile throws EISDIR', () => {
      beforeEach(() => {
        const error = new Error(
          "EISDIR: illegal operation on a directory, read '/project/.claude/commands'",
        ) as NodeJS.ErrnoException;
        error.code = 'EISDIR';
        mockReadFile.mockImplementation(() => {
          throw error;
        });
      });

      it('logs a clear directory error message', async () => {
        const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

        await diffAddHandler(buildDeps());

        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('Path is a directory, not a file'),
        );
      });

      it('exits with 1', async () => {
        await diffAddHandler(buildDeps());

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('parse error', () => {
    describe('when file is empty', () => {
      beforeEach(() => {
        mockReadFile.mockReturnValue('');
      });

      it('logs error', async () => {
        const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

        await diffAddHandler(buildDeps());

        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('Failed to parse command file'),
        );
      });

      it('exits with 1', async () => {
        await diffAddHandler(buildDeps());

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('missing message in non-TTY mode', () => {
    it('logs error about requiring -m flag', async () => {
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
    });

    it('exits with 1', async () => {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        writable: true,
        configurable: true,
      });

      await diffAddHandler(buildDeps({ message: undefined }));

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

    it('logs the message', async () => {
      const { logInfoConsole } = jest.requireMock('../utils/consoleLogger');

      await diffAddHandler(buildDeps());

      expect(logInfoConsole).toHaveBeenCalledWith(
        expect.stringContaining('Add new command'),
      );
    });
  });

  describe('submitted count correctness', () => {
    describe('when multiple are submitted', () => {
      it('displays correct count', async () => {
        const { logSuccessConsole } = jest.requireMock(
          '../utils/consoleLogger',
        );
        mockSubmitDiffs.mockResolvedValue({
          submitted: 1,
          alreadySubmitted: 0,
          skipped: [],
          errors: [],
        });

        await diffAddHandler(buildDeps());

        expect(logSuccessConsole).toHaveBeenCalledWith('Summary: 1 submitted');
      });
    });

    it('includes alreadySubmitted in summary', async () => {
      const { logWarningConsole } = jest.requireMock('../utils/consoleLogger');
      mockSubmitDiffs.mockResolvedValue({
        submitted: 0,
        alreadySubmitted: 1,
        skipped: [],
        errors: [],
      });

      await diffAddHandler(buildDeps());

      expect(logWarningConsole).toHaveBeenCalledWith(
        'Summary: 1 already submitted',
      );
    });
  });

  describe('API errors', () => {
    beforeEach(() => {
      mockSubmitDiffs.mockResolvedValue({
        submitted: 0,
        alreadySubmitted: 0,
        skipped: [],
        errors: [
          { name: 'My Command', message: 'Server error', code: 'INTERNAL' },
        ],
      });
    });

    it('logs individual error details', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffAddHandler(buildDeps());

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Failed to submit "My Command"'),
      );
    });

    it('logs error count in summary', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffAddHandler(buildDeps());

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('1 error'),
      );
    });

    it('exits with 1', async () => {
      await diffAddHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    describe('when there are both submitted and errors', () => {
      it('shows error summary', async () => {
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
  });

  describe('message validation with -m flag', () => {
    it('logs validation error for empty message', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffAddHandler(buildDeps({ message: '   ' }));

      expect(logErrorConsole).toHaveBeenCalledWith('Message cannot be empty.');
    });

    it('exits with 1 for empty message', async () => {
      await diffAddHandler(buildDeps({ message: '   ' }));

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

  describe('standard file happy path', () => {
    it('calls submitDiffs with createStandard diff for .packmind/standards/', async () => {
      mockReadFile.mockReturnValue(VALID_STANDARD_CONTENT);

      await diffAddHandler(
        buildDeps({
          filePath: '.packmind/standards/my-standard.md',
          message: 'Add standard',
        }),
      );

      expect(mockSubmitDiffs).toHaveBeenCalledWith(
        [
          [
            expect.objectContaining({
              filePath: '/project/.packmind/standards/my-standard.md',
              type: ChangeProposalType.createStandard,
              payload: {
                name: 'My Standard',
                description: 'A description of the standard.',
                scope: null,
                rules: [
                  { content: 'Do not use var' },
                  { content: 'Always use const' },
                ],
              },
              artifactName: 'My Standard',
              artifactType: 'standard',
              spaceId: 'space-123',
            }),
          ],
        ],
        'Add standard',
      );
    });

    it('calls submitDiffs with createStandard diff for .claude/rules/packmind/', async () => {
      mockReadFile.mockReturnValue(STANDARD_WITH_SCOPE_CONTENT);

      await diffAddHandler(
        buildDeps({
          filePath: '.claude/rules/packmind/standard-scoped.md',
          message: 'Add scoped standard',
        }),
      );

      expect(mockSubmitDiffs).toHaveBeenCalledWith(
        [
          [
            expect.objectContaining({
              type: ChangeProposalType.createStandard,
              payload: {
                name: 'Scoped Standard',
                description: 'Description with scope.',
                scope: '**/*.ts',
                rules: [{ content: 'Rule one' }],
              },
              artifactName: 'Scoped Standard',
              artifactType: 'standard',
            }),
          ],
        ],
        'Add scoped standard',
      );
    });

    it('maps empty scope to null', async () => {
      mockReadFile.mockReturnValue(VALID_STANDARD_CONTENT);

      await diffAddHandler(
        buildDeps({
          filePath: '.packmind/standards/my-standard.md',
          message: 'Add standard',
        }),
      );

      expect(mockSubmitDiffs).toHaveBeenCalledWith(
        [
          [
            expect.objectContaining({
              payload: expect.objectContaining({ scope: null }),
            }),
          ],
        ],
        'Add standard',
      );
    });

    it('handles standard with no rules', async () => {
      const noRulesContent = '# Empty Standard\n\nJust a description.\n';
      mockReadFile.mockReturnValue(noRulesContent);

      await diffAddHandler(
        buildDeps({
          filePath: '.packmind/standards/empty.md',
          message: 'Add empty standard',
        }),
      );

      expect(mockSubmitDiffs).toHaveBeenCalledWith(
        [
          [
            expect.objectContaining({
              payload: expect.objectContaining({ rules: [] }),
            }),
          ],
        ],
        'Add empty standard',
      );
    });
  });

  describe('standard file without standard- prefix', () => {
    it('parses correctly using agent-based parser', async () => {
      mockReadFile.mockReturnValue(STANDARD_WITH_SCOPE_CONTENT);

      await diffAddHandler(
        buildDeps({
          filePath: '.claude/rules/packmind/my-custom-rule.md',
          message: 'Add custom rule',
        }),
      );

      expect(mockSubmitDiffs).toHaveBeenCalledWith(
        [
          [
            expect.objectContaining({
              type: ChangeProposalType.createStandard,
              payload: {
                name: 'Scoped Standard',
                description: 'Description with scope.',
                scope: '**/*.ts',
                rules: [{ content: 'Rule one' }],
              },
              artifactName: 'Scoped Standard',
              artifactType: 'standard',
            }),
          ],
        ],
        'Add custom rule',
      );
    });

    it('exits with 0 on success', async () => {
      mockReadFile.mockReturnValue(STANDARD_WITH_SCOPE_CONTENT);

      await diffAddHandler(
        buildDeps({
          filePath: '.claude/rules/packmind/my-custom-rule.md',
          message: 'Add custom rule',
        }),
      );

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('standard file parse failure', () => {
    describe('when content does not match any standard format', () => {
      beforeEach(() => {
        mockReadFile.mockReturnValue('Some random content without heading');
      });

      it('logs error', async () => {
        const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

        await diffAddHandler(
          buildDeps({
            filePath: '.packmind/standards/bad.md',
            message: 'Add bad standard',
          }),
        );

        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('Failed to parse standard file'),
        );
      });

      it('exits with 1', async () => {
        await diffAddHandler(
          buildDeps({
            filePath: '.packmind/standards/bad.md',
            message: 'Add bad standard',
          }),
        );

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });
});
