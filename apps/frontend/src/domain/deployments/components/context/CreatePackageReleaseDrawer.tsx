import { useEffect, useState } from 'react';
import {
  PMButton,
  PMCloseButton,
  PMDrawer,
  PMField,
  PMHStack,
  PMHeading,
  PMInput,
  PMPortal,
  PMText,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import {
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

const VERSION_FIELD_ID = 'create-package-release-version';

/**
 * A package's next version, typed rather than picked.
 *
 * Free text with the three increments offered beside it: a masked input, a
 * stepper or a select would each rewrite what is being typed, and a version
 * mistyped on a keyboard whose comma sits where the period is expected would
 * be silently reshaped into something else. Nothing here transforms the value -
 * it is judged once, on submit, and kept when it is refused so the two
 * separators are fixed rather than the whole version retyped.
 */
export function CreatePackageReleaseDrawer({
  packageId,
  spaceId,
  organizationId,
  readiness,
  componentsCount,
  open,
  onOpenChange,
}: Readonly<{
  packageId: PackageId;
  spaceId: SpaceId;
  organizationId: OrganizationId;
  readiness: PackageReleaseReadiness;
  componentsCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
   */
  const [refusal, setRefusal] = useState<{
    code: PackageReleaseRefusalCode;
    currentVersion: string | null;
  } | null>(null);

  const createRelease = useCreatePackageReleaseMutation();
  const analytics = useAnalytics();

  const isPending = createRelease.isPending;

  /**
   * A second opening starts from the suggestion again, not from the attempt
   * that was refused the first time.
   */
  useEffect(() => {
    if (!open) return;
    setVersion(defaultVersion);
    setRefusal(null);
  }, [open, defaultVersion]);

  const handleOpenChange = (next: boolean) => {
    if (isPending) return;
    onOpenChange(next);
  };

  const handleCreate = async () => {
    if (isPending) return;

    const refused = validatePackageReleaseVersion(
      version,
      readiness.currentVersion ?? '0.0.0',
    );

    if (refused) {
      setRefusal({ code: refused, currentVersion: readiness.currentVersion });
      analytics.track('package_release_refused', {
        packageId,
        attemptedVersion: version,
        refusalReason: refused,
      });
      return;
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
      onOpenChange(false);
    } catch (error) {
      const serverRefusal = readPackageReleaseRefusal(error);

      if (serverRefusal) {
        setRefusal(serverRefusal);
        analytics.track('package_release_refused', {
          packageId,
          attemptedVersion: version,
          refusalReason: serverRefusal.code,
        });
        return;
      }

      pmToaster.create({
        type: 'error',
        title: `Couldn't release ${version}`,
        description: 'Try again, or check your space access.',
      });
    }
  };

  const refusalMessage = refusal
    ? getReleaseVerdictMessage(refusal.code, refusal.currentVersion)
    : undefined;

  return (
    <PMDrawer.Root
      open={open}
      onOpenChange={(details) => handleOpenChange(details.open)}
      closeOnInteractOutside={!isPending}
      placement="end"
      size="lg"
    >
      <PMPortal>
        <PMDrawer.Backdrop />
        <PMDrawer.Positioner>
          <PMDrawer.Content>
            <PMDrawer.Header>
              <PMHeading size="md">Create a release</PMHeading>
            </PMDrawer.Header>

            <PMDrawer.Body padding={5}>
              <PMVStack gap={5} alignItems="stretch">
                <PMField.Root required invalid={Boolean(refusalMessage)}>
                  <PMField.Label htmlFor={VERSION_FIELD_ID}>
                    Version
                    <PMField.RequiredIndicator />
                  </PMField.Label>
                  <PMInput
                    id={VERSION_FIELD_ID}
                    value={version}
                    onChange={(event) => setVersion(event.target.value)}
                    disabled={isPending}
                    autoFocus
                  />
                  {refusalMessage && (
                    <PMText fontSize="xs" color="error">
                      {refusalMessage}
                    </PMText>
                  )}
                </PMField.Root>

                <PMHStack gap={2}>
                  {readiness.nextVersions.map((nextVersion) => (
                    <PMButton
                      key={nextVersion}
                      variant="secondary"
                      size="sm"
                      disabled={isPending}
                      onClick={() => setVersion(nextVersion)}
                    >
                      {nextVersion}
                    </PMButton>
                  ))}
                </PMHStack>
              </PMVStack>
            </PMDrawer.Body>

            <PMDrawer.Footer>
              <PMButton
                variant="tertiary"
                size="sm"
                disabled={isPending}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </PMButton>
              <PMButton
                variant="primary"
                size="sm"
                disabled={isPending}
                loading={isPending}
                onClick={() => void handleCreate()}
              >
                Release
              </PMButton>
            </PMDrawer.Footer>

            <PMDrawer.CloseTrigger asChild>
              <PMCloseButton size="sm" disabled={isPending} />
            </PMDrawer.CloseTrigger>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
}
