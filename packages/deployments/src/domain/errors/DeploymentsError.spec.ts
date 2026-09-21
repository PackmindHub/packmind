import { isDomainError, isInternalError } from '@packmind/types';
import { ArtefactNotInSpaceError } from './ArtefactNotInSpaceError';
import { PackageNotFoundError } from './PackageNotFoundError';
import { PackageReloadFailedError } from './PackageReloadFailedError';
import { SpaceNotAccessibleError } from './SpaceNotAccessibleError';

describe('SpaceNotAccessibleError', () => {
  const error = new SpaceNotAccessibleError('space-1', 'org-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('keeps the organization in the context', () => {
    expect(error.context).toEqual({
      spaceId: 'space-1',
      organizationId: 'org-1',
    });
  });

  it('names neither the space nor the organization in the message', () => {
    expect(error.message).toBe(
      'This space does not exist, or you do not have access to it.',
    );
  });

  describe('when the space belongs to another organization', () => {
    it('reads exactly like a space that was never there', () => {
      expect(new SpaceNotAccessibleError('space-1', 'org-2').message).toBe(
        new SpaceNotAccessibleError('space-1').message,
      );
    });
  });
});

describe('PackageNotFoundError', () => {
  const error = new PackageNotFoundError('pkg-1', 'space-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('keeps the space it was looked up in within the context', () => {
    expect(error.context).toEqual({ packageId: 'pkg-1', spaceId: 'space-1' });
  });

  describe('when the package lives in another space', () => {
    it('reads exactly like a package that was never there', () => {
      expect(error.message).toBe(new PackageNotFoundError('pkg-1').message);
    });
  });

  describe('when narrowed with instanceof', () => {
    it('is still recognised through the base class', () => {
      expect(error).toBeInstanceOf(PackageNotFoundError);
    });
  });
});

describe('ArtefactNotInSpaceError', () => {
  const error = new ArtefactNotInSpaceError('skill', 'skill-1', 'space-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('names the artefact type in the message', () => {
    expect(error.message).toBe(
      'Skill with id "skill-1" was not found in this space.',
    );
  });

  it('keeps the artefact and the space in the context', () => {
    expect(error.context).toEqual({
      artefactType: 'skill',
      artefactId: 'skill-1',
      spaceId: 'space-1',
    });
  });

  describe.each(['command', 'standard', 'skill'] as const)(
    'when the artefact is a %s',
    (artefactType) => {
      it('never names the space it does live in', () => {
        expect(
          new ArtefactNotInSpaceError(artefactType, 'a-1', 'space-1').message,
        ).not.toContain('space-1');
      });
    },
  );
});

describe('PackageReloadFailedError', () => {
  const error = new PackageReloadFailedError('pkg-1');

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error, so it is never answered as a 4xx', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('keeps the package in the context', () => {
    expect(error.context).toEqual({ packageId: 'pkg-1' });
  });
});
