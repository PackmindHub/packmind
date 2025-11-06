import { Branded, brandedIdFactory } from '../brandedTypes';

export type RuleId = Branded<'RuleId'>;
export const createRuleId = brandedIdFactory<RuleId>();
