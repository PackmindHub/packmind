import { PackmindCommand } from '@packmind/types';
import {
  RuleExampleId,
  RuleExample,
  ProgrammingLanguage,
} from '@packmind/shared';
import { IUseCase } from '@packmind/types';

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
