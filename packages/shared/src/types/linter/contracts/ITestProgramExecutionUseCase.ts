import { IUseCase } from '../../UseCase';
import { OrganizationId } from '../../accounts/Organization';
import { UserId } from '../../accounts/User';
import { LinterExecutionViolation } from './IExecuteLinterProgramsUseCase';
import { Branded } from '../../brandedTypes';

export type DetectionProgramId = Branded<'DetectionProgramId'>;

export interface TestProgramExecutionCommand {
  organizationId: OrganizationId;
  userId: UserId;
  detectionProgramId: DetectionProgramId;
  sandboxCode: string;
  filePath?: string;
}

export interface TestProgramExecutionResponse {
  violations: LinterExecutionViolation[];
}

export type ITestProgramExecutionUseCase = IUseCase<
  TestProgramExecutionCommand,
  TestProgramExecutionResponse
>;
