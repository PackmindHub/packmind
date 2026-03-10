import {
  createRecipeId,
  createRecipeVersionId,
  createSkillId,
  createSkillVersionId,
  createStandardId,
  createStandardVersionId,
  createUserId,
  FileModification,
  RecipeVersion,
  SkillVersion,
  StandardVersion,
} from '@packmind/types';
import {
  buildArtifactMetadataMap,
  enrichFileModificationsWithMetadata,
} from './ArtifactMetadataUtils';

describe('ArtifactMetadataUtils', () => {
  describe('buildArtifactMetadataMap', () => {
    describe('with all three artifact types', () => {
      const recipeId = createRecipeId('recipe-1');
      const standardId = createStandardId('standard-1');
      const skillId = createSkillId('skill-1');

      let result: ReturnType<typeof buildArtifactMetadataMap>;

      beforeEach(() => {
        const recipeVersions: RecipeVersion[] = [
          {
            id: createRecipeVersionId('rv-1'),
            recipeId,
            name: 'My Recipe',
            slug: 'my-recipe',
            content: 'content',
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
            description: 'desc',
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
            description: 'desc',
            prompt: 'prompt',
            version: 1,
            userId: createUserId('user-1'),
          },
        ];

        result = buildArtifactMetadataMap({
          recipes: {
            spaceIdMap: new Map([[recipeId as string, 'space-A']]),
            packageIdMap: new Map([[recipeId as string, ['pkg-1', 'pkg-2']]]),
            versions: recipeVersions,
          },
          standards: {
            spaceIdMap: new Map([[standardId as string, 'space-B']]),
            packageIdMap: new Map([[standardId as string, ['pkg-1']]]),
            versions: standardVersions,
          },
          skills: {
            spaceIdMap: new Map([[skillId as string, 'space-C']]),
            packageIdMap: new Map([[skillId as string, ['pkg-3']]]),
            versions: skillVersions,
          },
        });
      });

      it('maps recipe to command metadata', () => {
        expect(result.command.get(recipeId as string)).toEqual({
          spaceId: 'space-A',
          version: 3,
          slug: 'my-recipe',
          packageIds: ['pkg-1', 'pkg-2'],
        });
      });

      it('maps standard metadata', () => {
        expect(result.standard.get(standardId as string)).toEqual({
          spaceId: 'space-B',
          version: 2,
          slug: 'my-standard',
          packageIds: ['pkg-1'],
        });
      });

      it('maps skill metadata', () => {
        expect(result.skill.get(skillId as string)).toEqual({
          spaceId: 'space-C',
          version: 1,
          slug: 'my-skill',
          packageIds: ['pkg-3'],
        });
      });
    });

    it('skips entries without matching spaceId', () => {
      const recipeId = createRecipeId('recipe-no-space');

      const recipeVersions: RecipeVersion[] = [
        {
          id: createRecipeVersionId('rv-1'),
          recipeId,
          name: 'Orphan Recipe',
          slug: 'orphan-recipe',
          content: 'content',
          version: 1,
          userId: createUserId('user-1'),
        },
      ];

      const result = buildArtifactMetadataMap({
        recipes: {
          spaceIdMap: new Map(), // empty — no matching spaceId
          versions: recipeVersions,
        },
        standards: { spaceIdMap: new Map(), versions: [] },
        skills: { spaceIdMap: new Map(), versions: [] },
      });

      expect(result.command.size).toBe(0);
    });

    describe('with empty version arrays', () => {
      let result: ReturnType<typeof buildArtifactMetadataMap>;

      beforeEach(() => {
        result = buildArtifactMetadataMap({
          recipes: { spaceIdMap: new Map(), versions: [] },
          standards: { spaceIdMap: new Map(), versions: [] },
          skills: { spaceIdMap: new Map(), versions: [] },
        });
      });

      it('returns empty command map', () => {
        expect(result.command.size).toBe(0);
      });

      it('returns empty standard map', () => {
        expect(result.standard.size).toBe(0);
      });

      it('returns empty skill map', () => {
        expect(result.skill.size).toBe(0);
      });
    });
  });

  describe('enrichFileModificationsWithMetadata', () => {
    describe('with matching metadata', () => {
      const recipeId = createRecipeId('recipe-1');
      const standardId = createStandardId('standard-1');

      let files: FileModification[];

      beforeEach(() => {
        files = [
          {
            path: 'file1.md',
            content: 'c1',
            artifactType: 'command',
            artifactId: recipeId as string,
          },
          {
            path: 'file2.md',
            content: 'c2',
            artifactType: 'standard',
            artifactId: standardId as string,
          },
        ];

        const metadata = buildArtifactMetadataMap({
          recipes: {
            spaceIdMap: new Map([[recipeId as string, 'space-A']]),
            packageIdMap: new Map([[recipeId as string, ['pkg-1']]]),
            versions: [
              {
                id: createRecipeVersionId('rv-1'),
                recipeId,
                name: 'R',
                slug: 'r-slug',
                content: '',
                version: 5,
                userId: createUserId('u'),
              },
            ],
          },
          standards: {
            spaceIdMap: new Map([[standardId as string, 'space-B']]),
            packageIdMap: new Map([[standardId as string, ['pkg-2', 'pkg-3']]]),
            versions: [
              {
                id: createStandardVersionId('sv-1'),
                standardId,
                name: 'S',
                slug: 's-slug',
                description: '',
                version: 2,
                scope: null,
              },
            ],
          },
          skills: { spaceIdMap: new Map(), versions: [] },
        });

        enrichFileModificationsWithMetadata(files, metadata);
      });

      it('enriches command file with spaceId', () => {
        expect(files[0].spaceId).toBe('space-A');
      });

      it('enriches command file with version', () => {
        expect(files[0].artifactVersion).toBe(5);
      });

      it('enriches command file with slug', () => {
        expect(files[0].artifactSlug).toBe('r-slug');
      });

      it('enriches command file with packageIds', () => {
        expect(files[0].packageIds).toEqual(['pkg-1']);
      });

      it('enriches standard file with spaceId', () => {
        expect(files[1].spaceId).toBe('space-B');
      });

      it('enriches standard file with version', () => {
        expect(files[1].artifactVersion).toBe(2);
      });

      it('enriches standard file with slug', () => {
        expect(files[1].artifactSlug).toBe('s-slug');
      });

      it('enriches standard file with packageIds', () => {
        expect(files[1].packageIds).toEqual(['pkg-2', 'pkg-3']);
      });
    });

    describe('with files without artifactType or artifactId', () => {
      let files: FileModification[];

      beforeEach(() => {
        files = [
          { path: 'plain.md', content: 'no artifact info' },
          {
            path: 'partial.md',
            content: 'only type',
            artifactType: 'command',
          },
        ];

        const metadata = buildArtifactMetadataMap({
          recipes: { spaceIdMap: new Map(), versions: [] },
          standards: { spaceIdMap: new Map(), versions: [] },
          skills: { spaceIdMap: new Map(), versions: [] },
        });

        enrichFileModificationsWithMetadata(files, metadata);
      });

      it('does not enrich file without artifact info', () => {
        expect(files[0].spaceId).toBeUndefined();
      });

      it('does not enrich file with only artifactType', () => {
        expect(files[1].spaceId).toBeUndefined();
      });
    });

    describe('with no matching metadata entry', () => {
      let files: FileModification[];

      beforeEach(() => {
        files = [
          {
            path: 'unknown.md',
            content: 'c',
            artifactType: 'command',
            artifactId: 'non-existent-id',
          },
        ];

        const metadata = buildArtifactMetadataMap({
          recipes: { spaceIdMap: new Map(), versions: [] },
          standards: { spaceIdMap: new Map(), versions: [] },
          skills: { spaceIdMap: new Map(), versions: [] },
        });

        enrichFileModificationsWithMetadata(files, metadata);
      });

      it('does not set spaceId', () => {
        expect(files[0].spaceId).toBeUndefined();
      });

      it('does not set artifactVersion', () => {
        expect(files[0].artifactVersion).toBeUndefined();
      });
    });
  });
});
