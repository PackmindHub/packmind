import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  SaveSkillVersionCommand,
  SaveSkillVersionResponse,
  IAccountsPort,
  ISaveSkillVersionUseCase,
  ISpacesPort,
  createOrganizationId,
  createSpaceId,
  createSkillFileId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { SkillService } from '../../services/SkillService';
import { SkillVersionService } from '../../services/SkillVersionService';
import { SkillFileService } from '../../services/SkillFileService';

const origin = 'SaveSkillVersionUsecase';

export class SaveSkillVersionUsecase
  extends AbstractMemberUseCase<
    SaveSkillVersionCommand,
    SaveSkillVersionResponse
  >
  implements ISaveSkillVersionUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly skillService: SkillService,
    private readonly skillVersionService: SkillVersionService,
    private readonly skillFileService: SkillFileService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.logger.info('SaveSkillVersionUsecase initialized');
  }

  async executeForMembers(
    command: SaveSkillVersionCommand & MemberContext,
  ): Promise<SaveSkillVersionResponse> {
    const {
      skillVersion,
      spaceId: spaceIdString,
      organizationId: orgIdString,
    } = command;
    const spaceId = createSpaceId(spaceIdString);
    const organizationId = createOrganizationId(orgIdString);

    this.logger.info('Starting saveSkillVersion process', {
      skillId: skillVersion.skillId,
      spaceId,
      organizationId,
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
    const skill = await this.skillService.getSkillById(skillVersion.skillId);
    if (!skill) {
      this.logger.warn('Skill not found', { skillId: skillVersion.skillId });
      throw new Error(`Skill with id ${skillVersion.skillId} not found`);
    }

    if (skill.spaceId !== spaceId) {
      this.logger.warn('Skill does not belong to space', {
        skillId: skillVersion.skillId,
        skillSpaceId: skill.spaceId,
        requestSpaceId: spaceId,
      });
      throw new Error(
        `Skill ${skillVersion.skillId} does not belong to space ${spaceId}`,
      );
    }

    try {
      // Get the latest version to calculate the new version number
      const latestVersion =
        await this.skillVersionService.getLatestSkillVersion(
          skillVersion.skillId,
        );
      const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

      this.logger.info('Calculated new version number', {
        skillId: skillVersion.skillId,
        latestVersion: latestVersion?.version,
        newVersion: newVersionNumber,
      });

      // Save the skill version
      const savedVersion = await this.skillVersionService.addSkillVersion({
        skillId: skillVersion.skillId,
        userId: skillVersion.userId,
        name: skillVersion.name,
        slug: skillVersion.slug,
        description: skillVersion.description,
        prompt: skillVersion.prompt,
        allowedTools: skillVersion.allowedTools,
        license: skillVersion.license,
        compatibility: skillVersion.compatibility,
        metadata: skillVersion.metadata,
        version: newVersionNumber,
      });

      // Create skill files if provided
      if (skillVersion.files && skillVersion.files.length > 0) {
        this.logger.info('Creating skill files', {
          count: skillVersion.files.length,
          versionId: savedVersion.id,
        });

        const skillFiles = skillVersion.files.map((file) => ({
          id: createSkillFileId(uuidv4()),
          skillVersionId: savedVersion.id,
          path: file.path,
          content: file.content,
          permissions: file.permissions,
          isBase64: file.isBase64,
        }));

        await this.skillFileService.addMany(skillFiles);

        this.logger.info('Skill files created successfully', {
          count: skillFiles.length,
          versionId: savedVersion.id,
        });
      }

      // Update the skill with the new version and data
      await this.skillService.updateSkill(skillVersion.skillId, {
        name: skillVersion.name,
        slug: skillVersion.slug,
        description: skillVersion.description,
        prompt: skillVersion.prompt,
        allowedTools: skillVersion.allowedTools,
        license: skillVersion.license,
        compatibility: skillVersion.compatibility,
        metadata: skillVersion.metadata,
        version: newVersionNumber,
        userId: skillVersion.userId,
      });

      this.logger.info('SaveSkillVersion process completed successfully', {
        versionId: savedVersion.id,
        skillId: skillVersion.skillId,
        version: newVersionNumber,
      });

      return savedVersion;
    } catch (error) {
      this.logger.error('Failed to save skill version', {
        skillId: skillVersion.skillId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
