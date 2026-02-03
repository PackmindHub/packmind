import { ISkillFileRepository } from '../../domain/repositories/ISkillFileRepository';
import { SkillFileSchema } from '../schemas/SkillFileSchema';
import { Repository } from 'typeorm';
import { PackmindLogger } from '@packmind/logger';
import { localDataSource, AbstractRepository } from '@packmind/node-utils';
import { SkillFile, SkillVersionId } from '@packmind/types';

const origin = 'SkillFileRepository';

export class SkillFileRepository
  extends AbstractRepository<SkillFile>
  implements ISkillFileRepository
{
  constructor(
    repository: Repository<SkillFile> = localDataSource.getRepository<SkillFile>(
      SkillFileSchema,
    ),
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super('skill file', repository, SkillFileSchema, logger);
    this.logger.info('SkillFileRepository initialized');
  }

  protected override loggableEntity(entity: SkillFile): Partial<SkillFile> {
    return {
      id: entity.id,
      skillVersionId: entity.skillVersionId,
      path: entity.path,
    };
  }

  async findBySkillVersionId(
    skillVersionId: SkillVersionId,
  ): Promise<SkillFile[]> {
    this.logger.info('Finding skill files by version ID', { skillVersionId });

    try {
      const files = await this.repository.find({
        where: { skillVersionId },
      });

      this.logger.info('Skill files found by version ID', {
        skillVersionId,
        count: files.length,
      });
      return files;
    } catch (error) {
      this.logger.error('Failed to find skill files by version ID', {
        skillVersionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async addMany(files: SkillFile[]): Promise<SkillFile[]> {
    this.logger.info('Adding multiple skill files', { count: files.length });

    try {
      const savedFiles = await this.repository.save(files);

      this.logger.info('Successfully added multiple skill files', {
        count: savedFiles.length,
      });
      return savedFiles;
    } catch (error) {
      this.logger.error('Failed to add multiple skill files', {
        count: files.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
