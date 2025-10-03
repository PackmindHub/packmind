export class UserCannotExcludeSelfError extends Error {
  constructor() {
    super('Users cannot exclude themselves from an organization');
    this.name = 'UserCannotExcludeSelfError';
  }
}
