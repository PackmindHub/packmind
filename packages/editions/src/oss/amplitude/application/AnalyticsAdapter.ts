import { PackmindLogger } from '@packmind/shared';
import { IAnalyticsPort, OrganizationId, UserId } from '@packmind/shared/types';

/**
 * OSS stub implementation of AnalyticsAdapter
 * Wraps AmplitudeTrackEventService but does not perform actual tracking
 */
export class AnalyticsAdapter implements IAnalyticsPort {
  constructor(
    private readonly logger = new PackmindLogger('AnalyticsAdapter'),
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
