import * as fs from 'fs';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  statSync: jest.fn(),
  existsSync: jest.fn(),
}));

import {
  playbookAddHandler,
  PlaybookAddHandlerDependencies,
} from './addHandler';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { IPlaybookLocalRepository } from '../../../domain/repositories/IPlaybookLocalRepository';
import { ILockFileRepository } from '../../../domain/repositories/ILockFileRepository';

jest.mock('../../utils/consoleLogger', () => ({
  formatLabel: jest.fn((label: string) => label),
  logErrorConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logWarningConsole: jest.fn(),
}));

jest.mock('../../../application/utils/parseLenientStandard');

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

const VALID_SKILL_MD_CONTENT = [
  '---',
  'name: My Skill',
  'description: A useful skill',
  '---',
  'This is the prompt body.',
].join('\n');

describe('playbookAddHandler', () => {
  let mockPackmindCliHexa: PackmindCliHexa;
  let mockExit: jest.Mock;
  let mockReadFile: jest.Mock;
  let mockReadSkillDirectory: jest.Mock;
  let mockPlaybookLocalRepository: jest.Mocked<IPlaybookLocalRepository>;
  let mockLockFileRepository: jest.Mocked<ILockFileRepository>;
  let mockGetDeployed: jest.Mock;
  let mockGetContentByVersions: jest.Mock;

  beforeEach(() => {
    // Default fs mocks for resolveSkillDirectoryRoot:
    // - statSync: treat any path as a directory (skill tests pass directory paths)
    // - existsSync: return false (no SKILL.md found when walking up)
    (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    mockGetDeployed = jest.fn().mockResolvedValue({
      fileUpdates: { createOrUpdate: [], delete: [] },
      skillFolders: [],
      targetId: 'target-456',
      resolvedAgents: [],
    });

    mockGetContentByVersions = jest.fn().mockResolvedValue({
      fileUpdates: { createOrUpdate: [], delete: [] },
      skillFolders: [],
      targetId: 'target-456',
      resolvedAgents: [],
    });

    mockPackmindCliHexa = {
      getDefaultSpace: jest.fn().mockResolvedValue({
        id: 'space-123',
        name: 'Global',
        slug: 'global',
        organizationId: 'org-1',
      }),
      getSpaces: jest.fn().mockResolvedValue([
        {
          id: 'space-123',
          name: 'Global',
          slug: 'global',
          isDefaultSpace: true,
          organizationId: 'org-1',
        },
      ]),
      configExists: jest
        .fn()
        .mockImplementation((dir: string) =>
          Promise.resolve(dir === '/project'),
        ),
      readFullConfig: jest
        .fn()
        .mockImplementation((dir: string) =>
          Promise.resolve(
            dir === '/project'
              ? { packages: { 'my-package': '*' }, agents: [] }
              : null,
          ),
        ),
      tryGetGitRepositoryRoot: jest.fn().mockResolvedValue('/project'),
      getGitRemoteUrlFromPath: jest
        .fn()
        .mockReturnValue('git@github.com:org/repo.git'),
      getCurrentBranch: jest.fn().mockReturnValue('main'),
      getPackmindGateway: () => ({
        deployment: {
          getDeployed: mockGetDeployed,
          getContentByVersions: mockGetContentByVersions,
        },
      }),
      listCommands: jest.fn().mockResolvedValue([]),
      listStandards: jest.fn().mockResolvedValue([]),
      listSkills: jest.fn().mockResolvedValue([]),
    } as unknown as PackmindCliHexa;

    mockExit = jest.fn();
    mockReadFile = jest.fn().mockReturnValue(VALID_COMMAND_CONTENT);
    mockReadSkillDirectory = jest.fn().mockResolvedValue([]);

    mockPlaybookLocalRepository = {
      addChange: jest.fn(),
      removeChange: jest.fn(),
      getChanges: jest.fn().mockReturnValue([]),
      getChange: jest.fn().mockReturnValue(null),
      clearAll: jest.fn(),
    };

    mockLockFileRepository = {
      read: jest.fn().mockResolvedValue(null),
      write: jest.fn(),
      delete: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function buildDeps(
    overrides: Partial<PlaybookAddHandlerDependencies> = {},
  ): PlaybookAddHandlerDependencies {
    return {
      packmindCliHexa: mockPackmindCliHexa,
      filePath: '.claude/commands/my-command.md',
      exit: mockExit,
      cwd: '/project',
      readFile: mockReadFile,
      readSkillDirectory: mockReadSkillDirectory,
      playbookLocalRepository: mockPlaybookLocalRepository,
      lockFileRepository: mockLockFileRepository,
      spaceSlug: undefined,
      ...overrides,
    };
  }

  describe('when filePath is missing', () => {
    it('logs error', async () => {
      const { logErrorConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookAddHandler(buildDeps({ filePath: undefined }));

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Missing file path'),
      );
    });

    it('exits with 1', async () => {
      await playbookAddHandler(buildDeps({ filePath: undefined }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not add to playbook', async () => {
      await playbookAddHandler(buildDeps({ filePath: undefined }));

      expect(mockPlaybookLocalRepository.addChange).not.toHaveBeenCalled();
    });
  });

  describe('when file path is unsupported', () => {
    it('logs error', async () => {
      const { logErrorConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookAddHandler(buildDeps({ filePath: 'src/index.ts' }));

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Unsupported file path'),
      );
    });

    it('exits with 1', async () => {
      await playbookAddHandler(buildDeps({ filePath: 'src/index.ts' }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not add to playbook', async () => {
      await playbookAddHandler(buildDeps({ filePath: 'src/index.ts' }));

      expect(mockPlaybookLocalRepository.addChange).not.toHaveBeenCalled();
    });
  });

  describe('when command file has invalid format', () => {
    it('logs error about invalid format', async () => {
      const { logErrorConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookAddHandler(
        buildDeps({ filePath: '.claude/commands/whatever.py' }),
      );

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Invalid file format'),
      );
    });

    it('exits with 1', async () => {
      await playbookAddHandler(
        buildDeps({ filePath: '.claude/commands/whatever.py' }),
      );

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not add to playbook', async () => {
      await playbookAddHandler(
        buildDeps({ filePath: '.claude/commands/whatever.py' }),
      );

      expect(mockPlaybookLocalRepository.addChange).not.toHaveBeenCalled();
    });

    it('does not read the file', async () => {
      await playbookAddHandler(
        buildDeps({ filePath: '.claude/commands/whatever.py' }),
      );

      expect(mockReadFile).not.toHaveBeenCalled();
    });
  });

  describe('when standard file has invalid format', () => {
    beforeEach(() => {
      mockReadFile.mockReturnValue('random notes without heading');
      const { parseLenientStandard } = jest.requireMock(
        '../../../application/utils/parseLenientStandard',
      );
      parseLenientStandard.mockReturnValue(null);
    });

    it('logs error about invalid artifact', async () => {
      const { logErrorConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookAddHandler(
        buildDeps({ filePath: '.claude/rules/whatever.md' }),
      );

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('is not a valid artifact'),
      );
    });

    it('exits with 1', async () => {
      await playbookAddHandler(
        buildDeps({ filePath: '.claude/rules/whatever.md' }),
      );

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when readFile throws', () => {
    beforeEach(() => {
      mockReadFile.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });
    });

    it('logs error', async () => {
      const { logErrorConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookAddHandler(buildDeps());

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read file'),
      );
    });

    it('exits with 1', async () => {
      await playbookAddHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when no packmind.json found', () => {
    beforeEach(() => {
      (mockPackmindCliHexa.configExists as jest.Mock).mockResolvedValue(false);
    });

    it('logs error', async () => {
      const { logErrorConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookAddHandler(buildDeps());

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('No packmind.json found'),
      );
    });

    it('exits with 1', async () => {
      await playbookAddHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when local content matches deployed content', () => {
    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['claude'],
        installedAt: '2026-03-17T00:00:00.000Z',
        cliVersion: '1.0.0',
        targetId: 'target-456',
        artifacts: {
          'my-command': {
            name: 'My Command',
            type: 'command',
            id: 'artifact-cmd-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: ['pkg-1'],
            files: [
              { path: '.claude/commands/my-command.md', agent: 'claude' },
            ],
          },
        },
      });
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/commands/my-command.md',
              content: VALID_COMMAND_CONTENT,
            },
          ],
          delete: [],
        },
        skillFolders: [],
        targetId: 'target-456',
        resolvedAgents: [],
      });
    });

    it('logs already up to date', async () => {
      const { logInfoConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookAddHandler(buildDeps());

      expect(logInfoConsole).toHaveBeenCalledWith(
        expect.stringContaining('Already up to date'),
      );
    });

    it('exits with 0', async () => {
      await playbookAddHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('does not add to playbook', async () => {
      await playbookAddHandler(buildDeps());

      expect(mockPlaybookLocalRepository.addChange).not.toHaveBeenCalled();
    });
  });

  describe('when local content matches deployed content with trailing whitespace difference', () => {
    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['claude'],
        installedAt: '2026-03-17T00:00:00.000Z',
        cliVersion: '1.0.0',
        targetId: 'target-456',
        artifacts: {
          'my-command': {
            name: 'My Command',
            type: 'command',
            id: 'artifact-cmd-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: ['pkg-1'],
            files: [
              { path: '.claude/commands/my-command.md', agent: 'claude' },
            ],
          },
        },
      });
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/commands/my-command.md',
              content: VALID_COMMAND_CONTENT,
            },
          ],
          delete: [],
        },
        skillFolders: [],
        targetId: 'target-456',
        resolvedAgents: [],
      });
      mockReadFile.mockReturnValue(VALID_COMMAND_CONTENT + '\n');
    });

    it('logs already up to date', async () => {
      const { logInfoConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookAddHandler(buildDeps());

      expect(logInfoConsole).toHaveBeenCalledWith(
        expect.stringContaining('Already up to date'),
      );
    });

    it('does not add to playbook', async () => {
      await playbookAddHandler(buildDeps());

      expect(mockPlaybookLocalRepository.addChange).not.toHaveBeenCalled();
    });
  });

  describe('when command content differs from deployed', () => {
    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['claude'],
        installedAt: '2026-03-17T00:00:00.000Z',
        cliVersion: '1.0.0',
        targetId: 'target-456',
        artifacts: {
          'my-command': {
            name: 'My Command',
            type: 'command',
            id: 'artifact-cmd-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: ['pkg-1'],
            files: [
              { path: '.claude/commands/my-command.md', agent: 'claude' },
            ],
          },
        },
      });
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/commands/my-command.md',
              content: 'old content',
            },
          ],
          delete: [],
        },
        skillFolders: [],
        targetId: 'target-456',
        resolvedAgents: [],
      });
    });

    it('adds change to playbook', async () => {
      await playbookAddHandler(buildDeps());

      expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: '.claude/commands/my-command.md',
          artifactType: 'command',
          artifactName: 'My Command',
          codingAgent: 'claude',
          content: VALID_COMMAND_CONTENT,
          spaceId: 'space-123',
          targetId: 'target-456',
        }),
      );
    });

    it('exits with 0', async () => {
      await playbookAddHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('logs confirmation', async () => {
      const { logSuccessConsole } = jest.requireMock(
        '../../utils/consoleLogger',
      );

      await playbookAddHandler(buildDeps());

      expect(logSuccessConsole).toHaveBeenCalledWith(
        expect.stringContaining('My Command'),
      );
    });
  });

  describe('when command has no deployed counterpart', () => {
    it('adds change to playbook', async () => {
      await playbookAddHandler(buildDeps());

      expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: '.claude/commands/my-command.md',
          artifactType: 'command',
          artifactName: 'My Command',
          codingAgent: 'claude',
          content: VALID_COMMAND_CONTENT,
          spaceId: 'space-123',
          targetId: 'target-456',
        }),
      );
    });

    it('exits with 0', async () => {
      await playbookAddHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when standard file is provided', () => {
    beforeEach(() => {
      mockReadFile.mockReturnValue(VALID_STANDARD_CONTENT);
    });

    it('adds change with standard artifact type', async () => {
      await playbookAddHandler(
        buildDeps({ filePath: '.packmind/standards/my-standard.md' }),
      );

      expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
        expect.objectContaining({
          artifactType: 'standard',
          artifactName: 'My Standard',
          codingAgent: 'packmind',
          content: VALID_STANDARD_CONTENT,
        }),
      );
    });

    it('exits with 0', async () => {
      await playbookAddHandler(
        buildDeps({ filePath: '.packmind/standards/my-standard.md' }),
      );

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when skill is provided', () => {
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

    it('adds change with skill artifact type', async () => {
      await playbookAddHandler(
        buildDeps({ filePath: '.claude/skills/my-skill/SKILL.md' }),
      );

      expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
        expect.objectContaining({
          artifactType: 'skill',
          artifactName: 'My Skill',
          codingAgent: 'claude',
        }),
      );
    });

    it('serializes skill content as yaml with name', async () => {
      await playbookAddHandler(
        buildDeps({ filePath: '.claude/skills/my-skill/SKILL.md' }),
      );

      const callArg = mockPlaybookLocalRepository.addChange.mock.calls[0][0];
      expect(callArg.content).toContain('name: My Skill');
    });

    it('serializes skill content as yaml with description', async () => {
      await playbookAddHandler(
        buildDeps({ filePath: '.claude/skills/my-skill/SKILL.md' }),
      );

      const callArg = mockPlaybookLocalRepository.addChange.mock.calls[0][0];
      expect(callArg.content).toContain('description: A useful skill');
    });

    it('uses skill directory path for readSkillDirectory', async () => {
      await playbookAddHandler(
        buildDeps({ filePath: '.claude/skills/my-skill/SKILL.md' }),
      );

      expect(mockReadSkillDirectory).toHaveBeenCalledWith(
        '/project/.claude/skills/my-skill',
      );
    });

    describe('when SKILL.md path is provided', () => {
      it('stores directory path in playbook', async () => {
        await playbookAddHandler(
          buildDeps({ filePath: '.claude/skills/my-skill/SKILL.md' }),
        );

        expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
          expect.objectContaining({
            filePath: '.claude/skills/my-skill',
          }),
        );
      });
    });

    describe('when directory path is provided', () => {
      it('stores directory path in playbook', async () => {
        await playbookAddHandler(
          buildDeps({ filePath: '.claude/skills/my-skill' }),
        );

        expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
          expect.objectContaining({
            filePath: '.claude/skills/my-skill',
          }),
        );
      });
    });

    it('exits with 0', async () => {
      await playbookAddHandler(
        buildDeps({ filePath: '.claude/skills/my-skill/SKILL.md' }),
      );

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when skill exists in lock file (changeType detection)', () => {
    beforeEach(() => {
      mockReadSkillDirectory.mockResolvedValue([
        {
          path: '/project/.claude/skills/my-skill/SKILL.md',
          relativePath: 'SKILL.md',
          content: VALID_SKILL_MD_CONTENT + '\nmodified',
          size: 100,
          permissions: 'rw-r--r--',
          isBase64: false,
        },
      ]);
      mockLockFileRepository.read.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['claude'],
        installedAt: '2026-03-17T00:00:00.000Z',
        cliVersion: '1.0.0',
        targetId: 'target-456',
        artifacts: {
          'my-skill': {
            name: 'My Skill',
            type: 'skill',
            id: 'artifact-skill-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: ['pkg-1'],
            files: [
              { path: '.claude/skills/my-skill/SKILL.md', agent: 'claude' },
            ],
          },
        },
      });
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content: VALID_SKILL_MD_CONTENT,
            },
          ],
          delete: [],
        },
        skillFolders: [],
        targetId: 'target-456',
        resolvedAgents: [],
      });
    });

    describe('when directory path is provided', () => {
      it('detects changeType as updated', async () => {
        await playbookAddHandler(
          buildDeps({ filePath: '.claude/skills/my-skill' }),
        );

        expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
          expect.objectContaining({ changeType: 'updated' }),
        );
      });
    });

    describe('when SKILL.md path is provided', () => {
      it('detects changeType as updated', async () => {
        await playbookAddHandler(
          buildDeps({ filePath: '.claude/skills/my-skill/SKILL.md' }),
        );

        expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
          expect.objectContaining({ changeType: 'updated' }),
        );
      });
    });
  });

  describe('when skill local content matches deployed content', () => {
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
      mockLockFileRepository.read.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['claude'],
        installedAt: '2026-03-17T00:00:00.000Z',
        cliVersion: '1.0.0',
        targetId: 'target-456',
        artifacts: {
          'my-skill': {
            name: 'My Skill',
            type: 'skill',
            id: 'artifact-skill-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: ['pkg-1'],
            files: [
              {
                path: '.claude/skills/my-skill/SKILL.md',
                agent: 'claude',
              },
            ],
          },
        },
      });
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content: VALID_SKILL_MD_CONTENT,
            },
          ],
          delete: [],
        },
        skillFolders: [],
        targetId: 'target-456',
        resolvedAgents: [],
      });
    });

    it('logs already up to date', async () => {
      const { logInfoConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookAddHandler(
        buildDeps({ filePath: '.claude/skills/my-skill/SKILL.md' }),
      );

      expect(logInfoConsole).toHaveBeenCalledWith(
        expect.stringContaining('Already up to date'),
      );
    });

    it('exits with 0', async () => {
      await playbookAddHandler(
        buildDeps({ filePath: '.claude/skills/my-skill/SKILL.md' }),
      );

      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('does not add to playbook', async () => {
      await playbookAddHandler(
        buildDeps({ filePath: '.claude/skills/my-skill/SKILL.md' }),
      );

      expect(mockPlaybookLocalRepository.addChange).not.toHaveBeenCalled();
    });
  });

  describe('when skill content matches but permissions differ', () => {
    beforeEach(() => {
      mockReadSkillDirectory.mockResolvedValue([
        {
          path: '/project/.claude/skills/my-skill/SKILL.md',
          relativePath: 'SKILL.md',
          content: VALID_SKILL_MD_CONTENT,
          size: VALID_SKILL_MD_CONTENT.length,
          permissions: 'rwxr-xr-x',
          isBase64: false,
        },
      ]);
      mockLockFileRepository.read.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['claude'],
        installedAt: '2026-03-17T00:00:00.000Z',
        cliVersion: '1.0.0',
        targetId: 'target-456',
        artifacts: {
          'my-skill': {
            name: 'My Skill',
            type: 'skill',
            id: 'artifact-skill-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: ['pkg-1'],
            files: [
              {
                path: '.claude/skills/my-skill/SKILL.md',
                agent: 'claude',
              },
            ],
          },
        },
      });
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content: VALID_SKILL_MD_CONTENT,
              skillFilePermissions: 'rw-r--r--',
            },
          ],
          delete: [],
        },
        skillFolders: [],
        targetId: 'target-456',
        resolvedAgents: [],
      });
    });

    it('stages the skill as updated', async () => {
      await playbookAddHandler(
        buildDeps({ filePath: '.claude/skills/my-skill/SKILL.md' }),
      );

      expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
        expect.objectContaining({ changeType: 'updated' }),
      );
    });

    it('does not log already up to date', async () => {
      const { logInfoConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookAddHandler(
        buildDeps({ filePath: '.claude/skills/my-skill/SKILL.md' }),
      );

      expect(logInfoConsole).not.toHaveBeenCalledWith(
        expect.stringContaining('Already up to date'),
      );
    });
  });

  describe('when skill content and permissions both match', () => {
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
      mockLockFileRepository.read.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['claude'],
        installedAt: '2026-03-17T00:00:00.000Z',
        cliVersion: '1.0.0',
        targetId: 'target-456',
        artifacts: {
          'my-skill': {
            name: 'My Skill',
            type: 'skill',
            id: 'artifact-skill-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: ['pkg-1'],
            files: [
              {
                path: '.claude/skills/my-skill/SKILL.md',
                agent: 'claude',
              },
            ],
          },
        },
      });
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content: VALID_SKILL_MD_CONTENT,
              skillFilePermissions: 'rw-r--r--',
            },
          ],
          delete: [],
        },
        skillFolders: [],
        targetId: 'target-456',
        resolvedAgents: [],
      });
    });

    it('logs already up to date', async () => {
      const { logInfoConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookAddHandler(
        buildDeps({ filePath: '.claude/skills/my-skill/SKILL.md' }),
      );

      expect(logInfoConsole).toHaveBeenCalledWith(
        expect.stringContaining('Already up to date'),
      );
    });
  });

  describe('when skill has new local files not in deployed set', () => {
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
        {
          path: '/project/.claude/skills/my-skill/helper.py',
          relativePath: 'helper.py',
          content: 'print("hello")',
          size: 15,
          permissions: 'rw-r--r--',
          isBase64: false,
        },
      ]);
      mockLockFileRepository.read.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['claude'],
        installedAt: '2026-03-17T00:00:00.000Z',
        cliVersion: '1.0.0',
        targetId: 'target-456',
        artifacts: {
          'my-skill': {
            name: 'My Skill',
            type: 'skill',
            id: 'artifact-skill-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: ['pkg-1'],
            files: [
              {
                path: '.claude/skills/my-skill/SKILL.md',
                agent: 'claude',
              },
            ],
          },
        },
      });
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content: VALID_SKILL_MD_CONTENT,
            },
          ],
          delete: [],
        },
        skillFolders: [],
        targetId: 'target-456',
        resolvedAgents: [],
      });
    });

    it('stages as updated instead of reporting up to date', async () => {
      await playbookAddHandler(
        buildDeps({ filePath: '.claude/skills/my-skill/SKILL.md' }),
      );

      expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
        expect.objectContaining({ changeType: 'updated' }),
      );
    });

    it('does not log already up to date', async () => {
      const { logInfoConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookAddHandler(
        buildDeps({ filePath: '.claude/skills/my-skill/SKILL.md' }),
      );

      expect(logInfoConsole).not.toHaveBeenCalled();
    });
  });

  describe('when skill readSkillDirectory fails', () => {
    beforeEach(() => {
      mockReadSkillDirectory.mockRejectedValue(
        new Error('ENOENT: no such file or directory'),
      );
    });

    it('logs error', async () => {
      const { logErrorConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookAddHandler(
        buildDeps({ filePath: '.claude/skills/missing/SKILL.md' }),
      );

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read skill directory'),
      );
    });

    it('exits with 1', async () => {
      await playbookAddHandler(
        buildDeps({ filePath: '.claude/skills/missing/SKILL.md' }),
      );

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when skill parse fails', () => {
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
      const { logErrorConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookAddHandler(
        buildDeps({ filePath: '.claude/skills/bad/SKILL.md' }),
      );

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse SKILL.md'),
      );
    });

    it('exits with 1', async () => {
      await playbookAddHandler(
        buildDeps({ filePath: '.claude/skills/bad/SKILL.md' }),
      );

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when deployed context is unavailable', () => {
    beforeEach(() => {
      (
        mockPackmindCliHexa.tryGetGitRepositoryRoot as jest.Mock
      ).mockResolvedValue(null);
    });

    it('still adds change without targetId', async () => {
      await playbookAddHandler(buildDeps());

      expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: '.claude/commands/my-command.md',
          spaceId: 'space-123',
        }),
      );
    });

    it('exits with 0', async () => {
      await playbookAddHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(0);
    });

    describe('when lock file has a targetId', () => {
      beforeEach(() => {
        mockLockFileRepository.read.mockResolvedValue({
          lockfileVersion: 1,
          packageSlugs: ['my-package'],
          agents: ['claude'],
          installedAt: '2026-03-17T00:00:00.000Z',
          targetId: 'target-from-lockfile',
          artifacts: {},
        });
      });

      it('uses the lock file targetId as fallback', async () => {
        await playbookAddHandler(buildDeps());

        expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
          expect.objectContaining({
            targetId: 'target-from-lockfile',
          }),
        );
      });
    });
  });

  describe('when addedAt is set', () => {
    it('includes an ISO date string', async () => {
      await playbookAddHandler(buildDeps());

      const callArg = mockPlaybookLocalRepository.addChange.mock.calls[0][0];
      expect(callArg.addedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('when filePath is relative to cwd', () => {
    it('normalizes filePath relative to git root', async () => {
      (
        mockPackmindCliHexa.tryGetGitRepositoryRoot as jest.Mock
      ).mockResolvedValue('/project');

      await playbookAddHandler(buildDeps());

      const callArg = mockPlaybookLocalRepository.addChange.mock.calls[0][0];
      expect(callArg.filePath).toBe('.claude/commands/my-command.md');
    });
  });

  describe('changeType field', () => {
    describe('when file path exists in lock file', () => {
      beforeEach(() => {
        mockLockFileRepository.read.mockResolvedValue({
          lockfileVersion: 1,
          packageSlugs: ['my-package'],
          agents: ['claude'],
          installedAt: '2026-03-17T00:00:00.000Z',
          cliVersion: '1.0.0',
          targetId: 'target-456',
          artifacts: {
            'my-command': {
              name: 'My Command',
              type: 'command',
              id: 'artifact-cmd-1',
              version: 1,
              spaceId: 'space-123',
              packageIds: ['pkg-1'],
              files: [
                { path: '.claude/commands/my-command.md', agent: 'claude' },
              ],
            },
          },
        });
        mockGetContentByVersions.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.claude/commands/my-command.md',
                content: 'old content',
              },
            ],
            delete: [],
          },
          skillFolders: [],
          targetId: 'target-456',
          resolvedAgents: [],
        });
      });

      it('sets changeType to "updated"', async () => {
        await playbookAddHandler(buildDeps());

        const callArg = mockPlaybookLocalRepository.addChange.mock.calls[0][0];
        expect(callArg.changeType).toBe('updated');
      });
    });

    describe('when file path does not exist in lock file', () => {
      it('sets changeType to "created"', async () => {
        await playbookAddHandler(buildDeps());

        const callArg = mockPlaybookLocalRepository.addChange.mock.calls[0][0];
        expect(callArg.changeType).toBe('created');
      });
    });

    describe('when lock file is unavailable', () => {
      beforeEach(() => {
        mockLockFileRepository.read.mockResolvedValue(null);
      });

      it('defaults changeType to "created"', async () => {
        await playbookAddHandler(buildDeps());

        const callArg = mockPlaybookLocalRepository.addChange.mock.calls[0][0];
        expect(callArg.changeType).toBe('created');
      });
    });
  });

  describe('space resolution for new artifacts', () => {
    const MULTI_SPACE_LIST = [
      {
        id: 'space-123',
        name: 'Global',
        slug: 'global',
        isDefaultSpace: true,
        organizationId: 'org-1',
      },
      {
        id: 'space-456',
        name: 'Team Backend',
        slug: 'team-backend',
        isDefaultSpace: false,
        organizationId: 'org-1',
      },
    ];

    describe('when creating in multi-space org without --space flag and no deployed context', () => {
      beforeEach(() => {
        (mockPackmindCliHexa.getSpaces as jest.Mock).mockResolvedValue(
          MULTI_SPACE_LIST,
        );
        (
          mockPackmindCliHexa.tryGetGitRepositoryRoot as jest.Mock
        ).mockResolvedValue(null);
      });

      it('logs error mentioning --space flag', async () => {
        const { logErrorConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

        await playbookAddHandler(buildDeps());

        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('--space'),
        );
      });

      it('logs error listing global space', async () => {
        const { logErrorConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

        await playbookAddHandler(buildDeps());

        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('global'),
        );
      });

      it('logs error listing team-backend space', async () => {
        const { logErrorConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

        await playbookAddHandler(buildDeps());

        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('team-backend'),
        );
      });

      it('exits with 1', async () => {
        await playbookAddHandler(buildDeps());

        expect(mockExit).toHaveBeenCalledWith(1);
      });

      it('does not add to playbook', async () => {
        await playbookAddHandler(buildDeps());

        expect(mockPlaybookLocalRepository.addChange).not.toHaveBeenCalled();
      });
    });

    describe('when creating in multi-space org with valid --space flag', () => {
      beforeEach(() => {
        (mockPackmindCliHexa.getSpaces as jest.Mock).mockResolvedValue(
          MULTI_SPACE_LIST,
        );
      });

      it('uses the specified space', async () => {
        await playbookAddHandler(buildDeps({ spaceSlug: 'team-backend' }));

        expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
          expect.objectContaining({
            spaceId: 'space-456',
          }),
        );
      });

      it('stores spaceName from the matched space', async () => {
        await playbookAddHandler(buildDeps({ spaceSlug: 'team-backend' }));

        const callArg = mockPlaybookLocalRepository.addChange.mock.calls[0][0];
        expect(callArg.spaceName).toBe('Team Backend');
      });
    });

    describe('when creating in multi-space org with invalid --space flag', () => {
      beforeEach(() => {
        (mockPackmindCliHexa.getSpaces as jest.Mock).mockResolvedValue(
          MULTI_SPACE_LIST,
        );
      });

      it('logs error listing available spaces', async () => {
        const { logErrorConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

        await playbookAddHandler(buildDeps({ spaceSlug: 'nonexistent' }));

        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('nonexistent'),
        );
      });

      it('exits with 1', async () => {
        await playbookAddHandler(buildDeps({ spaceSlug: 'nonexistent' }));

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when creating in single-space org', () => {
      it('auto-selects the only space', async () => {
        await playbookAddHandler(buildDeps());

        expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
          expect.objectContaining({
            spaceId: 'space-123',
          }),
        );
      });

      it('stores spaceName from the auto-selected space', async () => {
        await playbookAddHandler(buildDeps());

        const callArg = mockPlaybookLocalRepository.addChange.mock.calls[0][0];
        expect(callArg.spaceName).toBe('Global');
      });

      it('accepts explicit --space flag', async () => {
        await playbookAddHandler(buildDeps({ spaceSlug: 'global' }));

        expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
          expect.objectContaining({
            spaceId: 'space-123',
          }),
        );
      });
    });

    describe('when updating existing artifact in multi-space org', () => {
      beforeEach(() => {
        (mockPackmindCliHexa.getSpaces as jest.Mock).mockResolvedValue(
          MULTI_SPACE_LIST,
        );
        mockLockFileRepository.read.mockResolvedValue({
          lockfileVersion: 1,
          packageSlugs: ['my-package'],
          agents: ['claude'],
          installedAt: '2026-03-17T00:00:00.000Z',
          cliVersion: '1.0.0',
          targetId: 'target-456',
          artifacts: {
            'my-command': {
              name: 'My Command',
              type: 'command',
              id: 'artifact-cmd-1',
              version: 1,
              spaceId: 'space-123',
              packageIds: ['pkg-1'],
              files: [
                { path: '.claude/commands/my-command.md', agent: 'claude' },
              ],
            },
          },
        });
        mockGetContentByVersions.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.claude/commands/my-command.md',
                content: 'old content',
              },
            ],
            delete: [],
          },
          skillFolders: [],
          targetId: 'target-456',
          resolvedAgents: [],
        });
      });

      describe('when no --space flag is provided', () => {
        it('uses deployed context space', async () => {
          await playbookAddHandler(buildDeps());

          expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
            expect.objectContaining({
              spaceId: 'space-123',
              spaceName: 'Global',
              changeType: 'updated',
            }),
          );
        });
      });

      describe('when --space targets a different space', () => {
        it('treats as creation', async () => {
          await playbookAddHandler(buildDeps({ spaceSlug: 'team-backend' }));

          expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
            expect.objectContaining({
              spaceId: 'space-456',
              spaceName: 'Team Backend',
              changeType: 'created',
            }),
          );
        });
      });
    });
  });

  describe('configDir in playbook entries', () => {
    describe('when adding from a subdirectory target', () => {
      beforeEach(() => {
        (mockPackmindCliHexa.configExists as jest.Mock).mockImplementation(
          (dir: string) => Promise.resolve(dir === '/project/apps/frontend'),
        );
        (mockPackmindCliHexa.readFullConfig as jest.Mock).mockImplementation(
          (dir: string) =>
            Promise.resolve(
              dir === '/project/apps/frontend'
                ? { packages: { 'my-package': '*' }, agents: [] }
                : null,
            ),
        );
        (
          mockPackmindCliHexa.tryGetGitRepositoryRoot as jest.Mock
        ).mockResolvedValue('/project');
      });

      it('stores configDir as relative path from git root to targetDir', async () => {
        await playbookAddHandler(buildDeps({ cwd: '/project/apps/frontend' }));

        const callArg = mockPlaybookLocalRepository.addChange.mock.calls[0][0];
        expect(callArg.configDir).toBe('apps/frontend');
      });
    });

    describe('when adding from repo root', () => {
      it('stores configDir as empty string', async () => {
        await playbookAddHandler(buildDeps());

        const callArg = mockPlaybookLocalRepository.addChange.mock.calls[0][0];
        expect(callArg.configDir).toBe('');
      });
    });

    describe('when git root is unavailable', () => {
      beforeEach(() => {
        (
          mockPackmindCliHexa.tryGetGitRepositoryRoot as jest.Mock
        ).mockResolvedValue(null);
      });

      it('stores configDir as empty string', async () => {
        await playbookAddHandler(buildDeps());

        const callArg = mockPlaybookLocalRepository.addChange.mock.calls[0][0];
        expect(callArg.configDir).toBe('');
      });
    });

    describe('when file is removed and staged from lock file', () => {
      beforeEach(() => {
        mockReadFile.mockImplementation(() => {
          throw new Error('ENOENT: no such file or directory');
        });
        mockLockFileRepository.read.mockResolvedValue({
          lockfileVersion: 1,
          packageSlugs: ['my-package'],
          agents: ['claude'],
          installedAt: '2026-03-17T00:00:00.000Z',
          cliVersion: '1.0.0',
          targetId: 'target-456',
          artifacts: {
            'my-command': {
              name: 'My Command',
              type: 'command',
              id: 'artifact-cmd-1',
              version: 1,
              spaceId: 'space-123',
              packageIds: ['pkg-1'],
              files: [
                { path: '.claude/commands/my-command.md', agent: 'claude' },
              ],
            },
          },
        });
      });

      it('includes configDir in removed entry', async () => {
        await playbookAddHandler(buildDeps());

        const callArg = mockPlaybookLocalRepository.addChange.mock.calls[0][0];
        expect(callArg.configDir).toBe('');
      });
    });
  });

  describe('lenient standard parsing fallback', () => {
    const HEADING_ONLY_CONTENT = '# My Lenient Standard\n\nSome description.';
    const NO_HEADING_CONTENT = 'Just some plain text without a heading.';

    describe('when content has a heading', () => {
      beforeEach(() => {
        mockReadFile.mockReturnValue(HEADING_ONLY_CONTENT);
        const { parseLenientStandard } = jest.requireMock(
          '../../../application/utils/parseLenientStandard',
        );
        parseLenientStandard.mockReturnValue({
          name: 'My Lenient Standard',
          description: 'Some description.',
        });
      });

      it('uses lenient name as artifactName', async () => {
        await playbookAddHandler(
          buildDeps({ filePath: '.packmind/standards/my-lenient.md' }),
        );

        expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
          expect.objectContaining({
            artifactName: 'My Lenient Standard',
            content: HEADING_ONLY_CONTENT,
          }),
        );
      });
    });

    describe('when content has no heading', () => {
      beforeEach(() => {
        mockReadFile.mockReturnValue(NO_HEADING_CONTENT);
        const { parseLenientStandard } = jest.requireMock(
          '../../../application/utils/parseLenientStandard',
        );
        parseLenientStandard.mockReturnValue({
          name: 'my-lenient',
          description: NO_HEADING_CONTENT,
        });
      });

      it('uses filename as artifactName', async () => {
        await playbookAddHandler(
          buildDeps({ filePath: '.packmind/standards/my-lenient.md' }),
        );

        expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
          expect.objectContaining({
            artifactName: 'my-lenient',
            content: NO_HEADING_CONTENT,
          }),
        );
      });
    });

    describe('when both parsers return null', () => {
      beforeEach(() => {
        mockReadFile.mockReturnValue('   ');
        const { parseLenientStandard } = jest.requireMock(
          '../../../application/utils/parseLenientStandard',
        );
        parseLenientStandard.mockReturnValue(null);
      });

      it('logs a not valid artifact error', async () => {
        const { logErrorConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

        await playbookAddHandler(
          buildDeps({ filePath: '.packmind/standards/empty.md' }),
        );

        expect(logErrorConsole).toHaveBeenCalledWith(
          '.packmind/standards/empty.md is not a valid artifact. Expected a markdown heading (# Name) followed by content.',
        );
      });

      it('exits with 1', async () => {
        await playbookAddHandler(
          buildDeps({ filePath: '.packmind/standards/empty.md' }),
        );

        expect(mockExit).toHaveBeenCalledWith(1);
      });

      it('does not add to playbook', async () => {
        await playbookAddHandler(
          buildDeps({ filePath: '.packmind/standards/empty.md' }),
        );

        expect(mockPlaybookLocalRepository.addChange).not.toHaveBeenCalled();
      });
    });
  });

  describe('when adding a specific file path within a skill directory', () => {
    beforeEach(() => {
      // Make statSync indicate the path is a file, not a directory
      (fs.statSync as jest.Mock).mockReturnValue({
        isDirectory: () => false,
      });
      // existsSync returns true when looking for SKILL.md in the skill root
      (fs.existsSync as jest.Mock).mockImplementation(
        (p: string) => p === '/project/.claude/skills/my-skill/SKILL.md',
      );

      mockReadSkillDirectory.mockResolvedValue([
        {
          path: '/project/.claude/skills/my-skill/SKILL.md',
          relativePath: 'SKILL.md',
          content: VALID_SKILL_MD_CONTENT,
          size: VALID_SKILL_MD_CONTENT.length,
          permissions: 'rw-r--r--',
          isBase64: false,
        },
        {
          path: '/project/.claude/skills/my-skill/references/file.md',
          relativePath: 'references/file.md',
          content: 'reference content',
          size: 17,
          permissions: 'rwxr-xr-x',
          isBase64: false,
        },
      ]);
      mockLockFileRepository.read.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['claude'],
        installedAt: '2026-03-17T00:00:00.000Z',
        cliVersion: '1.0.0',
        targetId: 'target-456',
        artifacts: {
          'my-skill': {
            name: 'My Skill',
            type: 'skill',
            id: 'artifact-skill-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: ['pkg-1'],
            files: [
              {
                path: '.claude/skills/my-skill/SKILL.md',
                agent: 'claude',
              },
              {
                path: '.claude/skills/my-skill/references/file.md',
                agent: 'claude',
              },
            ],
          },
        },
      });
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content: VALID_SKILL_MD_CONTENT,
              skillFilePermissions: 'rw-r--r--',
            },
            {
              path: '.claude/skills/my-skill/references/file.md',
              content: 'reference content',
              skillFilePermissions: 'rw-r--r--',
            },
          ],
          delete: [],
        },
        skillFolders: [],
        targetId: 'target-456',
        resolvedAgents: [],
      });
    });

    describe('resolves to the skill directory and stages as updated', () => {
      beforeEach(async () => {
        await playbookAddHandler(
          buildDeps({
            filePath: '.claude/skills/my-skill/references/file.md',
          }),
        );
      });

      it('reads the skill directory', () => {
        expect(mockReadSkillDirectory).toHaveBeenCalledWith(
          '/project/.claude/skills/my-skill',
        );
      });

      it('stages the change as updated', () => {
        expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
          expect.objectContaining({
            filePath: '.claude/skills/my-skill',
            changeType: 'updated',
            artifactType: 'skill',
          }),
        );
      });
    });

    it('does not stage as removed', async () => {
      await playbookAddHandler(
        buildDeps({
          filePath: '.claude/skills/my-skill/references/file.md',
        }),
      );

      expect(mockPlaybookLocalRepository.addChange).not.toHaveBeenCalledWith(
        expect.objectContaining({ changeType: 'removed' }),
      );
    });
  });

  describe('when file has been manually deleted', () => {
    describe('when command file is in lock file', () => {
      beforeEach(() => {
        mockReadFile.mockImplementation(() => {
          throw new Error('ENOENT: no such file or directory');
        });
        mockLockFileRepository.read.mockResolvedValue({
          lockfileVersion: 1,
          packageSlugs: ['my-package'],
          agents: ['claude'],
          installedAt: '2026-03-17T00:00:00.000Z',
          cliVersion: '1.0.0',
          targetId: 'target-456',
          artifacts: {
            'my-command': {
              name: 'My Command',
              type: 'command',
              id: 'artifact-cmd-1',
              version: 1,
              spaceId: 'space-123',
              packageIds: ['pkg-1'],
              files: [
                { path: '.claude/commands/my-command.md', agent: 'claude' },
              ],
            },
          },
        });
      });

      it('stages as removed', async () => {
        await playbookAddHandler(buildDeps());

        expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
          expect.objectContaining({
            changeType: 'removed',
            artifactName: 'My Command',
            artifactType: 'command',
            content: '',
          }),
        );
      });

      it('exits with 0', async () => {
        await playbookAddHandler(buildDeps());

        expect(mockExit).toHaveBeenCalledWith(0);
      });

      it('logs success', async () => {
        const { logSuccessConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

        await playbookAddHandler(buildDeps());

        expect(logSuccessConsole).toHaveBeenCalledWith(
          expect.stringContaining('My Command'),
        );
      });
    });

    describe('when command file is not in lock file', () => {
      beforeEach(() => {
        mockReadFile.mockImplementation(() => {
          throw new Error('ENOENT: no such file or directory');
        });
        mockLockFileRepository.read.mockResolvedValue(null);
      });

      it('logs error about failed read', async () => {
        const { logErrorConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

        await playbookAddHandler(buildDeps());

        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('Failed to read file'),
        );
      });

      it('exits with 1', async () => {
        await playbookAddHandler(buildDeps());

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when skill directory has been deleted and is in lock file (removal)', () => {
      beforeEach(() => {
        mockReadSkillDirectory.mockRejectedValue(
          new Error('ENOENT: no such file or directory'),
        );
        mockLockFileRepository.read.mockResolvedValue({
          lockfileVersion: 1,
          packageSlugs: ['my-package'],
          agents: ['claude'],
          installedAt: '2026-03-17T00:00:00.000Z',
          cliVersion: '1.0.0',
          targetId: 'target-456',
          artifacts: {
            'my-skill': {
              name: 'My Skill',
              type: 'skill',
              id: 'artifact-skill-1',
              version: 1,
              spaceId: 'space-123',
              packageIds: ['pkg-1'],
              files: [
                { path: '.claude/skills/my-skill/SKILL.md', agent: 'claude' },
              ],
            },
          },
        });
      });

      it('stages as removed', async () => {
        await playbookAddHandler(
          buildDeps({ filePath: '.claude/skills/my-skill' }),
        );

        expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
          expect.objectContaining({
            changeType: 'removed',
            artifactName: 'My Skill',
            artifactType: 'skill',
            content: '',
          }),
        );
      });

      it('exits with 0', async () => {
        await playbookAddHandler(
          buildDeps({ filePath: '.claude/skills/my-skill' }),
        );

        expect(mockExit).toHaveBeenCalledWith(0);
      });
    });
  });

  describe('when creating an artifact with a name that already exists', () => {
    beforeEach(() => {
      (mockPackmindCliHexa.listCommands as jest.Mock).mockResolvedValue([
        {
          id: 'cmd-1',
          slug: 'my-command',
          name: 'My Command',
          spaceId: 'space-123',
        },
      ]);
    });

    it('logs error about existing artifact', async () => {
      const { logErrorConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookAddHandler(buildDeps());

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('already exists'),
      );
    });

    it('exits with 1', async () => {
      await playbookAddHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('calls listCommands with spaceId for space-scoped check', async () => {
      await playbookAddHandler(buildDeps());

      expect(mockPackmindCliHexa.listCommands).toHaveBeenCalledWith({
        spaceId: 'space-123',
      });
    });

    it('does not add to playbook', async () => {
      await playbookAddHandler(buildDeps());

      expect(mockPlaybookLocalRepository.addChange).not.toHaveBeenCalled();
    });
  });

  describe('when artifact with same name exists in a different space', () => {
    beforeEach(() => {
      (mockPackmindCliHexa.listCommands as jest.Mock).mockResolvedValue([]);
    });

    it('stages the artifact successfully', async () => {
      await playbookAddHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when creating an artifact with a name that differs in case', () => {
    beforeEach(() => {
      (mockPackmindCliHexa.listCommands as jest.Mock).mockResolvedValue([
        {
          id: 'cmd-1',
          slug: 'my-command',
          name: 'my command',
          spaceId: 'space-123',
        },
      ]);
    });

    it('exits with 1 (case-insensitive match)', async () => {
      await playbookAddHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when updating an existing artifact', () => {
    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['claude'],
        installedAt: '2026-03-17T00:00:00.000Z',
        cliVersion: '1.0.0',
        targetId: 'target-456',
        artifacts: {
          'my-command': {
            name: 'My Command',
            type: 'command',
            id: 'artifact-cmd-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: ['pkg-1'],
            files: [
              { path: '.claude/commands/my-command.md', agent: 'claude' },
            ],
          },
        },
      });
      mockGetContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            { path: '.claude/commands/my-command.md', content: 'old content' },
          ],
          delete: [],
        },
        skillFolders: [],
        targetId: 'target-456',
        resolvedAgents: [],
      });
    });

    it('does not call listCommands', async () => {
      await playbookAddHandler(buildDeps());

      expect(mockPackmindCliHexa.listCommands).not.toHaveBeenCalled();
    });

    it('does not call listSkills', async () => {
      await playbookAddHandler(buildDeps());

      expect(mockPackmindCliHexa.listSkills).not.toHaveBeenCalled();
    });

    it('does not call listStandards', async () => {
      await playbookAddHandler(buildDeps());

      expect(mockPackmindCliHexa.listStandards).not.toHaveBeenCalled();
    });
  });

  describe('when creating a skill with a name that already exists', () => {
    beforeEach(() => {
      (mockPackmindCliHexa.listSkills as jest.Mock).mockResolvedValue([
        {
          slug: 'my-skill',
          name: 'My Skill',
          description: 'desc',
          spaceId: 'space-123',
        },
      ]);
    });

    it('calls listSkills with spaceId for space-scoped check', async () => {
      mockReadSkillDirectory.mockResolvedValue([
        {
          path: '/project/.claude/skills/my-skill/SKILL.md',
          relativePath: 'SKILL.md',
          content: VALID_SKILL_MD_CONTENT,
          size: 100,
          permissions: '644',
          isBase64: false,
        },
      ]);

      await playbookAddHandler(
        buildDeps({ filePath: '.claude/skills/my-skill' }),
      );

      expect(mockPackmindCliHexa.listSkills).toHaveBeenCalledWith({
        spaceId: 'space-123',
      });
    });

    it('does not call listCommands', async () => {
      mockReadSkillDirectory.mockResolvedValue([
        {
          path: '/project/.claude/skills/my-skill/SKILL.md',
          relativePath: 'SKILL.md',
          content: VALID_SKILL_MD_CONTENT,
          size: 100,
          permissions: '644',
          isBase64: false,
        },
      ]);

      await playbookAddHandler(
        buildDeps({ filePath: '.claude/skills/my-skill' }),
      );

      expect(mockPackmindCliHexa.listCommands).not.toHaveBeenCalled();
    });

    it('exits with 1', async () => {
      mockReadSkillDirectory.mockResolvedValue([
        {
          path: '/project/.claude/skills/my-skill/SKILL.md',
          relativePath: 'SKILL.md',
          content: VALID_SKILL_MD_CONTENT,
          size: 100,
          permissions: '644',
          isBase64: false,
        },
      ]);

      await playbookAddHandler(
        buildDeps({ filePath: '.claude/skills/my-skill' }),
      );

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when creating a standard with a name that already exists', () => {
    beforeEach(() => {
      mockReadFile.mockReturnValue(VALID_STANDARD_CONTENT);
      (mockPackmindCliHexa.listStandards as jest.Mock).mockResolvedValue([
        {
          id: 'std-1',
          slug: 'my-standard',
          name: 'My Standard',
          description: '',
          spaceId: 'space-123',
        },
      ]);
    });

    it('calls listStandards with spaceId for space-scoped check', async () => {
      await playbookAddHandler(
        buildDeps({ filePath: '.packmind/standards/my-standard.md' }),
      );

      expect(mockPackmindCliHexa.listStandards).toHaveBeenCalledWith({
        spaceId: 'space-123',
      });
    });

    it('exits with 1', async () => {
      await playbookAddHandler(
        buildDeps({ filePath: '.packmind/standards/my-standard.md' }),
      );

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when list API fails during name uniqueness check', () => {
    beforeEach(() => {
      (mockPackmindCliHexa.listCommands as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );
    });

    it('logs error about failed check', async () => {
      const { logErrorConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookAddHandler(buildDeps());

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Failed to check'),
      );
    });

    it('exits with 1', async () => {
      await playbookAddHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
