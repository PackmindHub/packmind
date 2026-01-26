import { v4 as uuidv4 } from 'uuid';
import { ISkillRepository } from '../../domain/repositories/ISkillRepository';
import { PackmindLogger } from '@packmind/logger';
import {
  createSkillId,
  OrganizationId,
  QueryOption,
  SpaceId,
  Skill,
  SkillId,
  UserId,
} from '@packmind/types';

const origin = 'SkillService';

export type CreateSkillData = {
  name: string;
  slug: string;
  description: string;
  prompt: string;
  allowedTools?: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  version: number;
  userId: UserId;
  spaceId: SpaceId;
};

export type UpdateSkillData = {
  name: string;
  slug: string;
  description: string;
  prompt: string;
  allowedTools?: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  version: number;
  userId: UserId;
};

export class SkillService {
  constructor(
    private readonly skillRepository: ISkillRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('SkillService initialized');
  }

  async addSkill(skillData: CreateSkillData): Promise<Skill> {
    this.logger.info('Adding new skill', {
      name: skillData.name,
      slug: skillData.slug,
      spaceId: skillData.spaceId,
      userId: skillData.userId,
    });

    try {
      const skillId = createSkillId(uuidv4());
      const now = new Date();

      const skill: Skill = {
        id: skillId,
        ...skillData,
        createdAt: now,
        updatedAt: now,
      };

      const savedSkill = await this.skillRepository.add(skill);
      this.logger.info('Skill added to repository successfully', {
        skillId,
        name: skillData.name,
      });

      return savedSkill;
    } catch (error) {
      this.logger.error('Failed to add skill', {
        name: skillData.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getSkillById(id: SkillId): Promise<Skill | null> {
    this.logger.info('Getting skill by ID', { id });

    try {
      const skill = await this.skillRepository.findById(id);
      if (skill) {
        this.logger.info('Skill found successfully', {
          id,
          name: skill.name,
        });
      } else {
        this.logger.warn('Skill not found', { id });
      }
      return skill;
    } catch (error) {
      this.logger.error('Failed to get skill by ID', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findSkillBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Skill | null> {
    this.logger.info('Finding skill by slug and organization', {
      slug,
      organizationId,
    });

    try {
      const skill = await this.skillRepository.findBySlug(slug, organizationId);
      if (skill) {
        this.logger.info('Skill found by slug and organization successfully', {
          slug,
          organizationId,
          skillId: skill.id,
        });
      } else {
        this.logger.warn('Skill not found by slug and organization', {
          slug,
          organizationId,
        });
      }
      return skill;
    } catch (error) {
      this.logger.error('Failed to find skill by slug and organization', {
        slug,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listSkillsBySpace(
    spaceId: SpaceId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Skill[]> {
    this.logger.info('Listing skills by space', {
      spaceId,
      includeDeleted: opts?.includeDeleted ?? false,
    });

    try {
      const skills = await this.skillRepository.findBySpaceId(spaceId, opts);
      this.logger.info('Skills retrieved by space successfully', {
        spaceId,
        count: skills.length,
      });
      return skills;
    } catch (error) {
      this.logger.error('Failed to list skills by space', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateSkill(
    skillId: SkillId,
    skillData: UpdateSkillData,
  ): Promise<Skill> {
    this.logger.info('Updating skill', {
      skillId,
      name: skillData.name,
      userId: skillData.userId,
    });

    try {
      const existingSkill = await this.skillRepository.findById(skillId);
      if (!existingSkill) {
        this.logger.error('Skill not found for update', { skillId });
        throw new Error(`Skill with id ${skillId} not found`);
      }

      const updatedSkill: Skill = {
        id: skillId,
        ...skillData,
        spaceId: existingSkill.spaceId,
        createdAt: existingSkill.createdAt,
        updatedAt: new Date(),
      };

      const savedSkill = await this.skillRepository.add(updatedSkill);
      this.logger.info('Skill updated in repository successfully', {
        skillId,
        version: skillData.version,
      });

      return savedSkill;
    } catch (error) {
      this.logger.error('Failed to update skill', {
        skillId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async deleteSkill(skillId: SkillId, userId: UserId): Promise<void> {
    this.logger.info('Deleting skill and all its versions', { skillId });

    try {
      const skill = await this.skillRepository.findById(skillId);
      if (!skill) {
        this.logger.error('Skill not found for deletion', { skillId });
        throw new Error(`Skill with id ${skillId} not found`);
      }

      await this.skillRepository.deleteById(skillId, userId);

      this.logger.info('Skill and all its versions deleted successfully', {
        skillId,
      });
    } catch (error) {
      this.logger.error('Failed to delete skill', {
        skillId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
