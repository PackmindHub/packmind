import { OrganizationId } from '../accounts';
import { PackmindEvent } from './PackmindEvent';

/**
 * Base payload for system-triggered events.
 * All SystemEvent payloads automatically include an optional organizationId.
 */
export interface SystemEventPayload {
  organizationId?: OrganizationId;
}

/**
 * Base class for system-triggered domain events.
 *
 * Use this for events that originate from system processes, such as:
 * - Scheduled jobs completing
 * - Background sync operations
 * - System health changes
 * - Automated workflows
 *
 * The payload automatically includes an optional organizationId.
 *
 * @example
 * ```typescript
 * export class GitSyncCompletedEvent extends SystemEvent<{
 *   repositoryId: GitRepoId;
 *   commitCount: number;
 * }> {
 *   static readonly eventName = 'git.sync.completed';
 * }
 * ```
 */
export abstract class SystemEvent<TPayload = object> extends PackmindEvent<
  TPayload & SystemEventPayload
> {}
