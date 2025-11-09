import {
  IUseCase,
  PackmindCommand,
  RuleExample,
  RuleId,
} from '@packmind/types';

export type GetRuleExamplesCommand = PackmindCommand & {
  ruleId: RuleId;
};

export type IGetRuleExamples = IUseCase<GetRuleExamplesCommand, RuleExample[]>;
