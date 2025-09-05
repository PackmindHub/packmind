import { Branded, brandedIdFactory } from '../brandedTypes';
import { RuleId } from './Rule';
import { ProgrammingLanguage } from '../languages/Language';

export type RuleExampleId = Branded<'RuleExampleId'>;
export const createRuleExampleId = brandedIdFactory<RuleExampleId>();

export type RuleExample = {
  id: RuleExampleId;
  lang: ProgrammingLanguage;
  positive: string;
  negative: string;
  ruleId: RuleId;
};
