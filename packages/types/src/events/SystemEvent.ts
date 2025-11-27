import { PackmindEvent } from './PackmindEvent';

/**
 * Base class for system-triggered domain events.
 *
 * Use this for events that originate from system processes, such as:
 * - Scheduled jobs completing
 * - Background sync operations
 * - System health changes
 * - Automated workflows
 *
 * @example
 * ```typescript
 * export class GitSyncCompletedEvent extends SystemEvent<{
 *   repositoryId: GitRepoId;
 *   organizationId: OrganizationId;
 *   commitCount: number;
 * }> {
 *   static readonly eventName = 'git.sync.completed';
 * }
 * ```
 */
export abstract class SystemEvent<
  TPayload = unknown,
> extends PackmindEvent<TPayload> {}
