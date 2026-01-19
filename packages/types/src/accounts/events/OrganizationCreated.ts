import { UserEvent } from '../../events';

export interface OrganizationCreatedPayload {
  name: string;
}

/**
 * Event emitted when a new user signs up and creates an organization.
 */
export class OrganizationCreatedEvent extends UserEvent<OrganizationCreatedPayload> {
  static override readonly eventName = 'accounts.user.signed-up';
}
