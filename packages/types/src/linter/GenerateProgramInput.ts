import { OrganizationId, UserId } from '../accounts';
import { ProgrammingLanguage } from '../languages';
import { Rule } from '../standards';
import { DetectionProgramId } from './DetectionProgram';
import { ActiveDetectionProgramId } from './ActiveDetectionProgram';

export interface GenerateProgramInput {
  value: string;
  rule: Rule;
  organizationId: OrganizationId;
  userId: UserId;
  language: ProgrammingLanguage;
  detectionProgramId: DetectionProgramId;
  activeDetectionProgramId: ActiveDetectionProgramId;
}
