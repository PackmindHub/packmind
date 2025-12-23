import { IEventTrackingPort, UserId, OrganizationId } from '@packmind/types';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AmplitudeTrackEventService } from './AmplitudeTrackEventService';
import { AmplitudeNodeEvent } from '../domain/entities/AmplitudeNodeEvent';

const origin = 'EventTrackingAdapter';

export class EventTrackingAdapter implements IEventTrackingPort {
  private readonly logger: PackmindLogger;
  private readonly amplitudeService: AmplitudeTrackEventService;

  constructor(logger?: PackmindLogger) {
    this.logger = logger || new PackmindLogger(origin, LogLevel.INFO);
    this.amplitudeService = new AmplitudeTrackEventService(this.logger);
    this.logger.info('EventTrackingAdapter (proprietary version) initialized');
  }

  async trackEvent(
    userId: UserId,
    organizationId: OrganizationId,
    eventName: string,
    metadata?: Record<string, string | number>,
  ): Promise<void> {
    this.logger.info('EventTrackingAdapter.trackEvent called (proprietary)', {
      eventName,
      userId: userId.substring(0, 6) + '*',
    });

    // Convert to AmplitudeNodeEvent format and delegate to service
    const event: AmplitudeNodeEvent = {
      event: eventName,
      userId,
      orgaId: organizationId,
      metadata: metadata || {},
    };

    await this.amplitudeService.pushEventToAmplitude(event);
  }
}
