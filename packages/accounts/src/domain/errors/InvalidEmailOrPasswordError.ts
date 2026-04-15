import { ExpectedAuthError } from './ExpectedAuthError';

export class InvalidEmailOrPasswordError extends ExpectedAuthError {
  constructor() {
    super('Invalid email or password', 'InvalidEmailOrPasswordError');
  }
}
