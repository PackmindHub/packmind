import { PackmindLogger } from '@packmind/logger';
import {
  BaseHexa,
  BaseHexaOpts,
  HexaRegistry,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import { IEventTrackingPort, IEventTrackingPortName } from '@packmind/types';
import { DataSource } from 'typeorm';
import { EventTrackingAdapter } from './application/EventTrackingAdapter';
import { AmplitudeListener } from './application/AmplitudeListener';

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
  private readonly listener: AmplitudeListener;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);

    this.logger.info('Constructing AmplitudeHexa');

    try {
      this.logger.debug('Creating EventTrackingAdapter (OSS - no-op)');
      this.adapter = new EventTrackingAdapter(this.logger);

      this.logger.debug('Creating AmplitudeListener');
      this.listener = new AmplitudeListener(this.adapter);

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
   * Initializes the AmplitudeListener to start listening to trial events.
   */
  public async initialize(registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing AmplitudeHexa');

    try {
      // Get the event emitter service from the registry
      const eventEmitterService = registry.getService(
        PackmindEventEmitterService,
      );

      // Initialize the listener with the event emitter service
      this.listener.initialize(eventEmitterService);
      this.logger.info('AmplitudeListener initialized');

      this.logger.info('AmplitudeHexa initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize AmplitudeHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
    this.listener.destroy();
    this.logger.info('AmplitudeHexa destroyed');
  }
}
