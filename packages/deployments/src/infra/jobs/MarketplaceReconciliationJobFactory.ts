import { IJobFactory, IJobQueue, queueFactory } from '@packmind/node-utils';
import { PackmindLogger } from '@packmind/logger';
import { IGitPort, MarketplaceReconciliationJobInput } from '@packmind/types';
import { MarketplaceReconciliationDelayedJob } from '../../application/jobs/MarketplaceReconciliationDelayedJob';
import { IMarketplaceDistributionRepository } from '../../domain/repositories/IMarketplaceDistributionRepository';
import { IMarketplaceRepository } from '../../domain/repositories/IMarketplaceRepository';
import { MarketplaceDescriptorParserRegistry } from '../../application/services/MarketplaceDescriptorParserRegistry';
import { PackageService } from '../../application/services/PackageService';
import { PackageVersionFingerprintService } from '../../application/services/PackageVersionFingerprintService';

const origin = 'MarketplaceReconciliationJobFactory';

/**
 * BullMQ factory for the marketplace reconciliation queue.
 *
 * Mirrors `PublishArtifactsJobFactory`: hands `JobsService` an
 * `IJobQueue<MarketplaceReconciliationJobInput>` that delegates `addJob`/
 * `initialize`/`destroy` to the underlying `MarketplaceReconciliationDelayedJob`.
 */
export class MarketplaceReconciliationJobFactory implements IJobFactory<MarketplaceReconciliationJobInput> {
  private _delayedJob: MarketplaceReconciliationDelayedJob | null = null;

  constructor(
    private readonly marketplaceRepository: IMarketplaceRepository,
    private readonly marketplaceDistributionRepository: IMarketplaceDistributionRepository,
    private readonly gitPort: IGitPort,
    private readonly parserRegistry: MarketplaceDescriptorParserRegistry,
    private readonly packageService: PackageService,
    private readonly versionFingerprintService: PackageVersionFingerprintService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async createQueue(): Promise<IJobQueue<MarketplaceReconciliationJobInput>> {
    this.logger.info('Creating MarketplaceReconciliation job queue');

    this._delayedJob = new MarketplaceReconciliationDelayedJob(
      (listeners) => queueFactory(this.getQueueName(), listeners),
      this.marketplaceRepository,
      this.marketplaceDistributionRepository,
      this.gitPort,
      this.parserRegistry,
      this.packageService,
      this.versionFingerprintService,
    );

    return {
      addJob: async (
        input: MarketplaceReconciliationJobInput,
      ): Promise<string> => {
        if (!this._delayedJob) {
          throw new Error('Queue not initialized. Call initialize() first.');
        }
        const jobId = await this._delayedJob.addJob(input);
        return jobId;
      },
      initialize: async (): Promise<void> => {
        if (!this._delayedJob) {
          throw new Error('DelayedJob not created. Call createQueue() first.');
        }
        await this._delayedJob.initialize();
        this.logger.info('MarketplaceReconciliation queue initialized');
      },
      destroy: async (): Promise<void> => {
        this.logger.info('MarketplaceReconciliation queue destroyed');
      },
    };
  }

  get delayedJob(): MarketplaceReconciliationDelayedJob | null {
    return this._delayedJob;
  }

  getQueueName(): string {
    return 'marketplace-reconciliation';
  }
}
