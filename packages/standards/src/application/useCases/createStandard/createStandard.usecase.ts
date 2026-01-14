import { LogLevel, PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  CreateStandardCommand,
  CreateStandardResponse,
  ICreateStandardUseCase,
  OrganizationId,
  PackmindEventSource,
  RuleAddedEvent,
  StandardCreatedEvent,
  StandardId,
  StandardVersion,
  StandardVersionId,
  UserId,
  createOrganizationId,
  createSpaceId,
  createStandardId,
  createStandardVersionId,
  createUserId,
} from '@packmind/types';
import slug from 'slug';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { GenerateStandardSummaryDelayedJob } from '../../jobs/GenerateStandardSummaryDelayedJob';
import { StandardService } from '../../services/StandardService';
import {
  CreateStandardVersionData,
  StandardVersionService,
} from '../../services/StandardVersionService';

const origin = 'CreateStandardUsecase';

export class CreateStandardUsecase implements ICreateStandardUseCase {
  constructor(
    private readonly standardService: StandardService,
    private readonly standardVersionService: StandardVersionService,
    private readonly generateStandardSummaryDelayedJob: GenerateStandardSummaryDelayedJob,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly ruleRepository: IRuleRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('CreateStandardUsecase initialized');
  }

  public async execute(
    command: CreateStandardCommand,
  ): Promise<CreateStandardResponse> {
    const {
      name,
      description,
      rules,
      scope,
      spaceId: spaceIdString,
      organizationId: orgIdString,
      userId: userIdString,
    } = command;
    const organizationId = createOrganizationId(orgIdString);
    const userId = createUserId(userIdString);
    const spaceId = createSpaceId(spaceIdString);
    this.logger.info('Starting createStandard process', {
      name,
      organizationId,
      userId,
      spaceId,
      rulesCount: rules.length,
      scope,
    });

    try {
      this.logger.info('Generating slug from standard name', { name });
      const baseSlug = slug(name);
      this.logger.info('Base slug generated', { slug: baseSlug });

      // Ensure slug is unique per space. If it exists, append "-1", "-2", ... until unique
      this.logger.info('Checking slug uniqueness within space', {
        baseSlug,
        spaceId,
        organizationId,
      });
      const existingStandards =
        await this.standardService.listStandardsBySpace(spaceId);
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
        userId,
        scope,
        spaceId,
      });
      this.logger.info('Standard entity created successfully', {
        standardId: standard.id,
        name,
        organizationId,
        userId,
        spaceId,
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
        spaceId,
        rulesCount: rules.length,
      });

      await this.generateStandardVersionSummary(
        userId,
        organizationId,
        standardVersion,
        rules,
      );

      this.eventEmitterService.emit(
        new StandardCreatedEvent({
          standardId: createStandardId(standard.id),
          spaceId,
          organizationId,
          userId,
          source: 'ui',
        }),
      );

      await this.emitRuleAddedEventsForRules(
        createStandardId(standard.id),
        createStandardVersionId(standardVersion.id),
        initialVersion,
        organizationId,
        userId,
        'ui',
      );

      return standard;
    } catch (error) {
      this.logger.error('Failed to create standard', {
        name,
        organizationId,
        userId,
        spaceId,
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

  private async emitRuleAddedEventsForRules(
    standardId: StandardId,
    standardVersionId: StandardVersionId,
    version: number,
    organizationId: OrganizationId,
    userId: UserId,
    source: PackmindEventSource,
  ): Promise<void> {
    this.logger.info('Querying created rules to emit RuleAddedEvents', {
      standardVersionId,
      standardId,
    });

    const createdRules =
      await this.ruleRepository.findByStandardVersionId(standardVersionId);

    if (createdRules.length === 0) {
      this.logger.debug('No rules to emit events for', { standardId });
      return;
    }

    this.logger.info('Emitting RuleAddedEvent for each created rule', {
      rulesCount: createdRules.length,
      standardId,
    });

    createdRules.forEach(() => {
      this.eventEmitterService.emit(
        new RuleAddedEvent({
          standardId,
          standardVersionId,
          organizationId,
          userId,
          newVersion: version,
          source,
        }),
      );
    });

    this.logger.info('RuleAddedEvents emitted successfully', {
      count: createdRules.length,
      standardId,
    });
  }
}
