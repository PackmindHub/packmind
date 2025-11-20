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
          return await this.applyStandardCreation(
            patch,
            organizationId,
            userId,
          );

        case KnowledgePatchType.UPDATE_RECIPE:
          return await this.applyRecipeUpdate(patch, organizationId, userId);

        case KnowledgePatchType.NEW_RECIPE:
          return await this.applyRecipeCreation(patch, organizationId, userId);

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
      changes?: {
        name?: string | null;
        description?: string | null;
        rulesToAdd?: string[] | null;
        rulesToUpdate?: Array<{ ruleId: string; content: string }> | null;
        rulesToDelete?: string[] | null;
        exampleChanges?: {
          toAdd?: Array<{
            lang: string;
            positive: string;
            negative: string;
          }> | null;
          toUpdate?: Array<{
            exampleId: string;
            lang: string;
            positive: string;
            negative: string;
          }> | null;
          toDelete?: string[] | null;
        } | null;
      };
      action?: 'addRule' | 'updateRule';
      targetRuleId?: string | null;
      content?: string;
      rationale: string;
    };

    const { standardId, changes, action, targetRuleId, content } =
      proposedChanges;

    this.logger.info('Applying standard update', {
      patchId: patch.id,
      standardId,
      hasChanges: !!changes,
      hasLegacyAction: !!action,
    });

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

    // Handle new comprehensive changes format
    if (changes) {
      // TODO: Implement name update when port method available
      if (changes.name) {
        this.logger.warn('Standard name update not yet supported by port', {
          patchId: patch.id,
          newName: changes.name,
        });
      }

      // TODO: Implement description update when port method available
      if (changes.description) {
        this.logger.warn(
          'Standard description update not yet supported by port',
          {
            patchId: patch.id,
          },
        );
      }

      // Add new rules
      if (changes.rulesToAdd && changes.rulesToAdd.length > 0) {
        for (const ruleContent of changes.rulesToAdd) {
          await this.standardsPort.addRuleToStandard({
            standardSlug: standard.slug,
            ruleContent,
            organizationId,
            userId,
          });
        }
        this.logger.info('Added new rules to standard', {
          patchId: patch.id,
          count: changes.rulesToAdd.length,
        });
      }

      // Update existing rules
      if (changes.rulesToUpdate && changes.rulesToUpdate.length > 0) {
        for (const ruleUpdate of changes.rulesToUpdate) {
          await this.standardsPort.updateStandardRules({
            standardId: standardId as StandardId,
            ruleId: ruleUpdate.ruleId as RuleId,
            newRuleContent: ruleUpdate.content,
            organizationId,
            userId,
          });
        }
        this.logger.info('Updated existing rules in standard', {
          patchId: patch.id,
          count: changes.rulesToUpdate.length,
        });
      }

      // TODO: Implement rule deletion when port method available
      if (changes.rulesToDelete && changes.rulesToDelete.length > 0) {
        this.logger.warn('Rule deletion not yet supported by port', {
          patchId: patch.id,
          ruleIds: changes.rulesToDelete,
        });
      }

      // TODO: Implement example changes when port methods available
      if (changes.exampleChanges) {
        this.logger.warn('Example changes not yet supported by port', {
          patchId: patch.id,
        });
      }

      return true;
    }

    // Handle legacy format for backward compatibility
    if (action === 'addRule' && content) {
      await this.standardsPort.addRuleToStandard({
        standardSlug: standard.slug,
        ruleContent: content,
        organizationId,
        userId,
      });

      this.logger.info('Rule added to standard successfully (legacy format)', {
        patchId: patch.id,
        standardId,
        standardSlug: standard.slug,
      });
      return true;
    } else if (action === 'updateRule' && content) {
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

      this.logger.info(
        'Rule updated in standard successfully (legacy format)',
        {
          patchId: patch.id,
          standardId,
          targetRuleId,
        },
      );
      return true;
    }

    this.logger.error('No valid changes or action found in patch', {
      patchId: patch.id,
    });
    return false;
  }

  private async applyStandardCreation(
    patch: KnowledgePatch,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _organizationId: OrganizationId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userId: string,
  ): Promise<boolean> {
    if (!this.standardsPort) {
      this.logger.error('StandardsPort not available', {
        patchId: patch.id,
      });
      throw new Error('StandardsPort not available for applying patch');
    }

    const proposedChanges = patch.proposedChanges as {
      name: string;
      description: string;
      rules: string[];
      examples?: string[];
      scope: string;
      rationale: string;
    };

    this.logger.info('Creating new standard', {
      patchId: patch.id,
      standardName: proposedChanges.name,
      rulesCount: proposedChanges.rules?.length || 0,
      examplesCount: proposedChanges.examples?.length || 0,
    });

    // TODO: Implement standard creation with examples when port method supports it
    this.logger.warn('Standard creation not yet fully implemented', {
      patchId: patch.id,
      message: 'Port method for creating standards with examples needed',
    });

    return false;
  }

  private async applyRecipeUpdate(
    patch: KnowledgePatch,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _organizationId: OrganizationId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userId: string,
  ): Promise<boolean> {
    if (!this.recipesPort) {
      this.logger.error('RecipesPort not available', {
        patchId: patch.id,
      });
      throw new Error('RecipesPort not available for applying patch');
    }

    const proposedChanges = patch.proposedChanges as {
      recipeId: string;
      changes: {
        name?: string | null;
        content?: string | null;
        exampleChanges?: {
          toAdd?: Array<{
            lang: string;
            code: string;
            description: string;
          }> | null;
          toUpdate?: Array<{
            exampleId: string;
            lang: string;
            code: string;
            description: string;
          }> | null;
          toDelete?: string[] | null;
        } | null;
      };
      rationale: string;
    };

    this.logger.info('Applying recipe update', {
      patchId: patch.id,
      recipeId: proposedChanges.recipeId,
    });

    // TODO: Implement recipe update when port methods available
    if (proposedChanges.changes?.name) {
      this.logger.warn('Recipe name update not yet supported by port', {
        patchId: patch.id,
        newName: proposedChanges.changes.name,
      });
    }

    if (proposedChanges.changes?.content) {
      this.logger.warn('Recipe content update not yet supported by port', {
        patchId: patch.id,
      });
    }

    if (proposedChanges.changes?.exampleChanges) {
      this.logger.warn('Recipe example changes not yet supported by port', {
        patchId: patch.id,
      });
    }

    return false;
  }

  private async applyRecipeCreation(
    patch: KnowledgePatch,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _organizationId: OrganizationId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userId: string,
  ): Promise<boolean> {
    if (!this.recipesPort) {
      this.logger.error('RecipesPort not available', {
        patchId: patch.id,
      });
      throw new Error('RecipesPort not available for applying patch');
    }

    const proposedChanges = patch.proposedChanges as {
      name: string;
      description: string;
      content: string;
      examples?: string[];
      rationale: string;
    };

    this.logger.info('Creating new recipe', {
      patchId: patch.id,
      recipeName: proposedChanges.name,
      examplesCount: proposedChanges.examples?.length || 0,
    });

    // TODO: Implement recipe creation with examples when port method supports it
    this.logger.warn('Recipe creation not yet fully implemented', {
      patchId: patch.id,
      message: 'Port method for creating recipes with examples needed',
    });

    return false;
  }
}
