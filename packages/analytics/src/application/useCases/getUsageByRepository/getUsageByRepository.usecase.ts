import { RecipeUsageService } from '../../services/RecipeUsageService';
import { RecipeUsage } from '../../../domain/entities/RecipeUsage';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { GitRepoId } from '@packmind/git';

const origin = 'GetUsageByRepositoryUsecase';

export class GetUsageByRepositoryUsecase {
  constructor(
    private readonly recipeUsageService: RecipeUsageService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('GetUsageByRepositoryUsecase initialized');
  }

  public async getUsageByRepository(
    repositoryId: GitRepoId,
  ): Promise<RecipeUsage[]> {
    this.logger.info('Getting usage records for repository', {
      repositoryId,
    });

    try {
      const usageRecords =
        await this.recipeUsageService.getUsageByRepository(repositoryId);
      this.logger.info('Usage records retrieved for repository successfully', {
        repositoryId,
        count: usageRecords.length,
      });
      return usageRecords;
    } catch (error) {
      this.logger.error('Failed to get usage records for repository', {
        repositoryId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
