import { packageBehindInstallCount } from '../redesign/selectors/buildPackageDriftOverview';
import type { PackageLockProfile } from '../redesign/selectors/installLock';
import type { PackageDrift } from '../redesign/types';

/**
 * What the two package-wide controls in the pane header are, once the drift is
 * known.
 *
 * There are two verbs here and they are not the same question. Reaching a new
 * place is open ended: you pick a destination, and it is a deliberate act.
 * Catching up where you already are is corrective: the destinations are known
 * and the only thing to decide is which of the stale ones. They used to share
 * the word "Distribute", one at the top of the pane and one under the list at
 * the bottom, both drawn as a primary. Naming them apart and giving only one of
 * them the weight at a time is the whole point of this.
 */
export type PackageHeaderActions = {
  /**
   * How loudly the `Distribute` menu is drawn.
   *
   * Primary only where there is nothing to correct and nowhere the package is
   * read from yet: getting it out is then the thing to do next. Everywhere else
   * it goes quiet, because either the package is current, or something louder
   * has the floor.
   */
  distributeVariant: 'primary' | 'secondary';
  /** The drift-clearing push, or null when nothing is behind. */
  update: {
    label: string;
    /** Destinations behind, which the label states and the caller scopes to. */
    count: number;
    /** Why it cannot run, or null when it can. */
    lockTooltip: string | null;
  } | null;
};

/**
 * `isResolved` is false while the drift query is out or has failed.
 *
 * Nothing is promoted then, and no count is stated. A header that reads
 * `Distribute` in the brand colour and then turns into `Update 3 destinations`
 * is a wrong answer followed by a right one, which is the same reason the chips
 * on the tab below show no count until they have one.
 */
export function buildPackageHeaderActions({
  drift,
  isResolved,
  lockProfile,
}: Readonly<{
  drift: PackageDrift | null;
  isResolved: boolean;
  lockProfile: PackageLockProfile;
}>): PackageHeaderActions {
  if (!isResolved) return { distributeVariant: 'secondary', update: null };

  const behindCount = drift ? packageBehindInstallCount(drift) : 0;
  if (behindCount > 0) {
    return {
      distributeVariant: 'secondary',
      update: {
        count: behindCount,
        label: `Update ${behindCount} destination${behindCount === 1 ? '' : 's'}`,
        lockTooltip: LOCK_TOOLTIP[lockProfile],
      },
    };
  }

  /*
   * Never distributed anywhere, which is not the same as up to date. The
   * package is readable in Packmind and by nothing else, so the one control on
   * screen is the one that changes that.
   */
  const isDistributedSomewhere = (drift?.installLocations.length ?? 0) > 0;
  return {
    distributeVariant: isDistributedSomewhere ? 'secondary' : 'primary',
    update: null,
  };
}

/**
 * `packageLockProfile` reports only the two cases where every drifted
 * destination is stuck for the same reason. A mix of the two leaves the button
 * live, and the flow it opens names the reason on each row and counts them, so
 * that lands on an explanation rather than on nothing.
 */
const LOCK_TOOLTIP: Record<PackageLockProfile, string | null> = {
  none: null,
  'all-in-progress':
    'A distribution is already in progress for every destination that is behind.',
  'all-no-app-token':
    'Every destination that is behind is on a provider without a token. Update those with `packmind install`.',
};
