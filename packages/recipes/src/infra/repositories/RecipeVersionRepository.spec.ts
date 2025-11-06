import { itHandlesSoftDelete } from '@packmind/test-utils';
import { RecipeVersionRepository } from './RecipeVersionRepository';
import { RecipeVersionSchema } from '../schemas/RecipeVersionSchema';
import { RecipeSchema } from '../schemas/RecipeSchema';
import { DataSource } from 'typeorm';
import { makeTestDatasource } from '@packmind/test-utils';
import { recipeFactory } from '../../../test/recipeFactory';
import { recipeVersionFactory } from '../../../test/recipeVersionFactory';
import { RecipeRepository } from './RecipeRepository';
import { createRecipeId, Recipe } from '../../domain/entities/Recipe';
import { RecipeVersion } from '../../domain/entities/RecipeVersion';

import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { createGitCommit, gitCommitFactory } from '@packmind/git/test';
import { GitCommitSchema } from '@packmind/git';

describe('RecipeVersionRepository', () => {
  let datasource: DataSource;
  let recipeVersionRepository: RecipeVersionRepository;
  let recipeRepository: RecipeRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let testRecipe: Recipe;

  beforeEach(async () => {
    datasource = await makeTestDatasource([
      RecipeSchema,
      RecipeVersionSchema,
      GitCommitSchema,
    ]);
    await datasource.initialize();
    await datasource.synchronize();

    stubbedLogger = stubLogger();

    recipeVersionRepository = new RecipeVersionRepository(
      datasource.getRepository(RecipeVersionSchema),
      stubbedLogger,
    );

    recipeRepository = new RecipeRepository(
      datasource.getRepository(RecipeSchema),
      stubbedLogger,
    );

    // Create a test recipe for soft delete tests
    testRecipe = recipeFactory();
    await recipeRepository.add(testRecipe);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await datasource.destroy();
  });

  itHandlesSoftDelete<RecipeVersion>({
    entityFactory: () => recipeVersionFactory({ recipeId: testRecipe.id }),
    getRepository: () => recipeVersionRepository,
    queryDeletedEntity: async (id) =>
      datasource.getRepository(RecipeVersionSchema).findOne({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { id: id as any },
        withDeleted: true,
      }),
  });

  it('can store and retrieve recipe versions', async () => {
    const recipe = recipeFactory();
    await recipeRepository.add(recipe);

    const recipeVersion = recipeVersionFactory({ recipeId: recipe.id });
    await recipeVersionRepository.add(recipeVersion);

    expect(await recipeVersionRepository.list()).toStrictEqual([
      { ...recipeVersion, gitCommit: null },
    ]);
  });

  it('can store and retrieve multiple recipe versions', async () => {
    // Create recipes first
    const recipe1 = recipeFactory();
    const recipe2 = recipeFactory();
    const recipe3 = recipeFactory();

    await recipeRepository.add(recipe1);
    await recipeRepository.add(recipe2);
    await recipeRepository.add(recipe3);

    // Then create recipe versions with valid recipeIds
    await recipeVersionRepository.add(
      recipeVersionFactory({ recipeId: recipe1.id }),
    );
    await recipeVersionRepository.add(
      recipeVersionFactory({ recipeId: recipe2.id }),
    );
    await recipeVersionRepository.add(
      recipeVersionFactory({ recipeId: recipe3.id }),
    );

    expect(await recipeVersionRepository.list()).toHaveLength(3);
  });

  it('can find recipe versions by recipeId', async () => {
    const recipe = recipeFactory();
    // Save the recipe to the database
    await recipeRepository.add(recipe);

    const recipeVersion1 = recipeVersionFactory({
      recipeId: recipe.id,
      version: 1,
    });
    const recipeVersion2 = recipeVersionFactory({
      recipeId: recipe.id,
      version: 2,
    });
    const recipeVersion3 = recipeVersionFactory({
      recipeId: recipe.id,
      version: 3,
    });

    await recipeVersionRepository.add(recipeVersion1);
    await recipeVersionRepository.add(recipeVersion2);
    await recipeVersionRepository.add(recipeVersion3);

    // Add a version for a different recipe
    const anotherRecipe = recipeFactory();
    await recipeRepository.add(anotherRecipe);
    await recipeVersionRepository.add(
      recipeVersionFactory({ recipeId: anotherRecipe.id }),
    );

    const versions = await recipeVersionRepository.findByRecipeId(recipe.id);

    expect(versions).toEqual(
      [recipeVersion3, recipeVersion2, recipeVersion1].map((v) => ({
        ...v,
        gitCommit: null,
      })),
    );
  });

  it('can find the latest recipe version by recipeId', async () => {
    const recipe = recipeFactory();
    // Save the recipe to the database
    await recipeRepository.add(recipe);

    const recipeVersion1 = recipeVersionFactory({
      recipeId: recipe.id,
      version: 1,
    });
    const recipeVersion2 = recipeVersionFactory({
      recipeId: recipe.id,
      version: 2,
    });
    const recipeVersion3 = recipeVersionFactory({
      recipeId: recipe.id,
      version: 3,
    });

    await recipeVersionRepository.add(recipeVersion1);
    await recipeVersionRepository.add(recipeVersion2);
    await recipeVersionRepository.add(recipeVersion3);

    const latestVersion = await recipeVersionRepository.findLatestByRecipeId(
      recipe.id,
    );
    expect(latestVersion).toEqual({ ...recipeVersion3, gitCommit: null });
  });

  it('returns null for non-existent recipe latest version', async () => {
    const latestVersion = await recipeVersionRepository.findLatestByRecipeId(
      createRecipeId(uuidv4()),
    );
    expect(latestVersion).toBeNull();
  });

  it('can find a specific recipe version by recipeId and version', async () => {
    const recipe = recipeFactory();
    // Save the recipe to the database
    await recipeRepository.add(recipe);

    const recipeVersion1 = recipeVersionFactory({
      recipeId: recipe.id,
      version: 1,
    });
    const recipeVersion2 = recipeVersionFactory({
      recipeId: recipe.id,
      version: 2,
    });
    const recipeVersion3 = recipeVersionFactory({
      recipeId: recipe.id,
      version: 3,
    });

    await recipeVersionRepository.add(recipeVersion1);
    await recipeVersionRepository.add(recipeVersion2);
    await recipeVersionRepository.add(recipeVersion3);

    const foundVersion = await recipeVersionRepository.findByRecipeIdAndVersion(
      recipe.id,
      2,
    );
    expect(foundVersion).toEqual(recipeVersion2);
  });

  it('returns null for non-existent version of existing recipe', async () => {
    const recipe = recipeFactory();
    // Save the recipe to the database
    await recipeRepository.add(recipe);

    const recipeVersion1 = recipeVersionFactory({
      recipeId: recipe.id,
      version: 1,
    });

    await recipeVersionRepository.add(recipeVersion1);

    const foundVersion = await recipeVersionRepository.findByRecipeIdAndVersion(
      recipe.id,
      5, // Non-existent version
    );
    expect(foundVersion).toBeNull();
  });

  it('returns null for version of non-existent recipe', async () => {
    const foundVersion = await recipeVersionRepository.findByRecipeIdAndVersion(
      createRecipeId(uuidv4()), // Non-existent recipe ID
      1,
    );
    expect(foundVersion).toBeNull();
  });

  describe('GitCommit embedding', () => {
    it('embeds GitCommit if available', async () => {
      // Create a recipe
      const recipe = recipeFactory();
      await recipeRepository.add(recipe);

      // Create a git commit (without id for the add method)
      const gitCommitData = gitCommitFactory();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...gitCommitWithoutId } = gitCommitData;
      const savedGitCommit = await createGitCommit(
        datasource,
        gitCommitWithoutId,
      );

      // Create a recipe version with the git commit
      const recipeVersion = recipeVersionFactory({
        recipeId: recipe.id,
        gitCommit: savedGitCommit,
      });
      await recipeVersionRepository.add(recipeVersion);

      // Find versions by recipe ID
      const versions = await recipeVersionRepository.findByRecipeId(recipe.id);

      expect(versions).toHaveLength(1);
      expect(versions[0].gitCommit).toBeDefined();
      expect(versions[0].gitCommit).toEqual(savedGitCommit);
    });

    it('returns null gitCommit if not available', async () => {
      // Create a recipe
      const recipe = recipeFactory();
      await recipeRepository.add(recipe);

      // Create a recipe version without git commit
      const recipeVersion = recipeVersionFactory({
        recipeId: recipe.id,
        gitCommit: undefined,
      });
      await recipeVersionRepository.add(recipeVersion);

      // Find versions by recipe ID
      const versions = await recipeVersionRepository.findByRecipeId(recipe.id);

      expect(versions).toHaveLength(1);
      expect(versions[0].gitCommit).toBeNull();
    });

    it('embeds GitCommit for multiple versions if available', async () => {
      // Create a recipe
      const recipe = recipeFactory();
      await recipeRepository.add(recipe);

      // Create git commits (without id for the add method)
      const gitCommitData1 = gitCommitFactory();
      const gitCommitData2 = gitCommitFactory();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: id1, ...gitCommitWithoutId1 } = gitCommitData1;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: id2, ...gitCommitWithoutId2 } = gitCommitData2;
      const savedGitCommit1 = await createGitCommit(
        datasource,
        gitCommitWithoutId1,
      );
      const savedGitCommit2 = await createGitCommit(
        datasource,
        gitCommitWithoutId2,
      );

      // Create recipe versions with git commits
      const recipeVersion1 = recipeVersionFactory({
        recipeId: recipe.id,
        version: 1,
        gitCommit: savedGitCommit1,
      });
      const recipeVersion2 = recipeVersionFactory({
        recipeId: recipe.id,
        version: 2,
        gitCommit: savedGitCommit2,
      });
      const recipeVersion3 = recipeVersionFactory({
        recipeId: recipe.id,
        version: 3,
        gitCommit: undefined,
      });

      await recipeVersionRepository.add(recipeVersion1);
      await recipeVersionRepository.add(recipeVersion2);
      await recipeVersionRepository.add(recipeVersion3);

      // Find versions by recipe ID
      const versions = await recipeVersionRepository.findByRecipeId(recipe.id);

      expect(versions).toHaveLength(3);

      // Versions are ordered by version DESC, so version 3 comes first
      const version3 = versions.find((v) => v.version === 3);
      const version2 = versions.find((v) => v.version === 2);
      const version1 = versions.find((v) => v.version === 1);

      expect(version3?.gitCommit).toBeNull();
      expect(version2?.gitCommit).toEqual(savedGitCommit2);
      expect(version1?.gitCommit).toEqual(savedGitCommit1);
    });
  });
});
