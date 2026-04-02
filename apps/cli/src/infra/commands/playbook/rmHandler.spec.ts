import { playbookRmHandler, PlaybookRmHandlerDependencies } from './rmHandler';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { IPlaybookLocalRepository } from '../../../domain/repositories/IPlaybookLocalRepository';
import { ILockFileRepository } from '../../../domain/repositories/ILockFileRepository';
import { PackmindLockFile } from '../../../domain/repositories/PackmindLockFile';

jest.mock('../../utils/consoleLogger', () => ({
  formatLabel: jest.fn((label: string) => label),
  logErrorConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
}));

jest.mock('../../../application/utils/resolveDeployedContext', () => ({
  resolveDeployedContext: jest.fn().mockResolvedValue({
    targetId: 'deployed-target-789',
  }),
}));

const LOCK_FILE_WITH_COMMAND = {
  lockfileVersion: 1,
  packageSlugs: ['my-package'],
  agents: ['claude' as const],
  installedAt: '2026-03-17T00:00:00.000Z',
  targetId: 'target-456',
  artifacts: {
    'my-command': {
      name: 'My Command',
      type: 'command' as const,
      id: 'artifact-cmd-1',
      version: 1,
      spaceId: 'space-123',
      packageIds: ['pkg-1'],
      files: [
        {
          path: '.claude/commands/my-command.md',
          agent: 'claude' as const,
        },
      ],
    },
  },
} satisfies PackmindLockFile;

const LOCK_FILE_WITH_STANDARD = {
  ...LOCK_FILE_WITH_COMMAND,
  artifacts: {
    'my-standard': {
      name: 'My Standard',
      type: 'standard' as const,
      id: 'artifact-std-1',
      version: 1,
      spaceId: 'space-123',
      packageIds: ['pkg-1'],
      files: [
        {
          path: '.packmind/standards/my-standard.md',
          agent: 'packmind' as const,
        },
      ],
    },
  },
} satisfies PackmindLockFile;

const LOCK_FILE_WITH_SKILL = {
  ...LOCK_FILE_WITH_COMMAND,
  artifacts: {
    'my-skill': {
      name: 'My Skill',
      type: 'skill' as const,
      id: 'artifact-skill-1',
      version: 1,
      spaceId: 'space-123',
      packageIds: ['pkg-1'],
      files: [
        {
          path: '.claude/skills/my-skill/SKILL.md',
          agent: 'claude' as const,
        },
        {
          path: '.claude/skills/my-skill/support/helper.py',
          agent: 'claude' as const,
        },
      ],
    },
  },
} satisfies PackmindLockFile;

describe('playbookRmHandler', () => {
  let mockPackmindCliHexa: PackmindCliHexa;
  let mockExit: jest.Mock;
  let mockGetCwd: jest.Mock;
  let mockPlaybookLocalRepository: jest.Mocked<IPlaybookLocalRepository>;
  let mockLockFileRepository: jest.Mocked<ILockFileRepository>;

  beforeEach(() => {
    mockPackmindCliHexa = {
      configExists: jest
        .fn()
        .mockImplementation((dir: string) =>
          Promise.resolve(dir === '/project'),
        ),
      readFullConfig: jest.fn().mockResolvedValue({
        packages: { 'my-package': '*' },
        agents: [],
      }),
      getSpaces: jest
        .fn()
        .mockResolvedValue([
          { id: 'space-123', name: 'My Space', slug: 'my-space' },
        ]),
      tryGetGitRepositoryRoot: jest.fn().mockResolvedValue('/project'),
    } as unknown as PackmindCliHexa;

    mockExit = jest.fn();
    mockGetCwd = jest.fn().mockReturnValue('/project');

    mockPlaybookLocalRepository = {
      addChange: jest.fn(),
      removeChange: jest.fn(),
      getChanges: jest.fn().mockReturnValue([]),
      getChange: jest.fn().mockReturnValue(null),
      clearAll: jest.fn(),
    };

    mockLockFileRepository = {
      read: jest.fn().mockResolvedValue(LOCK_FILE_WITH_COMMAND),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function buildDeps(
    overrides: Partial<PlaybookRmHandlerDependencies> = {},
  ): PlaybookRmHandlerDependencies {
    return {
      packmindCliHexa: mockPackmindCliHexa,
      filePath: '.claude/commands/my-command.md',
      exit: mockExit,
      getCwd: mockGetCwd,
      playbookLocalRepository: mockPlaybookLocalRepository,
      lockFileRepository: mockLockFileRepository,
      ...overrides,
    };
  }

  describe('when filePath is missing', () => {
    it('logs error', async () => {
      const { logErrorConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookRmHandler(buildDeps({ filePath: undefined }));

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Missing file path'),
      );
    });

    it('exits with 1', async () => {
      await playbookRmHandler(buildDeps({ filePath: undefined }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not stage anything', async () => {
      await playbookRmHandler(buildDeps({ filePath: undefined }));

      expect(mockPlaybookLocalRepository.addChange).not.toHaveBeenCalled();
    });
  });

  describe('when file path is unsupported', () => {
    it('logs error', async () => {
      const { logErrorConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookRmHandler(buildDeps({ filePath: 'src/index.ts' }));

      expect(logErrorConsole).toHaveBeenCalledWith(
        'This file was not distributed using packmind',
      );
    });

    it('exits with 1', async () => {
      await playbookRmHandler(buildDeps({ filePath: 'src/index.ts' }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not stage anything', async () => {
      await playbookRmHandler(buildDeps({ filePath: 'src/index.ts' }));

      expect(mockPlaybookLocalRepository.addChange).not.toHaveBeenCalled();
    });
  });

  describe('when file is not in lock file', () => {
    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue({
        ...LOCK_FILE_WITH_COMMAND,
        artifacts: {},
      });
    });

    it('logs error about non-packmind file', async () => {
      const { logErrorConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookRmHandler(buildDeps());

      expect(logErrorConsole).toHaveBeenCalledWith(
        'This file was not distributed using packmind',
      );
    });

    it('exits with 1', async () => {
      await playbookRmHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not stage anything', async () => {
      await playbookRmHandler(buildDeps());

      expect(mockPlaybookLocalRepository.addChange).not.toHaveBeenCalled();
    });
  });

  describe('when lock file is null', () => {
    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue(null);
    });

    it('logs error about non-packmind file', async () => {
      const { logErrorConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookRmHandler(buildDeps());

      expect(logErrorConsole).toHaveBeenCalledWith(
        'This file was not distributed using packmind',
      );
    });

    it('exits with 1', async () => {
      await playbookRmHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when removing a command', () => {
    it('stages a removed entry', async () => {
      await playbookRmHandler(buildDeps());

      expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: '.claude/commands/my-command.md',
          artifactType: 'command',
          artifactName: 'My Command',
          changeType: 'removed',
          content: '',
          spaceId: 'space-123',
          configDir: '',
          targetId: 'deployed-target-789',
        }),
      );
    });

    it('exits with 0', async () => {
      await playbookRmHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('logs success', async () => {
      const { logSuccessConsole } = jest.requireMock(
        '../../utils/consoleLogger',
      );

      await playbookRmHandler(buildDeps());

      expect(logSuccessConsole).toHaveBeenCalledWith(
        expect.stringContaining('My Command'),
      );
    });
  });

  describe('when removing a standard', () => {
    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue(LOCK_FILE_WITH_STANDARD);
    });

    it('stages a removed entry', async () => {
      await playbookRmHandler(
        buildDeps({ filePath: '.packmind/standards/my-standard.md' }),
      );

      expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: '.packmind/standards/my-standard.md',
          artifactType: 'standard',
          artifactName: 'My Standard',
          changeType: 'removed',
        }),
      );
    });

    it('exits with 0', async () => {
      await playbookRmHandler(
        buildDeps({ filePath: '.packmind/standards/my-standard.md' }),
      );

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when removing a skill by folder path', () => {
    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue(LOCK_FILE_WITH_SKILL);
    });

    it('stages a removed entry', async () => {
      await playbookRmHandler(
        buildDeps({ filePath: '.claude/skills/my-skill' }),
      );

      expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: '.claude/skills/my-skill',
          artifactType: 'skill',
          artifactName: 'My Skill',
          changeType: 'removed',
        }),
      );
    });

    it('exits with 0', async () => {
      await playbookRmHandler(
        buildDeps({ filePath: '.claude/skills/my-skill' }),
      );

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when removing a skill by SKILL.md path', () => {
    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue(LOCK_FILE_WITH_SKILL);
    });

    it('stages a removed entry with directory path', async () => {
      await playbookRmHandler(
        buildDeps({ filePath: '.claude/skills/my-skill/SKILL.md' }),
      );

      expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: '.claude/skills/my-skill',
          artifactType: 'skill',
          artifactName: 'My Skill',
          changeType: 'removed',
        }),
      );
    });

    it('exits with 0', async () => {
      await playbookRmHandler(
        buildDeps({ filePath: '.claude/skills/my-skill/SKILL.md' }),
      );

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('when pointing to a skill support file', () => {
    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue(LOCK_FILE_WITH_SKILL);
    });

    it('logs error with guidance', async () => {
      const { logErrorConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookRmHandler(
        buildDeps({
          filePath: '.claude/skills/my-skill/support/helper.py',
        }),
      );

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('skill folder'),
      );
    });

    it('exits with 1', async () => {
      await playbookRmHandler(
        buildDeps({
          filePath: '.claude/skills/my-skill/support/helper.py',
        }),
      );

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not stage anything', async () => {
      await playbookRmHandler(
        buildDeps({
          filePath: '.claude/skills/my-skill/support/helper.py',
        }),
      );

      expect(mockPlaybookLocalRepository.addChange).not.toHaveBeenCalled();
    });
  });

  describe('when the artifact belongs to an inaccessible space', () => {
    beforeEach(() => {
      (mockPackmindCliHexa.getSpaces as jest.Mock).mockResolvedValue([]);
    });

    it('logs an error with the artifact type', async () => {
      const { logErrorConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookRmHandler(buildDeps());

      expect(logErrorConsole).toHaveBeenCalledWith(
        'Cannot remove this command: the space it belongs to is not available to you',
      );
    });

    it('exits with 1', async () => {
      await playbookRmHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('does not stage anything', async () => {
      await playbookRmHandler(buildDeps());

      expect(mockPlaybookLocalRepository.addChange).not.toHaveBeenCalled();
    });
  });

  describe('when resolveDeployedContext returns null', () => {
    beforeEach(() => {
      const { resolveDeployedContext } = jest.requireMock(
        '../../../application/utils/resolveDeployedContext',
      );
      resolveDeployedContext.mockResolvedValue(null);
    });

    it('falls back to lockFile.targetId', async () => {
      await playbookRmHandler(buildDeps());

      expect(mockPlaybookLocalRepository.addChange).toHaveBeenCalledWith(
        expect.objectContaining({
          targetId: 'target-456',
          configDir: '',
        }),
      );
    });
  });

  describe('when artifact is already staged for removal', () => {
    beforeEach(() => {
      mockPlaybookLocalRepository.getChange.mockReturnValue({
        filePath: '.claude/commands/my-command.md',
        artifactType: 'command',
        artifactName: 'My Command',
        codingAgent: 'claude',
        changeType: 'removed',
        content: '',
        spaceId: 'space-123',
        addedAt: '2026-03-24T00:00:00.000Z',
      });
    });

    it('logs already staged message', async () => {
      const { logSuccessConsole } = jest.requireMock(
        '../../utils/consoleLogger',
      );

      await playbookRmHandler(buildDeps());

      expect(logSuccessConsole).toHaveBeenCalledWith(
        '"My Command" is already staged for removal.',
      );
    });

    it('does not call addChange', async () => {
      await playbookRmHandler(buildDeps());

      expect(mockPlaybookLocalRepository.addChange).not.toHaveBeenCalled();
    });

    it('exits with 0', async () => {
      await playbookRmHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });
});
