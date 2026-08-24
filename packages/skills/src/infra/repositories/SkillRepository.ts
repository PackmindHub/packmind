import { ISkillRepository } from '../../domain/repositories/ISkillRepository';
import { SkillSchema } from '../schemas/SkillSchema';
import { Raw, Repository } from 'typeorm';
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
      // DEMO ONLY - revert this with the rest of the span demo.
      //
      // Makes the real skills SELECT slow, so the pg.query span shows what a
      // genuinely slow statement looks like in Tempo, with the sleep visible in
      // `db.query.text` next to the actual query.
      //
      // The subquery form matters. `(SELECT pg_sleep(2)) IS NOT NULL` is
      // uncorrelated, so Postgres hoists it into an InitPlan and evaluates it
      // once - measured at 1.0s across 5 rows. Written bare as
      // `pg_sleep(2) IS NOT NULL` it is volatile and runs per row instead: 4
      // rows at 0.5s each took 2.0s. `IS NOT NULL` on void is true, so the
      // predicate filters nothing out.
      //
      // First, get all skills for the space with user information
      const skills = await this.repository.find({
        where: {
          spaceId,
          id: Raw(() => '(SELECT pg_sleep(2)) IS NOT NULL'),
        },
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

  async countBySpaceIds(spaceIds: SpaceId[]): Promise<Map<SpaceId, number>> {
    if (spaceIds.length === 0) {
      return new Map();
    }

    this.logger.info('Counting skills by space IDs', {
      spaceCount: spaceIds.length,
    });

    try {
      const rows = await this.repository
        .createQueryBuilder('skill')
        .select('skill.space_id', 'spaceId')
        .addSelect('COUNT(*)', 'count')
        .where('skill.space_id IN (:...spaceIds)', { spaceIds })
        .groupBy('skill.space_id')
        .getRawMany<{ spaceId: SpaceId; count: string }>();

      return new Map(rows.map((row) => [row.spaceId, Number(row.count)]));
    } catch (error) {
      this.logger.error('Failed to count skills by space IDs', {
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
      await this.repository.manager.transaction(async (manager) => {
        const transactionalRepository = manager.getRepository(SkillSchema);
        await transactionalRepository.update(
          { id: skillId },
          { movedTo: destinationSpaceId },
        );
        await transactionalRepository.softDelete({ id: skillId });
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
