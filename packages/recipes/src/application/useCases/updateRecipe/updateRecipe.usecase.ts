import { RecipeService } from '../../services/RecipeService';
import { RecipeVersionService } from '../../services/RecipeVersionService';
import { GitHexa } from '@packmind/git';
import { Recipe } from '../../../domain/entities/Recipe';
import { PackmindLogger } from '@packmind/shared';
import { OrganizationId } from '@packmind/accounts';
import { RecipeSummaryService } from '../../services/RecipeSummaryService';

const origin = 'UpdateRecipeUsecase';

interface GitHubWebhookPayload {
  repository?: {
    name?: string;
    owner?: {
      name?: string;
      login?: string;
    };
  };
}

interface GitLabWebhookPayload {
  object_kind: string;
  event_name: string;
  project: {
    id: number;
    name: string;
    namespace: string;
    path_with_namespace: string;
  };
}

interface CommonRepoData {
  owner: string;
  name: string;
}

export class UpdateRecipeUsecase {
  constructor(
    private readonly recipeService: RecipeService,
    private readonly recipeVersionService: RecipeVersionService,
    private readonly gitHexa: GitHexa,
    private readonly recipeSummaryService: RecipeSummaryService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('UpdateRecipeUsecase initialized');
  }

  public async updateRecipesFromGitHub(
    payload: unknown,
    organizationId: OrganizationId,
    headers: Record<string, string> = {},
  ): Promise<Recipe[]> {
    this.logger.info('Starting updateRecipesFromGitHub process');

    try {
      // Check if this is a push event using headers
      const githubEvent = headers['x-github-event'];
      const isPushEvent = githubEvent === 'push';

      this.logger.debug('Checking if webhook is a GitHub push event', {
        eventType: githubEvent,
        isPushEvent,
      });

      if (!isPushEvent) {
        this.logger.info('Skipping non-push event', { eventType: githubEvent });
        return [];
      }

      // Extract GitHub-specific repository info
      const repoData = this.extractGitHubRepoInfo(payload);
      if (!repoData) {
        this.logger.warn(
          'Could not extract GitHub repository info from webhook payload',
        );
        return [];
      }

      // Call common processing logic
      return this.processWebhookPayload(
        repoData,
        organizationId,
        'github',
        payload,
      );
    } catch (error) {
      this.logger.error('Failed to update recipes from GitHub', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async updateRecipesFromGitLab(
    payload: unknown,
    organizationId: OrganizationId,
    headers: Record<string, string> = {},
  ): Promise<Recipe[]> {
    this.logger.info('Starting updateRecipesFromGitLab process');

    try {
      // Check if this is a push event using headers
      const gitlabEvent = headers['x-gitlab-event'];
      const isPushEvent = gitlabEvent === 'Push Hook';

      this.logger.debug('Checking if webhook is a GitLab push event', {
        eventType: gitlabEvent,
        isPushEvent,
      });

      if (!isPushEvent) {
        this.logger.info('Skipping non-push event', { eventType: gitlabEvent });
        return [];
      }

      // Extract GitLab-specific repository info
      const repoData = this.extractGitLabRepoInfo(payload);
      if (!repoData) {
        this.logger.warn(
          'Could not extract GitLab repository info from webhook payload',
          { payload: JSON.stringify(payload).substring(0, 200) },
        );
        return [];
      }

      this.logger.debug('Extracted GitLab repository info from webhook', {
        owner: repoData.owner,
        name: repoData.name,
      });

      // Call common processing logic
      return this.processWebhookPayload(
        repoData,
        organizationId,
        'gitlab',
        payload,
      );
    } catch (error) {
      this.logger.error('Failed to update recipes from GitLab', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private extractGitHubRepoInfo(payload: unknown): CommonRepoData | null {
    const webhookPayload = payload as GitHubWebhookPayload;
    const repoOwner =
      webhookPayload?.repository?.owner?.name ||
      webhookPayload?.repository?.owner?.login;
    const repoName = webhookPayload?.repository?.name;

    if (!repoOwner || !repoName) {
      return null;
    }

    return {
      owner: repoOwner,
      name: repoName,
    };
  }

  private extractGitLabRepoInfo(payload: unknown): CommonRepoData | null {
    const webhookPayload = payload as GitLabWebhookPayload;
    const pathWithNamespace = webhookPayload?.project?.path_with_namespace;

    if (pathWithNamespace) {
      // GitLab path_with_namespace format: "group/subgroup/project" or "owner/repo"
      // We need to extract the owner (everything except the last part) and repo name (last part)
      const parts = pathWithNamespace.split('/');
      if (parts.length >= 2) {
        const repoPathName = parts.pop(); // Get the last part (URL-friendly project name)
        const ownerPath = parts.join('/'); // Join the remaining parts as the owner

        return {
          owner: ownerPath,
          name: repoPathName || '', // Use path-friendly name from path_with_namespace
        };
      }
    }

    // Fallback to namespace and project name
    const namespace = webhookPayload?.project?.namespace;
    const projectName = webhookPayload?.project?.name;
    if (namespace && projectName) {
      return {
        owner: namespace,
        name: projectName,
      };
    }

    return null;
  }

  private async processWebhookPayload(
    repoData: CommonRepoData,
    organizationId: OrganizationId,
    provider: string,
    payload: unknown,
  ): Promise<Recipe[]> {
    this.logger.debug('Getting organization repositories', {
      organizationId,
    });
    const organizationRepos =
      await this.gitHexa.getOrganizationRepositories(organizationId);

    if (organizationRepos.length === 0) {
      this.logger.warn('No repositories found for organization', {
        organizationId,
      });
      return [];
    }

    // Log all configured repositories for debugging
    this.logger.debug('Configured repositories in organization', {
      organizationId,
      repositories: organizationRepos.map((repo) => ({
        id: repo.id,
        owner: repo.owner,
        repo: repo.repo,
        providerId: repo.providerId,
      })),
    });

    // Find matching GitRepo from organization repositories
    const matchingRepo = organizationRepos.find(
      (repo) => repo.owner === repoData.owner && repo.repo === repoData.name,
    );

    if (!matchingRepo) {
      this.logger.warn('No matching repository found in organization', {
        organizationId,
        repoOwner: repoData.owner,
        repoName: repoData.name,
        availableRepos: organizationRepos.map(
          (repo) => `${repo.owner}/${repo.repo}`,
        ),
      });
      return [];
    }

    this.logger.debug('Found matching repository', {
      repoId: matchingRepo.id,
      owner: matchingRepo.owner,
      repo: matchingRepo.repo,
    });

    this.logger.debug('Handling webhook to get updated recipes');
    const updatedRecipes = await this.gitHexa.handleWebHook(
      matchingRepo,
      payload,
      /.packmind\/recipes\/.*\.md/,
    );

    this.logger.info(`Updated recipes retrieved from ${provider}`, {
      count: updatedRecipes.length,
    });

    if (updatedRecipes.length === 0) {
      this.logger.info('No recipes to update, returning empty array');
      return [];
    }

    const updatedRecipeEntities: Recipe[] = [];

    for (const updatedRecipe of updatedRecipes) {
      const { filePath, fileContent, ...gitCommit } = updatedRecipe;

      this.logger.debug('Processing recipe file', { filePath });

      // Extract slug from filepath
      // Example: .packmind/recipes/use-tdd.md -> use-tdd
      const slug = filePath
        .replace('.packmind/recipes/', '')
        .replace('.md', '');

      this.logger.debug('Extracted slug from filepath', { slug, filePath });

      // Check if recipe exists in database
      this.logger.debug('Checking if recipe exists in database', { slug });
      const existingRecipe = await this.recipeService.findRecipeBySlug(slug);

      if (existingRecipe) {
        this.logger.info('Recipe found, checking if content differs', {
          slug,
          recipeId: existingRecipe.id,
        });

        // Compare content to see if update is needed
        const contentHasChanged = existingRecipe.content !== fileContent;

        if (contentHasChanged) {
          this.logger.info('Content has changed, updating existing recipe', {
            slug,
            recipeId: existingRecipe.id,
          });

          // Business logic: Increment version number
          const nextVersion = existingRecipe.version + 1;
          this.logger.debug('Incrementing version number', {
            currentVersion: existingRecipe.version,
            nextVersion,
          });

          // Update the recipe entity
          const updatedRecipe = await this.recipeService.updateRecipe(
            existingRecipe.id,
            {
              name: existingRecipe.name,
              slug: existingRecipe.slug,
              content: fileContent,
              version: nextVersion,
              gitCommit,
              organizationId: existingRecipe.organizationId,
              userId: existingRecipe.userId,
            },
          );

          // Create new recipe version
          this.logger.debug('Creating new recipe version');

          // Generate summary for the recipe version
          let summary: string | null = null;
          try {
            this.logger.debug('Generating summary for recipe version update');
            summary = await this.recipeSummaryService.createRecipeSummary({
              recipeId: existingRecipe.id,
              name: existingRecipe.name,
              slug: existingRecipe.slug,
              content: fileContent,
              version: nextVersion,
              summary: null,
              gitCommit,
              userId: null, // Git commits don't have a specific user
            });
            this.logger.debug('Summary generated successfully for update', {
              summaryLength: summary.length,
            });
          } catch (summaryError) {
            this.logger.error(
              'Failed to generate summary during update, proceeding without summary',
              {
                error:
                  summaryError instanceof Error
                    ? summaryError.message
                    : String(summaryError),
              },
            );
          }

          await this.recipeVersionService.addRecipeVersion({
            recipeId: existingRecipe.id,
            name: existingRecipe.name,
            slug: existingRecipe.slug,
            content: fileContent,
            version: nextVersion,
            summary,
            gitCommit,
            userId: null, // Git commits don't have a specific user
          });

          updatedRecipeEntities.push(updatedRecipe);
          this.logger.info('Recipe updated successfully', {
            slug,
            recipeId: existingRecipe.id,
            newVersion: nextVersion,
          });
        } else {
          this.logger.info('Content is identical, skipping update', {
            slug,
            recipeId: existingRecipe.id,
          });
        }
      } else {
        this.logger.warn('Recipe not found in database, skipping update', {
          slug,
        });
      }
    }

    this.logger.info(
      `ProcessWebhookPayload process completed for ${provider}`,
      {
        updatedCount: updatedRecipeEntities.length,
      },
    );
    return updatedRecipeEntities;
  }
}
