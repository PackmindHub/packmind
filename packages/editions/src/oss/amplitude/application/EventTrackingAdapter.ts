import { PackmindLogger } from '@packmind/logger';
import { IEventTrackingPort, OrganizationId, UserId } from '@packmind/types';

/**
 * OSS stub implementation of EventTrackingAdapter
 * Does not perform actual event tracking in OSS version
 */
export class EventTrackingAdapter implements IEventTrackingPort {
  constructor(
    private readonly logger = new PackmindLogger('EventTrackingAdapter'),
  ) {}

  async trackEvent(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId: UserId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    organizationId: OrganizationId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    eventName: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    metadata?: Record<string, string | number>,
  ): Promise<void> {
    //Nothing to do here
  }
}
