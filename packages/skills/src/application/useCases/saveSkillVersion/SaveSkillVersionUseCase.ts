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
import { SkillSpaceNotAccessibleError } from '../../../domain/errors/SkillSpaceNotAccessibleError';
import { SkillNotFoundError } from '../../../domain/errors/SkillNotFoundError';
import { SkillService } from '../../services/SkillService';
import { SkillVersionService } from '../../services/SkillVersionService';
import { SkillFileService } from '../../services/SkillFileService';

const origin = 'SaveSkillVersionUseCase';

export class SaveSkillVersionUseCase
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
    this.logger.info('SaveSkillVersionUseCase initialized');
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

    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space || space.organizationId !== organizationId) {
      throw new SkillSpaceNotAccessibleError(spaceId, organizationId);
    }

    const skill = await this.skillService.getSkillById(skillVersion.skillId);
    if (!skill || skill.spaceId !== spaceId) {
      throw new SkillNotFoundError(skillVersion.skillId, spaceId);
    }

    const latestVersion = await this.skillVersionService.getLatestSkillVersion(
      skillVersion.skillId,
    );
    const newVersionNumber = latestVersion ? latestVersion.version + 1 : 1;

    this.logger.info('Calculated new version number', {
      skillId: skillVersion.skillId,
      latestVersion: latestVersion?.version,
      newVersion: newVersionNumber,
    });

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
      additionalProperties: skillVersion.additionalProperties,
      version: newVersionNumber,
    });

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

    await this.skillService.updateSkill(skillVersion.skillId, {
      name: skillVersion.name,
      slug: skillVersion.slug,
      description: skillVersion.description,
      prompt: skillVersion.prompt,
      allowedTools: skillVersion.allowedTools,
      license: skillVersion.license,
      compatibility: skillVersion.compatibility,
      metadata: skillVersion.metadata,
      additionalProperties: skillVersion.additionalProperties,
      version: newVersionNumber,
      userId: skillVersion.userId,
    });

    this.logger.info('SaveSkillVersion process completed successfully', {
      versionId: savedVersion.id,
      skillId: skillVersion.skillId,
      version: newVersionNumber,
    });

    return savedVersion;
  }
}
