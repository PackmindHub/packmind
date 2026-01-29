export class EmailAlreadyExistsError extends Error {
  constructor() {
    super('An account with this email address already exists');
    this.name = 'EmailAlreadyExistsError';
  }
}
