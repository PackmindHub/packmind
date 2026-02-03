import { ISkillVersionRepository } from '../../domain/repositories/ISkillVersionRepository';
import { SkillVersionSchema } from '../schemas/SkillVersionSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import {
  localDataSource,
  AbstractRepository,
  getErrorMessage,
} from '@packmind/node-utils';
import { SkillId, SkillVersion, SkillVersionId } from '@packmind/types';

const origin = 'SkillVersionRepository';

export class SkillVersionRepository
  extends AbstractRepository<SkillVersion>
  implements ISkillVersionRepository
{
  constructor(
    repository: Repository<SkillVersion> = localDataSource.getRepository<SkillVersion>(
      SkillVersionSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('skillVersion', repository, SkillVersionSchema, logger);
    this.logger.info('SkillVersionRepository initialized');
  }

  protected override loggableEntity(
    entity: SkillVersion,
  ): Partial<SkillVersion> {
    return {
      id: entity.id,
      skillId: entity.skillId,
      version: entity.version,
      name: entity.name,
    };
  }

  async list(): Promise<SkillVersion[]> {
    this.logger.info('Listing all skill versions from database');

    try {
      const versions = await this.repository.find();
      this.logger.info('Skill versions listed successfully', {
        count: versions.length,
      });
      return versions;
    } catch (error) {
      this.logger.error('Failed to list skill versions from database', {
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async findBySkillId(skillId: SkillId): Promise<SkillVersion[]> {
    this.logger.info('Finding skill versions by skill ID', {
      skillId,
    });

    try {
      const versions = await this.repository.find({
        where: { skillId },
        order: { version: 'DESC' },
      });
      this.logger.info('Skill versions found by skill ID', {
        skillId,
        count: versions.length,
      });
      return versions;
    } catch (error) {
      this.logger.error('Failed to find skill versions by skill ID', {
        skillId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  async findLatestBySkillId(skillId: SkillId): Promise<SkillVersion | null> {
    this.logger.info('Finding latest skill version by skill ID', {
      skillId,
    });

    try {
      const versions = await this.findBySkillId(skillId);
      const latestVersion = versions.length > 0 ? versions[0] : null;

      if (latestVersion) {
        this.logger.info('Latest skill version found', {
          skillId,
          versionId: latestVersion.id,
          version: latestVersion.version,
        });
      } else {
        this.logger.warn('No skill versions found for skill', {
          skillId,
        });
      }

      return latestVersion;
    } catch (error) {
      this.logger.error('Failed to find latest skill version by skill ID', {
        skillId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findBySkillIdAndVersion(
    skillId: SkillId,
    version: number,
  ): Promise<SkillVersion | null> {
    this.logger.info('Finding skill version by skill ID and version', {
      skillId,
      version,
    });

    try {
      const skillVersion = await this.repository.findOne({
        where: { skillId, version },
      });

      if (skillVersion) {
        this.logger.info('Skill version found by skill ID and version', {
          skillId,
          version,
          versionId: skillVersion.id,
        });
      } else {
        this.logger.warn('Skill version not found by skill ID and version', {
          skillId,
          version,
        });
      }

      return skillVersion;
    } catch (error) {
      this.logger.error(
        'Failed to find skill version by skill ID and version',
        {
          skillId,
          version,
          error: getErrorMessage(error),
        },
      );
      throw error;
    }
  }

  async updateMetadata(
    versionId: SkillVersionId,
    metadata: Record<string, string>,
  ): Promise<void> {
    this.logger.info('Updating metadata for skill version', {
      versionId,
    });

    try {
      await this.repository.update(versionId, {
        metadata,
      });
      this.logger.info('Metadata updated successfully for skill version', {
        versionId,
      });
    } catch (error) {
      this.logger.error('Failed to update metadata for skill version', {
        versionId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }
}
