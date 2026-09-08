import { PackmindCommand } from '../../UseCase';
import { ProgrammingLanguage } from '../../languages';
import { RuleId } from '../../standards';

export interface StartProgramGenerationCommand extends PackmindCommand {
  ruleId: RuleId;
  language?: ProgrammingLanguage;
}

export interface StartProgramGenerationResponse {
  message: string;
}
