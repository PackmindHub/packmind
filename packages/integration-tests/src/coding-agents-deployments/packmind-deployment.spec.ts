import { GitCommitSchema } from '@packmind/git';
import { gitCommitFactory } from '@packmind/git/test';
import {
  GitCommit,
  Recipe,
  RecipesDeployment,
  RecipeVersionId,
  RenderMode,
  Standard,
  StandardsDeployment,
  StandardVersionId,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { DataFactory } from '../helpers/DataFactory';
import { DataQuery } from '../helpers/DataQuery';
import { makeIntegrationTestDataSource } from '../helpers/makeIntegrationTestDataSource';
import { TestApp } from '../helpers/TestApp';

describe('Packmind Deployment Spec', () => {
  let testApp: TestApp;
  let dataFactory: DataFactory;
  let dataQuery: DataQuery;

  let standard1: Standard;
  let standard2: Standard;
  let recipe1: Recipe;
  let recipe2: Recipe;

  let dataSource: DataSource;
  let commit: GitCommit;
  let commitToGit: jest.Mock;

  beforeEach(async () => {
    dataSource = await makeIntegrationTestDataSource();
    await dataSource.initialize();
    await dataSource.synchronize();

    testApp = new TestApp(dataSource);
    await testApp.initialize();

    dataQuery = new DataQuery(testApp);
    dataFactory = new DataFactory(testApp);
    await dataFactory.withUserAndOrganization();
    await dataFactory.withGitRepo();
    await dataFactory.withRenderMode([RenderMode.PACKMIND]);

    standard1 = await dataFactory.withStandard({ name: 'My first standard' });
    standard2 = await dataFactory.withStandard({ name: 'My second standard' });

    recipe1 = await dataFactory.withRecipe({ name: 'My first recipe' });
    recipe2 = await dataFactory.withRecipe({ name: 'My second recipe' });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await dataSource.destroy();
  });

  async function createGitCommit() {
    const gitCommitRepo = dataSource.getRepository(GitCommitSchema);
    return gitCommitRepo.save(gitCommitFactory());
  }

  describe('when deploying standards', () => {
    async function deployStandards(
      standards: Standard[],
    ): Promise<StandardsDeployment[]> {
      const standardVersionIds: StandardVersionId[] = [];
      for (const standard of standards) {
        standardVersionIds.push(await dataQuery.getStandardVersionId(standard));
      }

      return testApp.deploymentsHexa.getDeploymentsUseCases().publishStandards({
        ...dataFactory.packmindCommand(),
        targetIds: [dataFactory.target.id],
        standardVersionIds,
      });
    }

    beforeEach(async () => {
      commit = await createGitCommit();
      commitToGit = jest.fn().mockResolvedValue(commit);
      testApp.gitHexa.commitToGit = commitToGit;

      await deployStandards([standard1]);
    });

    it('properly deploys standards', async () => {
      expect(commitToGit).toHaveBeenCalledWith(
        dataFactory.gitRepo,
        [
          {
            content: expect.stringContaining(standard1.name),
            path: `.packmind/standards/${standard1.slug}.md`,
          },
          {
            content: expect.any(String),
            path: `.packmind/standards-index.md`,
          },
        ],
        expect.any(String),
      );
    });

    it('re-deploys previously deployed standards', async () => {
      await deployStandards([standard2]);
      expect(commitToGit).toHaveBeenCalledWith(
        dataFactory.gitRepo,
        [
          {
            content: expect.stringContaining(standard1.name),
            path: `.packmind/standards/${standard1.slug}.md`,
          },
          {
            content: expect.stringContaining(standard2.name),
            path: `.packmind/standards/${standard2.slug}.md`,
          },
          {
            content: expect.any(String),
            path: `.packmind/standards-index.md`,
          },
        ],
        expect.any(String),
      );
    });

    describe('when a standard previously deployed has been deleted', () => {
      beforeEach(async () => {
        await testApp.standardsHexa.deleteStandard(
          standard1.id,
          dataFactory.user.id,
        );
      });

      it('does not re-deploy the deleted standard', async () => {
        await deployStandards([standard2]);
        expect(commitToGit).toHaveBeenCalledWith(
          dataFactory.gitRepo,
          [
            {
              content: expect.stringContaining(standard2.name),
              path: `.packmind/standards/${standard2.slug}.md`,
            },
            {
              content: expect.any(String),
              path: `.packmind/standards-index.md`,
            },
          ],
          expect.any(String),
        );
      });
    });
  });

  describe('when deploying recipes', () => {
    async function deployRecipes(
      recipes: Recipe[],
    ): Promise<RecipesDeployment[]> {
      const recipeVersionIds: RecipeVersionId[] = [];
      for (const recipe of recipes) {
        recipeVersionIds.push(await dataQuery.getRecipeVersionId(recipe));
      }

      return testApp.deploymentsHexa.getDeploymentsUseCases().publishRecipes({
        ...dataFactory.packmindCommand(),
        recipeVersionIds,
        targetIds: [dataFactory.target.id],
      });
    }

    beforeEach(async () => {
      commit = await createGitCommit();
      commitToGit = jest.fn().mockResolvedValue(commit);
      testApp.gitHexa.commitToGit = commitToGit;

      await deployRecipes([recipe1]);
    });

    it('properly deploys the recipes', async () => {
      expect(commitToGit).toHaveBeenCalledWith(
        dataFactory.gitRepo,
        [
          {
            path: `.packmind/recipes/${recipe1.slug}.md`,
            content: expect.stringContaining(recipe1.content),
          },
          {
            path: `.packmind/recipes-index.md`,
            content: expect.any(String),
          },
        ],
        expect.any(String),
      );
    });

    it('re-deploys previously deployed recipes', async () => {
      await deployRecipes([recipe2]);

      expect(commitToGit).toHaveBeenCalledWith(
        dataFactory.gitRepo,
        [
          {
            path: `.packmind/recipes/${recipe1.slug}.md`,
            content: expect.stringContaining(recipe1.content),
          },
          {
            path: `.packmind/recipes/${recipe2.slug}.md`,
            content: expect.stringContaining(recipe2.content),
          },
          {
            path: `.packmind/recipes-index.md`,
            content: expect.any(String),
          },
        ],
        expect.any(String),
      );
    });

    describe('when a deployed recipe has been deleted', () => {
      beforeEach(async () => {
        await testApp.recipesHexa.deleteRecipe({
          ...dataFactory.packmindCommand(),
          recipeId: recipe1.id,
          spaceId: recipe1.spaceId,
        });
      });

      it('does not re-deploy the deleted recipe', async () => {
        await deployRecipes([recipe2]);

        expect(commitToGit).toHaveBeenCalledWith(
          dataFactory.gitRepo,
          [
            {
              path: `.packmind/recipes/${recipe2.slug}.md`,
              content: expect.stringContaining(recipe2.content),
            },
            {
              path: `.packmind/recipes-index.md`,
              content: expect.any(String),
            },
          ],
          expect.any(String),
        );
      });
    });
  });
});
