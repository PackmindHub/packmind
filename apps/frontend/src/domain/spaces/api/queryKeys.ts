import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';

export const SPACES_SCOPE = 'spaces' as const;

export enum SpaceQueryKey {
  LIST = 'list',
  DETAIL = 'detail',
}

export const spacesQueryKeys = {
  all: [ORGANIZATION_QUERY_SCOPE, SPACES_SCOPE] as const,
  lists: () => [...spacesQueryKeys.all, SpaceQueryKey.LIST] as const,
  list: (orgId: string) => [...spacesQueryKeys.lists(), orgId] as const,
  details: () => [...spacesQueryKeys.all, SpaceQueryKey.DETAIL] as const,
  detail: (orgId: string, spaceSlug: string) =>
    [...spacesQueryKeys.details(), orgId, spaceSlug] as const,
};
