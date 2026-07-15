import { CommandVersionService } from '../../services/CommandVersionService';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { CommandId, CommandVersion, SpaceId } from '@packmind/types';

const origin = 'GetRecipeVersionUseCase';

export class GetCommandVersionUseCase {
  constructor(
    private readonly commandVersionService: CommandVersionService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('GetRecipeVersionUseCase initialized');
  }

  public async getCommandVersion(
    recipeId: CommandId,
    version: number,
    allowedSpaceIds: SpaceId[],
  ): Promise<CommandVersion | null> {
    this.logger.info('Getting recipe version', { recipeId, version });

    try {
      const recipeVersion = await this.commandVersionService.getCommandVersion(
        recipeId,
        version,
        allowedSpaceIds,
      );
      this.logger.info('Recipe version retrieved successfully', {
        recipeId,
        version,
        found: !!recipeVersion,
      });
      return recipeVersion;
    } catch (error) {
      this.logger.error('Failed to get recipe version', {
        recipeId,
        version,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
