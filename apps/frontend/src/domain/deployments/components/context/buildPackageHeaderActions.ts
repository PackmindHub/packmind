import { packageBehindInstallCount } from '../redesign/selectors/buildPackageDriftOverview';
import type { PackageLockProfile } from '../redesign/selectors/installLock';
import type { PackageDrift } from '../redesign/types';

/**
 * What the package-wide send control in the pane header is, once the drift is
 * known.
 *
 * There are two verbs here and they are not the same question. Reaching a new
 * place is open ended: you pick a destination, and it is a deliberate act.
 * Catching up where you already are is corrective: the destinations are known
 * and the only thing to decide is which of the stale ones.
 *
 * Still two acts, no longer two buttons. Side by side they read as one word
 * said twice: the header has no room to teach the distinction, so a reader sees
 * "send this package" written in two places and has to work out which one is
 * theirs. Where there is something to catch up, the pane draws them as one
 * split control instead, the corrective push on the wide half and the open
 * ended one behind the chevron. That leaves one send control in every state,
 * and it is the verb that changes with the state rather than the number of
 * buttons.
 */
export type PackageHeaderActions = {
  /**
   * How loudly the send control is drawn, chevron half included: two halves of
   * one button cannot disagree about their weight.
   *
   * Quiet in the one state with nothing to do, where the package is current and
   * already read somewhere. Anywhere else there is either drift to clear or a
   * package that has never left Packmind, and this control is the answer to it.
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
 * `Distribute` in the brand colour and then turns into `Distribute to 3
 * destinations`
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
    /*
     * Loud, where the same branch used to answer `secondary`. Back then the
     * menu was a button of its own beside a primary `Distribute`, and only one of
     * the two could carry the weight. It is now the chevron half of that same
     * button, so the weight is the whole control's and there is nothing left to
     * take it away from.
     */
    return {
      distributeVariant: 'primary',
      update: {
        count: behindCount,
        label: `Distribute to ${behindCount} destination${behindCount === 1 ? '' : 's'}`,
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
    'Packmind is already distributing to every drifted destination.',
  'all-no-app-token':
    'Every drifted destination is on a provider without a token. Update those with `packmind install`.',
};
