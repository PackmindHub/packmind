import { OrganizationId } from '../accounts';
import { PackmindEvent } from './PackmindEvent';

export interface SystemEventPayload {
  organizationId?: OrganizationId;
}

/**
 * Base class for events originating from system processes — scheduled jobs,
 * background sync, automated workflows. Extend `UserEvent` instead when a user
 * action triggered the event, since that one requires a `userId`.
 */
export abstract class SystemEvent<TPayload = object> extends PackmindEvent<
  TPayload & SystemEventPayload
> {}
