import {
  DistributionStatus,
  createGitRepoId,
  createTargetId,
} from '@packmind/types';
import type {
  DriftArtifactEntry,
  InstallDriftEntry,
} from '../redesign/selectors/installDriftEntries';
import type { ArtifactDrift } from '../redesign/types';
import {
  buildPackageDestinations,
  filterPackageDestinations,
  packageDestinationSummary,
  type PackagePublication,
} from './buildPackageDestinations';

function behindArtifact(name: string): DriftArtifactEntry {
  return {
    artifact: {
      id: `art-${name}`,
      kind: 'standard',
      name,
      packmindVersion: 5,
      isDeleted: false,
      isPending: false,
      installs: [],
    } as unknown as ArtifactDrift,
    reason: 'behind',
    deployedVersion: 3,
    lastDeployedAt: '2026-09-01T10:00:00.000Z',
  };
}

function install(
  overrides: Partial<InstallDriftEntry> & {
    repoId: string;
    targetId: string;
  },
): InstallDriftEntry {
  const { repoId, targetId, ...rest } = overrides;
  return {
    repo: {
      id: createGitRepoId(repoId),
      owner: 'PackmindHub',
      name: 'packmind',
    },
    target: { id: createTargetId(targetId), name: 'root', isDefault: true },
    branch: 'main',
    mostRecentDeployedAt: '2026-09-01T10:00:00.000Z',
    mostRecentDeployedAtDays: 3,
    lastDistributionStatus: DistributionStatus.success,
    lastDistributedAt: '2026-09-01T10:00:00.000Z',
    behindArtifacts: [],
    alignedArtifactCount: 4,
    ...rest,
  } as InstallDriftEntry;
}

function publication(
  overrides: Partial<PackagePublication> = {},
): PackagePublication {
  return {
    id: 'mkt-1',
    name: 'packmind-marketplace',
    isOutdated: false,
    lastAttempt: 'landed',
    prUrl: null,
    lastActivityAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('buildPackageDestinations', () => {
  it('reads a repository and a marketplace as rows of one list', () => {
    const rows = buildPackageDestinations({
      installs: [install({ repoId: 'repo-1', targetId: 'target-1' })],
      publications: [publication()],
    });

    expect(rows.map((row) => [row.kind, row.name])).toEqual([
      ['repository', 'PackmindHub/packmind'],
      ['marketplace', 'packmind-marketplace'],
    ]);
  });

  describe('when a repository holds a single landing', () => {
    it('names it by its branch alone, since there is nothing to tell apart', () => {
      const rows = buildPackageDestinations({
        installs: [install({ repoId: 'repo-1', targetId: 'target-1' })],
      });

      expect(rows[0].details).toEqual(['main']);
    });
  });

  describe('when a repository holds two landings', () => {
    it('names the target on both, so neither row is the unlabelled one', () => {
      const rows = buildPackageDestinations({
        installs: [
          install({ repoId: 'repo-1', targetId: 'target-1' }),
          install({
            repoId: 'repo-1',
            targetId: 'target-2',
            target: { id: createTargetId('target-2'), name: 'apps/frontend' },
          }),
        ],
      });

      expect(rows.map((row) => row.details)).toEqual([
        ['main', 'Repository root'],
        ['main', 'apps/frontend'],
      ]);
    });
  });

  it('carries the key the redistribute flow works in, and nothing for a marketplace', () => {
    const rows = buildPackageDestinations({
      installs: [install({ repoId: 'repo-1', targetId: 'target-1' })],
      publications: [publication()],
    });

    expect(rows[0].installKey).toBe('repo-1::target-1');
    expect(rows[1].installKey).toBeNull();
  });

  describe('the state of a row', () => {
    it('is behind when components are late there', () => {
      const rows = buildPackageDestinations({
        installs: [
          install({
            repoId: 'repo-1',
            targetId: 'target-1',
            behindArtifacts: [behindArtifact('datadog-analysis')],
          }),
        ],
      });

      expect(rows[0].state).toBe('behind');
      expect(rows[0].behindCount).toBe(1);
    });

    it('is failed when the last distribution failed, whatever the drift says', () => {
      const rows = buildPackageDestinations({
        installs: [
          install({
            repoId: 'repo-1',
            targetId: 'target-1',
            lastDistributionStatus: DistributionStatus.failure,
            behindArtifacts: [behindArtifact('datadog-analysis')],
          }),
        ],
      });

      expect(rows[0].state).toBe('failed');
    });

    describe('when a push is already on its way', () => {
      it('is waiting rather than behind, so the row does not offer to push twice', () => {
        const rows = buildPackageDestinations({
          installs: [
            install({
              repoId: 'repo-1',
              targetId: 'target-1',
              lastDistributionStatus: DistributionStatus.in_progress,
              behindArtifacts: [behindArtifact('datadog-analysis')],
            }),
          ],
        });

        expect(rows[0].state).toBe('waiting');
      });
    });

    describe('when a republish sits on the sync pull request', () => {
      it('is waiting even though the published copy is still outdated', () => {
        const rows = buildPackageDestinations({
          installs: [],
          publications: [
            publication({
              isOutdated: true,
              lastAttempt: 'waiting',
              prUrl: 'https://github.com/acme/marketplace/pull/12',
            }),
          ],
        });

        expect(rows[0].state).toBe('waiting');
        expect(rows[0].prUrl).toBe(
          'https://github.com/acme/marketplace/pull/12',
        );
      });
    });

    it('is behind when the published copy has been overtaken and nothing is pending', () => {
      const rows = buildPackageDestinations({
        installs: [],
        publications: [publication({ isOutdated: true })],
      });

      expect(rows[0].state).toBe('behind');
      /*
       * Zero, because the plugin drift says the copy was overtaken and not by
       * which components, and a row must not print "0 components behind".
       */
      expect(rows[0].behindCount).toBe(0);
    });

    it('is aligned when the copy stands and nothing has moved', () => {
      const rows = buildPackageDestinations({
        installs: [],
        publications: [publication()],
      });

      expect(rows[0].state).toBe('aligned');
    });
  });

  describe('the order of the list', () => {
    it('puts the worst first and the aligned last, interleaving the two kinds', () => {
      const rows = buildPackageDestinations({
        installs: [
          install({ repoId: 'repo-ok', targetId: 't1' }),
          install({
            repoId: 'repo-broken',
            targetId: 't2',
            lastDistributionStatus: DistributionStatus.failure,
          }),
          install({
            repoId: 'repo-late',
            targetId: 't3',
            behindArtifacts: [behindArtifact('a')],
          }),
        ],
        publications: [
          publication({ id: 'mkt-1', lastAttempt: 'waiting' }),
          publication({ id: 'mkt-2', name: 'other-marketplace' }),
        ],
      });

      expect(rows.map((row) => row.state)).toEqual([
        'failed',
        'waiting',
        'behind',
        'aligned',
        'aligned',
      ]);
    });

    it('puts the most behind first inside one state', () => {
      const rows = buildPackageDestinations({
        installs: [
          install({
            repoId: 'repo-1',
            targetId: 't1',
            behindArtifacts: [behindArtifact('a')],
          }),
          install({
            repoId: 'repo-2',
            targetId: 't2',
            behindArtifacts: [behindArtifact('a'), behindArtifact('b')],
          }),
        ],
      });

      expect(rows.map((row) => row.behindCount)).toEqual([2, 1]);
    });
  });
});

describe('filterPackageDestinations', () => {
  const rows = () =>
    buildPackageDestinations({
      installs: [
        install({ repoId: 'repo-1', targetId: 't1' }),
        install({
          repoId: 'repo-2',
          targetId: 't2',
          behindArtifacts: [behindArtifact('a')],
        }),
      ],
      publications: [
        publication({ id: 'mkt-1' }),
        publication({ id: 'mkt-2', isOutdated: true }),
      ],
    });

  it('keeps everything under "all"', () => {
    expect(filterPackageDestinations(rows(), 'all')).toHaveLength(4);
  });

  it('keeps one kind at a time', () => {
    expect(
      filterPackageDestinations(rows(), 'repositories').map((row) => row.kind),
    ).toEqual(['repository', 'repository']);
    expect(
      filterPackageDestinations(rows(), 'marketplaces').map((row) => row.kind),
    ).toEqual(['marketplace', 'marketplace']);
  });

  describe('when the reader asks for what needs a hand', () => {
    it('takes both kinds and every state but aligned', () => {
      const shown = filterPackageDestinations(rows(), 'needs-a-hand');

      expect(shown.map((row) => row.kind)).toEqual([
        'repository',
        'marketplace',
      ]);
      expect(shown.every((row) => row.state !== 'aligned')).toBe(true);
    });
  });

  it('takes the aligned ones and nothing else under "up to date"', () => {
    const shown = filterPackageDestinations(rows(), 'up-to-date');

    expect(shown).toHaveLength(2);
    expect(shown.every((row) => row.state === 'aligned')).toBe(true);
  });
});

describe('packageDestinationSummary', () => {
  it('counts what each chip says', () => {
    const summary = packageDestinationSummary(
      buildPackageDestinations({
        installs: [
          install({ repoId: 'repo-1', targetId: 't1' }),
          install({
            repoId: 'repo-2',
            targetId: 't2',
            behindArtifacts: [behindArtifact('a')],
          }),
        ],
        publications: [
          publication({ id: 'mkt-1' }),
          publication({ id: 'mkt-2', lastAttempt: 'failed' }),
          publication({ id: 'mkt-3', isOutdated: true }),
        ],
      }),
    );

    expect(summary).toEqual({
      all: 5,
      repositories: 2,
      marketplaces: 3,
      needsAHand: 3,
      upToDate: 2,
    });
  });

  it('says nothing needs a hand on a package that stands nowhere', () => {
    expect(packageDestinationSummary([])).toEqual({
      all: 0,
      repositories: 0,
      marketplaces: 0,
      needsAHand: 0,
      upToDate: 0,
    });
  });
});
