export class InvalidArtifactIdError extends Error {
  constructor(public readonly invalidId: string) {
    super(`Invalid artifact id: "${invalidId}" is not a valid UUID.`);
    this.name = 'InvalidArtifactIdError';
  }
}
