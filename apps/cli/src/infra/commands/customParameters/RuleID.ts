import { Type } from 'cmd-ts';
import { createRuleId, RuleId } from '@packmind/types';

export const RuleID: Type<string, { standardSlug: string; ruleId: RuleId }> = {
  from: async (input) => {
    const match = input.match(/^@([^/]+)\/(.+)$/);
    if (!match) {
      throw new Error(
        'Error: Invalid --rule format. Expected format: @standard-slug/ruleId',
      );
    }
    return {
      standardSlug: match[1],
      ruleId: createRuleId(match[2]),
    };
  },
};
