import { AccountsInternalError } from './AccountsInternalError';

export class UserIdRequiredError extends AccountsInternalError {
  constructor() {
    super('user_id_required', {}, 'User ID is required');
    this.name = 'UserIdRequiredError';
  }
}
