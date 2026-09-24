import { isDomainError, isInternalError } from '@packmind/types';
import { SpacesError } from './SpacesError';
import { SpaceNotFoundError } from './SpaceNotFoundError';
import { SpaceSlugConflictError } from './SpaceSlugConflictError';
import { MemberNotFoundError } from './MemberNotFoundError';
import { CannotRemoveSelfError } from './CannotRemoveSelfError';
import { CannotRemoveFromDefaultSpaceError } from './CannotRemoveFromDefaultSpaceError';
import { CannotUpdateOwnRoleError } from './CannotUpdateOwnRoleError';
import { InvalidSpaceNameError } from './InvalidSpaceNameError';

describe('SpacesError', () => {
  const error = new SpacesError(
    'conflict',
    'space_slug_conflict',
    { spaceName: 'my-space', organizationId: 'org-1' },
    'A space named "my-space" already exists in this organization.',
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
    expect(error.reason).toBe('space_slug_conflict');
  });

  it('keeps the ids in the context', () => {
    expect(error.context).toEqual({
      spaceName: 'my-space',
      organizationId: 'org-1',
    });
  });
});

describe('SpaceNotFoundError', () => {
  const error = new SpaceNotFoundError('space-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is not an internal error', () => {
    expect(isInternalError(error)).toBe(false);
  });

  it('is a spaces error', () => {
    expect(error).toBeInstanceOf(SpacesError);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('space_not_found');
  });

  it('keeps the space id in the context', () => {
    expect(error.context).toEqual({
      spaceIdOrSlug: 'space-1',
    });
  });

  it('names itself', () => {
    expect(error.name).toBe('SpaceNotFoundError');
  });

  it('does not leak the id in the message', () => {
    expect(error.message).toBe(
      'This space does not exist, or you do not have access to it.',
    );
  });
});

describe('SpaceSlugConflictError', () => {
  const error = new SpaceSlugConflictError('my-space', 'org-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is a spaces error', () => {
    expect(error).toBeInstanceOf(SpacesError);
  });

  it('answers conflict', () => {
    expect(error.kind).toBe('conflict');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('space_slug_conflict');
  });

  it('keeps the space name and organization in the context', () => {
    expect(error.context).toEqual({
      spaceName: 'my-space',
      organizationId: 'org-1',
    });
  });

  it('names itself', () => {
    expect(error.name).toBe('SpaceSlugConflictError');
  });

  it('keeps the space name in the message', () => {
    expect(error.message).toContain('my-space');
  });

  it('does not leak the organization id in the message', () => {
    expect(error.message).not.toContain('org-1');
  });
});

describe('MemberNotFoundError', () => {
  const error = new MemberNotFoundError('user-1', 'space-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is a spaces error', () => {
    expect(error).toBeInstanceOf(SpacesError);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('space_member_not_found');
  });

  it('keeps the user and space in the context', () => {
    expect(error.context).toEqual({
      userId: 'user-1',
      spaceId: 'space-1',
    });
  });

  it('names itself', () => {
    expect(error.name).toBe('MemberNotFoundError');
  });

  it('does not leak the ids in the message', () => {
    expect(error.message).toBe(
      'This member does not exist in this space, or you do not have access to it.',
    );
  });
});

describe('CannotRemoveSelfError', () => {
  const error = new CannotRemoveSelfError('user-1', 'space-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is a spaces error', () => {
    expect(error).toBeInstanceOf(SpacesError);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('cannot_remove_self');
  });

  it('keeps the user and space in the context', () => {
    expect(error.context).toEqual({
      userId: 'user-1',
      spaceId: 'space-1',
    });
  });

  it('names itself', () => {
    expect(error.name).toBe('CannotRemoveSelfError');
  });

  it('does not leak the ids in the message', () => {
    expect(error.message).toBe('You cannot remove yourself from a space.');
  });
});

describe('CannotRemoveFromDefaultSpaceError', () => {
  const error = new CannotRemoveFromDefaultSpaceError('space-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is a spaces error', () => {
    expect(error).toBeInstanceOf(SpacesError);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('cannot_remove_from_default_space');
  });

  it('keeps the space in the context', () => {
    expect(error.context).toEqual({
      spaceId: 'space-1',
    });
  });

  it('names itself', () => {
    expect(error.name).toBe('CannotRemoveFromDefaultSpaceError');
  });

  it('does not leak the id in the message', () => {
    expect(error.message).toBe(
      'Members cannot be removed from the default space.',
    );
  });
});

describe('CannotUpdateOwnRoleError', () => {
  const error = new CannotUpdateOwnRoleError('user-1', 'space-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is a spaces error', () => {
    expect(error).toBeInstanceOf(SpacesError);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('cannot_update_own_role');
  });

  it('keeps the user and space in the context', () => {
    expect(error.context).toEqual({
      userId: 'user-1',
      spaceId: 'space-1',
    });
  });

  it('names itself', () => {
    expect(error.name).toBe('CannotUpdateOwnRoleError');
  });

  it('does not leak the ids in the message', () => {
    expect(error.message).toBe('You cannot update your own role.');
  });
});

describe('InvalidSpaceNameError', () => {
  const error = new InvalidSpaceNameError('Space name must not be empty');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('is a spaces error', () => {
    expect(error).toBeInstanceOf(SpacesError);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('invalid_space_name');
  });

  it('carries an empty context', () => {
    expect(error.context).toEqual({});
  });

  it('names itself', () => {
    expect(error.name).toBe('InvalidSpaceNameError');
  });

  it('keeps the detail in the message', () => {
    expect(error.message).toContain('Space name must not be empty');
  });
});
