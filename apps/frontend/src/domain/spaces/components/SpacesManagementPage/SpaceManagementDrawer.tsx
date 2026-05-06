import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PMCloseButton,
  PMConfirmationModal,
  PMDrawer,
  PMHeading,
  PMHStack,
  PMPortal,
  PMStatus,
  PMTabs,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { useQueryClient } from '@tanstack/react-query';
import type { SpaceManagementListItem } from '@packmind/types';

import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useGetSpaceMembersQuery } from '../../api/queries/SpacesQueries';
import { SpaceIdentitySection } from '../SpaceIdentitySection';
import { SpaceMembersList } from '../SpaceMembersList';
import { SpaceDangerZoneSection } from '../SpaceDangerZoneSection';

type DrawerTab = 'general' | 'members' | 'danger';

interface SpaceManagementDrawerProps {
  space: SpaceManagementListItem | null;
  onClose: () => void;
}

export function SpaceManagementDrawer({
  space,
  onClose,
}: Readonly<SpaceManagementDrawerProps>) {
  const queryClient = useQueryClient();
  const { user, organization } = useAuthContext();
  const [activeTab, setActiveTab] = useState<DrawerTab>('general');
  const [isIdentityDirty, setIsIdentityDirty] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const bypassDirtyCheckRef = useRef(false);

  const { data: membersData } = useGetSpaceMembersQuery(space?.id ?? '');

  const currentUserMember = membersData?.members?.find(
    (m) => m.userId === user?.id,
  );
  const isMember = !!currentUserMember;
  const isSpaceAdmin = currentUserMember?.role === 'admin';
  const isOrgAdmin = organization?.role === 'admin';
  const canEdit = isSpaceAdmin || isOrgAdmin;
  const canDelete = isSpaceAdmin || isOrgAdmin;

  const spaceId = space?.id;
  useEffect(() => {
    if (spaceId) {
      setActiveTab('general');
      setIsIdentityDirty(false);
      bypassDirtyCheckRef.current = false;
    }
  }, [spaceId]);

  const handleIdentityDirtyChange = useCallback((dirty: boolean) => {
    setIsIdentityDirty(dirty);
  }, []);

  const handleDeleted = () => {
    if (organization?.id) {
      queryClient.invalidateQueries({
        queryKey: ['organizations', organization.id, 'spaces', 'management'],
      });
    }
    bypassDirtyCheckRef.current = true;
    setIsIdentityDirty(false);
    onClose();
  };

  const handleLeft = () => {
    if (organization?.id) {
      queryClient.invalidateQueries({
        queryKey: ['organizations', organization.id, 'spaces', 'management'],
      });
    }
    bypassDirtyCheckRef.current = true;
    setIsIdentityDirty(false);
    onClose();
  };

  const requestClose = () => {
    if (bypassDirtyCheckRef.current) {
      bypassDirtyCheckRef.current = false;
      onClose();
      return;
    }
    if (isIdentityDirty) {
      setDiscardConfirmOpen(true);
      return;
    }
    onClose();
  };

  const handleConfirmDiscard = () => {
    bypassDirtyCheckRef.current = true;
    setDiscardConfirmOpen(false);
    setIsIdentityDirty(false);
    onClose();
  };

  const handleKeepEditing = () => {
    setDiscardConfirmOpen(false);
  };

  const tabs: {
    value: DrawerTab;
    triggerLabel: string;
    content: React.ReactNode;
  }[] = space
    ? [
        {
          value: 'general',
          triggerLabel: 'General',
          content: (
            <SpaceIdentitySection
              space={space}
              canEdit={canEdit}
              onDirtyChange={handleIdentityDirtyChange}
            />
          ),
        },
        {
          value: 'members',
          triggerLabel: 'Members',
          content: <SpaceMembersList space={space} isSpaceAdmin={canEdit} />,
        },
        ...(space.isDefaultSpace
          ? []
          : [
              {
                value: 'danger' as const,
                triggerLabel: 'Danger',
                content: (
                  <SpaceDangerZoneSection
                    space={space}
                    canDelete={canDelete}
                    isMember={isMember}
                    onDeleted={handleDeleted}
                    onLeft={handleLeft}
                  />
                ),
              },
            ]),
      ]
    : [];

  return (
    <>
      <PMDrawer.Root
        open={!!space}
        onOpenChange={(e) => {
          if (!e.open) {
            requestClose();
          }
        }}
        placement="end"
        size="lg"
      >
        <PMPortal>
          <PMDrawer.Backdrop />
          <PMDrawer.Positioner>
            <PMDrawer.Content>
              {space && (
                <>
                  <PMDrawer.Header>
                    <PMHStack gap={3} align="center" flex={1}>
                      <PMVStack gap={0.5} align="start" flex={1} minW={0}>
                        <PMHStack gap={2} align="center">
                          <PMStatus.Root colorPalette={space.color} as="span">
                            <PMStatus.Indicator />
                          </PMStatus.Root>
                          <PMHeading size="md">{space.name}</PMHeading>
                        </PMHStack>
                        <PMText fontSize="xs" color="faded">
                          {space.membersCount} member
                          {space.membersCount === 1 ? '' : 's'} ·{' '}
                          {space.artifactsCount} artifact
                          {space.artifactsCount === 1 ? '' : 's'}
                        </PMText>
                      </PMVStack>
                    </PMHStack>
                  </PMDrawer.Header>
                  <PMDrawer.Body padding={5}>
                    <PMTabs
                      defaultValue={activeTab}
                      value={activeTab}
                      onValueChange={(details: { value: string }) =>
                        setActiveTab(details.value as DrawerTab)
                      }
                      tabs={tabs}
                    />
                  </PMDrawer.Body>
                  <PMDrawer.CloseTrigger asChild>
                    <PMCloseButton size="sm" />
                  </PMDrawer.CloseTrigger>
                </>
              )}
            </PMDrawer.Content>
          </PMDrawer.Positioner>
        </PMPortal>
      </PMDrawer.Root>
      <PMConfirmationModal
        trigger={<span />}
        open={discardConfirmOpen}
        onOpenChange={({ open }) => {
          if (!open) {
            handleKeepEditing();
          }
        }}
        title="Discard changes?"
        message="Your unsaved identity changes will be lost."
        confirmText="Discard"
        cancelText="Keep editing"
        onConfirm={handleConfirmDiscard}
      />
    </>
  );
}
