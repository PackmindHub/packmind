import { Factory } from '@packmind/test-utils';
import {
  RuleExample,
  createRuleExampleId,
} from '../src/domain/entities/RuleExample';
import { v4 as uuidv4 } from 'uuid';
import { createRuleId } from '../src/domain/entities/Rule';
import { ProgrammingLanguage } from '@packmind/shared/types';

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
