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
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits

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
   * Derive a consistent encryption key from the provided key or environment variable
   */
  private getEncryptionKey(): Buffer {
    const keySource = this.encryptionKey;

    if (!keySource) {
      throw new Error(
        'Encryption key not provided. Set ENCRYPTION_KEY environment variable or pass key to constructor.',
      );
    }

    // Use SHA-256 to derive a consistent 32-byte key from the provided string
    return createHash('sha256').update(keySource).digest();
  }

  /**
   * Encrypt a string value
   * @param plaintext The value to encrypt
   * @returns Base64 encoded encrypted value with format: iv:encrypted:tag
   */
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

      // Combine iv, encrypted data, and tag with colons
      const result = `${iv.toString('base64')}:${encrypted}:${tag.toString('base64')}`;

      this.logger.debug('Value encrypted successfully');
      return result;
    } catch (error) {
      this.logger.error('Failed to encrypt value', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Re-throw the original error if it's from getEncryptionKey, otherwise wrap it
      if (
        error instanceof Error &&
        error.message.includes('Encryption key not provided')
      ) {
        throw error;
      }
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt a string value
   * @param encryptedValue Base64 encoded encrypted value with format: iv:encrypted:tag
   * @returns Decrypted plaintext value
   */
  decrypt(encryptedValue: string): string {
    if (!encryptedValue) {
      this.logger.warn('Attempted to decrypt empty or null value');
      return encryptedValue;
    }

    // Check if the value is already in plaintext (for backward compatibility)
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
   * Check if a value is encrypted (has the expected format)
   */
  isEncrypted(value: string): boolean {
    return Boolean(
      value && value.includes(':') && value.split(':').length === 3,
    );
  }
}
