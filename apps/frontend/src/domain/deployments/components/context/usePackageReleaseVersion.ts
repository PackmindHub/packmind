import { useEffect, useRef, useState } from 'react';
import { pmToaster } from '@packmind/ui';
import {
  nextVersions,
  validatePackageReleaseVersion,
  type OrganizationId,
  type PackageId,
  type PackageReleaseReadiness,
  type PackageReleaseRefusalCode,
  type SpaceId,
} from '@packmind/types';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';
import { useCreatePackageReleaseMutation } from '../../api/queries/DeploymentsQueries';
import { getReleaseVerdictMessage } from '../../constants/messages';
import { readPackageReleaseRefusal } from '../../api/errors/packageReleaseRefusal';

/**
 * A package's next version as it is being typed, and the cut that takes it.
 *
 * Out of the release drawer because two forms now hold it: the drawer that only
 * cuts, and the one that cuts and sends the cut on in the same gesture. What
 * they share is everything about the version - how it is judged, what the
 * server last said about it, when it starts over - and what differs is only
 * what happens once the release exists.
 */
export function usePackageReleaseVersion({
  packageId,
  spaceId,
  organizationId,
  readiness,
  componentsCount,
  open,
}: Readonly<{
  packageId: PackageId;
  spaceId: SpaceId;
  organizationId: OrganizationId;
  readiness: PackageReleaseReadiness;
  componentsCount: number;
  /** Whether the form holding this is showing, so it can start over on reopen. */
  open: boolean;
}>) {
  /**
   * The patch increment, except on a first release where it is the minor.
   *
   * A package that has never been released counts as `0.0.0`, whose patch is
   * `0.0.1` - a number that reads as the fourth attempt at something rather
   * than the first thing shipped.
   */
  const defaultVersion =
    readiness.currentVersion === null
      ? readiness.nextVersions[1]
      : readiness.nextVersions[0];

  const [version, setVersion] = useState(defaultVersion);
  /**
   * A refusal and the version it was judged against. The client's own
   * pre-check judges against what the page last read; the server judges
   * against what it re-reads at that instant, and those two differ by exactly
   * the amount that matters when a release lands between the two.
   *
   * `currentVersion` is never null: a package that has never been released is
   * judged against `0.0.0`, which is also the version the server names back,
   * and a refusal carrying null renders no sentence at all.
   */
  const [refusal, setRefusal] = useState<{
    code: PackageReleaseRefusalCode;
    currentVersion: string;
  } | null>(null);
  /**
   * What the server said the current version was, the last time it refused.
   *
   * Once it has spoken it outranks `readiness`, which was read before the
   * release that caused the refusal existed. Without this the form goes on
   * judging against the stale version and refuses, locally and with the wrong
   * sentence, every version the server would now accept - there is no way out
   * of the drawer but a reload.
   */
  const [serverCurrentVersion, setServerCurrentVersion] = useState<
    string | null
  >(null);

  const createRelease = useCreatePackageReleaseMutation();
  const analytics = useAnalytics();

  const effectiveCurrentVersion =
    serverCurrentVersion ?? readiness.currentVersion;
  const suggestions = serverCurrentVersion
    ? nextVersions(serverCurrentVersion)
    : readiness.nextVersions;

  /**
   * A second opening starts from the suggestion again, not from the attempt
   * that was refused the first time.
   *
   * Only on the closed-to-open transition. `defaultVersion` also moves when
   * readiness is refetched, and running this then would wipe the refusal the
   * reader is still looking at.
   */
  const wasOpen = useRef(open);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setVersion(defaultVersion);
      setRefusal(null);
      setServerCurrentVersion(null);
    }
    wasOpen.current = open;
  }, [open, defaultVersion]);

  const judgedAgainst = effectiveCurrentVersion ?? '0.0.0';

  const refusalFor = (candidate: string) => {
    const refused = validatePackageReleaseVersion(candidate, judgedAgainst);
    return refused ? { code: refused, currentVersion: judgedAgainst } : null;
  };

  /**
   * Whether typing on could still land on a version the server would take.
   *
   * The three increments are the whole accepted set, so a value one of them
   * starts with is not wrong yet, only unfinished - `1.2` on the way to
   * `1.2.10`, or the empty field after a clear. Anything else can only get
   * worse by typing on, and is refused where it stands rather than at submit.
   */
  const mayStillBecomeValid = (candidate: string) =>
    suggestions.some((suggestion) => suggestion.startsWith(candidate));

  const changeVersion = (next: string) => {
    setVersion(next);
    setRefusal(mayStillBecomeValid(next) ? null : refusalFor(next));
  };

  // Leaving the field ends the benefit of the doubt an unfinished version got.
  const leaveVersion = () => {
    setRefusal(refusalFor(version));
  };

  /**
   * Cuts the version as it stands.
   *
   * Resolves to the version once the release exists, and to null when it does
   * not - refused here, refused by the server, or failed outright. It never
   * rejects: every way of not releasing has already been said on the form or
   * in a toast by the time it resolves, so the caller only has to know whether
   * to go on.
   */
  const release = async (): Promise<string | null> => {
    if (createRelease.isPending) return null;

    const refused = validatePackageReleaseVersion(version, judgedAgainst);

    if (refused) {
      setRefusal({ code: refused, currentVersion: judgedAgainst });
      analytics.track('package_release_refused', {
        packageId,
        attemptedVersion: version,
        refusalReason: refused,
      });
      return null;
    }

    setRefusal(null);

    try {
      await createRelease.mutateAsync({
        packageId,
        spaceId,
        organizationId,
        version,
      });
      analytics.track('package_version_released', {
        packageId,
        version,
        componentsCount,
        /*
         * Empty on purpose: readiness carries one verdict for the package and
         * no breakdown of which source moved, so there is nothing truthful to
         * name here.
         */
        changeSources: [],
      });
      pmToaster.create({
        type: 'success',
        title: `Released ${version}`,
      });
      return version;
    } catch (error) {
      const serverRefusal = readPackageReleaseRefusal(error);

      if (serverRefusal) {
        setRefusal(serverRefusal);
        setServerCurrentVersion(serverRefusal.currentVersion);
        analytics.track('package_release_refused', {
          packageId,
          attemptedVersion: version,
          refusalReason: serverRefusal.code,
        });
        return null;
      }

      pmToaster.create({
        type: 'error',
        title: `Couldn't release ${version}`,
        description: 'Try again, or check your space access.',
      });
      return null;
    }
  };

  return {
    version,
    suggestions,
    refusalMessage: refusal
      ? getReleaseVerdictMessage(refusal.code, refusal.currentVersion)
      : undefined,
    isPending: createRelease.isPending,
    changeVersion,
    leaveVersion,
    release,
  };
}

export type PackageReleaseVersion = ReturnType<typeof usePackageReleaseVersion>;
