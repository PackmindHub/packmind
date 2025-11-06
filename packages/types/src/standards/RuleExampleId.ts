import { Branded, brandedIdFactory } from '../brandedTypes';

export type RuleExampleId = Branded<'RuleExampleId'>;
export const createRuleExampleId = brandedIdFactory<RuleExampleId>();
