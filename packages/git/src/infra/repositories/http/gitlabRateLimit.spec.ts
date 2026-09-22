import { AxiosError } from 'axios';
import { detectGitlabRateLimit } from './gitlabRateLimit';

const NOW_MS = 1_700_000_000_000;
const NOW_SECONDS = NOW_MS / 1000;

const gitlabError = (
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

describe('detectGitlabRateLimit', () => {
  describe('when GitLab answers 429 with retry-after', () => {
    it('reports the wait it asked for', () => {
      const error = gitlabError(429, { 'retry-after': '60' });

      expect(detectGitlabRateLimit(error, NOW_MS)).toEqual({
        retryAfterSeconds: 60,
      });
    });

    describe('when a reset is present too', () => {
      it('prefers retry-after', () => {
        const error = gitlabError(429, {
          'retry-after': '60',
          'RateLimit-Reset': String(NOW_SECONDS + 3600),
        });

        expect(detectGitlabRateLimit(error, NOW_MS)).toEqual({
          retryAfterSeconds: 60,
        });
      });
    });
  });

  describe('when GitLab answers 429 with only a reset', () => {
    it('reports the wait until the reset', () => {
      const error = gitlabError(429, {
        'RateLimit-Reset': String(NOW_SECONDS + 120),
      });

      expect(detectGitlabRateLimit(error, NOW_MS)).toEqual({
        retryAfterSeconds: 120,
      });
    });

    describe('when the reset is already in the past', () => {
      it('floors the wait at zero', () => {
        const error = gitlabError(429, {
          'RateLimit-Reset': String(NOW_SECONDS - 30),
        });

        expect(detectGitlabRateLimit(error, NOW_MS)).toEqual({
          retryAfterSeconds: 0,
        });
      });
    });

    describe.each(['', '   ', 'soon', 'NaN'])('with reset %p', (reset) => {
      it('falls back to no wait', () => {
        const error = gitlabError(429, { 'RateLimit-Reset': reset });

        expect(detectGitlabRateLimit(error, NOW_MS)).toEqual({
          retryAfterSeconds: 0,
        });
      });
    });
  });

  describe('when GitLab answers 429 with no usable header', () => {
    it('reports a throttle with no wait', () => {
      expect(detectGitlabRateLimit(gitlabError(429), NOW_MS)).toEqual({
        retryAfterSeconds: 0,
      });
    });
  });

  // GitLab, unlike GitHub, keeps its refusals and its throttles apart: a 403
  // is "you may not", never "not yet", and no header turns it into one.
  describe('when GitLab answers 403', () => {
    it('reports no throttle', () => {
      expect(detectGitlabRateLimit(gitlabError(403), NOW_MS)).toBeNull();
    });

    describe('when it carries throttling headers anyway', () => {
      it('still reports no throttle', () => {
        const error = gitlabError(403, { 'retry-after': '60' });

        expect(detectGitlabRateLimit(error, NOW_MS)).toBeNull();
      });
    });
  });

  describe('when the status is neither 429 nor a refusal', () => {
    it('reports no throttle', () => {
      expect(detectGitlabRateLimit(gitlabError(500), NOW_MS)).toBeNull();
    });
  });

  describe('when the failure is not an axios error', () => {
    it('reports no throttle', () => {
      expect(detectGitlabRateLimit(new Error('boom'), NOW_MS)).toBeNull();
    });
  });

  describe('when the axios error carries no response', () => {
    it('reports no throttle', () => {
      const error = new Error('socket hang up') as AxiosError;
      error.isAxiosError = true;

      expect(detectGitlabRateLimit(error, NOW_MS)).toBeNull();
    });
  });
});
