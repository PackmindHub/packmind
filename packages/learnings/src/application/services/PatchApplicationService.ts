import { PackmindLogger } from '@packmind/logger';
import {
  IRecipesPort,
  IStandardsPort,
  KnowledgePatch,
  KnowledgePatchType,
  OrganizationId,
  RecipeId,
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
      description?: string | null;
      rules: {
        toKeep: string[]; // ruleIds that don't need changes
        toUpdate: Array<{ ruleId: string; newContent: string }>;
        toDelete: string[]; // ruleIds to delete
        toAdd: Array<{ content: string }>;
      };
      rationale: string;
    };

    const { standardId, description, rules } = proposedChanges;

    this.logger.info('Applying standard update', {
      patchId: patch.id,
      standardId,
      rulesToKeep: rules.toKeep.length,
      rulesToUpdate: rules.toUpdate.length,
      rulesToDelete: rules.toDelete.length,
      rulesToAdd: rules.toAdd.length,
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

    // Update standard description (if changed)
    if (description) {
      await this.standardsPort.updateStandardDescription({
        standardId: standardId as StandardId,
        newDescription: description,
        organizationId,
        userId,
      });
      this.logger.info('Updated standard description', {
        patchId: patch.id,
      });
    }

    // Update existing rules
    if (rules.toUpdate.length > 0) {
      for (const ruleUpdate of rules.toUpdate) {
        await this.standardsPort.updateStandardRules({
          standardId: standardId as StandardId,
          ruleId: ruleUpdate.ruleId as RuleId,
          newRuleContent: ruleUpdate.newContent,
          organizationId,
          userId,
        });
      }
      this.logger.info('Updated existing rules in standard', {
        patchId: patch.id,
        count: rules.toUpdate.length,
      });
    }

    // Delete rules
    if (rules.toDelete.length > 0) {
      for (const ruleId of rules.toDelete) {
        await this.standardsPort.deleteStandardRule({
          standardId: standardId as StandardId,
          ruleId: ruleId as RuleId,
          organizationId,
          userId,
        });
      }
      this.logger.info('Deleted rules from standard', {
        patchId: patch.id,
        count: rules.toDelete.length,
      });
    }

    // Add new rules
    if (rules.toAdd.length > 0) {
      for (const newRule of rules.toAdd) {
        await this.standardsPort.addRuleToStandard({
          standardSlug: standard.slug,
          ruleContent: newRule.content,
          organizationId,
          userId,
        });
      }
      this.logger.info('Added new rules to standard', {
        patchId: patch.id,
        count: rules.toAdd.length,
      });
    }

    this.logger.info('Standard update completed successfully', {
      patchId: patch.id,
      standardId,
    });

    return true;
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
    organizationId: OrganizationId,
    userId: string,
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

    const { recipeId, changes } = proposedChanges;

    this.logger.info('Applying recipe update', {
      patchId: patch.id,
      recipeId,
    });

    // Update recipe name
    if (changes.name) {
      await this.recipesPort.updateRecipeName({
        recipeId: recipeId as RecipeId,
        newName: changes.name,
        organizationId,
        userId,
      });
      this.logger.info('Updated recipe name', {
        patchId: patch.id,
        newName: changes.name,
      });
    }

    // Update recipe content
    if (changes.content) {
      await this.recipesPort.updateRecipeContent({
        recipeId: recipeId as RecipeId,
        newContent: changes.content,
        organizationId,
        userId,
      });
      this.logger.info('Updated recipe content', {
        patchId: patch.id,
      });
    }

    // Handle example changes
    if (changes.exampleChanges) {
      // Add new examples
      if (
        changes.exampleChanges.toAdd &&
        changes.exampleChanges.toAdd.length > 0
      ) {
        for (const example of changes.exampleChanges.toAdd) {
          await this.recipesPort.addRecipeExample({
            recipeId: recipeId as RecipeId,
            lang: example.lang,
            code: example.code,
            description: example.description,
            organizationId,
            userId,
          });
        }
        this.logger.info('Added recipe examples', {
          patchId: patch.id,
          count: changes.exampleChanges.toAdd.length,
        });
      }

      // Update existing examples
      if (
        changes.exampleChanges.toUpdate &&
        changes.exampleChanges.toUpdate.length > 0
      ) {
        for (const example of changes.exampleChanges.toUpdate) {
          await this.recipesPort.updateRecipeExample({
            exampleId: example.exampleId,
            lang: example.lang,
            code: example.code,
            description: example.description,
            organizationId,
            userId,
          });
        }
        this.logger.info('Updated recipe examples', {
          patchId: patch.id,
          count: changes.exampleChanges.toUpdate.length,
        });
      }

      // Delete examples
      if (
        changes.exampleChanges.toDelete &&
        changes.exampleChanges.toDelete.length > 0
      ) {
        for (const exampleId of changes.exampleChanges.toDelete) {
          await this.recipesPort.deleteRecipeExample({
            exampleId,
            organizationId,
            userId,
          });
        }
        this.logger.info('Deleted recipe examples', {
          patchId: patch.id,
          count: changes.exampleChanges.toDelete.length,
        });
      }
    }

    return true;
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
