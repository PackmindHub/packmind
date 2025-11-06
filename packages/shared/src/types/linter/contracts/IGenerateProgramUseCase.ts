import { IUseCase, PackmindCommand } from '@packmind/types';
import { Rule } from '../../standards/Rule';

export interface GenerateProgramCommand extends PackmindCommand {
  rule: Rule;
}

export interface GenerateProgramResponse {
  message: string;
}

export type IGenerateProgramUseCase = IUseCase<
  GenerateProgramCommand,
  GenerateProgramResponse
>;
