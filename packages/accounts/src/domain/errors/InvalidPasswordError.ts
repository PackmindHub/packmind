import { AccountsError } from './AccountsError';

export class InvalidPasswordError extends AccountsError {
  constructor(
    reason: 'password_required' | 'password_too_short' | 'password_too_weak',
  ) {
    const messages: Record<string, string> = {
      password_required: 'Password is required',
      password_too_short: 'Password must be at least 8 characters',
      password_too_weak:
        'Password must contain at least 2 non-alphanumerical characters',
    };

    super('invalid_input', 'invalid_password', {}, messages[reason]);
    this.name = 'InvalidPasswordError';
  }

  static required(): InvalidPasswordError {
    return new InvalidPasswordError('password_required');
  }

  static tooShort(): InvalidPasswordError {
    return new InvalidPasswordError('password_too_short');
  }

  static tooWeak(): InvalidPasswordError {
    return new InvalidPasswordError('password_too_weak');
  }
}
