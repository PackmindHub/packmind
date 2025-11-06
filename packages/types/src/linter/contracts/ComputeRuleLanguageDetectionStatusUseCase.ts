import { RuleId } from '../../standards';
import { ProgrammingLanguage } from '../../languages';
import { RuleLanguageDetectionStatus } from '../../standards';
import { IPublicUseCase } from '../../UseCase';

export type ComputeRuleLanguageDetectionStatusCommand = {
  ruleId: RuleId;
  language: ProgrammingLanguage;
};

export type ComputeRuleLanguageDetectionStatusResponse = {
  status: RuleLanguageDetectionStatus;
};

export type IComputeRuleLanguageDetectionStatusUseCase = IPublicUseCase<
  ComputeRuleLanguageDetectionStatusCommand,
  ComputeRuleLanguageDetectionStatusResponse
>;
