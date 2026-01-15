import { IUseCase, PackmindCommand } from '../../UseCase';
import { RuleExampleInput } from '../RuleWithExamples';
import { StandardVersion } from '../StandardVersion';

export type AddRuleToStandardCommand = PackmindCommand & {
  standardSlug: string;
  ruleContent: string;
  examples?: RuleExampleInput[];
};

export type AddRuleToStandardResponse = {
  standardVersion: StandardVersion;
};

export type IAddRuleToStandardUseCase = IUseCase<
  AddRuleToStandardCommand,
  AddRuleToStandardResponse
>;
