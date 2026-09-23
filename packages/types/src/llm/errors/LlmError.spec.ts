import { isDomainError, isInternalError, isUpstreamError } from '../../errors';
import { LlmError } from './LlmError';

describe('LlmError', () => {
  const error = new LlmError(
    'invalid_input',
    'model_listing_unsupported',
    { organizationId: 'org-1', provider: 'openai' },
    'This provider does not support listing models',
  );

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is not an internal error', () => {
    expect(isInternalError(error)).toBe(false);
  });

  it('is not an upstream error', () => {
    expect(isUpstreamError(error)).toBe(false);
  });

  it('is an Error', () => {
    expect(error).toBeInstanceOf(Error);
  });

  it('answers its own kind', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('model_listing_unsupported');
  });

  it('keeps the ids in the context', () => {
    expect(error.context).toEqual({
      organizationId: 'org-1',
      provider: 'openai',
    });
  });

  it('keeps the message', () => {
    expect(error.message).toBe('This provider does not support listing models');
  });

  it('names itself', () => {
    expect(error.name).toBe('LlmError');
  });
});
