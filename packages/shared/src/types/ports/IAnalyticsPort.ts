import { UserId, OrganizationId } from '../accounts';

/**
 * Port interface for cross-domain access to Analytics functionality
 * Following DDD monorepo architecture standard
 */
export interface IAnalyticsPort {
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
}
