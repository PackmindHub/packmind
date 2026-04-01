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
import { CommunityEditionError } from '../../../domain/errors/CommunityEditionError';

jest.mock('../../utils/consoleLogger', () => ({
  logConsole: jest.fn(),
  logErrorConsole: jest.fn(),
  logInfoConsole: jest.fn(),
  logSuccessConsole: jest.fn(),
  logWarningConsole: jest.fn(),
  formatCommand: (text: string) => text,
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
      getSpaces: jest
        .fn()
        .mockResolvedValue([
          { id: 'space-123', slug: 'global', name: 'Global' },
        ]),
      listPackages: jest.fn().mockResolvedValue([
        {
          id: 'pkg-1',
          slug: 'my-package',
          name: 'My Package',
          spaceId: 'space-123',
        },
      ]),
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
      noReview: false,
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

    describe('when entry has no targetId but lock file does', () => {
      it('uses the lock file targetId as fallback', async () => {
        mockPlaybookLocalRepository.getChanges.mockReturnValue([
          makeEntry({ changeType: 'created', targetId: undefined }),
        ]);

        await playbookSubmitHandler(buildDeps({ message: 'create std' }));

        expect(mockGateway.changeProposals.batchCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            proposals: expect.arrayContaining([
              expect.objectContaining({
                targetId: 'target-456',
              }),
            ]),
          }),
        );
      });
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
    const DEPLOYED_SKILL_MD = [
      '---',
      'name: My Skill',
      'description: An old description',
      '---',
      'Do something old',
    ].join('\n');

    const SKILL_CONTENT =
      'name: My Skill\ndescription: A useful skill\nprompt: Do something new\n';

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
              content: DEPLOYED_SKILL_MD,
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

    describe('when description changed', () => {
      it('generates updateSkillDescription proposal', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'update skill' }));

        const batchCall =
          mockGateway.changeProposals.batchCreate.mock.calls[0][0];
        const proposalTypes = batchCall.proposals.map(
          (p: { type: ChangeProposalType }) => p.type,
        );

        expect(proposalTypes).toContain(
          ChangeProposalType.updateSkillDescription,
        );
      });
    });

    describe('when prompt changed', () => {
      it('generates updateSkillPrompt proposal', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'update skill' }));

        const batchCall =
          mockGateway.changeProposals.batchCreate.mock.calls[0][0];
        const proposalTypes = batchCall.proposals.map(
          (p: { type: ChangeProposalType }) => p.type,
        );

        expect(proposalTypes).toContain(ChangeProposalType.updateSkillPrompt);
      });
    });

    describe('when name is unchanged', () => {
      it('does not generate updateSkillName proposal', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'update skill' }));

        const batchCall =
          mockGateway.changeProposals.batchCreate.mock.calls[0][0];
        const proposalTypes = batchCall.proposals.map(
          (p: { type: ChangeProposalType }) => p.type,
        );

        expect(proposalTypes).not.toContain(ChangeProposalType.updateSkillName);
      });
    });

    it('includes old and new values in description proposal', async () => {
      await playbookSubmitHandler(buildDeps({ message: 'update skill' }));

      const batchCall =
        mockGateway.changeProposals.batchCreate.mock.calls[0][0];
      const descProposal = batchCall.proposals.find(
        (p: { type: ChangeProposalType }) =>
          p.type === ChangeProposalType.updateSkillDescription,
      );

      expect(descProposal.payload).toEqual({
        oldValue: 'An old description',
        newValue: 'A useful skill',
      });
    });
  });

  describe('updated skill with license and compatibility changes', () => {
    const DEPLOYED_SKILL_MD = [
      '---',
      'name: My Skill',
      'description: A useful skill',
      'license: MIT',
      'compatibility: claude-code >= 1.0',
      'allowed-tools: Read,Write',
      '---',
      'Do something',
    ].join('\n');

    const SKILL_CONTENT =
      'name: My Skill\ndescription: A useful skill\nprompt: Do something\nlicense: Apache-2.0\ncompatibility: claude-code >= 2.0\nallowedTools: Read,Write,Edit\n';

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
              content: DEPLOYED_SKILL_MD,
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

    describe('when license changed', () => {
      it('generates updateSkillLicense proposal', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'update skill' }));

        const batchCall =
          mockGateway.changeProposals.batchCreate.mock.calls[0][0];
        const proposal = batchCall.proposals.find(
          (p: { type: ChangeProposalType }) =>
            p.type === ChangeProposalType.updateSkillLicense,
        );

        expect(proposal.payload).toEqual({
          oldValue: 'MIT',
          newValue: 'Apache-2.0',
        });
      });
    });

    describe('when compatibility changed', () => {
      it('generates updateSkillCompatibility proposal', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'update skill' }));

        const batchCall =
          mockGateway.changeProposals.batchCreate.mock.calls[0][0];
        const proposal = batchCall.proposals.find(
          (p: { type: ChangeProposalType }) =>
            p.type === ChangeProposalType.updateSkillCompatibility,
        );

        expect(proposal.payload).toEqual({
          oldValue: 'claude-code >= 1.0',
          newValue: 'claude-code >= 2.0',
        });
      });
    });

    describe('when allowedTools changed', () => {
      it('generates updateSkillAllowedTools proposal', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'update skill' }));

        const batchCall =
          mockGateway.changeProposals.batchCreate.mock.calls[0][0];
        const proposal = batchCall.proposals.find(
          (p: { type: ChangeProposalType }) =>
            p.type === ChangeProposalType.updateSkillAllowedTools,
        );

        expect(proposal.payload).toEqual({
          oldValue: 'Read,Write',
          newValue: 'Read,Write,Edit',
        });
      });
    });

    describe('updated skill with unparseable deployed SKILL.md', () => {
      const SKILL_CONTENT =
        'name: My Skill\ndescription: A useful skill\nprompt: Do something new\n';

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
                content: 'not valid frontmatter content',
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

      it('falls back to updateSkillPrompt with empty oldValue', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'update skill' }));

        const batchCall =
          mockGateway.changeProposals.batchCreate.mock.calls[0][0];
        const proposal = batchCall.proposals.find(
          (p: { type: ChangeProposalType }) =>
            p.type === ChangeProposalType.updateSkillPrompt,
        );

        expect(proposal.payload).toEqual({
          oldValue: '',
          newValue: 'Do something new',
        });
      });
    });

    describe('updated skill with helper files', () => {
      const DEPLOYED_SKILL_MD = [
        '---',
        'name: My Skill',
        'description: A useful skill',
        '---',
        'Do something',
      ].join('\n');

      const SKILL_CONTENT =
        'name: My Skill\ndescription: A useful skill\nprompt: Do something\nfiles:\n  - path: helper.ts\n    content: new content\n    permissions: rw-r--r--\n    isBase64: false\n';

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
                { path: '.claude/skills/my-skill/helper.ts', agent: 'claude' },
              ],
            },
          },
        });

        mockGateway.deployment.getContentByVersions.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.claude/skills/my-skill/SKILL.md',
                content: DEPLOYED_SKILL_MD,
              },
              {
                path: '.claude/skills/my-skill/helper.ts',
                content: 'old content',
                skillFileId: 'helper-file-id',
                skillFilePermissions: 'rw-r--r--',
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

      it('uses deployed skillFileId as targetId for helper file proposal', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'update skill' }));

        const batchCall =
          mockGateway.changeProposals.batchCreate.mock.calls[0][0];
        const fileProposal = batchCall.proposals.find(
          (p: { type: ChangeProposalType }) =>
            p.type === ChangeProposalType.updateSkillFileContent,
        );

        expect(fileProposal.payload.targetId).toBe('helper-file-id');
      });

      it('includes old and new content in helper file proposal', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'update skill' }));

        const batchCall =
          mockGateway.changeProposals.batchCreate.mock.calls[0][0];
        const fileProposal = batchCall.proposals.find(
          (p: { type: ChangeProposalType }) =>
            p.type === ChangeProposalType.updateSkillFileContent,
        );

        expect(fileProposal.payload).toEqual({
          targetId: 'helper-file-id',
          oldValue: 'old content',
          newValue: 'new content',
          isBase64: false,
        });
      });
    });

    describe('updated skill with deleted helper file', () => {
      const DEPLOYED_SKILL_MD = [
        '---',
        'name: My Skill',
        'description: A useful skill',
        '---',
        'Do something',
      ].join('\n');

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
                { path: '.claude/skills/my-skill/helper.ts', agent: 'claude' },
              ],
            },
          },
        });

        mockGateway.deployment.getContentByVersions.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.claude/skills/my-skill/SKILL.md',
                content: DEPLOYED_SKILL_MD,
              },
              {
                path: '.claude/skills/my-skill/helper.ts',
                content: 'old helper content',
                skillFileId: 'helper-file-id',
                skillFilePermissions: 'rw-r--r--',
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

      it('generates deleteSkillFile proposal for removed helper file', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'update skill' }));

        const batchCall =
          mockGateway.changeProposals.batchCreate.mock.calls[0][0];
        const deleteProposal = batchCall.proposals.find(
          (p: { type: ChangeProposalType }) =>
            p.type === ChangeProposalType.deleteSkillFile,
        );

        expect(deleteProposal.payload.targetId).toBe('helper-file-id');
      });
    });

    describe('updated skill with new helper file', () => {
      const DEPLOYED_SKILL_MD = [
        '---',
        'name: My Skill',
        'description: A useful skill',
        '---',
        'Do something',
      ].join('\n');

      const SKILL_CONTENT =
        'name: My Skill\ndescription: A useful skill\nprompt: Do something\nfiles:\n  - path: newfile.ts\n    content: new file content\n    permissions: rw-r--r--\n    isBase64: false\n';

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
                content: DEPLOYED_SKILL_MD,
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

      it('generates addSkillFile proposal for new helper file', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'update skill' }));

        const batchCall =
          mockGateway.changeProposals.batchCreate.mock.calls[0][0];
        const addProposal = batchCall.proposals.find(
          (p: { type: ChangeProposalType }) =>
            p.type === ChangeProposalType.addSkillFile,
        );

        expect(addProposal.payload.item).toEqual({
          path: 'newfile.ts',
          content: 'new file content',
          permissions: 'rw-r--r--',
          isBase64: false,
        });
      });
    });

    describe('updated skill with unchanged helper file', () => {
      const DEPLOYED_SKILL_MD = [
        '---',
        'name: My Skill',
        'description: A useful skill',
        '---',
        'Do something',
      ].join('\n');

      const SKILL_CONTENT =
        'name: My Skill\ndescription: A useful skill\nprompt: Do something\nfiles:\n  - path: helper.ts\n    content: same content\n    permissions: rw-r--r--\n    isBase64: false\n';

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
                { path: '.claude/skills/my-skill/helper.ts', agent: 'claude' },
              ],
            },
          },
        });

        mockGateway.deployment.getContentByVersions.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.claude/skills/my-skill/SKILL.md',
                content: DEPLOYED_SKILL_MD,
              },
              {
                path: '.claude/skills/my-skill/helper.ts',
                content: 'same content',
                skillFileId: 'helper-file-id',
                skillFilePermissions: 'rw-r--r--',
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

      it('does not generate updateSkillFileContent for unchanged helper file', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'update skill' }));

        // When all content is unchanged, no proposals are generated and batchCreate is not called
        expect(mockGateway.changeProposals.batchCreate).not.toHaveBeenCalled();
      });
    });

    describe('updated skill with changed helper file permissions', () => {
      const DEPLOYED_SKILL_MD = [
        '---',
        'name: My Skill',
        'description: A useful skill',
        '---',
        'Do something',
      ].join('\n');

      const SKILL_CONTENT =
        'name: My Skill\ndescription: A useful skill\nprompt: Do something\nfiles:\n  - path: helper.ts\n    content: same content\n    permissions: rwxr-xr-x\n    isBase64: false\n';

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
                { path: '.claude/skills/my-skill/helper.ts', agent: 'claude' },
              ],
            },
          },
        });

        mockGateway.deployment.getContentByVersions.mockResolvedValue({
          fileUpdates: {
            createOrUpdate: [
              {
                path: '.claude/skills/my-skill/SKILL.md',
                content: DEPLOYED_SKILL_MD,
              },
              {
                path: '.claude/skills/my-skill/helper.ts',
                content: 'same content',
                skillFileId: 'helper-file-id',
                skillFilePermissions: 'rw-r--r--',
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

      describe('generates updateSkillFilePermissions proposal', () => {
        let permProposal: { type: ChangeProposalType; payload: unknown };

        beforeEach(async () => {
          await playbookSubmitHandler(buildDeps({ message: 'update skill' }));

          const batchCall =
            mockGateway.changeProposals.batchCreate.mock.calls[0][0];
          permProposal = batchCall.proposals.find(
            (p: { type: ChangeProposalType }) =>
              p.type === ChangeProposalType.updateSkillFilePermissions,
          );
        });

        it('includes the proposal', () => {
          expect(permProposal).toBeDefined();
        });

        it('has the correct payload', () => {
          expect(permProposal.payload).toEqual({
            targetId: 'helper-file-id',
            oldValue: 'rw-r--r--',
            newValue: 'rwxr-xr-x',
          });
        });
      });

      describe('when only permissions changed', () => {
        it('does not generate updateSkillFileContent', async () => {
          await playbookSubmitHandler(buildDeps({ message: 'update skill' }));

          const batchCall =
            mockGateway.changeProposals.batchCreate.mock.calls[0][0];
          const contentProposal = batchCall.proposals.find(
            (p: { type: ChangeProposalType }) =>
              p.type === ChangeProposalType.updateSkillFileContent,
          );
          expect(contentProposal).toBeUndefined();
        });
      });
    });

    describe('updated skill without deployed SKILL.md content', () => {
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
            createOrUpdate: [],
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
          expect.stringContaining('deployed SKILL.md content not found'),
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
        const { logErrorConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

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

        expect(mockPlaybookLocalRepository.removeChange).toHaveBeenCalledTimes(
          1,
        );
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

        expect(mockGateway.changeProposals.batchCreate).toHaveBeenCalledTimes(
          2,
        );
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
        const { logErrorConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

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

    describe('per-configDir lock file resolution', () => {
      describe('when entry has configDir', () => {
        it('loads lock file from gitRoot/configDir', async () => {
          mockPlaybookLocalRepository.getChanges.mockReturnValue([
            makeEntry({
              configDir: 'apps/frontend',
              changeType: 'created',
            }),
          ]);

          await playbookSubmitHandler(buildDeps({ message: 'submit' }));

          expect(mockLockFileRepository.read).toHaveBeenCalledWith(
            '/project/apps/frontend',
          );
        });
      });

      describe('when entry has no configDir', () => {
        it('falls back to findNearestConfigDir', async () => {
          mockPlaybookLocalRepository.getChanges.mockReturnValue([
            makeEntry({ changeType: 'created' }),
          ]);

          await playbookSubmitHandler(buildDeps({ message: 'submit' }));

          // findNearestConfigDir resolves via configExists mock → '/project'
          expect(mockLockFileRepository.read).toHaveBeenCalledWith('/project');
        });
      });

      describe('resolves separate lock files for entries with different configDir values', () => {
        let batchCall: {
          proposals: { artefactId: string }[];
        };

        beforeEach(async () => {
          const frontendLockFile = {
            lockfileVersion: 1,
            packageSlugs: ['my-package'],
            agents: ['packmind' as const],
            installedAt: '2026-03-17T00:00:00.000Z',
            cliVersion: '1.0.0',
            targetId: 'target-frontend',
            artifacts: {
              'frontend-std': {
                name: 'Frontend Standard',
                type: 'standard' as const,
                id: 'artifact-fe-1',
                version: 1,
                spaceId: 'space-123',
                packageIds: ['pkg-1'],
                files: [
                  {
                    path: '.packmind/standards/frontend-std.md',
                    agent: 'packmind' as const,
                  },
                ],
              },
            },
          };

          const apiLockFile = {
            lockfileVersion: 1,
            packageSlugs: ['my-package'],
            agents: ['packmind' as const],
            installedAt: '2026-03-17T00:00:00.000Z',
            cliVersion: '1.0.0',
            targetId: 'target-api',
            artifacts: {
              'api-std': {
                name: 'API Standard',
                type: 'standard' as const,
                id: 'artifact-api-1',
                version: 1,
                spaceId: 'space-123',
                packageIds: ['pkg-2'],
                files: [
                  {
                    path: '.packmind/standards/api-std.md',
                    agent: 'packmind' as const,
                  },
                ],
              },
            },
          };

          mockLockFileRepository.read.mockImplementation(
            async (dir: string) => {
              if (dir === '/project/apps/frontend') return frontendLockFile;
              if (dir === '/project/apps/api') return apiLockFile;
              return null;
            },
          );

          mockGateway.deployment.getContentByVersions.mockResolvedValue({
            fileUpdates: { createOrUpdate: [], delete: [] },
            skillFolders: [],
            targetId: 'target-456',
            resolvedAgents: [],
          });

          mockPlaybookLocalRepository.getChanges.mockReturnValue([
            makeEntry({
              filePath: '.packmind/standards/frontend-std.md',
              artifactName: 'Frontend Standard',
              configDir: 'apps/frontend',
              changeType: 'removed',
              content: '',
              spaceId: 'space-123',
            }),
            makeEntry({
              filePath: '.packmind/standards/api-std.md',
              artifactName: 'API Standard',
              configDir: 'apps/api',
              changeType: 'removed',
              content: '',
              spaceId: 'space-123',
            }),
          ]);

          await playbookSubmitHandler(buildDeps({ message: 'remove both' }));

          batchCall = mockGateway.changeProposals.batchCreate.mock.calls[0][0];
        });

        it('reads frontend lock file', () => {
          expect(mockLockFileRepository.read).toHaveBeenCalledWith(
            '/project/apps/frontend',
          );
        });

        it('reads api lock file', () => {
          expect(mockLockFileRepository.read).toHaveBeenCalledWith(
            '/project/apps/api',
          );
        });

        it('includes frontend artifact', () => {
          const artefactIds = batchCall.proposals.map(
            (p: { artefactId: string }) => p.artefactId,
          );
          expect(artefactIds).toContain('artifact-fe-1');
        });

        it('includes api artifact', () => {
          const artefactIds = batchCall.proposals.map(
            (p: { artefactId: string }) => p.artefactId,
          );
          expect(artefactIds).toContain('artifact-api-1');
        });
      });

      it('uses per-entry projectDir for file deletion', async () => {
        mockLockFileRepository.read.mockImplementation(async (dir: string) => {
          if (dir === '/project/apps/frontend') {
            return {
              lockfileVersion: 1,
              packageSlugs: ['my-package'],
              agents: ['claude' as const],
              installedAt: '2026-03-17T00:00:00.000Z',
              cliVersion: '1.0.0',
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
            };
          }
          return null;
        });

        mockPlaybookLocalRepository.getChanges.mockReturnValue([
          makeEntry({
            filePath: '.claude/commands/my-command.md',
            artifactType: 'command',
            artifactName: 'My Command',
            codingAgent: 'claude',
            changeType: 'removed',
            configDir: 'apps/frontend',
            content: '',
          }),
        ]);

        const mockUnlinkSync = jest.fn();
        await playbookSubmitHandler(
          buildDeps({ message: 'remove', unlinkSync: mockUnlinkSync }),
        );

        expect(mockUnlinkSync).toHaveBeenCalledWith(
          '/project/apps/frontend/.claude/commands/my-command.md',
        );
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

  describe('duplicate name pre-flight check', () => {
    describe('when creation entry has a duplicate name in the space', () => {
      beforeEach(() => {
        mockPlaybookLocalRepository.getChanges.mockReturnValue([
          makeEntry({ changeType: 'created', artifactName: 'My Standard' }),
        ]);
        mockGateway.standards.list.mockResolvedValue({
          standards: [
            {
              id: 'std-1',
              slug: 'my-standard',
              name: 'My Standard',
              description: '',
            },
          ],
        });
      });

      it('logs error mentioning the artifact name', async () => {
        const { logErrorConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

        await playbookSubmitHandler(buildDeps({ message: 'test' }));

        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('My Standard'),
        );
      });

      it('logs error mentioning playbook unstage', async () => {
        const { logErrorConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

        await playbookSubmitHandler(buildDeps({ message: 'test' }));

        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('playbook unstage'),
        );
      });

      it('exits with code 1', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'test' }));

        expect(mockExit).toHaveBeenCalledWith(1);
      });

      it('does not call batchCreate', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'test' }));

        expect(mockGateway.changeProposals.batchCreate).not.toHaveBeenCalled();
      });
    });

    describe('when creation entry name matches case-insensitively', () => {
      beforeEach(() => {
        mockPlaybookLocalRepository.getChanges.mockReturnValue([
          makeEntry({ changeType: 'created', artifactName: 'my standard' }),
        ]);
        mockGateway.standards.list.mockResolvedValue({
          standards: [
            {
              id: 'std-1',
              slug: 'my-standard',
              name: 'My Standard',
              description: '',
            },
          ],
        });
      });

      it('exits with code 1', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'test' }));

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when multiple creation entries have duplicate names among themselves', () => {
      beforeEach(() => {
        mockPlaybookLocalRepository.getChanges.mockReturnValue([
          makeEntry({
            changeType: 'created',
            artifactName: 'My Standard',
            filePath: '.packmind/standards/my-standard.md',
          }),
          makeEntry({
            changeType: 'created',
            artifactName: 'My Standard',
            filePath: '.packmind/standards/my-standard-copy.md',
          }),
        ]);
        mockGateway.standards.list.mockResolvedValue({ standards: [] });
      });

      it('exits with code 1', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'test' }));

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when gateway list call fails', () => {
      beforeEach(() => {
        mockPlaybookLocalRepository.getChanges.mockReturnValue([
          makeEntry({ changeType: 'created', artifactName: 'New Standard' }),
        ]);
        mockGateway.standards.list.mockRejectedValue(
          new Error('Network error'),
        );
      });

      it('proceeds with submit', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'test' }));

        expect(mockGateway.changeProposals.batchCreate).toHaveBeenCalled();
      });
    });

    describe('when creation entry has no duplicate', () => {
      beforeEach(() => {
        mockPlaybookLocalRepository.getChanges.mockReturnValue([
          makeEntry({ changeType: 'created', artifactName: 'New Standard' }),
        ]);
        mockGateway.standards.list.mockResolvedValue({
          standards: [
            {
              id: 'std-1',
              slug: 'other',
              name: 'Other Standard',
              description: '',
            },
          ],
        });
      });

      it('proceeds with submit', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'test' }));

        expect(mockGateway.changeProposals.batchCreate).toHaveBeenCalled();
      });
    });

    describe('when created command has a duplicate name', () => {
      beforeEach(() => {
        mockPlaybookLocalRepository.getChanges.mockReturnValue([
          makeEntry({
            changeType: 'created',
            artifactType: 'command',
            artifactName: 'My Command',
            filePath: '.packmind/commands/my-command.md',
            content: COMMAND_CONTENT,
          }),
        ]);
        mockGateway.commands.list.mockResolvedValue({
          recipes: [{ id: 'cmd-1', slug: 'my-command', name: 'My Command' }],
        });
      });

      it('exits with code 1', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'test' }));

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });

    describe('when created skill has a duplicate name', () => {
      beforeEach(() => {
        mockPlaybookLocalRepository.getChanges.mockReturnValue([
          makeEntry({
            changeType: 'created',
            artifactType: 'skill',
            artifactName: 'My Skill',
            filePath: '.packmind/skills/my-skill',
            content:
              'name: My Skill\ndescription: A skill\nprompt: Do something',
          }),
        ]);
        mockGateway.skills.list.mockResolvedValue([
          { id: 'skill-1', slug: 'my-skill', name: 'My Skill' },
        ]);
      });

      it('exits with code 1', async () => {
        await playbookSubmitHandler(buildDeps({ message: 'test' }));

        expect(mockExit).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('when --no-review flag is set', () => {
    beforeEach(() => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([makeEntry()]);
      mockGateway.changeProposals.batchApply.mockResolvedValue({
        success: true,
        created: {
          standards: [{ id: 'std-1', slug: 'my-standard' }],
          commands: [],
          skills: [],
        },
        updated: {
          standards: [],
          commands: [],
          skills: [],
        },
      });
    });

    it('passes message to batchApply', async () => {
      await playbookSubmitHandler(
        buildDeps({ message: 'My commit message', noReview: true }),
      );

      expect(mockGateway.changeProposals.batchApply).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'My commit message' }),
      );
    });

    it('passes directUpdate: true to batchApply', async () => {
      await playbookSubmitHandler(
        buildDeps({ message: 'My commit message', noReview: true }),
      );

      expect(mockGateway.changeProposals.batchApply).toHaveBeenCalledWith(
        expect.objectContaining({ directUpdate: true }),
      );
    });

    it('does not open the editor', async () => {
      await playbookSubmitHandler(buildDeps({ noReview: true }));

      expect(mockOpenEditor).not.toHaveBeenCalled();
    });

    describe('when entry has changeType updated', () => {
      beforeEach(() => {
        mockPlaybookLocalRepository.getChanges.mockReturnValue([
          makeEntry({
            changeType: 'updated',
            artifactName: 'My Standard',
            filePath: '.packmind/standards/my-standard.md',
          }),
        ]);
        mockLockFileRepository.read.mockResolvedValue({
          lockfileVersion: 1,
          packageSlugs: ['my-package'],
          agents: ['packmind'],
          installedAt: '2026-03-17T00:00:00.000Z',
          cliVersion: '1.0.0',
          targetId: 'target-456',
          artifacts: {
            'standards/my-standard': {
              name: 'My Standard',
              type: 'standard',
              id: 'std-1',
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
                content:
                  '# My Standard\n\nOld description.\n\n## Rules\n\n* Old rule',
              },
            ],
            delete: [],
          },
          skillFolders: [],
          targetId: 'target-456',
          resolvedAgents: [],
        });
      });

      it('calls batchApply with update proposals', async () => {
        await playbookSubmitHandler(buildDeps({ noReview: true }));

        expect(mockGateway.changeProposals.batchApply).toHaveBeenCalled();
      });
    });

    it('logs success message', async () => {
      const { logSuccessConsole } = jest.requireMock(
        '../../utils/consoleLogger',
      );

      await playbookSubmitHandler(buildDeps({ noReview: true }));

      expect(logSuccessConsole).toHaveBeenCalledWith(
        expect.stringContaining('created'),
      );
    });

    it('exits with code 0', async () => {
      await playbookSubmitHandler(buildDeps({ noReview: true }));

      expect(mockExit).toHaveBeenCalledWith(0);
    });

    describe('when a single standard is created', () => {
      it('logs the exact packages add command with the standard and package slugs', async () => {
        const { logInfoConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

        await playbookSubmitHandler(buildDeps({ noReview: true }));

        expect(logInfoConsole).toHaveBeenCalledWith(
          expect.stringContaining('--to my-package --standard my-standard'),
        );
      });
    });

    describe('when multiple packages are available in the space', () => {
      beforeEach(() => {
        (mockPackmindCliHexa.listPackages as jest.Mock).mockResolvedValue([
          {
            id: 'pkg-1',
            slug: 'pkg-one',
            name: 'Pkg One',
            spaceId: 'space-123',
          },
          {
            id: 'pkg-2',
            slug: 'pkg-two',
            name: 'Pkg Two',
            spaceId: 'space-123',
          },
        ]);
      });

      it('shows available packages', async () => {
        const { logInfoConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

        await playbookSubmitHandler(buildDeps({ noReview: true }));

        expect(logInfoConsole).toHaveBeenCalledWith(
          expect.stringContaining('Available packages: pkg-one, pkg-two'),
        );
      });
    });

    describe('when multiple artifacts are created', () => {
      beforeEach(() => {
        mockGateway.changeProposals.batchApply.mockResolvedValue({
          success: true,
          created: {
            standards: [
              { id: 'std-1', slug: 'standard-one' },
              { id: 'std-2', slug: 'standard-two' },
            ],
            commands: [{ id: 'cmd-1', slug: 'my-command' }],
            skills: [],
          },
          updated: {
            standards: [],
            commands: [],
            skills: [],
          },
        });
      });

      it('logs generic package add guidance', async () => {
        const { logInfoConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

        await playbookSubmitHandler(buildDeps({ noReview: true }));

        expect(logInfoConsole).toHaveBeenCalledWith(
          expect.stringContaining('packages add'),
        );
      });
    });

    describe('when no artifacts are created (only updates)', () => {
      beforeEach(() => {
        mockGateway.changeProposals.batchApply.mockResolvedValue({
          success: true,
          created: {
            standards: [],
            commands: [],
            skills: [],
          },
          updated: {
            standards: [],
            commands: [],
            skills: [],
          },
        });
      });

      it('does not log package add guidance', async () => {
        const { logInfoConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

        await playbookSubmitHandler(buildDeps({ noReview: true }));

        expect(logInfoConsole).not.toHaveBeenCalledWith(
          expect.stringContaining('packages add'),
        );
      });
    });

    describe('when batchApply returns updated artifacts', () => {
      beforeEach(() => {
        mockGateway.changeProposals.batchApply.mockResolvedValue({
          success: true,
          created: { standards: [], commands: [], skills: [] },
          updated: {
            standards: ['std-1'],
            commands: [],
            skills: [],
          },
        });
      });

      it('logs updated count in success message', async () => {
        const { logSuccessConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

        await playbookSubmitHandler(buildDeps({ noReview: true }));

        expect(logSuccessConsole).toHaveBeenCalledWith(
          expect.stringContaining('updated'),
        );
      });
    });

    describe('when batchApply returns both created and updated artifacts', () => {
      beforeEach(() => {
        mockGateway.changeProposals.batchApply.mockResolvedValue({
          success: true,
          created: {
            standards: [{ id: 'std-1', slug: 'my-standard' }],
            commands: [],
            skills: [],
          },
          updated: {
            standards: [],
            commands: ['cmd-1'],
            skills: [],
          },
        });
      });

      it('logs created in success message', async () => {
        const { logSuccessConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

        await playbookSubmitHandler(buildDeps({ noReview: true }));

        expect(logSuccessConsole).toHaveBeenCalledWith(
          expect.stringContaining('created'),
        );
      });

      it('logs updated in success message', async () => {
        const { logSuccessConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

        await playbookSubmitHandler(buildDeps({ noReview: true }));

        expect(logSuccessConsole).toHaveBeenCalledWith(
          expect.stringContaining('updated'),
        );
      });
    });

    describe('when batchApply returns success: false', () => {
      beforeEach(() => {
        mockGateway.changeProposals.batchApply.mockResolvedValue({
          success: false,
          error: { index: 0, type: 'standard', message: 'Duplicate name' },
        });
      });

      it('logs the error message', async () => {
        const { logErrorConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

        await playbookSubmitHandler(buildDeps({ noReview: true }));

        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('Duplicate name'),
        );
      });

      it('exits with code 1', async () => {
        await playbookSubmitHandler(buildDeps({ noReview: true }));

        expect(mockExit).toHaveBeenCalledWith(1);
      });

      it('does not remove staged entries', async () => {
        await playbookSubmitHandler(buildDeps({ noReview: true }));

        expect(mockPlaybookLocalRepository.removeChange).not.toHaveBeenCalled();
      });
    });

    describe('when batchApply throws a network error', () => {
      beforeEach(() => {
        mockGateway.changeProposals.batchApply.mockRejectedValue(
          new Error('Network timeout'),
        );
      });

      it('logs the error', async () => {
        const { logErrorConsole } = jest.requireMock(
          '../../utils/consoleLogger',
        );

        await playbookSubmitHandler(buildDeps({ noReview: true }));

        expect(logErrorConsole).toHaveBeenCalledWith(
          expect.stringContaining('Network timeout'),
        );
      });

      it('exits with code 1', async () => {
        await playbookSubmitHandler(buildDeps({ noReview: true }));

        expect(mockExit).toHaveBeenCalledWith(1);
      });

      it('does not remove staged entries', async () => {
        await playbookSubmitHandler(buildDeps({ noReview: true }));

        expect(mockPlaybookLocalRepository.removeChange).not.toHaveBeenCalled();
      });
    });

    describe('when batchApply succeeds', () => {
      it('removes staged entries', async () => {
        await playbookSubmitHandler(buildDeps({ noReview: true }));

        expect(mockPlaybookLocalRepository.removeChange).toHaveBeenCalledWith(
          makeEntry().filePath,
          makeEntry().spaceId,
        );
      });
    });
  });

  describe('when batchCreate throws CommunityEditionError', () => {
    beforeEach(() => {
      mockPlaybookLocalRepository.getChanges.mockReturnValue([makeEntry()]);
      mockGateway.changeProposals.batchCreate.mockRejectedValue(
        new CommunityEditionError('change proposals'),
      );
    });

    it('logs error with --no-review hint', async () => {
      const { logInfoConsole } = jest.requireMock('../../utils/consoleLogger');
      await playbookSubmitHandler(
        buildDeps({ message: 'test', noReview: false }),
      );

      expect(logInfoConsole).toHaveBeenCalledWith(
        expect.stringContaining('--no-review'),
      );
    });

    it('exits with code 1', async () => {
      await playbookSubmitHandler(
        buildDeps({ message: 'test', noReview: false }),
      );

      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});
