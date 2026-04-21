import {
  createRecipeId,
  createRecipeVersionId,
  createSkillId,
  createSkillVersionId,
  createStandardId,
  createStandardVersionId,
  createUserId,
  FileModification,
  PackmindLockFile,
  RecipeVersion,
  SkillVersion,
  StandardVersion,
} from '@packmind/types';
import { PackmindLockFileService } from './PackmindLockFileService';

describe('PackmindLockFileService', () => {
  let service: PackmindLockFileService;
  const FIXED_DATE = '2024-06-15T10:30:00.000Z';

  beforeEach(() => {
    service = new PackmindLockFileService();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(FIXED_DATE));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('buildLockFile', () => {
    const recipeId = createRecipeId('recipe-1');
    const standardId = createStandardId('standard-1');
    const skillId = createSkillId('skill-1');

    const recipeVersions: RecipeVersion[] = [
      {
        id: createRecipeVersionId('rv-1'),
        recipeId,
        name: 'My Recipe',
        slug: 'my-recipe',
        content: 'recipe content',
        version: 3,
        userId: createUserId('user-1'),
      },
    ];

    const standardVersions: StandardVersion[] = [
      {
        id: createStandardVersionId('sv-1'),
        standardId,
        name: 'My Standard',
        slug: 'my-standard',
        description: 'standard desc',
        version: 2,
        scope: null,
      },
    ];

    const skillVersions: SkillVersion[] = [
      {
        id: createSkillVersionId('skv-1'),
        skillId,
        name: 'My Skill',
        slug: 'my-skill',
        description: 'skill desc',
        prompt: 'skill prompt',
        version: 1,
        userId: createUserId('user-1'),
      },
    ];

    describe('with recipe, standard, and skill versions', () => {
      let result: PackmindLockFile;

      beforeEach(() => {
        const fileModifications: FileModification[] = [
          {
            path: '.claude/commands/my-recipe.md',
            content: 'recipe content',
            artifactType: 'command',
            artifactId: String(recipeId),
          },
          {
            path: '.claude/rules/my-standard.md',
            content: 'standard content',
            artifactType: 'standard',
            artifactId: String(standardId),
          },
          {
            path: '.claude/skills/my-skill/SKILL.md',
            content: 'skill content',
            artifactType: 'skill',
            artifactId: String(skillId),
          },
        ];

        result = service.buildLockFile({
          fileModifications,
          recipeVersions,
          standardVersions,
          skillVersions,
          codingAgents: ['claude'],
          packageSlugs: ['my-package'],
          targetId: 'target-1',
          artifactSpaceIds: {
            [String(recipeId)]: 'space-A',
            [String(standardId)]: 'space-B',
            [String(skillId)]: 'space-C',
          },
          artifactPackageIds: {
            [String(recipeId)]: ['pkg-1'],
            [String(standardId)]: ['pkg-2'],
            [String(skillId)]: ['pkg-3'],
          },
        });
      });

      it('returns lockfileVersion 1', () => {
        expect(result.lockfileVersion).toBe(1);
      });

      it('returns the targetId', () => {
        expect(result.targetId).toBe('target-1');
      });

      it('includes recipe artifact with correct metadata', () => {
        expect(result.artifacts['command:my-recipe']).toEqual({
          name: 'My Recipe',
          type: 'command',
          id: String(recipeId),
          version: 3,
          spaceId: 'space-A',
          packageIds: ['pkg-1'],
          files: [{ path: '.claude/commands/my-recipe.md', agent: 'claude' }],
        });
      });

      it('includes standard artifact with correct metadata', () => {
        expect(result.artifacts['standard:my-standard']).toEqual({
          name: 'My Standard',
          type: 'standard',
          id: String(standardId),
          version: 2,
          spaceId: 'space-B',
          packageIds: ['pkg-2'],
          files: [{ path: '.claude/rules/my-standard.md', agent: 'claude' }],
        });
      });

      it('includes skill artifact with isSkillDefinition for SKILL.md', () => {
        expect(result.artifacts['skill:my-skill']).toEqual({
          name: 'My Skill',
          type: 'skill',
          id: String(skillId),
          version: 1,
          spaceId: 'space-C',
          packageIds: ['pkg-3'],
          files: [
            {
              path: '.claude/skills/my-skill/SKILL.md',
              agent: 'claude',
              isSkillDefinition: true,
            },
          ],
        });
      });
    });

    describe('when file modifications have no artifactType or artifactId', () => {
      it('skips files without artifactType', () => {
        const fileModifications: FileModification[] = [
          {
            path: '.claude/commands/some-file.md',
            content: 'content',
            artifactId: String(recipeId),
          },
        ];

        const result = service.buildLockFile({
          fileModifications,
          recipeVersions,
          standardVersions: [],
          skillVersions: [],
          codingAgents: ['claude'],
          packageSlugs: [],
          targetId: 'target-1',
          artifactSpaceIds: {},
          artifactPackageIds: {},
        });

        expect(result.artifacts).toEqual({});
      });

      it('skips files without artifactId', () => {
        const fileModifications: FileModification[] = [
          {
            path: '.claude/commands/some-file.md',
            content: 'content',
            artifactType: 'command',
          },
        ];

        const result = service.buildLockFile({
          fileModifications,
          recipeVersions,
          standardVersions: [],
          skillVersions: [],
          codingAgents: ['claude'],
          packageSlugs: [],
          targetId: 'target-1',
          artifactSpaceIds: {},
          artifactPackageIds: {},
        });

        expect(result.artifacts).toEqual({});
      });
    });

    describe('when file path does not match any known pattern', () => {
      it('skips files that resolveArtefactFromPath cannot resolve', () => {
        const fileModifications: FileModification[] = [
          {
            path: 'src/some-random-file.ts',
            content: 'content',
            artifactType: 'command',
            artifactId: String(recipeId),
          },
        ];

        const result = service.buildLockFile({
          fileModifications,
          recipeVersions,
          standardVersions: [],
          skillVersions: [],
          codingAgents: ['claude'],
          packageSlugs: [],
          targetId: 'target-1',
          artifactSpaceIds: {},
          artifactPackageIds: {},
        });

        expect(result.artifacts).toEqual({});
      });
    });

    describe('when multiple files belong to the same artifact', () => {
      it('groups files under one artifact entry', () => {
        const fileModifications: FileModification[] = [
          {
            path: '.claude/commands/my-recipe.md',
            content: 'claude content',
            artifactType: 'command',
            artifactId: String(recipeId),
          },
          {
            path: '.cursor/commands/my-recipe.md',
            content: 'cursor content',
            artifactType: 'command',
            artifactId: String(recipeId),
          },
        ];

        const result = service.buildLockFile({
          fileModifications,
          recipeVersions,
          standardVersions: [],
          skillVersions: [],
          codingAgents: ['claude', 'cursor'],
          packageSlugs: ['pkg-a'],
          targetId: 'target-1',
          artifactSpaceIds: { [String(recipeId)]: 'space-A' },
          artifactPackageIds: { [String(recipeId)]: ['pkg-1'] },
        });

        expect(result.artifacts['command:my-recipe'].files).toEqual([
          { path: '.claude/commands/my-recipe.md', agent: 'claude' },
          { path: '.cursor/commands/my-recipe.md', agent: 'cursor' },
        ]);
      });
    });

    describe('when skill files have skillFileId', () => {
      let result: ReturnType<typeof service.buildLockFile>;

      beforeEach(() => {
        const fileModifications: FileModification[] = [
          {
            path: '.claude/skills/my-skill/SKILL.md',
            content: 'skill definition',
            artifactType: 'skill',
            artifactId: String(skillId),
          },
          {
            path: '.claude/skills/my-skill/helper.ts',
            content: 'skill file content',
            artifactType: 'skill',
            artifactId: String(skillId),
            skillFileId: 'file-1',
          },
        ];

        result = service.buildLockFile({
          fileModifications,
          recipeVersions: [],
          standardVersions: [],
          skillVersions,
          codingAgents: ['claude'],
          packageSlugs: [],
          targetId: 'target-1',
          artifactSpaceIds: { [String(skillId)]: 'space-C' },
          artifactPackageIds: { [String(skillId)]: ['pkg-3'] },
        });
      });

      it('sets isSkillDefinition for the skill definition file', () => {
        expect(result.artifacts['skill:my-skill'].files[0]).toEqual({
          path: '.claude/skills/my-skill/SKILL.md',
          agent: 'claude',
          isSkillDefinition: true,
        });
      });

      it('does not set isSkillDefinition for files with skillFileId', () => {
        expect(result.artifacts['skill:my-skill'].files[1]).toEqual({
          path: '.claude/skills/my-skill/helper.ts',
          agent: 'claude',
        });
      });
    });

    describe('when packageSlugs and agents need sorting', () => {
      it('sorts packageSlugs alphabetically', () => {
        const result = service.buildLockFile({
          fileModifications: [],
          recipeVersions: [],
          standardVersions: [],
          skillVersions: [],
          codingAgents: [],
          packageSlugs: ['zebra', 'alpha', 'mango'],
          targetId: 'target-1',
          artifactSpaceIds: {},
          artifactPackageIds: {},
        });

        expect(result.packageSlugs).toEqual(['alpha', 'mango', 'zebra']);
      });

      it('sorts agents alphabetically', () => {
        const result = service.buildLockFile({
          fileModifications: [],
          recipeVersions: [],
          standardVersions: [],
          skillVersions: [],
          codingAgents: ['cursor', 'claude', 'copilot'],
          packageSlugs: [],
          targetId: 'target-1',
          artifactSpaceIds: {},
          artifactPackageIds: {},
        });

        expect(result.agents).toEqual(['claude', 'copilot', 'cursor']);
      });
    });

    describe('when file modifications are empty', () => {
      it('produces empty artifacts', () => {
        const result = service.buildLockFile({
          fileModifications: [],
          recipeVersions,
          standardVersions,
          skillVersions,
          codingAgents: ['claude'],
          packageSlugs: ['my-package'],
          targetId: 'target-1',
          artifactSpaceIds: {},
          artifactPackageIds: {},
        });

        expect(result.artifacts).toEqual({});
      });
    });

    describe('when targetId is not provided', () => {
      it('returns undefined targetId', () => {
        const result = service.buildLockFile({
          fileModifications: [],
          recipeVersions: [],
          standardVersions: [],
          skillVersions: [],
          codingAgents: ['claude'],
          packageSlugs: ['my-package'],
          artifactSpaceIds: {},
          artifactPackageIds: {},
        });

        expect(result.targetId).toBeUndefined();
      });
    });

    describe('when artifactSpaceIds or artifactPackageIds are missing for an artifact', () => {
      let result: ReturnType<typeof service.buildLockFile>;

      beforeEach(() => {
        const fileModifications: FileModification[] = [
          {
            path: '.claude/commands/my-recipe.md',
            content: 'content',
            artifactType: 'command',
            artifactId: String(recipeId),
          },
        ];

        result = service.buildLockFile({
          fileModifications,
          recipeVersions,
          standardVersions: [],
          skillVersions: [],
          codingAgents: ['claude'],
          packageSlugs: [],
          targetId: 'target-1',
          artifactSpaceIds: {},
          artifactPackageIds: {},
        });
      });

      it('defaults spaceId to empty string', () => {
        expect(result.artifacts['command:my-recipe'].spaceId).toBe('');
      });

      it('defaults packageIds to empty array', () => {
        expect(result.artifacts['command:my-recipe'].packageIds).toEqual([]);
      });
    });
  });

  describe('mergeWithExistingLockFile', () => {
    const newLockFile: PackmindLockFile = {
      lockfileVersion: 1,
      packageSlugs: ['@team-a/pkg-a'],
      agents: ['claude'],
      targetId: 'target-1',
      artifacts: {
        'standard:accessible-standard': {
          name: 'Accessible Standard',
          type: 'standard',
          id: 'std-1',
          version: 2,
          spaceId: 'space-accessible',
          packageIds: ['pkg-a'],
          files: [
            { path: '.claude/rules/accessible-standard.md', agent: 'claude' },
          ],
        },
      },
    };

    describe('when existingLockFile is null', () => {
      it('returns newLockFile unchanged', () => {
        const result = service.mergeWithExistingLockFile(newLockFile, null, [
          'pkg-a',
        ]);

        expect(result).toEqual(newLockFile);
      });
    });

    describe('when all existing entries also exist in the new lock file', () => {
      it('returns newLockFile without preserving old entries', () => {
        const existingLockFile: PackmindLockFile = {
          lockfileVersion: 1,
          packageSlugs: ['@team-a/pkg-a'],
          agents: ['claude'],
          targetId: 'target-1',
          artifacts: {
            'standard:accessible-standard': {
              name: 'Accessible Standard OLD',
              type: 'standard',
              id: 'std-1',
              version: 1,
              spaceId: 'space-accessible',
              packageIds: ['pkg-a'],
              files: [
                {
                  path: '.claude/rules/accessible-standard.md',
                  agent: 'claude',
                },
              ],
            },
          },
        };

        const result = service.mergeWithExistingLockFile(
          newLockFile,
          existingLockFile,
          ['pkg-a'],
        );

        expect(result.artifacts['standard:accessible-standard'].version).toBe(
          2,
        );
      });
    });

    describe('when existing entries belong to inaccessible packages', () => {
      const existingLockFile: PackmindLockFile = {
        lockfileVersion: 1,
        packageSlugs: ['@team-a/pkg-a', '@private-team/pkg-private'],
        agents: ['claude'],
        targetId: 'target-1',
        artifacts: {
          'standard:accessible-standard': {
            name: 'Accessible Standard OLD',
            type: 'standard',
            id: 'std-1',
            version: 1,
            spaceId: 'space-accessible',
            packageIds: ['pkg-a'],
            files: [
              {
                path: '.claude/rules/accessible-standard.md',
                agent: 'claude',
              },
            ],
          },
          'command:private-recipe': {
            name: 'Private Recipe',
            type: 'command',
            id: 'recipe-private',
            version: 5,
            spaceId: 'space-private',
            packageIds: ['pkg-private'],
            files: [
              {
                path: '.claude/commands/private-recipe.md',
                agent: 'claude',
              },
            ],
          },
        },
      };

      let result: PackmindLockFile;

      beforeEach(() => {
        result = service.mergeWithExistingLockFile(
          newLockFile,
          existingLockFile,
          ['pkg-a'],
        );
      });

      it('preserves inaccessible artifact entries in the merged result', () => {
        expect(result.artifacts['command:private-recipe']).toEqual(
          existingLockFile.artifacts['command:private-recipe'],
        );
      });

      it('keeps new entries taking precedence over existing ones', () => {
        expect(result.artifacts['standard:accessible-standard']).toEqual(
          newLockFile.artifacts['standard:accessible-standard'],
        );
      });

      it('preserves package slugs from inaccessible packages, sorted', () => {
        expect(result.packageSlugs).toEqual([
          '@private-team/pkg-private',
          '@team-a/pkg-a',
        ]);
      });
    });

    describe('when new entry has empty packageIds but existing has metadata', () => {
      const newLockFileWithEmptyMetadata: PackmindLockFile = {
        lockfileVersion: 1,
        packageSlugs: ['@team-a/pkg-a'],
        agents: ['claude'],
        targetId: 'target-1',
        artifacts: {
          'command:moved-recipe': {
            name: 'Moved Recipe',
            type: 'command',
            id: 'recipe-moved',
            version: 1,
            spaceId: '',
            packageIds: [],
            files: [
              {
                path: '.claude/commands/moved-recipe.md',
                agent: 'claude',
              },
            ],
          },
        },
      };

      const existingLockFile: PackmindLockFile = {
        lockfileVersion: 1,
        packageSlugs: ['@team-a/pkg-a', '@private-team/pkg-private'],
        agents: ['claude'],
        targetId: 'target-1',
        artifacts: {
          'command:moved-recipe': {
            name: 'Moved Recipe',
            type: 'command',
            id: 'recipe-moved',
            version: 1,
            spaceId: 'space-private',
            packageIds: ['pkg-private'],
            files: [
              {
                path: '.claude/commands/moved-recipe.md',
                agent: 'claude',
              },
            ],
          },
        },
      };

      let result: PackmindLockFile;

      beforeEach(() => {
        result = service.mergeWithExistingLockFile(
          newLockFileWithEmptyMetadata,
          existingLockFile,
          ['pkg-a'],
        );
      });

      it('preserves existing spaceId', () => {
        expect(result.artifacts['command:moved-recipe'].spaceId).toBe(
          'space-private',
        );
      });

      it('preserves existing packageIds', () => {
        expect(result.artifacts['command:moved-recipe'].packageIds).toEqual([
          'pkg-private',
        ]);
      });
    });

    describe('when artifact was removed from an accessible package', () => {
      it('does not preserve the removed artifact', () => {
        const existingLockFile: PackmindLockFile = {
          lockfileVersion: 1,
          packageSlugs: ['@team-a/pkg-a'],
          agents: ['claude'],
          targetId: 'target-1',
          artifacts: {
            'command:removed-recipe': {
              name: 'Removed Recipe',
              type: 'command',
              id: 'recipe-removed',
              version: 1,
              spaceId: 'space-a',
              packageIds: ['pkg-a'],
              files: [
                {
                  path: '.claude/commands/removed-recipe.md',
                  agent: 'claude',
                },
              ],
            },
          },
        };

        const result = service.mergeWithExistingLockFile(
          newLockFile,
          existingLockFile,
          ['pkg-a'],
        );

        expect(result.artifacts['command:removed-recipe']).toBeUndefined();
      });
    });

    describe('when existing lock file has duplicate package slugs with new', () => {
      it('deduplicates package slugs', () => {
        const existingLockFile: PackmindLockFile = {
          lockfileVersion: 1,
          packageSlugs: ['@team-a/pkg-a', '@team-b/pkg-b'],
          agents: ['claude'],
          targetId: 'target-1',
          artifacts: {},
        };

        const result = service.mergeWithExistingLockFile(
          newLockFile,
          existingLockFile,
          ['pkg-a'],
        );

        expect(result.packageSlugs).toEqual(['@team-a/pkg-a', '@team-b/pkg-b']);
      });
    });
  });

  describe('createLockFileModification', () => {
    it('returns a FileModification with path packmind-lock.json', () => {
      const lockFile: PackmindLockFile = {
        lockfileVersion: 1,
        packageSlugs: ['my-package'],
        agents: ['claude'],
        targetId: 'target-1',
        artifacts: {},
      };

      const result = service.createLockFileModification(lockFile);

      expect(result.path).toBe('packmind-lock.json');
    });

    it('returns prettified JSON content with trailing newline', () => {
      const lockFile: PackmindLockFile = {
        lockfileVersion: 1,
        packageSlugs: ['pkg-a'],
        agents: ['claude'],
        targetId: 'target-1',
        artifacts: {},
      };

      const result = service.createLockFileModification(lockFile);

      expect(result.content).toBe(JSON.stringify(lockFile, null, 2) + '\n');
    });

    it('returns parseable JSON that matches the input lock file', () => {
      const lockFile: PackmindLockFile = {
        lockfileVersion: 1,
        packageSlugs: ['pkg-a', 'pkg-b'],
        agents: ['claude', 'cursor'],
        targetId: 'target-1',
        artifacts: {
          'command:my-recipe': {
            name: 'My Recipe',
            type: 'command',
            id: 'recipe-1',
            version: 3,
            spaceId: 'space-A',
            packageIds: ['pkg-1'],
            files: [{ path: '.claude/commands/my-recipe.md', agent: 'claude' }],
          },
        },
      };

      const result = service.createLockFileModification(lockFile);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- content is always set for non-section FileModification
      const parsed = JSON.parse(result.content!);

      expect(parsed).toEqual(lockFile);
    });
  });
});
