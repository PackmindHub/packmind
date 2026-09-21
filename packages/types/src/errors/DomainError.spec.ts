import { isDomainError } from './DomainError';

describe('isDomainError', () => {
  describe('when the value has a valid kind and reason string', () => {
    describe.each(['forbidden', 'not_found', 'invalid_input', 'conflict'])(
      'and the kind is %s',
      (kind) => {
        it('returns true', () => {
          const value = { kind, reason: 'example reason' };
          expect(isDomainError(value)).toBe(true);
        });
      },
    );
  });

  describe('when the value is null', () => {
    it('returns false', () => {
      expect(isDomainError(null)).toBe(false);
    });
  });

  describe('when the value is undefined', () => {
    it('returns false', () => {
      expect(isDomainError(undefined)).toBe(false);
    });
  });

  describe('when the value is a primitive string', () => {
    it('returns false', () => {
      expect(isDomainError('forbidden')).toBe(false);
    });
  });

  describe('when the value is a primitive number', () => {
    it('returns false', () => {
      expect(isDomainError(403)).toBe(false);
    });
  });

  describe('when the value is a primitive boolean', () => {
    it('returns false', () => {
      expect(isDomainError(true)).toBe(false);
    });
  });

  describe('when the value is a plain Error', () => {
    it('returns false', () => {
      expect(isDomainError(new Error('test error'))).toBe(false);
    });
  });

  describe('when the value has a valid kind but no reason', () => {
    it('returns false', () => {
      const value = { kind: 'forbidden' };
      expect(isDomainError(value)).toBe(false);
    });
  });

  describe('when the value has a valid kind but reason is not a string', () => {
    describe.each([123, true, null, undefined, { message: 'error' }])(
      'and reason is %p',
      (reason) => {
        it('returns false', () => {
          const value = { kind: 'forbidden', reason };
          expect(isDomainError(value)).toBe(false);
        });
      },
    );
  });

  describe('when the value has no kind', () => {
    it('returns false', () => {
      const value = { reason: 'example reason' };
      expect(isDomainError(value)).toBe(false);
    });
  });

  describe('when the value has an unrecognized kind with a valid reason string', () => {
    describe.each(['unauthorized', 'internal', 'teapot'])(
      'and the kind is %s',
      (kind) => {
        it('returns false', () => {
          const value = { kind, reason: 'example reason' };
          expect(isDomainError(value)).toBe(false);
        });
      },
    );
  });

  describe('when the value has an unrecognized kind and no reason', () => {
    it('returns false', () => {
      const value = { kind: 'unknown' };
      expect(isDomainError(value)).toBe(false);
    });
  });

  describe('when the value has extra properties beyond kind and reason', () => {
    it('still returns true if kind and reason are valid', () => {
      const value = {
        kind: 'forbidden',
        reason: 'access denied',
        context: { userId: '123' },
        statusCode: 403,
      };
      expect(isDomainError(value)).toBe(true);
    });
  });
});
