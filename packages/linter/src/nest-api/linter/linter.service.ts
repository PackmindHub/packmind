import { Injectable } from '@nestjs/common';
import { LinterHexa } from '../../LinterHexa';
import {
  ActiveDetectionProgram,
  ActiveDetectionProgramId,
  DetectionProgram,
  ILinterPort,
} from '../../';
import {
  ComputeRuleLanguageDetectionStatusCommand,
  ComputeRuleLanguageDetectionStatusResponse,
  GetStandardRulesDetectionStatusCommand,
  GetStandardRulesDetectionStatusResponse,
  TestProgramExecutionCommand,
  TestProgramExecutionResponse,
  CreateDetectionProgramCommand,
  GetActiveDetectionProgramCommand,
  GetActiveDetectionProgramResponse,
  CreateNewDetectionProgramVersionCommand,
  ListDetectionProgramCommand,
  ListDetectionProgramResponse,
  GetAllDetectionProgramsByRuleCommand,
  GetAllDetectionProgramsByRuleResponse,
  GetDetectionProgramMetadataCommand,
  GetDetectionProgramMetadataResponse,
  UpdateActiveDetectionProgramCommand,
  GetDraftDetectionProgramForRuleCommand,
  GetDraftDetectionProgramForRuleResponse,
  GetActiveDetectionProgramForRuleCommand,
  GetActiveDetectionProgramForRuleResponse,
  GetRuleDetectionAssessmentCommand,
  GetRuleDetectionAssessmentResponse,
  UpdateRuleDetectionHeuristicsCommand,
  UpdateRuleDetectionHeuristicsResponse,
  GetDetectionHeuristicsCommand,
  GetDetectionHeuristicsResponse,
  CreateDetectionHeuristicsCommand,
  CreateDetectionHeuristicsResponse,
  GetDetectionProgramsForPackagesCommand,
  GetDetectionProgramsForPackagesResponse,
} from '@packmind/types';

@Injectable()
export class LinterService {
  constructor(private readonly linterHexa: LinterHexa) {}

  private get linterAdapter(): ILinterPort {
    return this.linterHexa.getAdapter();
  }

  async createDetectionProgram(
    command: CreateDetectionProgramCommand,
  ): Promise<DetectionProgram> {
    return this.linterAdapter.createDetectionProgram(command);
  }

  async getActiveDetectionProgram(
    command: GetActiveDetectionProgramCommand,
  ): Promise<GetActiveDetectionProgramResponse> {
    return this.linterAdapter.getActiveDetectionProgram(command);
  }

  async createNewDetectionProgramVersion(
    command: CreateNewDetectionProgramVersionCommand,
  ): Promise<DetectionProgram> {
    return this.linterAdapter.createNewDetectionProgramVersion(command);
  }

  async listDetectionPrograms(
    command: ListDetectionProgramCommand,
  ): Promise<ListDetectionProgramResponse> {
    return this.linterAdapter.listDetectionPrograms(command);
  }

  async getAllDetectionProgramsByRule(
    command: GetAllDetectionProgramsByRuleCommand,
  ): Promise<GetAllDetectionProgramsByRuleResponse> {
    return this.linterAdapter.getAllDetectionProgramsByRule(command);
  }

  async getDetectionProgramMetadata(
    command: GetDetectionProgramMetadataCommand,
  ): Promise<GetDetectionProgramMetadataResponse> {
    return this.linterAdapter.getDetectionProgramMetadata(command);
  }

  async updateActiveDetectionProgram(
    command: UpdateActiveDetectionProgramCommand,
  ): Promise<ActiveDetectionProgram> {
    return this.linterAdapter.updateActiveDetectionProgram(command);
  }

  async getActiveDetectionProgramById(
    activeDetectionProgramId: ActiveDetectionProgramId,
  ): Promise<ActiveDetectionProgram | null> {
    return this.linterAdapter.getActiveDetectionProgramById(
      activeDetectionProgramId,
    );
  }

  async getDraftDetectionProgramForRule(
    command: GetDraftDetectionProgramForRuleCommand,
  ): Promise<GetDraftDetectionProgramForRuleResponse> {
    return this.linterAdapter.getDraftDetectionProgramForRule(command);
  }

  async getActiveDetectionProgramForRule(
    command: GetActiveDetectionProgramForRuleCommand,
  ): Promise<GetActiveDetectionProgramForRuleResponse> {
    return this.linterAdapter.getActiveDetectionProgramForRule(command);
  }

  async getRuleDetectionAssessment(
    command: GetRuleDetectionAssessmentCommand,
  ): Promise<GetRuleDetectionAssessmentResponse> {
    return this.linterAdapter.getRuleDetectionAssessment(command);
  }

  async computeRuleLanguageDetectionStatus(
    command: ComputeRuleLanguageDetectionStatusCommand,
  ): Promise<ComputeRuleLanguageDetectionStatusResponse> {
    return this.linterAdapter.computeRuleLanguageDetectionStatus(command);
  }

  async getStandardRulesDetectionStatus(
    command: GetStandardRulesDetectionStatusCommand,
  ): Promise<GetStandardRulesDetectionStatusResponse> {
    return this.linterAdapter.getStandardRulesDetectionStatus(command);
  }

  async testProgramExecution(
    command: TestProgramExecutionCommand,
  ): Promise<TestProgramExecutionResponse> {
    return this.linterAdapter.testProgramExecution(command);
  }

  async updateRuleDetectionHeuristics(
    command: UpdateRuleDetectionHeuristicsCommand,
  ): Promise<UpdateRuleDetectionHeuristicsResponse> {
    return this.linterAdapter.updateRuleDetectionHeuristics(command);
  }

  async getDetectionHeuristics(
    command: GetDetectionHeuristicsCommand,
  ): Promise<GetDetectionHeuristicsResponse> {
    return this.linterAdapter.getDetectionHeuristics(command);
  }

  async createDetectionHeuristics(
    command: CreateDetectionHeuristicsCommand,
  ): Promise<CreateDetectionHeuristicsResponse> {
    return this.linterAdapter.createDetectionHeuristics(command);
  }

  async getDetectionProgramsForPackages(
    command: GetDetectionProgramsForPackagesCommand,
  ): Promise<GetDetectionProgramsForPackagesResponse> {
    return this.linterAdapter.getDetectionProgramsForPackages(command);
  }
}
