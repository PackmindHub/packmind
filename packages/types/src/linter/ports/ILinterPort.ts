import {
  ActiveDetectionProgram,
  ActiveDetectionProgramId,
} from '../ActiveDetectionProgram';
import { AssessRuleDetectionInput } from '../AssessRuleDetectionInput';
import type {
  ComputeRuleLanguageDetectionStatusCommand,
  ComputeRuleLanguageDetectionStatusResponse,
  CopyDetectionProgramsToNewRuleCommand,
  CopyDetectionProgramsToNewRuleResponse,
  CopyRuleDetectionAssessmentsCommand,
  CopyRuleDetectionAssessmentsResponse,
  CopyDetectionHeuristicsCommand,
  CopyDetectionHeuristicsResponse,
  CopyLinterArtefactsCommand,
  CopyLinterArtefactsResponse,
  CreateDetectionProgramCommand,
  CreateEmptyRuleDetectionAssessmentCommand,
  CreateEmptyRuleDetectionAssessmentResponse,
  CreateNewDetectionProgramVersionCommand,
  GetActiveDetectionProgramCommand,
  GetActiveDetectionProgramForRuleCommand,
  GetActiveDetectionProgramForRuleResponse,
  GetActiveDetectionProgramResponse,
  GetAllDetectionProgramsByRuleCommand,
  GetAllDetectionProgramsByRuleResponse,
  GetDetectionProgramMetadataCommand,
  GetDetectionProgramMetadataResponse,
  GetDetectionProgramsForPackagesCommand,
  GetDetectionProgramsForPackagesResponse,
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
  UpdateRuleDetectionHeuristicsCommand,
  UpdateRuleDetectionHeuristicsResponse,
  UpdateRuleDetectionStatusAfterUpdateCommand,
  UpdateRuleDetectionStatusAfterUpdateResponse,
  GetDetectionHeuristicsCommand,
  GetDetectionHeuristicsResponse,
  CreateDetectionHeuristicsCommand,
  CreateDetectionHeuristicsResponse,
} from '../contracts';
import { DetectionProgram } from '../DetectionProgram';
import { RuleDetectionAssessment } from '../RuleDetectionAssessment';
import {
  TrackLinterExecutionCommand,
  TrackLinterExecutionResponse,
} from '../contracts/ITrackLinterExecutionUseCase';

export const ILinterPortName = 'ILinterPort' as const;

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

  copyDetectionHeuristics(
    command: CopyDetectionHeuristicsCommand,
  ): Promise<CopyDetectionHeuristicsResponse>;

  copyLinterArtefacts(
    command: CopyLinterArtefactsCommand,
  ): Promise<CopyLinterArtefactsResponse>;

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

  updateRuleDetectionHeuristics(
    command: UpdateRuleDetectionHeuristicsCommand,
  ): Promise<UpdateRuleDetectionHeuristicsResponse>;

  getDetectionHeuristics(
    command: GetDetectionHeuristicsCommand,
  ): Promise<GetDetectionHeuristicsResponse>;

  createDetectionHeuristics(
    command: CreateDetectionHeuristicsCommand,
  ): Promise<CreateDetectionHeuristicsResponse>;

  getDetectionProgramsForPackages(
    command: GetDetectionProgramsForPackagesCommand,
  ): Promise<GetDetectionProgramsForPackagesResponse>;

  createEmptyRuleDetectionAssessment(
    command: CreateEmptyRuleDetectionAssessmentCommand,
  ): Promise<CreateEmptyRuleDetectionAssessmentResponse>;

  createEmptyRuleDetectionAssessment(
    command: CreateEmptyRuleDetectionAssessmentCommand,
  ): Promise<CreateEmptyRuleDetectionAssessmentResponse>;

  trackLinterExecution(
    command: TrackLinterExecutionCommand,
  ): Promise<TrackLinterExecutionResponse>;
}
