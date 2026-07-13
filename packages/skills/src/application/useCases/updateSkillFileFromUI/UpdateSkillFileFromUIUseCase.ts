import { PackmindLogger } from '@packmind/logger';
import { normalizeLineEndings } from '@packmind/node-utils';
import {
  AbstractSpaceMemberUseCase,
  PackmindEventEmitterService,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  createOrganizationId,
  createSkillFileId,
  createUserId,
  IAccountsPort,
  IUpdateSkillFileFromUIUseCase,
  ISpacesPort,
  SkillFile,
  SkillUpdatedEvent,
  UpdateSkillFileFromUICommand,
  UpdateSkillFileFromUIResponse,
  UserSpaceRole,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { SKILL_MD_FILENAME } from '../../../domain/SkillProperties';
import { SkillEditForbiddenError } from '../../../domain/errors/SkillEditForbiddenError';
import { SkillFileNotEditableError } from '../../../domain/errors/SkillFileNotEditableError';
import { SkillFileService } from '../../services/SkillFileService';
import { SkillService } from '../../services/SkillService';
import { SkillVersionService } from '../../services/SkillVersionService';
import { validateSkillFileContent } from '../../validator/SkillValidator';

const origin = 'UpdateSkillFileFromUIUseCase';

export class UpdateSkillFileFromUIUseCase
  extends AbstractSpaceMemberUseCase<
    UpdateSkillFileFromUICommand,
    UpdateSkillFileFromUIResponse
  >
  implements IUpdateSkillFileFromUIUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly skillService: SkillService,
    private readonly skillVersionService: SkillVersionService,
    private readonly skillFileService: SkillFileService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsPort, logger);
    this.logger.info('UpdateSkillFileFromUIUseCase initialized');
  }

  protected async executeForSpaceMembers(
    command: UpdateSkillFileFromUICommand & SpaceMemberContext,
  ): Promise<UpdateSkillFileFromUIResponse> {
    const {
      skillId,
      spaceId,
      filePath,
      content,
      membership,
      source = 'ui',
    } = command;
    const organizationId = createOrganizationId(command.organizationId);
    const userId = createUserId(command.userId);

    this.logger.info('Starting updateSkillFileFromUI process', {
      skillId,
      spaceId,
      organizationId,
      filePath,
      userId,
    });

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

    // Verify the skill exists and belongs to the space
    const skill = await this.skillService.getSkillById(skillId);
    if (!skill) {
      this.logger.warn('Skill not found', { skillId });
      throw new Error(`Skill with id ${skillId} not found`);
    }

    if (skill.spaceId !== spaceId) {
      this.logger.warn('Skill does not belong to space', {
        skillId,
        skillSpaceId: skill.spaceId,
        requestSpaceId: spaceId,
      });
      throw new Error(`Skill ${skillId} does not belong to space ${spaceId}`);
    }

    // Permission check: space admin, org admin, or the skill's creator may edit
    const spaceMembership = await this.spacesPort.findMembership(
      userId,
      spaceId,
    );
    const isSpaceAdmin = spaceMembership?.role === UserSpaceRole.ADMIN;
    const isOrgAdmin = membership.role === 'admin';
    const isCreator = skill.userId === userId;

    if (!isSpaceAdmin && !isOrgAdmin && !isCreator) {
      this.logger.warn('User is not allowed to edit skill', {
        skillId,
        userId,
      });
      throw new SkillEditForbiddenError(userId, skillId);
    }

    // Only markdown files can be edited from the UI
    if (!filePath.endsWith('.md')) {
      this.logger.warn('Rejected edit of non-markdown file', { filePath });
      throw new SkillFileNotEditableError(filePath);
    }

    const latestVersion =
      await this.skillVersionService.getLatestSkillVersion(skillId);
    if (!latestVersion) {
      throw new Error(`No skill version found for skill ${skillId}`);
    }

    const existingFiles = await this.skillFileService.findByVersionId(
      latestVersion.id,
    );

    let targetFile: SkillFile | undefined;
    if (filePath !== SKILL_MD_FILENAME) {
      targetFile = existingFiles.find((file) => file.path === filePath);
      if (!targetFile) {
        throw new Error(`File ${filePath} not found in skill ${skillId}`);
      }

      if (targetFile.isBase64) {
        this.logger.warn('Rejected edit of base64-encoded file', {
          filePath,
        });
        throw new SkillFileNotEditableError(filePath);
      }
    }

    const normalizedContent = normalizeLineEndings(content);
    validateSkillFileContent(normalizedContent);

    const currentContent =
      filePath === SKILL_MD_FILENAME
        ? latestVersion.prompt
        : (targetFile as SkillFile).content;

    if (currentContent === normalizedContent) {
      this.logger.info('Content unchanged, skipping version creation', {
        skillId,
        filePath,
      });
      return { skillVersion: null, versionCreated: false };
    }

    const newVersionNumber = latestVersion.version + 1;
    const newPrompt =
      filePath === SKILL_MD_FILENAME ? normalizedContent : latestVersion.prompt;

    const newVersion = await this.skillVersionService.addSkillVersion({
      skillId,
      userId, // attribute the new version to the editor
      name: latestVersion.name,
      slug: latestVersion.slug,
      description: latestVersion.description,
      prompt: newPrompt,
      allowedTools: latestVersion.allowedTools,
      license: latestVersion.license,
      compatibility: latestVersion.compatibility,
      metadata: latestVersion.metadata,
      additionalProperties: latestVersion.additionalProperties,
      version: newVersionNumber,
    });

    if (existingFiles.length > 0) {
      const newFiles: SkillFile[] = existingFiles.map((file) => ({
        id: createSkillFileId(uuidv4()),
        skillVersionId: newVersion.id,
        path: file.path,
        content: file.path === filePath ? normalizedContent : file.content,
        permissions: file.permissions,
        isBase64: file.isBase64,
      }));

      await this.skillFileService.addMany(newFiles);
    }

    // Keep the skill's creator (userId) unchanged; only sync version/head data
    await this.skillService.updateSkill(skillId, {
      name: skill.name,
      slug: skill.slug,
      description: skill.description,
      prompt: newPrompt,
      version: newVersionNumber,
      userId: skill.userId,
      allowedTools: skill.allowedTools,
      license: skill.license,
      compatibility: skill.compatibility,
      metadata: skill.metadata,
      additionalProperties: skill.additionalProperties,
    });

    this.logger.info('UpdateSkillFileFromUI process completed successfully', {
      skillId,
      version: newVersionNumber,
    });

    this.eventEmitterService.emit(
      new SkillUpdatedEvent({
        skillId,
        spaceId,
        organizationId,
        userId,
        source,
        fileCount: existingFiles.length,
      }),
    );

    return { skillVersion: newVersion, versionCreated: true };
  }
}
