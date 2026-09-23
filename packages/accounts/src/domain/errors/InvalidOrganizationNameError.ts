import { AccountsError } from './AccountsError';

export class InvalidOrganizationNameError extends AccountsError {
  constructor(name: string) {
    super(
      'invalid_input',
      'invalid_organization_name',
      { organizationName: name },
      `Invalid organization name: "${name}"`,
    );
    this.name = 'InvalidOrganizationNameError';
  }
}
