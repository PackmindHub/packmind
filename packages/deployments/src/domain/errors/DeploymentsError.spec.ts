import { isDomainError, isInternalError } from '@packmind/types';
import { ArtefactNotInSpaceError } from './ArtefactNotInSpaceError';
import { ArtifactVersionNotFoundError } from './ArtifactVersionNotFoundError';
import { NoFileUpdatesResolvedError } from './NoFileUpdatesResolvedError';
import { NoPackageSlugsProvidedError } from './NoPackageSlugsProvidedError';
import { NoPackagesProvidedError } from './NoPackagesProvidedError';
import { NoTargetsProvidedError } from './NoTargetsProvidedError';
import { DefaultSkillIdMissingError } from './DefaultSkillIdMissingError';
import {
  AdapterPortsMissingError,
  DelayedJobNotCreatedError,
} from './DeploymentsAdapterErrors';
import { GitRepositoryNotFoundError } from './GitRepositoryNotFoundError';
import { InvalidRenderModeError } from './InvalidRenderModeError';
import { InvalidTargetNameError } from './InvalidTargetNameError';
import { InvalidTargetPathError } from './InvalidTargetPathError';
import { PackageComponentHasNoVersionError } from './PackageComponentHasNoVersionError';
import { PackageNotFoundError } from './PackageNotFoundError';
import { PackageReleaseNotFoundError } from './PackageReleaseNotFoundError';
import { PackageSpaceMissingError } from './PackageSpaceMissingError';
import { PackageReleaseNotPersistedError } from './PackageReleaseNotPersistedError';
import { PackageReleaseRefusedError } from './PackageReleaseRefusedError';
import { PackageReloadFailedError } from './PackageReloadFailedError';
import { PackagesNotFoundError } from './PackagesNotFoundError';
import { RenderModeConfigurationMissingError } from './RenderModeConfigurationMissingError';
import { RootTargetNotDeletableError } from './RootTargetNotDeletableError';
import { UnsupportedRenderModeError } from './UnsupportedRenderModeError';
import { SpaceNotAccessibleError } from './SpaceNotAccessibleError';
import { TargetResolutionMissingError } from './TargetResolutionMissingError';
import { TargetNotFoundError } from './TargetNotFoundError';

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

describe('PackagesNotFoundError', () => {
  const error = new PackagesNotFoundError(['alpha', 'beta']);

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('keeps the slugs in the context', () => {
    expect(error.context).toEqual({ slugs: ['alpha', 'beta'] });
  });

  it('still exposes the slugs the API branches on', () => {
    expect(error.unknownSlugs).toEqual(['alpha', 'beta']);
  });

  describe('when a single slug is unknown', () => {
    it('reads in the singular', () => {
      expect(new PackagesNotFoundError(['alpha']).message).toBe(
        'Package "alpha" was not found',
      );
    });
  });
});

describe('NoPackageSlugsProvidedError', () => {
  const error = new NoPackageSlugsProvidedError();

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers invalid_input, since it does not depend on stored state', () => {
    expect(error.kind).toBe('invalid_input');
  });
});

describe('TargetNotFoundError', () => {
  const error = new TargetNotFoundError('target-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('keeps the target in the context', () => {
    expect(error.context).toEqual({ targetId: 'target-1' });
  });
});

describe('PackageReleaseNotFoundError', () => {
  const error = new PackageReleaseNotFoundError('pkg-1', '1.2.0');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('keeps the package and the version in the context', () => {
    expect(error.context).toEqual({ packageId: 'pkg-1', version: '1.2.0' });
  });
});

describe('PackageReleaseRefusedError', () => {
  const error = new PackageReleaseRefusedError('no_components', '1.0.0');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers conflict, since the stored state is what refuses the cut', () => {
    expect(error.kind).toBe('conflict');
  });

  it('still exposes the refusal code the frontend branches on', () => {
    expect(error.code).toBe('no_components');
  });

  it('still exposes the current version the frontend names', () => {
    expect(error.currentVersion).toBe('1.0.0');
  });
});

describe('PackageReleaseNotPersistedError', () => {
  const error = new PackageReleaseNotPersistedError('pkg-1', '1.2.0');

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error, so it is never answered as a 4xx', () => {
    expect(isDomainError(error)).toBe(false);
  });

  describe('when compared with the release that was never cut', () => {
    it('is told apart from PackageReleaseNotFoundError', () => {
      expect(error).not.toBeInstanceOf(PackageReleaseNotFoundError);
    });
  });
});

describe('PackageComponentHasNoVersionError', () => {
  const error = new PackageComponentHasNoVersionError('skill', 'skill-1');

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error, so it is never answered as a 4xx', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('keeps the component in the context', () => {
    expect(error.context).toEqual({ family: 'skill', componentId: 'skill-1' });
  });
});

describe('InvalidTargetNameError', () => {
  const error = new InvalidTargetNameError();

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers invalid_input, since it does not depend on stored state', () => {
    expect(error.kind).toBe('invalid_input');
  });
});

describe('InvalidTargetPathError', () => {
  const error = new InvalidTargetPathError('/../etc');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('keeps the rejected path in the context', () => {
    expect(error.context).toEqual({ path: '/../etc' });
  });

  describe('when the path tried to climb out of the repository', () => {
    it('reads exactly like a path that was merely malformed', () => {
      expect(error.message).toBe(new InvalidTargetPathError('nope').message);
    });
  });
});

describe('GitRepositoryNotFoundError', () => {
  const error = new GitRepositoryNotFoundError('repo-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers not_found', () => {
    expect(error.kind).toBe('not_found');
  });

  it('keeps the repository in the context', () => {
    expect(error.context).toEqual({ gitRepoId: 'repo-1' });
  });
});

describe('RootTargetNotDeletableError', () => {
  const error = new RootTargetNotDeletableError('target-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers conflict, since it is the target role that rules it out', () => {
    expect(error.kind).toBe('conflict');
  });

  it('keeps the target in the context', () => {
    expect(error.context).toEqual({ targetId: 'target-1' });
  });
});

describe.each([
  ['NoTargetsProvidedError', new NoTargetsProvidedError()],
  ['NoPackagesProvidedError', new NoPackagesProvidedError()],
] as const)('%s', (_name, error) => {
  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers invalid_input, since it does not depend on stored state', () => {
    expect(error.kind).toBe('invalid_input');
  });
});

describe('PackageSpaceMissingError', () => {
  const error = new PackageSpaceMissingError('pkg-1', 'space-1');

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error, so a dangling reference is never a 404', () => {
    expect(isDomainError(error)).toBe(false);
  });

  it('keeps both ends of the dangling reference in the context', () => {
    expect(error.context).toEqual({ packageId: 'pkg-1', spaceId: 'space-1' });
  });
});

describe('NoFileUpdatesResolvedError', () => {
  const error = new NoFileUpdatesResolvedError('pkg-1');

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('keeps the package in the context', () => {
    expect(error.context).toEqual({ packageId: 'pkg-1' });
  });

  describe('when raised from a path with no package in hand', () => {
    it('carries an empty context rather than an undefined id', () => {
      expect(new NoFileUpdatesResolvedError().context).toEqual({});
    });
  });
});

describe('TargetResolutionMissingError', () => {
  const error = new TargetResolutionMissingError('removal_data', 'target-1');

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('names which resolution dropped the target in the context', () => {
    expect(error.context).toEqual({
      targetId: 'target-1',
      stage: 'removal_data',
    });
  });

  describe('when the artifact resolution is the one that dropped it', () => {
    it('reads differently, so the log says where the two diverged', () => {
      expect(
        new TargetResolutionMissingError('artifact_resolution', 'target-1')
          .message,
      ).not.toBe(error.message);
    });
  });
});

describe('InvalidRenderModeError', () => {
  const error = new InvalidRenderModeError('NOPE');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers invalid_input', () => {
    expect(error.kind).toBe('invalid_input');
  });

  it('names the mode back, since the caller is the one who supplied it', () => {
    expect(error.message).toContain('NOPE');
  });
});

describe('UnsupportedRenderModeError', () => {
  const error = new UnsupportedRenderModeError('NOPE');

  it('is an internal error, since the argument is typed as a RenderMode', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error, so a gap in our table is never a 400', () => {
    expect(isDomainError(error)).toBe(false);
  });
});

describe('RenderModeConfigurationMissingError', () => {
  const error = new RenderModeConfigurationMissingError('org-1');

  it('is an internal error, since the use case creates what it cannot read', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('keeps the organization in the context', () => {
    expect(error.context).toEqual({ organizationId: 'org-1' });
  });
});

describe('DefaultSkillIdMissingError', () => {
  const error = new DefaultSkillIdMissingError('some-skill');

  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('keeps the slug in the context', () => {
    expect(error.context).toEqual({ slug: 'some-skill' });
  });
});

describe.each([
  ['AdapterPortsMissingError', new AdapterPortsMissingError()],
  ['DelayedJobNotCreatedError', new DelayedJobNotCreatedError()],
] as const)('%s', (_name, error) => {
  it('is an internal error', () => {
    expect(isInternalError(error)).toBe(true);
  });

  it('is not a domain error, so a wiring fault is never a 4xx', () => {
    expect(isDomainError(error)).toBe(false);
  });
});

describe('ArtifactVersionNotFoundError', () => {
  const error = new ArtifactVersionNotFoundError('Skill', 'skv-1');

  it('is a domain error', () => {
    expect(isDomainError(error)).toBe(true);
  });

  it('answers not_found rather than the 500 a stale lockfile used to get', () => {
    expect(error.kind).toBe('not_found');
  });

  it('keeps the version and its family in the context', () => {
    expect(error.context).toEqual({
      artifactLabel: 'Skill',
      versionId: 'skv-1',
    });
  });
});
