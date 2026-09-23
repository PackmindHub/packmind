import { AccountsError } from './AccountsError';

export class OrganizationSlugConflictError extends AccountsError {
  constructor(name: string) {
    super(
      'conflict',
      'organization_slug_conflict',
      { organizationName: name },
      `An organization with a similar name already exists. The name "${name}" conflicts with an existing organization when converted to URL-friendly format.`,
    );
    this.name = 'OrganizationSlugConflictError';
  }
}
