import { IUseCase, PackmindCommand } from '../../UseCase';
import { ProgrammingLanguage } from '../../languages/ProgrammingLanguage';
import { RuleExample } from '../RuleExample';
import { RuleExampleId } from '../RuleExampleId';

export type UpdateRuleExampleCommand = PackmindCommand & {
  ruleExampleId: RuleExampleId;
  lang?: ProgrammingLanguage;
  positive?: string;
  negative?: string;
};

export type UpdateRuleExampleResponse = RuleExample;

export type IUpdateRuleExampleUseCase = IUseCase<
  UpdateRuleExampleCommand,
  UpdateRuleExampleResponse
>;
