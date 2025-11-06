import { PackmindCommand } from '@packmind/types';
import { RuleExampleId } from '@packmind/types';

export interface DeleteRuleExampleCommand extends PackmindCommand {
  ruleExampleId: RuleExampleId;
}

export interface IDeleteRuleExample {
  execute(command: DeleteRuleExampleCommand): Promise<void>;
}
