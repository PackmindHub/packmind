export class TooManyLoginAttemptsError extends Error {
  constructor(public readonly bannedUntil: Date) {
    super('Too many login attempts. Please try again later.');
    this.name = 'TooManyLoginAttemptsError';
  }
}
