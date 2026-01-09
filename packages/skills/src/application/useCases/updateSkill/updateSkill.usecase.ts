import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  ISpacesPort,
  SkillUpdatedEvent,
  UpdateSkillCommand,
  UpdateSkillResponse,
  createOrganizationId,
  createSkillId,
  createUserId,
} from '@packmind/types';
import slug from 'slug';
import { IUpdateSkill } from '../../../domain/useCases/IUpdateSkill';
import { SkillService } from '../../services/SkillService';
import { SkillVersionService } from '../../services/SkillVersionService';

const origin = 'UpdateSkillUsecase';

export class UpdateSkillUsecase
  extends AbstractMemberUseCase<UpdateSkillCommand, UpdateSkillResponse>
  implements IUpdateSkill
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly skillService: SkillService,
    private readonly skillVersionService: SkillVersionService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.logger.info('UpdateSkillUsecase initialized');
  }

  public async executeForMembers(
    command: UpdateSkillCommand & MemberContext,
  ): Promise<UpdateSkillResponse> {
    const {
      skillId: skillIdString,
      organizationId: orgIdString,
      userId: userIdString,
      name,
      description,
      prompt,
      allowedTools,
      license,
      compatibility,
      metadata,
    } = command;
    const organizationId = createOrganizationId(orgIdString);
    const userId = createUserId(userIdString);
    const skillId = createSkillId(skillIdString);

    this.logger.info('Starting updateSkill process', {
      skillId,
      organizationId,
      userId,
    });

    try {
      // Get existing skill
      const existingSkill = await this.skillService.getSkillById(skillId);
      if (!existingSkill) {
        this.logger.error('Skill not found for update', { skillId });
        throw new Error(`Skill with id ${skillId} not found`);
      }

      this.logger.info('Skill found for update', {
        skillId,
        currentVersion: existingSkill.version,
      });

      // Verify the space belongs to the organization
      const space = await this.spacesPort.getSpaceById(existingSkill.spaceId);
      if (!space) {
        this.logger.error('Space not found', {
          spaceId: existingSkill.spaceId,
        });
        throw new Error(`Space with id ${existingSkill.spaceId} not found`);
      }

      if (space.organizationId !== organizationId) {
        this.logger.error('Space does not belong to organization', {
          spaceId: existingSkill.spaceId,
          spaceOrganizationId: space.organizationId,
          requestOrganizationId: organizationId,
        });
        throw new Error(
          `Space ${existingSkill.spaceId} does not belong to organization ${organizationId}`,
        );
      }

      // Increment version number
      const newVersion = existingSkill.version + 1;
      this.logger.info('Incrementing skill version', {
        skillId,
        oldVersion: existingSkill.version,
        newVersion,
      });

      // Generate new slug if name changed
      let skillSlug = existingSkill.slug;
      if (name && name !== existingSkill.name) {
        this.logger.info('Generating new slug from updated name', { name });
        const baseSlug = slug(name);

        // Ensure slug is unique per space
        const existingSkills = await this.skillService.listSkillsBySpace(
          existingSkill.spaceId,
        );
        const existingSlugs = new Set(
          existingSkills.filter((s) => s.id !== skillId).map((s) => s.slug),
        );

        skillSlug = baseSlug;
        if (existingSlugs.has(skillSlug)) {
          let counter = 1;
          while (existingSlugs.has(`${baseSlug}-${counter}`)) {
            counter++;
          }
          skillSlug = `${baseSlug}-${counter}`;
        }
        this.logger.info('Resolved unique slug for update', {
          slug: skillSlug,
        });
      }

      // Update skill entity
      const updatedSkill = await this.skillService.updateSkill(skillId, {
        name: name || existingSkill.name,
        slug: skillSlug,
        description: description || existingSkill.description,
        prompt: prompt || existingSkill.prompt,
        version: newVersion,
        userId,
        allowedTools: allowedTools ?? existingSkill.allowedTools,
        license: license ?? existingSkill.license,
        compatibility: compatibility ?? existingSkill.compatibility,
        metadata: metadata || existingSkill.metadata,
      });

      this.logger.info('Skill entity updated successfully', {
        skillId,
        newVersion,
      });

      // Create new skill version
      await this.skillVersionService.addSkillVersion({
        skillId,
        name: name || existingSkill.name,
        slug: skillSlug,
        description: description || existingSkill.description,
        prompt: prompt || existingSkill.prompt,
        version: newVersion,
        userId,
        allowedTools: allowedTools ?? existingSkill.allowedTools,
        license: license ?? existingSkill.license,
        compatibility: compatibility ?? existingSkill.compatibility,
        metadata: metadata || existingSkill.metadata,
      });

      this.logger.info('New skill version created successfully', {
        skillId,
        version: newVersion,
      });

      this.logger.info('UpdateSkill process completed successfully', {
        skillId,
        version: newVersion,
        organizationId,
        userId,
      });

      this.eventEmitterService.emit(
        new SkillUpdatedEvent({
          skillId,
          spaceId: existingSkill.spaceId,
          organizationId,
          userId,
          source: 'ui',
        }),
      );

      return updatedSkill;
    } catch (error) {
      this.logger.error('Failed to update skill', {
        skillId: skillIdString,
        organizationId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
