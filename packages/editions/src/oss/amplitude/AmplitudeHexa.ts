import { PackmindLogger } from '@packmind/logger';
import { BaseHexa, BaseHexaOpts } from '@packmind/node-utils';
import { IEventTrackingPort, IEventTrackingPortName } from '@packmind/types';
import { DataSource } from 'typeorm';
import { EventTrackingAdapter } from './application/EventTrackingAdapter';

const origin = 'AmplitudeHexa';

/**
 * OSS edition: no-op event tracking. Proprietary edition integrates with Amplitude.
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
      this.adapter = new EventTrackingAdapter();

      this.logger.info('AmplitudeHexa construction completed');
    } catch (error) {
      this.logger.error('Failed to construct AmplitudeHexa', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // EventTracking has no dependencies, so this is a no-op.
  public async initialize(): Promise<void> {
    this.logger.info('AmplitudeHexa initialized successfully');
  }

  public getAdapter(): IEventTrackingPort {
    return this.adapter;
  }

  public getPortName(): string {
    return IEventTrackingPortName;
  }

  public destroy(): void {
    this.logger.info('Destroying AmplitudeHexa');
    this.logger.info('AmplitudeHexa destroyed');
  }
}
