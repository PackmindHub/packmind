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
  STALE_REPORT_DAYS,
  buildPackageDestinations,
  destinationTone,
  filterPackageDestinations,
  oldestStaleReport,
  packageDestinationSummary,
  reportDay,
  searchPackageDestinations,
  type PackagePublication,
} from './buildPackageDestinations';

/*
 * Ages rather than dates, so a suite that passes today still passes in March.
 * The rule under test is a distance from now, and a literal date fixture turns
 * into a stale one the moment nobody is looking.
 */
function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

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
    lastDistributedAt: daysAgo(3),
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
    lastActivityAt: daysAgo(3),
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

  describe('whether there is anything to send', () => {
    it('follows the late components on a landing', () => {
      const rows = buildPackageDestinations({
        installs: [
          install({ repoId: 'repo-1', targetId: 't1' }),
          install({
            repoId: 'repo-2',
            targetId: 't2',
            behindArtifacts: [behindArtifact('a')],
          }),
        ],
      });

      expect(rows.map((row) => row.hasWorkToSend)).toEqual([true, false]);
    });

    describe('on a published copy, which carries no count', () => {
      it('follows whether it was overtaken, so republishing stays offerable', () => {
        const rows = buildPackageDestinations({
          installs: [],
          publications: [
            publication({ id: 'mkt-1', isOutdated: true }),
            publication({ id: 'mkt-2' }),
          ],
        });

        expect(rows.map((row) => row.hasWorkToSend)).toEqual([true, false]);
      });

      it('holds on a publish that failed, which is retried the same way', () => {
        const rows = buildPackageDestinations({
          installs: [],
          publications: [
            publication({ isOutdated: true, lastAttempt: 'failed' }),
          ],
        });

        expect(rows[0].state).toBe('failed');
        expect(rows[0].hasWorkToSend).toBe(true);
      });
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

describe('searchPackageDestinations', () => {
  const rows = () =>
    buildPackageDestinations({
      installs: [
        install({ repoId: 'repo-1', targetId: 't1' }),
        install({
          repoId: 'repo-1',
          targetId: 't2',
          branch: 'release',
          target: { id: createTargetId('t2'), name: 'services/api' },
        }),
      ],
      publications: [publication({ name: 'acme-marketplace' })],
    });

  it('takes everything when nothing is typed', () => {
    expect(searchPackageDestinations(rows(), '   ')).toHaveLength(3);
  });

  it('matches a name whatever its case', () => {
    expect(
      searchPackageDestinations(rows(), 'ACME-MARKET').map((row) => row.name),
    ).toEqual(['acme-marketplace']);
  });

  it('matches a branch, which is not in the name', () => {
    expect(searchPackageDestinations(rows(), 'release')).toHaveLength(1);
  });

  it('matches a target, which is how one landing among several is reached', () => {
    const found = searchPackageDestinations(rows(), 'services/');

    expect(found).toHaveLength(1);
    expect(found[0].details).toContain('services/api');
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

describe('the age of a report', () => {
  describe('when the last report is recent', () => {
    it('leaves the row unqualified, which is every row on a live package', () => {
      const rows = buildPackageDestinations({
        installs: [
          install({
            repoId: 'repo-1',
            targetId: 't1',
            lastDistributedAt: daysAgo(STALE_REPORT_DAYS - 2),
          }),
        ],
      });

      expect(rows[0].hasStaleReport).toBe(false);
      expect(destinationTone(rows[0])).toBe('green.500');
    });

    it('holds right up to the threshold, which is not itself an age worth naming', () => {
      const rows = buildPackageDestinations({
        installs: [
          install({
            repoId: 'repo-1',
            targetId: 't1',
            lastDistributedAt: daysAgo(STALE_REPORT_DAYS),
          }),
        ],
      });

      expect(rows[0].hasStaleReport).toBe(false);
    });
  });

  describe('when the last report is older than the threshold', () => {
    it('marks the row, since nothing has read that branch since', () => {
      const rows = buildPackageDestinations({
        installs: [
          install({
            repoId: 'repo-1',
            targetId: 't1',
            lastDistributedAt: daysAgo(STALE_REPORT_DAYS + 30),
          }),
        ],
      });

      expect(rows[0].hasStaleReport).toBe(true);
    });

    it('drains the colour from the aligned mark rather than darkening it', () => {
      const rows = buildPackageDestinations({
        installs: [
          install({
            repoId: 'repo-1',
            targetId: 't1',
            lastDistributedAt: daysAgo(90),
          }),
        ],
      });

      expect(destinationTone(rows[0])).toBe('beige.500');
    });

    /*
     * The mirror of the rule, and the reason it is bounded: a marketplace is
     * swept by its own reconciliation job, so nobody has to have been there
     * lately for its state to be known. Saying "last reported 90 days ago"
     * there would invent a doubt that the sweep has already settled, which is
     * the exact inverse of the gap this rule exists to close.
     */
    it('leaves a published copy alone, however old its date', () => {
      const rows = buildPackageDestinations({
        installs: [],
        publications: [publication({ lastActivityAt: daysAgo(90) })],
      });

      expect(rows[0].hasStaleReport).toBe(false);
      expect(destinationTone(rows[0])).toBe('green.500');
    });

    describe('on a state that is not aligned', () => {
      it('leaves the tone alone, since a failure does not go out of date', () => {
        const rows = buildPackageDestinations({
          installs: [
            install({
              repoId: 'repo-1',
              targetId: 't1',
              lastDistributionStatus: DistributionStatus.failure,
              behindArtifacts: [behindArtifact('a')],
              lastDistributedAt: daysAgo(400),
            }),
            install({
              repoId: 'repo-2',
              targetId: 't2',
              behindArtifacts: [behindArtifact('a')],
              lastDistributedAt: daysAgo(400),
            }),
          ],
        });

        expect(rows.map((row) => destinationTone(row))).toEqual([
          'red.300',
          'orange.500',
        ]);
      });

      it('never moves a row up the order, since age is not an escalation', () => {
        const rows = buildPackageDestinations({
          installs: [
            install({
              repoId: 'repo-old',
              targetId: 't1',
              lastDistributedAt: daysAgo(400),
            }),
            install({
              repoId: 'repo-late',
              targetId: 't2',
              behindArtifacts: [behindArtifact('a')],
            }),
          ],
        });

        expect(rows.map((row) => row.state)).toEqual(['behind', 'aligned']);
      });
    });
  });

  describe('when nothing was ever reported', () => {
    it('leaves the row unmarked, so no mark fades without a date to name', () => {
      const rows = buildPackageDestinations({
        installs: [
          install({
            repoId: 'repo-1',
            targetId: 't1',
            lastDistributedAt: null,
            mostRecentDeployedAt: null,
          }),
        ],
      });

      expect(rows[0].lastActivityAt).toBeNull();
      expect(rows[0].hasStaleReport).toBe(false);
      expect(destinationTone(rows[0])).toBe('green.500');
    });
  });
});

describe('reportDay', () => {
  /*
   * Built from the current year rather than written out, so the suite does not
   * start failing on a January morning. Only the number is computed; the shape
   * each case asserts is spelled out in full.
   */
  const thisYear = new Date().getFullYear();

  it('is the day and the short month, which two rows can be compared on', () => {
    expect(reportDay(`${thisYear}-03-12T10:00:00.000Z`)).toBe('12 Mar');
  });

  describe('when the report is not from this year', () => {
    it('carries the year, since a bare day reads as one that has not come yet', () => {
      expect(reportDay(`${thisYear - 1}-11-28T10:00:00.000Z`)).toBe(
        `28 Nov ${thisYear - 1}`,
      );
    });
  });
});

describe('oldestStaleReport', () => {
  it('is the one nobody has heard from in longest', () => {
    const longAgo = daysAgo(200);
    const rows = buildPackageDestinations({
      installs: [
        install({
          repoId: 'repo-1',
          targetId: 't1',
          lastDistributedAt: daysAgo(40),
        }),
        install({
          repoId: 'repo-2',
          targetId: 't2',
          lastDistributedAt: longAgo,
        }),
        install({ repoId: 'repo-3', targetId: 't3' }),
      ],
    });

    expect(oldestStaleReport(rows)).toBe(longAgo);
  });

  it('is nothing when every report is recent', () => {
    const rows = buildPackageDestinations({
      installs: [install({ repoId: 'repo-1', targetId: 't1' })],
    });

    expect(oldestStaleReport(rows)).toBeNull();
  });

  it('is nothing on a set that carries no dates at all', () => {
    const rows = buildPackageDestinations({
      installs: [
        install({
          repoId: 'repo-1',
          targetId: 't1',
          lastDistributedAt: null,
          mostRecentDeployedAt: null,
        }),
      ],
    });

    expect(oldestStaleReport(rows)).toBeNull();
  });
});
