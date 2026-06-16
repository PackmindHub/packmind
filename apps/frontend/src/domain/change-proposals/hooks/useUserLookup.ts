import { useMemo } from 'react';
import { UserId } from '@packmind/types';
import { useGetUsersInMyOrganizationQuery } from '../../accounts/api/queries/UserQueries';

export function useUserLookup(): Map<UserId, string> {
  const { data } = useGetUsersInMyOrganizationQuery();

  return useMemo(() => {
    const map = new Map<UserId, string>();
    if (data?.users) {
      for (const user of data.users) {
        map.set(user.userId, user.displayName);
      }
    }
    return map;
  }, [data]);
}
