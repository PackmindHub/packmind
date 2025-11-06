import { RuleId } from './RuleId';
import { StandardVersionId } from './StandardVersionId';

export type Rule = {
  id: RuleId;
  content: string;
  standardVersionId: StandardVersionId;
};
