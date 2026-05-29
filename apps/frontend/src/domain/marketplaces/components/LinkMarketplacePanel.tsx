import { useState } from 'react';
import {
  PMBox,
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
import { PublicLinkForm } from './PublicLinkForm';

export interface LinkMarketplacePanelProps {
  organizationId: OrganizationId | string;
  /** Org slug used for deep links from the empty-providers branch. */
  orgSlug?: string;
}

type VisibilityTab = 'private' | 'public';

/**
 * Drawer + tabbed entry point for the link-marketplace flow.
 *
 * The drawer owns the open/close state and tab selection so the route module
 * stays a thin composition. On a successful link, the drawer closes and a
 * success toast surfaces; the underlying `useLinkMarketplace` hook already
 * invalidates the marketplace list, so the index refreshes on its own.
 */
export const LinkMarketplacePanel = ({
  organizationId,
  orgSlug,
}: Readonly<LinkMarketplacePanelProps>) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<VisibilityTab>('private');

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

              <PMBox paddingX={5} paddingTop={4}>
                <VisibilityTabs active={activeTab} onChange={setActiveTab} />
              </PMBox>

              <PMDrawer.Body paddingTop={4}>
                {activeTab === 'private' ? (
                  <PrivateLinkForm
                    organizationId={organizationId}
                    orgSlug={orgSlug ?? ''}
                    onLinked={handleLinked}
                    onCancel={() => setOpen(false)}
                  />
                ) : (
                  <PublicLinkForm
                    organizationId={organizationId}
                    onLinked={handleLinked}
                    onCancel={() => setOpen(false)}
                  />
                )}
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

interface VisibilityTabsProps {
  active: VisibilityTab;
  onChange: (tab: VisibilityTab) => void;
}

const TABS: Array<{ id: VisibilityTab; label: string; hint: string }> = [
  {
    id: 'private',
    label: 'Private',
    hint: 'Use a Git provider you have already connected.',
  },
  {
    id: 'public',
    label: 'Public',
    hint: 'Paste the URL of a publicly readable repository.',
  },
];

const VisibilityTabs = ({
  active,
  onChange,
}: Readonly<VisibilityTabsProps>) => {
  const helper = TABS.find((tab) => tab.id === active)?.hint ?? '';

  return (
    <PMVStack align="stretch" gap={2}>
      <PMHStack gap={2} role="tablist" aria-label="Link path">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <PMButton
              key={tab.id}
              variant={isActive ? 'primary' : 'tertiary'}
              size="sm"
              onClick={() => onChange(tab.id)}
              role="tab"
              aria-selected={isActive}
            >
              {tab.label}
            </PMButton>
          );
        })}
      </PMHStack>
      <PMText variant="small" color="faded">
        {helper}
      </PMText>
    </PMVStack>
  );
};
