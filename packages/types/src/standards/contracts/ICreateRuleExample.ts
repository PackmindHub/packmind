import { IUseCase, PackmindCommand } from '../../UseCase';
import { ProgrammingLanguage } from '../../languages/ProgrammingLanguage';
import { RuleExample } from '../RuleExample';
import { RuleId } from '../RuleId';

export type CreateRuleExampleCommand = PackmindCommand & {
  ruleId: RuleId;
  lang: ProgrammingLanguage;
  positive: string;
  negative: string;
};

export type CreateRuleExampleResponse = RuleExample;

export type ICreateRuleExampleUseCase = IUseCase<
  CreateRuleExampleCommand,
  CreateRuleExampleResponse
>;
