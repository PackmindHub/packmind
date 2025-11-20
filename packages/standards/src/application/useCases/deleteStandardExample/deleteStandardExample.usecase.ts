import { PackmindLogger } from '@packmind/logger';
import {
  OrganizationId,
  createRuleExampleId,
} from '@packmind/types';
import { DeleteRuleExampleUsecase } from '../deleteRuleExample/deleteRuleExample.usecase';

const origin = 'DeleteStandardExampleUsecase';

export class DeleteStandardExampleUsecase {
  constructor(
    private readonly deleteRuleExampleUsecase: DeleteRuleExampleUsecase,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('DeleteStandardExampleUsecase initialized');
  }

  async deleteStandardExample(params: {
    exampleId: string;
    organizationId: OrganizationId;
    userId: string;
  }): Promise<void> {
    const { exampleId, organizationId, userId } = params;

    this.logger.info('Deleting standard example', {
      exampleId,
      organizationId,
      userId,
    });

    try {
      // Delegate to the existing deleteRuleExample use case
      const ruleExampleId = createRuleExampleId(exampleId);

      await this.deleteRuleExampleUsecase.execute({
        ruleExampleId,
        organizationId: organizationId.toString(),
        userId,
      });

      this.logger.info('Standard example deleted successfully', {
        exampleId,
      });
    } catch (error) {
      this.logger.error('Failed to delete standard example', {
        exampleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
