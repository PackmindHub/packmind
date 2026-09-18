import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from 'crypto';
import { PackmindLogger, LogLevel } from '@packmind/logger';

const origin = 'EncryptionService';

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16; // 128 bits

  constructor(
    private readonly encryptionKey: string,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('EncryptionService initialized');
  }

  /**
   * SHA-256 of the configured key string, which is how a secret of any length
   * becomes the exactly 32 bytes aes-256-gcm requires - and the same 32 bytes
   * every time, so previously stored values stay decryptable.
   */
  private getEncryptionKey(): Buffer {
    const keySource = this.encryptionKey;

    if (!keySource) {
      throw new Error(
        'Encryption key not provided. Set ENCRYPTION_KEY environment variable or pass key to constructor.',
      );
    }

    return createHash('sha256').update(keySource).digest();
  }

  /** Returns `iv:ciphertext:tag`, each part base64. Empty input passes through. */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      this.logger.warn('Attempted to encrypt empty or null value');
      return plaintext;
    }

    try {
      const key = this.getEncryptionKey();
      const iv = randomBytes(this.ivLength);
      const cipher = createCipheriv(this.algorithm, key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      const tag = cipher.getAuthTag();

      const result = `${iv.toString('base64')}:${encrypted}:${tag.toString('base64')}`;

      this.logger.debug('Value encrypted successfully');
      return result;
    } catch (error) {
      this.logger.error('Failed to encrypt value', {
        error: error instanceof Error ? error.message : String(error),
      });
      // A missing key is a misconfiguration and says so; every other failure
      // collapses to a generic message.
      if (
        error instanceof Error &&
        error.message.includes('Encryption key not provided')
      ) {
        throw error;
      }
      throw new Error('Encryption failed');
    }
  }

  /** Expects `iv:ciphertext:tag`; anything not in that shape passes through. */
  decrypt(encryptedValue: string): string {
    if (!encryptedValue) {
      this.logger.warn('Attempted to decrypt empty or null value');
      return encryptedValue;
    }

    // Values predating encryption are returned untouched rather than treated
    // as corrupt ciphertext.
    if (
      !encryptedValue.includes(':') ||
      encryptedValue.split(':').length !== 3
    ) {
      this.logger.warn(
        'Value appears to be in plaintext format, returning as-is for backward compatibility',
      );
      return encryptedValue;
    }

    try {
      const key = this.getEncryptionKey();
      const parts = encryptedValue.split(':');

      if (parts.length !== 3) {
        throw new Error('Invalid encrypted value format');
      }

      const iv = Buffer.from(parts[0], 'base64');
      const encrypted = parts[1];
      const tag = Buffer.from(parts[2], 'base64');

      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      this.logger.debug('Value decrypted successfully');
      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt value', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Shape check only, not a verification: callers use it to avoid encrypting an
   * already-encrypted value a second time.
   */
  isEncrypted(value: string): boolean {
    return Boolean(
      value && value.includes(':') && value.split(':').length === 3,
    );
  }
}
