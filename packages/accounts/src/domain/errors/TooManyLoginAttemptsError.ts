import { ExpectedAuthError } from './ExpectedAuthError';

export class TooManyLoginAttemptsError extends ExpectedAuthError {
  constructor(public readonly bannedUntil: Date) {
    super(
      'Too many login attempts. Please try again later.',
      'TooManyLoginAttemptsError',
    );
  }
}
