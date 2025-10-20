import { StandardService } from '../../services/StandardService';
import { StandardVersionService } from '../../services/StandardVersionService';
import { GenerateStandardSummaryDelayedJob } from '../../jobs/GenerateStandardSummaryDelayedJob';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { StandardVersion } from '../../../domain/entities/StandardVersion';
import { CreateStandardVersionData } from '../../services/StandardVersionService';
import { LogLevel, PackmindLogger, RuleExample } from '@packmind/shared';
import { OrganizationId, UserId } from '@packmind/accounts';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';

const origin = 'AddRuleToStandardUsecase';

export type AddRuleToStandardRequest = {
  standardSlug: string;
  ruleContent: string;
  organizationId: OrganizationId;
  userId: UserId;
};

export class AddRuleToStandardUsecase {
  constructor(
    private readonly standardService: StandardService,
    private readonly standardVersionService: StandardVersionService,
    private readonly ruleRepository: IRuleRepository,
    private readonly ruleExampleRepository: IRuleExampleRepository,
    private readonly generateStandardSummaryDelayedJob: GenerateStandardSummaryDelayedJob,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('AddRuleToStandardUsecase initialized');
  }

  public async addRuleToStandard({
    standardSlug,
    ruleContent,
    organizationId,
    userId,
  }: AddRuleToStandardRequest): Promise<StandardVersion> {
    // Normalize the slug to lowercase for consistent lookup
    const normalizedSlug = standardSlug.toLowerCase();

    this.logger.info('Starting addRuleToStandard process', {
      standardSlug,
      normalizedSlug,
      organizationId,
      userId,
      ruleContent: ruleContent.substring(0, 50) + '...',
    });

    try {
      // Find the standard by slug within the organization
      const existingStandard = await this.standardService.findStandardBySlug(
        normalizedSlug,
        organizationId,
      );
      if (!existingStandard) {
        this.logger.error('Standard not found by slug and organization', {
          standardSlug,
          normalizedSlug,
          organizationId,
        });
        throw new Error(
          'Standard slug not found, please check current standards first',
        );
      }

      // Get the latest version to get existing rules
      const latestVersion =
        await this.standardVersionService.getLatestStandardVersion(
          existingStandard.id,
        );

      if (!latestVersion) {
        this.logger.error('No versions found for standard', {
          standardId: existingStandard.id,
        });
        throw new Error(
          `No versions found for standard ${existingStandard.id}`,
        );
      }

      const existingRules = await this.ruleRepository.findByStandardVersionId(
        latestVersion.id,
      );

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
        organizationId,
        userId,
        scope: existingStandard.scope,
      });

      const allRules: Array<{
        content: string;
        examples: RuleExample[];
      }> = [];
      for (const rule of existingRules) {
        const examples = await this.ruleExampleRepository.findByRuleId(rule.id);
        allRules.push({ content: rule.content, examples: examples || [] });
      }

      //Push new rule to allRules
      allRules.push({ content: ruleContent, examples: [] });

      this.logger.debug('Prepared rules for new version', {
        existingRulesCount: existingRules.length,
        totalRulesCount: allRules.length,
        newRuleContent: ruleContent.substring(0, 50) + '...',
      });

      // Create new standard version with existing rules + new rule
      this.logger.debug('Creating new standard version with additional rule');
      const standardVersionData: CreateStandardVersionData = {
        standardId: existingStandard.id,
        name: existingStandard.name,
        slug: existingStandard.slug,
        description: existingStandard.description,
        version: nextVersion,
        rules: allRules,
        scope: existingStandard.scope,
        userId, // Track the user who added the rule
      };

      const newStandardVersion =
        await this.standardVersionService.addStandardVersion(
          standardVersionData,
        );

      this.logger.info('Rule added to standard successfully', {
        standardId: existingStandard.id,
        standardSlug,
        newVersion: nextVersion,
        versionId: newStandardVersion.id,
        totalRulesCount: allRules.length,
        addedRuleContent: ruleContent.substring(0, 50) + '...',
      });

      this.logger.info('AddRuleToStandard process completed successfully', {
        standardId: existingStandard.id,
        versionId: newStandardVersion.id,
        standardSlug,
        organizationId,
        userId,
        totalRulesCount: allRules.length,
      });

      // Queue summary generation job
      await this.generateStandardSummaryDelayedJob.addJob({
        userId,
        organizationId,
        standardVersion: newStandardVersion,
        rules: allRules,
      });

      return newStandardVersion;
    } catch (error) {
      this.logger.error('Failed to add rule to standard', {
        standardSlug,
        organizationId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
