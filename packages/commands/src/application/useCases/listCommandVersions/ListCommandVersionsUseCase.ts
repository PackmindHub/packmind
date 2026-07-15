import { CommandVersionService } from '../../services/CommandVersionService';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { CommandId, CommandVersion } from '@packmind/types';

const origin = 'ListRecipeVersionsUseCase';

export class ListCommandVersionsUseCase {
  constructor(
    private readonly commandVersionService: CommandVersionService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('ListRecipeVersionsUseCase initialized');
  }

  public async listCommandVersions(
    recipeId: CommandId,
  ): Promise<CommandVersion[]> {
    this.logger.info('Listing recipe versions', { recipeId });

    try {
      const versions =
        await this.commandVersionService.listCommandVersions(recipeId);
      this.logger.info('Recipe versions listed successfully', {
        recipeId,
        count: versions.length,
      });
      return versions;
    } catch (error) {
      this.logger.error('Failed to list recipe versions', {
        recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
