import React, { useState } from 'react';
import type { RefObject } from 'react';
import { PMIconButton } from '@packmind/ui';
import { LuCompass } from 'react-icons/lu';
import { useNavigate } from 'react-router';
import type { Space } from '@packmind/types';
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

  const handleJoinSpace = (spaceId: string) => {
    joinMutation.mutate({ spaceId });
  };

  return (
    <>
      <PMIconButton
        aria-label="Browse spaces"
        size="2xs"
        variant="ghost"
        onClick={() => setIsDrawerOpen(true)}
        data-testid="browse-spaces-trigger"
      >
        <LuCompass />
      </PMIconButton>
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
        onCreateSpace={() => {
          setIsDrawerOpen(false);
          setIsCreateDialogOpen(true);
        }}
        containerRef={containerRef}
      />
      <CreateSpaceDialog
        open={isCreateDialogOpen}
        setOpen={setIsCreateDialogOpen}
      />
    </>
  );
}
