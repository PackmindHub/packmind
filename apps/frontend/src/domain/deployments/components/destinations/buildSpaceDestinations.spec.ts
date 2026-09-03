import {
  createGitRepoId,
  createMarketplaceId,
  createTargetId,
  DistributionStatus,
} from '@packmind/types';
import type {
  MarketplaceDrift,
  PackageDrift,
  RepositoryDrift,
} from '../redesign/types';
import {
  buildSpaceDestinations,
  destinationDriftStatus,
  destinationReachSummary,
  isBatchDistributable,
  searchDestinations,
  type Destination,
} from './buildSpaceDestinations';

/**
 * A package landed on one (repo, target): `drifting` installs are what a
 * distribution would fix, `failed` is what the last attempt did.
 */
const landed = (
  name: string,
  repoId: string,
  targetId: string,
  state: 'aligned' | 'drifting' | 'failed' = 'aligned',
): PackageDrift =>
  ({
    name,
    artifacts: [
      {
        installs: [
          {
            repo: { id: createGitRepoId(repoId) },
            target: { id: createTargetId(targetId) },
            driftReason: state === 'aligned' ? 'aligned' : 'behind',
          },
        ],
      },
    ],
    installLocations: [
      {
        repo: { id: createGitRepoId(repoId) },
        target: { id: createTargetId(targetId) },
        lastDistributionStatus:
          state === 'failed'
            ? DistributionStatus.failure
            : DistributionStatus.success,
      },
    ],
  }) as unknown as PackageDrift;

const repository = (
  id: string,
  owner: string,
  name: string,
  packages: PackageDrift[],
  branch = 'main',
): RepositoryDrift =>
  ({
    id: createGitRepoId(id),
    repo: { id: createGitRepoId(id), owner, name },
    branch,
    targets: [
      {
        id: createTargetId(`${id}-root`),
        target: { id: createTargetId(`${id}-root`), name: 'root' },
        packages,
      },
    ],
  }) as unknown as RepositoryDrift;

const marketplace = (
  id: string,
  name: string,
  packageNames: string[],
): MarketplaceDrift =>
  ({
    id: createMarketplaceId(id),
    name,
    plugins: packageNames.map((packageName) => ({
      pluginSlug: packageName.toLowerCase(),
      packageName,
    })),
    publishedPackageNames: packageNames,
  }) as unknown as MarketplaceDrift;

const ALIGNED_REPO = repository('repo-aligned', 'acme', 'docs', [
  landed('Docs', 'repo-aligned', 'repo-aligned-root'),
]);
const DRIFTED_REPO = repository('repo-drift', 'acme', 'webapp', [
  landed('Backend', 'repo-drift', 'repo-drift-root', 'drifting'),
]);
const FAILED_REPO = repository('repo-failed', 'acme', 'api', [
  landed('Backend', 'repo-failed', 'repo-failed-root', 'failed'),
]);
const MARKETPLACE = marketplace('mkt-1', 'Public catalog', ['Frontend']);

describe('buildSpaceDestinations', () => {
  it('holds one row per repository and per marketplace', () => {
    const destinations = buildSpaceDestinations([ALIGNED_REPO], [MARKETPLACE]);

    expect(destinations).toHaveLength(2);
  });

  it('names a repository by owner and name', () => {
    const destinations = buildSpaceDestinations([ALIGNED_REPO], []);

    expect(destinations[0].name).toBe('acme/docs');
  });

  it('names a marketplace by its own name', () => {
    const destinations = buildSpaceDestinations([], [MARKETPLACE]);

    expect(destinations[0].name).toBe('Public catalog');
  });

  it('keeps the two kinds apart in the id, since neither id is readable', () => {
    const destinations = buildSpaceDestinations([ALIGNED_REPO], [MARKETPLACE]);

    expect(destinations.map((destination) => destination.id)).toEqual([
      'r:repo-aligned',
      'm:mkt-1',
    ]);
  });

  it('puts the repositories before the marketplaces', () => {
    const destinations = buildSpaceDestinations([ALIGNED_REPO], [MARKETPLACE]);

    expect(destinations.map((destination) => destination.kind)).toEqual([
      'repository',
      'marketplace',
    ]);
  });

  describe('the order inside the repositories', () => {
    it('puts a failed one first, then a drifting one, then the rest', () => {
      const destinations = buildSpaceDestinations(
        [ALIGNED_REPO, DRIFTED_REPO, FAILED_REPO],
        [],
      );

      expect(destinations.map((destination) => destination.name)).toEqual([
        'acme/api',
        'acme/webapp',
        'acme/docs',
      ]);
    });
  });

  describe('the order inside the marketplaces', () => {
    it('puts the one with the most drifted first', () => {
      const destinations = buildSpaceDestinations(
        [],
        [
          marketplace('mkt-one', 'One drifted', ['A']),
          marketplace('mkt-two', 'Two drifted', ['A', 'B']),
        ],
      );

      expect(destinations.map((destination) => destination.name)).toEqual([
        'Two drifted',
        'One drifted',
      ]);
    });

    it('breaks a tie on the name', () => {
      const destinations = buildSpaceDestinations(
        [],
        [
          marketplace('mkt-z', 'Zeta', ['A']),
          marketplace('mkt-a', 'Alpha', ['A']),
        ],
      );

      expect(destinations.map((destination) => destination.name)).toEqual([
        'Alpha',
        'Zeta',
      ]);
    });
  });

  describe('the counts of a repository', () => {
    it('counts the landings a distribution would align', () => {
      const destinations = buildSpaceDestinations([DRIFTED_REPO], []);

      expect(destinations[0].behind).toBe(1);
    });

    it('counts the landings whose last attempt failed', () => {
      const destinations = buildSpaceDestinations([FAILED_REPO], []);

      expect(destinations[0].failed).toBe(1);
    });

    describe('when everything landed', () => {
      it('leaves both counts at zero', () => {
        const destinations = buildSpaceDestinations([ALIGNED_REPO], []);

        expect([destinations[0].behind, destinations[0].failed]).toEqual([
          0, 0,
        ]);
      });
    });

    it('lists the packages that land there, for the search', () => {
      const destinations = buildSpaceDestinations([DRIFTED_REPO], []);

      expect(destinations[0].packageNames).toEqual(['Backend']);
    });

    it('names a package landing on two targets once', () => {
      const twoTargets = {
        ...repository('repo-two', 'acme', 'mono', []),
        targets: [
          {
            id: createTargetId('t1'),
            target: { id: createTargetId('t1'), name: 'root' },
            packages: [landed('Backend', 'repo-two', 't1')],
          },
          {
            id: createTargetId('t2'),
            target: { id: createTargetId('t2'), name: 'apps/web' },
            packages: [landed('Backend', 'repo-two', 't2')],
          },
        ],
      } as unknown as RepositoryDrift;
      const destinations = buildSpaceDestinations([twoTargets], []);

      expect(destinations[0].packageNames).toEqual(['Backend']);
    });
  });

  describe('the counts of a marketplace', () => {
    it('counts the plugins whose source has moved on', () => {
      const destinations = buildSpaceDestinations([], [MARKETPLACE]);

      expect(destinations[0].behind).toBe(1);
    });

    it('reports no failure, since the data records staleness only', () => {
      const destinations = buildSpaceDestinations([], [MARKETPLACE]);

      expect(destinations[0].failed).toBe(0);
    });
  });
});

describe('destinationReachSummary', () => {
  const DESTINATIONS = buildSpaceDestinations(
    [ALIGNED_REPO, DRIFTED_REPO, FAILED_REPO],
    [MARKETPLACE],
  );

  it('counts every destination', () => {
    expect(destinationReachSummary(DESTINATIONS).destinations).toBe(4);
  });

  it('says how many are repositories', () => {
    expect(destinationReachSummary(DESTINATIONS).repositories).toBe(3);
  });

  it('says how many are marketplaces', () => {
    expect(destinationReachSummary(DESTINATIONS).marketplaces).toBe(1);
  });

  it('counts the destinations that are not aligned', () => {
    expect(destinationReachSummary(DESTINATIONS).needingWork).toBe(3);
  });

  it('counts the destinations that are merely behind', () => {
    expect(destinationReachSummary(DESTINATIONS).behindDestinations).toBe(2);
  });

  it('counts the destinations whose last distribution failed', () => {
    expect(destinationReachSummary(DESTINATIONS).failedDestinations).toBe(1);
  });

  /*
   * The two pills of the rail's filter band are a partition of what needs work,
   * which is the whole point of counting them separately: a destination in
   * neither is aligned, and one in both cannot exist.
   */
  it('splits what needs work between the two, with nothing left over', () => {
    const summary = destinationReachSummary(DESTINATIONS);

    expect(summary.behindDestinations + summary.failedDestinations).toBe(
      summary.needingWork,
    );
  });

  it('adds the landings behind across both kinds', () => {
    expect(destinationReachSummary(DESTINATIONS).behind).toBe(3);
  });

  it('adds the failures, which only repositories report', () => {
    expect(destinationReachSummary(DESTINATIONS).failed).toBe(1);
  });

  it('says nothing is behind on an empty space', () => {
    expect(destinationReachSummary([])).toEqual({
      destinations: 0,
      repositories: 0,
      marketplaces: 0,
      needingWork: 0,
      behindDestinations: 0,
      failedDestinations: 0,
      behind: 0,
      failed: 0,
    });
  });
});

describe('destinationDriftStatus', () => {
  /** Drift-first, so the failed repository leads and the aligned one trails. */
  const [failedOne, drifted, aligned, market]: Destination[] =
    buildSpaceDestinations(
      [ALIGNED_REPO, DRIFTED_REPO, FAILED_REPO],
      [MARKETPLACE],
    );

  it('gives a destination with no drift the aligned status', () => {
    expect(destinationDriftStatus(aligned)).toBe('aligned');
  });

  it('gives a drifted destination the behind status', () => {
    expect(destinationDriftStatus(drifted)).toBe('behind');
  });

  /*
   * The failed fixture is drifted as well, which is the normal case: a
   * distribution that did not land leaves the landing drifted. The failure
   * wins, because it is the part distributing may not put right on its own.
   */
  it('gives a destination that failed the failed status, drifted or not', () => {
    expect(destinationDriftStatus(failedOne)).toBe('failed');
  });

  it('reads a marketplace the same way, since it never reports a failure', () => {
    expect(destinationDriftStatus(market)).toBe('behind');
  });
});

describe('isBatchDistributable', () => {
  const [, drifted, aligned, market]: Destination[] = buildSpaceDestinations(
    [ALIGNED_REPO, DRIFTED_REPO, FAILED_REPO],
    [MARKETPLACE],
  );

  it('takes a repository with drift', () => {
    expect(isBatchDistributable(drifted)).toBe(true);
  });

  it('leaves out a repository with no drift', () => {
    expect(isBatchDistributable(aligned)).toBe(false);
  });

  /*
   * It used to be left out, back when the confirmation surface could only write
   * a package into a repository and a checkbox here would have done nothing.
   */
  it('takes a marketplace with drift', () => {
    expect(isBatchDistributable(market)).toBe(true);
  });

  describe('when a marketplace has nothing drifted', () => {
    it('leaves it out, like an aligned repository', () => {
      const [quiet] = buildSpaceDestinations(
        [],
        [marketplace('mkt-2', 'Quiet catalog', [])],
      );

      expect(isBatchDistributable(quiet)).toBe(false);
    });
  });
});

describe('searchDestinations', () => {
  const DESTINATIONS = buildSpaceDestinations(
    [ALIGNED_REPO, DRIFTED_REPO],
    [MARKETPLACE],
  );

  describe('with nothing typed', () => {
    it('keeps every destination', () => {
      const result = searchDestinations(DESTINATIONS, '  ');

      expect(result.rows).toHaveLength(3);
    });

    it('marks no package as matched', () => {
      const result = searchDestinations(DESTINATIONS, '');

      expect(result.rows.every((row) => row.matchedPackages.length === 0)).toBe(
        true,
      );
    });
  });

  it('matches a repository on its name', () => {
    const result = searchDestinations(DESTINATIONS, 'webapp');

    expect(result.rows.map((row) => row.destination.name)).toEqual([
      'acme/webapp',
    ]);
  });

  it('matches a repository on its branch', () => {
    const result = searchDestinations(
      buildSpaceDestinations(
        [repository('r', 'acme', 'app', [], 'release/2026-08')],
        [],
      ),
      'release/',
    );

    expect(result.rows).toHaveLength(1);
  });

  it('matches a marketplace on its name', () => {
    const result = searchDestinations(DESTINATIONS, 'catalog');

    expect(result.rows.map((row) => row.destination.name)).toEqual([
      'Public catalog',
    ]);
  });

  it('ignores case', () => {
    const result = searchDestinations(DESTINATIONS, 'WEBAPP');

    expect(result.rows).toHaveLength(1);
  });

  describe('matching what landed rather than where', () => {
    it('finds the destination a package landed in', () => {
      const result = searchDestinations(DESTINATIONS, 'backend');

      expect(result.rows.map((row) => row.destination.name)).toEqual([
        'acme/webapp',
      ]);
    });

    it('says which package put it there', () => {
      const result = searchDestinations(DESTINATIONS, 'backend');

      expect(result.rows[0].matchedPackages).toEqual(['Backend']);
    });

    it('reaches a marketplace through the package it publishes', () => {
      const result = searchDestinations(DESTINATIONS, 'frontend');

      expect(result.rows.map((row) => row.destination.name)).toEqual([
        'Public catalog',
      ]);
    });
  });

  describe('when only the destination name matched', () => {
    it('leaves the package list empty', () => {
      // Not "docs": that repository also carries a package called Docs, and the
      // point of this case is a hit the packages had no part in.
      const result = searchDestinations(DESTINATIONS, 'acme/d');

      expect(result.rows[0].matchedPackages).toEqual([]);
    });
  });

  describe('when the query reaches nothing', () => {
    it('returns no row', () => {
      const result = searchDestinations(DESTINATIONS, 'kubernetes');

      expect(result.rows).toEqual([]);
    });
  });

  it('hands back the needle it searched with, folded and trimmed', () => {
    const result = searchDestinations(DESTINATIONS, '  WebApp  ');

    expect(result.needle).toBe('webapp');
  });
});
