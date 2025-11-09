import {
  IUseCase,
  PackmindCommand,
  ProgrammingLanguage,
  RuleExample,
  RuleId,
} from '@packmind/types';

export type CreateRuleExampleCommand = PackmindCommand & {
  ruleId: RuleId;
  lang: ProgrammingLanguage;
  positive: string;
  negative: string;
};

export type ICreateRuleExample = IUseCase<
  CreateRuleExampleCommand,
  RuleExample
>;
