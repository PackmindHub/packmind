export class MissingEmailError extends Error {
  constructor() {
    super(`Missing email input for sign-in`);
    this.name = 'MissingEmailError';
  }
}
