import { isDomainError, isInternalError, LlmError } from '@packmind/types';
import { ModelListingUnsupportedError } from './ModelListingUnsupportedError';

describe('ModelListingUnsupportedError', () => {
  const error = new ModelListingUnsupportedError(
    'azure-openai',
    'Azure OpenAI cannot list its deployments. Configure the deployment names manually from the Azure Portal.',
  );

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is not an internal error', () => {
    expect(isInternalError(error)).toBe(false);
  });

  it('is an llm error', () => {
    expect(error).toBeInstanceOf(LlmError);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('model_listing_unsupported');
  });

  it('keeps the provider in the context', () => {
    expect(error.context).toEqual({ provider: 'azure-openai' });
  });

  it('keeps the message', () => {
    expect(error.message).toBe(
      'Azure OpenAI cannot list its deployments. Configure the deployment names manually from the Azure Portal.',
    );
  });

  it('names itself', () => {
    expect(error.name).toBe('ModelListingUnsupportedError');
  });
});
