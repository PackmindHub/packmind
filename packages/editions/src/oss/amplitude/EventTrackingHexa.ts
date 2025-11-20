import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts } from '@packmind/node-utils';
import { IEventTrackingPort, IEventTrackingPortName } from '@packmind/types';
import { DataSource } from 'typeorm';
import { EventTrackingAdapter } from './application/EventTrackingAdapter';

const origin = 'EventTrackingHexa';

/**
 * EventTrackingHexa - Facade for the EventTracking domain following the Hexa pattern.
 *
 * This class serves as the main entry point for event tracking functionality.
 * In the OSS edition, this provides a no-op implementation.
 * In the proprietary edition, this would integrate with Amplitude.
 */
export class EventTrackingHexa extends BaseHexa<
  BaseHexaOpts,
  IEventTrackingPort
> {
  private readonly adapter: EventTrackingAdapter;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);

    this.logger.info('Constructing EventTrackingHexa');

    try {
      this.logger.debug('Creating EventTrackingAdapter (OSS - no-op)');
      this.adapter = new EventTrackingAdapter(this.logger);

      this.logger.info('EventTrackingHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct EventTrackingHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize the hexa with access to the registry for adapter retrieval.
   * EventTracking has no dependencies, so this is a no-op.
   */
  public async initialize(): Promise<void> {
    this.logger.info('Initializing EventTrackingHexa');
    // No dependencies to initialize
    this.logger.info('EventTrackingHexa initialized successfully');
  }

  /**
   * Get the EventTracking adapter for cross-domain access.
   * This adapter implements IEventTrackingPort and can be injected into other domains.
   */
  public getAdapter(): IEventTrackingPort {
    return this.adapter;
  }

  /**
   * Get the port name for this hexa.
   */
  public getPortName(): string {
    return IEventTrackingPortName;
  }

  /**
   * Destroys the EventTrackingHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying EventTrackingHexa');
    // Add any cleanup logic here if needed
    this.logger.info('EventTrackingHexa destroyed');
  }
}
