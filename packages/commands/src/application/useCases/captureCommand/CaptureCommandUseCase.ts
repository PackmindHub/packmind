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
  CommandStep,
} from '@packmind/types';
import {
  CommandSlugAlreadyExistsError,
  CommandSpaceNotAccessibleError,
} from '../../../domain/errors';
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

    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space || space.organizationId !== organizationId) {
      throw new CommandSpaceNotAccessibleError(spaceId, organizationId);
    }

    this.logger.info('Starting captureRecipe process', {
      name,
      organizationId,
      userId,
      spaceId,
    });

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

    const content =
      providedSummary !== undefined
        ? this.assembleCommandContent(
            providedSummary,
            whenToUse || [],
            contextValidationCheckpoints || [],
            steps || [],
          )
        : legacyContent || '';

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

    if (whenToUse.length > 0) {
      content += '\n\n## When to Use\n\n';
      content += whenToUse.map((scenario) => `- ${scenario}`).join('\n');
    }

    if (contextValidationCheckpoints.length > 0) {
      content += '\n\n## Context Validation Checkpoints\n\n';
      content += contextValidationCheckpoints
        .map((checkpoint) => `* [ ] ${checkpoint}`)
        .join('\n');
    }

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
