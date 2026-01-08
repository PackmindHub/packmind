import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';

export const SKILLS_QUERY_SCOPE = 'skills';

export enum SkillQueryKeys {
  LIST = 'list',
}

export const GET_SKILLS_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  SKILLS_QUERY_SCOPE,
  SkillQueryKeys.LIST,
] as const;
