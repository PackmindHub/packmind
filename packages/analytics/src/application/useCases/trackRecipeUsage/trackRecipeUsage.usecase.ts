import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  createOrganizationId,
  createUserId,
  GetTargetsByGitRepoCommand,
  GitRepoId,
  IDeploymentPort,
  IGitPort,
  IRecipesPort,
  ITrackRecipeUsageUseCase,
  OrganizationId,
  RecipeId,
  TargetId,
  TrackRecipeUsageCommand,
  UserId,
} from '@packmind/types';
import { RecipeUsage } from '../../../domain/entities/RecipeUsage';
import {
  RecipeUsageService,
  TrackUsageData,
} from '../../services/RecipeUsageService';

const origin = 'TrackRecipeUsageUsecase';

export class TrackRecipeUsageUsecase implements ITrackRecipeUsageUseCase {
  constructor(
    private readonly recipesPort: IRecipesPort,
    private readonly recipeUsageService: RecipeUsageService,
    private readonly gitPort: IGitPort,
    private readonly deploymentPort?: IDeploymentPort,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('TrackRecipeUsageUsecase initialized', {
      hasDeploymentPort: !!this.deploymentPort,
    });
  }

  /**
   * Resolves target ID from git repository ID and target path
   *
   * @param gitRepoId - The git repository ID to search targets in
   * @param targetPath - The target path to match against
   * @param userId - The user ID for the command context
   * @param organizationId - The organization ID for the command context
   * @returns Promise of TargetId if found, null otherwise
   */
  private async resolveTargetId(
    gitRepoId: GitRepoId,
    userId: UserId,
    organizationId: OrganizationId,
    targetPath?: string,
  ): Promise<TargetId | null> {
    if (!this.deploymentPort) {
      this.logger.warn(
        'Deployment port not available, skipping target lookup',
        {
          gitRepoId,
          targetPath,
        },
      );
      return null;
    }

    try {
      this.logger.info('Attempting to resolve target ID', {
        gitRepoId,
        targetPath,
      });

      const command: GetTargetsByGitRepoCommand = {
        gitRepoId,
        userId: userId.toString(),
        organizationId,
      };

      const targets = await this.deploymentPort.getTargetsByGitRepo(command);

      if (!targets || targets.length === 0) {
        this.logger.error('No targets retrieved for given git repository', {
          gitRepoId,
        });
        throw new Error(
          `No targets found for the provided git repository (id: ${gitRepoId}). Please configure at least one target.`,
        );
      }

      const matchingTarget = targets.find(
        (target) => target.path === targetPath,
      );

      if (matchingTarget) {
        this.logger.info('Target resolved successfully', {
          targetId: matchingTarget.id,
          gitRepoId,
          targetPath,
        });
        return matchingTarget.id;
      } else {
        this.logger.warn(
          'No matching target found for path returning default target',
        );
        const defaultTarget = targets.find((target) => target.path === '/');
        return defaultTarget ? defaultTarget.id : targets[0].id;
      }
    } catch (error) {
      this.logger.error('Failed to resolve target ID', {
        gitRepoId,
        targetPath,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  public async execute(
    command: TrackRecipeUsageCommand,
  ): Promise<RecipeUsage[]> {
    const { recipeSlugs, aiAgent, userId, gitRepo, target, organizationId } =
      command;
    this.logger.info('Starting trackRecipeUsage process', {
      recipeSlugs,
      aiAgent,
      userId,
      gitRepo,
      count: recipeSlugs.length,
    });

    const usageRecords: RecipeUsage[] = [];

    try {
      if (!gitRepo) {
        throw new Error(
          `gitRepo parameter is required for tracking recipe usage. Please provide a valid git repository URL.`,
        );
      }
      this.logger.debug('Parsing gitRepo parameter', { gitRepo });
      const parts = gitRepo.split('/');

      if (
        parts.length < 2 ||
        !parts[0] ||
        !parts[parts.length - 1] ||
        gitRepo.endsWith('/')
      ) {
        this.logger.error(
          'Invalid gitRepo format, expected "owner/repo" or "owner/subowner/.../repo"',
          {
            gitRepo,
          },
        );
        throw new Error(
          `Invalid gitRepo format: "${gitRepo}". Expected format: "owner/repo" or "owner/subowner/.../repo"`,
        );
      }

      const repo = parts[parts.length - 1];
      const owner = parts.slice(0, -1).join('/');
      this.logger.debug('Looking up GitRepo by owner and repo', {
        owner,
        repo,
      });
      const gitRepoEntity = await this.gitPort.findGitRepoByOwnerAndRepo(
        owner,
        repo,
      );

      if (!gitRepoEntity) {
        this.logger.error('GitRepo not found in database', { owner, repo });
        throw new Error(
          `GitRepo "${gitRepo}" not found in database. Please ensure the repository is properly configured.`,
        );
      }

      const gitRepoId = gitRepoEntity.id;

      const targetId = await this.resolveTargetId(
        gitRepoId,
        createUserId(userId),
        createOrganizationId(organizationId),
        target,
      );
      // Business logic: Process each recipe slug
      for (const slug of recipeSlugs) {
        this.logger.debug('Processing recipe slug', { slug });

        // Coordinate with RecipeService to get recipe by slug
        const recipe = await this.recipesPort.findRecipeBySlug(
          slug,
          createOrganizationId(organizationId),
          {
            includeDeleted: true,
          },
        );

        if (!recipe) {
          this.logger.error('Recipe not found for slug', {
            slug,
            organizationId,
          });
          continue;
        }

        // Prepare usage data for RecipeUsageService
        const usageData: TrackUsageData = {
          recipeId: recipe.id,
          aiAgent,
          gitRepoId,
          userId: createUserId(userId),
          targetId,
        };

        this.logger.debug('Tracking usage with RecipeUsageService', {
          recipeId: recipe.id,
          slug,
          gitRepoId,
          userId,
          targetId,
        });

        try {
          const savedUsage =
            await this.recipeUsageService.trackRecipeUsage(usageData);
          usageRecords.push(savedUsage);

          this.logger.debug('Usage record created successfully', {
            usageId: savedUsage.id,
            recipeId: recipe.id,
            slug,
            gitRepoId,
            userId,
            targetId,
          });
        } catch (error) {
          this.logger.error('Failed to save usage record', {
            slug,
            recipeId: recipe.id,
            userId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      this.logger.info('Recipe usage tracking completed successfully', {
        processedSlugs: recipeSlugs.length,
        createdRecords: usageRecords.length,
        aiAgent,
        gitRepoId,
        userId,
        targetId,
      });

      return usageRecords;
    } catch (error) {
      this.logger.error('Failed to track recipe usage', {
        recipeSlugs,
        aiAgent,
        userId,
        gitRepo,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async getUsageByRecipeId(recipeId: RecipeId): Promise<RecipeUsage[]> {
    this.logger.info('Getting usage records for recipe', { recipeId });

    try {
      const usageRecords =
        await this.recipeUsageService.getUsageByRecipeId(recipeId);
      this.logger.info('Usage records retrieved successfully', {
        recipeId,
        count: usageRecords.length,
      });
      return usageRecords;
    } catch (error) {
      this.logger.error('Failed to get usage records for recipe', {
        recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
