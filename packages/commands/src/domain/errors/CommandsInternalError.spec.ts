import { isDomainError, isInternalError } from '@packmind/types';
import { CommandsInternalError } from './CommandsInternalError';

describe('CommandsInternalError', () => {
  const error = new CommandsInternalError(
    'hexa_dependency_missing',
    { dependency: 'JobsService' },
    'JobsService not found in registry',
  );

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('hexa_dependency_missing');
  });

  it('keeps the ids in the context', () => {
    expect(error.context).toEqual({ dependency: 'JobsService' });
  });
});
