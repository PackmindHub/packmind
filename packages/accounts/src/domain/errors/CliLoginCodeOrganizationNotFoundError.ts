import { AccountsInternalError } from './AccountsInternalError';

export class CliLoginCodeOrganizationNotFoundError extends AccountsInternalError {
  constructor(organizationId: string) {
    super(
      'cli_login_code_organization_not_found',
      { organizationId },
      `Organization not found for CLI login code: ${organizationId}`,
    );
    this.name = 'CliLoginCodeOrganizationNotFoundError';
  }
}
