import { useMemo, useState } from 'react';
import { LuPlus } from 'react-icons/lu';

import { PMButton, PMIcon, PMPageSection, PMSpinner } from '@packmind/ui';

import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { useGetSpaceMembersQuery } from '../api/queries/SpacesQueries';
import { useCurrentSpace } from '../hooks/useCurrentSpace';
import { SpaceMember, SpaceMembersTable } from './SpaceMembersTable';
import { AddSpaceMembersDialog } from './AddSpaceMembersDialog';

export function SpaceMembersList() {
  const { user } = useAuthContext();
  const { spaceId } = useCurrentSpace();
  const currentUserId = user?.id;
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data, isLoading } = useGetSpaceMembersQuery(spaceId ?? '');

  const members = useMemo<SpaceMember[]>(
    () =>
      (data?.members ?? []).map((m) => ({
        id: m.userId,
        displayName: m.displayName,
        role: m.role,
      })),
    [data],
  );

  if (isLoading) {
    return <PMSpinner />;
  }

  return (
    <PMPageSection
      title="Members"
      backgroundColor="primary"
      cta={
        <PMButton
          variant="primary"
          size="sm"
          onClick={() => setAddDialogOpen(true)}
        >
          <PMIcon>
            <LuPlus />
          </PMIcon>
          Add members
        </PMButton>
      }
    >
      <SpaceMembersTable members={members} currentUserId={currentUserId} />
      <AddSpaceMembersDialog
        open={addDialogOpen}
        setOpen={setAddDialogOpen}
        spaceId={spaceId ?? ''}
        existingMembers={members}
      />
    </PMPageSection>
  );
}
