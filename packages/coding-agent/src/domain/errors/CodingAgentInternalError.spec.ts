import { isDomainError, isInternalError } from '@packmind/types';
import { CodingAgentInternalError } from './CodingAgentInternalError';
import { DeployerNotCreatedError } from './DeployerNotCreatedError';
import { CodingAgentAdapterPortsMissingError } from './CodingAgentAdapterPortsMissingError';

describe('CodingAgentInternalError', () => {
  const error = new CodingAgentInternalError(
    'deployer_not_created',
    { codingAgent: 'my-agent' },
    'Failed to create deployer for agent: my-agent',
  );

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('deployer_not_created');
  });

  it('keeps the ids in the context', () => {
    expect(error.context).toEqual({ codingAgent: 'my-agent' });
  });
});

describe('DeployerNotCreatedError', () => {
  const error = new DeployerNotCreatedError('my-agent');

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('is a coding agent internal error', () => {
    expect(error).toBeInstanceOf(CodingAgentInternalError);
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('deployer_not_created');
  });

  it('keeps the agent in the context', () => {
    expect(error.context).toEqual({
      codingAgent: 'my-agent',
    });
  });

  it('names itself', () => {
    expect(error.name).toBe('DeployerNotCreatedError');
  });
});

describe('CodingAgentAdapterPortsMissingError', () => {
  const error = new CodingAgentAdapterPortsMissingError([
    'IStandardsPort',
    'IGitPort',
  ]);

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('is a coding agent internal error', () => {
    expect(error).toBeInstanceOf(CodingAgentInternalError);
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('adapter_ports_missing');
  });

  it('keeps the missing ports in the context', () => {
    expect(error.context).toEqual({
      missingPorts: ['IStandardsPort', 'IGitPort'],
    });
  });

  it('names itself', () => {
    expect(error.name).toBe('CodingAgentAdapterPortsMissingError');
  });
});
