import { AIServiceError, AIServiceErrorTypes } from '@packmind/types';
import {
  classifyProviderError,
  extractProviderStatus,
} from './classifyProviderError';

function sdkError(
  fields: Record<string, unknown>,
  message = 'provider failure',
): Error {
  return Object.assign(new Error(message), fields);
}

class APIConnectionError extends Error {}
class APIConnectionTimeoutError extends APIConnectionError {}

describe('extractProviderStatus', () => {
  it('reads error.status', () => {
    expect(extractProviderStatus(sdkError({ status: 503 }))).toBe(503);
  });

  it('reads error.response.status for axios-shaped errors', () => {
    expect(extractProviderStatus(sdkError({ response: { status: 502 } }))).toBe(
      502,
    );
  });

  it('ignores a non-numeric status', () => {
    expect(extractProviderStatus(sdkError({ status: '429' }))).toBeUndefined();
  });

  it('does not parse a status out of the message', () => {
    expect(
      extractProviderStatus(new Error('Request failed (429)')),
    ).toBeUndefined();
  });

  it('returns undefined for non-objects', () => {
    expect(extractProviderStatus('Rate limit exceeded (429)')).toBeUndefined();
  });
});

describe('classifyProviderError', () => {
  it('returns the type of an AIServiceError', () => {
    const error = new AIServiceError(
      'bad',
      AIServiceErrorTypes.INVALID_RESPONSE,
      1,
    );

    expect(classifyProviderError(error)).toBe(
      AIServiceErrorTypes.INVALID_RESPONSE,
    );
  });

  it('classifies status 429 as RATE_LIMIT', () => {
    expect(classifyProviderError(sdkError({ status: 429 }))).toBe(
      AIServiceErrorTypes.RATE_LIMIT,
    );
  });

  it('classifies status 401 as AUTHENTICATION_ERROR', () => {
    expect(classifyProviderError(sdkError({ status: 401 }))).toBe(
      AIServiceErrorTypes.AUTHENTICATION_ERROR,
    );
  });

  it('classifies status 403 as AUTHENTICATION_ERROR', () => {
    expect(classifyProviderError(sdkError({ status: 403 }))).toBe(
      AIServiceErrorTypes.AUTHENTICATION_ERROR,
    );
  });

  it('classifies status 408 as NETWORK_ERROR', () => {
    expect(classifyProviderError(sdkError({ status: 408 }))).toBe(
      AIServiceErrorTypes.NETWORK_ERROR,
    );
  });

  it('classifies any other status as API_ERROR', () => {
    expect(classifyProviderError(sdkError({ status: 500 }))).toBe(
      AIServiceErrorTypes.API_ERROR,
    );
  });

  it('classifies a Google GenAI ApiError by its status', () => {
    expect(
      classifyProviderError(sdkError({ name: 'ApiError', status: 429 })),
    ).toBe(AIServiceErrorTypes.RATE_LIMIT);
  });

  it('classifies an axios-shaped error by response.status', () => {
    expect(classifyProviderError(sdkError({ response: { status: 401 } }))).toBe(
      AIServiceErrorTypes.AUTHENTICATION_ERROR,
    );
  });

  it('lets the status win over a network-looking code', () => {
    expect(
      classifyProviderError(sdkError({ status: 429, code: 'ECONNRESET' })),
    ).toBe(AIServiceErrorTypes.RATE_LIMIT);
  });

  it.each(['APIConnectionError', 'AbortError', 'TimeoutError'])(
    'classifies an error named %s as NETWORK_ERROR',
    (name) => {
      expect(classifyProviderError(sdkError({ name }))).toBe(
        AIServiceErrorTypes.NETWORK_ERROR,
      );
    },
  );

  it('classifies an SDK APIConnectionError instance (no .name set) as NETWORK_ERROR', () => {
    expect(
      classifyProviderError(new APIConnectionError('Connection error.')),
    ).toBe(AIServiceErrorTypes.NETWORK_ERROR);
  });

  it('classifies an SDK APIConnectionTimeoutError instance as NETWORK_ERROR', () => {
    expect(
      classifyProviderError(
        new APIConnectionTimeoutError('Request timed out.'),
      ),
    ).toBe(AIServiceErrorTypes.NETWORK_ERROR);
  });

  it.each([
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
  ])('classifies error.code %s as NETWORK_ERROR', (code) => {
    expect(classifyProviderError(sdkError({ code }))).toBe(
      AIServiceErrorTypes.NETWORK_ERROR,
    );
  });

  it('classifies a fetch failure whose cause.code is a socket code as NETWORK_ERROR', () => {
    const error = sdkError(
      { name: 'TypeError', cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } },
      'fetch failed',
    );

    expect(classifyProviderError(error)).toBe(
      AIServiceErrorTypes.NETWORK_ERROR,
    );
  });

  it('classifies an unknown error.code as API_ERROR', () => {
    expect(classifyProviderError(sdkError({ code: 'ERR_SOMETHING' }))).toBe(
      AIServiceErrorTypes.API_ERROR,
    );
  });

  it.each([
    'Rate limit exceeded (429)',
    'Unauthorized (401)',
    'Network timeout occurred',
  ])(
    'classifies a status-less error with message "%s" as API_ERROR',
    (message) => {
      expect(classifyProviderError(new Error(message))).toBe(
        AIServiceErrorTypes.API_ERROR,
      );
    },
  );

  it('classifies a plain string as API_ERROR', () => {
    expect(classifyProviderError('rate limit 429 unauthorized')).toBe(
      AIServiceErrorTypes.API_ERROR,
    );
  });

  it('classifies null as API_ERROR', () => {
    expect(classifyProviderError(null)).toBe(AIServiceErrorTypes.API_ERROR);
  });
});
