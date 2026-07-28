import {
  stageSinglePath,
  StageSinglePathDependencies,
} from './stageSinglePath';
import { PackmindCliHexa } from '../../../../PackmindCliHexa';
import { IPlaybookLocalRepository } from '../../../../domain/repositories/IPlaybookLocalRepository';
import { ILockFileRepository } from '../../../../domain/repositories/ILockFileRepository';

jest.mock('../../../utils/consoleLogger', () => ({
  formatLabel: jest.fn((label: string) => label),
  logErrorConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logWarningConsole: jest.fn(),
}));

jest.mock('../../../../application/utils/parseLenientStandard');

const VALID_COMMAND_CONTENT = '---\nname: My Command\n---\nDo something useful';

describe('stageSinglePath', () => {
  let mockPackmindCliHexa: PackmindCliHexa;
  let mockReadFile: jest.Mock;
  let mockReadSkillDirectory: jest.Mock;
  let mockPlaybookLocalRepository: jest.Mocked<IPlaybookLocalRepository>;
  let mockLockFileRepository: jest.Mocked<ILockFileRepository>;

  beforeEach(() => {
    mockPackmindCliHexa = {
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
          getDeployed: jest.fn().mockResolvedValue({
            fileUpdates: { createOrUpdate: [], delete: [] },
            skillFolders: [],
            targetId: 'target-456',
            resolvedAgents: [],
          }),
          getContentByVersions: jest.fn().mockResolvedValue({
            fileUpdates: { createOrUpdate: [], delete: [] },
            skillFolders: [],
            targetId: 'target-456',
            resolvedAgents: [],
          }),
          getLatestVersion: jest.fn().mockResolvedValue({ version: 1 }),
        },
      }),
      listCommands: jest.fn().mockResolvedValue([]),
      listStandards: jest.fn().mockResolvedValue([]),
      listSkills: jest.fn().mockResolvedValue([]),
    } as unknown as PackmindCliHexa;

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
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function buildDeps(
    overrides: Partial<StageSinglePathDependencies> = {},
  ): StageSinglePathDependencies {
    return {
      packmindCliHexa: mockPackmindCliHexa,
      filePath: '.claude/commands/my-command.md',
      cwd: '/project',
      readFile: mockReadFile,
      readSkillDirectory: mockReadSkillDirectory,
      playbookLocalRepository: mockPlaybookLocalRepository,
      lockFileRepository: mockLockFileRepository,
      spaceSlug: undefined,
      ...overrides,
    };
  }

  describe('when the path is not a recognized artefact path', () => {
    it('returns a failed outcome instead of exiting', async () => {
      const outcome = await stageSinglePath(
        buildDeps({ filePath: 'does/not/exist.md' }),
      );

      expect(outcome.status).toBe('failed');
    });

    it('reports the offending path on the outcome', async () => {
      const outcome = await stageSinglePath(
        buildDeps({ filePath: 'does/not/exist.md' }),
      );

      expect(outcome.filePath).toBe('does/not/exist.md');
    });

    it('explains the failure on the outcome', async () => {
      const outcome = await stageSinglePath(
        buildDeps({ filePath: 'does/not/exist.md' }),
      );

      expect(outcome.message).toContain('Unsupported file path');
    });

    it('stages no change', async () => {
      await stageSinglePath(buildDeps({ filePath: 'does/not/exist.md' }));

      expect(mockPlaybookLocalRepository.addChange).not.toHaveBeenCalled();
    });
  });

  describe('when the path is a valid command file', () => {
    it('returns a staged outcome', async () => {
      const outcome = await stageSinglePath(buildDeps());

      expect(outcome.status).toBe('staged');
    });

    it('reports the resolved artifact type', async () => {
      const outcome = await stageSinglePath(buildDeps());

      expect(outcome.artifactType).toBe('command');
    });

    it('stages the change', async () => {
      await stageSinglePath(buildDeps());

      expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
        expect.objectContaining({
          artifactType: 'command',
          artifactName: 'My Command',
          changeType: 'created',
        }),
      );
    });
  });

  describe('when the file cannot be read and no lock file entry exists', () => {
    it('returns a failed outcome', async () => {
      mockReadFile.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const outcome = await stageSinglePath(buildDeps());

      expect(outcome.status).toBe('failed');
    });

    it('explains the read failure on the outcome', async () => {
      mockReadFile.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const outcome = await stageSinglePath(buildDeps());

      expect(outcome.message).toContain('Failed to read file');
    });
  });
});
