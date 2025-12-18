import { AmplitudeNodeEvent } from '../domain/entities/AmplitudeNodeEvent';
import { track, init, identify, Identify } from '@amplitude/analytics-node';
import { AmplitudeService } from '../nest-api/amplitude/amplitude.service';
import { ServerZoneType } from '@amplitude/analytics-core/lib/esm/types/server-zone';
import { PackmindLogger } from '@packmind/logger';
import { UserSignedUpPayload } from '@packmind/types';

const origin = 'AmplitudeTrackEventService';

export class AmplitudeTrackEventService {
  private initialized = false;
  private configurationChecked = false;

  constructor(private readonly logger = new PackmindLogger(origin)) {
    this.logger.info('AmplitudeTrackEventService (proprietary) initialized');
  }

  private async initializeAmplitude() {
    this.configurationChecked = true;
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

  async identifyUser(signedUpPayload: UserSignedUpPayload) {
    if (!this.configurationChecked) {
      await this.initializeAmplitude();
    }

    if (!this.initialized) {
      return;
    }

    this.logger.info('Identifying user', {
      userId: signedUpPayload.userId.substring(0, 6) + '*',
    });

    const identifyObj = new Identify();
    identifyObj.set('organizationId', signedUpPayload.organizationId);

    identify(identifyObj, {
      user_id: signedUpPayload.userId,
    });
  }

  async pushEventToAmplitude(event: AmplitudeNodeEvent) {
    if (!this.configurationChecked) {
      await this.initializeAmplitude();
    }

    if (!this.initialized) {
      return;
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
        groups: { organization: event.orgaId },
      },
    );
  }
}
