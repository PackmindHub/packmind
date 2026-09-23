import {
  isDomainError,
  isInternalError,
  LlmInternalError,
} from '@packmind/types';
import { PackmindProviderApiKeyMissingError } from './PackmindProviderApiKeyMissingError';

describe('PackmindProviderApiKeyMissingError', () => {
  const error = new PackmindProviderApiKeyMissingError(
    'openai',
    'OPENAI_API_KEY',
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
    expect(error.reason).toBe('packmind_provider_api_key_missing');
  });

  it('keeps the provider and config key in the context', () => {
    expect(error.context).toEqual({
      provider: 'openai',
      configKey: 'OPENAI_API_KEY',
    });
  });

  it('names the config key in the message', () => {
    expect(error.message).toBe('OPENAI_API_KEY not found in configuration');
  });

  it('names itself', () => {
    expect(error.name).toBe('PackmindProviderApiKeyMissingError');
  });
});
