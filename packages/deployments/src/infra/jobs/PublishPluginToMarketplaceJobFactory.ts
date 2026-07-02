import { PackmindLogger } from '@packmind/logger';
import {
  IJobFactory,
  IJobQueue,
  PackmindEventEmitterService,
  queueFactory,
} from '@packmind/node-utils';
import { GitRepoService } from '@packmind/git';
import {
  IGitPort,
  PublishPluginToMarketplaceJobInput,
  PUBLISH_PLUGIN_TO_MARKETPLACE_QUEUE,
} from '@packmind/types';
import {
  PluginRenderer,
  PublishPluginToMarketplaceDelayedJob,
} from '../../application/jobs/PublishPluginToMarketplaceDelayedJob';
import { IMarketplaceDistributionRepository } from '../../domain/repositories/IMarketplaceDistributionRepository';
import { IMarketplaceRepository } from '../../domain/repositories/IMarketplaceRepository';
import { MarketplaceDescriptorParserRegistry } from '../../application/services/MarketplaceDescriptorParserRegistry';
import { PackageService } from '../../application/services/PackageService';
import { PackageVersionFingerprintService } from '../../application/services/PackageVersionFingerprintService';

const origin = 'PublishPluginToMarketplaceJobFactory';

/**
 * BullMQ factory for the marketplace plugin publish queue.
 *
 * Mirrors `MarketplaceReconciliationJobFactory`. The queue concurrency is
 * pinned to 1 worker upstream (single-worker concurrency for the queue) so
 * Git pushes onto the rolling `packmind/sync` branch stay serialized across
 * concurrent publish attempts.
 */
export class PublishPluginToMarketplaceJobFactory implements IJobFactory<PublishPluginToMarketplaceJobInput> {
  private _delayedJob: PublishPluginToMarketplaceDelayedJob | null = null;

  constructor(
    private readonly marketplaceDistributionRepository: IMarketplaceDistributionRepository,
    private readonly marketplaceRepository: IMarketplaceRepository,
    private readonly packageService: PackageService,
    private readonly gitRepoService: GitRepoService,
    private readonly gitPort: IGitPort,
    private readonly parserRegistry: MarketplaceDescriptorParserRegistry,
    private readonly renderer: PluginRenderer,
    private readonly versionFingerprintService: PackageVersionFingerprintService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async createQueue(): Promise<IJobQueue<PublishPluginToMarketplaceJobInput>> {
    this.logger.info('Creating PublishPluginToMarketplace job queue');

    this._delayedJob = new PublishPluginToMarketplaceDelayedJob(
      (listeners) => queueFactory(this.getQueueName(), listeners),
      this.marketplaceDistributionRepository,
      this.marketplaceRepository,
      this.packageService,
      this.gitRepoService,
      this.gitPort,
      this.parserRegistry,
      this.renderer,
      this.versionFingerprintService,
      this.eventEmitterService,
    );

    return {
      addJob: async (
        input: PublishPluginToMarketplaceJobInput,
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
        this.logger.info('PublishPluginToMarketplace queue initialized');
      },
      destroy: async (): Promise<void> => {
        this.logger.info('PublishPluginToMarketplace queue destroyed');
      },
    };
  }

  get delayedJob(): PublishPluginToMarketplaceDelayedJob | null {
    return this._delayedJob;
  }

  getQueueName(): string {
    return PUBLISH_PLUGIN_TO_MARKETPLACE_QUEUE;
  }
}
