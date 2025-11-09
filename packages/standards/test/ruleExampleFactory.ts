import { Factory } from '@packmind/test-utils';
import {
  RuleExample,
  createRuleExampleId,
  createRuleId,
  ProgrammingLanguage,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export const ruleExampleFactory: Factory<RuleExample> = (
  ruleExample?: Partial<RuleExample>,
) => {
  return {
    id: createRuleExampleId(uuidv4()),
    lang: ProgrammingLanguage.JAVASCRIPT,
    positive: '// Good example\nconst variable = value;',
    negative: '// Bad example\nvar variable = value;',
    ruleId: createRuleId(uuidv4()),
    ...ruleExample,
  };
};
