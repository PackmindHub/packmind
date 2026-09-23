import {
  isDomainError,
  isInternalError,
  LlmInternalError,
} from '@packmind/types';
import { LlmAdapterPortsMissingError } from './LlmAdapterPortsMissingError';

describe('LlmAdapterPortsMissingError', () => {
  const error = new LlmAdapterPortsMissingError(['IAccountsPort']);

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
    expect(error.reason).toBe('llm_adapter_ports_missing');
  });

  it('keeps the missing ports in the context', () => {
    expect(error.context).toEqual({ missingPorts: ['IAccountsPort'] });
  });

  it('names the missing ports in the message', () => {
    expect(error.message).toContain('IAccountsPort');
  });

  it('names itself', () => {
    expect(error.name).toBe('LlmAdapterPortsMissingError');
  });
});
