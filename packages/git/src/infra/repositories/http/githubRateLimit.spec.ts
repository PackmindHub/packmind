import { AxiosError } from 'axios';
import { detectGithubRateLimit } from './githubRateLimit';

const NOW_MS = 1_700_000_000_000;
const NOW_SECONDS = NOW_MS / 1000;

const githubError = (
  status: number,
  headers: Record<string, string | number> = {},
): AxiosError => {
  const error = new Error(
    `Request failed with status code ${status}`,
  ) as AxiosError;
  error.isAxiosError = true;
  error.response = {
    status,
    statusText: '',
    headers,
    config: {},
    data: {},
  } as AxiosError['response'];
  return error;
};

describe('detectGithubRateLimit', () => {
  describe('when GitHub answers 403 with the primary quota exhausted', () => {
    it('reports the wait until the reset', () => {
      const error = githubError(403, {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': String(NOW_SECONDS + 120),
      });

      expect(detectGithubRateLimit(error, NOW_MS)).toEqual({
        retryAfterSeconds: 120,
      });
    });

    describe('when the reset is already in the past', () => {
      it('floors the wait at zero', () => {
        const error = githubError(403, {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(NOW_SECONDS - 30),
        });

        expect(detectGithubRateLimit(error, NOW_MS)).toEqual({
          retryAfterSeconds: 0,
        });
      });
    });

    describe('when the header name is not lowercased', () => {
      it('still reads it', () => {
        const error = githubError(403, { 'X-RateLimit-Remaining': '0' });

        expect(detectGithubRateLimit(error, NOW_MS)).toEqual({
          retryAfterSeconds: 0,
        });
      });
    });
  });

  describe('when GitHub answers 403 with retry-after', () => {
    it('reports the wait it asked for', () => {
      const error = githubError(403, { 'retry-after': '60' });

      expect(detectGithubRateLimit(error, NOW_MS)).toEqual({
        retryAfterSeconds: 60,
      });
    });

    describe('when a reset is present too', () => {
      it('prefers retry-after', () => {
        const error = githubError(403, {
          'retry-after': '60',
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(NOW_SECONDS + 3600),
        });

        expect(detectGithubRateLimit(error, NOW_MS)).toEqual({
          retryAfterSeconds: 60,
        });
      });
    });
  });

  describe('when GitHub answers 429', () => {
    it('reports a throttle without needing a header', () => {
      expect(detectGithubRateLimit(githubError(429), NOW_MS)).toEqual({
        retryAfterSeconds: 0,
      });
    });
  });

  describe('when GitHub answers a plain 403', () => {
    it('reports no throttle', () => {
      expect(detectGithubRateLimit(githubError(403), NOW_MS)).toBeNull();
    });

    describe('when the quota is merely low', () => {
      it('reports no throttle', () => {
        const error = githubError(403, { 'x-ratelimit-remaining': '17' });

        expect(detectGithubRateLimit(error, NOW_MS)).toBeNull();
      });
    });
  });

  describe('when the reset header is missing or unparseable', () => {
    describe.each(['', '   ', 'soon', 'NaN'])('with reset %p', (reset) => {
      it('falls back to no wait', () => {
        const error = githubError(403, {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': reset,
        });

        expect(detectGithubRateLimit(error, NOW_MS)).toEqual({
          retryAfterSeconds: 0,
        });
      });
    });

    describe('with no reset header at all', () => {
      it('falls back to no wait', () => {
        const error = githubError(403, { 'x-ratelimit-remaining': '0' });

        expect(detectGithubRateLimit(error, NOW_MS)).toEqual({
          retryAfterSeconds: 0,
        });
      });
    });
  });

  describe('when the failure is not an axios error', () => {
    it('reports no throttle', () => {
      expect(detectGithubRateLimit(new Error('boom'), NOW_MS)).toBeNull();
    });
  });

  describe('when the axios error carries no response', () => {
    it('reports no throttle', () => {
      const error = new Error('socket hang up') as AxiosError;
      error.isAxiosError = true;

      expect(detectGithubRateLimit(error, NOW_MS)).toBeNull();
    });
  });

  describe('when the status is neither 403 nor 429', () => {
    it('reports no throttle', () => {
      expect(detectGithubRateLimit(githubError(500), NOW_MS)).toBeNull();
    });
  });
});
