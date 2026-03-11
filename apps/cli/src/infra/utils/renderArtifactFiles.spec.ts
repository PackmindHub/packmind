import { PackmindLockFile } from '../../domain/repositories/PackmindLockFile';
import {
  renderArtifactFiles,
  formatAgentsHeader,
  findArtifactEntry,
} from './renderArtifactFiles';

jest.mock('./consoleLogger', () => ({
  formatLabel: (text: string) => `[label:${text}]`,
  formatFilePath: (text: string) => `[path:${text}]`,
}));

function createLockFile(
  overrides: Partial<PackmindLockFile> = {},
): PackmindLockFile {
  return {
    lockfileVersion: 1,
    packageSlugs: ['my-package'],
    agents: ['claude', 'cursor'],
    installedAt: '2026-01-01T00:00:00.000Z',
    cliVersion: '1.0.0',
    artifacts: {},
    ...overrides,
  };
}

describe('renderArtifactFiles', () => {
  let log: jest.Mock;

  beforeEach(() => {
    log = jest.fn();
  });

  describe('when artifact has one file per agent', () => {
    const lockFile = createLockFile({
      artifacts: {
        'release-app': {
          name: 'Release app',
          type: 'command',
          id: 'cmd-1',
          version: 1,
          spaceId: 'space-1',
          packageIds: ['pkg-1'],
          files: [
            { path: '.claude/commands/release-app.md', agent: 'claude' },
            { path: '.cursor/commands/release-app.md', agent: 'cursor' },
            { path: '.packmind/commands/release-app.md', agent: 'packmind' },
          ],
        },
      },
    });

    beforeEach(() => {
      renderArtifactFiles([lockFile], 'command', 'release-app', log);
    });

    it('renders one line per agent with padded agent name and file path', () => {
      expect(log).toHaveBeenCalledTimes(3);
    });

    it('renders agents in alphabetical order', () => {
      expect(log.mock.calls[0][0]).toContain('[label:claude');
      expect(log.mock.calls[1][0]).toContain('[label:cursor');
      expect(log.mock.calls[2][0]).toContain('[label:packmind');
    });

    it('includes the file path for each agent', () => {
      expect(log.mock.calls[0][0]).toContain(
        '[path:.claude/commands/release-app.md]',
      );
      expect(log.mock.calls[1][0]).toContain(
        '[path:.cursor/commands/release-app.md]',
      );
      expect(log.mock.calls[2][0]).toContain(
        '[path:.packmind/commands/release-app.md]',
      );
    });
  });

  describe('when artifact has multiple files per agent', () => {
    const lockFile = createLockFile({
      artifacts: {
        'algorithmic-art': {
          name: 'algorithmic-art',
          type: 'skill',
          id: 'skl-1',
          version: 1,
          spaceId: 'space-1',
          packageIds: [],
          files: [
            {
              path: '.claude/skills/algorithmic-art/SKILL.md',
              agent: 'claude',
              isSkillDefinition: true,
            },
            {
              path: '.claude/skills/algorithmic-art/LICENSE.txt',
              agent: 'claude',
            },
            {
              path: '.cursor/skills/algorithmic-art/SKILL.md',
              agent: 'cursor',
              isSkillDefinition: true,
            },
            {
              path: '.cursor/skills/algorithmic-art/LICENSE.txt',
              agent: 'cursor',
            },
          ],
        },
      },
    });

    beforeEach(() => {
      renderArtifactFiles([lockFile], 'skill', 'algorithmic-art', log);
    });

    it('renders agent name on its own line followed by indented file paths', () => {
      expect(log).toHaveBeenCalledTimes(6);
    });

    it('renders agent name without path on first line', () => {
      expect(log.mock.calls[0][0]).toContain('[label:claude]');
      expect(log.mock.calls[0][0]).not.toContain('[path:');
    });

    it('renders file paths indented under the agent', () => {
      expect(log.mock.calls[1][0]).toContain(
        '[path:.claude/skills/algorithmic-art/SKILL.md]',
      );
      expect(log.mock.calls[2][0]).toContain(
        '[path:.claude/skills/algorithmic-art/LICENSE.txt]',
      );
    });

    it('renders the second agent after the first agent files', () => {
      expect(log.mock.calls[3][0]).toContain('[label:cursor]');
      expect(log.mock.calls[4][0]).toContain(
        '[path:.cursor/skills/algorithmic-art/SKILL.md]',
      );
    });
  });

  describe('when artifact is not found in lock files', () => {
    const lockFile = createLockFile({ artifacts: {} });

    it('does not log anything', () => {
      renderArtifactFiles([lockFile], 'command', 'nonexistent', log);

      expect(log).not.toHaveBeenCalled();
    });
  });

  describe('when searching across multiple lock files', () => {
    const lockFile1 = createLockFile({ artifacts: {} });
    const lockFile2 = createLockFile({
      artifacts: {
        'my-command': {
          name: 'My Command',
          type: 'command',
          id: 'cmd-1',
          version: 1,
          spaceId: 'space-1',
          packageIds: [],
          files: [{ path: '.claude/commands/my-command.md', agent: 'claude' }],
        },
      },
    });

    it('finds the artifact in the second lock file', () => {
      renderArtifactFiles([lockFile1, lockFile2], 'command', 'my-command', log);

      expect(log).toHaveBeenCalledTimes(1);
      expect(log.mock.calls[0][0]).toContain(
        '[path:.claude/commands/my-command.md]',
      );
    });
  });
});

describe('findArtifactEntry', () => {
  describe('when artifact type does not match', () => {
    const lockFile = createLockFile({
      artifacts: {
        'my-standard': {
          name: 'My Standard',
          type: 'standard',
          id: 'std-1',
          version: 1,
          spaceId: 'space-1',
          packageIds: [],
          files: [],
        },
      },
    });

    it('returns undefined', () => {
      const result = findArtifactEntry([lockFile], 'command', 'my-standard');

      expect(result).toBeUndefined();
    });
  });
});

describe('formatAgentsHeader', () => {
  describe('when lock files have agents', () => {
    it('returns sorted comma-separated agents', () => {
      const lockFile = createLockFile({
        agents: ['cursor', 'claude', 'packmind'],
      });

      const result = formatAgentsHeader([lockFile]);

      expect(result).toBe('  —  Agents: claude, cursor, packmind');
    });
  });

  describe('when multiple lock files have overlapping agents', () => {
    it('deduplicates agents across lock files', () => {
      const lockFile1 = createLockFile({ agents: ['claude', 'cursor'] });
      const lockFile2 = createLockFile({ agents: ['cursor', 'packmind'] });

      const result = formatAgentsHeader([lockFile1, lockFile2]);

      expect(result).toBe('  —  Agents: claude, cursor, packmind');
    });
  });

  describe('when no agents exist', () => {
    it('returns an empty string', () => {
      const lockFile = createLockFile({ agents: [] });

      const result = formatAgentsHeader([lockFile]);

      expect(result).toBe('');
    });
  });
});
