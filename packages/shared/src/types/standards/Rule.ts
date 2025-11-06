import { Branded, brandedIdFactory } from '@packmind/types';
import { StandardVersionId } from './StandardVersion';

export type RuleId = Branded<'RuleId'>;
export const createRuleId = brandedIdFactory<RuleId>();

export type Rule = {
  id: RuleId;
  content: string;
  standardVersionId: StandardVersionId;
};
