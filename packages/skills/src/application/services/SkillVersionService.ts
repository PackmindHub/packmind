import { v4 as uuidv4 } from 'uuid';
import { ISkillVersionRepository } from '../../domain/repositories/ISkillVersionRepository';
import { PackmindLogger } from '@packmind/logger';
import {
  createSkillVersionId,
  SkillId,
  SkillVersion,
  SkillVersionId,
  UserId,
} from '@packmind/types';

const origin = 'SkillVersionService';

export type CreateSkillVersionData = {
  skillId: SkillId;
  userId: UserId;
  name: string;
  slug: string;
  description: string;
  prompt: string;
  allowedTools?: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  version: number;
};

export class SkillVersionService {
  constructor(
    private readonly skillVersionRepository: ISkillVersionRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('SkillVersionService initialized');
  }

  async addSkillVersion(
    skillVersionData: CreateSkillVersionData,
  ): Promise<SkillVersion> {
    this.logger.info('Adding new skill version', {
      skillId: skillVersionData.skillId,
      version: skillVersionData.version,
    });

    try {
      const versionId = createSkillVersionId(uuidv4());

      const newSkillVersion: SkillVersion = {
        id: versionId,
        skillId: skillVersionData.skillId,
        userId: skillVersionData.userId,
        name: skillVersionData.name,
        slug: skillVersionData.slug,
        description: skillVersionData.description,
        prompt: skillVersionData.prompt,
        allowedTools: skillVersionData.allowedTools,
        license: skillVersionData.license,
        compatibility: skillVersionData.compatibility,
        metadata: skillVersionData.metadata || {},
        version: skillVersionData.version,
      };

      const savedVersion =
        await this.skillVersionRepository.add(newSkillVersion);

      this.logger.info('Skill version added successfully', {
        versionId: savedVersion.id,
        skillId: skillVersionData.skillId,
        version: skillVersionData.version,
      });

      return savedVersion;
    } catch (error) {
      this.logger.error('Failed to add skill version', {
        skillId: skillVersionData.skillId,
        version: skillVersionData.version,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getSkillVersionById(id: SkillVersionId): Promise<SkillVersion | null> {
    this.logger.info('Getting skill version by ID', { versionId: id });

    try {
      const skillVersion = await this.skillVersionRepository.findById(id);

      if (skillVersion) {
        this.logger.info('Skill version found by ID successfully', {
          versionId: id,
          skillId: skillVersion.skillId,
          version: skillVersion.version,
        });
      } else {
        this.logger.warn('Skill version not found by ID', { versionId: id });
      }

      return skillVersion;
    } catch (error) {
      this.logger.error('Failed to get skill version by ID', {
        versionId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getLatestSkillVersion(skillId: SkillId): Promise<SkillVersion | null> {
    this.logger.info('Getting latest skill version', { skillId });

    try {
      const latestVersion =
        await this.skillVersionRepository.findLatestBySkillId(skillId);

      if (latestVersion) {
        this.logger.info('Latest skill version found successfully', {
          skillId,
          version: latestVersion.version,
          versionId: latestVersion.id,
        });
      } else {
        this.logger.warn('No skill versions found', { skillId });
      }

      return latestVersion;
    } catch (error) {
      this.logger.error('Failed to get latest skill version', {
        skillId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listSkillVersions(skillId: SkillId): Promise<SkillVersion[]> {
    this.logger.info('Listing skill versions', { skillId });

    try {
      const versions = await this.skillVersionRepository.findBySkillId(skillId);
      this.logger.info('Skill versions retrieved successfully', {
        skillId,
        count: versions.length,
      });
      return versions;
    } catch (error) {
      this.logger.error('Failed to list skill versions', {
        skillId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getSkillVersion(
    skillId: SkillId,
    version: number,
  ): Promise<SkillVersion | null> {
    this.logger.info('Getting skill version', { skillId, version });

    try {
      const skillVersion =
        await this.skillVersionRepository.findBySkillIdAndVersion(
          skillId,
          version,
        );

      if (skillVersion) {
        this.logger.info('Skill version found successfully', {
          skillId,
          version,
          versionId: skillVersion.id,
        });
      } else {
        this.logger.warn('Skill version not found', { skillId, version });
      }

      return skillVersion;
    } catch (error) {
      this.logger.error('Failed to get skill version', {
        skillId,
        version,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
