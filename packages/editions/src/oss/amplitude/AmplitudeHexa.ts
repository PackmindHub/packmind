import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts } from '@packmind/node-utils';
import { IEventTrackingPort, IEventTrackingPortName } from '@packmind/types';
import { DataSource } from 'typeorm';
import { EventTrackingAdapter } from './application/EventTrackingAdapter';

const origin = 'AmplitudeHexa';

/**
 * AmplitudeHexa - Facade for the Amplitude event tracking domain following the Hexa pattern.
 *
 * This class serves as the main entry point for event tracking functionality.
 * In the OSS edition, this provides a no-op implementation.
 * In the proprietary edition, this would integrate with Amplitude.
 */
export class AmplitudeHexa extends BaseHexa<BaseHexaOpts, IEventTrackingPort> {
  private readonly adapter: EventTrackingAdapter;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);

    this.logger.info('Constructing AmplitudeHexa');

    try {
      this.logger.debug('Creating EventTrackingAdapter (OSS - no-op)');
      this.adapter = new EventTrackingAdapter(this.logger);

      this.logger.info('AmplitudeHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct AmplitudeHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize the hexa with access to the registry for adapter retrieval.
   * EventTracking has no dependencies, so this is a no-op
   */
  public async initialize(): Promise<void> {
    // No dependencies to initialize
    this.logger.info('AmplitudeHexa initialized successfully');
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
   * Destroys the AmplitudeHexa and cleans up resources
   */
  public destroy(): void {
    this.logger.info('Destroying AmplitudeHexa');
    this.logger.info('AmplitudeHexa destroyed');
  }
}
