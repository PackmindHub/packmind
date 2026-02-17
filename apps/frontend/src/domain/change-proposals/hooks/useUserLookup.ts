import { useMemo } from 'react';
import { UserId } from '@packmind/types';
import { useGetUserStatusesQuery } from '../../accounts/api/queries/UserQueries';

export function useUserLookup(): Map<UserId, string> {
  const { data } = useGetUserStatusesQuery();

  return useMemo(() => {
    const map = new Map<UserId, string>();
    if (data?.userStatuses) {
      for (const user of data.userStatuses) {
        map.set(user.userId, user.email);
      }
    }
    return map;
  }, [data]);
}
