import {
  ActiveDetectionProgram,
  DetectionProgram,
  DetectionProgramMetadata,
  LanguageDetectionPrograms,
  RuleDetectionAssessment,
} from '@packmind/types';
import {
  RuleLanguageDetectionStatus,
  RuleDetectionStatusSummary,
} from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IDetectionGateway } from './IDetectionGateway';

export class DetectionGatewayApi
  extends PackmindGateway
  implements IDetectionGateway
{
  constructor() {
    super('/standards');
  }

  async saveDetectionProgram(
    standardId: string,
    ruleId: string,
    code: string,
  ): Promise<void> {
    return this._api.post<void>(
      `${this._endpoint}/${standardId}/rules/${ruleId}/detection-program`,
      {
        code,
        mode: 'singleAst',
        language: 'typescript',
      },
    );
  }

  async updateDetectionProgram(
    standardId: string,
    ruleId: string,
    detectionProgramId: string,
    code: string,
  ): Promise<void> {
    return this._api.put<void>(
      `${this._endpoint}/${standardId}/rules/${ruleId}/detection-program/${detectionProgramId}`,
      {
        code,
      },
    );
  }

  async getActiveDetectionPrograms(
    standardId: string,
    ruleId: string,
  ): Promise<LanguageDetectionPrograms[]> {
    return this._api.get<LanguageDetectionPrograms[]>(
      `${this._endpoint}/${standardId}/rules/${ruleId}/detection-program`,
    );
  }

  async getAllDetectionPrograms(
    standardId: string,
    ruleId: string,
  ): Promise<DetectionProgram[]> {
    return this._api.get<DetectionProgram[]>(
      `${this._endpoint}/${standardId}/rules/${ruleId}/detection-programs/all`,
    );
  }

  async generateProgram(
    standardId: string,
    ruleId: string,
    language?: string,
  ): Promise<void> {
    const payload = language ? { language } : undefined;
    return this._api.post<void>(
      `${this._endpoint}/${standardId}/rules/${ruleId}/detection-program/generate`,
      payload,
    );
  }

  async getDetectionProgramMetadata(
    standardId: string,
    ruleId: string,
    detectionProgramId: string,
  ): Promise<DetectionProgramMetadata | null> {
    return this._api.get<DetectionProgramMetadata | null>(
      `${this._endpoint}/${standardId}/rules/${ruleId}/detection-programs/${detectionProgramId}/metadata`,
    );
  }

  async activateDetectionProgram(
    standardId: string,
    ruleId: string,
    activeDetectionProgramId: string,
    detectionProgramId: string,
  ): Promise<ActiveDetectionProgram> {
    return this._api.post<ActiveDetectionProgram>(
      `${this._endpoint}/${standardId}/rules/${ruleId}/detection-program/${activeDetectionProgramId}/activate`,
      {
        detectionProgramId,
      },
    );
  }

  async getRuleDetectionAssessment(
    standardId: string,
    ruleId: string,
    language: string,
  ): Promise<RuleDetectionAssessment | null> {
    return this._api.get<RuleDetectionAssessment | null>(
      `${this._endpoint}/${standardId}/rules/${ruleId}/detection-assessment?language=${language}`,
    );
  }

  async getRuleLanguageDetectionStatus(
    standardId: string,
    ruleId: string,
    language: string,
  ): Promise<{ status: RuleLanguageDetectionStatus }> {
    return this._api.get<{ status: RuleLanguageDetectionStatus }>(
      `${this._endpoint}/${standardId}/rules/${ruleId}/detection-status?language=${language}`,
    );
  }

  async getStandardRulesDetectionStatus(
    standardId: string,
  ): Promise<RuleDetectionStatusSummary[]> {
    return this._api.get<RuleDetectionStatusSummary[]>(
      `${this._endpoint}/${standardId}/detection-status`,
    );
  }

  async testProgramExecution(
    standardId: string,
    ruleId: string,
    detectionProgramId: string,
    sandboxCode: string,
  ): Promise<
    { line: number; character: number; rule: string; standard: string }[]
  > {
    return this._api.post<
      { line: number; character: number; rule: string; standard: string }[]
    >(
      `${this._endpoint}/${standardId}/rules/${ruleId}/detection-program/${detectionProgramId}/test`,
      {
        sandboxCode,
      },
    );
  }
}
