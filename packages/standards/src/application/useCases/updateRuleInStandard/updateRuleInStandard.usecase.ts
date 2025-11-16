import { StandardService } from '../../services/StandardService';
import { StandardVersionService } from '../../services/StandardVersionService';
import { GenerateStandardSummaryDelayedJob } from '../../jobs/GenerateStandardSummaryDelayedJob';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { StandardVersion } from '@packmind/types';
import { CreateStandardVersionData } from '../../services/StandardVersionService';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { RuleExample } from '@packmind/types';
import {
  OrganizationId,
  UserId,
  StandardId,
  RuleId,
  StandardVersionId,
} from '@packmind/types';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import type { ILinterPort } from '@packmind/types';

const origin = 'UpdateRuleInStandardUsecase';

export type UpdateRuleInStandardRequest = {
  standardId: StandardId;
  ruleId: RuleId;
  newRuleContent: string;
  organizationId: OrganizationId;
  userId: UserId;
};

export class UpdateRuleInStandardUsecase {
  constructor(
    private readonly standardService: StandardService,
    private readonly standardVersionService: StandardVersionService,
    private readonly ruleRepository: IRuleRepository,
    private readonly ruleExampleRepository: IRuleExampleRepository,
    private readonly generateStandardSummaryDelayedJob: GenerateStandardSummaryDelayedJob,
    private readonly linterAdapter?: ILinterPort,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('UpdateRuleInStandardUsecase initialized');
  }

  public async updateRuleInStandard({
    standardId,
    ruleId,
    newRuleContent,
    organizationId,
    userId,
  }: UpdateRuleInStandardRequest): Promise<StandardVersion> {
    this.logger.info('Starting updateRuleInStandard process', {
      standardId,
      ruleId,
      organizationId,
      userId,
      newRuleContent: newRuleContent.substring(0, 50) + '...',
    });

    try {
      // Get the standard
      const existingStandard =
        await this.standardService.getStandardById(standardId);
      if (!existingStandard) {
        this.logger.error('Standard not found', { standardId });
        throw new Error(`Standard with id ${standardId} not found`);
      }

      // Get the latest version to get existing rules
      const latestVersion =
        await this.standardVersionService.getLatestStandardVersion(standardId);

      if (!latestVersion) {
        this.logger.error('No versions found for standard', { standardId });
        throw new Error(`No versions found for standard ${standardId}`);
      }

      const existingRules = await this.ruleRepository.findByStandardVersionId(
        latestVersion.id,
      );

      // Find the rule to update
      const ruleToUpdate = existingRules.find((r) => r.id === ruleId);
      if (!ruleToUpdate) {
        this.logger.error('Rule not found in standard', { ruleId, standardId });
        throw new Error(`Rule ${ruleId} not found in standard ${standardId}`);
      }

      // Business logic: Increment version number
      const nextVersion = existingStandard.version + 1;
      this.logger.debug('Incrementing version number', {
        currentVersion: existingStandard.version,
        nextVersion,
      });

      // Update the standard entity with new version
      await this.standardService.updateStandard(existingStandard.id, {
        name: existingStandard.name,
        description: existingStandard.description,
        slug: existingStandard.slug,
        version: nextVersion,
        gitCommit: undefined,
        userId,
        scope: existingStandard.scope,
      });

      // Build new rules list with updated rule content
      const allRules: Array<{
        content: string;
        examples: RuleExample[];
        oldRuleId?: RuleId;
      }> = [];

      for (const rule of existingRules) {
        const examples = await this.ruleExampleRepository.findByRuleId(rule.id);
        const content = rule.id === ruleId ? newRuleContent : rule.content;
        allRules.push({
          content,
          examples: examples || [],
          oldRuleId: rule.id,
        });
      }

      this.logger.debug('Prepared rules for new version', {
        rulesCount: allRules.length,
        updatedRuleId: ruleId,
        newRuleContent: newRuleContent.substring(0, 50) + '...',
      });

      // Create new standard version with updated rule
      this.logger.debug('Creating new standard version with updated rule');
      const standardVersionData: CreateStandardVersionData = {
        standardId: existingStandard.id,
        name: existingStandard.name,
        slug: existingStandard.slug,
        description: existingStandard.description,
        version: nextVersion,
        rules: allRules,
        scope: existingStandard.scope,
        userId,
        organizationId,
      };

      const newStandardVersion =
        await this.standardVersionService.addStandardVersion(
          standardVersionData,
        );

      this.logger.info('Rule updated in standard successfully', {
        standardId: existingStandard.id,
        ruleId,
        newVersion: nextVersion,
        versionId: newStandardVersion.id,
        updatedRuleContent: newRuleContent.substring(0, 50) + '...',
      });

      // Queue summary generation job
      await this.generateStandardSummaryDelayedJob.addJob({
        userId,
        organizationId,
        standardVersion: newStandardVersion,
        rules: allRules,
      });

      // Validate detection programs for all rules and languages
      await this.validateDetectionProgramsForStandardVersion(
        newStandardVersion.id,
        organizationId,
        userId,
      );

      return newStandardVersion;
    } catch (error) {
      this.logger.error('Failed to update rule in standard', {
        standardId,
        ruleId,
        organizationId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async validateDetectionProgramsForStandardVersion(
    standardVersionId: StandardVersionId,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<void> {
    if (!this.linterAdapter) {
      return;
    }

    this.logger.info('Validating detection programs for standard version', {
      standardVersionId,
    });

    const rules =
      await this.ruleRepository.findByStandardVersionId(standardVersionId);

    for (const rule of rules) {
      const examples = await this.ruleExampleRepository.findByRuleId(rule.id);
      const languages = new Set(examples.map((ex) => ex.lang));

      for (const language of languages) {
        try {
          await this.linterAdapter.updateRuleDetectionAssessmentAfterUpdate({
            ruleId: rule.id,
            language,
            organizationId,
            userId,
          });
        } catch (error) {
          this.logger.error('Failed to update detection program status', {
            ruleId: rule.id,
            language,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  }
}
