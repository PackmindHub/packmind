import {
  RuleExampleId,
  RuleExample,
  PackmindCommand,
  ProgrammingLanguage,
} from '@packmind/shared';
import { IUseCase } from '@packmind/shared';

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
