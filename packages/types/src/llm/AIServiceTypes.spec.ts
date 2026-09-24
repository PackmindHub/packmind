import { isDomainError, isInternalError, isUpstreamError } from '../errors';
import { AIServiceError } from './AIServiceTypes';
import { LlmUpstreamError } from './errors/LlmUpstreamError';

describe('AIServiceError', () => {
  describe.each([
    ['RATE_LIMIT', 'upstream_rate_limited', 'llm_rate_limited'],
    ['API_ERROR', 'upstream_unavailable', 'llm_api_error'],
    ['NETWORK_ERROR', 'upstream_unavailable', 'llm_network_error'],
    ['INVALID_RESPONSE', 'upstream_unavailable', 'llm_invalid_response'],
    [
      'AUTHENTICATION_ERROR',
      'upstream_unavailable',
      'llm_authentication_failed',
    ],
    [
      'MAX_RETRIES_EXCEEDED',
      'upstream_unavailable',
      'llm_max_retries_exceeded',
    ],
  ] as const)('when the type is %s', (type, expectedKind, expectedReason) => {
    const originalError = new Error('boom');
    const error = new AIServiceError(
      'openai did not answer',
      type,
      3,
      originalError,
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

    it('is an llm upstream error', () => {
      expect(error).toBeInstanceOf(LlmUpstreamError);
    });

    it(`answers ${expectedKind}`, () => {
      expect(error.kind).toBe(expectedKind);
    });

    it(`answers ${expectedReason}`, () => {
      expect(error.reason).toBe(expectedReason);
    });

    it('keeps the attempts in the context', () => {
      expect(error.context).toEqual({ attempts: 3 });
    });

    it('keeps its public type', () => {
      expect(error.type).toBe(type);
    });

    it('keeps its public attempts', () => {
      expect(error.attempts).toBe(3);
    });

    it('keeps its public originalError', () => {
      expect(error.originalError).toBe(originalError);
    });

    it('keeps the message', () => {
      expect(error.message).toBe('openai did not answer');
    });

    it('names itself', () => {
      expect(error.name).toBe('AIServiceError');
    });
  });

  describe('when no originalError is given', () => {
    it('leaves it undefined', () => {
      const error = new AIServiceError('boom', 'API_ERROR', 1);

      expect(error.originalError).toBeUndefined();
    });
  });
});
