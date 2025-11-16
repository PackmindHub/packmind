import { LogLevel, PackmindLogger } from '@packmind/logger';
import { OrganizationId } from '@packmind/types';
import { RecipeUsage } from '../../../domain/entities/RecipeUsage';
import { RecipeUsageService } from '../../services/RecipeUsageService';

const origin = 'GetUsageByOrganizationUsecase';

export class GetUsageByOrganizationUsecase {
  constructor(
    private readonly recipeUsageService: RecipeUsageService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('GetUsageByOrganizationUsecase initialized');
  }

  public async getUsageByOrganization(
    organizationId: OrganizationId,
  ): Promise<RecipeUsage[]> {
    this.logger.info('Getting usage records for organization', {
      organizationId,
    });

    try {
      const usageRecords =
        await this.recipeUsageService.getUsageByOrganization(organizationId);
      this.logger.info(
        'Usage records retrieved for organization successfully',
        {
          organizationId,
          count: usageRecords.length,
        },
      );
      return usageRecords;
    } catch (error) {
      this.logger.error('Failed to get usage records for organization', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
