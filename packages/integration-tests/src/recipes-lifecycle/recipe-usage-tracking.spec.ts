import { Recipe } from '@packmind/recipes/types';
import { GitRepo } from '@packmind/git/types';

import { DataSource } from 'typeorm';
import { TestApp } from '../helpers/TestApp';
import { DataFactory } from '../helpers/DataFactory';
import { makeIntegrationTestDataSource } from '../helpers/makeIntegrationTestDataSource';

// Mock only Configuration from @packmind/shared
jest.mock('@packmind/shared', () => {
  const actual = jest.requireActual('@packmind/shared');
  return {
    ...actual,
    Configuration: {
      getConfig: jest.fn().mockImplementation((key: string) => {
        if (key === 'ENCRYPTION_KEY') {
          return Promise.resolve('random-encryption-key-for-testing');
        }
        return Promise.resolve(null);
      }),
    },
  };
});

describe('Recipe usage tracking', () => {
  let dataSource: DataSource;
  let testApp: TestApp;
  let dataFactory: DataFactory;
  let recipe: Recipe;

  beforeEach(async () => {
    // Create test datasource with all necessary schemas
    dataSource = await makeIntegrationTestDataSource();
    await dataSource.initialize();
    await dataSource.synchronize();

    testApp = new TestApp(dataSource);
    await testApp.initialize();

    dataFactory = new DataFactory(testApp);

    recipe = await dataFactory.withRecipe({
      name: 'My new recipe',
      content: 'Some content',
    });
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  describe('when a git repository is provided', () => {
    let gitRepo: GitRepo;

    beforeEach(async () => {
      gitRepo = (await dataFactory.withGitRepo()).gitRepo;
    });

    test('A recipe usage can be tracked', async () => {
      const usage = await testApp.analyticsHexa.trackRecipeUsage({
        recipeSlugs: [recipe.slug],
        aiAgent: 'ZeAgent',
        gitRepo: `${gitRepo.owner}/${gitRepo.repo}`,
        ...dataFactory.packmindCommand(),
      });

      expect(usage).toMatchObject([
        {
          recipeId: recipe.id,
          aiAgent: 'ZeAgent',
          userId: dataFactory.user.id,
          gitRepoId: gitRepo.id,
        },
      ]);
    });

    test('A deleted recipe usage can be tracked', async () => {
      await testApp.recipesHexa.deleteRecipe({
        recipeId: recipe.id,
        spaceId: recipe.spaceId,
        ...dataFactory.packmindCommand(),
      });
      const usage = await testApp.analyticsHexa.trackRecipeUsage({
        recipeSlugs: [recipe.slug],
        aiAgent: 'ZeAgent',
        gitRepo: `${gitRepo.owner}/${gitRepo.repo}`,
        ...dataFactory.packmindCommand(),
      });

      expect(usage).toMatchObject([
        {
          recipeId: recipe.id,
          aiAgent: 'ZeAgent',
          userId: dataFactory.user.id,
        },
      ]);
    });
  });
});
