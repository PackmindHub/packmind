export class InvalidEmailOrPasswordError extends Error {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidEmailOrPasswordError';
  }
}
