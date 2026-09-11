import { PackmindLogger } from '@packmind/logger';
import { SkillFile, SkillVersionId } from '@packmind/types';
import { ISkillFileRepository } from '../../domain/repositories/ISkillFileRepository';

const origin = 'SkillFileService';

export class SkillFileService {
  constructor(
    private readonly skillFileRepository: ISkillFileRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('SkillFileService initialized');
  }

  async findByVersionId(skillVersionId: SkillVersionId): Promise<SkillFile[]> {
    this.logger.info('Finding skill files by version ID', { skillVersionId });

    try {
      const files =
        await this.skillFileRepository.findBySkillVersionId(skillVersionId);

      this.logger.info('Skill files found successfully', {
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
      const savedFiles = await this.skillFileRepository.addMany(files);

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
