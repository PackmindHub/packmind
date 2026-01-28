import {
  createTestDatasourceFixture,
  itHandlesSoftDelete,
  stubLogger,
} from '@packmind/test-utils';
import { RecipeVersionRepository } from './RecipeVersionRepository';
import { RecipeVersionSchema } from '../schemas/RecipeVersionSchema';
import { RecipeSchema } from '../schemas/RecipeSchema';
import { recipeFactory } from '../../../test/recipeFactory';
import { recipeVersionFactory } from '../../../test/recipeVersionFactory';
import { RecipeRepository } from './RecipeRepository';
import { createRecipeId, Recipe, RecipeVersion } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { createGitCommit, gitCommitFactory } from '@packmind/git/test';
import { GitCommitSchema } from '@packmind/git';

describe('RecipeVersionRepository', () => {
  const fixture = createTestDatasourceFixture([
    RecipeSchema,
    RecipeVersionSchema,
    GitCommitSchema,
  ]);

  let recipeVersionRepository: RecipeVersionRepository;
  let recipeRepository: RecipeRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let testRecipe: Recipe;

  beforeAll(() => fixture.initialize());

  beforeEach(async () => {
    stubbedLogger = stubLogger();

    recipeVersionRepository = new RecipeVersionRepository(
      fixture.datasource.getRepository(RecipeVersionSchema),
      stubbedLogger,
    );

    recipeRepository = new RecipeRepository(
      fixture.datasource.getRepository(RecipeSchema),
      stubbedLogger,
    );

    // Create a test recipe for soft delete tests
    testRecipe = recipeFactory();
    await recipeRepository.add(testRecipe);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await fixture.cleanup();
  });

  afterAll(() => fixture.destroy());

  itHandlesSoftDelete<RecipeVersion>({
    entityFactory: () => recipeVersionFactory({ recipeId: testRecipe.id }),
    getRepository: () => recipeVersionRepository,
    queryDeletedEntity: async (id) =>
      fixture.datasource.getRepository(RecipeVersionSchema).findOne({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        where: { id: id as any },
        withDeleted: true,
      }),
  });

  it('stores and retrieves recipe versions', async () => {
    const recipe = recipeFactory();
    await recipeRepository.add(recipe);

    const recipeVersion = recipeVersionFactory({ recipeId: recipe.id });
    await recipeVersionRepository.add(recipeVersion);

    expect(await recipeVersionRepository.list()).toStrictEqual([
      { ...recipeVersion, gitCommit: null },
    ]);
  });

  it('stores and retrieves multiple recipe versions', async () => {
    const recipe1 = recipeFactory();
    const recipe2 = recipeFactory();
    const recipe3 = recipeFactory();

    await recipeRepository.add(recipe1);
    await recipeRepository.add(recipe2);
    await recipeRepository.add(recipe3);

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

  it('finds recipe versions by recipeId', async () => {
    const recipe = recipeFactory();
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

  it('finds the latest recipe version by recipeId', async () => {
    const recipe = recipeFactory();
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

  describe('when recipe does not exist', () => {
    it('returns null for latest version', async () => {
      const latestVersion = await recipeVersionRepository.findLatestByRecipeId(
        createRecipeId(uuidv4()),
      );
      expect(latestVersion).toBeNull();
    });

    it('returns null for findByRecipeIdAndVersion', async () => {
      const foundVersion =
        await recipeVersionRepository.findByRecipeIdAndVersion(
          createRecipeId(uuidv4()),
          1,
        );
      expect(foundVersion).toBeNull();
    });
  });

  it('finds a specific recipe version by recipeId and version', async () => {
    const recipe = recipeFactory();
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

  describe('when version does not exist', () => {
    it('returns null for non-existent version of existing recipe', async () => {
      const recipe = recipeFactory();
      await recipeRepository.add(recipe);

      const recipeVersion1 = recipeVersionFactory({
        recipeId: recipe.id,
        version: 1,
      });

      await recipeVersionRepository.add(recipeVersion1);

      const foundVersion =
        await recipeVersionRepository.findByRecipeIdAndVersion(recipe.id, 5);
      expect(foundVersion).toBeNull();
    });
  });

  describe('GitCommit embedding', () => {
    describe('when gitCommit is available', () => {
      let recipe: Recipe;
      let savedGitCommit: ReturnType<typeof gitCommitFactory>;
      let versions: RecipeVersion[];

      beforeEach(async () => {
        recipe = recipeFactory();
        await recipeRepository.add(recipe);

        const gitCommitData = gitCommitFactory();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...gitCommitWithoutId } = gitCommitData;
        savedGitCommit = await createGitCommit(
          fixture.datasource,
          gitCommitWithoutId,
        );

        const recipeVersion = recipeVersionFactory({
          recipeId: recipe.id,
          gitCommit: savedGitCommit,
        });
        await recipeVersionRepository.add(recipeVersion);

        versions = await recipeVersionRepository.findByRecipeId(recipe.id);
      });

      it('returns one version', async () => {
        expect(versions).toHaveLength(1);
      });

      it('embeds the gitCommit', async () => {
        expect(versions[0].gitCommit).toEqual(savedGitCommit);
      });
    });

    describe('when gitCommit is not available', () => {
      let recipe: Recipe;
      let versions: RecipeVersion[];

      beforeEach(async () => {
        recipe = recipeFactory();
        await recipeRepository.add(recipe);

        const recipeVersion = recipeVersionFactory({
          recipeId: recipe.id,
          gitCommit: undefined,
        });
        await recipeVersionRepository.add(recipeVersion);

        versions = await recipeVersionRepository.findByRecipeId(recipe.id);
      });

      it('returns one version', async () => {
        expect(versions).toHaveLength(1);
      });

      it('returns null gitCommit', async () => {
        expect(versions[0].gitCommit).toBeNull();
      });
    });

    describe('when multiple versions have different gitCommits', () => {
      let recipe: Recipe;
      let savedGitCommit1: ReturnType<typeof gitCommitFactory>;
      let savedGitCommit2: ReturnType<typeof gitCommitFactory>;
      let versions: RecipeVersion[];

      beforeEach(async () => {
        recipe = recipeFactory();
        await recipeRepository.add(recipe);

        const gitCommitData1 = gitCommitFactory();
        const gitCommitData2 = gitCommitFactory();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: id1, ...gitCommitWithoutId1 } = gitCommitData1;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: id2, ...gitCommitWithoutId2 } = gitCommitData2;
        savedGitCommit1 = await createGitCommit(
          fixture.datasource,
          gitCommitWithoutId1,
        );
        savedGitCommit2 = await createGitCommit(
          fixture.datasource,
          gitCommitWithoutId2,
        );

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

        versions = await recipeVersionRepository.findByRecipeId(recipe.id);
      });

      it('returns all three versions', async () => {
        expect(versions).toHaveLength(3);
      });

      it('returns null gitCommit for version 3', async () => {
        const version3 = versions.find((v) => v.version === 3);
        expect(version3?.gitCommit).toBeNull();
      });

      it('embeds gitCommit2 for version 2', async () => {
        const version2 = versions.find((v) => v.version === 2);
        expect(version2?.gitCommit).toEqual(savedGitCommit2);
      });

      it('embeds gitCommit1 for version 1', async () => {
        const version1 = versions.find((v) => v.version === 1);
        expect(version1?.gitCommit).toEqual(savedGitCommit1);
      });
    });
  });
});
