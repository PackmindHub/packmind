import { AccountsHexa, accountsSchemas } from '@packmind/accounts';
import { User, Organization } from '@packmind/accounts/types';
import { RecipesHexa, recipesSchemas } from '@packmind/recipes';
import { Recipe } from '@packmind/recipes/types';
import { GitHexa, gitSchemas } from '@packmind/git';
import { GitRepo, GitProviderVendors } from '@packmind/git/types';
import {
  createOrganizationId,
  createUserId,
  HexaRegistry,
  IDeploymentPort,
} from '@packmind/shared';
import { makeTestDatasource } from '@packmind/shared/test';

import { DataSource } from 'typeorm';
import { RecipesUsageHexa, recipesUsageSchemas } from '@packmind/analytics';
import { TargetSchema } from '@packmind/deployments';

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
  let gitHexa: GitHexa;
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
      TargetSchema,
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
    gitHexa = registry.get(GitHexa);

    recipesUsageHexa = registry.get(RecipesUsageHexa);
    const mockDeploymentPort = {
      addTarget: jest.fn(),
    } as Partial<jest.Mocked<IDeploymentPort>> as jest.Mocked<IDeploymentPort>;

    gitHexa.setDeploymentsAdapter(mockDeploymentPort);

    gitHexa.setUserProvider(accountsHexa.getUserProvider());
    gitHexa.setOrganizationProvider(accountsHexa.getOrganizationProvider());

    // Create test data
    const signUpResult = await accountsHexa.signUpWithOrganization({
      organizationName: 'test organization',
      email: 'toto@packmind.com',
      password: 's3cret!@',
    });
    user = signUpResult.user;
    organization = signUpResult.organization;

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

  describe('when a git repository is provided', () => {
    let gitRepo: GitRepo;
    let gitHexa: GitHexa;

    beforeEach(async () => {
      gitHexa = registry.get(GitHexa);

      const gitProvider = await gitHexa.addGitProvider({
        userId: user.id,
        organizationId: organization.id,
        gitProvider: {
          source: GitProviderVendors.github,
          url: 'whatever',
          token: 'some-token',
        },
      });

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
      const usage = await recipesUsageHexa.trackRecipeUsage({
        recipeSlugs: [recipe.slug],
        aiAgent: 'ZeAgent',
        userId: createUserId(user.id),
        organizationId: createOrganizationId(organization.id),
        gitRepo: `${gitRepo.owner}/${gitRepo.repo}`,
      });

      expect(usage).toMatchObject([
        {
          recipeId: recipe.id,
          aiAgent: 'ZeAgent',
          userId: user.id,
          gitRepoId: gitRepo.id,
        },
      ]);
    });

    test('A deleted recipe usage can be tracked', async () => {
      await recipesHexa.deleteRecipe({
        recipeId: recipe.id,
        userId: user.id,
        organizationId: organization.id,
      });
      const usage = await recipesUsageHexa.trackRecipeUsage({
        recipeSlugs: [recipe.slug],
        aiAgent: 'ZeAgent',
        gitRepo: `${gitRepo.owner}/${gitRepo.repo}`,
        userId: createUserId(user.id),
        organizationId: createOrganizationId(organization.id),
      });

      expect(usage).toMatchObject([
        {
          recipeId: recipe.id,
          aiAgent: 'ZeAgent',
          userId: user.id,
        },
      ]);
    });
  });
});
