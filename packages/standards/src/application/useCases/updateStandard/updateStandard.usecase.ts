import { StandardService } from '../../services/StandardService';
import {
  StandardVersionService,
  CreateStandardVersionData,
} from '../../services/StandardVersionService';
import { StandardId } from '../../../domain/entities/Standard';
import { RuleId } from '../../../domain/entities/Rule';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import { RuleExample, StandardVersion } from '@packmind/shared';

import { LogLevel, PackmindLogger } from '@packmind/shared';
import { OrganizationId, UserId } from '@packmind/accounts';
import { GenerateStandardSummaryDelayedJob } from '../../jobs/GenerateStandardSummaryDelayedJob';

const origin = 'UpdateStandardUsecase';

export type UpdateStandardRequest = {
  standardId: StandardId;
  name: string;
  description: string;
  rules: Array<{ id: RuleId; content: string }>;
  organizationId: OrganizationId;
  userId: UserId;
  scope: string | null;
};

export class UpdateStandardUsecase {
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

      const existingRulesById = new Map(existingRules.map((r) => [r.id, r]));
      const rulesWithExamples: Array<{
        content: string;
        examples: RuleExample[];
      }> = [];
      for (const r of rules) {
        const persisted = existingRulesById.get(r.id);
        if (persisted) {
          // Copy examples from the persisted rule
          const examples = await this.ruleExampleRepository.findByRuleId(
            persisted.id,
          );
          rulesWithExamples.push({ content: r.content, examples });
        } else {
          // New rule or id not found: no examples to copy
          rulesWithExamples.push({ content: r.content, examples: [] });
        }
      }

      // Create new standard version with updated rules
      const standardVersionData: CreateStandardVersionData = {
        standardId,
        name,
        slug: standardSlug,
        description,
        version: nextVersion,
        rules: rulesWithExamples,
        scope,
        userId, // Track the user who updated this through Web UI
      };

      const newStandardVersion =
        await this.standardVersionService.addStandardVersion(
          standardVersionData,
        );

      await this.generateStandardSummary(
        userId,
        organizationId,
        newStandardVersion,
        rulesWithExamples,
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

  public async generateStandardSummary(
    userId: UserId,
    organizationId: OrganizationId,
    newStandardVersion: StandardVersion,
    rulesWithExamples: Array<{ content: string; examples: RuleExample[] }>,
  ) {
    await this.generateStandardSummaryDelayedJob.addJob({
      userId,
      organizationId,
      standardVersion: newStandardVersion,
      rules: rulesWithExamples,
    });
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
