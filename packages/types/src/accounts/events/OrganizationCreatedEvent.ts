import { UserEvent } from '../../events';

export interface OrganizationCreatedPayload {
  name: string;
  method: 'sign-up' | 'create';
}


export class OrganizationCreatedEvent extends UserEvent<OrganizationCreatedPayload> {
  static override readonly eventName = 'accounts.organization.created';
}
