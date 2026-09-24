import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIProvider } from '@packmind/ui';
import { PackageReachStrip } from './PackageReachStrip';
import type { PackageDestination } from './buildPackageDestinations';

/*
 * The strip is mounted for real inside `ContextPackagePane`, which stands it up
 * behind six mocked queries and a non-empty component list. What is read here
 * is one line of copy over a set of rows, so the rows are handed to it
 * directly.
 */
/*
 * Anchored on the current year for the reason the list spec is: `reportDay`
 * prints the year only when it is not this one.
 */
const THIS_YEAR = new Date().getFullYear();
const STALE_THIS_YEAR = `${THIS_YEAR}-03-12T10:00:00.000Z`;
const LESS_STALE = `${THIS_YEAR}-07-04T10:00:00.000Z`;

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
    hasWorkToSend: false,
    installKey: 'repo-1::target-1',
    prUrl: null,
    lastActivityAt: '2026-09-01T10:00:00.000Z',
    hasStaleReport: false,
    ...overrides,
  };
}

function renderStrip(destinations: PackageDestination[]) {
  return render(
    <UIProvider>
      <PackageReachStrip
        destinations={destinations}
        isLoading={false}
        onOpenDistribution={vi.fn()}
      />
    </UIProvider>,
  );
}

describe('PackageReachStrip', () => {
  it('says how far the package reaches', () => {
    renderStrip([destination({ key: 'a' }), destination({ key: 'b' })]);

    expect(screen.getByText('Reaches 2 destinations')).toBeInTheDocument();
  });

  describe('when every destination is up to date and recently reported', () => {
    it('says so and nothing more', () => {
      renderStrip([destination({ key: 'a' }), destination({ key: 'b' })]);

      expect(screen.getByText('· all up to date')).toBeInTheDocument();
    });
  });

  describe('when the oldest report in the roll-up has gone stale', () => {
    const aged = () => [
      destination({ key: 'a' }),
      destination({
        key: 'b',
        hasStaleReport: true,
        lastActivityAt: STALE_THIS_YEAR,
      }),
      destination({
        key: 'c',
        hasStaleReport: true,
        lastActivityAt: LESS_STALE,
      }),
    ];

    it('names the oldest of them, which is how current the whole set is', () => {
      renderStrip(aged());

      expect(
        screen.getByText('· all up to date, oldest report 12 Mar'),
      ).toBeInTheDocument();
    });

    it('puts the instant one hover away, as the rows do', () => {
      renderStrip(aged());

      expect(
        screen.getByText('· all up to date, oldest report 12 Mar'),
      ).toHaveAttribute(
        'title',
        expect.stringContaining(`Oldest report Mar 12, ${THIS_YEAR}`),
      );
    });
  });

  describe('when something needs a hand', () => {
    it('says that instead, since the age is the smaller of the two', () => {
      renderStrip([
        destination({
          key: 'a',
          state: 'behind',
          behindCount: 1,
          hasWorkToSend: true,
        }),
        destination({
          key: 'b',
          hasStaleReport: true,
          lastActivityAt: STALE_THIS_YEAR,
        }),
      ]);

      expect(screen.getByText('1 needs a hand')).toBeInTheDocument();
      expect(screen.queryByText(/oldest report/)).not.toBeInTheDocument();
    });
  });
});
