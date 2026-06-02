import {
  InstallStateSigner,
  InvalidInstallStateError,
} from './InstallStateSigner';

const TEST_KEY = '0123456789abcdef0123456789abcdef';

const FIXED_NOW = 1_700_000_000; // arbitrary unix seconds

function signerWithFixedNow(
  ttlSeconds = InstallStateSigner.DEFAULT_TTL_SECONDS,
): InstallStateSigner {
  return new InstallStateSigner(TEST_KEY, ttlSeconds, () => FIXED_NOW);
}

describe('InstallStateSigner', () => {
  describe('sign + verify round-trip', () => {
    it('returns original orgId and userId after round-trip', () => {
      const signer = signerWithFixedNow();
      const state = signer.sign({ orgId: 'org-123', userId: 'user-456' });
      const payload = signer.verify(state);

      expect(payload.orgId).toBe('org-123');
      expect(payload.userId).toBe('user-456');
    });

    it('generates a random nonce when none is provided', () => {
      const signer = signerWithFixedNow();
      const state1 = signer.sign({ orgId: 'org-1', userId: 'user-1' });
      const state2 = signer.sign({ orgId: 'org-1', userId: 'user-1' });
      const payload1 = signer.verify(state1);
      const payload2 = signer.verify(state2);

      expect(typeof payload1.nonce).toBe('string');
      expect(payload1.nonce.length).toBeGreaterThan(0);
      expect(payload1.nonce).not.toBe(payload2.nonce);
    });

    it('stamps exp within [now, now + ttl]', () => {
      const signer = signerWithFixedNow();
      const state = signer.sign({ orgId: 'org-1', userId: 'user-1' });
      const payload = signer.verify(state);

      expect(payload.exp).toBeGreaterThanOrEqual(FIXED_NOW);
      expect(payload.exp).toBeLessThanOrEqual(
        FIXED_NOW + InstallStateSigner.DEFAULT_TTL_SECONDS,
      );
    });
  });

  describe('deterministic stability', () => {
    it('returns the same string for the same payload with fixed nonce and exp', () => {
      const signer = signerWithFixedNow();
      const fixedNonce = 'aabbccddeeff00112233445566778899';
      const fixedExp = FIXED_NOW + 300;

      const state1 = signer.sign({
        orgId: 'org-1',
        userId: 'user-1',
        nonce: fixedNonce,
        exp: fixedExp,
      });
      const state2 = signer.sign({
        orgId: 'org-1',
        userId: 'user-1',
        nonce: fixedNonce,
        exp: fixedExp,
      });

      expect(state1).toBe(state2);
    });
  });

  describe('tampered payload', () => {
    it('throws InvalidInstallStateError when the payload part is tampered', () => {
      const signer = signerWithFixedNow();
      // Use a fixed nonce so the base64url output is deterministic and we can
      // pick a safe character position to tamper (not a trailing padding slot).
      const state = signer.sign({
        orgId: 'org-1',
        userId: 'user-1',
        nonce: 'aabbccddeeff00112233445566778899',
      });
      const [payload, sig] = state.split('.');
      // Tamper a character in the middle of the payload (position 10) so the
      // change always alters the decoded JSON bytes regardless of base64
      // trailing-character padding equivalence.
      const mid = 10;
      const tampered =
        payload.slice(0, mid) +
        (payload[mid] === 'a' ? 'b' : 'a') +
        payload.slice(mid + 1);

      expect(() => signer.verify(`${tampered}.${sig}`)).toThrow(
        InvalidInstallStateError,
      );
    });
  });

  describe('tampered signature', () => {
    it('throws InvalidInstallStateError when the signature part is tampered', () => {
      const signer = signerWithFixedNow();
      const state = signer.sign({ orgId: 'org-1', userId: 'user-1' });
      const [payload, sig] = state.split('.');
      const tampered = sig.slice(0, -1) + (sig.at(-1) === 'a' ? 'b' : 'a');

      expect(() => signer.verify(`${payload}.${tampered}`)).toThrow(
        InvalidInstallStateError,
      );
    });
  });

  describe('expired token', () => {
    it('throws InvalidInstallStateError when exp is in the past', () => {
      const signerInPast = new InstallStateSigner(
        TEST_KEY,
        InstallStateSigner.DEFAULT_TTL_SECONDS,
        () => FIXED_NOW,
      );
      const state = signerInPast.sign({
        orgId: 'org-1',
        userId: 'user-1',
        exp: FIXED_NOW - 1,
      });

      // Verify using same "now" — exp is already past
      expect(() => signerInPast.verify(state)).toThrow(
        InvalidInstallStateError,
      );
    });
  });

  describe('malformed token', () => {
    it('throws InvalidInstallStateError for "not-a-state"', () => {
      const signer = signerWithFixedNow();
      expect(() => signer.verify('not-a-state')).toThrow(
        InvalidInstallStateError,
      );
    });

    it('throws InvalidInstallStateError for "a.b.c"', () => {
      const signer = signerWithFixedNow();
      expect(() => signer.verify('a.b.c')).toThrow(InvalidInstallStateError);
    });

    it('throws InvalidInstallStateError for empty string', () => {
      const signer = signerWithFixedNow();
      expect(() => signer.verify('')).toThrow(InvalidInstallStateError);
    });
  });

  describe('organizationGitHubAppId payload field', () => {
    it('round-trips organizationGitHubAppId when present', () => {
      const signer = signerWithFixedNow();
      const state = signer.sign({
        orgId: 'org-1',
        userId: 'user-1',
        kind: 'install',
        organizationGitHubAppId: '00000000-0000-0000-0000-000000000aaa',
      });
      const payload = signer.verify(state);

      expect(payload.organizationGitHubAppId).toBe(
        '00000000-0000-0000-0000-000000000aaa',
      );
      expect(payload.kind).toBe('install');
    });

    it('omits organizationGitHubAppId for manifest-kind tokens', () => {
      const signer = signerWithFixedNow();
      const state = signer.sign({
        orgId: 'org-1',
        userId: 'user-1',
        kind: 'manifest',
      });
      const payload = signer.verify(state);

      expect(payload.organizationGitHubAppId).toBeUndefined();
      expect(payload.kind).toBe('manifest');
    });
  });

  describe('wrong key', () => {
    it('throws InvalidInstallStateError when verifying with a different key', () => {
      const signerA = new InstallStateSigner(
        TEST_KEY,
        InstallStateSigner.DEFAULT_TTL_SECONDS,
        () => FIXED_NOW,
      );
      const signerB = new InstallStateSigner(
        'ffffffffffffffffffffffffffffffff',
        InstallStateSigner.DEFAULT_TTL_SECONDS,
        () => FIXED_NOW,
      );

      const state = signerA.sign({ orgId: 'org-1', userId: 'user-1' });
      expect(() => signerB.verify(state)).toThrow(InvalidInstallStateError);
    });
  });
});
