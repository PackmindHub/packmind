import { EncryptionService } from './EncryptionService';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;
  const testKey = 'test-encryption-key-12345';

  beforeEach(() => {
    encryptionService = new EncryptionService(testKey);
  });

  describe('encrypt', () => {
    describe('when encrypting a plaintext value', () => {
      let plaintext: string;
      let encrypted: string;

      beforeEach(() => {
        plaintext = 'test-token-12345';
        encrypted = encryptionService.encrypt(plaintext);
      });

      it('returns a defined value', () => {
        expect(encrypted).toBeDefined();
      });

      it('returns a value different from the plaintext', () => {
        expect(encrypted).not.toBe(plaintext);
      });

      it('returns a value containing colons', () => {
        expect(encrypted.includes(':')).toBe(true);
      });

      it('returns a value with three colon-separated parts', () => {
        expect(encrypted.split(':').length).toBe(3);
      });
    });

    it('returns empty string for empty input', () => {
      const result = encryptionService.encrypt('');
      expect(result).toBe('');
    });

    it('handles null input gracefully', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = encryptionService.encrypt(null as any);
      expect(result).toBeNull();
    });

    it('produces different encrypted values for the same input due to random IV', () => {
      const plaintext = 'test-token-12345';
      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('decrypt', () => {
    it('decrypts an encrypted value correctly', () => {
      const plaintext = 'test-token-12345';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('returns empty string for empty input', () => {
      const result = encryptionService.decrypt('');
      expect(result).toBe('');
    });

    it('handles null input gracefully', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = encryptionService.decrypt(null as any);
      expect(result).toBeNull();
    });

    it('returns plaintext values unchanged for backward compatibility', () => {
      const plaintext = 'plain-token-without-colons';
      const result = encryptionService.decrypt(plaintext);
      expect(result).toBe(plaintext);
    });

    it('returns invalid encrypted format as-is for backward compatibility', () => {
      const invalidEncrypted = 'invalid:format';
      const result = encryptionService.decrypt(invalidEncrypted);
      // Should return as-is for backward compatibility since it doesn't have 3 parts
      expect(result).toBe(invalidEncrypted);
    });

    it('throws error for corrupted encrypted data', () => {
      const corruptedEncrypted = 'invalid:data:here';
      expect(() => {
        encryptionService.decrypt(corruptedEncrypted);
      }).toThrow('Decryption failed');
    });
  });

  describe('isEncrypted', () => {
    it('returns true for encrypted values', () => {
      const plaintext = 'test-token-12345';
      const encrypted = encryptionService.encrypt(plaintext);
      expect(encryptionService.isEncrypted(encrypted)).toBe(true);
    });

    it('returns false for plaintext values', () => {
      const plaintext = 'plain-token-without-colons';
      expect(encryptionService.isEncrypted(plaintext)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(encryptionService.isEncrypted('')).toBe(false);
    });

    it('returns false for value with only two colon-separated parts', () => {
      expect(encryptionService.isEncrypted('invalid:format')).toBe(false);
    });

    it('returns false for value with more than three colon-separated parts', () => {
      expect(encryptionService.isEncrypted('too:many:colons:here')).toBe(false);
    });
  });

  describe('round trip consistency', () => {
    it('maintains consistency across multiple encrypt/decrypt cycles', () => {
      const plaintext = 'test-token-12345';

      // Multiple round trips should produce the same result
      for (let i = 0; i < 5; i++) {
        const encrypted = encryptionService.encrypt(plaintext);
        const decrypted = encryptionService.decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
      }
    });
  });
});
