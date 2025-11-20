import { PackmindLogger } from '@packmind/logger';
import {
  OrganizationId,
  RuleExample,
  createRuleExampleId,
} from '@packmind/types';
import { UpdateRuleExampleUsecase } from '../updateRuleExample/updateRuleExample.usecase';

const origin = 'UpdateStandardExampleUsecase';

export class UpdateStandardExampleUsecase {
  constructor(
    private readonly updateRuleExampleUsecase: UpdateRuleExampleUsecase,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('UpdateStandardExampleUsecase initialized');
  }

  async updateStandardExample(params: {
    exampleId: string;
    lang: string;
    positive: string;
    negative: string;
    organizationId: OrganizationId;
    userId: string;
  }): Promise<RuleExample> {
    const { exampleId, lang, positive, negative, organizationId, userId } =
      params;

    this.logger.info('Updating standard example', {
      exampleId,
      lang,
      organizationId,
      userId,
    });

    try {
      // Delegate to the existing updateRuleExample use case
      const ruleExampleId = createRuleExampleId(exampleId);

      const updatedExample = await this.updateRuleExampleUsecase.execute({
        ruleExampleId,
        lang: lang as any, // Port accepts string, but UpdateRuleExampleCommand expects ProgrammingLanguage
        positive,
        negative,
        organizationId: organizationId.toString(),
        userId,
      });

      this.logger.info('Standard example updated successfully', {
        exampleId,
        lang: updatedExample.lang,
      });

      return updatedExample;
    } catch (error) {
      this.logger.error('Failed to update standard example', {
        exampleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
