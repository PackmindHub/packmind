import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';
import { SpaceId, StandardId } from '@packmind/shared';
import { SPACES_SCOPE } from '../../spaces/api/queryKeys';

export const STANDARDS_QUERY_SCOPE = 'standards';

export enum StandardQueryKeys {
  LIST = 'list',
  GET_BY_ID = 'get-by-id',
  GET_VERSIONS = 'get-versions',
  GET_RULES_BY_STANDARD_ID = 'get-rules-by-standard-id',
}

export function getStandardsBySpaceKey(spaceId: SpaceId | undefined) {
  return [
    ORGANIZATION_QUERY_SCOPE,
    SPACES_SCOPE,
    spaceId,
    STANDARDS_QUERY_SCOPE,
  ];
}

export function getStandardByIdKey(
  spaceId: SpaceId | undefined,
  standardId: StandardId,
) {
  return [
    ORGANIZATION_QUERY_SCOPE,
    SPACES_SCOPE,
    spaceId,
    StandardQueryKeys.GET_BY_ID,
    standardId,
  ];
}

export const GET_STANDARD_VERSIONS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  STANDARDS_QUERY_SCOPE,
  StandardQueryKeys.GET_VERSIONS,
] as const;

export const GET_RULES_BY_STANDARD_ID_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  STANDARDS_QUERY_SCOPE,
  StandardQueryKeys.GET_RULES_BY_STANDARD_ID,
] as const;
