export const MAX_DISPLAY_NAME_LENGTH = 255;

export class InvalidDisplayNameError extends Error {
  constructor(reason: string) {
    super(`Invalid display name: ${reason}`);
    this.name = 'InvalidDisplayNameError';
  }

  static tooLong(): InvalidDisplayNameError {
    return new InvalidDisplayNameError(
      `must not exceed ${MAX_DISPLAY_NAME_LENGTH} characters`,
    );
  }
}
