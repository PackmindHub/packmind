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
  let mockReadSkillDirectory: jest.Mock;

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
      configExists: jest
        .fn()
        .mockImplementation((dir: string) =>
          Promise.resolve(dir === '/project'),
        ),
      readFullConfig: jest
        .fn()
        .mockImplementation((dir: string) =>
          Promise.resolve(
            dir === '/project' ? { packages: { 'my-package': '*' } } : null,
          ),
        ),
      tryGetGitRepositoryRoot: jest.fn().mockResolvedValue(null),
      getPackmindGateway: () => ({
        spaces: { getGlobal: mockGetGlobal },
      }),
    } as unknown as PackmindCliHexa;

    mockExit = jest.fn();
    mockGetCwd = jest.fn().mockReturnValue('/project');
    mockReadFile = jest.fn().mockReturnValue(VALID_COMMAND_CONTENT);
    mockReadSkillDirectory = jest.fn().mockResolvedValue([]);

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
      readSkillDirectory: mockReadSkillDirectory,
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

    describe('when git context is available', () => {
      let mockReadFullConfig: jest.Mock;
      let mockTryGetGitRepositoryRoot: jest.Mock;
      let mockGetGitRemoteUrlFromPath: jest.Mock;
      let mockGetCurrentBranch: jest.Mock;
      let mockGetDeployed: jest.Mock;

      beforeEach(() => {
        mockReadFullConfig = jest
          .fn()
          .mockResolvedValue({ packages: { 'my-package': '*' }, agents: [] });
        mockTryGetGitRepositoryRoot = jest
          .fn()
          .mockResolvedValue('/project/git-root');
        mockGetGitRemoteUrlFromPath = jest
          .fn()
          .mockReturnValue('git@github.com:org/repo.git');
        mockGetCurrentBranch = jest.fn().mockReturnValue('main');
        mockGetDeployed = jest.fn().mockResolvedValue({
          fileUpdates: { createOrUpdate: [], delete: [] },
          skillFolders: [],
          targetId: 'target-456',
        });

        mockPackmindCliHexa = {
          submitDiffs: mockSubmitDiffs,
          configExists: jest
            .fn()
            .mockImplementation((dir: string) =>
              Promise.resolve(dir === '/project'),
            ),
          readFullConfig: mockReadFullConfig,
          tryGetGitRepositoryRoot: mockTryGetGitRepositoryRoot,
          getGitRemoteUrlFromPath: mockGetGitRemoteUrlFromPath,
          getCurrentBranch: mockGetCurrentBranch,
          getPackmindGateway: () => ({
            spaces: { getGlobal: mockGetGlobal },
            deployment: { getDeployed: mockGetDeployed },
          }),
        } as unknown as PackmindCliHexa;
      });

      it('includes targetId in the submitted diff', async () => {
        await diffAddHandler(
          buildDeps({ packmindCliHexa: mockPackmindCliHexa }),
        );

        expect(mockSubmitDiffs).toHaveBeenCalledWith(
          [
            [
              expect.objectContaining({
                targetId: 'target-456',
              }),
            ],
          ],
          'Add new command',
        );
      });
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
        expect.stringContaining('Failed to submit addition "My Command"'),
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

  describe('skill happy path', () => {
    const VALID_SKILL_MD_CONTENT = [
      '---',
      'name: My Skill',
      'description: A useful skill',
      '---',
      'This is the prompt body.',
    ].join('\n');

    beforeEach(() => {
      mockReadSkillDirectory.mockResolvedValue([
        {
          path: '/project/.claude/skills/my-skill/SKILL.md',
          relativePath: 'SKILL.md',
          content: VALID_SKILL_MD_CONTENT,
          size: VALID_SKILL_MD_CONTENT.length,
          permissions: 'rw-r--r--',
          isBase64: false,
        },
      ]);
    });

    it('calls submitDiffs with createSkill diff', async () => {
      await diffAddHandler(
        buildDeps({
          filePath: '.claude/skills/my-skill/SKILL.md',
          message: 'Add skill',
        }),
      );

      expect(mockSubmitDiffs).toHaveBeenCalledWith(
        [
          [
            expect.objectContaining({
              filePath: '/project/.claude/skills/my-skill/SKILL.md',
              type: ChangeProposalType.createSkill,
              payload: {
                name: 'My Skill',
                description: 'A useful skill',
                prompt: 'This is the prompt body.',
                skillMdPermissions: 'rw-r--r--',
                files: [],
              },
              artifactName: 'My Skill',
              artifactType: 'skill',
              spaceId: 'space-123',
            }),
          ],
        ],
        'Add skill',
      );
    });

    it('exits with 0 on success', async () => {
      await diffAddHandler(
        buildDeps({
          filePath: '.claude/skills/my-skill/SKILL.md',
          message: 'Add skill',
        }),
      );

      expect(mockExit).toHaveBeenCalledWith(0);
    });

    describe('when SKILL.md is given', () => {
      it('calls readSkillDirectory with directory path', async () => {
        await diffAddHandler(
          buildDeps({
            filePath: '.claude/skills/my-skill/SKILL.md',
            message: 'Add skill',
          }),
        );

        expect(mockReadSkillDirectory).toHaveBeenCalledWith(
          '/project/.claude/skills/my-skill',
        );
      });
    });

    describe('when directory is given', () => {
      it('calls readSkillDirectory with directory path', async () => {
        await diffAddHandler(
          buildDeps({
            filePath: '.claude/skills/my-skill/',
            message: 'Add skill',
          }),
        );

        expect(mockReadSkillDirectory).toHaveBeenCalledWith(
          '/project/.claude/skills/my-skill',
        );
      });
    });

    it('does not call readFile for skill paths', async () => {
      await diffAddHandler(
        buildDeps({
          filePath: '.claude/skills/my-skill/SKILL.md',
          message: 'Add skill',
        }),
      );

      expect(mockReadFile).not.toHaveBeenCalled();
    });
  });

  describe('skill with supporting files', () => {
    const VALID_SKILL_MD_CONTENT = [
      '---',
      'name: Complex Skill',
      'description: Skill with files',
      'license: MIT',
      '---',
      'The prompt.',
    ].join('\n');

    beforeEach(() => {
      mockReadSkillDirectory.mockResolvedValue([
        {
          path: '/project/.claude/skills/complex/SKILL.md',
          relativePath: 'SKILL.md',
          content: VALID_SKILL_MD_CONTENT,
          size: VALID_SKILL_MD_CONTENT.length,
          permissions: 'rw-r--r--',
          isBase64: false,
        },
        {
          path: '/project/.claude/skills/complex/helper.py',
          relativePath: 'helper.py',
          content: 'print("hello")',
          size: 14,
          permissions: '755',
          isBase64: false,
        },
      ]);
    });

    it('includes supporting files in the payload', async () => {
      await diffAddHandler(
        buildDeps({
          filePath: '.claude/skills/complex/SKILL.md',
          message: 'Add complex skill',
        }),
      );

      expect(mockSubmitDiffs).toHaveBeenCalledWith(
        [
          [
            expect.objectContaining({
              type: ChangeProposalType.createSkill,
              payload: {
                name: 'Complex Skill',
                description: 'Skill with files',
                prompt: 'The prompt.',
                skillMdPermissions: 'rw-r--r--',
                license: 'MIT',
                files: [
                  {
                    path: 'helper.py',
                    content: 'print("hello")',
                    permissions: '755',
                    isBase64: false,
                  },
                ],
              },
            }),
          ],
        ],
        'Add complex skill',
      );
    });
  });

  describe('skill directory read failure', () => {
    beforeEach(() => {
      mockReadSkillDirectory.mockRejectedValue(
        new Error('ENOENT: no such file or directory'),
      );
    });

    it('logs error', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffAddHandler(
        buildDeps({
          filePath: '.claude/skills/missing/SKILL.md',
          message: 'Add missing skill',
        }),
      );

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read skill directory'),
      );
    });

    it('exits with 1', async () => {
      await diffAddHandler(
        buildDeps({
          filePath: '.claude/skills/missing/SKILL.md',
          message: 'Add missing skill',
        }),
      );

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('skill parse failure', () => {
    beforeEach(() => {
      mockReadSkillDirectory.mockResolvedValue([
        {
          path: '/project/.claude/skills/bad/SKILL.md',
          relativePath: 'SKILL.md',
          content: 'No frontmatter here',
          size: 19,
          permissions: 'rw-r--r--',
          isBase64: false,
        },
      ]);
    });

    it('logs error', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await diffAddHandler(
        buildDeps({
          filePath: '.claude/skills/bad/SKILL.md',
          message: 'Add bad skill',
        }),
      );

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse SKILL.md'),
      );
    });

    it('exits with 1', async () => {
      await diffAddHandler(
        buildDeps({
          filePath: '.claude/skills/bad/SKILL.md',
          message: 'Add bad skill',
        }),
      );

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

    describe('when packmind standard has no rules', () => {
      beforeEach(() => {
        mockReadFile.mockReturnValue(
          '# Empty Standard\n\nJust a description.\n',
        );
      });

      it('logs no-rules error', async () => {
        const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');
        await diffAddHandler(
          buildDeps({
            filePath: '.packmind/standards/empty.md',
            message: 'Add empty standard',
          }),
        );
        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('Standard has no rules'),
        );
      });

      it('includes packmind format example in error', async () => {
        const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');
        await diffAddHandler(
          buildDeps({
            filePath: '.packmind/standards/empty.md',
            message: 'Add empty standard',
          }),
        );
        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('## Rules'),
        );
      });

      it('does not call submitDiffs', async () => {
        await diffAddHandler(
          buildDeps({
            filePath: '.packmind/standards/empty.md',
            message: 'Add empty standard',
          }),
        );
        expect(mockSubmitDiffs).not.toHaveBeenCalled();
      });

      it('exits with 1', async () => {
        await diffAddHandler(
          buildDeps({
            filePath: '.packmind/standards/empty.md',
            message: 'Add empty standard',
          }),
        );
        expect(mockExit).toHaveBeenCalledWith(1);
      });
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
          expect.stringContaining('File format is invalid'),
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

    describe('when claude rules file lacks ## Standard: header', () => {
      beforeEach(() => {
        mockReadFile.mockReturnValue(
          'Everything about our testing conventions\n- single assertion\n- does not start with should',
        );
      });

      it('logs format error with expected format example', async () => {
        const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

        await diffAddHandler(
          buildDeps({
            filePath: '.claude/rules/jest-conventions.md',
            message: 'Add jest conventions',
          }),
        );

        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('## Standard: <name>'),
        );
      });

      it('exits with 1', async () => {
        await diffAddHandler(
          buildDeps({
            filePath: '.claude/rules/jest-conventions.md',
            message: 'Add jest conventions',
          }),
        );

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when claude standard has heading but no rules', () => {
      beforeEach(() => {
        mockReadFile.mockReturnValue(
          '## Standard: Empty\n\nJust a description.\n',
        );
      });

      it('logs no-rules error', async () => {
        const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');
        await diffAddHandler(
          buildDeps({
            filePath: '.claude/rules/packmind/standard-empty.md',
            message: 'Add empty',
          }),
        );
        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('Standard has no rules'),
        );
      });

      it('exits with 1', async () => {
        await diffAddHandler(
          buildDeps({
            filePath: '.claude/rules/packmind/standard-empty.md',
            message: 'Add empty',
          }),
        );
        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when standard contains only the fallback placeholder rule', () => {
      beforeEach(() => {
        mockReadFile.mockReturnValue(
          '# Template Standard\n\nDescription\n\n## Rules\n\n* No rules defined yet.\n',
        );
      });

      it('logs no-rules error', async () => {
        const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');
        await diffAddHandler(
          buildDeps({
            filePath: '.packmind/standards/template.md',
            message: 'Add template',
          }),
        );
        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('Standard has no rules'),
        );
      });

      it('does not call submitDiffs', async () => {
        await diffAddHandler(
          buildDeps({
            filePath: '.packmind/standards/template.md',
            message: 'Add template',
          }),
        );
        expect(mockSubmitDiffs).not.toHaveBeenCalled();
      });
    });
  });
});
