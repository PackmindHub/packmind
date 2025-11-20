import { PackmindLogger } from '@packmind/logger';
import {
  OrganizationId,
  RuleExample,
  RuleId,
  StandardId,
  createOrganizationId,
  createRuleExampleId,
  createUserId,
} from '@packmind/types';
import { getErrorMessage } from '@packmind/node-utils';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import { StandardVersionService } from '../../services/StandardVersionService';
import type { ILinterPort } from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

const origin = 'AddStandardExampleUsecase';

export class AddStandardExampleUsecase {
  constructor(
    private readonly standardVersionService: StandardVersionService,
    private readonly ruleRepository: IRuleRepository,
    private readonly ruleExampleRepository: IRuleExampleRepository,
    private readonly linterPort?: ILinterPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('AddStandardExampleUsecase initialized');
  }

  async addStandardExample(params: {
    standardId: StandardId;
    ruleId: RuleId;
    lang: string;
    positive: string;
    negative: string;
    organizationId: OrganizationId;
    userId: string;
  }): Promise<RuleExample> {
    const {
      standardId,
      ruleId,
      lang,
      positive,
      negative,
      organizationId,
      userId,
    } = params;

    this.logger.info('Adding standard example', {
      standardId,
      ruleId,
      lang,
      organizationId,
      userId,
    });

    try {
      // Validate that the standard exists and get its latest version
      const latestVersion =
        await this.standardVersionService.getLatestStandardVersion(standardId);
      if (!latestVersion) {
        this.logger.error('No versions found for standard', { standardId });
        throw new Error(`No versions found for standard ${standardId}`);
      }

      // Validate that the rule exists
      const rule = await this.ruleRepository.findById(ruleId);
      if (!rule) {
        this.logger.error('Rule not found', { ruleId });
        throw new Error(`Rule with id ${ruleId} not found`);
      }

      // Validate that the rule belongs to the latest version of the standard
      if (rule.standardVersionId !== latestVersion.id) {
        this.logger.error('Rule does not belong to latest version', {
          ruleId,
          ruleVersionId: rule.standardVersionId,
          latestVersionId: latestVersion.id,
        });
        throw new Error(
          `Rule ${ruleId} does not belong to the latest version of standard ${standardId}`,
        );
      }

      // Validate input parameters
      if (!lang) {
        throw new Error('Language is required and cannot be empty');
      }

      // Create the rule example entity
      const ruleExample: RuleExample = {
        id: createRuleExampleId(uuidv4()),
        ruleId,
        lang: lang as any, // Port accepts string, but RuleExample expects ProgrammingLanguage
        positive: positive || '',
        negative: negative || '',
      };

      // Save the rule example
      const savedRuleExample =
        await this.ruleExampleRepository.add(ruleExample);

      this.logger.info('Standard example added successfully', {
        standardId,
        ruleId,
        exampleId: savedRuleExample.id,
        lang: savedRuleExample.lang,
      });

      // Update detection program assessment if linter port is available
      if (this.linterPort) {
        await this.updateRuleDetectionAssessment(
          ruleId,
          lang,
          organizationId,
          userId,
        );
      }

      return savedRuleExample;
    } catch (error) {
      this.logger.error('Failed to add standard example', {
        standardId,
        ruleId,
        lang,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async updateRuleDetectionAssessment(
    ruleId: RuleId,
    language: string,
    organizationId: OrganizationId,
    userId: string,
  ): Promise<void> {
    if (!this.linterPort) {
      return;
    }

    try {
      await this.linterPort.updateRuleDetectionAssessmentAfterUpdate({
        ruleId,
        language: language as any, // Port accepts string, but linter expects ProgrammingLanguage
        organizationId: createOrganizationId(organizationId),
        userId: createUserId(userId),
      });
    } catch (error) {
      this.logger.error('Failed to update detection program status', {
        ruleId,
        language,
        organizationId,
        error: getErrorMessage(error),
      });
      // Don't throw - we want rule example creation to succeed even if detection program update fails
    }
  }
}
