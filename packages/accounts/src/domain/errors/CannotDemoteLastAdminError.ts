import { AccountsError } from './AccountsError';

export class CannotDemoteLastAdminError extends AccountsError {
  constructor() {
    super(
      'conflict',
      'cannot_demote_last_admin',
      {},
      'Cannot demote the last administrator of the organization',
    );
    this.name = 'CannotDemoteLastAdminError';
  }
}
