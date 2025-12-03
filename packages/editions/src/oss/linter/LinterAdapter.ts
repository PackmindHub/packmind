import {
  ActiveDetectionProgram,
  ActiveDetectionProgramId,
  AssessRuleDetectionInput,
  ComputeRuleLanguageDetectionStatusCommand,
  ComputeRuleLanguageDetectionStatusResponse,
  CopyRuleDetectionAssessmentsResponse,
  CreateDetectionProgramCommand,
  CreateNewDetectionProgramVersionCommand,
  DetectionProgram,
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
  RuleDetectionAssessment,
  StartProgramGenerationCommand,
  StartProgramGenerationResponse,
  TestProgramExecutionCommand,
  TestProgramExecutionResponse,
  UpdateActiveDetectionProgramCommand,
  UpdateDetectionProgramCommand,
  UpdateDetectionProgramStatusCommand,
  UpdateRuleDetectionAssessmentAfterUpdateResponse,
  UpdateRuleDetectionStatusAfterUpdateResponse,
  RuleLanguageDetectionStatus,
  CreateDetectionHeuristicsCommand,
  CreateDetectionHeuristicsResponse,
  GetDetectionHeuristicsResponse,
  GetDetectionHeuristicsCommand,
  UpdateRuleDetectionHeuristicsResponse,
  UpdateRuleDetectionHeuristicsCommand,
  CopyDetectionProgramsToNewRuleCommand,
  CopyDetectionProgramsToNewRuleResponse,
  CopyRuleDetectionAssessmentsCommand,
  CopyDetectionHeuristicsCommand,
  CopyDetectionHeuristicsResponse,
  CopyLinterArtefactsCommand,
  CopyLinterArtefactsResponse,
  GetDetectionProgramsForPackagesCommand,
  GetDetectionProgramsForPackagesResponse,
  CreateEmptyRuleDetectionAssessmentCommand,
  CreateEmptyRuleDetectionAssessmentResponse,
  ILinterPort,
} from '@packmind/types';
import { LinterUsecases } from '.';

export class LinterAdapter implements ILinterPort {
  constructor(private readonly linterUsecases: LinterUsecases) {}

  createDetectionProgram(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: CreateDetectionProgramCommand,
  ): Promise<DetectionProgram> {
    throw new Error('Method not implemented.');
  }
  getActiveDetectionProgram(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: GetActiveDetectionProgramCommand,
  ): Promise<GetActiveDetectionProgramResponse> {
    throw new Error('Method not implemented.');
  }
  createNewDetectionProgramVersion(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: CreateNewDetectionProgramVersionCommand,
  ): Promise<DetectionProgram> {
    throw new Error('Method not implemented.');
  }
  listDetectionPrograms(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: ListDetectionProgramCommand,
  ): Promise<ListDetectionProgramResponse> {
    throw new Error('Method not implemented.');
  }
  updateDetectionProgram(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: UpdateDetectionProgramCommand,
  ): Promise<DetectionProgram> {
    throw new Error('Method not implemented.');
  }
  updateActiveDetectionProgram(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: UpdateActiveDetectionProgramCommand,
  ): Promise<ActiveDetectionProgram> {
    throw new Error('Method not implemented.');
  }
  getActiveDetectionProgramById(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    activeDetectionProgramId: ActiveDetectionProgramId,
  ): Promise<ActiveDetectionProgram | null> {
    throw new Error('Method not implemented.');
  }
  startGenerateProgram(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: StartProgramGenerationCommand,
  ): Promise<StartProgramGenerationResponse> {
    throw new Error('Method not implemented.');
  }
  getAllDetectionProgramsByRule(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: GetAllDetectionProgramsByRuleCommand,
  ): Promise<GetAllDetectionProgramsByRuleResponse> {
    throw new Error('Method not implemented.');
  }
  getDetectionProgramMetadata(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: GetDetectionProgramMetadataCommand,
  ): Promise<GetDetectionProgramMetadataResponse> {
    throw new Error('Method not implemented.');
  }
  getDraftDetectionProgramForRule(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: GetDraftDetectionProgramForRuleCommand,
  ): Promise<GetDraftDetectionProgramForRuleResponse> {
    throw new Error('Method not implemented.');
  }
  getActiveDetectionProgramForRule(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: GetActiveDetectionProgramForRuleCommand,
  ): Promise<GetActiveDetectionProgramForRuleResponse> {
    throw new Error('Method not implemented.');
  }
  updateDetectionProgramStatus(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: UpdateDetectionProgramStatusCommand,
  ): Promise<UpdateRuleDetectionStatusAfterUpdateResponse> {
    throw new Error('Method not implemented.');
  }
  startRuleDetectionAssessment(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: Omit<AssessRuleDetectionInput, 'assessmentId'>,
  ): Promise<RuleDetectionAssessment> {
    throw new Error('Method not implemented.');
  }
  getRuleDetectionAssessment(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: GetRuleDetectionAssessmentCommand,
  ): Promise<GetRuleDetectionAssessmentResponse> {
    throw new Error('Method not implemented.');
  }
  getStandardRulesDetectionStatus(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: GetStandardRulesDetectionStatusCommand,
  ): Promise<GetStandardRulesDetectionStatusResponse> {
    throw new Error('Method not implemented.');
  }
  testProgramExecution(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: TestProgramExecutionCommand,
  ): Promise<TestProgramExecutionResponse> {
    throw new Error('Method not implemented.');
  }

  async copyDetectionProgramsToNewRule(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: CopyDetectionProgramsToNewRuleCommand,
  ): Promise<CopyDetectionProgramsToNewRuleResponse> {
    return {
      copiedProgramsCount: 0,
    };
  }

  async copyRuleDetectionAssessments(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: CopyRuleDetectionAssessmentsCommand,
  ): Promise<CopyRuleDetectionAssessmentsResponse> {
    return {
      copiedAssessmentsCount: 0,
    };
  }

  async updateRuleDetectionAssessmentAfterUpdate(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: UpdateDetectionProgramStatusCommand,
  ): Promise<UpdateRuleDetectionAssessmentAfterUpdateResponse> {
    return {
      action: 'STATUS_UPDATED',
      message: '',
    };
  }

  async computeRuleLanguageDetectionStatus(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: ComputeRuleLanguageDetectionStatusCommand,
  ): Promise<ComputeRuleLanguageDetectionStatusResponse> {
    return {
      status: RuleLanguageDetectionStatus.NONE,
    };
  }

  createDetectionHeuristics(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: CreateDetectionHeuristicsCommand,
  ): Promise<CreateDetectionHeuristicsResponse> {
    throw new Error('Method not implemented.');
  }

  getDetectionHeuristics(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: GetDetectionHeuristicsCommand,
  ): Promise<GetDetectionHeuristicsResponse> {
    throw new Error('Method not implemented.');
  }

  updateRuleDetectionHeuristics(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: UpdateRuleDetectionHeuristicsCommand,
  ): Promise<UpdateRuleDetectionHeuristicsResponse> {
    throw new Error('Method not implemented.');
  }

  async copyDetectionHeuristics(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: CopyDetectionHeuristicsCommand,
  ): Promise<CopyDetectionHeuristicsResponse> {
    return {
      copiedHeuristicsCount: 0,
    };
  }

  async copyLinterArtefacts(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: CopyLinterArtefactsCommand,
  ): Promise<CopyLinterArtefactsResponse> {
    return {
      copiedHeuristicsCount: 0,
      copiedAssessmentsCount: 0,
      copiedProgramsCount: 0,
    };
  }

  getDetectionProgramsForPackages(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: GetDetectionProgramsForPackagesCommand,
  ): Promise<GetDetectionProgramsForPackagesResponse> {
    throw new Error('Method not implemented.');
  }

  createEmptyRuleDetectionAssessment(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: CreateEmptyRuleDetectionAssessmentCommand,
  ): Promise<CreateEmptyRuleDetectionAssessmentResponse> {
    throw new Error('Method not implemented.');
  }
}
