import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';

export const SPACES_MANAGEMENT_SCOPE = 'spaces-management' as const;

export enum SpacesManagementQueryKey {
  CREATE = 'create',
  BROWSE = 'browse',
}

export const spacesManagementQueryKeys = {
  all: [ORGANIZATION_QUERY_SCOPE, SPACES_MANAGEMENT_SCOPE] as const,
  browse: (orgId: string) =>
    [
      ORGANIZATION_QUERY_SCOPE,
      SPACES_MANAGEMENT_SCOPE,
      SpacesManagementQueryKey.BROWSE,
      orgId,
    ] as const,
};
