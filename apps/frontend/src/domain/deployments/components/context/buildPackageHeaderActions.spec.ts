import { DistributionStatus } from '@packmind/types';
import type { InstallDriftReason, PackageDrift } from '../redesign/types';
import { buildPackageHeaderActions } from './buildPackageHeaderActions';

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

const build = (
  drift: PackageDrift | null,
  {
    isResolved = true,
    lockProfile = 'none' as const,
  }: Partial<Parameters<typeof buildPackageHeaderActions>[0]> = {},
) => buildPackageHeaderActions({ drift, isResolved, lockProfile });

describe('buildPackageHeaderActions', () => {
  describe('while the drift is not known', () => {
    it('offers no update', () => {
      expect(build(null, { isResolved: false }).update).toBeNull();
    });

    it('keeps the distribute menu quiet rather than guessing', () => {
      expect(build(null, { isResolved: false }).distributeVariant).toBe(
        'secondary',
      );
    });

    describe('when it already holds a drift that is behind', () => {
      it('stays quiet all the same', () => {
        const pkg = drift([
          { repo: 'r1', target: 't1', driftReason: 'behind' },
        ]);

        expect(build(pkg, { isResolved: false })).toEqual({
          distributeVariant: 'secondary',
          update: null,
        });
      });
    });
  });

  describe('when the package is nowhere yet', () => {
    it('gives the distribute menu the weight', () => {
      expect(build(null).distributeVariant).toBe('primary');
    });

    it('offers no update, since there is nothing to catch up', () => {
      expect(build(null).update).toBeNull();
    });
  });

  describe('when the package is distributed and current', () => {
    const pkg = drift(
      [{ repo: 'r1', target: 't1', driftReason: 'aligned' }],
      [{ repo: 'r1', target: 't1', status: DistributionStatus.success }],
    );

    it('takes the weight off the distribute menu', () => {
      expect(build(pkg).distributeVariant).toBe('secondary');
    });

    it('offers no update', () => {
      expect(build(pkg).update).toBeNull();
    });
  });

  describe('when one destination is behind', () => {
    const pkg = drift([{ repo: 'r1', target: 't1', driftReason: 'behind' }]);

    it('names it in the singular', () => {
      expect(build(pkg).update?.label).toBe('Update 1 destination');
    });

    it('carries the count for the caller to scope the push with', () => {
      expect(build(pkg).update?.count).toBe(1);
    });

    it('leaves the distribute menu quiet, so only one control is loud', () => {
      expect(build(pkg).distributeVariant).toBe('secondary');
    });
  });

  describe('when several destinations are behind', () => {
    const pkg = drift([
      { repo: 'r1', target: 't1', driftReason: 'behind' },
      { repo: 'r2', target: 't2', driftReason: 'behind' },
      { repo: 'r3', target: 't3', driftReason: 'behind' },
    ]);

    it('counts destinations rather than artifacts', () => {
      expect(build(pkg).update?.label).toBe('Update 3 destinations');
    });
  });

  describe('when every drifted destination is locked', () => {
    const pkg = drift([{ repo: 'r1', target: 't1', driftReason: 'behind' }]);

    it('still offers the update, so the flow can name the reason per row', () => {
      expect(
        build(pkg, { lockProfile: 'all-in-progress' }).update,
      ).not.toBeNull();
    });

    describe('when a distribution is already running on all of them', () => {
      it('says so', () => {
        expect(
          build(pkg, { lockProfile: 'all-in-progress' }).update?.lockTooltip,
        ).toBe(
          'A distribution is already in progress for every destination that is behind.',
        );
      });
    });

    describe('when no provider has a token', () => {
      it('points at the CLI', () => {
        expect(
          build(pkg, { lockProfile: 'all-no-app-token' }).update?.lockTooltip,
        ).toBe(
          'Every destination that is behind is on a provider without a token. Update those with `packmind install`.',
        );
      });
    });
  });

  describe('when at least one destination can still be pushed', () => {
    it('leaves the update unlocked', () => {
      const pkg = drift([{ repo: 'r1', target: 't1', driftReason: 'behind' }]);

      expect(build(pkg).update?.lockTooltip).toBeNull();
    });
  });
});
