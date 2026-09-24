import { isDomainError, isInternalError } from '@packmind/types';
import { SpacesInternalError } from './SpacesInternalError';
import { DefaultSpaceNotFoundError } from './DefaultSpaceNotFoundError';

describe('SpacesInternalError', () => {
  const error = new SpacesInternalError(
    'default_space_missing',
    { organizationId: 'org-1' },
    'No default space found for organization org-1',
  );

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('default_space_missing');
  });

  it('keeps the ids in the context', () => {
    expect(error.context).toEqual({ organizationId: 'org-1' });
  });
});

describe('DefaultSpaceNotFoundError', () => {
  const error = new DefaultSpaceNotFoundError('org-1');

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('is a spaces internal error', () => {
    expect(error).toBeInstanceOf(SpacesInternalError);
  });

  it('answers its own reason', () => {
    expect(error.reason).toBe('default_space_missing');
  });

  it('keeps the organization in the context', () => {
    expect(error.context).toEqual({
      organizationId: 'org-1',
    });
  });

  it('names itself', () => {
    expect(error.name).toBe('DefaultSpaceNotFoundError');
  });
});
