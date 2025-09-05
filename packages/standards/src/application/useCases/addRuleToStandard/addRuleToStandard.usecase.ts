import { StandardService } from '../../services/StandardService';
import { StandardVersionService } from '../../services/StandardVersionService';
import { StandardSummaryService } from '../../services/StandardSummaryService';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { StandardVersion } from '../../../domain/entities/StandardVersion';
import { Rule, createRuleId } from '../../../domain/entities/Rule';
import { CreateStandardVersionData } from '../../services/StandardVersionService';
import { LogLevel, PackmindLogger, AiNotConfigured } from '@packmind/shared';
import { OrganizationId, UserId } from '@packmind/accounts';
import { v4 as uuidv4 } from 'uuid';

import { createStandardVersionId } from '../../../domain/entities/StandardVersion';

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
    private readonly standardSummaryService: StandardSummaryService,
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
      const existingStandard =
        await this.standardService.findStandardBySlug(normalizedSlug);
      if (!existingStandard) {
        this.logger.error('Standard not found by slug', {
          standardSlug,
          normalizedSlug,
        });
        throw new Error(
          'Standard slug not found, please check current standards first',
        );
      }

      // Verify the standard belongs to the same organization
      if (existingStandard.organizationId !== organizationId) {
        this.logger.error('Standard does not belong to the user organization', {
          standardSlug,
          normalizedSlug,
          standardOrganizationId: existingStandard.organizationId,
          userOrganizationId: organizationId,
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

      // Prepare rules for the new version (existing + new rule)
      const allRules = [
        ...existingRules.map((rule) => ({ content: rule.content })),
        { content: ruleContent },
      ];

      this.logger.debug('Prepared rules for new version', {
        existingRulesCount: existingRules.length,
        totalRulesCount: allRules.length,
        newRuleContent: ruleContent.substring(0, 50) + '...',
      });

      // Generate summary for the new standard version
      let summary: string | null = null;
      try {
        this.logger.debug('Generating summary for new standard version', {
          rulesCount: allRules.length,
        });

        // Convert rule data to Rule-like objects for summary generation
        const ruleEntities: Rule[] = allRules.map((rule) => ({
          id: createRuleId(uuidv4()), // Temporary ID for summary generation
          content: rule.content,
          standardVersionId: createStandardVersionId(uuidv4()), // Temporary ID for summary generation
        }));

        summary = await this.standardSummaryService.createStandardSummary(
          {
            standardId: existingStandard.id,
            name: existingStandard.name,
            slug: existingStandard.slug,
            description: existingStandard.description,
            version: nextVersion,
            summary: null,
            scope: existingStandard.scope,
          },
          ruleEntities,
        );
        this.logger.debug('Summary generated successfully', {
          summaryLength: summary.length,
        });
      } catch (summaryError) {
        if (summaryError instanceof AiNotConfigured) {
          this.logger.warn(
            'AI service not configured - proceeding without summary',
            {
              error: summaryError.message,
            },
          );
        } else {
          const errorMessage =
            summaryError instanceof Error
              ? summaryError.message
              : String(summaryError);
          this.logger.error(
            'Failed to generate summary, proceeding without summary',
            {
              error: errorMessage,
            },
          );
        }
      }

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
        summary,
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
