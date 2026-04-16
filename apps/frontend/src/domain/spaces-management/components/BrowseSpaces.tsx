import React, { useState } from 'react';
import type { RefObject } from 'react';
import { pmToaster } from '@packmind/ui';
import { useNavigate } from 'react-router';
import { SpaceId, UserSpaceWithRole } from '@packmind/types';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { BrowseSpacesDrawer, BrowseSpacesTab } from './BrowseSpacesDrawer';
import { CreateSpaceDialog } from './CreateSpaceDialog';
import {
  useBrowseSpacesQuery,
  useJoinSpaceMutation,
  usePinSpaceMutation,
  useUnpinSpaceMutation,
} from '../api/queries/SpacesManagementQueries';
import { useGetSpacesQuery } from '../../spaces/api/queries/SpacesQueries';
import { routes } from '../../../shared/utils/routes';

interface BrowseSpacesProps {
  open: boolean;
  onClose: () => void;
  initialTab?: BrowseSpacesTab;
  containerRef?: RefObject<HTMLElement | null>;
}

export function BrowseSpaces({
  open,
  onClose,
  initialTab,
  containerRef,
}: Readonly<BrowseSpacesProps>): React.ReactElement {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { organization } = useAuthContext();
  const { data: browseData, isLoading, isError } = useBrowseSpacesQuery();
  const { data: mySpaces } = useGetSpacesQuery();
  const joinMutation = useJoinSpaceMutation();
  const pinMutation = usePinSpaceMutation();
  const unpinMutation = useUnpinSpaceMutation();

  const handleSpaceClick = (space: UserSpaceWithRole) => {
    if (organization?.slug) {
      navigate(routes.space.toDashboard(organization.slug, space.slug));
    }
    onClose();
  };

  const handleJoinSpace = (spaceId: SpaceId, spaceName: string) => {
    joinMutation.mutate(
      { spaceId },
      {
        onSuccess: () => {
          pmToaster.success({
            title: 'Joined!',
            description: `You've joined ${spaceName}.`,
          });
        },
        onError: () => {
          pmToaster.error({
            title: 'Failed to join',
            description: 'Something went wrong. Please try again.',
          });
        },
      },
    );
  };

  return (
    <>
      <BrowseSpacesDrawer
        mySpaces={mySpaces ?? []}
        allSpaces={browseData?.allSpaces ?? []}
        open={open}
        onClose={onClose}
        onSpaceClick={handleSpaceClick}
        onJoinSpace={handleJoinSpace}
        onPinSpace={(spaceId) => pinMutation.mutate({ spaceId })}
        onUnpinSpace={(spaceId) => unpinMutation.mutate({ spaceId })}
        isLoading={isLoading}
        isError={isError}
        isJoining={joinMutation.isPending}
        onCreateSpace={() => {
          onClose();
          setIsCreateDialogOpen(true);
        }}
        containerRef={containerRef}
        initialTab={initialTab}
      />
      <CreateSpaceDialog
        open={isCreateDialogOpen}
        setOpen={setIsCreateDialogOpen}
      />
    </>
  );
}
