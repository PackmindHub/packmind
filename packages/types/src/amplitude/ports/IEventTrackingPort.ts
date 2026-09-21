import { UserId } from '../../accounts/User';
import { OrganizationId } from '../../accounts/Organization';

export interface IEventTrackingPort {
  trackEvent(
    userId: UserId,
    organizationId: OrganizationId,
    eventName: string,
    metadata?: Record<string, string | number>,
  ): Promise<void>;

  /** Registers the organization as an Amplitude group, so events can roll up to it. */
  identifyOrganizationGroup(
    organizationId: OrganizationId,
    name: string,
  ): Promise<void>;
}

export const IEventTrackingPortName = 'IEventTrackingPort';
