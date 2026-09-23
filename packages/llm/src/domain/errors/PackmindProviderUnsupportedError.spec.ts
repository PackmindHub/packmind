import {
  isDomainError,
  isInternalError,
  LlmInternalError,
} from '@packmind/types';
import { PackmindProviderUnsupportedError } from './PackmindProviderUnsupportedError';

describe('PackmindProviderUnsupportedError', () => {
  const error = new PackmindProviderUnsupportedError(
    'packmind',
    'Cannot use PACKMIND as underlying provider',
  );

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
    expect(error.reason).toBe('packmind_provider_unsupported');
  });

  it('keeps the provider in the context', () => {
    expect(error.context).toEqual({ provider: 'packmind' });
  });

  it('keeps the message', () => {
    expect(error.message).toBe('Cannot use PACKMIND as underlying provider');
  });

  it('names itself', () => {
    expect(error.name).toBe('PackmindProviderUnsupportedError');
  });
});
