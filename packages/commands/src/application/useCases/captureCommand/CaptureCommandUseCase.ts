import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  CaptureCommandCommand,
  CaptureCommandResponse,
  CommandCreatedEvent,
  createOrganizationId,
  createCommandId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ICaptureCommandUseCase,
  ISpacesPort,
  CommandSlugAlreadyExistsError,
  CommandStep,
} from '@packmind/types';
import slug from 'slug';
import { CommandService } from '../../services/CommandService';
import { CommandVersionService } from '../../services/CommandVersionService';

const origin = 'CaptureRecipeUseCase';

export class CaptureCommandUseCase
  extends AbstractSpaceMemberUseCase<
    CaptureCommandCommand,
    CaptureCommandResponse
  >
  implements ICaptureCommandUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly commandService: CommandService,
    private readonly commandVersionService: CommandVersionService,
    private readonly eventEmitterService: PackmindEventEmitterService,
  ) {
    super(spacesPort, accountsPort, new PackmindLogger(origin));
    this.logger.info('CaptureRecipeUseCase initialized');
  }

  protected async executeForSpaceMembers(
    command: CaptureCommandCommand & SpaceMemberContext,
  ): Promise<CaptureCommandResponse> {
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
      originSkill,
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
      const existingCommands =
        await this.commandService.listCommandsBySpace(spaceId);
      const existingSlugs = new Set(existingCommands.map((r) => r.slug));

      const commandSlug = this.resolveSlug(
        command.slug,
        name,
        existingSlugs,
        spaceId,
      );
      this.logger.info('Resolved slug', { slug: commandSlug });

      // Determine content: use new structured format if provided, otherwise use legacy content
      const content =
        providedSummary !== undefined
          ? this.assembleCommandContent(
              providedSummary,
              whenToUse || [],
              contextValidationCheckpoints || [],
              steps || [],
            )
          : legacyContent || '';

      // Business logic: Create recipe with initial version 1
      const initialVersion = 1;
      const recipe = await this.commandService.addCommand({
        name,
        content,
        slug: commandSlug,
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

      const recipeVersion = await this.commandVersionService.addCommandVersion({
        recipeId: recipe.id,
        name,
        slug: commandSlug,
        content,
        version: initialVersion,
        gitCommit: undefined,
        userId,
      });
      this.logger.info('Initial recipe version created successfully', {
        versionId: recipeVersion.id,
        recipeId: recipe.id,
        version: initialVersion,
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
          id: createCommandId(recipe.id),
          spaceId,
          organizationId,
          userId,
          source,
          originSkill,
          directUpdate: command.directUpdate,
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

  private resolveSlug(
    providedSlug: string | undefined,
    name: string,
    existingSlugs: Set<string>,
    spaceId: string,
  ): string {
    if (providedSlug && providedSlug.trim() !== '') {
      const sanitized = this.sanitizeSlug(providedSlug);

      if (existingSlugs.has(sanitized)) {
        throw new CommandSlugAlreadyExistsError(sanitized, spaceId);
      }

      return sanitized;
    }

    // Auto-generate from name
    const baseSlug = slug(name);
    let commandSlug = baseSlug;

    if (existingSlugs.has(commandSlug)) {
      let counter = 1;
      while (existingSlugs.has(`${baseSlug}-${counter}`)) {
        counter++;
      }
      commandSlug = `${baseSlug}-${counter}`;
    }

    return commandSlug;
  }

  private sanitizeSlug(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/(?:^-)|(?:-$)/g, '');
  }

  public assembleCommandContent(
    summary: string,
    whenToUse: string[],
    contextValidationCheckpoints: string[],
    steps: CommandStep[],
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
