import { AccountsInternalError } from './AccountsInternalError';

export class FailedToUpdateUserRoleError extends AccountsInternalError {
  constructor() {
    super('failed_to_update_user_role', {}, 'Failed to update user role');
    this.name = 'FailedToUpdateUserRoleError';
  }
}
