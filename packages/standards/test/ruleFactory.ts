import { Factory } from '@packmind/shared/test';
import { v4 as uuidv4 } from 'uuid';
import { createRuleId, createStandardVersionId, Rule } from '@packmind/shared';

export const ruleFactory: Factory<Rule> = (rule?: Partial<Rule>) => {
  return {
    id: createRuleId(uuidv4()),
    content: 'Test rule content describing a coding standard',
    standardVersionId: createStandardVersionId(uuidv4()),
    ...rule,
  };
};
