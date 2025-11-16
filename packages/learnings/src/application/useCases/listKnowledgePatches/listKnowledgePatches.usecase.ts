import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  createSpaceId,
  IListKnowledgePatchesUseCase,
  ListKnowledgePatchesCommand,
  ListKnowledgePatchesResponse,
} from '@packmind/types';
import { KnowledgePatchService } from '../../services/KnowledgePatchService';

const origin = 'ListKnowledgePatchesUsecase';

export class ListKnowledgePatchesUsecase
  implements IListKnowledgePatchesUseCase
{
  constructor(
    private readonly knowledgePatchService: KnowledgePatchService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('ListKnowledgePatchesUsecase initialized');
  }

  public async execute(
    command: ListKnowledgePatchesCommand,
  ): Promise<ListKnowledgePatchesResponse> {
    const { spaceId: spaceIdString, status } = command;
    const spaceId = createSpaceId(spaceIdString);

    this.logger.info('Listing knowledge patches', {
      spaceId,
      status: status || 'all',
    });

    try {
      const patches = status
        ? await this.knowledgePatchService.listPatchesByStatus(spaceId, status)
        : await this.knowledgePatchService.listPatchesBySpace(spaceId);

      this.logger.info('Knowledge patches listed successfully', {
        spaceId,
        status: status || 'all',
        count: patches.length,
      });

      return { patches };
    } catch (error) {
      this.logger.error('Failed to list knowledge patches', {
        spaceId,
        status,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
