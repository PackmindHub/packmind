import { StandardService } from '../../services/StandardService';
import {
  StandardVersionService,
  CreateStandardVersionData,
} from '../../services/StandardVersionService';
import slug from 'slug';
import { LogLevel, PackmindLogger, StandardVersion } from '@packmind/shared';
import { OrganizationId, UserId } from '@packmind/accounts';
import { GenerateStandardSummaryDelayedJob } from '../../jobs/GenerateStandardSummaryDelayedJob';

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
    private readonly generateStandardSummaryDelayedJob: GenerateStandardSummaryDelayedJob,
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

      this.logger.info('Creating initial standard version with rules');
      const standardVersionData: CreateStandardVersionData = {
        standardId: standard.id,
        name,
        slug: standardSlug,
        description,
        version: initialVersion,
        rules: rules.map((r) => ({ content: r.content, examples: [] })),
        scope,
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

      await this.generateStandardVersionSummary(
        userId,
        organizationId,
        standardVersion,
        rules,
      );

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

  public async generateStandardVersionSummary(
    userId: UserId,
    organizationId: OrganizationId,
    standardVersion: StandardVersion,
    rules: Array<{ content: string }>,
  ) {
    await this.generateStandardSummaryDelayedJob.addJob({
      userId,
      organizationId,
      standardVersion,
      rules: rules.map((r) => ({ content: r.content, examples: [] })),
    });
  }
}
