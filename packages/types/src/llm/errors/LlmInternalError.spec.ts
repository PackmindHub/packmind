import { isDomainError, isInternalError, isUpstreamError } from '../../errors';
import { LlmInternalError } from './LlmInternalError';

describe('LlmInternalError', () => {
  const error = new LlmInternalError(
    'llm_adapter_ports_missing',
    { missingPorts: ['ILlmPort'] },
    'LlmAdapter: Required ports not provided: ILlmPort.',
  );

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('is not an upstream error', () => {
    expect(isUpstreamError(error)).toBe(false);
  });

  it('is an Error', () => {
    expect(error).toBeInstanceOf(Error);
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('llm_adapter_ports_missing');
  });

  it('keeps the ids in the context', () => {
    expect(error.context).toEqual({ missingPorts: ['ILlmPort'] });
  });

  it('keeps the message', () => {
    expect(error.message).toBe(
      'LlmAdapter: Required ports not provided: ILlmPort.',
    );
  });

  it('names itself', () => {
    expect(error.name).toBe('LlmInternalError');
  });
});
