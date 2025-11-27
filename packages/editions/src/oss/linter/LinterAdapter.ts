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
  RuleDetectionAssessmentStatus,
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
  DetectionModeEnum,
  SourceCodeState,
} from '@packmind/types';
import { ILinterPort } from '@packmind/types';

/**
 * OSS stub implementation of LinterAdapter
 * All methods return simple default values instead of throwing errors
 */
export class LinterAdapter implements ILinterPort {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  constructor(linterUsecases: Record<string, never>) {}

  async createDetectionProgram(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: CreateDetectionProgramCommand,
  ): Promise<DetectionProgram> {
    return {
      id: '' as unknown as DetectionProgram['id'],
      code: '',
      version: 0,
      mode: DetectionModeEnum.REGEXP,
      ruleId: '' as unknown as DetectionProgram['ruleId'],
      language: 'typescript' as unknown as DetectionProgram['language'],
      status: 'DRAFT' as unknown as DetectionProgram['status'],
      sourceCodeState: 'NONE' as SourceCodeState,
    };
  }

  async getActiveDetectionProgram(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: GetActiveDetectionProgramCommand,
  ): Promise<GetActiveDetectionProgramResponse> {
    return { programs: null };
  }

  async createNewDetectionProgramVersion(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: CreateNewDetectionProgramVersionCommand,
  ): Promise<DetectionProgram> {
    return {
      id: '' as unknown as DetectionProgram['id'],
      code: '',
      version: 0,
      mode: DetectionModeEnum.REGEXP,
      ruleId: '' as unknown as DetectionProgram['ruleId'],
      language: 'typescript' as unknown as DetectionProgram['language'],
      status: 'DRAFT' as unknown as DetectionProgram['status'],
      sourceCodeState: 'NONE' as SourceCodeState,
    };
  }

  async listDetectionPrograms(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: ListDetectionProgramCommand,
  ): Promise<ListDetectionProgramResponse> {
    return { targets: [] };
  }

  async updateDetectionProgram(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: UpdateDetectionProgramCommand,
  ): Promise<DetectionProgram> {
    return {
      id: '' as unknown as DetectionProgram['id'],
      code: '',
      version: 0,
      mode: DetectionModeEnum.REGEXP,
      ruleId: '' as unknown as DetectionProgram['ruleId'],
      language: 'typescript' as unknown as DetectionProgram['language'],
      status: 'DRAFT' as unknown as DetectionProgram['status'],
      sourceCodeState: 'NONE' as SourceCodeState,
    };
  }

  async updateActiveDetectionProgram(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: UpdateActiveDetectionProgramCommand,
  ): Promise<ActiveDetectionProgram> {
    return {
      id: '' as unknown as ActiveDetectionProgram['id'],
      detectionProgramVersion: null,
      ruleId: '' as unknown as ActiveDetectionProgram['ruleId'],
      language: 'typescript' as unknown as ActiveDetectionProgram['language'],
      detectionProgramDraftVersion: null,
    };
  }

  async getActiveDetectionProgramById(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    activeDetectionProgramId: ActiveDetectionProgramId,
  ): Promise<ActiveDetectionProgram | null> {
    return null;
  }

  async startGenerateProgram(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: StartProgramGenerationCommand,
  ): Promise<StartProgramGenerationResponse> {
    return {
      message: '',
    };
  }

  async getAllDetectionProgramsByRule(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: GetAllDetectionProgramsByRuleCommand,
  ): Promise<GetAllDetectionProgramsByRuleResponse> {
    return { programs: [] };
  }

  async getDetectionProgramMetadata(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: GetDetectionProgramMetadataCommand,
  ): Promise<GetDetectionProgramMetadataResponse> {
    return { metadata: null };
  }

  async getDraftDetectionProgramForRule(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: GetDraftDetectionProgramForRuleCommand,
  ): Promise<GetDraftDetectionProgramForRuleResponse> {
    return { programs: [], ruleContent: '', scope: null };
  }

  async getActiveDetectionProgramForRule(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: GetActiveDetectionProgramForRuleCommand,
  ): Promise<GetActiveDetectionProgramForRuleResponse> {
    return { programs: [], ruleContent: '', scope: null };
  }

  async updateDetectionProgramStatus(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: UpdateDetectionProgramStatusCommand,
  ): Promise<UpdateRuleDetectionStatusAfterUpdateResponse> {
    return {
      action: 'STATUS_UPDATED',
      message: '',
    };
  }

  async startRuleDetectionAssessment(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: Omit<AssessRuleDetectionInput, 'assessmentId'>,
  ): Promise<RuleDetectionAssessment> {
    return {
      id: '' as unknown as RuleDetectionAssessment['id'],
      ruleId: '' as unknown as RuleDetectionAssessment['ruleId'],
      language: 'typescript' as unknown as RuleDetectionAssessment['language'],
      detectionMode: DetectionModeEnum.REGEXP,
      status: RuleDetectionAssessmentStatus.NOT_STARTED,
      details: '',
      clarificationQuestion: '',
      clarificationAnswers: [],
    };
  }

  async getRuleDetectionAssessment(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: GetRuleDetectionAssessmentCommand,
  ): Promise<GetRuleDetectionAssessmentResponse> {
    return { assessment: null };
  }

  async getStandardRulesDetectionStatus(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: GetStandardRulesDetectionStatusCommand,
  ): Promise<GetStandardRulesDetectionStatusResponse> {
    return { rules: [] };
  }

  async testProgramExecution(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: TestProgramExecutionCommand,
  ): Promise<TestProgramExecutionResponse> {
    return { violations: [] };
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
}
