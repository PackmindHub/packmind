import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';

export const SPACES_MANAGEMENT_SCOPE = 'spaces-management' as const;

export enum SpacesManagementQueryKey {
  CREATE = 'create',
}

export const spacesManagementQueryKeys = {
  all: [ORGANIZATION_QUERY_SCOPE, SPACES_MANAGEMENT_SCOPE] as const,
};
