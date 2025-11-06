import {
  PackmindCommand,
  IUseCase,
  ProgrammingLanguage,
} from '@packmind/types';
import { RuleExampleId, RuleExample } from '@packmind/types';

export interface UpdateRuleExampleCommand extends PackmindCommand {
  ruleExampleId: RuleExampleId;
  lang?: ProgrammingLanguage;
  positive?: string;
  negative?: string;
}

export type IUpdateRuleExample = IUseCase<
  UpdateRuleExampleCommand,
  RuleExample
>;
