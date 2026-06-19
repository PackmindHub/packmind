import { PackmindLogger } from '@packmind/logger';
import { IJobFactory, IJobQueue, queueFactory } from '@packmind/node-utils';
import {
  IGitPort,
  RemovePluginFromMarketplaceJobInput,
  REMOVE_PLUGIN_FROM_MARKETPLACE_QUEUE,
} from '@packmind/types';
import { RemovePluginFromMarketplaceDelayedJob } from '../../application/jobs/RemovePluginFromMarketplaceDelayedJob';
import { IMarketplaceDistributionRepository } from '../../domain/repositories/IMarketplaceDistributionRepository';
import { IMarketplaceRepository } from '../../domain/repositories/IMarketplaceRepository';
import { MarketplaceDescriptorParserRegistry } from '../../application/services/MarketplaceDescriptorParserRegistry';

const origin = 'RemovePluginFromMarketplaceJobFactory';

/**
 * BullMQ factory for the marketplace plugin removal queue.
 *
 * Mirrors `PublishPluginToMarketplaceJobFactory`. Queue concurrency is pinned
 * to a single worker upstream so deletion commits on the rolling
 * `packmind/sync` branch stay serialized against concurrent publish/removal
 * attempts.
 */
export class RemovePluginFromMarketplaceJobFactory implements IJobFactory<RemovePluginFromMarketplaceJobInput> {
  private _delayedJob: RemovePluginFromMarketplaceDelayedJob | null = null;

  constructor(
    private readonly marketplaceDistributionRepository: IMarketplaceDistributionRepository,
    private readonly marketplaceRepository: IMarketplaceRepository,
    private readonly gitPort: IGitPort,
    private readonly parserRegistry: MarketplaceDescriptorParserRegistry,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async createQueue(): Promise<IJobQueue<RemovePluginFromMarketplaceJobInput>> {
    this.logger.info('Creating RemovePluginFromMarketplace job queue');

    this._delayedJob = new RemovePluginFromMarketplaceDelayedJob(
      (listeners) => queueFactory(this.getQueueName(), listeners),
      this.marketplaceDistributionRepository,
      this.marketplaceRepository,
      this.gitPort,
      this.parserRegistry,
    );

    return {
      addJob: async (
        input: RemovePluginFromMarketplaceJobInput,
      ): Promise<string> => {
        if (!this._delayedJob) {
          throw new Error('Queue not initialized. Call initialize() first.');
        }
        return this._delayedJob.addJob(input);
      },
      initialize: async (): Promise<void> => {
        if (!this._delayedJob) {
          throw new Error('DelayedJob not created. Call createQueue() first.');
        }
        await this._delayedJob.initialize();
        this.logger.info('RemovePluginFromMarketplace queue initialized');
      },
      destroy: async (): Promise<void> => {
        this.logger.info('RemovePluginFromMarketplace queue destroyed');
      },
    };
  }

  get delayedJob(): RemovePluginFromMarketplaceDelayedJob | null {
    return this._delayedJob;
  }

  getQueueName(): string {
    return REMOVE_PLUGIN_FROM_MARKETPLACE_QUEUE;
  }
}
