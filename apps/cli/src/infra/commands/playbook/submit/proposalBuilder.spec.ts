import { ChangeProposalType } from '@packmind/types';
import { PlaybookChangeEntry } from '../../../../domain/repositories/IPlaybookLocalRepository';
import { PackmindLockFile } from '../../../../domain/repositories/PackmindLockFile';
import {
  buildProposals,
  resolveArtifactIdFromLockFile,
} from './proposalBuilder';
import { TargetContext } from './targetContextResolver';

jest.mock('../../../utils/consoleLogger', () => ({
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

const SKILL_CONTENT =
  'name: My Skill\ndescription: A useful skill\nprompt: Do something\nskillMdPermissions: read\n';

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

function makeLockFile(
  overrides: Partial<PackmindLockFile> = {},
): PackmindLockFile {
  return {
    lockfileVersion: 1,
    packageSlugs: ['my-package'],
    agents: ['packmind'],
    targetId: 'target-456',
    artifacts: {},
    ...overrides,
  };
}

function makeTargetContext(
  overrides: Partial<TargetContext> = {},
): TargetContext {
  return {
    lockFile: makeLockFile(),
    deployedFiles: [],
    projectDir: '/project',
    ...overrides,
  };
}

describe('resolveArtifactIdFromLockFile', () => {
  describe('when lock file is null', () => {
    it('returns null', () => {
      const result = resolveArtifactIdFromLockFile('some/path.md', null);

      expect(result).toBeNull();
    });
  });

  describe('when file path matches an artifact entry', () => {
    it('returns the artifact id', () => {
      const lockFile = makeLockFile({
        artifacts: {
          'my-standard': {
            name: 'My Standard',
            type: 'standard',
            id: 'artifact-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: [],
            files: [
              { path: '.packmind/standards/my-standard.md', agent: 'packmind' },
            ],
          },
        },
      });

      const result = resolveArtifactIdFromLockFile(
        '.packmind/standards/my-standard.md',
        lockFile,
      );

      expect(result).toBe('artifact-1');
    });
  });

  describe('when file path matches a skill folder prefix', () => {
    it('returns the artifact id', () => {
      const lockFile = makeLockFile({
        artifacts: {
          'my-skill': {
            name: 'My Skill',
            type: 'skill',
            id: 'artifact-skill-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: [],
            files: [
              {
                path: '.claude/skills/my-skill/SKILL.md',
                agent: 'claude',
                isSkillDefinition: true,
              },
            ],
          },
        },
      });

      const result = resolveArtifactIdFromLockFile(
        '.claude/skills/my-skill',
        lockFile,
      );

      expect(result).toBe('artifact-skill-1');
    });
  });

  describe('when no artifact matches', () => {
    it('returns null', () => {
      const lockFile = makeLockFile({
        artifacts: {
          'my-standard': {
            name: 'My Standard',
            type: 'standard',
            id: 'artifact-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: [],
            files: [
              { path: '.packmind/standards/my-standard.md', agent: 'packmind' },
            ],
          },
        },
      });

      const result = resolveArtifactIdFromLockFile(
        '.packmind/standards/other.md',
        lockFile,
      );

      expect(result).toBeNull();
    });
  });
});

describe('buildProposals', () => {
  const { logWarningConsole } = jest.requireMock(
    '../../../utils/consoleLogger',
  ) as {
    logWarningConsole: jest.Mock;
  };

  let defaultGetTargetContext: (
    entry: PlaybookChangeEntry,
  ) => Promise<TargetContext>;

  beforeEach(() => {
    jest.clearAllMocks();
    defaultGetTargetContext = jest.fn().mockResolvedValue(makeTargetContext());
  });

  describe('when entry is a created standard', () => {
    it('generates one proposal', async () => {
      const entries = [makeEntry({ changeType: 'created' })];

      const { proposals } = await buildProposals(
        entries,
        defaultGetTargetContext,
      );

      expect(proposals).toHaveLength(1);
    });

    it('sets type to createStandard', async () => {
      const entries = [makeEntry({ changeType: 'created' })];

      const { proposals } = await buildProposals(
        entries,
        defaultGetTargetContext,
      );

      expect(proposals[0].type).toBe(ChangeProposalType.createStandard);
    });

    it('includes parsed name in payload', async () => {
      const entries = [makeEntry({ changeType: 'created' })];

      const { proposals } = await buildProposals(
        entries,
        defaultGetTargetContext,
      );

      expect((proposals[0].payload as { name: string }).name).toBe(
        'My Standard',
      );
    });

    it('includes parsed rules in payload', async () => {
      const entries = [makeEntry({ changeType: 'created' })];

      const { proposals } = await buildProposals(
        entries,
        defaultGetTargetContext,
      );

      expect(
        (proposals[0].payload as { rules: { content: string }[] }).rules,
      ).toEqual([
        { content: 'Do not use var' },
        { content: 'Always use const' },
      ]);
    });

    it('sets artefactId to null', async () => {
      const entries = [makeEntry({ changeType: 'created' })];

      const { proposals } = await buildProposals(
        entries,
        defaultGetTargetContext,
      );

      expect(proposals[0].artefactId).toBeNull();
    });
  });

  describe('when entry is a created command', () => {
    it('generates a createCommand proposal', async () => {
      const entries = [
        makeEntry({
          changeType: 'created',
          artifactType: 'command',
          artifactName: 'My Command',
          content: COMMAND_CONTENT,
          filePath: '.packmind/commands/my-command.md',
        }),
      ];

      const { proposals } = await buildProposals(
        entries,
        defaultGetTargetContext,
      );

      expect(proposals[0].type).toBe(ChangeProposalType.createCommand);
    });

    it('includes command name in payload', async () => {
      const entries = [
        makeEntry({
          changeType: 'created',
          artifactType: 'command',
          artifactName: 'My Command',
          content: COMMAND_CONTENT,
          filePath: '.packmind/commands/my-command.md',
        }),
      ];

      const { proposals } = await buildProposals(
        entries,
        defaultGetTargetContext,
      );

      expect((proposals[0].payload as { name: string }).name).toBe(
        'My Command',
      );
    });
  });

  describe('when entry is a created skill', () => {
    it('generates a createSkill proposal', async () => {
      const entries = [
        makeEntry({
          changeType: 'created',
          artifactType: 'skill',
          artifactName: 'My Skill',
          content: SKILL_CONTENT,
          filePath: '.claude/skills/my-skill',
        }),
      ];

      const { proposals } = await buildProposals(
        entries,
        defaultGetTargetContext,
      );

      expect(proposals[0].type).toBe(ChangeProposalType.createSkill);
    });

    it('includes parsed skill fields in payload', async () => {
      const entries = [
        makeEntry({
          changeType: 'created',
          artifactType: 'skill',
          artifactName: 'My Skill',
          content: SKILL_CONTENT,
          filePath: '.claude/skills/my-skill',
        }),
      ];

      const { proposals } = await buildProposals(
        entries,
        defaultGetTargetContext,
      );

      const payload = proposals[0].payload as {
        name: string;
        description: string;
        prompt: string;
      };
      expect(payload.name).toBe('My Skill');
    });
  });

  describe('when entry is a removed standard', () => {
    it('generates a removeStandard proposal', async () => {
      const lockFile = makeLockFile({
        artifacts: {
          'my-standard': {
            name: 'My Standard',
            type: 'standard',
            id: 'artifact-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: ['pkg-1'],
            files: [
              { path: '.packmind/standards/my-standard.md', agent: 'packmind' },
            ],
          },
        },
      });
      const getCtx = jest
        .fn()
        .mockResolvedValue(makeTargetContext({ lockFile }));
      const entries = [makeEntry({ changeType: 'removed', content: '' })];

      const { proposals } = await buildProposals(entries, getCtx);

      expect(proposals[0].type).toBe(ChangeProposalType.removeStandard);
    });

    it('includes packageIds from lock file in payload', async () => {
      const lockFile = makeLockFile({
        artifacts: {
          'my-standard': {
            name: 'My Standard',
            type: 'standard',
            id: 'artifact-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: ['pkg-1', 'pkg-2'],
            files: [
              { path: '.packmind/standards/my-standard.md', agent: 'packmind' },
            ],
          },
        },
      });
      const getCtx = jest
        .fn()
        .mockResolvedValue(makeTargetContext({ lockFile }));
      const entries = [makeEntry({ changeType: 'removed', content: '' })];

      const { proposals } = await buildProposals(entries, getCtx);

      expect(
        (proposals[0].payload as { packageIds: string[] }).packageIds,
      ).toEqual(['pkg-1', 'pkg-2']);
    });
  });

  describe('when removed entry has no artifact in lock file', () => {
    it('produces no proposal', async () => {
      const entries = [makeEntry({ changeType: 'removed', content: '' })];

      const { proposals } = await buildProposals(
        entries,
        defaultGetTargetContext,
      );

      expect(proposals).toHaveLength(0);
    });

    it('logs a warning', async () => {
      const entries = [makeEntry({ changeType: 'removed', content: '' })];

      await buildProposals(entries, defaultGetTargetContext);

      expect(logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('not found in lock file'),
      );
    });
  });

  describe('when entry is an updated standard', () => {
    const DEPLOYED_STANDARD = [
      '# My Standard',
      '',
      'A description of the standard.',
      '',
      '## Rules',
      '',
      '* Do not use var',
    ].join('\n');

    it('generates at least one proposal', async () => {
      const lockFile = makeLockFile({
        artifacts: {
          'my-standard': {
            name: 'My Standard',
            type: 'standard',
            id: 'artifact-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: [],
            files: [
              { path: '.packmind/standards/my-standard.md', agent: 'packmind' },
            ],
          },
        },
      });
      const getCtx = jest.fn().mockResolvedValue(
        makeTargetContext({
          lockFile,
          deployedFiles: [
            {
              path: '.packmind/standards/my-standard.md',
              content: DEPLOYED_STANDARD,
            },
          ],
        }),
      );
      const entries = [makeEntry({ changeType: 'updated' })];

      const { proposals } = await buildProposals(entries, getCtx);

      expect(proposals.length).toBeGreaterThan(0);
    });

    it('sets artefactId to the lock file artifact id', async () => {
      const lockFile = makeLockFile({
        artifacts: {
          'my-standard': {
            name: 'My Standard',
            type: 'standard',
            id: 'artifact-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: [],
            files: [
              { path: '.packmind/standards/my-standard.md', agent: 'packmind' },
            ],
          },
        },
      });
      const getCtx = jest.fn().mockResolvedValue(
        makeTargetContext({
          lockFile,
          deployedFiles: [
            {
              path: '.packmind/standards/my-standard.md',
              content: DEPLOYED_STANDARD,
            },
          ],
        }),
      );
      const entries = [makeEntry({ changeType: 'updated' })];

      const { proposals } = await buildProposals(entries, getCtx);

      expect(proposals[0].artefactId).toBe('artifact-1');
    });
  });

  describe('when updated standard has no deployed content', () => {
    const setupNoDeployedContent = () => {
      const lockFile = makeLockFile({
        artifacts: {
          'my-standard': {
            name: 'My Standard',
            type: 'standard',
            id: 'artifact-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: [],
            files: [
              { path: '.packmind/standards/my-standard.md', agent: 'packmind' },
            ],
          },
        },
      });
      const getCtx = jest
        .fn()
        .mockResolvedValue(makeTargetContext({ lockFile, deployedFiles: [] }));
      const entries = [makeEntry({ changeType: 'updated' })];
      return { entries, getCtx };
    };

    it('produces no proposals', async () => {
      const { entries, getCtx } = setupNoDeployedContent();

      const { proposals } = await buildProposals(entries, getCtx);

      expect(proposals).toHaveLength(0);
    });

    it('logs a warning about deployed content', async () => {
      const { entries, getCtx } = setupNoDeployedContent();

      await buildProposals(entries, getCtx);

      expect(logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('deployed content unavailable'),
      );
    });
  });

  describe('when updated entry has no artifact in lock file', () => {
    it('produces no proposal', async () => {
      const entries = [makeEntry({ changeType: 'updated' })];

      const { proposals } = await buildProposals(
        entries,
        defaultGetTargetContext,
      );

      expect(proposals).toHaveLength(0);
    });

    it('logs a warning', async () => {
      const entries = [makeEntry({ changeType: 'updated' })];

      await buildProposals(entries, defaultGetTargetContext);

      expect(logWarningConsole).toHaveBeenCalledWith(
        expect.stringContaining('not found in lock file'),
      );
    });
  });

  describe('when entry has no targetId but lock file does', () => {
    it('falls back to lock file targetId', async () => {
      const lockFile = makeLockFile({ targetId: 'lock-target-789' });
      const getCtx = jest
        .fn()
        .mockResolvedValue(makeTargetContext({ lockFile }));
      const entries = [
        makeEntry({ changeType: 'created', targetId: undefined }),
      ];

      const { proposals } = await buildProposals(entries, getCtx);

      expect(proposals[0].targetId).toBe('lock-target-789');
    });
  });

  describe('when updated skill has deployed SKILL.md', () => {
    const DEPLOYED_SKILL_MD = [
      '---',
      'name: My Skill',
      'description: An old description',
      '---',
      'Do something old',
    ].join('\n');

    it('generates granular skill proposals', async () => {
      const lockFile = makeLockFile({
        artifacts: {
          'my-skill': {
            name: 'My Skill',
            type: 'skill',
            id: 'artifact-skill-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: [],
            files: [
              { path: '.claude/skills/my-skill/SKILL.md', agent: 'claude' },
            ],
          },
        },
      });
      const getCtx = jest.fn().mockResolvedValue(
        makeTargetContext({
          lockFile,
          deployedFiles: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              content: DEPLOYED_SKILL_MD,
            },
          ],
        }),
      );
      const entries = [
        makeEntry({
          changeType: 'updated',
          artifactType: 'skill',
          artifactName: 'My Skill',
          content: SKILL_CONTENT,
          filePath: '.claude/skills/my-skill',
        }),
      ];

      const { proposals } = await buildProposals(entries, getCtx);

      const types = proposals.map((p) => p.type);
      expect(types).toContain(ChangeProposalType.updateSkillDescription);
    });
  });

  describe('when updated command has deployed content', () => {
    const setupUpdatedCommand = () => {
      const lockFile = makeLockFile({
        artifacts: {
          'my-command': {
            name: 'My Command',
            type: 'command',
            id: 'artifact-cmd-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: [],
            files: [
              {
                path: '.packmind/commands/my-command.md',
                agent: 'packmind',
              },
            ],
          },
        },
      });
      const newContent = '---\nname: My Command\n---\nDo something different';
      const getCtx = jest.fn().mockResolvedValue(
        makeTargetContext({
          lockFile,
          deployedFiles: [
            {
              path: '.packmind/commands/my-command.md',
              content: COMMAND_CONTENT,
            },
          ],
        }),
      );
      const entries = [
        makeEntry({
          changeType: 'updated',
          artifactType: 'command',
          artifactName: 'My Command',
          content: newContent,
          filePath: '.packmind/commands/my-command.md',
        }),
      ];
      return { entries, getCtx };
    };

    it('generates at least one proposal', async () => {
      const { entries, getCtx } = setupUpdatedCommand();

      const { proposals } = await buildProposals(entries, getCtx);

      expect(proposals.length).toBeGreaterThan(0);
    });

    it('sets artefactId to the lock file artifact id', async () => {
      const { entries, getCtx } = setupUpdatedCommand();

      const { proposals } = await buildProposals(entries, getCtx);

      expect(proposals[0].artefactId).toBe('artifact-cmd-1');
    });
  });

  describe('when processing multiple entries', () => {
    it('collects proposals from all entries', async () => {
      const entries = [
        makeEntry({ changeType: 'created', spaceId: 'space-1' }),
        makeEntry({
          changeType: 'created',
          artifactType: 'command',
          artifactName: 'My Command',
          content: COMMAND_CONTENT,
          filePath: '.packmind/commands/my-command.md',
          spaceId: 'space-2',
        }),
      ];

      const { proposals } = await buildProposals(
        entries,
        defaultGetTargetContext,
      );

      expect(proposals).toHaveLength(2);
    });
  });

  describe('when the same artifact is updated from multiple agents', () => {
    const sharedLockFile = makeLockFile({
      artifacts: {
        'commands/my-command': {
          name: 'My Command',
          type: 'command',
          id: 'artifact-cmd-1',
          version: 1,
          spaceId: 'space-123',
          packageIds: [],
          files: [
            { path: '.claude/commands/my-command.md', agent: 'claude-code' },
            {
              path: '.github/copilot/commands/my-command.md',
              agent: 'copilot',
            },
          ],
        },
      },
    });

    let getCtx: (entry: PlaybookChangeEntry) => Promise<TargetContext>;

    beforeEach(() => {
      getCtx = jest.fn().mockResolvedValue(
        makeTargetContext({
          lockFile: sharedLockFile,
          deployedFiles: [
            {
              path: '.claude/commands/my-command.md',
              content: COMMAND_CONTENT,
            },
            {
              path: '.github/copilot/commands/my-command.md',
              content: COMMAND_CONTENT,
            },
          ],
        }),
      );
    });

    it('reports a conflict', async () => {
      const entries = [
        makeEntry({
          changeType: 'updated',
          artifactType: 'command',
          artifactName: 'My Command',
          content: '---\nname: My Command\n---\nUpdated from claude',
          filePath: '.claude/commands/my-command.md',
          codingAgent: 'claude-code',
        }),
        makeEntry({
          changeType: 'updated',
          artifactType: 'command',
          artifactName: 'My Command',
          content: '---\nname: My Command\n---\nUpdated from copilot',
          filePath: '.github/copilot/commands/my-command.md',
          codingAgent: 'copilot',
        }),
      ];

      const { conflicts } = await buildProposals(entries, getCtx);

      expect(conflicts).toHaveLength(1);
    });

    it('includes both file paths in the conflict', async () => {
      const entries = [
        makeEntry({
          changeType: 'updated',
          artifactType: 'command',
          artifactName: 'My Command',
          content: '---\nname: My Command\n---\nUpdated from claude',
          filePath: '.claude/commands/my-command.md',
          codingAgent: 'claude-code',
        }),
        makeEntry({
          changeType: 'updated',
          artifactType: 'command',
          artifactName: 'My Command',
          content: '---\nname: My Command\n---\nUpdated from copilot',
          filePath: '.github/copilot/commands/my-command.md',
          codingAgent: 'copilot',
        }),
      ];

      const { conflicts } = await buildProposals(entries, getCtx);

      expect(conflicts[0].entries).toEqual([
        {
          filePath: '.claude/commands/my-command.md',
          codingAgent: 'claude-code',
        },
        {
          filePath: '.github/copilot/commands/my-command.md',
          codingAgent: 'copilot',
        },
      ]);
    });

    it('includes artifact name in the conflict', async () => {
      const entries = [
        makeEntry({
          changeType: 'updated',
          artifactType: 'command',
          artifactName: 'My Command',
          content: '---\nname: My Command\n---\nUpdated from claude',
          filePath: '.claude/commands/my-command.md',
          codingAgent: 'claude-code',
        }),
        makeEntry({
          changeType: 'updated',
          artifactType: 'command',
          artifactName: 'My Command',
          content: '---\nname: My Command\n---\nUpdated from copilot',
          filePath: '.github/copilot/commands/my-command.md',
          codingAgent: 'copilot',
        }),
      ];

      const { conflicts } = await buildProposals(entries, getCtx);

      expect(conflicts[0].artifactName).toBe('My Command');
    });

    it('includes artifact type in the conflict', async () => {
      const entries = [
        makeEntry({
          changeType: 'updated',
          artifactType: 'command',
          artifactName: 'My Command',
          content: '---\nname: My Command\n---\nUpdated from claude',
          filePath: '.claude/commands/my-command.md',
          codingAgent: 'claude-code',
        }),
        makeEntry({
          changeType: 'updated',
          artifactType: 'command',
          artifactName: 'My Command',
          content: '---\nname: My Command\n---\nUpdated from copilot',
          filePath: '.github/copilot/commands/my-command.md',
          codingAgent: 'copilot',
        }),
      ];

      const { conflicts } = await buildProposals(entries, getCtx);

      expect(conflicts[0].artifactType).toBe('command');
    });
  });

  describe('when a single agent updates an artifact', () => {
    it('reports no conflicts', async () => {
      const lockFile = makeLockFile({
        artifacts: {
          'commands/my-command': {
            name: 'My Command',
            type: 'command',
            id: 'artifact-cmd-1',
            version: 1,
            spaceId: 'space-123',
            packageIds: [],
            files: [
              { path: '.claude/commands/my-command.md', agent: 'claude-code' },
            ],
          },
        },
      });
      const getCtx = jest.fn().mockResolvedValue(
        makeTargetContext({
          lockFile,
          deployedFiles: [
            {
              path: '.claude/commands/my-command.md',
              content: COMMAND_CONTENT,
            },
          ],
        }),
      );

      const entries = [
        makeEntry({
          changeType: 'updated',
          artifactType: 'command',
          artifactName: 'My Command',
          content: '---\nname: My Command\n---\nUpdated content',
          filePath: '.claude/commands/my-command.md',
          codingAgent: 'claude-code',
        }),
      ];

      const { conflicts } = await buildProposals(entries, getCtx);

      expect(conflicts).toHaveLength(0);
    });
  });
});
