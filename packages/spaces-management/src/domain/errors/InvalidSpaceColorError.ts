export class InvalidSpaceColorError extends Error {
  constructor(color: string) {
    super(`Space color '${color}' is not a valid palette value`);
    this.name = 'InvalidSpaceColorError';
  }
}
