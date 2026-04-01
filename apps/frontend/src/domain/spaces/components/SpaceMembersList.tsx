import { useMemo } from 'react';

import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { SpaceMember, SpaceMembersTable } from './SpaceMembersTable';

export function SpaceMembersList() {
  const { user } = useAuthContext();
  const currentUserId = user?.id;

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

  return <SpaceMembersTable members={members} currentUserId={currentUserId} />;
}
