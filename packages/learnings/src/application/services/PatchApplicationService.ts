import { PackmindLogger } from '@packmind/logger';
import {
  IRecipesPort,
  IStandardsPort,
  KnowledgePatch,
  KnowledgePatchType,
  OrganizationId,
  RuleId,
  StandardId,
} from '@packmind/types';

const origin = 'PatchApplicationService';

export class PatchApplicationService {
  constructor(
    private readonly standardsPort: IStandardsPort | null,
    private readonly recipesPort: IRecipesPort | null,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('PatchApplicationService initialized');
  }

  async applyPatch(
    patch: KnowledgePatch,
    organizationId: OrganizationId,
    userId: string,
  ): Promise<boolean> {
    this.logger.info('Applying knowledge patch', {
      patchId: patch.id,
      patchType: patch.patchType,
    });

    try {
      switch (patch.patchType) {
        case KnowledgePatchType.UPDATE_STANDARD:
          return await this.applyStandardUpdate(patch, organizationId, userId);

        case KnowledgePatchType.NEW_STANDARD:
          this.logger.warn('NEW_STANDARD patch type not yet implemented', {
            patchId: patch.id,
          });
          return false;

        case KnowledgePatchType.UPDATE_RECIPE:
          this.logger.warn('UPDATE_RECIPE patch type not yet implemented', {
            patchId: patch.id,
          });
          return false;

        case KnowledgePatchType.NEW_RECIPE:
          this.logger.warn('NEW_RECIPE patch type not yet implemented', {
            patchId: patch.id,
          });
          return false;

        default:
          this.logger.error('Unknown patch type', {
            patchId: patch.id,
            patchType: patch.patchType,
          });
          return false;
      }
    } catch (error) {
      this.logger.error('Failed to apply knowledge patch', {
        patchId: patch.id,
        patchType: patch.patchType,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async applyStandardUpdate(
    patch: KnowledgePatch,
    organizationId: OrganizationId,
    userId: string,
  ): Promise<boolean> {
    if (!this.standardsPort) {
      this.logger.error('StandardsPort not available', {
        patchId: patch.id,
      });
      throw new Error('StandardsPort not available for applying patch');
    }

    const proposedChanges = patch.proposedChanges as {
      standardId: string;
      action: 'addRule' | 'updateRule';
      targetRuleId: string | null;
      content: string;
      rationale: string;
    };

    const { standardId, action, targetRuleId, content } = proposedChanges;

    this.logger.info('Applying standard update', {
      patchId: patch.id,
      standardId,
      action,
      targetRuleId,
    });

    // Get the standard to retrieve its slug
    const standard = await this.standardsPort.getStandard(
      standardId as StandardId,
    );
    if (!standard) {
      this.logger.error('Standard not found', {
        patchId: patch.id,
        standardId,
      });
      throw new Error(`Standard ${standardId} not found`);
    }

    if (action === 'addRule') {
      await this.standardsPort.addRuleToStandard({
        standardSlug: standard.slug,
        ruleContent: content,
        organizationId,
        userId,
      });

      this.logger.info('Rule added to standard successfully', {
        patchId: patch.id,
        standardId,
        standardSlug: standard.slug,
      });
      return true;
    } else if (action === 'updateRule') {
      if (!targetRuleId) {
        this.logger.error('targetRuleId is required for updateRule action', {
          patchId: patch.id,
          standardId,
        });
        throw new Error('targetRuleId is required for updateRule action');
      }

      await this.standardsPort.updateStandardRules({
        standardId: standardId as StandardId,
        ruleId: targetRuleId as RuleId,
        newRuleContent: content,
        organizationId,
        userId,
      });

      this.logger.info('Rule updated in standard successfully', {
        patchId: patch.id,
        standardId,
        targetRuleId,
      });
      return true;
    } else {
      this.logger.error('Unknown action for standard update', {
        patchId: patch.id,
        action,
      });
      return false;
    }
  }
}
