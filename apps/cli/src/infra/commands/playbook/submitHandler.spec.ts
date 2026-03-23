import {
  playbookSubmitHandler,
  PlaybookSubmitHandlerDependencies,
} from './submitHandler';
import { PackmindCliHexa } from '../../../PackmindCliHexa';
import { IPlaybookLocalRepository } from '../../../domain/repositories/IPlaybookLocalRepository';
import { ILockFileRepository } from '../../../domain/repositories/ILockFileRepository';
import { PlaybookChangeEntry } from '../../../domain/repositories/IPlaybookLocalRepository';
import { createMockPackmindGateway } from '../../../mocks/createMockGateways';
import { ChangeProposalType, ChangeProposalCaptureMode } from '@packmind/types';

jest.mock('../../utils/consoleLogger', () => ({
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
  let mockPlaybookLocalRepository: jest.Mocked<IPlaybookLocalRepository>;
  let mockLockFileRepository: jest.Mocked<ILockFileRepository>;
  beforeEach(() => {
    mockGateway = createMockPackmindGateway();
    mockGateway.changeProposals.batchCreate.mockResolvedValue({
      created: 1,
      skipped: 0,
      errors: [],
    });

    mockGateway.deployment.getContentByVersions.mockResolvedValue({
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
      cwd: '/project',
      exit: mockExit,
      message: undefined,
      openEditor: mockOpenEditor,
      unlinkSync: jest.fn(),
      rmSync: jest.fn(),
      ...overrides,
    };
  }

  describe('when playbook is empty', () => {
    it('logs "Nothing to submit."', async () => {
      const { logConsole } = jest.requireMock('../../utils/consoleLogger');

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
        const { logErrorConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

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
        const { logErrorConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

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
        const { logErrorConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

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
                content: 'Do something useful',
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

      mockGateway.deployment.getContentByVersions.mockResolvedValue({
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

      mockGateway.deployment.getContentByVersions.mockResolvedValue({
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

  describe('updated skill', () => {
    const SKILL_CONTENT =
      'name: My Skill\ndescription: A useful skill\nprompt: Do something\n';

    beforeEach(() => {
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

      mockGateway.deployment.getContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content: 'old skill content',
              skillFileId: 'skill-file-id-99',
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
          filePath: '.claude/skills/my-skill',
          artifactType: 'skill',
          artifactName: 'My Skill',
          codingAgent: 'claude',
          changeType: 'updated',
          content: SKILL_CONTENT,
        }),
      ]);
    });

    it('uses skillFileId from deployed files as payload targetId', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'update skill' }));

      const batchCall =
        mockGateway.changeProposals.batchCreate.mock.calls[0][0];
      const skillProposal = batchCall.proposals.find(
        (p: { type: ChangeProposalType }) =>
          p.type === ChangeProposalType.updateSkillFileContent,
      );

      expect(skillProposal.payload.targetId).toBe('skill-file-id-99');
    });

    it('generates updateSkillFileContent proposal', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'update skill' }));

      const batchCall =
        mockGateway.changeProposals.batchCreate.mock.calls[0][0];
      const proposalTypes = batchCall.proposals.map(
        (p: { type: ChangeProposalType }) => p.type,
      );

      expect(proposalTypes).toContain(
        ChangeProposalType.updateSkillFileContent,
      );
    });
  });

  describe('updated skill without skillFileId in deployed files', () => {
    const SKILL_CONTENT =
      'name: My Skill\ndescription: A useful skill\nprompt: Do something\n';

    beforeEach(() => {
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

      mockGateway.deployment.getContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content: 'old skill content',
              // No skillFileId
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
          filePath: '.claude/skills/my-skill',
          artifactType: 'skill',
          artifactName: 'My Skill',
          codingAgent: 'claude',
          changeType: 'updated',
          content: SKILL_CONTENT,
        }),
      ]);
    });

    it('skips the proposal and warns', async () => {
      const { logWarningConsole } = jest.requireMock(
        '../../utils/consoleLogger',
      );

      await playbookSubmitHandler(buildDeps({ message: 'update skill' }));

      expect(logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('skill file ID not found'),
      );
    });

    it('does not submit proposals', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'update skill' }));

      expect(mockGateway.changeProposals.batchCreate).not.toHaveBeenCalled();
    });
  });

  describe('successful submit', () => {
    beforeEach(() => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([makeEntry()]);
    });

    it('removes submitted entries individually', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'submit' }));

      expect(mockPlaybookLocalRepository.removeChange).toHaveBeenCalledWith(
        '.packmind/standards/my-standard.md',
        'space-123',
      );
    });

    it('does not call clearAll', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'submit' }));

      expect(mockPlaybookLocalRepository.clearAll).not.toHaveBeenCalled();
    });

    it('logs success message', async () => {
      const { logSuccessConsole } = jest.requireMock(
        '../../utils/consoleLogger',
      );

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

    it('does not remove entries', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'submit' }));

      expect(mockPlaybookLocalRepository.removeChange).not.toHaveBeenCalled();
    });

    it('logs error', async () => {
      const { logErrorConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookSubmitHandler(buildDeps({ message: 'submit' }));

      expect(logErrorConsole).toHaveBeenCalled();
    });

    it('exits 1', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'submit' }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('partial failure across spaces', () => {
    beforeEach(() => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        makeEntry({ spaceId: 'space-A', artifactName: 'Std A' }),
        makeEntry({
          spaceId: 'space-B',
          artifactName: 'Std B',
          filePath: '.packmind/standards/std-b.md',
        }),
      ]);

      mockGateway.changeProposals.batchCreate
        .mockResolvedValueOnce({ created: 1, skipped: 0, errors: [] })
        .mockResolvedValueOnce({
          created: 0,
          skipped: 0,
          errors: [{ index: 0, message: 'Forbidden' }],
        });
    });

    it('removes the successful space entry', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'partial' }));

      expect(mockPlaybookLocalRepository.removeChange).toHaveBeenCalledWith(
        '.packmind/standards/my-standard.md',
        'space-A',
      );
    });

    it('removes only one entry', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'partial' }));

      expect(mockPlaybookLocalRepository.removeChange).toHaveBeenCalledTimes(1);
    });

    it('exits 1', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'partial' }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('updated standard without deployed content', () => {
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

      // Deployed content does NOT include the standard file
      mockGateway.deployment.getContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [],
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

    it('skips the entry entirely', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'update std' }));

      expect(mockGateway.changeProposals.batchCreate).not.toHaveBeenCalled();
    });

    it('warns about missing deployed content', async () => {
      const { logWarningConsole } = jest.requireMock(
        '../../utils/consoleLogger',
      );

      await playbookSubmitHandler(buildDeps({ message: 'update std' }));

      expect(logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('deployed content unavailable'),
      );
    });

    it('suggests running packmind pull', async () => {
      const { logWarningConsole } = jest.requireMock(
        '../../utils/consoleLogger',
      );

      await playbookSubmitHandler(buildDeps({ message: 'update std' }));

      expect(logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('packmind pull'),
      );
    });
  });

  describe('updated command without deployed content', () => {
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

      // Deployed content does NOT include the command file
      mockGateway.deployment.getContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [],
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

    it('skips the entry entirely', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'update cmd' }));

      expect(mockGateway.changeProposals.batchCreate).not.toHaveBeenCalled();
    });

    it('warns about missing deployed content', async () => {
      const { logWarningConsole } = jest.requireMock(
        '../../utils/consoleLogger',
      );

      await playbookSubmitHandler(buildDeps({ message: 'update cmd' }));

      expect(logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('deployed content unavailable'),
      );
    });

    it('suggests running packmind pull', async () => {
      const { logWarningConsole } = jest.requireMock(
        '../../utils/consoleLogger',
      );

      await playbookSubmitHandler(buildDeps({ message: 'update cmd' }));

      expect(logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('packmind pull'),
      );
    });
  });

  describe('when staged entries produce zero proposals', () => {
    beforeEach(() => {
      // Updated command whose content matches deployed — produces 0 proposals
      mockLockFileRepository.read.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['packmind'],
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
              {
                path: '.claude/commands/my-command.md',
                agent: 'claude',
              },
            ],
          },
        },
      });

      mockGateway.deployment.getContentByVersions.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/commands/my-command.md',
              content: COMMAND_CONTENT,
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
          artifactName: 'My Command',
          codingAgent: 'claude',
          changeType: 'updated',
          content: COMMAND_CONTENT,
        }),
      ]);
    });

    it('does not call batchCreate', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'no diff' }));

      expect(mockGateway.changeProposals.batchCreate).not.toHaveBeenCalled();
    });

    it('logs informative message', async () => {
      const { logConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookSubmitHandler(buildDeps({ message: 'no diff' }));

      expect(logConsole).toHaveBeenCalledWith(
        expect.stringContaining('no changes detected'),
      );
    });

    it('cleans up staged entries', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'no diff' }));

      expect(mockPlaybookLocalRepository.removeChange).toHaveBeenCalledWith(
        '.claude/commands/my-command.md',
        'space-123',
      );
    });

    it('exits 0', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'no diff' }));

      expect(mockExit).toHaveBeenCalledWith(0);
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

  describe('removed command', () => {
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

      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        makeEntry({
          filePath: '.claude/commands/my-command.md',
          artifactType: 'command',
          artifactName: 'My Command',
          codingAgent: 'claude',
          changeType: 'removed',
          content: '',
        }),
      ]);
    });

    it('generates removeCommand proposal', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'remove cmd' }));

      expect(mockGateway.changeProposals.batchCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          proposals: expect.arrayContaining([
            expect.objectContaining({
              type: ChangeProposalType.removeCommand,
              artefactId: 'artifact-cmd-1',
              payload: { packageIds: ['pkg-1'] },
            }),
          ]),
        }),
      );
    });

    it('deletes the local file after successful submit', async () => {
      const mockUnlinkSync = jest.fn();

      await playbookSubmitHandler(
        buildDeps({ message: 'remove cmd', unlinkSync: mockUnlinkSync }),
      );

      expect(mockUnlinkSync).toHaveBeenCalledWith(
        expect.stringContaining('.claude/commands/my-command.md'),
      );
    });

    it('removes staged entry after successful submit', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'remove cmd' }));

      expect(mockPlaybookLocalRepository.removeChange).toHaveBeenCalledWith(
        '.claude/commands/my-command.md',
        'space-123',
      );
    });

    it('exits 0', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'remove cmd' }));

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe('removed standard', () => {
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
            name: 'My Standard',
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

      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        makeEntry({
          changeType: 'removed',
          content: '',
        }),
      ]);
    });

    it('generates removeStandard proposal', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'remove std' }));

      expect(mockGateway.changeProposals.batchCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          proposals: expect.arrayContaining([
            expect.objectContaining({
              type: ChangeProposalType.removeStandard,
              artefactId: 'artifact-std-1',
              payload: { packageIds: ['pkg-1'] },
            }),
          ]),
        }),
      );
    });
  });

  describe('removed skill', () => {
    beforeEach(() => {
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

      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        makeEntry({
          filePath: '.claude/skills/my-skill',
          artifactType: 'skill',
          artifactName: 'My Skill',
          codingAgent: 'claude',
          changeType: 'removed',
          content: '',
        }),
      ]);
    });

    it('generates removeSkill proposal', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'remove skill' }));

      expect(mockGateway.changeProposals.batchCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          proposals: expect.arrayContaining([
            expect.objectContaining({
              type: ChangeProposalType.removeSkill,
              artefactId: 'artifact-skill-1',
              payload: { packageIds: ['pkg-1'] },
            }),
          ]),
        }),
      );
    });
  });

  describe('when space is not found for removed entries', () => {
    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['claude' as const],
        installedAt: '2026-03-17T00:00:00.000Z',
        targetId: 'target-456',
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
            ],
          },
        },
      });

      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        makeEntry({
          filePath: '.claude/skills/my-skill',
          artifactType: 'skill',
          artifactName: 'My Skill',
          codingAgent: 'claude',
          changeType: 'removed',
          spaceId: 'space-123',
          content: '',
        }),
      ]);

      mockGateway.changeProposals.batchCreate.mockResolvedValue({
        created: 0,
        skipped: 0,
        errors: [
          {
            index: 0,
            message: 'Space space-123 not found',
            code: 'SpaceNotFoundError',
          },
        ],
      });
    });

    it('cleans up local staged changes', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'remove skill' }));

      expect(mockPlaybookLocalRepository.removeChange).toHaveBeenCalledWith(
        '.claude/skills/my-skill',
        'space-123',
      );
    });

    it('deletes local skill directory for removed entries', async () => {
      const mockRmSync = jest.fn();

      await playbookSubmitHandler(
        buildDeps({ message: 'remove skill', rmSync: mockRmSync }),
      );

      expect(mockRmSync).toHaveBeenCalledWith(
        '/project/.claude/skills/my-skill',
        { recursive: true },
      );
    });

    it('exits with 0', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'remove skill' }));

      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('logs a warning about the missing space', async () => {
      const { logWarningConsole } = jest.requireMock(
        '../../utils/consoleLogger',
      );

      await playbookSubmitHandler(buildDeps({ message: 'remove skill' }));

      expect(logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('space-123'),
      );
    });
  });

  describe('when space is not found for non-removal entries', () => {
    beforeEach(() => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        makeEntry({ changeType: 'created' }),
      ]);

      mockGateway.changeProposals.batchCreate.mockResolvedValue({
        created: 0,
        skipped: 0,
        errors: [
          {
            index: 0,
            message: 'Space space-123 not found',
            code: 'SpaceNotFoundError',
          },
        ],
      });
    });

    it('does not clean up local staged changes', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'create std' }));

      expect(mockPlaybookLocalRepository.removeChange).not.toHaveBeenCalled();
    });

    it('exits with 1', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'create std' }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('logs the error', async () => {
      const { logErrorConsole } = jest.requireMock('../../utils/consoleLogger');

      await playbookSubmitHandler(buildDeps({ message: 'create std' }));

      expect(logErrorConsole).toHaveBeenCalledWith(
        expect.stringContaining('Space space-123 not found'),
      );
    });
  });

  describe('when space is not found for mixed removal and non-removal entries', () => {
    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['claude' as const],
        installedAt: '2026-03-17T00:00:00.000Z',
        targetId: 'target-456',
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
            ],
          },
        },
      });

      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        makeEntry({
          filePath: '.claude/skills/my-skill',
          artifactType: 'skill',
          artifactName: 'My Skill',
          codingAgent: 'claude',
          changeType: 'removed',
          spaceId: 'space-123',
          content: '',
        }),
        makeEntry({
          changeType: 'created',
          spaceId: 'space-123',
        }),
      ]);

      mockGateway.changeProposals.batchCreate.mockResolvedValue({
        created: 0,
        skipped: 0,
        errors: [
          {
            index: 0,
            message: 'Space space-123 not found',
            code: 'SpaceNotFoundError',
          },
        ],
      });
    });

    it('does not clean up local staged changes', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'mixed' }));

      expect(mockPlaybookLocalRepository.removeChange).not.toHaveBeenCalled();
    });

    it('exits with 1', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'mixed' }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('when errors include non-SpaceNotFoundError codes for removed entries', () => {
    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['claude' as const],
        installedAt: '2026-03-17T00:00:00.000Z',
        targetId: 'target-456',
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
            ],
          },
        },
      });

      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        makeEntry({
          filePath: '.claude/skills/my-skill',
          artifactType: 'skill',
          artifactName: 'My Skill',
          codingAgent: 'claude',
          changeType: 'removed',
          spaceId: 'space-123',
          content: '',
        }),
      ]);

      mockGateway.changeProposals.batchCreate.mockResolvedValue({
        created: 0,
        skipped: 0,
        errors: [
          {
            index: 0,
            message: 'Space space-123 not found',
            code: 'SpaceNotFoundError',
          },
          {
            index: 1,
            message: 'Validation failed',
            code: 'ValidationError',
          },
        ],
      });
    });

    it('does not clean up local staged changes', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'mixed errors' }));

      expect(mockPlaybookLocalRepository.removeChange).not.toHaveBeenCalled();
    });

    it('exits with 1', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'mixed errors' }));

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('removed entry not found in lock file', () => {
    beforeEach(() => {
      mockLockFileRepository.read.mockResolvedValue({
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['claude'],
        installedAt: '2026-03-17T00:00:00.000Z',
        cliVersion: '1.0.0',
        targetId: 'target-456',
        artifacts: {},
      });

      mockPlaybookLocalRepository.getChanges.mockReturnValue([
        makeEntry({
          filePath: '.claude/commands/missing.md',
          artifactType: 'command',
          artifactName: 'Missing',
          codingAgent: 'claude',
          changeType: 'removed',
          content: '',
        }),
      ]);
    });

    it('logs warning', async () => {
      const { logWarningConsole } = jest.requireMock(
        '../../utils/consoleLogger',
      );

      await playbookSubmitHandler(buildDeps({ message: 'remove missing' }));

      expect(logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('Missing'),
      );
    });

    it('does not call batchCreate', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'remove missing' }));

      expect(mockGateway.changeProposals.batchCreate).not.toHaveBeenCalled();
    });
  });
});
