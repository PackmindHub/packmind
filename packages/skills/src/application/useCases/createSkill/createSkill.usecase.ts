import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  CreateSkillCommand,
  CreateSkillResponse,
  SkillCreatedEvent,
  createOrganizationId,
  createSpaceId,
  createSkillId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
} from '@packmind/types';
import slug from 'slug';
import { SkillService } from '../../services/SkillService';
import { SkillVersionService } from '../../services/SkillVersionService';

const origin = 'CreateSkillUsecase';

export class CreateSkillUsecase extends AbstractMemberUseCase<
  CreateSkillCommand,
  CreateSkillResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly skillService: SkillService,
    private readonly skillVersionService: SkillVersionService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.logger.info('CreateSkillUsecase initialized');
  }

  async executeForMembers(
    command: CreateSkillCommand & MemberContext,
  ): Promise<CreateSkillResponse> {
    const {
      name,
      description,
      prompt,
      spaceId: spaceIdString,
      organizationId: orgIdString,
      userId: userIdString,
      allowedTools,
      license,
      compatibility,
      metadata,
    } = command;
    const organizationId = createOrganizationId(orgIdString);
    const userId = createUserId(userIdString);
    const spaceId = createSpaceId(spaceIdString);

    this.logger.info('Starting createSkill process', {
      name,
      organizationId,
      userId,
      spaceId,
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

    try {
      this.logger.info('Generating slug from skill name', { name });
      const baseSlug = slug(name);
      this.logger.info('Base slug generated', { slug: baseSlug });

      // Ensure slug is unique per space. If it exists, append "-1", "-2", ... until unique
      this.logger.info('Checking slug uniqueness within space', {
        baseSlug,
        spaceId,
      });
      const existingSkills = await this.skillService.listSkillsBySpace(spaceId);
      const existingSlugs = new Set(existingSkills.map((s) => s.slug));

      let skillSlug = baseSlug;
      if (existingSlugs.has(skillSlug)) {
        let counter = 1;
        while (existingSlugs.has(`${baseSlug}-${counter}`)) {
          counter++;
        }
        skillSlug = `${baseSlug}-${counter}`;
      }
      this.logger.info('Resolved unique slug', { slug: skillSlug });

      // Business logic: Create skill with initial version 1
      const initialVersion = 1;

      this.logger.info('Creating skill entity');
      const skill = await this.skillService.addSkill({
        name,
        description,
        slug: skillSlug,
        version: initialVersion,
        prompt,
        userId,
        spaceId,
        allowedTools,
        license,
        compatibility,
        metadata,
      });
      this.logger.info('Skill entity created successfully', {
        skillId: skill.id,
        name,
        organizationId,
        userId,
        spaceId,
      });

      this.logger.info('Creating initial skill version');
      await this.skillVersionService.addSkillVersion({
        skillId: skill.id,
        name,
        slug: skillSlug,
        description,
        version: initialVersion,
        prompt,
        userId,
        allowedTools,
        license,
        compatibility,
        metadata,
      });
      this.logger.info('Initial skill version created successfully', {
        skillId: skill.id,
        version: initialVersion,
      });

      this.logger.info('CreateSkill process completed successfully', {
        skillId: skill.id,
        name,
        organizationId,
        userId,
        spaceId,
      });

      this.eventEmitterService.emit(
        new SkillCreatedEvent({
          skillId: createSkillId(skill.id),
          spaceId,
          organizationId,
          userId,
          source: 'ui',
        }),
      );

      return skill;
    } catch (error) {
      this.logger.error('Failed to create skill', {
        name,
        organizationId,
        userId,
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
