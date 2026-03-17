import {
  playbookSubmitHandler,
  PlaybookSubmitHandlerDependencies,
} from './playbookSubmitHandler';
import { PackmindCliHexa } from '../../PackmindCliHexa';
import { IPlaybookLocalRepository } from '../../domain/repositories/IPlaybookLocalRepository';
import { ILockFileRepository } from '../../domain/repositories/ILockFileRepository';
import { PlaybookChangeEntry } from '../../domain/repositories/IPlaybookLocalRepository';
import { createMockPackmindGateway } from '../../mocks/createMockGateways';
import { ChangeProposalType, ChangeProposalCaptureMode } from '@packmind/types';

jest.mock('../utils/consoleLogger', () => ({
  logConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logWarningConsole: jest.fn(),
}));

const STANDARD_CONTENT = [
  '# My Standard',
  '',
  'A description of the standard.',
  '',
  '## Rules',
  '',
  '* Do not use var',
  '* Always use const',
].join('\n');

const COMMAND_CONTENT = '---\nname: My Command\n---\nDo something useful';

function makeEntry(
  overrides: Partial<PlaybookChangeEntry> = {},
): PlaybookChangeEntry {
  return {
    filePath: '.packmind/standards/my-standard.md',
    artifactType: 'standard',
    artifactName: 'My Standard',
    codingAgent: 'packmind',
    changeType: 'created',
    addedAt: '2026-03-17T00:00:00.000Z',
    spaceId: 'space-123',
    targetId: 'target-456',
    content: STANDARD_CONTENT,
    ...overrides,
  };
}

describe('playbookSubmitHandler', () => {
  let mockGateway: ReturnType<typeof createMockPackmindGateway>;
  let mockPackmindCliHexa: PackmindCliHexa;
  let mockExit: jest.Mock;
  let mockOpenEditor: jest.Mock;
  let mockReadFile: jest.Mock;
  let mockPlaybookLocalRepository: jest.Mocked<IPlaybookLocalRepository>;
  let mockLockFileRepository: jest.Mocked<ILockFileRepository>;
  beforeEach(() => {
    mockGateway = createMockPackmindGateway();
    mockGateway.changeProposals.batchCreate.mockResolvedValue({
      created: 1,
      skipped: 0,
      errors: [],
    });

    mockGateway.deployment.getDeployed.mockResolvedValue({
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
      configExists: jest
        .fn()
        .mockImplementation((dir: string) =>
          Promise.resolve(dir === '/project'),
        ),
      readFullConfig: jest.fn().mockResolvedValue({
        packages: { 'my-package': '*' },
        agents: [],
      }),
      tryGetGitRepositoryRoot: jest.fn().mockResolvedValue('/project'),
      getGitRemoteUrlFromPath: jest
        .fn()
        .mockReturnValue('git@github.com:org/repo.git'),
      getCurrentBranch: jest.fn().mockReturnValue('main'),
      getPackmindGateway: () => mockGateway,
    } as unknown as PackmindCliHexa;

    mockExit = jest.fn();
    mockOpenEditor = jest.fn().mockReturnValue('My commit message');
    mockReadFile = jest.fn().mockReturnValue('');

    mockPlaybookLocalRepository = {
      addChange: jest.fn(),
      removeChange: jest.fn(),
      getChanges: jest.fn().mockReturnValue([]),
      getChange: jest.fn().mockReturnValue(null),
      clearAll: jest.fn(),
    };

    mockLockFileRepository = {
      read: jest.fn().mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['packmind'],
        installedAt: '2026-03-17T00:00:00.000Z',
        cliVersion: '1.0.0',
        targetId: 'target-456',
        artifacts: {},
      }),
      write: jest.fn(),
      delete: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function buildDeps(
    overrides: Partial<PlaybookSubmitHandlerDependencies> = {},
  ): PlaybookSubmitHandlerDependencies {
    return {
      packmindCliHexa: mockPackmindCliHexa,
      playbookLocalRepository: mockPlaybookLocalRepository,
      lockFileRepository: mockLockFileRepository,
      repoRoot: '/project',
      exit: mockExit,
      message: undefined,
      openEditor: mockOpenEditor,
      readFile: mockReadFile,
      ...overrides,
    };
  }

  describe('when playbook is empty', () => {
    it('logs "Nothing to submit."', async () => {
      const { logConsole } = jest.requireMock('../utils/consoleLogger');

      await playbookSubmitHandler(buildDeps());

      expect(logConsole).toHaveBeenCalledWith('Nothing to submit.');
    });

    it('exits 0', async () => {
      await playbookSubmitHandler(buildDeps());

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('message resolution', () => {
    describe('when message is provided via -m flag', () => {
      beforeEach(() => {
        mockPlaybookLocalRepository.getChanges.mockReturnValue([makeEntry()]);
      });

      it('does not open editor', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'Direct message' }));

        expect(mockOpenEditor).not.toHaveBeenCalled();
      });

      it('uses provided message in proposals', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'Direct message' }));

        expect(mockGateway.changeProposals.batchCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            proposals: expect.arrayContaining([
              expect.objectContaining({ message: 'Direct message' }),
            ]),
          }),
        );
      });
    });

    describe('when message is not provided', () => {
      it('calls openEditor with prefill containing changes', async () => {
        mockPlaybookLocalRepository.getChanges.mockReturnValue([
          makeEntry({ artifactName: 'My standard', changeType: 'updated' }),
        ]);

        await playbookSubmitHandler(buildDeps());

        expect(mockOpenEditor).toHaveBeenCalledWith(
          expect.stringContaining('Standard "My standard" updated'),
        );
      });

      it('uses editor result as message', async () => {
        mockPlaybookLocalRepository.getChanges.mockReturnValue([makeEntry()]);
        mockOpenEditor.mockReturnValue('Editor message');

        await playbookSubmitHandler(buildDeps());

        expect(mockGateway.changeProposals.batchCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            proposals: expect.arrayContaining([
              expect.objectContaining({ message: 'Editor message' }),
            ]),
          }),
        );
      });
    });

    describe('when editor returns empty string', () => {
      beforeEach(() => {
        mockPlaybookLocalRepository.getChanges.mockReturnValue([makeEntry()]);
        mockOpenEditor.mockReturnValue('');
      });

      it('logs abort message', async () => {
        const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

        await playbookSubmitHandler(buildDeps());

        expect(logErrorConsole).toHaveBeenCalledWith(
          'Aborting: empty message.',
        );
      });

      it('exits 1', async () => {
        await playbookSubmitHandler(buildDeps());

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when editor returns null', () => {
      beforeEach(() => {
        mockPlaybookLocalRepository.getChanges.mockReturnValue([makeEntry()]);
        mockOpenEditor.mockReturnValue(null);
      });

      it('logs abort message', async () => {
        const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

        await playbookSubmitHandler(buildDeps());

        expect(logErrorConsole).toHaveBeenCalledWith(
          'Aborting: empty message.',
        );
      });

      it('exits 1', async () => {
        await playbookSubmitHandler(buildDeps());

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when editor result contains only comment lines', () => {
      beforeEach(() => {
        mockPlaybookLocalRepository.getChanges.mockReturnValue([makeEntry()]);
        mockOpenEditor.mockReturnValue(
          '# This is a comment\n# Another comment',
        );
      });

      it('logs abort message', async () => {
        const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

        await playbookSubmitHandler(buildDeps());

        expect(logErrorConsole).toHaveBeenCalledWith(
          'Aborting: empty message.',
        );
      });

      it('exits 1', async () => {
        await playbookSubmitHandler(buildDeps());

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('created standard', () => {
    it('generates createStandard proposal with correct payload', async () => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        makeEntry({ changeType: 'created' }),
      ]);

      await playbookSubmitHandler(buildDeps({ message: 'create std' }));

      expect(mockGateway.changeProposals.batchCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: 'space-123',
          proposals: expect.arrayContaining([
            expect.objectContaining({
              type: ChangeProposalType.createStandard,
              artefactId: null,
              payload: {
                name: 'My Standard',
                description: 'A description of the standard.',
                scope: '',
                rules: [
                  { content: 'Do not use var' },
                  { content: 'Always use const' },
                ],
              },
              captureMode: ChangeProposalCaptureMode.commit,
              message: 'create std',
            }),
          ]),
        }),
      );
    });
  });

  describe('created command', () => {
    it('generates createCommand proposal with correct payload', async () => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        makeEntry({
          filePath: '.claude/commands/my-command.md',
          artifactType: 'command',
          artifactName: 'My Command',
          codingAgent: 'claude',
          changeType: 'created',
          content: COMMAND_CONTENT,
        }),
      ]);

      await playbookSubmitHandler(buildDeps({ message: 'create cmd' }));

      expect(mockGateway.changeProposals.batchCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          proposals: expect.arrayContaining([
            expect.objectContaining({
              type: ChangeProposalType.createCommand,
              artefactId: null,
              payload: {
                name: 'My Command',
                content: COMMAND_CONTENT,
              },
            }),
          ]),
        }),
      );
    });
  });

  describe('updated standard', () => {
    const DEPLOYED_STANDARD_CONTENT = [
      '# Old Standard Name',
      '',
      'Old description.',
      '',
      '## Rules',
      '',
      '* Do not use var',
      '* Use semicolons',
    ].join('\n');

    const LOCAL_STANDARD_CONTENT = [
      '# New Standard Name',
      '',
      'New description.',
      '',
      '## Rules',
      '',
      '* Do not use var',
      '* Always use const',
    ].join('\n');

    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['packmind'],
        installedAt: '2026-03-17T00:00:00.000Z',
        cliVersion: '1.0.0',
        targetId: 'target-456',
        artifacts: {
          'my-standard': {
            name: 'Old Standard Name',
            type: 'standard',
            id: 'artifact-std-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: ['pkg-1'],
            files: [
              {
                path: '.packmind/standards/my-standard.md',
                agent: 'packmind',
              },
            ],
          },
        },
      });

      mockGateway.deployment.getDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.packmind/standards/my-standard.md',
              content: DEPLOYED_STANDARD_CONTENT,
            },
          ],
          delete: [],
        },
        skillFolders: [],
        targetId: 'target-456',
        resolvedAgents: [],
      });

      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        makeEntry({
          changeType: 'updated',
          content: LOCAL_STANDARD_CONTENT,
          artifactName: 'New Standard Name',
        }),
      ]);
    });

    it('generates updateStandardName proposal', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'update std' }));

      const batchCall =
        mockGateway.changeProposals.batchCreate.mock.calls[0][0];
      const proposalTypes = batchCall.proposals.map(
        (p: { type: ChangeProposalType }) => p.type,
      );

      expect(proposalTypes).toContain(ChangeProposalType.updateStandardName);
    });

    it('generates updateStandardDescription proposal', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'update std' }));

      const batchCall =
        mockGateway.changeProposals.batchCreate.mock.calls[0][0];
      const proposalTypes = batchCall.proposals.map(
        (p: { type: ChangeProposalType }) => p.type,
      );

      expect(proposalTypes).toContain(
        ChangeProposalType.updateStandardDescription,
      );
    });
  });

  describe('updated command', () => {
    const DEPLOYED_COMMAND_CONTENT =
      '---\nname: Old Command\n---\nOld description';
    const LOCAL_COMMAND_CONTENT =
      '---\nname: New Command\n---\nNew description';

    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['packmind'],
        installedAt: '2026-03-17T00:00:00.000Z',
        cliVersion: '1.0.0',
        targetId: 'target-456',
        artifacts: {
          'my-command': {
            name: 'Old Command',
            type: 'command',
            id: 'artifact-cmd-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: ['pkg-1'],
            files: [
              {
                path: '.claude/commands/my-command.md',
                agent: 'claude',
              },
            ],
          },
        },
      });

      mockGateway.deployment.getDeployed.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/commands/my-command.md',
              content: DEPLOYED_COMMAND_CONTENT,
            },
          ],
          delete: [],
        },
        skillFolders: [],
        targetId: 'target-456',
        resolvedAgents: [],
      });

      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        makeEntry({
          filePath: '.claude/commands/my-command.md',
          artifactType: 'command',
          artifactName: 'New Command',
          codingAgent: 'claude',
          changeType: 'updated',
          content: LOCAL_COMMAND_CONTENT,
        }),
      ]);
    });

    it('generates updateCommandName proposal', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'update cmd' }));

      const batchCall =
        mockGateway.changeProposals.batchCreate.mock.calls[0][0];
      const proposalTypes = batchCall.proposals.map(
        (p: { type: ChangeProposalType }) => p.type,
      );

      expect(proposalTypes).toContain(ChangeProposalType.updateCommandName);
    });

    it('generates updateCommandDescription proposal', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'update cmd' }));

      const batchCall =
        mockGateway.changeProposals.batchCreate.mock.calls[0][0];
      const proposalTypes = batchCall.proposals.map(
        (p: { type: ChangeProposalType }) => p.type,
      );

      expect(proposalTypes).toContain(
        ChangeProposalType.updateCommandDescription,
      );
    });
  });

  describe('successful submit', () => {
    beforeEach(() => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([makeEntry()]);
    });

    it('calls clearAll', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'submit' }));

      expect(mockPlaybookLocalRepository.clearAll).toHaveBeenCalled();
    });

    it('logs success message', async () => {
      const { logSuccessConsole } = jest.requireMock('../utils/consoleLogger');

      await playbookSubmitHandler(buildDeps({ message: 'submit' }));

      expect(logSuccessConsole).toHaveBeenCalledWith(
        expect.stringContaining('Submitted'),
      );
    });

    it('exits 0', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'submit' }));

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('failed submit with gateway errors', () => {
    beforeEach(() => {
      mockGateway.changeProposals.batchCreate.mockResolvedValue({
        created: 0,
        skipped: 0,
        errors: [{ index: 0, message: 'Server error' }],
      });
      mockPlaybookLocalRepository.getChanges.mockReturnValue([makeEntry()]);
    });

    it('does NOT clear playbook', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'submit' }));

      expect(mockPlaybookLocalRepository.clearAll).not.toHaveBeenCalled();
    });

    it('logs error', async () => {
      const { logErrorConsole } = jest.requireMock('../utils/consoleLogger');

      await playbookSubmitHandler(buildDeps({ message: 'submit' }));

      expect(logErrorConsole).toHaveBeenCalled();
    });

    it('exits 1', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'submit' }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('groups proposals by spaceId', () => {
    it('calls batchCreate once per space', async () => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        makeEntry({ spaceId: 'space-A', artifactName: 'Std A' }),
        makeEntry({
          spaceId: 'space-B',
          artifactName: 'Std B',
          filePath: '.packmind/standards/std-b.md',
        }),
      ]);

      await playbookSubmitHandler(buildDeps({ message: 'multi-space' }));

      expect(mockGateway.changeProposals.batchCreate).toHaveBeenCalledTimes(2);
    });
  });
});
