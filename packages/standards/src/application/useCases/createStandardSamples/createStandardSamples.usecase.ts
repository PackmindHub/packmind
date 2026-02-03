import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
  getErrorMessage,
} from '@packmind/node-utils';
import {
  CreateStandardSamplesCommand,
  CreateStandardSamplesResponse,
  IAccountsPort,
  ICreateStandardSamplesUseCase,
  IStandardsPort,
  OrganizationId,
  ProgrammingLanguage,
  SampleError,
  SpaceId,
  Standard,
  StandardSampleSelectedEvent,
  UserId,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import {
  StandardSampleContent,
  getStandardSample,
  sampleExists,
} from '../../../../samples';

const origin = 'CreateStandardSamplesUsecase';

export class CreateStandardSamplesUsecase
  extends AbstractMemberUseCase<
    CreateStandardSamplesCommand,
    CreateStandardSamplesResponse
  >
  implements ICreateStandardSamplesUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly standardsPort: IStandardsPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: CreateStandardSamplesCommand & MemberContext,
  ): Promise<CreateStandardSamplesResponse> {
    const { organizationId, spaceId, samples, userId } = command;

    for (const sample of samples) {
      this.eventEmitterService.emit(
        new StandardSampleSelectedEvent({
          sampleId: sample.id,
          sampleType: sample.type,
          spaceId,
          organizationId: createOrganizationId(organizationId),
          userId: createUserId(userId),
          source: 'ui',
        }),
      );
    }

    this.logger.info('Starting createStandardSamples process', {
      organizationId,
      spaceId,
      userId,
      samplesCount: samples.length,
    });

    const created: Standard[] = [];
    const errors: SampleError[] = [];

    for (const sample of samples) {
      try {
        this.logger.info('Processing sample', {
          sampleId: sample.id,
          type: sample.type,
        });

        if (!sampleExists(sample.id)) {
          this.logger.warn('Sample file not found', {
            sampleId: sample.id,
            type: sample.type,
          });
          errors.push({
            sampleId: sample.id,
            type: sample.type,
            error: `Sample file not found: ${sample.id}`,
          });
          continue;
        }

        const sampleContent = await getStandardSample(sample.id);

        if (!sampleContent) {
          this.logger.warn('Failed to load sample content', {
            sampleId: sample.id,
            type: sample.type,
          });
          errors.push({
            sampleId: sample.id,
            type: sample.type,
            error: `Failed to load sample content: ${sample.id}`,
          });
          continue;
        }

        const standard = await this.createStandardFromSample(
          sampleContent,
          createOrganizationId(organizationId),
          createUserId(userId),
          spaceId,
        );

        created.push(standard);
        this.logger.info('Sample processed successfully', {
          sampleId: sample.id,
          standardId: standard.id,
        });
      } catch (error) {
        this.logger.error('Failed to create standard from sample', {
          sampleId: sample.id,
          type: sample.type,
          error: getErrorMessage(error),
        });
        errors.push({
          sampleId: sample.id,
          type: sample.type,
          error: getErrorMessage(error),
        });
      }
    }

    this.logger.info('CreateStandardSamples process completed', {
      organizationId,
      userId,
      createdCount: created.length,
      errorsCount: errors.length,
    });

    return { created, errors };
  }

  private async createStandardFromSample(
    sampleContent: StandardSampleContent,
    organizationId: OrganizationId,
    userId: UserId,
    spaceId: SpaceId,
  ): Promise<Standard> {
    const rules = sampleContent.rules.map((rule) => ({
      content: rule.content,
      examples: rule.examples
        ? [
            {
              positive: rule.examples.positive,
              negative: rule.examples.negative,
              language: rule.examples.language as ProgrammingLanguage,
            },
          ]
        : [],
    }));

    return this.standardsPort.createStandardWithExamples({
      name: sampleContent.name,
      description: sampleContent.description,
      summary: sampleContent.summary,
      rules,
      organizationId,
      userId,
      scope: sampleContent.scope,
      spaceId,
      disableTriggerAssessment: true,
      source: 'ui',
      method: 'sample',
    });
  }
}
