import { GitCommitSchema } from '@packmind/git';
import { gitCommitFactory } from '@packmind/git/test';
import {
  UpdateRecipesAndGenerateSummariesCallback,
  UpdateRecipesAndGenerateSummariesInput,
  DeployRecipesCallback,
  DeployRecipesInput,
} from '@packmind/recipes';
import {
  createDistributionId,
  createTargetId,
  createUserId,
  DistributionStatus,
  GitProviderVendors,
  GitRepo,
  Package,
  Recipe,
} from '@packmind/types';
import { createIntegrationTestFixture } from '../helpers/createIntegrationTestFixture';
import { DataFactory } from '../helpers/DataFactory';
import { integrationTestSchemas } from '../helpers/makeIntegrationTestDataSource';
import { TestApp } from '../helpers/TestApp';

// Increase timeout for integration tests to reduce flakiness
jest.setTimeout(10000);

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
    const fixture = createIntegrationTestFixture(integrationTestSchemas);

    let testApp: TestApp;
    let dataFactory: DataFactory;

    let recipe: Recipe;
    let gitRepo: GitRepo;
    let recipePackage: Package;

    /**
     * Helper function to mock the async delayed job pattern for webhooks
     * This mocks handleWebHookWithoutContent, addFetchFileContentJob, and the delayed jobs
     * to execute synchronously in tests
     */
    const mockWebhookWithAsyncJobs = async (
      files: Array<{ filePath: string; fileContent: string }>,
    ) => {
      // Create a real GitCommit in the database for the test
      const mockGitCommit = await fixture.datasource
        .getRepository(GitCommitSchema)
        .save(gitCommitFactory());

      // Mock handleWebHookWithoutContent on the adapter to return list of changed files (without content)
      const gitAdapter = testApp.gitHexa.getAdapter();
      jest.spyOn(gitAdapter, 'handleWebHookWithoutContent').mockResolvedValue(
        files.map((f) => ({
          filePath: f.filePath,
          gitCommit: mockGitCommit,
        })),
      );

      // Get the recipes delayed jobs to mock them
      const recipesDelayedJobs =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (testApp.recipesHexa.getAdapter() as any).getRecipesDelayedJobs();

      // Mock UpdateRecipesAndGenerateSummaries delayed job to execute synchronously
      jest
        .spyOn(
          recipesDelayedJobs.updateRecipesAndGenerateSummariesDelayedJob,
          'addJobWithCallback',
        )
        .mockImplementation((async (
          input: UpdateRecipesAndGenerateSummariesInput,
          callback?: UpdateRecipesAndGenerateSummariesCallback,
        ) => {
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any);

      // Mock DeployRecipes delayed job to execute synchronously
      jest
        .spyOn(recipesDelayedJobs.deployRecipesDelayedJob, 'addJobWithCallback')
        .mockImplementation((async (
          input: DeployRecipesInput,
          callback?: DeployRecipesCallback,
        ) => {
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any);

      // Mock addFetchFileContentJob to immediately execute callback
      jest
        .spyOn(gitAdapter, 'addFetchFileContentJob')
        .mockImplementation(async (input, callback) => {
          if (callback) {
            // Execute callback immediately with file content
            await callback({
              organizationId: input.organizationId,
              gitRepoId: input.gitRepoId,
              files: files.map((f) => ({
                filePath: f.filePath,
                fileContent: f.fileContent,
                gitCommit: mockGitCommit,
              })),
            });
          }
          return 'job-id';
        });
    };

    beforeAll(() => fixture.initialize());

    beforeEach(async () => {
      testApp = new TestApp(fixture.datasource);
      await testApp.initialize();

      dataFactory = new DataFactory(testApp);
      await dataFactory.withGitProvider({
        source: config.providerVendor,
        url: config.baseUrl,
        token: `test-${config.providerName.toLowerCase()}-token`,
      });
      gitRepo = (await dataFactory.withGitRepo()).gitRepo;

      recipe = await dataFactory.withRecipe({
        name: 'Test Recipe',
        content: `# Test Recipe\n\nInitial content for testing ${config.providerName} webhooks.`,
      });
    });

    afterEach(async () => {
      jest.restoreAllMocks();
      await fixture.cleanup();
    });

    afterAll(() => fixture.destroy());

    describe(`${config.providerName} Webhook Recipe Update Flow`, () => {
      describe('when the recipe is not deployed on the target', () => {
        let matchingRecipes: Recipe[];

        beforeEach(async () => {
          // Mock webhook response with updated content
          const updatedContent = `# Test Recipe\n\nUpdated content from ${config.providerName} webhook.`;

          await mockWebhookWithAsyncJobs([
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

          matchingRecipes = await testApp.recipesHexa
            .getAdapter()
            [updateMethod]({
              payload: webhookPayload,
              headers: config.headers,
              ...dataFactory.packmindCommand(),
            });
        });

        it('does not return matching recipes', () => {
          expect(matchingRecipes).toEqual([]);
        });

        it('does not create a new recipe version', async () => {
          // Verify that no new recipe version was created (recipe not deployed)
          const allVersions = await testApp.recipesHexa
            .getAdapter()
            .listRecipeVersions(recipe.id);

          expect(allVersions).toEqual([
            expect.objectContaining({
              version: 1,
            }),
          ]);
        });
      });

      describe('when the recipe is deployed on the target', () => {
        async function createGitCommit() {
          const gitCommitRepo =
            fixture.datasource.getRepository(GitCommitSchema);
          return gitCommitRepo.save(gitCommitFactory());
        }

        async function createAndDistributePackage(
          recipes: Recipe[],
          name: string,
        ): Promise<Package> {
          const response = await testApp.deploymentsHexa
            .getAdapter()
            .createPackage({
              userId: dataFactory.user.id,
              organizationId: dataFactory.organization.id,
              spaceId: dataFactory.space.id,
              name,
              description: `Package for ${name}`,
              standardIds: [],
              recipeIds: recipes.map((r) => r.id),
            });
          const pkg = response.package;

          await testApp.deploymentsHexa.getAdapter().publishPackages({
            ...dataFactory.packmindCommand(),
            packageIds: [pkg.id],
            targetIds: [dataFactory.target.id],
          });

          return pkg;
        }

        beforeEach(async () => {
          // Mock commitToGit on the adapter instead of GitHexa
          // Store the adapter to ensure we're mocking the same instance
          const gitAdapter = testApp.gitHexa.getAdapter();
          jest
            .spyOn(gitAdapter, 'commitToGit')
            .mockResolvedValue(await createGitCommit());

          recipePackage = await createAndDistributePackage(
            [recipe],
            'Test Recipe Package',
          );

          // Verify initial state
          const initialVersions = await testApp.recipesHexa
            .getAdapter()
            .listRecipeVersions(recipe.id);
          expect(initialVersions).toEqual([
            expect.objectContaining({
              version: 1,
              content: `# Test Recipe\n\nInitial content for testing ${config.providerName} webhooks.`,
            }),
          ]);
        });

        describe('when the content is identical to the recipe content', () => {
          let matchingRecipes: Recipe[];

          beforeEach(async () => {
            await mockWebhookWithAsyncJobs([
              {
                filePath: '.packmind/recipes/test-recipe.md',
                fileContent: recipe.content,
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
            matchingRecipes = await testApp.recipesHexa
              .getAdapter()
              [updateMethod]({
                payload: webhookPayload,
                headers: config.headers,
                ...dataFactory.packmindCommand(),
              });
          });

          it('returns the matching recipes', () => {
            expect(matchingRecipes).toEqual([
              expect.objectContaining({
                id: recipe.id,
              }),
            ]);
          });

          it('preserves existing recipe with identical webhook content', async () => {
            // Verify that no new recipe version was created (content was identical)
            const allVersions = await testApp.recipesHexa
              .getAdapter()
              .listRecipeVersions(recipe.id);

            expect(allVersions).toEqual([
              expect.objectContaining({
                recipeId: recipe.id,
                version: 1,
              }),
            ]);
          });
        });

        describe('when the content differs from the recipe', () => {
          const updatedContent = `# Test Recipe\n\nUpdated content from ${config.providerName} webhook.`;
          let matchingRecipes: Recipe[];

          beforeEach(async () => {
            await mockWebhookWithAsyncJobs([
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

            matchingRecipes = await testApp.recipesHexa
              .getAdapter()
              [updateMethod]({
                payload: webhookPayload,
                headers: config.headers,
                ...dataFactory.packmindCommand(),
              });
          });

          it('returns the recipes matching the changes', () => {
            expect(matchingRecipes).toEqual([
              expect.objectContaining({
                version: 1,
                content: `# Test Recipe\n\nInitial content for testing ${config.providerName} webhooks.`,
              }),
            ]);
          });

          it('creates new recipe version after webhook receives updated content', async () => {
            const allVersions = await testApp.recipesHexa
              .getAdapter()
              .listRecipeVersions(recipe.id);
            expect(allVersions).toEqual([
              expect.objectContaining({
                version: 2,
                content: updatedContent,
              }),
              expect.objectContaining({
                version: 1,
                content: `# Test Recipe\n\nInitial content for testing ${config.providerName} webhooks.`,
              }),
            ]);
          });

          describe('automatic deployment to source repository', () => {
            let distributions: Awaited<
              ReturnType<
                typeof testApp.deploymentsHexa.getAdapter.prototype.listDistributionsByRecipe
              >
            >;

            beforeEach(async () => {
              distributions = await testApp.deploymentsHexa
                .getAdapter()
                .listDistributionsByRecipe({
                  ...dataFactory.packmindCommand(),
                  recipeId: recipe.id,
                });
            });

            it('has exactly one distribution', () => {
              expect(distributions).toHaveLength(1);
            });

            it('targets the expected repository', () => {
              expect(distributions[0]).toEqual(
                expect.objectContaining({
                  target: expect.objectContaining({
                    id: dataFactory.target.id,
                  }),
                }),
              );
            });

            it('is authored by the expected user', () => {
              expect(distributions[0]).toEqual(
                expect.objectContaining({
                  authorId: dataFactory.user.id,
                }),
              );
            });

            it('includes the recipe package', () => {
              expect(distributions[0]).toEqual(
                expect.objectContaining({
                  distributedPackages: expect.arrayContaining([
                    expect.objectContaining({
                      packageId: recipePackage.id,
                    }),
                  ]),
                }),
              );
            });
          });
        });

        describe('when multiple recipes are updated in a single webhook', () => {
          let recipe2: Recipe;
          let matchingRecipes: Recipe[];

          const updatedContent1 = `# Test Recipe\n\nUpdated content for first recipe from ${config.providerName}.`;
          const updatedContent2 = `# Second Recipe\n\nUpdated content for second recipe from ${config.providerName}.`;

          beforeEach(async () => {
            recipe2 = await dataFactory.withRecipe({
              name: 'Second Recipe',
              content: '# Second Recipe\n\nInitial content for second recipe.',
            });

            // Ensure commitToGit mock is still active (re-apply to be safe)
            const gitAdapter = testApp.gitHexa.getAdapter();
            jest
              .spyOn(gitAdapter, 'commitToGit')
              .mockResolvedValue(await createGitCommit());

            // Distribute second recipe via package
            await createAndDistributePackage(
              [recipe2],
              'Second Recipe Package',
            );

            await mockWebhookWithAsyncJobs([
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

            matchingRecipes = await testApp.recipesHexa
              .getAdapter()
              [updateMethod]({
                payload: webhookPayload,
                headers: config.headers,
                ...dataFactory.packmindCommand(),
              });
          });

          it('returns all matching recipes', () => {
            expect(matchingRecipes).toEqual([
              expect.objectContaining({
                id: recipe.id,
                version: 1,
              }),
              expect.objectContaining({
                id: recipe2.id,
                version: 1,
              }),
            ]);
          });

          describe('multiple recipe updates in single webhook', () => {
            let recipe1Versions: Awaited<
              ReturnType<
                typeof testApp.recipesHexa.getAdapter.prototype.listRecipeVersions
              >
            >;
            let recipe2Versions: Awaited<
              ReturnType<
                typeof testApp.recipesHexa.getAdapter.prototype.listRecipeVersions
              >
            >;

            beforeEach(async () => {
              recipe1Versions = await testApp.recipesHexa
                .getAdapter()
                .listRecipeVersions(recipe.id);
              recipe2Versions = await testApp.recipesHexa
                .getAdapter()
                .listRecipeVersions(recipe2.id);
            });

            it('creates two versions for first recipe', () => {
              expect(recipe1Versions).toHaveLength(2);
            });

            it('creates two versions for second recipe', () => {
              expect(recipe2Versions).toHaveLength(2);
            });

            it('updates first recipe content to new version', () => {
              const recipe1V2 = recipe1Versions.find((v) => v.version === 2);
              expect(recipe1V2?.content).toBe(updatedContent1);
            });

            it('updates second recipe content to new version', () => {
              const recipe2V2 = recipe2Versions.find((v) => v.version === 2);
              expect(recipe2V2?.content).toBe(updatedContent2);
            });
          });
        });
      });

      describe('when event is no a push event', () => {
        let updatedRecipes: Recipe[];

        beforeEach(async () => {
          const webhookPayload = config.createPayload(
            '.packmind/recipes/test-recipe.md',
          );

          const updateMethod =
            config.providerName === 'GitHub'
              ? 'updateRecipesFromGitHub'
              : 'updateRecipesFromGitLab';
          updatedRecipes = await testApp.recipesHexa
            .getAdapter()
            [updateMethod]({
              payload: webhookPayload,
              headers: config.nonPushHeaders, // Use non-push headers
              ...dataFactory.packmindCommand(),
            });
        });

        it('does not return updated recipes', () => {
          expect(updatedRecipes).toEqual([]);
        });

        it('does not create new versions of the recipes', async () => {
          const allVersions = await testApp.recipesHexa
            .getAdapter()
            .listRecipeVersions(recipe.id);
          expect(allVersions).toEqual([
            expect.objectContaining({
              version: 1,
            }),
          ]);
        });
      });

      describe('when recipe does not exist', () => {
        let matchingRecipes: Recipe[];

        beforeEach(async () => {
          await mockWebhookWithAsyncJobs([
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
          matchingRecipes = await testApp.recipesHexa
            .getAdapter()
            [updateMethod]({
              payload: webhookPayload,
              headers: config.headers,
              ...dataFactory.packmindCommand(),
            });
        });

        it('does not return updated recipes', () => {
          expect(matchingRecipes).toHaveLength(0);
        });

        it('does not create new versions of the recipe', async () => {
          const allVersions = await testApp.recipesHexa
            .getAdapter()
            .listRecipeVersions(recipe.id);
          expect(allVersions).toEqual([
            expect.objectContaining({
              version: 1,
            }),
          ]);
        });
      });
    });

    describe(`${config.providerName} Target Path Recipe Update`, () => {
      let recipe: Recipe;

      beforeEach(async () => {
        // Create a recipe for target path testing
        recipe = await dataFactory.withRecipe({
          name: 'Target Path Test Recipe',
          content: `# Target Path Test Recipe\\n\\nInitial content for ${config.providerName} target path testing.`,
        });
      });

      describe('when recipe is updated via deployed target path', () => {
        const updatedContent = `# Target Path Test Recipe\\n\\nUpdated content in target path from webhook.`;
        let matchingRecipes: Recipe[];
        let allVersions: Awaited<
          ReturnType<
            typeof testApp.recipesHexa.getAdapter.prototype.listRecipeVersions
          >
        >;

        beforeEach(async () => {
          const initialVersions = await testApp.recipesHexa
            .getAdapter()
            .listRecipeVersions(recipe.id);

          await mockWebhookWithAsyncJobs([
            {
              filePath:
                '/jetbrains/.packmind/recipes/target-path-test-recipe.md',
              fileContent: updatedContent,
            },
          ]);

          jest
            .spyOn(
              testApp.deploymentsHexa.getAdapter(),
              'listDistributionsByRecipe',
            )
            .mockResolvedValue([
              {
                id: createDistributionId('distribution-1'),
                distributedPackages: [
                  {
                    id: 'distributed-pkg-1' as never,
                    distributionId: createDistributionId('distribution-1'),
                    packageId: 'pkg-1' as never,
                    recipeVersions: [initialVersions[0]],
                    standardVersions: [],
                    skillVersions: [],
                    operation: 'add',
                  },
                ],
                target: {
                  id: createTargetId('target-1'),
                  name: 'JetBrains IDE',
                  path: '/jetbrains/',
                  gitRepoId: gitRepo.id,
                },
                status: DistributionStatus.success,
                createdAt: new Date().toISOString(),
                authorId: dataFactory.user.id,
                organizationId: dataFactory.organization.id,
                renderModes: [],
                source: 'cli',
              },
            ]);

          const webhookPayload = config.createPayload(
            '/jetbrains/.packmind/recipes/target-path-test-recipe.md',
          );
          const updateMethod =
            config.providerName === 'GitHub'
              ? 'updateRecipesFromGitHub'
              : 'updateRecipesFromGitLab';
          matchingRecipes = await testApp.recipesHexa
            .getAdapter()
            [updateMethod]({
              payload: webhookPayload,
              headers: config.headers,
              ...dataFactory.packmindCommand(),
            });

          allVersions = await testApp.recipesHexa
            .getAdapter()
            .listRecipeVersions(recipe.id);
        });

        it('returns exactly one matching recipe', () => {
          expect(matchingRecipes).toHaveLength(1);
        });

        it('returns recipe with correct slug', () => {
          expect(matchingRecipes[0].slug).toBe('target-path-test-recipe');
        });

        it('returns recipe at version 1 before update completes', () => {
          expect(matchingRecipes[0].version).toBe(1);
        });

        it('creates a new version in the delayed job', () => {
          expect(allVersions).toHaveLength(2);
        });

        it('updates new version with correct content', () => {
          const newVersion = allVersions.find((v) => v.version === 2);
          expect(newVersion?.content).toBe(updatedContent);
        });
      });

      describe('when recipe is not deployed to webhook target path', () => {
        let matchingRecipes: Recipe[];
        let allVersions: Awaited<
          ReturnType<
            typeof testApp.recipesHexa.getAdapter.prototype.listRecipeVersions
          >
        >;

        beforeEach(async () => {
          const initialVersions = await testApp.recipesHexa
            .getAdapter()
            .listRecipeVersions(recipe.id);

          const updatedContent = `# Target Path Test Recipe\\n\\nUpdated content in non-deployed target from webhook.`;

          await mockWebhookWithAsyncJobs([
            {
              filePath:
                '/visual-studio/.packmind/recipes/target-path-test-recipe.md',
              fileContent: updatedContent,
            },
          ]);

          jest
            .spyOn(
              testApp.deploymentsHexa.getAdapter(),
              'listDistributionsByRecipe',
            )
            .mockResolvedValue([
              {
                id: createDistributionId('distribution-1'),
                distributedPackages: [
                  {
                    id: 'distributed-pkg-1' as never,
                    distributionId: createDistributionId('distribution-1'),
                    packageId: 'pkg-1' as never,
                    recipeVersions: [initialVersions[0]],
                    standardVersions: [],
                    skillVersions: [],
                    operation: 'add',
                  },
                ],
                target: {
                  id: createTargetId('target-1'),
                  name: 'JetBrains IDE',
                  path: '/jetbrains/',
                  gitRepoId: gitRepo.id,
                },
                status: DistributionStatus.success,
                createdAt: new Date().toISOString(),
                authorId: dataFactory.user.id,
                organizationId: dataFactory.organization.id,
                renderModes: [],
                source: 'cli',
              },
            ]);

          const webhookPayload = config.createPayload(
            '/visual-studio/.packmind/recipes/target-path-test-recipe.md',
          );
          const updateMethod =
            config.providerName === 'GitHub'
              ? 'updateRecipesFromGitHub'
              : 'updateRecipesFromGitLab';
          matchingRecipes = await testApp.recipesHexa
            .getAdapter()
            [updateMethod]({
              payload: webhookPayload,
              headers: config.headers,
              ...dataFactory.packmindCommand(),
            });

          allVersions = await testApp.recipesHexa
            .getAdapter()
            .listRecipeVersions(recipe.id);
        });

        it('returns no matching recipes', () => {
          expect(matchingRecipes).toHaveLength(0);
        });

        it('does not create new version', () => {
          expect(allVersions).toHaveLength(1);
        });

        it('keeps original version unchanged', () => {
          expect(allVersions[0].version).toBe(1);
        });
      });

      describe('when recipe is updated via target path for deployment', () => {
        const updatedContent = `# Target Path Test Recipe\\n\\nUpdated content in /jetbrains/ target from webhook V2.`;
        let matchingRecipes: Recipe[];
        let allVersions: Awaited<
          ReturnType<
            typeof testApp.recipesHexa.getAdapter.prototype.listRecipeVersions
          >
        >;
        let publishArtifactsSpy: jest.SpyInstance;
        let jetbrainsTarget: {
          id: ReturnType<typeof createTargetId>;
          name: string;
          path: string;
          gitRepoId: typeof gitRepo.id;
        };

        beforeEach(async () => {
          const initialVersions = await testApp.recipesHexa
            .getAdapter()
            .listRecipeVersions(recipe.id);

          jetbrainsTarget = {
            id: createTargetId('target-jetbrains'),
            name: 'JetBrains IDE',
            path: '/jetbrains/',
            gitRepoId: gitRepo.id,
          };
          const vscodeTarget = {
            id: createTargetId('target-vscode'),
            name: 'VS Code',
            path: '/vscode/',
            gitRepoId: gitRepo.id,
          };

          publishArtifactsSpy = jest
            .spyOn(testApp.deploymentsHexa.getAdapter(), 'publishArtifacts')
            .mockResolvedValueOnce({
              distributions: [
                {
                  id: createDistributionId('distribution-initial'),
                  distributedPackages: [
                    {
                      id: 'distributed-pkg-initial' as never,
                      distributionId: createDistributionId(
                        'distribution-initial',
                      ),
                      packageId: 'pkg-1' as never,
                      recipeVersions: [initialVersions[0]],
                      standardVersions: [],
                      skillVersions: [],
                      operation: 'add',
                    },
                  ],
                  target: jetbrainsTarget,
                  status: DistributionStatus.success,
                  createdAt: new Date().toISOString(),
                  authorId: dataFactory.user.id,
                  organizationId: dataFactory.organization.id,
                  renderModes: [],
                  source: 'cli',
                },
              ],
            });

          await testApp.deploymentsHexa.getAdapter().publishArtifacts({
            targetIds: [dataFactory.target.id],
            recipeVersionIds: [initialVersions[0].id],
            standardVersionIds: [],
            packagesSlugs: [],
            packageIds: [],
            ...dataFactory.packmindCommand(),
          });

          jest
            .spyOn(
              testApp.deploymentsHexa.getAdapter(),
              'listDistributionsByRecipe',
            )
            .mockResolvedValue([
              {
                id: createDistributionId('distribution-1'),
                distributedPackages: [
                  {
                    id: 'distributed-pkg-1' as never,
                    distributionId: createDistributionId('distribution-1'),
                    packageId: 'pkg-1' as never,
                    recipeVersions: [initialVersions[0]],
                    standardVersions: [],
                    skillVersions: [],
                    operation: 'add',
                  },
                ],
                target: jetbrainsTarget,
                status: DistributionStatus.success,
                createdAt: new Date().toISOString(),
                authorId: dataFactory.user.id,
                organizationId: dataFactory.organization.id,
                renderModes: [],
                source: 'cli',
              },
            ]);

          jest
            .spyOn(testApp.deploymentsHexa.getAdapter(), 'getTargetsByGitRepo')
            .mockResolvedValue([jetbrainsTarget, vscodeTarget]);

          publishArtifactsSpy.mockReset();
          publishArtifactsSpy.mockResolvedValue({
            distributions: [
              {
                id: createDistributionId('distribution-target-specific'),
                distributedPackages: [],
                target: jetbrainsTarget,
                status: DistributionStatus.failure,
                createdAt: new Date().toISOString(),
                authorId: createUserId('system'),
                organizationId: dataFactory.organization.id,
                renderModes: [],
                source: 'cli',
              },
            ],
          });

          await mockWebhookWithAsyncJobs([
            {
              filePath:
                '/jetbrains/.packmind/recipes/target-path-test-recipe.md',
              fileContent: updatedContent,
            },
          ]);

          const webhookPayload = config.createPayload(
            '/jetbrains/.packmind/recipes/target-path-test-recipe.md',
          );
          const updateMethod =
            config.providerName === 'GitHub'
              ? 'updateRecipesFromGitHub'
              : 'updateRecipesFromGitLab';
          matchingRecipes = await testApp.recipesHexa
            .getAdapter()
            [updateMethod]({
              payload: webhookPayload,
              headers: config.headers,
              ...dataFactory.packmindCommand(),
            });

          allVersions = await testApp.recipesHexa
            .getAdapter()
            .listRecipeVersions(recipe.id);
        });

        it('returns exactly one matching recipe', () => {
          expect(matchingRecipes).toHaveLength(1);
        });

        it('returns recipe at version 1 before update', () => {
          expect(matchingRecipes[0].version).toBe(1);
        });

        it('creates two versions after delayed job', () => {
          expect(allVersions).toHaveLength(2);
        });

        it('updates new version with correct content', () => {
          const newVersion = allVersions.find((v) => v.version === 2);
          expect(newVersion?.content).toBe(updatedContent);
        });

        it('triggers deployment exactly once', () => {
          expect(publishArtifactsSpy).toHaveBeenCalledTimes(1);
        });

        it('deploys to jetbrains target only', () => {
          const deploymentCall = publishArtifactsSpy.mock.calls[0][0];
          expect(deploymentCall.targetIds).toEqual([jetbrainsTarget.id]);
        });

        it('includes one recipe version in deployment', () => {
          const deploymentCall = publishArtifactsSpy.mock.calls[0][0];
          expect(deploymentCall.recipeVersionIds).toHaveLength(1);
        });

        it('deploys the new version', () => {
          const newVersion = allVersions.find((v) => v.version === 2);
          const deploymentCall = publishArtifactsSpy.mock.calls[0][0];
          expect(deploymentCall.recipeVersionIds[0]).toBe(newVersion?.id);
        });

        it('includes no standard versions in deployment', () => {
          const deploymentCall = publishArtifactsSpy.mock.calls[0][0];
          expect(deploymentCall.standardVersionIds).toEqual([]);
        });

        it('uses correct organization for deployment', () => {
          const deploymentCall = publishArtifactsSpy.mock.calls[0][0];
          expect(deploymentCall.organizationId).toBe(
            dataFactory.organization.id,
          );
        });

        it('uses system user for webhook deployments', () => {
          const deploymentCall = publishArtifactsSpy.mock.calls[0][0];
          expect(deploymentCall.userId).toBe(createUserId('system'));
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
