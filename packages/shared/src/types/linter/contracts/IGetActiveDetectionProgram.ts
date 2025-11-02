import { IUseCase, PackmindCommand } from '../../UseCase';
import { RuleId } from '../../standards/Rule';
import { LanguageDetectionPrograms } from '../ActiveDetectionProgram';

export type GetActiveDetectionProgramCommand = PackmindCommand & {
  ruleId: RuleId;
  language?: string; // Optional - if not provided, returns all languages
};

export type GetActiveDetectionProgramResponse = {
  programs: LanguageDetectionPrograms[] | null;
};

export type IGetActiveDetectionProgram = IUseCase<
  GetActiveDetectionProgramCommand,
  GetActiveDetectionProgramResponse
>;
