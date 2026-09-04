import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { UIProvider } from '@packmind/ui';
import {
  createGitProviderId,
  createGitRepoId,
  createMarketplaceId,
  createPackageId,
  createTargetId,
  DistributionStatus,
} from '@packmind/types';

import { DestinationRail } from './DestinationRail';
import {
  buildSpaceDestinations,
  destinationReachSummary,
} from './buildSpaceDestinations';
import type {
  MarketplaceDrift,
  PackageDrift,
  RepositoryDrift,
} from '../redesign/types';

const providerId = createGitProviderId('provider-1');

/**
 * A package landed on one (repo, target). `behind` is what a distribution
 * would fix, `failed` is what the last attempt did, and a failed landing is
 * drifted as well, which is the shape the real data has.
 */
const landed = (
  name: string,
  repoId: string,
  state: 'aligned' | 'behind' | 'failed',
): PackageDrift =>
  ({
    name,
    artifacts: [
      {
        installs: [
          {
            repo: { id: createGitRepoId(repoId), providerId },
            target: { id: createTargetId(`${repoId}-root`) },
            driftReason: state === 'aligned' ? 'aligned' : 'behind',
          },
        ],
      },
    ],
    installLocations: [
      {
        repo: { id: createGitRepoId(repoId), providerId },
        target: { id: createTargetId(`${repoId}-root`) },
        lastDistributionStatus:
          state === 'failed'
            ? DistributionStatus.failure
            : DistributionStatus.success,
      },
    ],
  }) as unknown as PackageDrift;

const repository = (
  id: string,
  name: string,
  state: 'aligned' | 'behind' | 'failed',
): RepositoryDrift =>
  ({
    id: createGitRepoId(id),
    repo: { id: createGitRepoId(id), owner: 'acme', name, providerId },
    branch: 'main',
    targets: [
      {
        id: createTargetId(`${id}-root`),
        target: { id: createTargetId(`${id}-root`), name: 'root' },
        packages: [landed('Backend', id, state)],
      },
    ],
  }) as unknown as RepositoryDrift;

/**
 * The same package landed on two targets of one repository, which is the case
 * the row's unit is about: two drifted distributions, one package to distribute.
 */
const twoTargets = (
  id: string,
  name: string,
  state: 'aligned' | 'behind' | 'failed',
): RepositoryDrift =>
  ({
    id: createGitRepoId(id),
    repo: { id: createGitRepoId(id), owner: 'acme', name, providerId },
    branch: 'main',
    targets: ['root', 'web'].map((suffix) => ({
      id: createTargetId(`${id}-${suffix}`),
      target: { id: createTargetId(`${id}-${suffix}`), name: suffix },
      packages: [
        {
          ...landed('Backend', id, state),
          id: createPackageId('pkg-backend'),
        },
      ],
    })),
  }) as unknown as RepositoryDrift;

/** A catalog holding two plugins whose packages have moved on. */
const CATALOG = {
  id: createMarketplaceId('mkt-1'),
  name: 'Public catalog',
  plugins: [
    { pluginSlug: 'backend', packageName: 'Backend' },
    { pluginSlug: 'frontend', packageName: 'Frontend' },
  ],
  publishedPackageNames: ['Backend', 'Frontend'],
} as unknown as MarketplaceDrift;

const BEHIND = repository('repo-behind', 'webapp', 'behind');
const FAILED = repository('repo-failed', 'api', 'failed');
const ALIGNED = repository('repo-aligned', 'docs', 'aligned');

function renderRail(
  repositories: RepositoryDrift[] = [BEHIND, FAILED, ALIGNED],
  selectedDestinationId: string | null = null,
  options: {
    marketplaces?: MarketplaceDrift[];
    bulkSelected?: Set<string>;
  } = {},
) {
  const destinations = buildSpaceDestinations(
    repositories,
    options.marketplaces ?? [],
  );
  const onSelect = vi.fn();
  render(
    <UIProvider>
      <DestinationRail
        destinations={destinations}
        summary={destinationReachSummary(destinations)}
        selectedDestinationId={selectedDestinationId}
        bulkSelected={options.bulkSelected ?? new Set()}
        providersWithToken={new Set([providerId])}
        isProvidersLoading={false}
        onSelect={onSelect}
        onToggleBulk={vi.fn()}
        onSetBulkSelection={vi.fn()}
        onDistributeBulk={vi.fn()}
      />
    </UIProvider>,
  );
  return { onSelect };
}

const pill = (name: RegExp) => screen.getByRole('button', { name });
const rowNames = () =>
  screen
    .getAllByRole('button', { name: /^Repository acme\// })
    .map((row) => row.getAttribute('aria-label')?.split(',')[0]);

describe('DestinationRail', () => {
  describe('when destinations are drifted and others have failed', () => {
    it('offers one filter per state, counted in destinations', () => {
      renderRail();

      expect(
        pill(/^Show only the 1 destination with something drifted/),
      ).toBeInTheDocument();
      expect(
        pill(/^Show only the 1 destination whose last distribution failed/),
      ).toBeInTheDocument();
    });

    /* The single pill this replaces put both states in one sentence. */
    it('no longer names the two in one control', () => {
      renderRail();

      expect(
        screen.queryByRole('button', {
          name: /destinations behind, .* failed/,
        }),
      ).not.toBeInTheDocument();
    });

    it('narrows to the failures alone', async () => {
      renderRail();

      await userEvent.click(
        pill(/^Show only the 1 destination whose last distribution failed/),
      );

      expect(rowNames()).toEqual(['Repository acme/api']);
    });

    it('narrows to what is drifted alone, leaving the failure out', async () => {
      renderRail();

      await userEvent.click(
        pill(/^Show only the 1 destination with something drifted/),
      );

      expect(rowNames()).toEqual(['Repository acme/webapp']);
    });

    /*
     * Both on is the filter the rail used to have, which has to stay reachable:
     * "show me everything that is work" is the Monday morning question.
     */
    it('shows both states when both are picked, and never the aligned one', async () => {
      renderRail();

      await userEvent.click(
        pill(/^Show only the 1 destination with something drifted/),
      );
      await userEvent.click(
        pill(/^Show only the 1 destination whose last distribution failed/),
      );

      expect(rowNames()).toEqual([
        'Repository acme/api',
        'Repository acme/webapp',
      ]);
    });

    it('gives the whole list back through Clear filters', async () => {
      renderRail();

      await userEvent.click(
        pill(/^Show only the 1 destination with something drifted/),
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'Clear filters' }),
      );

      expect(rowNames()).toHaveLength(3);
    });
  });

  describe('when the open destination does not match the filter', () => {
    /*
     * It stays, because a rail that drops the row the pane is showing leaves the
     * reader looking at a destination the list says does not exist.
     */
    it('keeps it in the list and says why', async () => {
      renderRail([BEHIND, FAILED, ALIGNED], 'r:repo-behind');

      await userEvent.click(
        pill(/^Show only the 1 destination whose last distribution failed/),
      );

      expect(rowNames()).toEqual([
        'Repository acme/api',
        'Repository acme/webapp',
      ]);
      expect(screen.getByText('· open, filtered out')).toBeInTheDocument();
    });

    /* It is drifted. Only the filter it fails, which is what the note must say. */
    it('does not claim it is aligned', async () => {
      renderRail([BEHIND, FAILED, ALIGNED], 'r:repo-behind');

      await userEvent.click(
        pill(/^Show only the 1 destination whose last distribution failed/),
      );

      expect(screen.queryByText('· open, not behind')).not.toBeInTheDocument();
    });
  });

  describe('what a repository row counts', () => {
    it('counts one drifted package landed twice as one', () => {
      renderRail([twoTargets('repo-two', 'monorepo', 'behind')]);

      expect(screen.getByText('1 package drifted')).toBeInTheDocument();
    });

    it('says so in the row label as well as the line', () => {
      renderRail([twoTargets('repo-two', 'monorepo', 'behind')]);

      expect(
        screen.getByRole('button', {
          name: 'Repository acme/monorepo, 1 package drifted',
        }),
      ).toBeInTheDocument();
    });

    it('counts the packages of an aligned repository, not its targets', () => {
      renderRail([twoTargets('repo-two', 'monorepo', 'aligned')]);

      expect(screen.getByText('1 package aligned')).toBeInTheDocument();
    });
  });

  describe('when a search matches only destinations the filter hides', () => {
    it('names the state that is hiding them', async () => {
      renderRail();

      await userEvent.click(
        pill(/^Show only the 1 destination whose last distribution failed/),
      );
      await userEvent.type(
        screen.getByLabelText('Search destinations and packages'),
        'webapp',
      );

      expect(screen.getByText(/none failed/)).toBeInTheDocument();
    });
  });

  describe('when nothing has failed', () => {
    it('offers no failure filter', () => {
      renderRail([BEHIND, ALIGNED]);

      expect(
        screen.queryByRole('button', {
          name: /whose last distribution failed/,
        }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when every destination is aligned', () => {
    it('states it instead of offering a filter', () => {
      renderRail([ALIGNED]);

      expect(
        screen.getByText(/1 destination on the latest version/),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /^Show only/ }),
      ).not.toBeInTheDocument();
    });
  });

  describe('what the batch accepts', () => {
    /*
     * It accepted repositories only, back when the confirmation screen could
     * not send a plugin. Hovered, because the checkbox column stays empty until
     * the row is reached or a batch is under way.
     */
    it('offers a checkbox on a drifted marketplace', async () => {
      renderRail([BEHIND], null, { marketplaces: [CATALOG] });

      await userEvent.hover(
        screen.getByRole('button', { name: /^Marketplace Public catalog/ }),
      );

      expect(
        screen.getByRole('checkbox', {
          name: /Public catalog/,
        }),
      ).toBeInTheDocument();
    });

    it('counts a picked catalog in plugins', () => {
      renderRail([BEHIND], null, {
        marketplaces: [CATALOG],
        bulkSelected: new Set(['m:mkt-1']),
      });

      expect(screen.getByText('1 selected · 2 plugins')).toBeInTheDocument();
    });

    /* Two units: `behind` counts distributions on one and plugins on the other. */
    it('counts a mixed pick in both', () => {
      renderRail([BEHIND], null, {
        marketplaces: [CATALOG],
        bulkSelected: new Set(['m:mkt-1', 'r:repo-behind']),
      });

      expect(
        screen.getByText('2 selected · 1 distribution, 2 plugins'),
      ).toBeInTheDocument();
    });

    it('keeps saying distributions when only repositories are picked', () => {
      renderRail([BEHIND], null, {
        bulkSelected: new Set(['r:repo-behind']),
      });

      expect(
        screen.getByText('1 selected · 1 distribution'),
      ).toBeInTheDocument();
    });
  });
});
