import { useState } from 'react';
import {
  PMButton,
  PMCloseButton,
  PMDrawer,
  PMHeading,
  PMHStack,
  PMPortal,
  PMText,
  pmToaster,
  PMVStack,
} from '@packmind/ui';
import type { OrganizationId } from '@packmind/types';
import { PrivateLinkForm } from './PrivateLinkForm';

export interface LinkMarketplacePanelProps {
  organizationId: OrganizationId | string;
  /** Org slug used for deep links from the empty-providers branch. */
  orgSlug?: string;
}

/**
 * Drawer entry point for the link-marketplace flow.
 *
 * The drawer owns the open/close state so the route module stays a thin
 * composition. On a successful link, the drawer closes and a success toast
 * surfaces; the underlying `useLinkMarketplace` hook already invalidates the
 * marketplace list, so the index refreshes on its own.
 *
 * Only the private (connected-provider) path is exposed. The public-URL path
 * (`PublicLinkForm`) is intentionally not rendered: it submits an empty
 * `gitProviderId`, which the backend `LinkMarketplaceUseCase` rejects, so the
 * flow is a dead end until tokenless-provider resolution lands. The form is
 * kept in the tree so the tab can return once the backend supports it.
 */
export const LinkMarketplacePanel = ({
  organizationId,
  orgSlug,
}: Readonly<LinkMarketplacePanelProps>) => {
  const [open, setOpen] = useState(false);

  const handleLinked = () => {
    setOpen(false);
    pmToaster.create({
      type: 'success',
      title: 'Marketplace linked',
      description:
        'Plugins from this marketplace are now available to your organization.',
    });
  };

  return (
    <>
      <PMHStack justify="end" paddingY={3}>
        <PMButton variant="primary" onClick={() => setOpen(true)}>
          Link a marketplace
        </PMButton>
      </PMHStack>

      <PMDrawer.Root
        open={open}
        onOpenChange={(event) => setOpen(event.open)}
        placement="end"
        size="md"
      >
        <PMPortal>
          <PMDrawer.Backdrop />
          <PMDrawer.Positioner>
            <PMDrawer.Content>
              <PMDrawer.Header borderBottomWidth="1px">
                <PMVStack align="start" gap={1}>
                  <PMHeading level="h4">Link a marketplace</PMHeading>
                  <PMText variant="small" color="secondary">
                    Point Packmind at a Git repository that hosts a
                    marketplace.json descriptor. Plugins from that descriptor
                    become available to your organization.
                  </PMText>
                </PMVStack>
              </PMDrawer.Header>

              <PMDrawer.Body paddingTop={4}>
                <PrivateLinkForm
                  organizationId={organizationId}
                  orgSlug={orgSlug ?? ''}
                  onLinked={handleLinked}
                  onCancel={() => setOpen(false)}
                />
              </PMDrawer.Body>

              <PMDrawer.CloseTrigger asChild>
                <PMCloseButton size="sm" />
              </PMDrawer.CloseTrigger>
            </PMDrawer.Content>
          </PMDrawer.Positioner>
        </PMPortal>
      </PMDrawer.Root>
    </>
  );
};
