import { DistributionStatus, type PackageId } from '@packmind/types';
import type { SpaceOutdatedPlugin } from '@packmind/proprietary/frontend/domain/spaces/components/overview/useSpaceOutdatedPlugins';
import type { InstallDriftReason, PackageDrift } from '../redesign/types';
import {
  buildPackageAttention,
  buildPackageAttentionIndex,
} from './buildPackageAttention';

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
  id = 'pkg-1',
): PackageDrift =>
  ({
    id,
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

const stalePlugin = (
  packageId: string,
  marketplaceId: string,
  pluginSlug = `${packageId}-plugin`,
): SpaceOutdatedPlugin =>
  ({
    marketplaceId,
    marketplaceName: marketplaceId,
    pluginSlug,
    packageId: packageId as PackageId,
    packageName: packageId,
  }) as SpaceOutdatedPlugin;

describe('buildPackageAttention', () => {
  it('says nothing about a package with no distribution data', () => {
    expect(buildPackageAttention(null)).toBeUndefined();
  });

  it('says nothing about a package aligned everywhere', () => {
    const pkg = drift(
      [{ repo: 'r1', target: 't1', driftReason: 'aligned' }],
      [{ repo: 'r1', target: 't1', status: DistributionStatus.success }],
    );

    expect(buildPackageAttention(pkg)).toBeUndefined();
  });

  describe('when one destination is drifted', () => {
    const pkg = drift([{ repo: 'r1', target: 't1', driftReason: 'behind' }]);

    it('counts it', () => {
      expect(buildPackageAttention(pkg)?.count).toBe(1);
    });

    it('names what is wrong in the singular', () => {
      expect(buildPackageAttention(pkg)?.tooltip).toBe(
        '1 distribution drifted',
      );
    });

    it('marks it as late rather than as broken', () => {
      expect(buildPackageAttention(pkg)?.tone).toBe('warning');
    });
  });

  describe('when two destinations of the same package are drifted', () => {
    const pkg = drift([
      { repo: 'r1', target: 't1', driftReason: 'behind' },
      { repo: 'r2', target: 't1', driftReason: 'not-distributed' },
    ]);

    it('counts both', () => {
      expect(buildPackageAttention(pkg)?.count).toBe(2);
    });

    it('names them in the plural', () => {
      expect(buildPackageAttention(pkg)?.tooltip).toBe(
        '2 distributions drifted',
      );
    });
  });

  it('counts a distribution once however many of its artifacts drift', () => {
    const pkg = drift([
      { repo: 'r1', target: 't1', driftReason: 'behind' },
      { repo: 'r1', target: 't1', driftReason: 'needs-removal' },
    ]);

    expect(buildPackageAttention(pkg)?.count).toBe(1);
  });

  it('separates two targets of the same repository', () => {
    const pkg = drift([
      { repo: 'r1', target: 't1', driftReason: 'behind' },
      { repo: 'r1', target: 't2', driftReason: 'behind' },
    ]);

    expect(buildPackageAttention(pkg)?.count).toBe(2);
  });

  describe('when a destination only failed its last distribution', () => {
    const pkg = drift(
      [{ repo: 'r1', target: 't1', driftReason: 'aligned' }],
      [{ repo: 'r1', target: 't1', status: DistributionStatus.failure }],
    );

    it('counts it too, since it needs the same gesture', () => {
      expect(buildPackageAttention(pkg)?.count).toBe(1);
    });

    it('names the failure rather than a lag', () => {
      expect(buildPackageAttention(pkg)?.tooltip).toBe(
        '1 distribution with a failed distribution',
      );
    });

    it('marks it as broken rather than as late', () => {
      expect(buildPackageAttention(pkg)?.tone).toBe('error');
    });
  });

  describe('when the destination that failed is also drifted', () => {
    const pkg = drift(
      [{ repo: 'r1', target: 't1', driftReason: 'behind' }],
      [{ repo: 'r1', target: 't1', status: DistributionStatus.failure }],
    );

    it('counts one distribution rather than adding the two reasons up', () => {
      expect(buildPackageAttention(pkg)?.count).toBe(1);
    });

    it('still states both reasons', () => {
      expect(buildPackageAttention(pkg)?.tooltip).toBe(
        '1 distribution drifted, 1 with a failed distribution',
      );
    });
  });

  it('adds a failed destination to the drifted ones', () => {
    const pkg = drift(
      [{ repo: 'r1', target: 't1', driftReason: 'behind' }],
      [{ repo: 'r2', target: 't1', status: DistributionStatus.failure }],
    );

    expect(buildPackageAttention(pkg)?.count).toBe(2);
  });

  it('ignores a distribution that is merely in progress', () => {
    const pkg = drift(
      [{ repo: 'r1', target: 't1', driftReason: 'aligned' }],
      [{ repo: 'r1', target: 't1', status: DistributionStatus.in_progress }],
    );

    expect(buildPackageAttention(pkg)).toBeUndefined();
  });

  describe('when a marketplace has drifted', () => {
    it('counts it on a package that lands nowhere else', () => {
      expect(buildPackageAttention(null, 1)?.count).toBe(1);
    });

    it('counts it apart from the repositories', () => {
      expect(buildPackageAttention(null, 2)?.tooltip).toBe(
        '2 marketplaces drifted',
      );
    });

    it('leaves it late rather than broken, as the rail beside it does', () => {
      expect(buildPackageAttention(null, 1)?.tone).toBe('warning');
    });

    it('adds it to the destinations that are drifted', () => {
      const pkg = drift([{ repo: 'r1', target: 't1', driftReason: 'behind' }]);

      expect(buildPackageAttention(pkg, 1)?.count).toBe(2);
    });

    it('keeps the two channels apart in what it says', () => {
      const pkg = drift([{ repo: 'r1', target: 't1', driftReason: 'behind' }]);

      expect(buildPackageAttention(pkg, 1)?.tooltip).toBe(
        '1 distribution drifted, 1 marketplace drifted',
      );
    });
  });
});

describe('buildPackageAttentionIndex', () => {
  it('holds no entry for a space where nothing needs a hand', () => {
    const aligned = drift([
      { repo: 'r1', target: 't1', driftReason: 'aligned' },
    ]);

    expect(buildPackageAttentionIndex([aligned], [])).toEqual(new Map());
  });

  it('keys a drifting package by its id', () => {
    const behind = drift(
      [{ repo: 'r1', target: 't1', driftReason: 'behind' }],
      [],
      'pkg-behind',
    );

    const index = buildPackageAttentionIndex([behind], []);

    expect(index.get('pkg-behind' as PackageId)?.count).toBe(1);
  });

  it('marks a package whose only problem is a stale plugin', () => {
    const index = buildPackageAttentionIndex(
      [],
      [stalePlugin('pkg-published', 'm1')],
    );

    expect(index.get('pkg-published' as PackageId)?.tooltip).toBe(
      '1 marketplace drifted',
    );
  });

  it('folds both channels of one package into a single entry', () => {
    const behind = drift(
      [{ repo: 'r1', target: 't1', driftReason: 'behind' }],
      [],
      'pkg-both',
    );

    const index = buildPackageAttentionIndex(
      [behind],
      [stalePlugin('pkg-both', 'm1')],
    );

    expect(index.get('pkg-both' as PackageId)?.count).toBe(2);
  });

  it('counts one marketplace once however many of its plugins are stale', () => {
    const index = buildPackageAttentionIndex(
      [],
      [
        stalePlugin('pkg-1', 'm1', 'plugin-a'),
        stalePlugin('pkg-1', 'm1', 'plugin-b'),
      ],
    );

    expect(index.get('pkg-1' as PackageId)?.count).toBe(1);
  });

  it('counts two marketplaces holding the same package separately', () => {
    const index = buildPackageAttentionIndex(
      [],
      [stalePlugin('pkg-1', 'm1'), stalePlugin('pkg-1', 'm2')],
    );

    expect(index.get('pkg-1' as PackageId)?.count).toBe(2);
  });
});
