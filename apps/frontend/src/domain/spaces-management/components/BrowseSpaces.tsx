import React, { useState } from 'react';
import type { RefObject } from 'react';
import { PMBox, pmToaster } from '@packmind/ui';
import { useNavigate } from 'react-router';
import { Space, SpaceId } from '@packmind/types';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { BrowseSpacesDrawer } from './BrowseSpacesDrawer';
import { CreateSpaceDialog } from './CreateSpaceDialog';
import {
  useBrowseSpacesQuery,
  useJoinSpaceMutation,
} from '../api/queries/SpacesManagementQueries';
import { routes } from '../../../shared/utils/routes';

interface BrowseSpacesProps {
  containerRef?: RefObject<HTMLElement | null>;
}

export function BrowseSpaces({
  containerRef,
}: Readonly<BrowseSpacesProps>): React.ReactElement {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { organization } = useAuthContext();
  const { data, isLoading, isError } = useBrowseSpacesQuery();
  const joinMutation = useJoinSpaceMutation();

  const handleSpaceClick = (space: Space) => {
    if (organization?.slug) {
      navigate(routes.space.toDashboard(organization.slug, space.slug));
    }
    setIsDrawerOpen(false);
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
      <PMBox
        as="button"
        fontSize="10px"
        color="text.faded"
        cursor="pointer"
        _hover={{ color: 'text.primary' }}
        transition="color 0.15s"
        onClick={() => setIsDrawerOpen(true)}
        data-testid="browse-spaces-trigger"
      >
        Browse
      </PMBox>
      <BrowseSpacesDrawer
        mySpaces={data?.mySpaces ?? []}
        allSpaces={data?.allSpaces ?? []}
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSpaceClick={handleSpaceClick}
        onJoinSpace={handleJoinSpace}
        isLoading={isLoading}
        isError={isError}
        isJoining={joinMutation.isPending}
        onCreateSpace={
          organization?.role === 'admin'
            ? () => {
                setIsDrawerOpen(false);
                setIsCreateDialogOpen(true);
              }
            : undefined
        }
        containerRef={containerRef}
      />
      {organization?.role === 'admin' && (
        <CreateSpaceDialog
          open={isCreateDialogOpen}
          setOpen={setIsCreateDialogOpen}
        />
      )}
    </>
  );
}
