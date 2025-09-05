import {
  IUseCase,
  PackmindCommand,
  ProgrammingLanguage,
} from '@packmind/shared';
import { RuleExample, RuleId } from '../entities';

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
