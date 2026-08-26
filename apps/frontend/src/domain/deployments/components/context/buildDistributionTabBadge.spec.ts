import { DistributionStatus } from '@packmind/types';
import type { InstallDriftReason, PackageDrift } from '../redesign/types';
import { buildDistributionTabBadge } from './buildDistributionTabBadge';

type Destination = { repo: string; target: string };

const at = ({ repo, target }: Destination) => ({
  repo: { id: repo },
  target: { id: target },
});

const drift = (
  installs: Array<
    Destination & { driftReason: InstallDriftReason | 'aligned' }
  >,
  locations: Array<Destination & { status: DistributionStatus | null }> = [],
): PackageDrift =>
  ({
    artifacts: [
      {
        installs: installs.map(({ driftReason, ...destination }) => ({
          ...at(destination),
          driftReason,
        })),
      },
    ],
    installLocations: locations.map(({ status, ...destination }) => ({
      ...at(destination),
      lastDistributionStatus: status,
    })),
  }) as unknown as PackageDrift;

describe('buildDistributionTabBadge', () => {
  it('says nothing about a package with no distribution data', () => {
    expect(buildDistributionTabBadge(null)).toBeUndefined();
  });

  it('says nothing about a package aligned everywhere', () => {
    const pkg = drift(
      [{ repo: 'r1', target: 't1', driftReason: 'aligned' }],
      [{ repo: 'r1', target: 't1', status: DistributionStatus.success }],
    );

    expect(buildDistributionTabBadge(pkg)).toBeUndefined();
  });

  describe('when one destination is behind', () => {
    const pkg = drift([{ repo: 'r1', target: 't1', driftReason: 'behind' }]);

    it('counts it', () => {
      expect(buildDistributionTabBadge(pkg)?.text).toBe('1');
    });

    it('names what is wrong in the singular', () => {
      expect(buildDistributionTabBadge(pkg)?.tooltip).toBe(
        '1 destination behind',
      );
    });
  });

  describe('when two destinations of the same package are behind', () => {
    const pkg = drift([
      { repo: 'r1', target: 't1', driftReason: 'behind' },
      { repo: 'r2', target: 't1', driftReason: 'not-distributed' },
    ]);

    it('counts both', () => {
      expect(buildDistributionTabBadge(pkg)?.text).toBe('2');
    });

    it('names them in the plural', () => {
      expect(buildDistributionTabBadge(pkg)?.tooltip).toBe(
        '2 destinations behind',
      );
    });
  });

  it('counts a destination once however many of its artifacts drift', () => {
    const pkg = drift([
      { repo: 'r1', target: 't1', driftReason: 'behind' },
      { repo: 'r1', target: 't1', driftReason: 'needs-removal' },
    ]);

    expect(buildDistributionTabBadge(pkg)?.text).toBe('1');
  });

  it('separates two targets of the same repository', () => {
    const pkg = drift([
      { repo: 'r1', target: 't1', driftReason: 'behind' },
      { repo: 'r1', target: 't2', driftReason: 'behind' },
    ]);

    expect(buildDistributionTabBadge(pkg)?.text).toBe('2');
  });

  describe('when a destination only failed its last distribution', () => {
    const pkg = drift(
      [{ repo: 'r1', target: 't1', driftReason: 'aligned' }],
      [{ repo: 'r1', target: 't1', status: DistributionStatus.failure }],
    );

    it('counts it too, since it needs the same gesture', () => {
      expect(buildDistributionTabBadge(pkg)?.text).toBe('1');
    });

    it('names the failure rather than a lag', () => {
      expect(buildDistributionTabBadge(pkg)?.tooltip).toBe(
        '1 destination with a failed distribution',
      );
    });
  });

  describe('when the destination that failed is also behind', () => {
    const pkg = drift(
      [{ repo: 'r1', target: 't1', driftReason: 'behind' }],
      [{ repo: 'r1', target: 't1', status: DistributionStatus.failure }],
    );

    it('counts one destination rather than adding the two reasons up', () => {
      expect(buildDistributionTabBadge(pkg)?.text).toBe('1');
    });

    it('still states both reasons', () => {
      expect(buildDistributionTabBadge(pkg)?.tooltip).toBe(
        '1 destination behind, 1 with a failed distribution',
      );
    });
  });

  it('adds a failed destination to the behind ones', () => {
    const pkg = drift(
      [{ repo: 'r1', target: 't1', driftReason: 'behind' }],
      [{ repo: 'r2', target: 't1', status: DistributionStatus.failure }],
    );

    expect(buildDistributionTabBadge(pkg)?.text).toBe('2');
  });

  it('ignores a distribution that is merely in progress', () => {
    const pkg = drift(
      [{ repo: 'r1', target: 't1', driftReason: 'aligned' }],
      [{ repo: 'r1', target: 't1', status: DistributionStatus.in_progress }],
    );

    expect(buildDistributionTabBadge(pkg)).toBeUndefined();
  });
});
