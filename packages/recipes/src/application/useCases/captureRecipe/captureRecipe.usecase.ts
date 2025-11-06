import { RecipeService } from '../../services/RecipeService';
import { RecipeVersionService } from '../../services/RecipeVersionService';
import slug from 'slug';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  AiNotConfigured,
  ICaptureRecipeUseCase,
  CaptureRecipeCommand,
  CaptureRecipeResponse,
  RecipeStep,
  Recipe,
} from '@packmind/shared';
import { RecipeSummaryService } from '../../services/RecipeSummaryService';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { createSpaceId } from '@packmind/spaces';

const origin = 'CaptureRecipeUsecase';

export class CaptureRecipeUsecase implements ICaptureRecipeUseCase {
  constructor(
    private readonly recipeService: RecipeService,
    private readonly recipeVersionService: RecipeVersionService,
    private readonly recipeSummaryService: RecipeSummaryService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('CaptureRecipeUsecase initialized');
  }

  public async execute(
    command: CaptureRecipeCommand,
  ): Promise<CaptureRecipeResponse> {
    const {
      name,
      spaceId: spaceIdString,
      summary: providedSummary,
      whenToUse,
      contextValidationCheckpoints,
      steps,
      content: legacyContent,
      organizationId: orgIdString,
      userId: userIdString,
    } = command;
    const organizationId = createOrganizationId(orgIdString);
    const userId = createUserId(userIdString);
    const spaceId = createSpaceId(spaceIdString);
    this.logger.info('Starting captureRecipe process', {
      name,
      organizationId,
      userId,
      spaceId,
    });

    try {
      this.logger.info('Generating slug from recipe name', { name });
      const baseSlug = slug(name);
      this.logger.info('Base slug generated', { slug: baseSlug });

      // Ensure slug is unique per space. If it exists, append "-1", "-2", ... until unique
      this.logger.info('Checking slug uniqueness within space', {
        baseSlug,
        spaceId,
        organizationId,
      });
      const existingRecipes =
        await this.recipeService.listRecipesBySpace(spaceId);
      const existingSlugs = new Set(existingRecipes.map((r) => r.slug));

      let recipeSlug = baseSlug;
      if (existingSlugs.has(recipeSlug)) {
        let counter = 1;
        while (existingSlugs.has(`${baseSlug}-${counter}`)) {
          counter++;
        }
        recipeSlug = `${baseSlug}-${counter}`;
      }
      this.logger.info('Resolved unique slug', { slug: recipeSlug });

      // Determine content: use new structured format if provided, otherwise use legacy content
      const content =
        providedSummary !== undefined
          ? this.assembleRecipeContent(
              providedSummary,
              whenToUse || [],
              contextValidationCheckpoints || [],
              steps || [],
            )
          : legacyContent || '';

      // Business logic: Create recipe with initial version 1
      const initialVersion = 1;
      const recipe = await this.recipeService.addRecipe({
        name,
        content,
        slug: recipeSlug,
        version: initialVersion,
        gitCommit: undefined,
        userId,
        spaceId,
      });
      this.logger.info('Recipe entity created successfully', {
        recipeId: recipe.id,
        name,
        organizationId,
        userId,
        spaceId,
      });

      const summary = await this.computeSummary(
        command,
        recipe,
        initialVersion,
      );

      const recipeVersion = await this.recipeVersionService.addRecipeVersion({
        recipeId: recipe.id,
        name,
        slug: recipeSlug,
        content,
        version: initialVersion,
        summary,
        gitCommit: undefined,
        userId,
      });
      this.logger.info('Initial recipe version created successfully', {
        versionId: recipeVersion.id,
        recipeId: recipe.id,
        version: initialVersion,
        hasSummary: !!recipeVersion.summary,
      });

      this.logger.info('CaptureRecipe process completed successfully', {
        recipeId: recipe.id,
        versionId: recipeVersion.id,
        name,
        organizationId,
        userId,
        spaceId,
      });

      return recipe;
    } catch (error) {
      this.logger.error('Failed to capture recipe', {
        name,
        organizationId,
        userId,
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async computeSummary(
    captureRecipeCommand: CaptureRecipeCommand,
    recipe: Recipe,
    initialVersion: number,
  ) {
    const shouldGenerateSummary =
      !captureRecipeCommand.summary ||
      captureRecipeCommand.summary.trim() === '';

    if (!shouldGenerateSummary) {
      return captureRecipeCommand.summary;
    }

    try {
      return await this.recipeSummaryService.createRecipeSummary({
        recipeId: recipe.id,
        name: recipe.name,
        slug: recipe.slug,
        content: recipe.content,
        version: initialVersion,
        userId: recipe.userId,
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
    return null;
  }

  public assembleRecipeContent(
    summary: string,
    whenToUse: string[],
    contextValidationCheckpoints: string[],
    steps: RecipeStep[],
  ): string {
    let content = summary;

    // Add "When to Use" section only if not empty
    if (whenToUse.length > 0) {
      content += '\n\n## When to Use\n\n';
      content += whenToUse.map((scenario) => `- ${scenario}`).join('\n');
    }

    // Add "Context Validation Checkpoints" section only if not empty
    if (contextValidationCheckpoints.length > 0) {
      content += '\n\n## Context Validation Checkpoints\n\n';
      content += contextValidationCheckpoints
        .map((checkpoint) => `* [ ] ${checkpoint}`)
        .join('\n');
    }

    // Add "Recipe Steps" section only if not empty
    if (steps.length > 0) {
      content += '\n\n## Recipe Steps\n\n';
      steps.forEach((step, index) => {
        content += `### Step ${index + 1}: ${step.name}\n\n`;
        content += `${step.description}\n`;
        if (step.codeSnippet) {
          content += `\n${step.codeSnippet}\n`;
        }
        if (index < steps.length - 1) {
          content += '\n';
        }
      });
    }

    return content;
  }
}
