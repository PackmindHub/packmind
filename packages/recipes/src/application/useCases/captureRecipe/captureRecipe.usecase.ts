import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  AiNotConfigured,
  CaptureRecipeCommand,
  CaptureRecipeResponse,
  CommandCreatedEvent,
  createOrganizationId,
  createRecipeId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ICaptureRecipeUseCase,
  ISpacesPort,
  OrganizationId,
  Recipe,
  RecipeSlugAlreadyExistsError,
  RecipeStep,
} from '@packmind/types';
import slug from 'slug';
import { RecipeService } from '../../services/RecipeService';
import { RecipeSummaryService } from '../../services/RecipeSummaryService';
import { RecipeVersionService } from '../../services/RecipeVersionService';

const origin = 'CaptureRecipeUsecase';

export class CaptureRecipeUsecase
  extends AbstractMemberUseCase<CaptureRecipeCommand, CaptureRecipeResponse>
  implements ICaptureRecipeUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly recipeService: RecipeService,
    private readonly recipeVersionService: RecipeVersionService,
    private readonly recipeSummaryService: RecipeSummaryService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.logger.info('CaptureRecipeUsecase initialized');
  }

  protected async executeForMembers(
    command: CaptureRecipeCommand & MemberContext,
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
      source = 'ui',
    } = command;
    const organizationId = createOrganizationId(orgIdString);
    const userId = createUserId(userIdString);
    const spaceId = createSpaceId(spaceIdString);

    // Verify the space belongs to the organization
    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space) {
      this.logger.warn('Space not found', { spaceId });
      throw new Error(`Space with id ${spaceId} not found`);
    }

    if (space.organizationId !== organizationId) {
      this.logger.warn('Space does not belong to organization', {
        spaceId,
        spaceOrganizationId: space.organizationId,
        requestOrganizationId: organizationId,
      });
      throw new Error(
        `Space ${spaceId} does not belong to organization ${organizationId}`,
      );
    }
    this.logger.info('Starting captureRecipe process', {
      name,
      organizationId,
      userId,
      spaceId,
    });

    try {
      const existingRecipes =
        await this.recipeService.listRecipesBySpace(spaceId);
      const existingSlugs = new Set(existingRecipes.map((r) => r.slug));

      const recipeSlug = this.resolveSlug(
        command.slug,
        name,
        existingSlugs,
        spaceId,
      );
      this.logger.info('Resolved slug', { slug: recipeSlug });

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
        organizationId,
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

      this.eventEmitterService.emit(
        new CommandCreatedEvent({
          id: createRecipeId(recipe.id),
          spaceId,
          organizationId,
          userId,
          source,
        }),
      );

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
    organizationId: OrganizationId,
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
      return await this.recipeSummaryService.createRecipeSummary(
        organizationId,
        {
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: recipe.content,
          version: initialVersion,
          userId: recipe.userId,
        },
      );
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

  private resolveSlug(
    providedSlug: string | undefined,
    name: string,
    existingSlugs: Set<string>,
    spaceId: string,
  ): string {
    if (providedSlug && providedSlug.trim() !== '') {
      const sanitized = this.sanitizeSlug(providedSlug);

      if (existingSlugs.has(sanitized)) {
        throw new RecipeSlugAlreadyExistsError(sanitized, spaceId);
      }

      return sanitized;
    }

    // Auto-generate from name
    const baseSlug = slug(name);
    let recipeSlug = baseSlug;

    if (existingSlugs.has(recipeSlug)) {
      let counter = 1;
      while (existingSlugs.has(`${baseSlug}-${counter}`)) {
        counter++;
      }
      recipeSlug = `${baseSlug}-${counter}`;
    }

    return recipeSlug;
  }

  private sanitizeSlug(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/(?:^-)|(?:-$)/g, '');
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

    // Add "Command Steps" section only if not empty
    if (steps.length > 0) {
      content += '\n\n## Command Steps\n\n';
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
