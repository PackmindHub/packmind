import {
  adoptArtifactIntoLockFile,
  resolveExistingArtifact,
} from './linkExistingArtifact';
import { PackmindCliHexa } from '../../../../PackmindCliHexa';
import { PackmindLockFile } from '@packmind/types';

describe('resolveExistingArtifact', () => {
  const buildHexa = (overrides: Record<string, unknown> = {}) =>
    ({
      listStandards: jest.fn().mockResolvedValue([]),
      listCommands: jest.fn().mockResolvedValue([]),
      listSkills: jest.fn().mockResolvedValue([]),
      ...overrides,
    }) as unknown as PackmindCliHexa;

  afterEach(() => jest.clearAllMocks());

  describe('when a standard with a matching slug exists in the space', () => {
    let listStandards: jest.Mock;
    let result: Awaited<ReturnType<typeof resolveExistingArtifact>>;

    beforeEach(async () => {
      listStandards = jest
        .fn()
        .mockResolvedValue([
          { id: 'std-1', name: 'My Standard', spaceId: 'space-123' },
        ]);
      const hexa = buildHexa({ listStandards });

      result = await resolveExistingArtifact(
        hexa,
        'standard',
        'space-123',
        'my standard',
      );
    });

    it('returns its id and server-side name', () => {
      expect(result).toEqual({ id: 'std-1', name: 'My Standard' });
    });

    it('queries standards scoped to the space', () => {
      expect(listStandards).toHaveBeenCalledWith({ spaceId: 'space-123' });
    });
  });

  describe('when no artifact slug matches', () => {
    it('returns null', async () => {
      const hexa = buildHexa({
        listStandards: jest
          .fn()
          .mockResolvedValue([{ id: 'std-1', name: 'Another Standard' }]),
      });

      const result = await resolveExistingArtifact(
        hexa,
        'standard',
        'space-123',
        'My Standard',
      );

      expect(result).toBeNull();
    });
  });

  describe('when resolving a command', () => {
    const listCommands = jest
      .fn()
      .mockResolvedValue([{ id: 'cmd-1', name: 'My Command' }]);

    it('queries commands scoped to the space', async () => {
      const hexa = buildHexa({ listCommands });

      await resolveExistingArtifact(hexa, 'command', 'space-123', 'My Command');

      expect(listCommands).toHaveBeenCalledWith({ spaceId: 'space-123' });
    });

    it('returns the matching command id and name', async () => {
      const hexa = buildHexa({ listCommands });

      const result = await resolveExistingArtifact(
        hexa,
        'command',
        'space-123',
        'My Command',
      );

      expect(result).toEqual({ id: 'cmd-1', name: 'My Command' });
    });
  });

  describe('when resolving a skill', () => {
    const listSkills = jest
      .fn()
      .mockResolvedValue([
        { id: 'skill-1', slug: 'my-skill', name: 'My Skill' },
      ]);

    it('queries skills scoped to the space', async () => {
      const hexa = buildHexa({ listSkills });

      await resolveExistingArtifact(hexa, 'skill', 'space-123', 'My Skill');

      expect(listSkills).toHaveBeenCalledWith({ spaceId: 'space-123' });
    });

    it('returns the matching skill id and name', async () => {
      const hexa = buildHexa({ listSkills });

      const result = await resolveExistingArtifact(
        hexa,
        'skill',
        'space-123',
        'My Skill',
      );

      expect(result).toEqual({ id: 'skill-1', name: 'My Skill' });
    });
  });
});

describe('adoptArtifactIntoLockFile', () => {
  const artifact = {
    id: 'std-1',
    name: 'My Standard',
    type: 'standard' as const,
    version: 3,
    spaceId: 'space-123',
  };

  afterEach(() => jest.clearAllMocks());

  describe('when no lockfile exists', () => {
    it('creates a minimal v2 lockfile holding the adopted entry', () => {
      const result = adoptArtifactIntoLockFile({
        lockFile: null,
        artifact,
        relativeFilePath: '.claude/rules/packmind/standard-my-standard.md',
        agent: 'claude',
      });

      expect(result).toEqual({
        lockfileVersion: 2,
        packageSlugs: [],
        agents: [],
        artifacts: {
          'user:standard:my-standard': {
            name: 'My Standard',
            type: 'standard',
            id: 'std-1',
            version: 3,
            spaceId: 'space-123',
            packageIds: [],
            source: 'user',
            files: [
              {
                path: '.claude/rules/packmind/standard-my-standard.md',
                agent: 'claude',
              },
            ],
          },
        },
      });
    });
  });

  describe('when the entry already exists under another agent path', () => {
    const existingLockFile: PackmindLockFile = {
      lockfileVersion: 2,
      packageSlugs: ['my-package'],
      agents: ['copilot'],
      artifacts: {
        'user:standard:my-standard': {
          name: 'My Standard',
          type: 'standard',
          id: 'std-1',
          version: 2,
          spaceId: 'space-123',
          packageIds: ['pkg-1'],
          source: 'user',
          files: [
            {
              path: '.github/instructions/packmind-my-standard.instructions.md',
              agent: 'copilot',
            },
          ],
        },
      },
    };

    it('appends the new file path and refreshes the version', () => {
      const result = adoptArtifactIntoLockFile({
        lockFile: existingLockFile,
        artifact,
        relativeFilePath: '.claude/rules/packmind/standard-my-standard.md',
        agent: 'claude',
      });

      expect(result.artifacts['user:standard:my-standard']).toEqual({
        name: 'My Standard',
        type: 'standard',
        id: 'std-1',
        version: 3,
        spaceId: 'space-123',
        packageIds: ['pkg-1'],
        source: 'user',
        files: [
          {
            path: '.github/instructions/packmind-my-standard.instructions.md',
            agent: 'copilot',
          },
          {
            path: '.claude/rules/packmind/standard-my-standard.md',
            agent: 'claude',
          },
        ],
      });
    });

    it('does not duplicate an already-tracked path', () => {
      const result = adoptArtifactIntoLockFile({
        lockFile: existingLockFile,
        artifact,
        relativeFilePath:
          '.github/instructions/packmind-my-standard.instructions.md',
        agent: 'copilot',
      });

      expect(result.artifacts['user:standard:my-standard'].files).toHaveLength(
        1,
      );
    });
  });

  describe('when adopting over an existing entry', () => {
    let existingLockFile: PackmindLockFile;

    beforeEach(() => {
      existingLockFile = {
        lockfileVersion: 2,
        packageSlugs: ['my-package'],
        agents: ['copilot'],
        artifacts: {
          'user:standard:my-standard': {
            name: 'My Standard',
            type: 'standard',
            id: 'std-1',
            version: 2,
            spaceId: 'space-123',
            packageIds: ['pkg-1'],
            source: 'user',
            files: [
              {
                path: '.github/instructions/packmind-my-standard.instructions.md',
                agent: 'copilot',
              },
            ],
          },
        },
      };

      adoptArtifactIntoLockFile({
        lockFile: existingLockFile,
        artifact,
        relativeFilePath: '.claude/rules/packmind/standard-my-standard.md',
        agent: 'claude',
      });
    });

    it('keeps the input files untouched', () => {
      expect(
        existingLockFile.artifacts['user:standard:my-standard'].files,
      ).toHaveLength(1);
    });

    it('keeps the input version untouched', () => {
      expect(
        existingLockFile.artifacts['user:standard:my-standard'].version,
      ).toBe(2);
    });
  });
});
