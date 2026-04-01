import { useMemo, useState } from 'react';
import { LuPlus } from 'react-icons/lu';
import { useParams } from 'react-router';

import { PMButton, PMIcon, PMPageSection } from '@packmind/ui';

import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { SpaceMember, SpaceMembersTable } from './SpaceMembersTable';
import { AddSpaceMembersDialog } from './AddSpaceMembersDialog';

export function SpaceMembersList() {
  const { user } = useAuthContext();
  const { spaceSlug } = useParams<{ spaceSlug: string }>();
  const currentUserId = user?.id;
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // TODO: replace with actual data fetching
  const members = useMemo<SpaceMember[]>(
    () => [
      ...(currentUserId
        ? [
            {
              id: currentUserId,
              displayName: user?.email ?? 'me',
              role: 'admin' as const,
            },
          ]
        : []),
      { id: '1', displayName: 'john.doe', role: 'admin' },
      { id: '2', displayName: 'jane.smith', role: 'member' },
      { id: '3', displayName: 'bob.martin', role: 'member' },
    ],
    [currentUserId, user?.email],
  );

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
        spaceSlug={spaceSlug ?? ''}
        existingMembers={members}
      />
    </PMPageSection>
  );
}
