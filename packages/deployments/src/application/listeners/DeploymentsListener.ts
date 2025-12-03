import { PackmindLogger } from '@packmind/logger';
import { PackmindListener } from '@packmind/node-utils';
import { StandardDeletedEvent } from '@packmind/types';
import { IPackageRepository } from '../../domain/repositories/IPackageRepository';

const origin = 'DeploymentsListener';

export class DeploymentsListener extends PackmindListener<IPackageRepository> {
  private readonly logger: PackmindLogger;

  constructor(adapter: IPackageRepository) {
    super(adapter);
    this.logger = new PackmindLogger(origin);
  }

  protected registerHandlers(): void {
    this.subscribe(StandardDeletedEvent, this.handleStandardDeleted);
  }

  private handleStandardDeleted = async (
    event: StandardDeletedEvent,
  ): Promise<void> => {
    const { standardId } = event.payload;
    this.logger.info('Handling StandardDeletedEvent', { standardId });

    try {
      await this.adapter.removeStandardFromAllPackages(standardId);
      this.logger.info('Standard removed from all packages successfully', {
        standardId,
      });
    } catch (error) {
      this.logger.error('Failed to remove standard from packages', {
        standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Re-throw to ensure the error is not silently swallowed
      throw error;
    }
  };
}
