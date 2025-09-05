import { AccountsHexa, accountsSchemas } from '@packmind/accounts';
import { User, Organization } from '@packmind/accounts/types';
import { RecipesHexa, recipesSchemas } from '@packmind/recipes';
import { Recipe } from '@packmind/recipes/types';
import { GitHexa, gitSchemas } from '@packmind/git';
import { GitRepo, GitProviderVendors } from '@packmind/git/types';
import { HexaRegistry } from '@packmind/shared';
import { makeTestDatasource } from '@packmind/shared/test';

import { DataSource } from 'typeorm';
import { RecipesUsageHexa, recipesUsageSchemas } from '@packmind/analytics';

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
  let accountsHexa: AccountsHexa;
  let recipesHexa: RecipesHexa;
  let recipesUsageHexa: RecipesUsageHexa;
  let registry: HexaRegistry;
  let dataSource: DataSource;

  let recipe: Recipe;
  let organization: Organization;
  let user: User;

  beforeEach(async () => {
    // Create test datasource with all necessary schemas
    dataSource = await makeTestDatasource([
      ...accountsSchemas,
      ...recipesSchemas,
      ...recipesUsageSchemas,
      ...gitSchemas,
    ]);
    await dataSource.initialize();
    await dataSource.synchronize();

    // Create HexaRegistry
    registry = new HexaRegistry();

    // Register hexas before initialization
    registry.register(GitHexa);
    registry.register(AccountsHexa);
    registry.register(RecipesHexa);
    registry.register(RecipesUsageHexa);

    // Initialize the registry with the datasource
    registry.init(dataSource);

    // Get initialized hexas
    accountsHexa = registry.get(AccountsHexa);
    recipesHexa = registry.get(RecipesHexa);
    recipesUsageHexa = registry.get(RecipesUsageHexa);

    // Create test data
    organization = await accountsHexa.createOrganization({
      name: 'test organization',
    });
    user = await accountsHexa.signUpUser({
      username: 'toto',
      password: 's3cret',
      organizationId: organization.id,
    });

    recipe = await recipesHexa.captureRecipe({
      name: 'My new recipe',
      content: 'Some content',
      organizationId: organization.id,
      userId: user.id,
    });
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  test('A recipe usage can be tracked', async () => {
    const usage = await recipesUsageHexa.trackRecipeUsage(
      [recipe.slug],
      'ZeAgent',
      user.id,
    );

    expect(usage).toMatchObject([
      {
        recipeId: recipe.id,
        aiAgent: 'ZeAgent',
        userId: user.id,
      },
    ]);
  });

  test('A deleted recipe usage can be tracked', async () => {
    await recipesHexa.deleteRecipe({
      recipeId: recipe.id,
      userId: user.id,
      organizationId: organization.id,
    });
    const usage = await recipesUsageHexa.trackRecipeUsage(
      [recipe.slug],
      'ZeAgent',
      user.id,
    );

    expect(usage).toMatchObject([
      {
        recipeId: recipe.id,
        aiAgent: 'ZeAgent',
        userId: user.id,
      },
    ]);
  });

  describe('when a git repository is provided', () => {
    let gitRepo: GitRepo;
    let gitHexa: GitHexa;

    beforeEach(async () => {
      gitHexa = registry.get(GitHexa);

      const gitProvider = await gitHexa.addGitProvider(
        {
          organizationId: organization.id,
          source: GitProviderVendors.github,
          url: 'whatever',
          token: 'some-token',
        },
        organization.id,
      );

      gitRepo = await gitHexa.addGitRepo({
        userId: user.id,
        organizationId: organization.id,
        gitProviderId: gitProvider.id,
        owner: 'some-company',
        repo: 'some-repo',
        branch: 'main',
      });
    });

    test('A recipe usage can be tracked', async () => {
      const usage = await recipesUsageHexa.trackRecipeUsage(
        [recipe.slug],
        'ZeAgent',
        user.id,
        `${gitRepo.owner}/${gitRepo.repo}`,
      );

      expect(usage).toMatchObject([
        {
          recipeId: recipe.id,
          aiAgent: 'ZeAgent',
          userId: user.id,
          gitRepoId: gitRepo.id,
        },
      ]);
    });

    describe('when the git repo is deleted', () => {
      beforeEach(async () => {
        await gitHexa.deleteGitRepo(gitRepo.id, user.id);
      });

      test('A recipe usage can still be tracked', async () => {
        const usage = await recipesUsageHexa.trackRecipeUsage(
          [recipe.slug],
          'ZeAgent',
          user.id,
          `${gitRepo.owner}/${gitRepo.repo}`,
        );

        expect(usage).toMatchObject([
          {
            recipeId: recipe.id,
            aiAgent: 'ZeAgent',
            userId: user.id,
            gitRepoId: gitRepo.id,
          },
        ]);
      });
    });
  });
});
