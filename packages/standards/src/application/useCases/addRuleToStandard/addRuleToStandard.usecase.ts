import { StandardService } from '../../services/StandardService';
import { StandardVersionService } from '../../services/StandardVersionService';
import { GenerateStandardSummaryDelayedJob } from '../../jobs/GenerateStandardSummaryDelayedJob';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import {
  AddRuleToStandardCommand,
  AddRuleToStandardResponse,
  createRuleExampleId,
  createRuleId,
  createSpaceId,
  createStandardId,
  createStandardVersionId,
  IAccountsPort,
  IAddRuleToStandardUseCase,
  OrganizationId,
  RuleAddedEvent,
  RuleExample,
  RuleExampleInput,
  StandardUpdatedEvent,
  StandardVersionId,
  UserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { CreateStandardVersionData } from '../../services/StandardVersionService';
import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import type { ILinterPort } from '@packmind/types';

const origin = 'AddRuleToStandardUsecase';

export class AddRuleToStandardUsecase
  extends AbstractMemberUseCase<
    AddRuleToStandardCommand,
    AddRuleToStandardResponse
  >
  implements IAddRuleToStandardUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly standardService: StandardService,
    private readonly standardVersionService: StandardVersionService,
    private readonly ruleRepository: IRuleRepository,
    private readonly ruleExampleRepository: IRuleExampleRepository,
    private readonly generateStandardSummaryDelayedJob: GenerateStandardSummaryDelayedJob,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly linterAdapter?: ILinterPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: AddRuleToStandardCommand & MemberContext,
  ): Promise<AddRuleToStandardResponse> {
    const { standardSlug, ruleContent, examples, source = 'ui' } = command;
    const { user, organization } = command;
    const userId = user.id;
    const organizationId = organization.id;

    const normalizedSlug = standardSlug.toLowerCase();

    this.logger.info('Starting addRuleToStandard process', {
      standardSlug,
      normalizedSlug,
      organizationId,
      userId,
      ruleContent: ruleContent.substring(0, 50) + '...',
    });

    try {
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

      const nextVersion = existingStandard.version + 1;

      await this.standardService.updateStandard(existingStandard.id, {
        name: existingStandard.name,
        description: existingStandard.description,
        slug: existingStandard.slug,
        version: nextVersion,
        gitCommit: undefined,
        userId,
        scope: existingStandard.scope,
      });

      const allRules: Array<{
        content: string;
        examples: RuleExample[];
      }> = [];
      for (const rule of existingRules) {
        const ruleExamples = await this.ruleExampleRepository.findByRuleId(
          rule.id,
        );
        allRules.push({ content: rule.content, examples: ruleExamples || [] });
      }

      const processedExamples = this.processExamples(examples || []);
      allRules.push({ content: ruleContent, examples: processedExamples });

      const standardVersionData: CreateStandardVersionData = {
        standardId: existingStandard.id,
        name: existingStandard.name,
        slug: existingStandard.slug,
        description: existingStandard.description,
        version: nextVersion,
        rules: allRules,
        scope: existingStandard.scope,
        userId,
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

      await this.generateStandardSummaryDelayedJob.addJob({
        userId,
        organizationId,
        standardVersion: newStandardVersion,
        rules: allRules,
      });

      await this.validateDetectionProgramsForStandardVersion(
        newStandardVersion.id,
        organizationId,
        userId,
      );

      this.eventEmitterService.emit(
        new RuleAddedEvent({
          standardId: createStandardId(existingStandard.id),
          standardVersionId: createStandardVersionId(newStandardVersion.id),
          organizationId,
          userId,
          newVersion: nextVersion,
          source,
        }),
      );

      this.eventEmitterService.emit(
        new StandardUpdatedEvent({
          standardId: createStandardId(existingStandard.id),
          spaceId: createSpaceId(existingStandard.spaceId),
          organizationId,
          userId,
          newVersion: nextVersion,
          source,
        }),
      );

      return { standardVersion: newStandardVersion };
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

  private async validateDetectionProgramsForStandardVersion(
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

  private processExamples(examples: RuleExampleInput[]): RuleExample[] {
    const processedExamples: RuleExample[] = [];

    for (const exampleInput of examples) {
      if (!exampleInput.language) {
        this.logger.warn('Example missing language, skipping');
        continue;
      }

      const ruleExample: RuleExample = {
        id: createRuleExampleId(uuidv4()),
        ruleId: createRuleId(uuidv4()),
        lang: exampleInput.language,
        positive: exampleInput.positive || '',
        negative: exampleInput.negative || '',
      };

      processedExamples.push(ruleExample);
    }

    return processedExamples;
  }
}
