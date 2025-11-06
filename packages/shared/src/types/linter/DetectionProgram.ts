import { Branded, brandedIdFactory } from '@packmind/types';
import { DetectionStatus } from '../standards';
import { ProgrammingLanguage } from '../languages';
import { RuleId } from '../standards';

export enum DetectionModeEnum {
  REGEXP = 'regexp',
  SINGLE_AST = 'singleAst',
  FILE_SYSTEM = 'fileSystem',
}
export type SourceCodeState = 'AST' | 'RAW' | 'NONE';

export type DetectionProgramId = Branded<'DetectionProgramId'>;
export const createDetectionProgramId = brandedIdFactory<DetectionProgramId>();

export type DetectionProgram = {
  id: DetectionProgramId;
  code: string;
  version: number;
  mode: DetectionModeEnum;
  ruleId: RuleId;
  language: ProgrammingLanguage;
  status: DetectionStatus;
  sourceCodeState: SourceCodeState;
  createdAt?: Date;
};
