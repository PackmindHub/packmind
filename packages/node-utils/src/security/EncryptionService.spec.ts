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
      expect(result).toBe(invalidEncrypted);
    });

    it('throws error for a well-formed envelope encrypted with another key', () => {
      const encrypted = new EncryptionService('another-key').encrypt(
        'test-token-12345',
      );
      expect(() => {
        encryptionService.decrypt(encrypted);
      }).toThrow('Decryption failed');
    });

    it('throws error for a well-formed envelope with tampered ciphertext', () => {
      const [iv, , tag] = encryptionService
        .encrypt('test-token-12345')
        .split(':');
      const tampered = `${iv}:${Buffer.from('tampered').toString('base64')}:${tag}`;
      expect(() => {
        encryptionService.decrypt(tampered);
      }).toThrow('Decryption failed');
    });

    describe('when a plaintext value contains two colons', () => {
      it.each(['invalid:data:here', 'glpat-abc:def:', 'aXY=:Y2lwaGVy:'])(
        'returns %s unchanged',
        (plaintext) => {
          expect(encryptionService.decrypt(plaintext)).toBe(plaintext);
        },
      );
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

    describe('when a plaintext value has three colon-separated parts', () => {
      it.each([
        ['an empty auth tag', 'glpat-abc:def:'],
        ['non-base64 parts', 'invalid:data:here'],
        ['a short IV', 'aXY=:Y2lwaGVy:'],
        [
          'an empty ciphertext',
          'AAAAAAAAAAAAAAAAAAAAAA==::AAAAAAAAAAAAAAAAAAAAAA==',
        ],
      ])('returns false for %s', (_label, value) => {
        expect(encryptionService.isEncrypted(value)).toBe(false);
      });
    });

    describe('when encrypting a plaintext value that contains two colons', () => {
      it('round-trips through encrypt and decrypt', () => {
        const plaintext = 'glpat-abc:def:';
        const encrypted = encryptionService.encrypt(plaintext);

        expect(encryptionService.decrypt(encrypted)).toBe(plaintext);
      });
    });
  });

  describe('round trip consistency', () => {
    it('maintains consistency across multiple encrypt/decrypt cycles', () => {
      const plaintext = 'test-token-12345';

      // Each pass encrypts under a fresh random IV, so this checks the IV is
      // carried in the output rather than fixed.
      for (let i = 0; i < 5; i++) {
        const encrypted = encryptionService.encrypt(plaintext);
        const decrypted = encryptionService.decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
      }
    });
  });
});
