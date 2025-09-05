import { StandardService } from '../../services/StandardService';
import {
  StandardVersionService,
  CreateStandardVersionData,
} from '../../services/StandardVersionService';
import { StandardSummaryService } from '../../services/StandardSummaryService';
import { StandardId } from '../../../domain/entities/Standard';
import { Rule, createRuleId } from '../../../domain/entities/Rule';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';

import { LogLevel, PackmindLogger, AiNotConfigured } from '@packmind/shared';
import { OrganizationId, UserId } from '@packmind/accounts';
import { v4 as uuidv4 } from 'uuid';
import { createStandardVersionId } from '../../../domain/entities/StandardVersion';

const origin = 'UpdateStandardUsecase';

export type UpdateStandardRequest = {
  standardId: StandardId;
  name: string;
  description: string;
  rules: Array<{ content: string }>;
  organizationId: OrganizationId;
  userId: UserId;
  scope: string | null;
};

export class UpdateStandardUsecase {
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
    this.logger.info('UpdateStandardUsecase initialized');
  }

  public async updateStandard({
    standardId,
    name,
    description,
    rules,
    organizationId,
    userId,
    scope,
  }: UpdateStandardRequest) {
    this.logger.info('Starting updateStandard process', {
      standardId,
      name,
      organizationId,
      userId,
      rulesCount: rules.length,
      scope,
    });

    try {
      // Check if the standard exists
      const existingStandard =
        await this.standardService.getStandardById(standardId);
      if (!existingStandard) {
        this.logger.error('Standard not found for update', { standardId });
        throw new Error(`Standard with id ${standardId} not found`);
      }

      this.logger.debug('Found existing standard', {
        standardId,
        currentVersion: existingStandard.version,
        existingName: existingStandard.name,
      });

      // Get the latest version to compare content
      const latestVersion =
        await this.standardVersionService.getLatestStandardVersion(standardId);

      if (!latestVersion) {
        this.logger.error('No versions found for standard', { standardId });
        throw new Error(`No versions found for standard ${standardId}`);
      }

      // Get existing rules for content comparison
      const existingRules = await this.ruleRepository.findByStandardVersionId(
        latestVersion.id,
      );

      // Check if content has changed (strict content equality)
      const contentHasChanged = this.hasContentChanged(
        {
          name: latestVersion.name,
          description: latestVersion.description,
          scope: latestVersion.scope,
          rules: existingRules.map((rule) => ({ content: rule.content })),
        },
        { name, description, scope, rules },
      );

      if (!contentHasChanged) {
        this.logger.info('Content is identical, no update needed', {
          standardId,
          name,
        });
        return existingStandard;
      }

      this.logger.info('Content has changed, creating new version', {
        standardId,
        currentVersion: existingStandard.version,
      });

      // Always preserve the original slug when updating a standard
      const standardSlug = existingStandard.slug;
      this.logger.debug('Preserving original slug for updated standard', {
        slug: standardSlug,
        preservedOriginalSlug: true,
      });

      // Business logic: Increment version number
      const nextVersion = existingStandard.version + 1;
      this.logger.debug('Incrementing version number', {
        currentVersion: existingStandard.version,
        nextVersion,
      });

      // Update the standard entity
      const updatedStandard = await this.standardService.updateStandard(
        standardId,
        {
          name,
          description,
          slug: standardSlug,
          version: nextVersion,
          gitCommit: undefined,
          organizationId,
          userId,
          scope,
        },
      );

      // Generate summary for the updated standard version
      let summary: string | null = null;
      try {
        this.logger.debug('Generating summary for updated standard version', {
          rulesCount: rules.length,
        });

        // Convert rule data to Rule-like objects for summary generation
        const ruleEntities: Rule[] = rules.map((rule) => ({
          id: createRuleId(uuidv4()), // Temporary ID for summary generation
          content: rule.content,
          standardVersionId: createStandardVersionId(uuidv4()), // Temporary ID for summary generation
        }));

        summary = await this.standardSummaryService.createStandardSummary(
          {
            standardId,
            name,
            slug: standardSlug,
            description,
            version: nextVersion,
            summary: null,
            scope,
          },
          ruleEntities,
        );
        this.logger.debug('Summary generated successfully for update', {
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
            'Failed to generate summary during update, proceeding without summary',
            {
              error: errorMessage,
            },
          );
        }
      }

      // Create new standard version with updated rules
      this.logger.debug('Creating new standard version with updated rules');
      const standardVersionData: CreateStandardVersionData = {
        standardId,
        name,
        slug: standardSlug,
        description,
        version: nextVersion,
        rules,
        scope,
        summary,
        userId, // Track the user who updated this through Web UI
      };

      const newStandardVersion =
        await this.standardVersionService.addStandardVersion(
          standardVersionData,
        );

      this.logger.info('Standard updated successfully', {
        standardId,
        newVersion: nextVersion,
        versionId: newStandardVersion.id,
        rulesCount: rules.length,
      });

      this.logger.info('UpdateStandard process completed successfully', {
        standardId,
        versionId: newStandardVersion.id,
        name,
        organizationId,
        userId,
        rulesCount: rules.length,
      });

      return updatedStandard;
    } catch (error) {
      this.logger.error('Failed to update standard', {
        standardId,
        name,
        organizationId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private hasContentChanged(
    existing: {
      name: string;
      description: string;
      scope: string | null;
      rules: Array<{ content: string }>;
    },
    updated: {
      name: string;
      description: string;
      scope: string | null;
      rules: Array<{ content: string }>;
    },
  ): boolean {
    // Compare name
    if (existing.name !== updated.name) {
      this.logger.debug('Name has changed', {
        existingName: existing.name,
        updatedName: updated.name,
      });
      return true;
    }

    // Compare description
    if (existing.description !== updated.description) {
      this.logger.debug('Description has changed');
      return true;
    }

    // Compare scope
    if (existing.scope !== updated.scope) {
      this.logger.debug('Scope has changed', {
        existingScope: existing.scope,
        updatedScope: updated.scope,
      });
      return true;
    }

    // Compare rules (strict content equality)
    if (existing.rules.length !== updated.rules.length) {
      this.logger.debug('Rules count has changed', {
        existingCount: existing.rules.length,
        updatedCount: updated.rules.length,
      });
      return true;
    }

    // Sort both arrays by content for comparison
    const existingRulesSorted = [...existing.rules].sort((a, b) =>
      a.content.localeCompare(b.content),
    );
    const updatedRulesSorted = [...updated.rules].sort((a, b) =>
      a.content.localeCompare(b.content),
    );

    for (let i = 0; i < existingRulesSorted.length; i++) {
      if (existingRulesSorted[i].content !== updatedRulesSorted[i].content) {
        this.logger.debug('Rule content has changed', {
          ruleIndex: i,
          existingContent: existingRulesSorted[i].content,
          updatedContent: updatedRulesSorted[i].content,
        });
        return true;
      }
    }

    this.logger.debug('No content changes detected');
    return false;
  }
}
