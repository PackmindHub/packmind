import { PackmindCommand, Rule, Standard } from '@packmind/types';

export interface GenerateProgramCommand extends PackmindCommand {
  standard: Standard;
  rule: Rule;
}

export interface GenerateProgramResponse {
  message: string;
}
