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

function destination(
  overrides: Partial<PackageDestination> = {},
): PackageDestination {
  return {
    key: 'r:repo-1::target-1',
    kind: 'repository',
    name: 'PackmindHub/packmind',
    details: ['main'],
    state: 'aligned',
    behindArtifacts: [],
    behindCount: 0,
    installKey: 'repo-1::target-1',
    prUrl: null,
    lastActivityAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  };
}

function renderList(
  destinations: PackageDestination[],
  onUpdate?: (destination: PackageDestination) => void,
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

      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ installKey: 'repo-1::target-1' }),
      );
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
