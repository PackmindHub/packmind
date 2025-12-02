import { PackmindLogger } from '@packmind/logger';
import {
  BaseHexa,
  BaseHexaOpts,
  HexaRegistry,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import { DataSource } from 'typeorm';
import { CrispEventListener } from './application/CrispEventListener';
import { CrispTrackEventService } from './application/CrispTrackEventService';

const origin = 'CrispHexa';

/**
 * CrispHexa - Facade for the Crisp CRM integration following the Hexa pattern.
 *
 * This class serves as the main entry point for Crisp event tracking functionality.
 * It listens to domain events (user signup, user joined organization) and forwards
 * them to Crisp for CRM tracking.
 *
 * Crisp integration is enabled at runtime only if CRISP_API_KEY, CRISP_PLUGIN_IDENTIFIER,
 * and CRISP_WEBSITE_ID are configured.
 */
export class CrispHexa extends BaseHexa<BaseHexaOpts, void> {
  private readonly crispService: CrispTrackEventService;
  private readonly listener: CrispEventListener;

  constructor(
    dataSource: DataSource,
    opts: Partial<BaseHexaOpts> = { logger: new PackmindLogger(origin) },
  ) {
    super(dataSource, opts);

    this.logger.info('Constructing CrispHexa (proprietary)');

    this.crispService = new CrispTrackEventService();
    this.listener = new CrispEventListener(this.crispService);

    this.logger.info('CrispHexa construction completed');
  }

  /**
   * Initialize the hexa with access to the registry for adapter retrieval.
   * Sets up event listeners to forward domain events to Crisp.
   */
  public async initialize(registry: HexaRegistry): Promise<void> {
    this.logger.info('Initializing CrispHexa');

    const eventEmitterService = registry.getService(
      PackmindEventEmitterService,
    );
    this.listener.initialize(eventEmitterService);

    this.logger.info('CrispHexa initialized successfully');
  }

  /**
   * CrispHexa does not expose an adapter for cross-domain access.
   */
  public getAdapter(): void {
    return undefined;
  }

  /**
   * Get the port name for this hexa.
   */
  public getPortName(): string {
    return 'crisp';
  }

  /**
   * Destroys the CrispHexa and cleans up resources.
   */
  public destroy(): void {
    this.logger.info('Destroying CrispHexa');
    this.listener.destroy();
    this.logger.info('CrispHexa destroyed');
  }
}
