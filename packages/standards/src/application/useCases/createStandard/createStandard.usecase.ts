import { StandardService } from '../../services/StandardService';
import {
  StandardVersionService,
  CreateStandardVersionData,
} from '../../services/StandardVersionService';
import { StandardSummaryService } from '../../services/StandardSummaryService';
import { Standard } from '../../../domain/entities/Standard';
import { Rule, createRuleId } from '../../../domain/entities/Rule';
import slug from 'slug';
import { LogLevel, PackmindLogger, AiNotConfigured } from '@packmind/shared';
import { OrganizationId, UserId } from '@packmind/accounts';
import { v4 as uuidv4 } from 'uuid';
import { createStandardVersionId } from '../../../domain/entities/StandardVersion';

const origin = 'CreateStandardUsecase';

export type CreateStandardRequest = {
  name: string;
  description: string;
  rules: Array<{ content: string }>;
  organizationId: OrganizationId;
  userId: UserId;
  scope: string | null;
};

export class CreateStandardUsecase {
  constructor(
    private readonly standardService: StandardService,
    private readonly standardVersionService: StandardVersionService,
    private readonly standardSummaryService: StandardSummaryService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('CreateStandardUsecase initialized');
  }

  public async createStandard({
    name,
    description,
    rules,
    organizationId,
    userId,
    scope,
  }: CreateStandardRequest) {
    this.logger.info('Starting createStandard process', {
      name,
      organizationId,
      userId,
      rulesCount: rules.length,
      scope,
    });

    try {
      this.logger.info('Generating slug from standard name', { name });
      const baseSlug = slug(name);
      this.logger.info('Base slug generated', { slug: baseSlug });

      // Ensure slug is unique per organization. If it exists, append "-1", "-2", ... until unique
      this.logger.info('Checking slug uniqueness within organization', {
        baseSlug,
        organizationId,
      });
      const existingStandards =
        await this.standardService.listStandardsByOrganization(organizationId);
      const existingSlugs = new Set(existingStandards.map((s) => s.slug));

      let standardSlug = baseSlug;
      if (existingSlugs.has(standardSlug)) {
        let counter = 1;
        while (existingSlugs.has(`${baseSlug}-${counter}`)) {
          counter++;
        }
        standardSlug = `${baseSlug}-${counter}`;
      }
      this.logger.info('Resolved unique slug', { slug: standardSlug });

      // Business logic: Create standard with initial version 1
      const initialVersion = 1;

      this.logger.info('Creating standard entity');
      const standard = await this.standardService.addStandard({
        name,
        description,
        slug: standardSlug,
        version: initialVersion,
        gitCommit: undefined,
        organizationId,
        userId,
        scope,
      });
      this.logger.info('Standard entity created successfully', {
        standardId: standard.id,
        name,
        organizationId,
        userId,
      });

      const summary = await this.generateStandardVersionSummary(
        standard,
        name,
        standardSlug,
        description,
        initialVersion,
        scope,
        rules,
      );

      this.logger.info('Creating initial standard version with rules');
      const standardVersionData: CreateStandardVersionData = {
        standardId: standard.id,
        name,
        slug: standardSlug,
        description,
        version: initialVersion,
        rules: rules.map((r) => ({ content: r.content, examples: [] })),
        scope,
        summary,
        userId, // Track the user who created this through Web UI
      };

      const standardVersion =
        await this.standardVersionService.addStandardVersion(
          standardVersionData,
        );
      this.logger.info(
        'Initial standard version and rules created successfully',
        {
          versionId: standardVersion.id,
          standardId: standard.id,
          version: initialVersion,
          rulesCount: rules.length,
        },
      );

      this.logger.info('CreateStandard process completed successfully', {
        standardId: standard.id,
        versionId: standardVersion.id,
        name,
        organizationId,
        userId,
        rulesCount: rules.length,
      });

      return standard;
    } catch (error) {
      this.logger.error('Failed to create standard', {
        name,
        organizationId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async generateStandardVersionSummary(
    standard: Standard,
    name: string,
    standardSlug: string,
    description: string,
    initialVersion: number,
    scope: string | null,
    rules: Array<{ content: string }>,
  ) {
    // Generate summary for the standard version
    let summary: string | null = null;
    try {
      this.logger.info('Generating summary for standard version', {
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
          standardId: standard.id,
          name,
          slug: standardSlug,
          description,
          version: initialVersion,
          summary: null,
          scope,
        },
        ruleEntities,
      );
      this.logger.info('Summary generated successfully', {
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
    return summary;
  }
}
