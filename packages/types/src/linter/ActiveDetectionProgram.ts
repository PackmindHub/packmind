import { Branded, brandedIdFactory } from '../brandedTypes';
import { ProgrammingLanguage } from '../languages';
import { RuleId } from '../standards';
import { DetectionProgram, DetectionProgramId } from './DetectionProgram';

export type ActiveDetectionProgramId = Branded<'ActiveDetectionProgramId'>;
export const createActiveDetectionProgramId =
  brandedIdFactory<ActiveDetectionProgramId>();

export enum DetectionSeverity {
  ERROR = 'error',
  WARNING = 'warning',
}

export type ActiveDetectionProgram = {
  id: ActiveDetectionProgramId;
  detectionProgramVersion: DetectionProgramId | null;
  ruleId: RuleId;
  language: ProgrammingLanguage;
  detectionProgramDraftVersion: DetectionProgramId | null;
  severity: DetectionSeverity;
};

export type LanguageDetectionPrograms = ActiveDetectionProgram & {
  detectionProgram: DetectionProgram | null;
  draftDetectionProgram: DetectionProgram | null;
  isExampleOnly?: boolean;
};

export type ActiveDetectionProgramWithRelations = LanguageDetectionPrograms;
