export class InvalidSpaceNameError extends Error {
  constructor(reason: string) {
    super(`Invalid space name: ${reason}`);
    this.name = 'InvalidSpaceNameError';
  }
}
