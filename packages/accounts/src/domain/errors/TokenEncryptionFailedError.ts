import { AccountsInternalError } from './AccountsInternalError';

export type EncryptedTokenType =
  | 'cli_login_code'
  | 'invitation'
  | 'password_reset';
export type TokenEncryptionOperation = 'encrypt' | 'decrypt';

/**
 * Encrypting or decrypting a stored token threw: a key or stored-data
 * invariant of ours. `cause` is the crypto error, never the token itself.
 */
export class TokenEncryptionFailedError extends AccountsInternalError {
  constructor(
    tokenType: EncryptedTokenType,
    operation: TokenEncryptionOperation,
    cause: unknown,
  ) {
    super(
      'token_encryption_failed',
      { tokenType, operation },
      `Failed to ${operation} ${tokenType} token`,
      { cause },
    );
    this.name = 'TokenEncryptionFailedError';
  }
}
