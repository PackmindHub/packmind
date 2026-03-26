import { ISkillRepository } from '../../domain/repositories/ISkillRepository';
import { SkillSchema } from '../schemas/SkillSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import {
  OrganizationId,
  QueryOption,
  Skill,
  SkillId,
  SpaceId,
  UserId,
} from '@packmind/types';

const origin = 'SkillRepository';

export class SkillRepository
  extends AbstractRepository<Skill>
  implements ISkillRepository
{
  constructor(
    repository: Repository<Skill> = localDataSource.getRepository<Skill>(
      SkillSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('skill', repository, SkillSchema, logger);
    this.logger.info('SkillRepository initialized');
  }

  protected override loggableEntity(entity: Skill): Partial<Skill> {
    return {
      id: entity.id,
      name: entity.name,
    };
  }

  async findBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Skill | null> {
    this.logger.info('Finding skill by slug and organization', {
      slug,
      organizationId,
    });

    try {
      const skill = await this.repository
        .createQueryBuilder('skill')
        .innerJoin('spaces', 'space', 'skill.space_id = space.id')
        .where('skill.slug = :slug', { slug })
        .andWhere('space.organization_id = :organizationId', { organizationId })
        .getOne();

      if (!skill) {
        this.logger.warn('Skill not found by slug and organization', {
          slug,
          organizationId,
        });
        return null;
      }

      this.logger.info('Skill found by slug and organization', {
        slug,
        organizationId,
        skillId: skill.id,
      });
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

  async findBySpaceId(
    spaceId: SpaceId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Skill[]> {
    this.logger.info('Finding skills with scope by space ID', {
      spaceId,
      includeDeleted: opts?.includeDeleted ?? false,
    });

    try {
      // First, get all skills for the space with user information
      const skills = await this.repository.find({
        where: { spaceId },
        withDeleted: opts?.includeDeleted ?? false,
      });

      // For each skill, enrich with user data
      const skillsWithScope = await Promise.all(
        skills.map(async (skill) => {
          const createdBy = await this.getCreatedBy(skill.userId);

          return {
            ...skill,
            createdBy,
          };
        }),
      );

      this.logger.info('Skills with scope found by space ID', {
        spaceId,
        count: skillsWithScope.length,
      });
      return skillsWithScope;
    } catch (error) {
      this.logger.error('Failed to find skills with scope by space ID', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findByUserId(userId: UserId): Promise<Skill[]> {
    this.logger.info('Finding skills by user ID', { userId });

    try {
      const skills = await this.repository.find({ where: { userId } });
      this.logger.info('Skills found by user ID', {
        userId,
        count: skills.length,
      });
      return skills;
    } catch (error) {
      this.logger.error('Failed to find skills by user ID', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async markAsMoved(
    skillId: SkillId,
    destinationSpaceId: SpaceId,
  ): Promise<void> {
    this.logger.info('Marking skill as moved', {
      skillId,
      destinationSpaceId,
    });

    try {
      await this.repository.manager.transaction(async (transaction) => {
        await transaction.update(
          SkillSchema,
          { id: skillId },
          {
            movedTo: destinationSpaceId,
          },
        );
        await transaction.softDelete(SkillSchema, { id: skillId });
      });

      this.logger.info('Skill marked as moved successfully', {
        skillId,
        destinationSpaceId,
      });
    } catch (error) {
      this.logger.error('Failed to mark skill as moved', {
        skillId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
