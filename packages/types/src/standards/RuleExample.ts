import { RuleExampleId } from './RuleExampleId';
import { RuleId } from './RuleId';
import { ProgrammingLanguage } from '../languages/ProgrammingLanguage';

export type RuleExample = {
  id: RuleExampleId;
  lang: ProgrammingLanguage;
  positive: string;
  negative: string;
  ruleId: RuleId;
};
