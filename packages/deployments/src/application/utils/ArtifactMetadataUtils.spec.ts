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
    it('should map all three artifact types correctly', () => {
      const recipeId = createRecipeId('recipe-1');
      const standardId = createStandardId('standard-1');
      const skillId = createSkillId('skill-1');

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

      const result = buildArtifactMetadataMap({
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

      expect(result.command.get(recipeId as string)).toEqual({
        spaceId: 'space-A',
        version: 3,
        slug: 'my-recipe',
        packageIds: ['pkg-1', 'pkg-2'],
      });
      expect(result.standard.get(standardId as string)).toEqual({
        spaceId: 'space-B',
        version: 2,
        slug: 'my-standard',
        packageIds: ['pkg-1'],
      });
      expect(result.skill.get(skillId as string)).toEqual({
        spaceId: 'space-C',
        version: 1,
        slug: 'my-skill',
        packageIds: ['pkg-3'],
      });
    });

    it('should skip entries without matching spaceId', () => {
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

    it('should handle empty version arrays', () => {
      const result = buildArtifactMetadataMap({
        recipes: { spaceIdMap: new Map(), versions: [] },
        standards: { spaceIdMap: new Map(), versions: [] },
        skills: { spaceIdMap: new Map(), versions: [] },
      });

      expect(result.command.size).toBe(0);
      expect(result.standard.size).toBe(0);
      expect(result.skill.size).toBe(0);
    });
  });

  describe('enrichFileModificationsWithMetadata', () => {
    it('should enrich files with matching metadata', () => {
      const recipeId = createRecipeId('recipe-1');
      const standardId = createStandardId('standard-1');

      const files: FileModification[] = [
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

      expect(files[0].spaceId).toBe('space-A');
      expect(files[0].artifactVersion).toBe(5);
      expect(files[0].artifactSlug).toBe('r-slug');
      expect(files[0].packageIds).toEqual(['pkg-1']);

      expect(files[1].spaceId).toBe('space-B');
      expect(files[1].artifactVersion).toBe(2);
      expect(files[1].artifactSlug).toBe('s-slug');
      expect(files[1].packageIds).toEqual(['pkg-2', 'pkg-3']);
    });

    it('should skip files without artifactType or artifactId', () => {
      const files: FileModification[] = [
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

      expect(files[0].spaceId).toBeUndefined();
      expect(files[1].spaceId).toBeUndefined();
    });

    it('should skip files with no matching metadata entry', () => {
      const files: FileModification[] = [
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

      expect(files[0].spaceId).toBeUndefined();
      expect(files[0].artifactVersion).toBeUndefined();
    });
  });
});
