import { PackmindLogger } from '@packmind/logger';
import {
  BaseHexa,
  BaseHexaOpts,
  HexaRegistry,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  IEventTrackingPort,
  IEventTrackingPortName,
} from '@packmind/types';
import { DataSource } from 'typeorm';
import { AmplitudeEventListener } from './application/AmplitudeEventListener';
import { EventTrackingAdapter } from './application/EventTrackingAdapter';

const origin = 'AmplitudeHexa';

/**
 * AmplitudeHexa - Facade for the Amplitude event tracking domain following the Hexa pattern.
 *
 * This class serves as the main entry point for event tracking functionality.
 * This is the proprietary edition implementation that integrates with Amplitude SDK.
 */
export class AmplitudeHexa extends BaseHexa<BaseHexaOpts, IEventTrackingPort> {
  private readonly adapter: EventTrackingAdapter;
  private readonly listener: AmplitudeEventListener;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);

    this.logger.info('Constructing AmplitudeHexa (proprietary)');

    try {
      this.logger.debug(
        'Creating EventTrackingAdapter with Amplitude integration',
      );
      this.adapter = new EventTrackingAdapter();
      this.listener = new AmplitudeEventListener(this.adapter);

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
   * Sets up event listeners to forward domain events to Amplitude.
   */
  public async initialize(registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing AmplitudeHexa');

    const eventEmitterService = registry.getService(
      PackmindEventEmitterService,
    );
    this.listener.initialize(eventEmitterService);

    try {
      const accountsPort =
        registry.getAdapter<IAccountsPort>(IAccountsPortName);
      this.listener.setAccountsAdapter(accountsPort);
      this.logger.info('AccountsPort wired into AmplitudeEventListener');
    } catch (error) {
      this.logger.warn(
        'AccountsPort not available; test-user filtering disabled',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }

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
    this.listener.destroy();
    this.logger.info('AmplitudeHexa destroyed');
  }
}
