import { RuleExampleId, PackmindCommand } from '@packmind/shared';

export interface DeleteRuleExampleCommand extends PackmindCommand {
  ruleExampleId: RuleExampleId;
}

export interface IDeleteRuleExample {
  execute(command: DeleteRuleExampleCommand): Promise<void>;
}
