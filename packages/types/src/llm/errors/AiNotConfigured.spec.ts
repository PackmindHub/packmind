import { isDomainError, isInternalError, isUpstreamError } from '../../errors';
import { AiNotConfigured } from './AiNotConfigured';
import { LlmError } from './LlmError';

describe('AiNotConfigured', () => {
  const error = new AiNotConfigured(undefined, { organizationId: 'org-1' });

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is not an internal error', () => {
    expect(isInternalError(error)).toBe(false);
  });

  it('is not an upstream error', () => {
    expect(isUpstreamError(error)).toBe(false);
  });

  it('is an llm error', () => {
    expect(error).toBeInstanceOf(LlmError);
  });

  it('is an Error', () => {
    expect(error).toBeInstanceOf(Error);
  });

  it('answers invalid_input, since an admin can correct the configuration', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('ai_not_configured');
  });

  it('keeps the ids in the context', () => {
    expect(error.context).toEqual({ organizationId: 'org-1' });
  });

  it('names itself', () => {
    expect(error.name).toBe('AiNotConfigured');
  });

  describe('when no message or context is given', () => {
    it('defaults the message', () => {
      expect(new AiNotConfigured().message).toBe(
        'AI service is not configured',
      );
    });

    it('defaults the context to an empty object', () => {
      expect(new AiNotConfigured().context).toEqual({});
    });
  });

  describe('when a message is given', () => {
    it('keeps it', () => {
      expect(new AiNotConfigured('custom message').message).toBe(
        'custom message',
      );
    });
  });
});
