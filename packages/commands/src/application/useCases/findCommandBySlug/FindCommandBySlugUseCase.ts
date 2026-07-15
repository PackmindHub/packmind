import { CommandService } from '../../services/CommandService';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { OrganizationId, QueryOption, Command } from '@packmind/types';

const origin = 'FindRecipeBySlugUseCase';

export class FindCommandBySlugUseCase {
  constructor(
    private readonly commandService: CommandService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('FindRecipeBySlugUseCase initialized');
  }

  public async findCommandBySlug(
    slug: string,
    organizationId: OrganizationId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Command | null> {
    this.logger.info('Finding recipe by slug and organization', {
      slug,
      organizationId,
    });

    try {
      const recipe = await this.commandService.findCommandBySlug(
        slug,
        organizationId,
        opts,
      );
      this.logger.info('Recipe search by slug and organization completed', {
        slug,
        organizationId,
        found: !!recipe,
      });
      return recipe;
    } catch (error) {
      this.logger.error('Failed to find recipe by slug and organization', {
        slug,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
