import { AccountsError } from './AccountsError';

export class UserCannotChangeOwnRoleError extends AccountsError {
  constructor() {
    super(
      'invalid_input',
      'user_cannot_change_own_role',
      {},
      'Users cannot change their own role',
    );
    this.name = 'UserCannotChangeOwnRoleError';
  }
}
