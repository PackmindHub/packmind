import { ClientSource, OrganizationId, UserId } from '../accounts';
import { PackmindEvent } from './PackmindEvent';

export type PackmindEventSource = ClientSource;
export interface UserEventPayload {
  userId: UserId;
  organizationId: OrganizationId;
  source: PackmindEventSource;
  originSkill?: string;
}

/**
 * Base class for events originating from a user action. Extend `SystemEvent`
 * instead for background processes, which have no `userId` to attribute.
 */
export abstract class UserEvent<TPayload = object> extends PackmindEvent<
  TPayload & UserEventPayload
> {}
