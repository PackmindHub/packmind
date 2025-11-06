import { IUseCase, PackmindCommand } from '@packmind/types';
import { RuleExample, RuleId } from '../entities';

export type GetRuleExamplesCommand = PackmindCommand & {
  ruleId: RuleId;
};

export type IGetRuleExamples = IUseCase<GetRuleExamplesCommand, RuleExample[]>;
