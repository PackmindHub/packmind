import { isDomainError, isInternalError, isUpstreamError } from '../../errors';
import { LlmUpstreamError } from './LlmUpstreamError';

describe('LlmUpstreamError', () => {
  const error = new LlmUpstreamError(
    'upstream_rate_limited',
    'llm_rate_limited',
    { provider: 'openai', model: 'gpt-4o', attempts: 3 },
    'openai is rate limiting us, try again shortly',
    30,
  );

  it('is an upstream error', () => {
    expect(isUpstreamError(error)).toBe(true);
  });

  it('is not a domain error', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('is not an internal error', () => {
    expect(isInternalError(error)).toBe(false);
  });

  it('is an Error', () => {
    expect(error).toBeInstanceOf(Error);
  });

  it('answers its own kind', () => {
    expect(error.kind).toBe('upstream_rate_limited');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('llm_rate_limited');
  });

  it('keeps the ids in the context', () => {
    expect(error.context).toEqual({
      provider: 'openai',
      model: 'gpt-4o',
      attempts: 3,
    });
  });

  it('keeps the retryAfterSeconds', () => {
    expect(error.retryAfterSeconds).toBe(30);
  });

  it('keeps the message', () => {
    expect(error.message).toBe('openai is rate limiting us, try again shortly');
  });

  it('names itself', () => {
    expect(error.name).toBe('LlmUpstreamError');
  });

  describe('when no retryAfterSeconds is given', () => {
    it('leaves it undefined', () => {
      const withoutRetry = new LlmUpstreamError(
        'upstream_unavailable',
        'llm_api_error',
        {},
        'openai did not answer',
      );

      expect(withoutRetry.retryAfterSeconds).toBeUndefined();
    });
  });
});
