import { RecipeUsageService } from '../../services/RecipeUsageService';
import { RecipeUsage } from '../../../domain/entities/RecipeUsage';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { TargetId } from '@packmind/types';

const origin = 'GetUsageByTargetUsecase';

export class GetUsageByTargetUsecase {
  constructor(
    private readonly recipeUsageService: RecipeUsageService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('GetUsageByTargetUsecase initialized');
  }

  public async getUsageByTarget(targetId: TargetId): Promise<RecipeUsage[]> {
    this.logger.info('Getting usage records for target', {
      targetId,
    });

    try {
      const usageRecords =
        await this.recipeUsageService.getUsageByTarget(targetId);
      this.logger.info('Usage records retrieved for target successfully', {
        targetId,
        count: usageRecords.length,
      });
      return usageRecords;
    } catch (error) {
      this.logger.error('Failed to get usage records for target', {
        targetId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
