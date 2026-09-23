import { isDomainError, isInternalError } from '@packmind/types';
import { CommandsError } from './CommandsError';
import { CommandSlugAlreadyExistsError } from './CommandSlugAlreadyExistsError';
import { CommandSpaceNotAccessibleError } from './CommandSpaceNotAccessibleError';
import { CommandNotFoundError } from './CommandNotFoundError';

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

describe('CommandSpaceNotAccessibleError', () => {
  const error = new CommandSpaceNotAccessibleError('space-1', 'org-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is a commands error', () => {
    expect(error).toBeInstanceOf(CommandsError);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('space_not_accessible');
  });

  it('keeps the space and organization in the context', () => {
    expect(error.context).toEqual({
      spaceId: 'space-1',
      organizationId: 'org-1',
    });
  });

  describe('when no organization is given', () => {
    it('leaves the organization out of the context', () => {
      expect(new CommandSpaceNotAccessibleError('space-1').context).toEqual({
        spaceId: 'space-1',
      });
    });
  });

  it('names itself', () => {
    expect(error.name).toBe('CommandSpaceNotAccessibleError');
  });

  it('does not leak the ids in the message', () => {
    expect(error.message).toBe(
      'This space does not exist, or you do not have access to it.',
    );
  });
});

describe('CommandNotFoundError', () => {
  const error = new CommandNotFoundError('command-1', 'space-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is a commands error', () => {
    expect(error).toBeInstanceOf(CommandsError);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('command_not_found');
  });

  it('keeps the command and space in the context', () => {
    expect(error.context).toEqual({
      commandId: 'command-1',
      spaceId: 'space-1',
    });
  });

  describe('when no space is given', () => {
    it('leaves the space out of the context', () => {
      expect(new CommandNotFoundError('command-1').context).toEqual({
        commandId: 'command-1',
      });
    });
  });

  it('names itself', () => {
    expect(error.name).toBe('CommandNotFoundError');
  });

  it('does not leak the ids in the message', () => {
    expect(error.message).toBe(
      'This command does not exist, or you do not have access to it.',
    );
  });
});
