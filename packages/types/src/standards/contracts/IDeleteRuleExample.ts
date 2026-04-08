import { IUseCase, SpaceMemberCommand, PackmindResult } from '../../UseCase';
import { RuleExampleId } from '../RuleExampleId';

export type DeleteRuleExampleCommand = SpaceMemberCommand & {
  ruleExampleId: RuleExampleId;
};

export type DeleteRuleExampleResponse = PackmindResult;

export type IDeleteRuleExampleUseCase = IUseCase<
  DeleteRuleExampleCommand,
  DeleteRuleExampleResponse
>;
