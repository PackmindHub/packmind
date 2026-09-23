import { AccountsError } from './AccountsError';

export const MAX_DISPLAY_NAME_LENGTH = 255;

export class InvalidDisplayNameError extends AccountsError {
  constructor(detail: string) {
    super(
      'invalid_input',
      'invalid_display_name',
      { displayNameDetail: detail },
      `Invalid display name: ${detail}`,
    );
    this.name = 'InvalidDisplayNameError';
  }

  static tooLong(): InvalidDisplayNameError {
    return new InvalidDisplayNameError(
      `must not exceed ${MAX_DISPLAY_NAME_LENGTH} characters`,
    );
  }
}
