export class TargetNotFoundError extends Error {
  constructor(targetId: string) {
    super(`Target with id "${targetId}" was not found`);
    this.name = 'TargetNotFoundError';
    Object.setPrototypeOf(this, TargetNotFoundError.prototype);
  }
}
