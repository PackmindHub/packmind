import { isDomainError } from './DomainError';
import { isInternalError, PackmindInternalError } from './InternalError';
import { isUpstreamError, PackmindUpstreamError } from './UpstreamError';

describe('isUpstreamError', () => {
  describe('when the value is a rate-limited PackmindUpstreamError', () => {
    it('returns true', () => {
      const error = new PackmindUpstreamError(
        'upstream_rate_limited',
        'github_rate_limited',
        { provider: 'github' },
        'GitHub is rate limiting us, try again shortly.',
        60,
      );

      expect(isUpstreamError(error)).toBe(true);
    });
  });

  describe('when the value is an unavailable PackmindUpstreamError', () => {
    it('returns true', () => {
      const error = new PackmindUpstreamError(
        'upstream_unavailable',
        'gitlab_unreachable',
        { provider: 'gitlab' },
        'GitLab did not answer.',
      );

      expect(isUpstreamError(error)).toBe(true);
    });
  });

  describe('when the value is a plain object shaped like one', () => {
    it('returns false, because it is not an Error', () => {
      const value = {
        kind: 'upstream_unavailable',
        reason: 'gitlab_unreachable',
      };

      expect(isUpstreamError(value)).toBe(false);
    });
  });

  describe('when the value is a plain Error', () => {
    it('returns false', () => {
      expect(isUpstreamError(new Error('boom'))).toBe(false);
    });
  });

  describe.each([null, undefined, 'upstream_unavailable', 502, true])(
    'when the value is %p',
    (value) => {
      it('returns false', () => {
        expect(isUpstreamError(value)).toBe(false);
      });
    },
  );

  describe('when the value has an upstream kind but no reason', () => {
    it('returns false', () => {
      const error = Object.assign(new Error('boom'), {
        kind: 'upstream_unavailable',
      });

      expect(isUpstreamError(error)).toBe(false);
    });
  });

  describe('when the value carries an unknown kind', () => {
    it('returns false', () => {
      const error = Object.assign(new Error('boom'), {
        kind: 'upstream_exploded',
        reason: 'a_reason',
      });

      expect(isUpstreamError(error)).toBe(false);
    });
  });
});

describe('the three unions', () => {
  const upstreamError = new PackmindUpstreamError(
    'upstream_rate_limited',
    'github_rate_limited',
    {},
    'GitHub is rate limiting us, try again shortly.',
    60,
  );

  const internalError = new PackmindInternalError(
    'package_reload_failed',
    {},
    'Failed to retrieve the updated package.',
  );

  const domainError = Object.assign(new Error('nope'), {
    kind: 'not_found',
    reason: 'package_not_found',
  });

  it('does not classify an upstream error as a domain error', () => {
    expect(isDomainError(upstreamError)).toBe(false);
  });

  it('does not classify an upstream error as an internal error', () => {
    expect(isInternalError(upstreamError)).toBe(false);
  });

  it('does not classify an internal error as an upstream error', () => {
    expect(isUpstreamError(internalError)).toBe(false);
  });

  it('does not classify a domain error as an upstream error', () => {
    expect(isUpstreamError(domainError)).toBe(false);
  });

  it('does not classify a domain error as an internal error', () => {
    expect(isInternalError(domainError)).toBe(false);
  });

  it('still classifies a domain error as a domain error', () => {
    expect(isDomainError(domainError)).toBe(true);
  });
});

describe('PackmindUpstreamError', () => {
  const error = new PackmindUpstreamError(
    'upstream_rate_limited',
    'github_rate_limited',
    { provider: 'github' },
    'GitHub is rate limiting us, try again shortly.',
    60,
  );

  it('carries the kind', () => {
    expect(error.kind).toBe('upstream_rate_limited');
  });

  it('carries the reason', () => {
    expect(error.reason).toBe('github_rate_limited');
  });

  it('carries the context', () => {
    expect(error.context).toEqual({ provider: 'github' });
  });

  it('carries the message', () => {
    expect(error.message).toBe(
      'GitHub is rate limiting us, try again shortly.',
    );
  });

  it('carries the retry delay', () => {
    expect(error.retryAfterSeconds).toBe(60);
  });

  it('is an Error', () => {
    expect(error).toBeInstanceOf(Error);
  });
});

describe('when no retry delay is given', () => {
  it('leaves retryAfterSeconds undefined', () => {
    const error = new PackmindUpstreamError(
      'upstream_unavailable',
      'gitlab_unreachable',
      {},
      'GitLab did not answer.',
    );

    expect(error.retryAfterSeconds).toBeUndefined();
  });
});
