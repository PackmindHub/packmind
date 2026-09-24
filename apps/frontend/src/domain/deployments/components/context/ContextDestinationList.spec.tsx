import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import type { DriftArtifactEntry } from '../redesign/selectors/installDriftEntries';
import type { ArtifactDrift } from '../redesign/types';
import { ContextDestinationList } from './ContextDestinationList';
import type { PackageDestination } from './buildPackageDestinations';

function behind(name: string, version: number): DriftArtifactEntry {
  return {
    artifact: {
      id: `art-${name}`,
      kind: 'standard',
      name,
      packmindVersion: version,
    } as unknown as ArtifactDrift,
    reason: 'behind',
    deployedVersion: version - 1,
    lastDeployedAt: '2026-09-01T10:00:00.000Z',
  };
}

/*
 * Anchored on the current year, because `reportDay` now drops the year only
 * for this one. A literal year would make these cases swap shapes on 1 January
 * and the suite would fail for a reason that has nothing to do with the rule.
 */
const THIS_YEAR = new Date().getFullYear();
const STALE_THIS_YEAR = `${THIS_YEAR}-03-12T10:00:00.000Z`;
const STALE_LAST_YEAR = `${THIS_YEAR - 1}-11-28T10:00:00.000Z`;

function destination(
  overrides: Partial<PackageDestination> = {},
): PackageDestination {
  const row = {
    key: 'r:repo-1::target-1',
    kind: 'repository' as const,
    name: 'PackmindHub/packmind',
    details: ['main'],
    state: 'aligned' as const,
    behindArtifacts: [],
    behindCount: 0,
    hasWorkToSend: false,
    installKey: 'repo-1::target-1',
    prUrl: null,
    lastActivityAt: '2026-09-01T10:00:00.000Z',
    /*
     * Stated rather than worked out from the date above, because the selector
     * is what works it out: these rows are what the list is handed, and a spec
     * that recomputed the rule would stop testing the component.
     */
    hasStaleReport: false,
    ...overrides,
  };
  return {
    ...row,
    /*
     * Follows the count unless a test says otherwise, which is the selector's
     * own rule for a landing. A marketplace has to state it, since its drift
     * carries no count.
     */
    hasWorkToSend: overrides.hasWorkToSend ?? row.behindCount > 0,
  };
}

function renderList(
  destinations: PackageDestination[],
  onUpdate?: (destinations: readonly PackageDestination[]) => void,
) {
  return render(
    <UIProvider>
      <ContextDestinationList destinations={destinations} onUpdate={onUpdate} />
    </UIProvider>,
  );
}

describe('ContextDestinationList', () => {
  it('reads a repository and a marketplace as rows of one list', () => {
    renderList([
      destination({
        state: 'behind',
        behindCount: 1,
        behindArtifacts: [behind('a', 2)],
      }),
      destination({
        key: 'm:mkt-1',
        kind: 'marketplace',
        name: 'packmind-marketplace',
        details: [],
        state: 'behind',
        installKey: null,
      }),
    ]);

    expect(screen.getByText('PackmindHub/packmind')).toBeInTheDocument();
    expect(screen.getByText('packmind-marketplace')).toBeInTheDocument();
  });

  describe('the band a row lands in', () => {
    it('keeps failures out of the drifted band, since the two are not put right the same way', () => {
      renderList([
        destination({ key: 'a', state: 'failed' }),
        destination({ key: 'b', state: 'behind', behindCount: 1 }),
      ]);

      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('Behind or waiting')).toBeInTheDocument();
    });

    it('leaves out a band with nothing in it', () => {
      renderList([destination({ state: 'behind', behindCount: 1 })]);

      expect(screen.queryByText('Failed')).not.toBeInTheDocument();
    });

    it('says what share of the destinations it holds', () => {
      renderList([
        destination({ key: 'a', state: 'behind', behindCount: 1 }),
        destination({ key: 'b' }),
        destination({ key: 'c' }),
      ]);

      expect(screen.getByText('1 of 3 destinations')).toBeInTheDocument();
    });
  });

  describe('what is up to date', () => {
    it('is a count and not a run of rows', () => {
      renderList([
        destination({ key: 'a', name: 'acme/one' }),
        destination({ key: 'b', name: 'acme/two' }),
      ]);

      expect(
        screen.getByText('2 destinations are up to date'),
      ).toBeInTheDocument();
      // Folded, so the names are in that one line and not in rows of their own.
      expect(screen.queryByText('acme/one')).not.toBeInTheDocument();
    });

    it('names them beside the count, which is what makes the folded line worth reading', () => {
      renderList([
        destination({ key: 'a', name: 'acme/one' }),
        destination({ key: 'b', name: 'acme/two' }),
      ]);

      expect(screen.getByText('acme/one · acme/two')).toBeInTheDocument();
    });

    describe('when the reader opens it', () => {
      it('shows the rows it was standing for', async () => {
        renderList([destination({ key: 'a', name: 'acme/one' })]);

        await userEvent.click(
          screen.getByRole('button', {
            name: 'Show the destinations that are up to date',
          }),
        );

        expect(screen.getByText('acme/one')).toBeInTheDocument();
      });
    });
  });

  describe('the chip row', () => {
    const mixed = () => [
      destination({
        key: 'a',
        name: 'acme/late',
        state: 'behind',
        behindCount: 1,
      }),
      destination({ key: 'b', name: 'acme/fine' }),
      destination({
        key: 'm:mkt-1',
        kind: 'marketplace',
        name: 'packmind-marketplace',
        details: [],
        installKey: null,
      }),
    ];

    it('counts the whole package and not what the filter left', async () => {
      renderList(mixed());

      await userEvent.click(
        screen.getByRole('button', { name: 'Needs a hand, 1' }),
      );

      expect(
        screen.getByRole('button', { name: 'All destinations, 3' }),
      ).toBeInTheDocument();
    });

    it('narrows the list to one kind', async () => {
      renderList(mixed());

      await userEvent.click(
        screen.getByRole('button', { name: 'Marketplaces, 1' }),
      );

      expect(screen.getByText('packmind-marketplace')).toBeInTheDocument();
      expect(screen.queryByText('acme/late')).not.toBeInTheDocument();
    });

    describe('when nothing falls under a reading', () => {
      it('leaves its chip out rather than offering a control that does nothing', () => {
        renderList([
          destination({ key: 'a', state: 'behind', behindCount: 1 }),
          destination({ key: 'b' }),
        ]);

        expect(
          screen.queryByRole('button', { name: /Marketplaces/ }),
        ).not.toBeInTheDocument();
      });
    });

    describe('when a reading holds everything', () => {
      it('leaves it out too, since it is the same list under a second name', () => {
        renderList([
          destination({ key: 'a', state: 'behind', behindCount: 1 }),
          destination({ key: 'b', state: 'behind', behindCount: 1 }),
        ]);

        expect(
          screen.queryByRole('button', { name: /Repositories/ }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole('button', { name: /Needs a hand/ }),
        ).not.toBeInTheDocument();
      });

      it('drops the whole row when only "all" is left, rather than heading the list with a control', () => {
        renderList([destination({ state: 'behind', behindCount: 1 })]);

        expect(
          screen.queryByRole('button', { name: /All destinations/ }),
        ).not.toBeInTheDocument();
      });
    });

    describe('when the reader asks for what is up to date', () => {
      it('shows those rows rather than the line that stands for them', async () => {
        renderList(mixed());

        await userEvent.click(
          screen.getByRole('button', { name: 'Up to date, 2' }),
        );

        expect(screen.getByText('acme/fine')).toBeInTheDocument();
        expect(
          screen.queryByRole('button', {
            name: 'Hide the destinations that are up to date',
          }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('the search', () => {
    const searchable = () => [
      destination({
        key: 'a',
        name: 'acme/checkout-api',
        details: ['main', 'services/api'],
        state: 'behind',
        behindCount: 1,
      }),
      destination({ key: 'b', name: 'acme/ledger', details: ['release'] }),
    ];

    const typeQuery = async (text: string) =>
      userEvent.type(
        screen.getByLabelText('Find a repository, branch or marketplace'),
        text,
      );

    it('reaches a row by its name', async () => {
      renderList(searchable());

      await typeQuery('ledger');

      expect(screen.getByText('acme/ledger')).toBeInTheDocument();
      expect(screen.queryByText('acme/checkout-api')).not.toBeInTheDocument();
    });

    it('reaches a row by its branch or its target', async () => {
      renderList(searchable());

      await typeQuery('services/api');

      expect(screen.getByText('acme/checkout-api')).toBeInTheDocument();
    });

    describe('when what matches is up to date', () => {
      it('shows it rather than folding it into the count', async () => {
        renderList(searchable());

        await typeQuery('ledger');

        expect(screen.getByText('acme/ledger')).toBeInTheDocument();
      });
    });

    it('says how much of the package it reached, and offers the way back', async () => {
      renderList(searchable());

      await typeQuery('acme');

      expect(
        screen.getByText('2 of 2 destinations match "acme".'),
      ).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Clear' }));

      expect(screen.queryByText(/destinations match/)).not.toBeInTheDocument();
    });

    describe('when nothing matches', () => {
      it('says so rather than leaving an empty box', async () => {
        renderList(searchable());

        await typeQuery('nothing-like-this');

        expect(
          screen.getByText(
            'No destination of this package matches "nothing-like-this".',
          ),
        ).toBeInTheDocument();
      });
    });
  });

  describe('what a drifted row says', () => {
    it('names the late components rather than only counting them', () => {
      renderList([
        destination({
          state: 'behind',
          behindCount: 2,
          behindArtifacts: [
            behind('feature-flags-audit', 5),
            behind('datadog-analysis', 3),
          ],
        }),
      ]);

      expect(
        screen.getByText(
          '2 components behind: feature-flags-audit v5, datadog-analysis v3',
        ),
      ).toBeInTheDocument();
    });

    it('names two and counts the rest, so the row stays a row', () => {
      renderList([
        destination({
          state: 'behind',
          behindCount: 4,
          behindArtifacts: [
            behind('a', 2),
            behind('b', 2),
            behind('c', 2),
            behind('d', 2),
          ],
        }),
      ]);

      expect(
        screen.getByText('4 components behind: a v2, b v2, +2'),
      ).toBeInTheDocument();
    });

    describe('when the drift is a marketplace copy', () => {
      it('states it without a number, since the data does not carry one', () => {
        renderList([
          destination({
            key: 'm:mkt-1',
            kind: 'marketplace',
            state: 'behind',
            installKey: null,
            behindCount: 0,
          }),
        ]);

        expect(
          screen.getByText('The published copy is behind this package'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('picking several landings', () => {
    const pushable = () => [
      destination({
        key: 'a',
        name: 'acme/one',
        installKey: 'repo-1::t1',
        state: 'behind',
        behindCount: 1,
        behindArtifacts: [behind('a', 2)],
      }),
      destination({
        key: 'b',
        name: 'acme/two',
        installKey: 'repo-2::t2',
        state: 'behind',
        behindCount: 1,
        behindArtifacts: [behind('b', 2)],
      }),
      destination({ key: 'c', name: 'acme/fine' }),
    ];

    it('sends the ones that were ticked, and nothing else', async () => {
      const onUpdate = vi.fn();
      renderList(pushable(), onUpdate);

      await userEvent.click(
        screen.getByRole('checkbox', { name: 'Select acme/one' }),
      );
      await userEvent.click(
        screen.getByRole('button', { name: /Update 1 destination/ }),
      );

      expect(onUpdate).toHaveBeenCalledWith([
        expect.objectContaining({ installKey: 'repo-1::t1' }),
      ]);
    });

    it('offers the rest of what can be pushed, and only that', async () => {
      const onUpdate = vi.fn();
      renderList(pushable(), onUpdate);

      await userEvent.click(
        screen.getByRole('checkbox', { name: 'Select acme/one' }),
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'Select all 2' }),
      );
      await userEvent.click(
        screen.getByRole('button', { name: /Update 2 destinations/ }),
      );

      expect(onUpdate.mock.calls[0][0]).toHaveLength(2);
    });

    describe('when a row has nothing to send', () => {
      it('gives it no checkbox, so a batch cannot carry work that would be dropped', () => {
        renderList(pushable(), vi.fn());

        expect(
          screen.queryByRole('checkbox', { name: 'Select acme/fine' }),
        ).not.toBeInTheDocument();
      });
    });

    describe('when a search hides a picked row', () => {
      it('leaves it out of the batch, since it is no longer on screen', async () => {
        const onUpdate = vi.fn();
        renderList(pushable(), onUpdate);

        await userEvent.click(
          screen.getByRole('checkbox', { name: 'Select acme/one' }),
        );
        await userEvent.type(
          screen.getByLabelText('Find a repository, branch or marketplace'),
          'two',
        );

        // The bar goes with it, leaving the row's own button behind.
        expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
      });
    });

    it('picks nothing when the reader cannot push at all', () => {
      renderList(pushable());

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });
  });

  describe('opening a drifted row', () => {
    const late = () =>
      destination({
        name: 'acme/checkout-api',
        state: 'behind',
        behindCount: 3,
        behindArtifacts: [
          behind('feature-flags-audit', 5),
          behind('datadog-analysis', 3),
          behind('release-checklist', 2),
        ],
      });

    it('lists everything the line could only count', async () => {
      renderList([late()]);

      await userEvent.click(
        screen.getByRole('button', {
          name: 'Show what is behind on acme/checkout-api',
        }),
      );

      expect(screen.getByText('release-checklist')).toBeInTheDocument();
      expect(screen.getByText('v5')).toBeInTheDocument();
    });

    it('shuts again on the control that opened it', async () => {
      renderList([late()]);

      await userEvent.click(
        screen.getByRole('button', {
          name: 'Show what is behind on acme/checkout-api',
        }),
      );
      await userEvent.click(
        screen.getByRole('button', {
          name: 'Hide what is behind on acme/checkout-api',
        }),
      );

      expect(screen.queryByText('release-checklist')).not.toBeInTheDocument();
    });

    describe('when the line is already the whole story', () => {
      it('does not offer to open a row that knows nothing more', () => {
        renderList([
          destination({
            key: 'm:mkt-1',
            kind: 'marketplace',
            name: 'acme-marketplace',
            details: [],
            state: 'behind',
            installKey: null,
          }),
        ]);

        expect(
          screen.queryByRole('button', { name: /what is behind/ }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('how old the row says it is', () => {
    describe('when the report behind an aligned row is recent', () => {
      it('says nothing about the date, which is every row on a live package', async () => {
        renderList([destination({ key: 'a', name: 'acme/one' })]);

        await userEvent.click(
          screen.getByRole('button', {
            name: 'Show the destinations that are up to date',
          }),
        );

        expect(screen.getByText('Up to date')).toBeInTheDocument();
      });
    });

    describe('when the report behind an aligned row has gone stale', () => {
      const old = () =>
        destination({
          key: 'a',
          name: 'acme/one',
          hasStaleReport: true,
          lastActivityAt: STALE_THIS_YEAR,
        });

      it('names the day, so the claim carries its own age in words', async () => {
        renderList([old()]);

        await userEvent.click(
          screen.getByRole('button', {
            name: 'Show the destinations that are up to date',
          }),
        );

        expect(
          screen.getByText('Up to date, last reported 12 Mar'),
        ).toBeInTheDocument();
      });

      it('puts the instant one hover away, since the day drops the year', async () => {
        renderList([old()]);

        await userEvent.click(
          screen.getByRole('button', {
            name: 'Show the destinations that are up to date',
          }),
        );

        expect(
          screen.getByText('Up to date, last reported 12 Mar'),
        ).toHaveAttribute(
          'title',
          expect.stringContaining(`Last reported Mar 12, ${THIS_YEAR}`),
        );
      });

      it('names it on a published copy too, which makes the same present claim', async () => {
        renderList([
          destination({
            key: 'm:mkt-1',
            kind: 'marketplace',
            name: 'acme-marketplace',
            details: [],
            installKey: null,
            hasStaleReport: true,
            lastActivityAt: STALE_THIS_YEAR,
          }),
        ]);

        await userEvent.click(
          screen.getByRole('button', {
            name: 'Show the destinations that are up to date',
          }),
        );

        expect(
          screen.getByText('Published, last reported 12 Mar'),
        ).toBeInTheDocument();
      });
    });

    describe('when an aligned row carries no date at all', () => {
      it('leaves the sentence alone rather than naming an age it does not have', async () => {
        renderList([
          destination({ key: 'a', name: 'acme/one', lastActivityAt: null }),
        ]);

        await userEvent.click(
          screen.getByRole('button', {
            name: 'Show the destinations that are up to date',
          }),
        );

        expect(screen.getByText('Up to date')).toBeInTheDocument();
      });
    });

    describe('when the stale row is not aligned', () => {
      it('leaves its sentence untouched, since it reports an event and not a claim', () => {
        renderList([
          destination({
            state: 'behind',
            behindCount: 1,
            behindArtifacts: [behind('a', 2)],
            hasStaleReport: true,
            lastActivityAt: STALE_THIS_YEAR,
          }),
        ]);

        expect(
          screen.getByText('1 component behind: a v2'),
        ).toBeInTheDocument();
        expect(screen.queryByText(/last reported/)).not.toBeInTheDocument();
      });
    });
  });

  describe('the line that stands for what is up to date', () => {
    const folded = () => [
      destination({ key: 'a', name: 'acme/one' }),
      destination({
        key: 'b',
        name: 'acme/two',
        hasStaleReport: true,
        lastActivityAt: STALE_LAST_YEAR,
      }),
    ];

    describe('when one of the reports it folds away has gone stale', () => {
      it('names the oldest, since the line makes the same claim in bulk', () => {
        renderList(folded());

        expect(
          screen.getByText(
            `2 destinations are up to date, oldest report 28 Nov ${THIS_YEAR - 1}`,
          ),
        ).toBeInTheDocument();
      });

      it('puts the instant one hover away, as the rows do', () => {
        renderList(folded());

        expect(
          screen.getByText(
            `2 destinations are up to date, oldest report 28 Nov ${THIS_YEAR - 1}`,
          ),
        ).toHaveAttribute(
          'title',
          expect.stringContaining(`Oldest report Nov 28, ${THIS_YEAR - 1}`),
        );
      });

      it('keeps the names in a run of their own, which is what truncates', () => {
        renderList(folded());

        expect(
          screen.getByText('acme/one \u00b7 acme/two'),
        ).toBeInTheDocument();
      });
    });

    describe('when every report it folds away is recent', () => {
      it('says nothing about age, which is the line as it stands today', () => {
        renderList([
          destination({ key: 'a', name: 'acme/one' }),
          destination({ key: 'b', name: 'acme/two' }),
        ]);

        expect(
          screen.getByText('2 destinations are up to date'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('the action on a row', () => {
    it('pushes this landing again, and hands back the row it was asked from', async () => {
      const onUpdate = vi.fn();
      renderList(
        [
          destination({
            state: 'behind',
            behindCount: 1,
            behindArtifacts: [behind('a', 2)],
          }),
        ],
        onUpdate,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Update' }));

      expect(onUpdate).toHaveBeenCalledWith([
        expect.objectContaining({ installKey: 'repo-1::target-1' }),
      ]);
    });

    describe('when the last push failed and left components behind', () => {
      it('says what the failure left', () => {
        renderList([
          destination({
            state: 'failed',
            behindCount: 4,
            behindArtifacts: [behind('a', 2)],
          }),
        ]);

        expect(
          screen.getByText(
            'The last distribution failed, 4 components still behind',
          ),
        ).toBeInTheDocument();
      });

      it('offers the push that retries it, rather than the package-wide one', () => {
        renderList(
          [
            destination({
              state: 'failed',
              behindCount: 1,
              behindArtifacts: [behind('a', 2)],
            }),
          ],
          vi.fn(),
        );

        expect(
          screen.getByRole('button', { name: 'Update' }),
        ).toBeInTheDocument();
      });
    });

    describe('when a failure left nothing outstanding', () => {
      it('offers no push, since there would be nothing to send', () => {
        renderList([destination({ state: 'failed' })], vi.fn());

        expect(
          screen.queryByRole('button', { name: 'Update' }),
        ).not.toBeInTheDocument();
      });
    });

    it('offers nothing on a row that is up to date', () => {
      renderList([destination()], vi.fn());

      expect(
        screen.queryByRole('button', { name: 'Update' }),
      ).not.toBeInTheDocument();
    });

    describe('when a published copy has been overtaken', () => {
      const outdated = () =>
        destination({
          key: 'm:mkt-1',
          kind: 'marketplace',
          name: 'acme-marketplace',
          details: [],
          state: 'behind',
          installKey: null,
          hasWorkToSend: true,
        });

      it('offers to republish it, which is the verb of that channel', () => {
        renderList([outdated()], vi.fn());

        expect(
          screen.getByRole('button', { name: 'Republish' }),
        ).toBeInTheDocument();
      });

      it('can be put in a batch with the landings', async () => {
        const onUpdate = vi.fn();
        renderList(
          [
            outdated(),
            destination({
              key: 'r:repo-1',
              state: 'behind',
              behindCount: 1,
              behindArtifacts: [behind('a', 2)],
            }),
          ],
          onUpdate,
        );

        await userEvent.click(
          screen.getByRole('checkbox', { name: 'Select acme-marketplace' }),
        );
        await userEvent.click(
          screen.getByRole('button', { name: 'Select all 2' }),
        );
        await userEvent.click(
          screen.getByRole('button', { name: /Update 2 destinations/ }),
        );

        expect(onUpdate.mock.calls[0][0]).toHaveLength(2);
      });
    });

    describe('when a publication waits on a merge', () => {
      it('offers the pull request rather than a second publish', () => {
        renderList([
          destination({
            key: 'm:mkt-1',
            kind: 'marketplace',
            state: 'waiting',
            installKey: null,
            prUrl: 'https://github.com/acme/marketplace/pull/12',
          }),
        ]);

        expect(
          screen.getByRole('link', { name: 'Review the pull request' }),
        ).toHaveAttribute(
          'href',
          'https://github.com/acme/marketplace/pull/12',
        );
        expect(
          screen.queryByRole('button', { name: 'Update' }),
        ).not.toBeInTheDocument();
      });
    });
  });
});
