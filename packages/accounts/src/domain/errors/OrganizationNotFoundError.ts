import { AccountsInternalError } from './AccountsInternalError';

export class OrganizationNotFoundError extends AccountsInternalError {
  constructor(organizationId: string) {
    super(
      'organization_not_found',
      { organizationId },
      `Organization with id "${organizationId}" was not found`,
    );
    this.name = 'OrganizationNotFoundError';
  }
}
