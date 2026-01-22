import { UserId } from '../../accounts/User';
import { OrganizationId } from '../../accounts/Organization';

/**
 * Port interface for cross-domain event tracking (e.g., Amplitude analytics)
 * Following DDD monorepo architecture standard
 */
export interface IEventTrackingPort {
  /**
   * Track an event with user and organization context
   * @param userId - The user who triggered the event
   * @param organizationId - The organization context
   * @param eventName - The name of the event being tracked
   * @param metadata - Optional metadata about the event
   */
  trackEvent(
    userId: UserId,
    organizationId: OrganizationId,
    eventName: string,
    metadata?: Record<string, string | number>,
  ): Promise<void>;

  /**
   * Identify an organization group in Amplitude with its display name
   * @param organizationId - The organization ID to identify
   * @param name - The display name for the organization group
   */
  identifyOrganizationGroup(
    organizationId: OrganizationId,
    name: string,
  ): Promise<void>;
}

export const IEventTrackingPortName = 'IEventTrackingPort';
