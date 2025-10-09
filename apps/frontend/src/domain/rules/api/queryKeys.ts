import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';

export const RULES_QUERY_SCOPE = 'rules';

export enum RuleQueryKeys {
  GET_RULE_EXAMPLES = 'get-rule-examples',
}

// Base query key arrays for reuse
export const GET_RULE_EXAMPLES_KEY = [
  ORGANIZATION_QUERY_SCOPE,
  RULES_QUERY_SCOPE,
  RuleQueryKeys.GET_RULE_EXAMPLES,
] as const;
