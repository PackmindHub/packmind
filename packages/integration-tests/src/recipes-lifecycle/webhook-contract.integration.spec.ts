import {
  AccountsHexa,
  accountsSchemas,
  createUserId,
} from '@packmind/accounts';
import { User, Organization } from '@packmind/accounts/types';
import { RecipesHexa, recipesSchemas } from '@packmind/recipes';
import { Recipe } from '@packmind/recipes/types';
import { gitSchemas, GitHexa } from '@packmind/git';
import { GitProviderVendors } from '@packmind/git/types';
import { JobsHexa } from '@packmind/jobs';
import {
  DistributionStatus,
  HexaRegistry,
  createGitRepoId,
  GitRepo,
  createTargetId,
} from '@packmind/shared';
import { makeTestDatasource } from '@packmind/shared/test';
import { StandardsHexa, standardsSchemas } from '@packmind/standards';
import { SpacesHexa, spacesSchemas, Space } from '@packmind/spaces';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { DeploymentsHexa, deploymentsSchemas } from '@packmind/deployments';
import { DataSource } from 'typeorm';
import { createRecipesDeploymentId } from '@packmind/shared';
import { assert } from 'console';

jest.mock(
  '@packmind/git/src/infra/repositories/github/GithubRepository',
  () => {
    const actual = jest.requireActual(
      '@packmind/git/src/infra/repositories/github/GithubRepository',
    );
    return {
      ...actual,
      getFileOnRepo: jest.fn().mockResolvedValue(null),
      commitFiles: jest.fn().mockResolvedValue({
        sha: `sha`,
        message: `whatever commit message`,
        author: `some author`,
        url: `/path/to/commited/files`,
      }),
    };
  },
);

jest.mock(
  '@packmind/git/src/infra/repositories/gitlab/GitlabRepository',
  () => {
    const actual = jest.requireActual(
      '@packmind/git/src/infra/repositories/gitlab/GitlabRepository',
    );
    return {
      ...actual,
      commitFiles: jest.fn().mockResolvedValue({
        sha: `sha`,
        message: `whatever commit message`,
        author: `some author`,
        url: `/path/to/commited/files`,
      }),
    };
  },
);

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

interface WebhookTestConfig<TPayload> {
  providerName: string;
  providerVendor: keyof typeof GitProviderVendors;
  createPayload: (filePath: string) => TPayload;
  headers: Record<string, string>;
  expectedEvent: string;
  nonPushEvent: string;
  nonPushHeaders: Record<string, string>;
  baseUrl: string;
}

function contractWebhookTest<TPayload>(config: WebhookTestConfig<TPayload>) {
  describe(`${config.providerName} Webhook Integration Test`, () => {
    let accountsHexa: AccountsHexa;
    let recipesHexa: RecipesHexa;
    let spacesHexa: SpacesHexa;
    let gitHexa: GitHexa;
    let registry: HexaRegistry;
    let dataSource: DataSource;

    let recipe: Recipe;
    let organization: Organization;
    let space: Space;
    let gitRepo: GitRepo;
    let user: User;

    /**
     * Helper function to mock the async delayed job pattern for webhooks
     * This mocks handleWebHookWithoutContent, addFetchFileContentJob, and the delayed jobs
     * to execute synchronously in tests
     */
    const mockWebhookWithAsyncJobs = (
      files: Array<{ filePath: string; fileContent: string }>,
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockGitCommit: any = null; // In test environment, gitCommit is null due to mocking constraints

      // Mock handleWebHookWithoutContent to return list of changed files (without content)
      jest.spyOn(gitHexa, 'handleWebHookWithoutContent').mockResolvedValue(
        files.map((f) => ({
          filePath: f.filePath,
          gitCommit: mockGitCommit,
        })),
      );

      // Get the recipes delayed jobs to mock them
      const recipesDelayedJobs = recipesHexa.getRecipesDelayedJobs();

      // Mock UpdateRecipesAndGenerateSummaries delayed job to execute synchronously
      jest
        .spyOn(
          recipesDelayedJobs.updateRecipesAndGenerateSummariesDelayedJob,
          'addJobWithCallback',
        )
        .mockImplementation(async (input, callback) => {
          // Execute the actual job logic synchronously
          const result =
            await recipesDelayedJobs.updateRecipesAndGenerateSummariesDelayedJob.runJob(
              'test-job-id',
              input,
              new AbortController(),
            );

          // Execute callback immediately if provided
          if (callback) {
            await callback(result);
          }

          return 'update-job-id';
        });

      // Mock DeployRecipes delayed job to execute synchronously
      jest
        .spyOn(recipesDelayedJobs.deployRecipesDelayedJob, 'addJobWithCallback')
        .mockImplementation(async (input, callback) => {
          // Execute the actual job logic synchronously
          const result =
            await recipesDelayedJobs.deployRecipesDelayedJob.runJob(
              'test-deploy-job-id',
              input,
              new AbortController(),
            );

          // Execute callback immediately if provided
          if (callback) {
            await callback(result);
          }

          return 'deploy-job-id';
        });

      // Mock addFetchFileContentJob to immediately execute callback
      jest
        .spyOn(gitHexa, 'addFetchFileContentJob')
        .mockImplementation(async (input, callback) => {
          if (callback) {
            // Execute callback immediately with file content
            await callback({
              organizationId: input.organizationId,
              gitRepoId: input.gitRepoId,
              files: files.map((f) => ({
                filePath: f.filePath,
                fileContent: f.fileContent,
                gitCommit: null,
              })),
            });
          }
          return 'job-id';
        });
    };

    beforeEach(async () => {
      // Create test datasource with all necessary schemas
      dataSource = await makeTestDatasource([
        ...accountsSchemas,
        ...recipesSchemas,
        ...spacesSchemas,
        ...gitSchemas,
        ...standardsSchemas,
        ...deploymentsSchemas,
      ]);
      await dataSource.initialize();
      await dataSource.synchronize();

      // Create HexaRegistry
      registry = new HexaRegistry();

      registry.register(JobsHexa);
      registry.register(GitHexa, {
        gitRepoFactory: {
          createGitRepo: jest.fn().mockReturnValue({
            commitFiles: jest.fn().mockResolvedValue({
              sha: `sha`,
              message: `whatever commit message`,
              author: `some author`,
              url: `/path/to/commited/files`,
            }),
            getFileOnRepo: jest.fn().mockResolvedValue(null),
          }),
        },
      });

      // NOTE: SpacesHexa must be registered before AccountsHexa
      // because AccountsHexa needs SpacesPort to create default space during signup
      registry.register(SpacesHexa);
      registry.register(AccountsHexa);
      registry.register(StandardsHexa);
      registry.register(CodingAgentHexa);
      registry.register(DeploymentsHexa);
      registry.register(RecipesHexa);

      // Initialize the registry with the datasource
      registry.init(dataSource);
      await registry.initAsync();

      // Get initialized hexas
      accountsHexa = registry.get(AccountsHexa);
      recipesHexa = registry.get(RecipesHexa);
      spacesHexa = registry.get(SpacesHexa);
      gitHexa = registry.get(GitHexa);

      // Set up the deployment port after all hexas are initialized to avoid circular dependencies
      const deploymentsHexa = registry.get(DeploymentsHexa);
      const deploymentPort = deploymentsHexa.getDeploymentsUseCases();
      await recipesHexa.setDeploymentPort(deploymentPort);
      deploymentsHexa.setRecipesPort(recipesHexa);
      gitHexa.setDeploymentsAdapter(deploymentPort);

      // Initialize job queues after all delayed jobs are registered
      const jobsHexa = registry.get(JobsHexa);
      await jobsHexa.initJobQueues();

      gitHexa.setUserProvider(accountsHexa.getUserProvider());
      gitHexa.setOrganizationProvider(accountsHexa.getOrganizationProvider());

      // Create test data
      const signUpResult = await accountsHexa.signUpWithOrganization({
        organizationName: 'test organization',
        email: 'testuser@packmind.com',
        password: 's3cret!@',
      });
      user = signUpResult.user;
      organization = signUpResult.organization;

      // Get the default "Global" space created during signup
      const spaces = await spacesHexa
        .getSpacesAdapter()
        .listSpacesByOrganization(organization.id);
      const foundSpace = spaces.find((s) => s.name === 'Global');
      assert(foundSpace, 'Default Global space should exist');
      space = foundSpace;

      // Create git provider and repository
      const gitProvider = await gitHexa.addGitProvider({
        userId: user.id,
        organizationId: organization.id,
        gitProvider: {
          source: config.providerVendor,
          url: config.baseUrl,
          token: `test-${config.providerName.toLowerCase()}-token`,
        },
      });

      gitRepo = await gitHexa.addGitRepo({
        userId: user.id,
        organizationId: organization.id,
        gitProviderId: gitProvider.id,
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
      });

      // Create initial recipe (deployment to git mocked separately)
      recipe = await recipesHexa.captureRecipe({
        name: 'Test Recipe',
        content: `# Test Recipe\n\nInitial content for testing ${config.providerName} webhooks.`,
        organizationId: organization.id,
        userId: user.id,
        spaceId: space.id.toString(),
      });

      // Mock git API calls to simulate successful deployment and webhook processing
      jest.spyOn(gitHexa, 'getFileFromRepo').mockResolvedValue({
        content: recipe.content,
        sha: 'initial-sha',
      });
    });

    afterEach(async () => {
      jest.restoreAllMocks();
      await dataSource.destroy();
    });

    describe(`${config.providerName} Webhook Recipe Update Flow`, () => {
      describe('when the recipe is not deployed on the target', () => {
        it('does not create a new recipe version', async () => {
          // Mock webhook response with updated content
          const updatedContent = `# Test Recipe\n\nUpdated content from ${config.providerName} webhook.`;

          mockWebhookWithAsyncJobs([
            {
              filePath: '.packmind/recipes/test-recipe.md',
              fileContent: updatedContent,
            },
          ]);

          // Simulate webhook call
          const webhookPayload = config.createPayload(
            '.packmind/recipes/test-recipe.md',
          );
          const updateMethod =
            config.providerName === 'GitHub'
              ? 'updateRecipesFromGitHub'
              : 'updateRecipesFromGitLab';
          const matchingRecipes = await recipesHexa[updateMethod]({
            payload: webhookPayload,
            organizationId: organization.id,
            headers: config.headers,
          });

          // Verify that no recipes were returned (recipe is not deployed)
          expect(matchingRecipes).toHaveLength(0);

          // Verify that no new recipe version was created (recipe not deployed)
          const allVersions = await recipesHexa.listRecipeVersions(recipe.id);
          expect(allVersions).toHaveLength(1);
          expect(allVersions[0].version).toBe(1);
        });
      });

      describe('when the recipe is deployed on the target', () => {
        beforeEach(async () => {
          const deploymentHexa = registry.get(DeploymentsHexa);
          const recipesHexa = registry.get(RecipesHexa);

          const recipeVersions = await recipesHexa.listRecipeVersions(
            recipe.id,
          );

          await deploymentHexa.getDeploymentsUseCases().publishRecipes({
            gitRepoIds: [gitRepo.id],
            recipeVersionIds: [recipeVersions[0].id],
            userId: user.id,
            organizationId: organization.id,
          });
        });

        it('creates new recipe version after webhook receives updated content', async () => {
          // Verify initial state
          const initialVersions = await recipesHexa.listRecipeVersions(
            recipe.id,
          );
          expect(initialVersions).toHaveLength(1);
          expect(initialVersions[0].version).toBe(1);
          expect(initialVersions[0].content).toBe(
            `# Test Recipe\n\nInitial content for testing ${config.providerName} webhooks.`,
          );

          // Mock webhook response with updated content
          const updatedContent = `# Test Recipe\n\nUpdated content from ${config.providerName} webhook.`;

          mockWebhookWithAsyncJobs([
            {
              filePath: '.packmind/recipes/test-recipe.md',
              fileContent: updatedContent,
            },
          ]);

          // Simulate webhook call
          const webhookPayload = config.createPayload(
            '.packmind/recipes/test-recipe.md',
          );
          const updateMethod =
            config.providerName === 'GitHub'
              ? 'updateRecipesFromGitHub'
              : 'updateRecipesFromGitLab';
          const matchingRecipes = await recipesHexa[updateMethod]({
            payload: webhookPayload,
            organizationId: organization.id,
            headers: config.headers,
          });

          // Verify that matching recipes were returned (in their current state, before updates)
          expect(matchingRecipes).toHaveLength(1);
          expect(matchingRecipes[0].id).toBe(recipe.id);
          expect(matchingRecipes[0].version).toBe(1); // Still version 1 (current state)
          expect(matchingRecipes[0].content).toBe(
            `# Test Recipe\n\nInitial content for testing ${config.providerName} webhooks.`,
          );

          // Verify that a new recipe version was created by the delayed job
          const allVersions = await recipesHexa.listRecipeVersions(recipe.id);
          expect(allVersions).toHaveLength(2);

          // Check the new version
          const latestVersion = allVersions.find((v) => v.version === 2);
          expect(latestVersion).toBeDefined();
          expect(latestVersion?.content).toBe(updatedContent);
          // In test environment, gitCommit is null due to mocking constraints
          expect(latestVersion?.gitCommit).toBeNull();

          // Verify original version still exists
          const originalVersion = allVersions.find((v) => v.version === 1);
          expect(originalVersion).toBeDefined();
          expect(originalVersion?.content).toBe(
            `# Test Recipe\n\nInitial content for testing ${config.providerName} webhooks.`,
          );
        });

        it('automatically deploys new recipe version to source repository', async () => {
          // Create DeploymentsHexa mock
          const deploymentsHexa = registry.get(DeploymentsHexa);
          const deploymentUseCases = deploymentsHexa.getDeploymentsUseCases();

          // Mock getTargetsByGitRepo to return a default root target
          const defaultTarget = {
            id: createTargetId('target-default'),
            name: 'Default',
            path: '/',
            gitRepoId: gitRepo.id,
          };
          jest
            .spyOn(deploymentUseCases, 'getTargetsByGitRepo')
            .mockResolvedValue([defaultTarget]);

          const publishRecipesSpy = jest
            .spyOn(deploymentUseCases, 'publishRecipes')
            .mockResolvedValue([
              {
                id: createRecipesDeploymentId('deployment-123'),
                recipeVersions: [],
                createdAt: new Date().toISOString(),
                authorId: createUserId('system'),
                target: {
                  id: createTargetId('target-id'),
                  name: 'name',
                  path: 'path',
                  gitRepoId: createGitRepoId('git-repo'),
                },
                status: DistributionStatus.success,
                organizationId: organization.id,
                renderModes: [],
              },
            ]);

          // Mock webhook response with updated content
          const updatedContent = `# Test Recipe\n\nUpdated content from ${config.providerName} webhook for deployment.`;

          mockWebhookWithAsyncJobs([
            {
              filePath: '.packmind/recipes/test-recipe.md',
              fileContent: updatedContent,
            },
          ]);

          // Simulate webhook call
          const webhookPayload = config.createPayload(
            '.packmind/recipes/test-recipe.md',
          );
          const updateMethod =
            config.providerName === 'GitHub'
              ? 'updateRecipesFromGitHub'
              : 'updateRecipesFromGitLab';
          const matchingRecipes = await recipesHexa[updateMethod]({
            payload: webhookPayload,
            organizationId: organization.id,
            headers: config.headers,
          });

          // Verify that matching recipes were returned (in their current state, before updates)
          expect(matchingRecipes).toHaveLength(1);
          expect(matchingRecipes[0].version).toBe(1); // Still version 1 (current state)

          // Verify that a new recipe version was created
          const allVersions = await recipesHexa.listRecipeVersions(recipe.id);
          expect(allVersions).toHaveLength(2);
          const newVersion = allVersions.find((v) => v.version === 2);
          expect(newVersion).toBeDefined();
          expect(newVersion?.content).toBe(updatedContent);

          // Verify that deployment was triggered
          expect(publishRecipesSpy).toHaveBeenCalledTimes(1);
          const deploymentCall = publishRecipesSpy.mock.calls[0][0];

          // Should deploy the new recipe version to the default target (root path)
          expect(deploymentCall.targetIds).toBeDefined();
          expect(deploymentCall.targetIds).toHaveLength(1);
          expect(deploymentCall.targetIds[0]).toBe(defaultTarget.id);
          expect(deploymentCall.gitRepoIds).toBeUndefined(); // Should use targetIds now
          expect(deploymentCall.recipeVersionIds).toHaveLength(1);
          expect(deploymentCall.recipeVersionIds[0]).toBe(newVersion?.id);
          expect(deploymentCall.organizationId).toBe(organization.id);
          // Note: webhook deployments use system user, not the original user
          expect(deploymentCall.userId).toBe(createUserId('system'));
        });

        it('preserves existing recipe with identical webhook content', async () => {
          // Mock webhook response with identical content
          const identicalContent = recipe.content;

          mockWebhookWithAsyncJobs([
            {
              filePath: '.packmind/recipes/test-recipe.md',
              fileContent: identicalContent,
            },
          ]);

          // Simulate webhook call
          const webhookPayload = config.createPayload(
            '.packmind/recipes/test-recipe.md',
          );
          const updateMethod =
            config.providerName === 'GitHub'
              ? 'updateRecipesFromGitHub'
              : 'updateRecipesFromGitLab';
          const matchingRecipes = await recipesHexa[updateMethod]({
            payload: webhookPayload,
            organizationId: organization.id,
            headers: config.headers,
          });

          // Verify that matching recipe was returned (recipe is deployed, even though content is identical)
          expect(matchingRecipes).toHaveLength(1);
          expect(matchingRecipes[0].id).toBe(recipe.id);

          // Verify that no new recipe version was created (content was identical)
          const allVersions = await recipesHexa.listRecipeVersions(recipe.id);
          expect(allVersions).toHaveLength(1); // Still only the original version
          expect(allVersions[0].version).toBe(1);
        });

        it('handles multiple recipe updates in single webhook', async () => {
          // Create a second recipe
          const recipe2 = await recipesHexa.captureRecipe({
            name: 'Second Recipe',
            content: '# Second Recipe\n\nInitial content for second recipe.',
            organizationId: organization.id,
            userId: user.id,
            spaceId: space.id.toString(),
          });
          const deploymentsHexa = registry.get(DeploymentsHexa);
          const recipeVersions = await recipesHexa.listRecipeVersions(
            recipe2.id,
          );

          await deploymentsHexa.getDeploymentsUseCases().publishRecipes({
            gitRepoIds: [gitRepo.id],
            recipeVersionIds: [recipeVersions[0].id],
            userId: user.id,
            organizationId: organization.id,
          });

          // Mock webhook response for both recipes
          const updatedContent1 = `# Test Recipe\n\nUpdated content for first recipe from ${config.providerName}.`;
          const updatedContent2 = `# Second Recipe\n\nUpdated content for second recipe from ${config.providerName}.`;

          mockWebhookWithAsyncJobs([
            {
              filePath: '.packmind/recipes/test-recipe.md',
              fileContent: updatedContent1,
            },
            {
              filePath: '.packmind/recipes/second-recipe.md',
              fileContent: updatedContent2,
            },
          ]);

          // Simulate webhook call
          const webhookPayload = config.createPayload(
            '.packmind/recipes/test-recipe.md',
          );
          const updateMethod =
            config.providerName === 'GitHub'
              ? 'updateRecipesFromGitHub'
              : 'updateRecipesFromGitLab';
          const matchingRecipes = await recipesHexa[updateMethod]({
            payload: webhookPayload,
            organizationId: organization.id,
            headers: config.headers,
          });

          // Verify that matching recipes were returned (in their current state, before updates)
          expect(matchingRecipes).toHaveLength(2);

          const matchingRecipe1 = matchingRecipes.find(
            (r) => r.id === recipe.id,
          );
          const matchingRecipe2 = matchingRecipes.find(
            (r) => r.id === recipe2.id,
          );

          expect(matchingRecipe1).toBeDefined();
          expect(matchingRecipe1?.version).toBe(1); // Still version 1 (current state)

          expect(matchingRecipe2).toBeDefined();
          expect(matchingRecipe2?.version).toBe(1); // Still version 1 (current state)

          // Verify new versions were created for both recipes by the delayed job
          const recipe1Versions = await recipesHexa.listRecipeVersions(
            recipe.id,
          );
          const recipe2Versions = await recipesHexa.listRecipeVersions(
            recipe2.id,
          );

          expect(recipe1Versions).toHaveLength(2);
          expect(recipe2Versions).toHaveLength(2);

          // Check the new versions have the updated content
          const recipe1V2 = recipe1Versions.find((v) => v.version === 2);
          const recipe2V2 = recipe2Versions.find((v) => v.version === 2);

          expect(recipe1V2).toBeDefined();
          expect(recipe1V2?.content).toBe(updatedContent1);

          expect(recipe2V2).toBeDefined();
          expect(recipe2V2?.content).toBe(updatedContent2);
        });
      });

      it('ignores non-push events', async () => {
        // Create non-push event payload
        const webhookPayload = config.createPayload(
          '.packmind/recipes/test-recipe.md',
        );

        const updateMethod =
          config.providerName === 'GitHub'
            ? 'updateRecipesFromGitHub'
            : 'updateRecipesFromGitLab';
        const updatedRecipes = await recipesHexa[updateMethod]({
          payload: webhookPayload,
          organizationId: organization.id,
          headers: config.nonPushHeaders, // Use non-push headers
        });

        // Verify that no recipes were updated
        expect(updatedRecipes).toHaveLength(0);

        // Verify no new versions were created
        const allVersions = await recipesHexa.listRecipeVersions(recipe.id);
        expect(allVersions).toHaveLength(1);
      });

      it('handles gracefully recipes not found in database', async () => {
        // Mock webhook response for recipe that doesn't exist in database
        mockWebhookWithAsyncJobs([
          {
            filePath: '.packmind/recipes/nonexistent-recipe.md',
            fileContent:
              '# Nonexistent Recipe\n\nThis recipe does not exist in the database.',
          },
        ]);

        // Simulate webhook call
        const webhookPayload = config.createPayload(
          '.packmind/recipes/nonexistent-recipe.md',
        );
        const updateMethod =
          config.providerName === 'GitHub'
            ? 'updateRecipesFromGitHub'
            : 'updateRecipesFromGitLab';
        const matchingRecipes = await recipesHexa[updateMethod]({
          payload: webhookPayload,
          organizationId: organization.id,
          headers: config.headers,
        });

        // Verify that no recipes were returned (recipe doesn't exist in database)
        expect(matchingRecipes).toHaveLength(0);

        // Verify existing recipes are unchanged
        const existingVersions = await recipesHexa.listRecipeVersions(
          recipe.id,
        );
        expect(existingVersions).toHaveLength(1);
        expect(existingVersions[0].version).toBe(1);
      });
    });

    describe(`${config.providerName} Target Path Recipe Update`, () => {
      let recipe: Recipe;

      beforeEach(async () => {
        // Create a recipe for target path testing
        recipe = await recipesHexa.captureRecipe({
          name: 'Target Path Test Recipe',
          content: `# Target Path Test Recipe\\n\\nInitial content for ${config.providerName} target path testing.`,
          organizationId: organization.id,
          userId: user.id,
          spaceId: space.id.toString(),
        });
      });

      it('creates new recipe version for recipe updated via target path', async () => {
        // Verify initial state
        const initialVersions = await recipesHexa.listRecipeVersions(recipe.id);
        expect(initialVersions).toHaveLength(1);
        expect(initialVersions[0].version).toBe(1);

        // Mock webhook response with updated content in a target path
        const updatedContent = `# Target Path Test Recipe\\n\\nUpdated content in target path from ${config.providerName} webhook.`;

        mockWebhookWithAsyncJobs([
          {
            filePath: '/jetbrains/.packmind/recipes/target-path-test-recipe.md',
            fileContent: updatedContent,
          },
        ]);

        // Mock deployment checking to simulate recipe is deployed to /jetbrains/ target
        const deploymentsHexa = registry.get(DeploymentsHexa);
        const deploymentUseCases = deploymentsHexa.getDeploymentsUseCases();

        // Get the git repository for this organization
        const organizationRepos = await gitHexa.getOrganizationRepositories(
          organization.id,
        );
        const testGitRepo = organizationRepos[0];

        jest
          .spyOn(deploymentUseCases, 'listDeploymentsByRecipe')
          .mockResolvedValue([
            {
              id: createRecipesDeploymentId('deployment-1'),
              recipeVersions: [initialVersions[0]],
              target: {
                id: createTargetId('target-1'),
                name: 'JetBrains IDE',
                path: '/jetbrains/',
                gitRepoId: testGitRepo.id,
              },
              status: DistributionStatus.success,
              createdAt: new Date().toISOString(),
              authorId: user.id,
              organizationId: organization.id,
              renderModes: [],
            },
          ]);

        // Simulate webhook call
        const webhookPayload = config.createPayload(
          '/jetbrains/.packmind/recipes/target-path-test-recipe.md',
        );
        const updateMethod =
          config.providerName === 'GitHub'
            ? 'updateRecipesFromGitHub'
            : 'updateRecipesFromGitLab';
        const matchingRecipes = await recipesHexa[updateMethod]({
          payload: webhookPayload,
          organizationId: organization.id,
          headers: config.headers,
        });

        // Verify that matching recipe was returned (in current state, before update)
        expect(matchingRecipes).toHaveLength(1);
        expect(matchingRecipes[0].slug).toBe('target-path-test-recipe');
        expect(matchingRecipes[0].version).toBe(1); // Still version 1 (current state)

        // Verify that new version was created by the delayed job
        const allVersions = await recipesHexa.listRecipeVersions(recipe.id);
        expect(allVersions).toHaveLength(2);

        const newVersion = allVersions.find((v) => v.version === 2);
        expect(newVersion).toBeDefined();
        expect(newVersion?.content).toBe(updatedContent);
      });

      it('does not create new recipe version for recipe not deployed to target path', async () => {
        // Verify initial state
        const initialVersions = await recipesHexa.listRecipeVersions(recipe.id);
        expect(initialVersions).toHaveLength(1);
        expect(initialVersions[0].version).toBe(1);

        // Mock webhook response with updated content in a different target path
        const updatedContent = `# Target Path Test Recipe\\n\\nUpdated content in non-deployed target from ${config.providerName} webhook.`;

        mockWebhookWithAsyncJobs([
          {
            filePath:
              '/visual-studio/.packmind/recipes/target-path-test-recipe.md',
            fileContent: updatedContent,
          },
        ]);

        // Mock deployment checking to simulate recipe is only deployed to /jetbrains/ target, not /visual-studio/
        const deploymentsHexa = registry.get(DeploymentsHexa);
        const deploymentUseCases = deploymentsHexa.getDeploymentsUseCases();

        // Get the git repository for this organization
        const organizationRepos = await gitHexa.getOrganizationRepositories(
          organization.id,
        );
        const testGitRepo = organizationRepos[0];

        jest
          .spyOn(deploymentUseCases, 'listDeploymentsByRecipe')
          .mockResolvedValue([
            {
              id: createRecipesDeploymentId('deployment-1'),
              recipeVersions: [initialVersions[0]],
              target: {
                id: createTargetId('target-1'),
                name: 'JetBrains IDE',
                path: '/jetbrains/', // Only deployed to jetbrains, not visual-studio
                gitRepoId: testGitRepo.id,
              },
              status: DistributionStatus.success,
              createdAt: new Date().toISOString(),
              authorId: user.id,
              organizationId: organization.id,
              renderModes: [],
            },
          ]);

        // Simulate webhook call
        const webhookPayload = config.createPayload(
          '/visual-studio/.packmind/recipes/target-path-test-recipe.md',
        );
        const updateMethod =
          config.providerName === 'GitHub'
            ? 'updateRecipesFromGitHub'
            : 'updateRecipesFromGitLab';
        const matchingRecipes = await recipesHexa[updateMethod]({
          payload: webhookPayload,
          organizationId: organization.id,
          headers: config.headers,
        });

        // Verify that no recipe was returned since it's not deployed to /visual-studio/ target
        expect(matchingRecipes).toHaveLength(0);

        // Verify that no new version was created
        const allVersions = await recipesHexa.listRecipeVersions(recipe.id);
        expect(allVersions).toHaveLength(1);
        expect(allVersions[0].version).toBe(1);
      });

      describe('when recipe is updated via target path', () => {
        it('deploys updated recipe version to specific target only', async () => {
          // Setup: Deploy recipe to multiple targets (/jetbrains/ and /vscode/)
          const deploymentsHexa = registry.get(DeploymentsHexa);
          const deploymentUseCases = deploymentsHexa.getDeploymentsUseCases();
          const initialVersions = await recipesHexa.listRecipeVersions(
            recipe.id,
          );

          // Get the git repository for this organization
          const organizationRepos = await gitHexa.getOrganizationRepositories(
            organization.id,
          );
          const testGitRepo = organizationRepos[0];

          // Define the targets
          const jetbrainsTarget = {
            id: createTargetId('target-jetbrains'),
            name: 'JetBrains IDE',
            path: '/jetbrains/',
            gitRepoId: testGitRepo.id,
          };
          const vscodeTarget = {
            id: createTargetId('target-vscode'),
            name: 'VS Code',
            path: '/vscode/',
            gitRepoId: testGitRepo.id,
          };

          // Create initial deployment to multiple targets
          const publishRecipesSpy = jest
            .spyOn(deploymentUseCases, 'publishRecipes')
            .mockResolvedValueOnce([
              {
                id: createRecipesDeploymentId('deployment-initial'),
                recipeVersions: [initialVersions[0]],
                target: jetbrainsTarget,
                status: DistributionStatus.success,
                createdAt: new Date().toISOString(),
                authorId: user.id,
                organizationId: organization.id,
                renderModes: [],
              },
            ]);

          // Deploy recipe V1 to both targets initially
          await deploymentUseCases.publishRecipes({
            gitRepoIds: [testGitRepo.id],
            recipeVersionIds: [initialVersions[0].id],
            userId: user.id,
            organizationId: organization.id,
          });

          // Mock that recipe is deployed to both targets
          jest
            .spyOn(deploymentUseCases, 'listDeploymentsByRecipe')
            .mockResolvedValue([
              {
                id: createRecipesDeploymentId('deployment-1'),
                recipeVersions: [initialVersions[0]],
                target: jetbrainsTarget,
                status: DistributionStatus.success,
                createdAt: new Date().toISOString(),
                authorId: user.id,
                organizationId: organization.id,
                renderModes: [],
              },
            ]);

          // Mock getTargetsByGitRepo to return both targets
          jest
            .spyOn(deploymentUseCases, 'getTargetsByGitRepo')
            .mockResolvedValue([jetbrainsTarget, vscodeTarget]);

          // Reset spy to track new deployment calls
          publishRecipesSpy.mockReset();
          publishRecipesSpy.mockResolvedValue([
            {
              id: createRecipesDeploymentId('deployment-target-specific'),
              recipeVersions: [],
              target: jetbrainsTarget,
              status: DistributionStatus.failure,
              createdAt: new Date().toISOString(),
              authorId: createUserId('system'), // webhook deployments use system user
              organizationId: organization.id,
              renderModes: [],
            },
          ]);

          // Mock webhook response with updated content in /jetbrains/ target path
          const updatedContent = `# Target Path Test Recipe\\n\\nUpdated content in /jetbrains/ target from ${config.providerName} webhook V2.`;

          mockWebhookWithAsyncJobs([
            {
              filePath:
                '/jetbrains/.packmind/recipes/target-path-test-recipe.md',
              fileContent: updatedContent,
            },
          ]);

          // Simulate webhook call for /jetbrains/ target
          const webhookPayload = config.createPayload(
            '/jetbrains/.packmind/recipes/target-path-test-recipe.md',
          );
          const updateMethod =
            config.providerName === 'GitHub'
              ? 'updateRecipesFromGitHub'
              : 'updateRecipesFromGitLab';
          const matchingRecipes = await recipesHexa[updateMethod]({
            payload: webhookPayload,
            organizationId: organization.id,
            headers: config.headers,
          });

          // Verify that matching recipe was returned (in current state, before update)
          expect(matchingRecipes).toHaveLength(1);
          expect(matchingRecipes[0].version).toBe(1); // Still version 1 (current state)

          // Verify that new version was created by the delayed job
          const allVersions = await recipesHexa.listRecipeVersions(recipe.id);
          expect(allVersions).toHaveLength(2);
          const newVersion = allVersions.find((v) => v.version === 2);
          expect(newVersion).toBeDefined();
          expect(newVersion?.content).toBe(updatedContent);

          // Verify that deployment was triggered automatically after recipe update
          expect(publishRecipesSpy).toHaveBeenCalledTimes(1);
          const deploymentCall = publishRecipesSpy.mock.calls[0][0];

          // Desired implementation (should use targetIds for target-specific deployment):
          expect(deploymentCall.targetIds).toBeDefined();
          expect(deploymentCall.targetIds).toEqual([jetbrainsTarget.id]);
          expect(deploymentCall.gitRepoIds).toBeUndefined();

          expect(deploymentCall.recipeVersionIds).toHaveLength(1);
          expect(deploymentCall.recipeVersionIds[0]).toBe(newVersion?.id);
          expect(deploymentCall.organizationId).toBe(organization.id);
          expect(deploymentCall.userId).toBe(createUserId('system')); // webhook deployments use system user
        });
      });
    });
  });
}

// GitHub webhook configuration
contractWebhookTest({
  providerName: 'GitHub',
  providerVendor: GitProviderVendors.github,
  baseUrl: 'https://api.github.com',
  expectedEvent: 'push',
  nonPushEvent: 'pull_request',
  createPayload: (filePath: string) => ({
    ref: 'refs/heads/main',
    repository: {
      name: 'test-repo',
      owner: {
        name: 'test-owner',
        login: 'test-owner',
      },
    },
    commits: [
      {
        id: 'abc123def456',
        message: 'Update recipe content',
        added: [],
        removed: [],
        modified: [filePath],
        timestamp: new Date().toISOString(),
        url: 'https://github.com/test-owner/test-repo/commit/abc123def456',
        author: {
          name: 'Test Developer',
          email: 'test@example.com',
        },
      },
    ],
    head_commit: {
      id: 'abc123def456',
      message: 'Update recipe content',
      timestamp: new Date().toISOString(),
      url: 'https://github.com/test-owner/test-repo/commit/abc123def456',
      author: {
        name: 'Test Developer',
        email: 'test@example.com',
      },
    },
  }),
  headers: {
    'x-github-event': 'push',
    'x-github-delivery': 'test-delivery-123',
  },
  nonPushHeaders: {
    'x-github-event': 'pull_request',
    'x-github-delivery': 'test-delivery-456',
  },
});

// GitLab webhook configuration
contractWebhookTest({
  providerName: 'GitLab',
  providerVendor: GitProviderVendors.gitlab,
  baseUrl: 'https://gitlab.com',
  expectedEvent: 'push',
  nonPushEvent: 'merge_request',
  createPayload: (filePath: string) => ({
    object_kind: 'push',
    event_name: 'push',
    before: '0000000000000000000000000000000000000000',
    after: 'abc123def456789012345678901234567890abcd',
    ref: 'refs/heads/main',
    checkout_sha: 'abc123def456789012345678901234567890abcd',
    user_id: 123,
    user_name: 'testdeveloper',
    user_username: 'testdeveloper',
    user_email: 'test@example.com',
    user_avatar: 'https://secure.gravatar.com/avatar/avatar.png',
    project_id: 456,
    project: {
      id: 456,
      name: 'test-repo',
      description: 'Test repository for webhooks',
      web_url: 'https://gitlab.com/test-owner/test-repo',
      avatar_url: null,
      git_ssh_url: 'git@gitlab.com:test-owner/test-repo.git',
      git_http_url: 'https://gitlab.com/test-owner/test-repo.git',
      namespace: 'test-owner',
      visibility_level: 0,
      path_with_namespace: 'test-owner/test-repo',
      default_branch: 'main',
      homepage: 'https://gitlab.com/test-owner/test-repo',
      url: 'git@gitlab.com:test-owner/test-repo.git',
      ssh_url: 'git@gitlab.com:test-owner/test-repo.git',
      http_url: 'https://gitlab.com/test-owner/test-repo.git',
    },
    repository: {
      name: 'test-repo',
      url: 'git@gitlab.com:test-owner/test-repo.git',
      description: 'Test repository for webhooks',
      homepage: 'https://gitlab.com/test-owner/test-repo',
      git_http_url: 'https://gitlab.com/test-owner/test-repo.git',
      git_ssh_url: 'git@gitlab.com:test-owner/test-repo.git',
      visibility_level: 0,
    },
    commits: [
      {
        id: 'abc123def456789012345678901234567890abcd',
        message: 'Update recipe content',
        timestamp: new Date().toISOString(),
        url: 'https://gitlab.com/test-owner/test-repo/-/commit/abc123def456789012345678901234567890abcd',
        author: {
          name: 'Test Developer',
          email: 'test@example.com',
        },
        added: [],
        modified: [filePath],
        removed: [],
      },
    ],
    total_commits_count: 1,
  }),
  headers: {
    'x-gitlab-event': 'Push Hook',
    'x-gitlab-token': 'test-webhook-token',
  },
  nonPushHeaders: {
    'x-gitlab-event': 'Merge Request Hook',
    'x-gitlab-token': 'test-webhook-token',
  },
});
