import { AccountsError } from './AccountsError';

/**
 * The caller earned this throttle with their own failed attempts, so it is a
 * `rate_limited` domain error. The context stays empty: the only identifier
 * at hand is the email, which must not reach the log.
 */
export class TooManyLoginAttemptsError extends AccountsError {
  readonly retryAfterSeconds: number;

  constructor(
    public readonly bannedUntil: Date,
    now: Date = new Date(),
  ) {
    super(
      'rate_limited',
      'too_many_login_attempts',
      {},
      'Too many login attempts. Please try again later.',
    );
    this.name = 'TooManyLoginAttemptsError';
    this.retryAfterSeconds = Math.max(
      1,
      Math.ceil((bannedUntil.getTime() - now.getTime()) / 1000),
    );
  }
}
