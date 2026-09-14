import { useMemo } from 'react';
import type { PackageId } from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { usePackageMarketplacePublications } from '@packmind/proprietary/frontend/domain/marketplaces/components/usePackageMarketplacePublications';
import { useSpaceMarketplaces } from '@packmind/proprietary/frontend/domain/spaces/components/overview/useSpaceMarketplaces';
import { installDriftEntries } from '../redesign/selectors/installDriftEntries';
import type { MarketplaceDrift, PackageDrift } from '../redesign/types';
import {
  buildPackageDestinations,
  type PackageDestination,
} from './buildPackageDestinations';
import { toPackagePublications } from './toPackagePublications';

/**
 * Every place a package stands, for whoever is asking.
 *
 * Lifted out of the Distribution tab the day a second reader wanted the same
 * answer: the Components tab states the package's reach in a line above its
 * list, and a reach counted twice from two different sets of rules is a pair of
 * numbers that disagree in front of the user. There is one definition of what a
 * destination is, and it lives here.
 *
 * Called from both places rather than lifted into the pane and passed down. The
 * queries underneath are shared by React Query, so the second caller costs a
 * recomputation and no request, and the pane is spared holding a fact neither
 * of its two halves would own.
 */
export function usePackageDestinations(
  packageId: PackageId,
  drift: PackageDrift | null,
): {
  destinations: PackageDestination[];
  /** The space's marketplaces, which a caller needs to address one of them. */
  marketplaces: MarketplaceDrift[];
  /**
   * The marketplace half has not answered yet.
   *
   * Worth waiting on rather than printing what the git side alone says: a
   * package published to a marketplace and installed nowhere would otherwise
   * be announced as standing nowhere, and a count that climbs from 11 to 13
   * once the fan-out lands is a number the reader has to watch settle.
   */
  isLoading: boolean;
} {
  const { organization } = useAuthContext();
  /*
   * An empty organization id disables the query rather than asking about
   * nobody's marketplaces, which is what lets this be called unconditionally
   * from a pane that can render without an organization.
   */
  const { publications, isLoading } = usePackageMarketplacePublications(
    organization?.id ?? '',
    packageId,
  );
  /*
   * Membership and staleness are two different questions, and only the first
   * has an answer scoped to this package: the publications say which
   * marketplaces carry it, the space's drift says which copies have been
   * overtaken. Both fan out over the same distribution queries, so React Query
   * answers the second from the cache of the first.
   */
  const { marketplaces } = useSpaceMarketplaces();

  const destinations = useMemo(
    () =>
      buildPackageDestinations({
        installs: drift ? installDriftEntries(drift) : [],
        publications: toPackagePublications(
          publications,
          marketplaces,
          packageId,
        ),
      }),
    [drift, publications, marketplaces, packageId],
  );

  return { destinations, marketplaces, isLoading };
}
