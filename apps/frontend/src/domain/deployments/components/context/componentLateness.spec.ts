import {
  createGitRepoId,
  createPackageId,
  createStandardId,
  createTargetId,
} from '@packmind/types';
import type {
  ArtifactDrift,
  InstallLocation,
  PackageDrift,
  RepoInstall,
} from '../redesign/types';
import { componentLateness } from './componentLateness';

function install(
  repoId: string,
  targetId: string,
  driftReason: RepoInstall['driftReason'],
): RepoInstall {
  return {
    repo: { id: createGitRepoId(repoId), owner: 'acme', name: repoId },
    target: { id: createTargetId(targetId), name: 'root', isDefault: true },
    branch: 'main',
    deployedVersion: 1,
    lastDeployedAt: '2026-09-01T10:00:00.000Z',
    driftReason,
  } as RepoInstall;
}

function artifact(
  id: string,
  kind: ArtifactDrift['kind'],
  installs: RepoInstall[],
): ArtifactDrift {
  return {
    id: createStandardId(id),
    kind,
    name: id,
    packmindVersion: 5,
    isDeleted: false,
    isPending: false,
    installs,
  } as unknown as ArtifactDrift;
}

function location(repoId: string, targetId: string): InstallLocation {
  return {
    repo: { id: createGitRepoId(repoId), owner: 'acme', name: repoId },
    target: { id: createTargetId(targetId), name: 'root', isDefault: true },
    branch: 'main',
    lastDistributionStatus: null,
    lastDistributedAt: null,
  } as InstallLocation;
}

function drift(artifacts: ArtifactDrift[], locations: InstallLocation[]) {
  return {
    id: createPackageId('pkg-1'),
    name: 'Package',
    description: '',
    artifacts,
    installLocations: locations,
  } as PackageDrift;
}

describe('componentLateness', () => {
  describe('when the package has never been distributed', () => {
    it('counts nothing', () => {
      expect(componentLateness(null).size).toBe(0);
    });
  });

  it('counts one landing per place a component is behind', () => {
    const counts = componentLateness(
      drift(
        [
          artifact('std-1', 'standard', [
            install('repo-a', 'target-1', 'behind'),
            install('repo-b', 'target-1', 'behind'),
          ]),
        ],
        [location('repo-a', 'target-1'), location('repo-b', 'target-1')],
      ),
    );

    expect(counts.get('standard:std-1')).toBe(2);
  });

  describe('when a component is aligned everywhere', () => {
    it('leaves it out rather than counting zero', () => {
      const counts = componentLateness(
        drift(
          [
            artifact('std-1', 'standard', [
              install('repo-a', 'target-1', 'aligned'),
            ]),
          ],
          [location('repo-a', 'target-1')],
        ),
      );

      expect(counts.has('standard:std-1')).toBe(false);
    });
  });

  /*
   * The two kinds share an id space, so a map on the id alone would report one
   * row's drift on the other.
   */
  it('tells two kinds carrying the same id apart', () => {
    const counts = componentLateness(
      drift(
        [
          artifact('same-id', 'standard', [
            install('repo-a', 'target-1', 'behind'),
          ]),
          artifact('same-id', 'skill', [
            install('repo-a', 'target-1', 'behind'),
            install('repo-b', 'target-1', 'behind'),
          ]),
        ],
        [location('repo-a', 'target-1'), location('repo-b', 'target-1')],
      ),
    );

    expect(counts.get('standard:same-id')).toBe(1);
    expect(counts.get('skill:same-id')).toBe(2);
  });

  /*
   * Two landings of one repository are two places, not one: a push acts on one
   * of them at a time, which is the grain the destination list works in too.
   */
  it('counts two landings of one repository twice', () => {
    const counts = componentLateness(
      drift(
        [
          artifact('std-1', 'standard', [
            install('repo-a', 'target-1', 'behind'),
            install('repo-a', 'target-2', 'behind'),
          ]),
        ],
        [location('repo-a', 'target-1'), location('repo-a', 'target-2')],
      ),
    );

    expect(counts.get('standard:std-1')).toBe(2);
  });
});
