import { isDomainError } from './DomainError';
import { isInternalError, PackmindInternalError } from './InternalError';

describe('isInternalError', () => {
  describe('when the value is a PackmindInternalError', () => {
    it('returns true', () => {
      const error = new PackmindInternalError(
        'package_reload_failed',
        { packageId: 'abc' },
        'Failed to retrieve the updated package.',
      );

      expect(isInternalError(error)).toBe(true);
    });
  });

  describe('when the value is a plain object shaped like one', () => {
    it('returns false, because it is not an Error', () => {
      const value = { kind: 'internal', reason: 'package_reload_failed' };

      expect(isInternalError(value)).toBe(false);
    });
  });

  describe('when the value is a plain Error', () => {
    it('returns false', () => {
      expect(isInternalError(new Error('boom'))).toBe(false);
    });
  });

  describe.each([null, undefined, 'internal', 500, true])(
    'when the value is %p',
    (value) => {
      it('returns false', () => {
        expect(isInternalError(value)).toBe(false);
      });
    },
  );

  describe('when the value has kind internal but no reason', () => {
    it('returns false', () => {
      const error = Object.assign(new Error('boom'), { kind: 'internal' });

      expect(isInternalError(error)).toBe(false);
    });
  });
});

describe('the two unions', () => {
  const internalError = new PackmindInternalError(
    'package_reload_failed',
    {},
    'Failed to retrieve the updated package.',
  );

  it('does not classify an internal error as a domain error', () => {
    expect(isDomainError(internalError)).toBe(false);
  });

  it('does not classify a domain error as an internal error', () => {
    const domainError = Object.assign(new Error('nope'), {
      kind: 'not_found',
      reason: 'package_not_found',
    });

    expect(isInternalError(domainError)).toBe(false);
  });
});

describe('PackmindInternalError', () => {
  const error = new PackmindInternalError(
    'package_reload_failed',
    { packageId: 'abc' },
    'Failed to retrieve the updated package.',
  );

  it('carries the reason', () => {
    expect(error.reason).toBe('package_reload_failed');
  });

  it('carries the context', () => {
    expect(error.context).toEqual({ packageId: 'abc' });
  });

  it('carries the message', () => {
    expect(error.message).toBe('Failed to retrieve the updated package.');
  });

  it('is an Error', () => {
    expect(error).toBeInstanceOf(Error);
  });
});
