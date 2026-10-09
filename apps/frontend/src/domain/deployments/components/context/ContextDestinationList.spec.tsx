import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import type { DriftArtifactEntry } from '../redesign/selectors/installDriftEntries';
import type { ArtifactDrift } from '../redesign/types';
import {
  ContextDestinationList,
  UPDATE_NEEDS_A_RELEASE,
} from './ContextDestinationList';
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
    remedy: 'none' as const,
    canReleaseAndUpdate: false,
    installKey: 'repo-1::target-1',
    prUrl: null,
    failureReason: null,
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
    // Follows what there is to send, unless a test is about the release case.
    remedy:
      overrides.remedy ??
      ((overrides.hasWorkToSend ?? row.behindCount > 0) ? 'update' : 'none'),
  };
}

function renderList(
  destinations: PackageDestination[],
  onUpdate?: (destinations: readonly PackageDestination[]) => void,
  {
    onReleaseAndUpdate,
  }: {
    onReleaseAndUpdate?: (destinations: readonly PackageDestination[]) => void;
  } = {},
) {
  return render(
    <UIProvider>
      <ContextDestinationList
        destinations={destinations}
        onUpdate={onUpdate}
        onReleaseAndUpdate={onReleaseAndUpdate}
      />
    </UIProvider>,
  );
}

describe('ContextDestinationList', () => {
  it('reads a repository and a marketplace as rows of one list', () => {
    renderList([
      destination({
        state: 'drifted',
        behindCount: 1,
        behindArtifacts: [behind('a', 2)],
      }),
      destination({
        key: 'm:mkt-1',
        kind: 'marketplace',
        name: 'packmind-marketplace',
        details: [],
        state: 'drifted',
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
        destination({ key: 'b', state: 'drifted', behindCount: 1 }),
      ]);

      expect(screen.getByText('Failed')).toBeInTheDocument();
      expect(screen.getByText('Behind or waiting')).toBeInTheDocument();
    });

    it('leaves out a band with nothing in it', () => {
      renderList([destination({ state: 'drifted', behindCount: 1 })]);

      expect(screen.queryByText('Failed')).not.toBeInTheDocument();
    });

    it('says what share of the destinations it holds', () => {
      renderList([
        destination({ key: 'a', state: 'drifted', behindCount: 1 }),
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
        state: 'drifted',
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
          destination({ key: 'a', state: 'drifted', behindCount: 1 }),
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
          destination({ key: 'a', state: 'drifted', behindCount: 1 }),
          destination({ key: 'b', state: 'drifted', behindCount: 1 }),
        ]);

        expect(
          screen.queryByRole('button', { name: /Repositories/ }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole('button', { name: /Needs a hand/ }),
        ).not.toBeInTheDocument();
      });

      it('drops the whole row when only "all" is left, rather than heading the list with a control', () => {
        renderList([destination({ state: 'drifted', behindCount: 1 })]);

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
        state: 'drifted',
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
          state: 'drifted',
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
          state: 'drifted',
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
            state: 'drifted',
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
        state: 'drifted',
        behindCount: 1,
        behindArtifacts: [behind('a', 2)],
      }),
      destination({
        key: 'b',
        name: 'acme/two',
        installKey: 'repo-2::t2',
        state: 'drifted',
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
        state: 'drifted',
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
            state: 'drifted',
            installKey: null,
          }),
        ]);

        expect(
          screen.queryByRole('button', { name: /what is behind/ }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('why a failed row is red', () => {
    const REASON =
      'Push rejected: branch protection on main requires a pull request';

    const rejected = (overrides: Partial<PackageDestination> = {}) =>
      destination({
        name: 'acme/checkout-api',
        state: 'failed',
        failureReason: REASON,
        ...overrides,
      });

    it('invites the reader to ask, on the row that raised the question', () => {
      renderList([rejected()]);

      expect(screen.getByText('Why?')).toBeInTheDocument();
    });

    it('keeps the message folded until it is asked for', () => {
      renderList([rejected()]);

      expect(screen.queryByText(REASON)).not.toBeInTheDocument();
    });

    it('reads the message out on the row, with no drawer to open', async () => {
      renderList([rejected()]);

      await userEvent.click(
        screen.getByRole('button', {
          name: 'Show why the last distribution failed on acme/checkout-api',
        }),
      );

      expect(screen.getByText(REASON)).toBeInTheDocument();
    });

    it('opens a failure that left nothing behind it, which the drift alone would fold shut', async () => {
      renderList([rejected({ behindCount: 0, behindArtifacts: [] })]);

      await userEvent.click(
        screen.getByRole('button', {
          name: 'Show why the last distribution failed on acme/checkout-api',
        }),
      );

      expect(screen.getByText(REASON)).toBeInTheDocument();
    });

    it('still lists what is behind under the message that explains it', async () => {
      renderList([
        rejected({
          behindCount: 1,
          behindArtifacts: [behind('feature-flags-audit', 5)],
        }),
      ]);

      await userEvent.click(
        screen.getByRole('button', {
          name: 'Show why the last distribution failed on acme/checkout-api',
        }),
      );

      expect(screen.getByText(REASON)).toBeInTheDocument();
      expect(screen.getByText('feature-flags-audit')).toBeInTheDocument();
    });

    describe('when the failure came with no message', () => {
      it('asks nothing it cannot answer', () => {
        renderList([rejected({ failureReason: null })]);

        expect(screen.queryByText('Why?')).not.toBeInTheDocument();
      });

      it('falls back to the drift for whether the row opens at all', () => {
        renderList([
          rejected({
            failureReason: null,
            behindCount: 0,
            behindArtifacts: [],
          }),
        ]);

        expect(
          screen.queryByRole('button', { name: /^Show /, hidden: false }),
        ).not.toBeInTheDocument();
      });
    });

    describe('when the caller can show the distribution events', () => {
      it('offers the whole run under the message, for the reader the message did not satisfy', async () => {
        const onOpenHistory = vi.fn();
        render(
          <UIProvider>
            <ContextDestinationList
              destinations={[rejected()]}
              onOpenHistory={onOpenHistory}
            />
          </UIProvider>,
        );

        await userEvent.click(
          screen.getByRole('button', {
            name: 'Show why the last distribution failed on acme/checkout-api',
          }),
        );
        await userEvent.click(
          screen.getByRole('button', { name: 'See the full run' }),
        );

        expect(onOpenHistory).toHaveBeenCalledTimes(1);
      });
    });

    describe('when the caller has no events to show', () => {
      it('does not offer a way out that goes nowhere', async () => {
        renderList([rejected()]);

        await userEvent.click(
          screen.getByRole('button', {
            name: 'Show why the last distribution failed on acme/checkout-api',
          }),
        );

        expect(
          screen.queryByRole('button', { name: 'See the full run' }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('what a row pinned to a release says', () => {
    const pinned = (
      remedy: 'update' | 'release',
      canReleaseAndUpdate = false,
    ) =>
      destination({
        state: 'behind',
        behindCount: 0,
        remedy,
        canReleaseAndUpdate,
        hasWorkToSend: remedy === 'update',
      });

    describe('when a newer release exists', () => {
      it('says so rather than naming components', () => {
        renderList([pinned('update')]);

        expect(
          screen.getByText('A newer release is available'),
        ).toBeInTheDocument();
      });
    });

    describe('when it sits on the newest release there is', () => {
      it('says the package has changes left to release', () => {
        renderList([pinned('release', true)]);

        expect(
          screen.getByText(
            'On the newest release; the package has changes to release',
          ),
        ).toBeInTheDocument();
      });

      /*
       * It could not be ticked while `hasWorkToSend` alone decided that, so it
       * never reached the bar and the bar never had a reason to offer the cut.
       * These are the rows that gesture exists for.
       */
      it('can be ticked, so the bar can offer the cut for it', () => {
        renderList([pinned('release', true)], vi.fn());

        expect(
          screen.getByRole('checkbox', {
            name: 'Select PackmindHub/packmind',
          }),
        ).toBeInTheDocument();
      });
    });

    describe('wherever it stands', () => {
      it('offers no action of its own', () => {
        renderList([pinned('release', true)], vi.fn());

        expect(
          screen.queryByRole('button', { name: /Update/ }),
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
            state: 'drifted',
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

  describe('what a row offers on its own', () => {
    /*
     * Nothing, since the gestures moved to the bar. The row still says what is
     * wrong with it; acting on that is a pick away.
     */
    it('offers no push, however far behind it is', () => {
      renderList(
        [
          destination({
            state: 'drifted',
            behindCount: 1,
            behindArtifacts: [behind('a', 2)],
          }),
        ],
        vi.fn(),
      );

      expect(
        screen.queryByRole('button', { name: 'Update' }),
      ).not.toBeInTheDocument();
    });

    it('offers no republish on an overtaken published copy', () => {
      renderList(
        [
          destination({
            key: 'm:mkt-1',
            kind: 'marketplace',
            name: 'acme-marketplace',
            details: [],
            state: 'drifted',
            installKey: null,
            hasWorkToSend: true,
          }),
        ],
        vi.fn(),
      );

      expect(
        screen.queryByRole('button', { name: 'Republish' }),
      ).not.toBeInTheDocument();
    });

    it('still says what a failure left behind', () => {
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

    /*
     * The one thing that stays, because it is not a gesture on the package: a
     * publication waiting on a merge can take nothing, and the page where
     * someone finishes it is navigation.
     */
    describe('when a publication waits on a merge', () => {
      it('offers the pull request', () => {
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
      });
    });
  });

  describe('the way into a gesture', () => {
    /*
     * The rows carry no controls, so the checkbox is the only thing on screen
     * saying anything can be done to a destination at all. Revealed on hover,
     * as the other lists reveal theirs, it would be a feature nobody finds.
     */
    it('shows the checkbox before anything is picked', () => {
      renderList(
        [
          destination({
            name: 'acme/one',
            state: 'drifted',
            behindCount: 1,
            behindArtifacts: [behind('a', 2)],
          }),
        ],
        vi.fn(),
      );

      expect(
        screen.getByRole('checkbox', { name: 'Select acme/one' }),
      ).toBeVisible();
    });

    it('shows none on a row no gesture could move', () => {
      renderList([destination({ name: 'acme/fine' })], vi.fn());

      expect(
        screen.queryByRole('checkbox', { name: 'Select acme/fine' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('what the bar offers over a pick', () => {
    const drifted = (key: string, name: string) =>
      destination({
        key,
        name,
        installKey: `${key}::t1`,
        state: 'drifted',
        behindCount: 1,
        behindArtifacts: [behind('a', 2)],
        hasWorkToSend: true,
        remedy: 'update',
      });

    /** Pinned to a release that has been overtaken, with work done since. */
    const releaseBehind = (key: string, name: string) =>
      destination({
        key,
        name,
        installKey: `${key}::t1`,
        state: 'behind',
        behindCount: 0,
        remedy: 'update',
        canReleaseAndUpdate: true,
        hasWorkToSend: true,
      });

    const needsARelease = (key: string, name: string) =>
      destination({
        key,
        name,
        installKey: `${key}::t1`,
        state: 'behind',
        behindCount: 0,
        remedy: 'release',
        canReleaseAndUpdate: true,
        hasWorkToSend: false,
      });

    const pick = async (name: string) =>
      userEvent.click(screen.getByRole('checkbox', { name: `Select ${name}` }));

    describe('when nothing picked would take a cut', () => {
      it('still draws the cut, greyed, so the bar keeps its shape', async () => {
        renderList([drifted('a', 'acme/one')], vi.fn(), {
          onReleaseAndUpdate: vi.fn(),
        });

        await pick('acme/one');

        expect(
          screen.getByRole('button', { name: 'Release & Update' }),
        ).toBeDisabled();
      });

      it('offers the plain push beside it', async () => {
        const onUpdate = vi.fn();
        renderList([drifted('a', 'acme/one')], onUpdate, {
          onReleaseAndUpdate: vi.fn(),
        });

        await pick('acme/one');
        await userEvent.click(screen.getByRole('button', { name: 'Update' }));

        expect(onUpdate.mock.calls[0][0]).toHaveLength(1);
      });
    });

    describe('when one picked destination would take a cut', () => {
      const mixed = () => [
        drifted('a', 'acme/one'),
        needsARelease('b', 'acme/two'),
      ];

      it('offers the cut', async () => {
        renderList(mixed(), vi.fn(), { onReleaseAndUpdate: vi.fn() });

        await pick('acme/two');

        expect(
          screen.getByRole('button', { name: 'Release & Update' }),
        ).toBeEnabled();
      });

      it('offers the plain push beside it', async () => {
        renderList(mixed(), vi.fn(), { onReleaseAndUpdate: vi.fn() });

        await pick('acme/two');

        expect(
          screen.getByRole('button', { name: 'Update' }),
        ).toBeInTheDocument();
      });

      it('leads with the cut, which is the one that makes the pick current', async () => {
        renderList(mixed(), vi.fn(), { onReleaseAndUpdate: vi.fn() });

        await pick('acme/two');

        const actions = screen
          .getAllByRole('button')
          .map((button) => button.textContent)
          .filter((label) =>
            ['Update', 'Release & Update'].includes(label ?? ''),
          );

        expect(actions).toEqual(['Release & Update', 'Update']);
      });

      it('hands the whole pick to the cut, not only the rows that need one', async () => {
        const onReleaseAndUpdate = vi.fn();
        renderList(mixed(), vi.fn(), { onReleaseAndUpdate });

        await pick('acme/one');
        await pick('acme/two');
        await userEvent.click(
          screen.getByRole('button', { name: 'Release & Update' }),
        );

        expect(onReleaseAndUpdate.mock.calls[0][0]).toHaveLength(2);
      });
    });

    /*
     * Releases 0.1.0 and 0.1.1, with work done since: `/` sits on 0.1.0 and
     * can take 0.1.1 or a new cut, `/app/` sits on 0.1.1 and only a cut moves it.
     */
    describe('a package whose newest release is itself behind', () => {
      const landings = () => [
        releaseBehind('root', 'acme/root'),
        needsARelease('app', 'acme/app'),
      ];

      describe('picking the destination on the newest release', () => {
        it('disables the plain push, which would send it nothing', async () => {
          renderList(landings(), vi.fn(), { onReleaseAndUpdate: vi.fn() });

          await pick('acme/app');

          expect(screen.getByRole('button', { name: 'Update' })).toBeDisabled();
        });

        it('keeps the cut available', async () => {
          renderList(landings(), vi.fn(), { onReleaseAndUpdate: vi.fn() });

          await pick('acme/app');

          expect(
            screen.getByRole('button', { name: 'Release & Update' }),
          ).toBeEnabled();
        });

        it('explains on hover that a release has to be cut first', async () => {
          renderList(landings(), vi.fn(), { onReleaseAndUpdate: vi.fn() });

          await pick('acme/app');
          await userEvent.hover(
            screen.getByRole('button', { name: 'Update' }).parentElement!,
          );

          expect(
            await screen.findByText(UPDATE_NEEDS_A_RELEASE),
          ).toBeInTheDocument();
        });
      });

      describe('picking the destination on an older release', () => {
        it('enables the plain push', async () => {
          renderList(landings(), vi.fn(), { onReleaseAndUpdate: vi.fn() });

          await pick('acme/root');

          expect(screen.getByRole('button', { name: 'Update' })).toBeEnabled();
        });

        it('enables the cut', async () => {
          renderList(landings(), vi.fn(), { onReleaseAndUpdate: vi.fn() });

          await pick('acme/root');

          expect(
            screen.getByRole('button', { name: 'Release & Update' }),
          ).toBeEnabled();
        });
      });

      describe('picking both', () => {
        it('disables the plain push', async () => {
          renderList(landings(), vi.fn(), { onReleaseAndUpdate: vi.fn() });

          await pick('acme/root');
          await pick('acme/app');

          expect(screen.getByRole('button', { name: 'Update' })).toBeDisabled();
        });
      });
    });

    describe('when the caller cannot cut a release', () => {
      it('disables the counted push for a destination only a cut would move', async () => {
        renderList([needsARelease('b', 'acme/two')], vi.fn());

        await pick('acme/two');

        expect(
          screen.getByRole('button', { name: /Update 1 destination/ }),
        ).toBeDisabled();
      });
    });
  });
});
