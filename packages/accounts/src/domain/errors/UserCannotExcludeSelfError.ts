import { AccountsError } from './AccountsError';

export class UserCannotExcludeSelfError extends AccountsError {
  constructor() {
    super(
      'invalid_input',
      'user_cannot_exclude_self',
      {},
      'Users cannot exclude themselves from an organization',
    );
    this.name = 'UserCannotExcludeSelfError';
  }
}
