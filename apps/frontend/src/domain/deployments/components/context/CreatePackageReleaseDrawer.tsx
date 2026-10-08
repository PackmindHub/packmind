import {
  PMButton,
  PMCloseButton,
  PMDrawer,
  PMHeading,
  PMPortal,
} from '@packmind/ui';
import type {
  OrganizationId,
  PackageId,
  PackageReleaseReadiness,
  SpaceId,
} from '@packmind/types';
import { PackageReleaseVersionField } from './PackageReleaseVersionField';
import { usePackageReleaseVersion } from './usePackageReleaseVersion';

const VERSION_FIELD_ID = 'create-package-release-version';

/**
 * Cuts a release of a package, and nothing else.
 *
 * The version itself - how it is typed, judged and refused - lives in
 * `usePackageReleaseVersion`, which the drawer that also sends the cut on
 * shares with this one.
 */
export function CreatePackageReleaseDrawer({
  packageId,
  spaceId,
  organizationId,
  readiness,
  componentsCount,
  open,
  onOpenChange,
  onReleased,
}: Readonly<{
  packageId: PackageId;
  spaceId: SpaceId;
  organizationId: OrganizationId;
  readiness: PackageReleaseReadiness;
  componentsCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The cut landed, for a caller that has something to do next with it.
   *
   * Called after the drawer has closed and after the mutation's own
   * invalidations have settled, so a caller reading the drift straight away
   * reads it with this release in it.
   *
   * Never called when the server refuses, which is what separates "a release
   * exists now" from "the reader is finished with this form".
   */
  onReleased?: (version: string) => void;
}>) {
  const release = usePackageReleaseVersion({
    packageId,
    spaceId,
    organizationId,
    readiness,
    componentsCount,
    open,
  });
  const { isPending } = release;

  const handleOpenChange = (next: boolean) => {
    if (isPending) return;
    onOpenChange(next);
  };

  const handleCreate = async () => {
    const released = await release.release();
    if (released === null) return;
    onOpenChange(false);
    onReleased?.(released);
  };

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
              <PackageReleaseVersionField
                id={VERSION_FIELD_ID}
                release={release}
                disabled={isPending}
                onSubmit={() => void handleCreate()}
              />
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
