import { isDomainError, isInternalError } from '@packmind/types';
import { CommandsInternalError } from './CommandsInternalError';
import { CommandsAdapterPortsMissingError } from './CommandsAdapterPortsMissingError';
import {
  DeployCommandsDelayedJobNotCreatedError,
  DeployCommandsQueueNotInitializedError,
} from './DeployCommandsQueueErrors';

describe('CommandsInternalError', () => {
  const error = new CommandsInternalError(
    'commands_adapter_ports_missing',
    { missingPorts: ['IGitPort'] },
    'CommandsAdapter: Required ports/delayed jobs not provided: IGitPort.',
  );

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('commands_adapter_ports_missing');
  });

  it('keeps the ids in the context', () => {
    expect(error.context).toEqual({ missingPorts: ['IGitPort'] });
  });
});

describe('CommandsAdapterPortsMissingError', () => {
  const error = new CommandsAdapterPortsMissingError([
    'IGitPort',
    'commandsDelayedJobs',
  ]);

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('is a commands internal error', () => {
    expect(error).toBeInstanceOf(CommandsInternalError);
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('commands_adapter_ports_missing');
  });

  it('keeps the missing ports in the context', () => {
    expect(error.context).toEqual({
      missingPorts: ['IGitPort', 'commandsDelayedJobs'],
    });
  });

  it('names the missing ports in the message', () => {
    expect(error.message).toContain('IGitPort, commandsDelayedJobs');
  });

  it('names itself', () => {
    expect(error.name).toBe('CommandsAdapterPortsMissingError');
  });
});

describe('DeployCommandsQueueNotInitializedError', () => {
  const error = new DeployCommandsQueueNotInitializedError();

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('is a commands internal error', () => {
    expect(error).toBeInstanceOf(CommandsInternalError);
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('deploy_commands_queue_not_initialized');
  });

  it('carries an empty context', () => {
    expect(error.context).toEqual({});
  });

  it('names itself', () => {
    expect(error.name).toBe('DeployCommandsQueueNotInitializedError');
  });
});

describe('DeployCommandsDelayedJobNotCreatedError', () => {
  const error = new DeployCommandsDelayedJobNotCreatedError();

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('is a commands internal error', () => {
    expect(error).toBeInstanceOf(CommandsInternalError);
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('deploy_commands_delayed_job_not_created');
  });

  it('carries an empty context', () => {
    expect(error.context).toEqual({});
  });

  it('names itself', () => {
    expect(error.name).toBe('DeployCommandsDelayedJobNotCreatedError');
  });
});
