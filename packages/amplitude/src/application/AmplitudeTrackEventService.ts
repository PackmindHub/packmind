import { AmplitudeNodeEvent } from '../domain/entities/AmplitudeNodeEvent';
import { track, init } from '@amplitude/analytics-node';
import { AmplitudeService } from '../nest-api/amplitude/amplitude.service';
import { ServerZoneType } from '@amplitude/analytics-core/lib/esm/types/server-zone';
import { PackmindLogger } from '@packmind/logger';

const origin = 'AmplitudeTrackEventService';

export class AmplitudeTrackEventService {
  private initialized = false;

  constructor(private readonly logger = new PackmindLogger(origin)) {
    this.logger.info('AmplitudeTrackEventService (proprietary) initialized');
  }

  private async initializeAmplitude() {
    const config = await new AmplitudeService().getConfig();
    if (!config.amplitudeKey) {
      this.logger.debug('No API Key provisioned for Amplitude, skip');
      return;
    }
    init(config.amplitudeKey, {
      serverZone: config.amplitudeRegion as ServerZoneType,
    });
    this.initialized = true;
  }

  async pushEventToAmplitude(event: AmplitudeNodeEvent) {
    if (!this.initialized) {
      await this.initializeAmplitude();
    }

    this.logger.info('Tracking event', {
      event: event.event,
      userId: event.userId.substring(0, 6) + '*',
    });

    track(
      event.event,
      {
        ...event.metadata,
        ...{ organizationId: event.orgaId },
      },
      {
        user_id: event.userId,
      },
    );
  }
}
