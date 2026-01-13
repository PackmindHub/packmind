import { IUseCase, PackmindCommand, PackmindResult } from '../../UseCase';
import { RuleExampleId } from '../RuleExampleId';

export type DeleteRuleExampleCommand = PackmindCommand & {
  ruleExampleId: RuleExampleId;
};

export type DeleteRuleExampleResponse = PackmindResult;

export type IDeleteRuleExampleUseCase = IUseCase<
  DeleteRuleExampleCommand,
  DeleteRuleExampleResponse
>;
