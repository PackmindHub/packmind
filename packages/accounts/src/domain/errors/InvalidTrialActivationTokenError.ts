export class InvalidTrialActivationTokenError extends Error {
  constructor() {
    super('Trial activation token is invalid or expired');
    this.name = 'InvalidTrialActivationTokenError';
  }
}
