import { isDomainError, isInternalError } from '@packmind/types';
import { CommandsError } from './CommandsError';
import { CommandSlugAlreadyExistsError } from './CommandSlugAlreadyExistsError';

describe('CommandsError', () => {
  const error = new CommandsError(
    'conflict',
    'command_slug_already_exists',
    { commandSlug: 'my-command', spaceId: 'space-1' },
    'A command with slug "my-command" already exists in this space',
  );

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is not an internal error', () => {
    expect(isInternalError(error)).toBe(false);
  });

  it('answers its own kind', () => {
    expect(error.kind).toBe('conflict');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('command_slug_already_exists');
  });

  it('keeps the ids in the context', () => {
    expect(error.context).toEqual({
      commandSlug: 'my-command',
      spaceId: 'space-1',
    });
  });
});

describe('CommandSlugAlreadyExistsError', () => {
  const error = new CommandSlugAlreadyExistsError('my-command', 'space-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is not an internal error', () => {
    expect(isInternalError(error)).toBe(false);
  });

  it('is a commands error', () => {
    expect(error).toBeInstanceOf(CommandsError);
  });

  it('answers conflict', () => {
    expect(error.kind).toBe('conflict');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('command_slug_already_exists');
  });

  it('keeps the slug and space in the context', () => {
    expect(error.context).toEqual({
      commandSlug: 'my-command',
      spaceId: 'space-1',
    });
  });

  it('names itself', () => {
    expect(error.name).toBe('CommandSlugAlreadyExistsError');
  });

  it('keeps the slug in the message', () => {
    expect(error.message).toContain('my-command');
  });

  it('does not leak the space id in the message', () => {
    expect(error.message).not.toContain('space-1');
  });
});
