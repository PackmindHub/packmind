import { isDomainError, isInternalError } from '@packmind/types';
import { CodingAgentError } from './CodingAgentError';
import { UnknownCodingAgentError } from './UnknownCodingAgentError';

describe('CodingAgentError', () => {
  const error = new CodingAgentError(
    'invalid_input',
    'unknown_coding_agent',
    { codingAgent: 'my-agent' },
    'Unknown coding agent: "my-agent".',
  );

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is not an internal error', () => {
    expect(isInternalError(error)).toBe(false);
  });

  it('answers its own kind', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('unknown_coding_agent');
  });

  it('keeps the ids in the context', () => {
    expect(error.context).toEqual({
      codingAgent: 'my-agent',
    });
  });
});

describe('UnknownCodingAgentError', () => {
  const error = new UnknownCodingAgentError('my-agent');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is not an internal error', () => {
    expect(isInternalError(error)).toBe(false);
  });

  it('is a coding agent error', () => {
    expect(error).toBeInstanceOf(CodingAgentError);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('unknown_coding_agent');
  });

  it('keeps the agent in the context', () => {
    expect(error.context).toEqual({
      codingAgent: 'my-agent',
    });
  });

  it('names itself', () => {
    expect(error.name).toBe('UnknownCodingAgentError');
  });

  it('keeps the agent name in the message', () => {
    expect(error.message).toContain('my-agent');
  });
});
