import {
  isDomainError,
  isInternalError,
  LlmInternalError,
} from '@packmind/types';
import { UnknownLlmProviderError } from './UnknownLlmProviderError';

describe('UnknownLlmProviderError', () => {
  const error = new UnknownLlmProviderError('unknown');

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('is an llm internal error', () => {
    expect(error).toBeInstanceOf(LlmInternalError);
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('unknown_llm_provider');
  });

  it('keeps the provider in the context', () => {
    expect(error.context).toEqual({ provider: 'unknown' });
  });

  it('names the provider in the message', () => {
    expect(error.message).toContain('unknown');
  });

  it('names itself', () => {
    expect(error.name).toBe('UnknownLlmProviderError');
  });
});
