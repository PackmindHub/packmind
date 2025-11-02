import { OrganizationId } from '../accounts/Organization';
import { UserId } from '../accounts/User';
import { ProgrammingLanguage } from '../languages/Language';
import { Rule } from '../standards/Rule';
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
