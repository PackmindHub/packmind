import { AccountsError } from './AccountsError';

export class OrganizationCreationRestrictedError extends AccountsError {
  constructor(userId?: string) {
    super(
      'forbidden',
      'organization_creation_restricted',
      userId ? { userId } : {},
      'Organization creation is restricted to organization administrators on this instance. Ask an administrator for an invitation.',
    );
    this.name = 'OrganizationCreationRestrictedError';
  }
}
