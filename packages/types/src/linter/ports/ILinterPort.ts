import type {
  ComputeRuleLanguageDetectionStatusCommand,
  ComputeRuleLanguageDetectionStatusResponse,
  CopyDetectionProgramsToNewRuleCommand,
  CopyDetectionProgramsToNewRuleResponse,
  CopyRuleDetectionAssessmentsCommand,
  CopyRuleDetectionAssessmentsResponse,
  CreateDetectionProgramCommand,
  CreateNewDetectionProgramVersionCommand,
  GetActiveDetectionProgramCommand,
  GetActiveDetectionProgramForRuleCommand,
  GetActiveDetectionProgramForRuleResponse,
  GetActiveDetectionProgramResponse,
  GetAllDetectionProgramsByRuleCommand,
  GetAllDetectionProgramsByRuleResponse,
  GetDetectionProgramMetadataCommand,
  GetDetectionProgramMetadataResponse,
  GetDraftDetectionProgramForRuleCommand,
  GetDraftDetectionProgramForRuleResponse,
  GetRuleDetectionAssessmentCommand,
  GetRuleDetectionAssessmentResponse,
  GetStandardRulesDetectionStatusCommand,
  GetStandardRulesDetectionStatusResponse,
  ListDetectionProgramCommand,
  ListDetectionProgramResponse,
  StartProgramGenerationCommand,
  StartProgramGenerationResponse,
  TestProgramExecutionCommand,
  TestProgramExecutionResponse,
  UpdateActiveDetectionProgramCommand,
  UpdateDetectionProgramCommand,
  UpdateDetectionProgramStatusCommand,
  UpdateRuleDetectionStatusAfterUpdateCommand,
  UpdateRuleDetectionStatusAfterUpdateResponse,
} from '../contracts';
import {
  ActiveDetectionProgram,
  ActiveDetectionProgramId,
} from '../ActiveDetectionProgram';
import { DetectionProgram } from '../DetectionProgram';
import { RuleDetectionAssessment } from '../RuleDetectionAssessment';
import { AssessRuleDetectionInput } from '../AssessRuleDetectionInput';

export interface ILinterPort {
  createDetectionProgram(
    command: CreateDetectionProgramCommand,
  ): Promise<DetectionProgram>;

  getActiveDetectionProgram(
    command: GetActiveDetectionProgramCommand,
  ): Promise<GetActiveDetectionProgramResponse>;

  createNewDetectionProgramVersion(
    command: CreateNewDetectionProgramVersionCommand,
  ): Promise<DetectionProgram>;

  listDetectionPrograms(
    command: ListDetectionProgramCommand,
  ): Promise<ListDetectionProgramResponse>;

  updateDetectionProgram(
    command: UpdateDetectionProgramCommand,
  ): Promise<DetectionProgram>;

  updateActiveDetectionProgram(
    command: UpdateActiveDetectionProgramCommand,
  ): Promise<ActiveDetectionProgram>;

  getActiveDetectionProgramById(
    activeDetectionProgramId: ActiveDetectionProgramId,
  ): Promise<ActiveDetectionProgram | null>;

  startGenerateProgram(
    command: StartProgramGenerationCommand,
  ): Promise<StartProgramGenerationResponse>;

  getAllDetectionProgramsByRule(
    command: GetAllDetectionProgramsByRuleCommand,
  ): Promise<GetAllDetectionProgramsByRuleResponse>;

  getDetectionProgramMetadata(
    command: GetDetectionProgramMetadataCommand,
  ): Promise<GetDetectionProgramMetadataResponse>;

  copyDetectionProgramsToNewRule(
    command: CopyDetectionProgramsToNewRuleCommand,
  ): Promise<CopyDetectionProgramsToNewRuleResponse>;

  copyRuleDetectionAssessments(
    command: CopyRuleDetectionAssessmentsCommand,
  ): Promise<CopyRuleDetectionAssessmentsResponse>;

  getDraftDetectionProgramForRule(
    command: GetDraftDetectionProgramForRuleCommand,
  ): Promise<GetDraftDetectionProgramForRuleResponse>;

  getActiveDetectionProgramForRule(
    command: GetActiveDetectionProgramForRuleCommand,
  ): Promise<GetActiveDetectionProgramForRuleResponse>;

  updateDetectionProgramStatus(
    command: UpdateDetectionProgramStatusCommand,
  ): Promise<UpdateRuleDetectionStatusAfterUpdateResponse>;

  updateRuleDetectionAssessmentAfterUpdate(
    command: UpdateRuleDetectionStatusAfterUpdateCommand,
  ): Promise<UpdateRuleDetectionStatusAfterUpdateResponse>;

  startRuleDetectionAssessment(
    command: Omit<AssessRuleDetectionInput, 'assessmentId'>,
  ): Promise<RuleDetectionAssessment>;

  getRuleDetectionAssessment(
    command: GetRuleDetectionAssessmentCommand,
  ): Promise<GetRuleDetectionAssessmentResponse>;

  computeRuleLanguageDetectionStatus(
    command: ComputeRuleLanguageDetectionStatusCommand,
  ): Promise<ComputeRuleLanguageDetectionStatusResponse>;

  getStandardRulesDetectionStatus(
    command: GetStandardRulesDetectionStatusCommand,
  ): Promise<GetStandardRulesDetectionStatusResponse>;

  testProgramExecution(
    command: TestProgramExecutionCommand,
  ): Promise<TestProgramExecutionResponse>;
}
