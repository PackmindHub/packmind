import { v4 as uuidv4 } from 'uuid';
import { ISkillVersionRepository } from '../../domain/repositories/ISkillVersionRepository';
import { ISkillFileRepository } from '../../domain/repositories/ISkillFileRepository';
import { ISkillRepository } from '../../domain/repositories/ISkillRepository';
import { PackmindLogger } from '@packmind/logger';
import {
  createSkillFileId,
  createSkillId,
  createSkillVersionId,
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
  additionalProperties?: Record<string, unknown>;
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
  additionalProperties?: Record<string, unknown>;
  version: number;
  userId: UserId;
};

export class SkillService {
  constructor(
    private readonly skillRepository: ISkillRepository,
    private readonly skillVersionRepository: ISkillVersionRepository,
    private readonly skillFileRepository: ISkillFileRepository,
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
        movedTo: null,
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
        movedTo: existingSkill.movedTo,
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

  async duplicateSkillToSpace(
    skillId: SkillId,
    destinationSpaceId: SpaceId,
    newUserId: UserId,
  ): Promise<Skill> {
    this.logger.info('Duplicating skill to space', {
      skillId,
      destinationSpaceId,
    });

    try {
      // 1. Read the original skill
      const original = await this.skillRepository.findById(skillId);
      if (!original) {
        throw new Error(`Skill with id ${skillId} not found`);
      }

      // 2. Create new skill with fresh ID
      const newSkillId = createSkillId(uuidv4());
      const now = new Date();
      const newSkill: Skill = {
        id: newSkillId,
        name: original.name,
        slug: original.slug,
        description: original.description,
        prompt: original.prompt,
        allowedTools: original.allowedTools,
        license: original.license,
        compatibility: original.compatibility,
        metadata: original.metadata,
        additionalProperties: original.additionalProperties,
        version: original.version,
        userId: newUserId,
        spaceId: destinationSpaceId,
        movedTo: null,
        createdAt: now,
        updatedAt: now,
      };
      const savedSkill = await this.skillRepository.add(newSkill);

      // 3. Read all versions for this skill
      const versions = await this.skillVersionRepository.findBySkillId(skillId);

      for (const version of versions) {
        // 4. Create new version with fresh ID, linked to new skill
        const newVersionId = createSkillVersionId(uuidv4());
        await this.skillVersionRepository.add({
          id: newVersionId,
          skillId: newSkillId,
          version: version.version,
          userId: version.userId,
          name: version.name,
          slug: version.slug,
          description: version.description,
          prompt: version.prompt,
          allowedTools: version.allowedTools,
          license: version.license,
          compatibility: version.compatibility,
          metadata: version.metadata,
          additionalProperties: version.additionalProperties,
        });

        // 5. Read all files for this version
        const files = await this.skillFileRepository.findBySkillVersionId(
          version.id,
        );

        if (files.length > 0) {
          // 6. Create new files with fresh IDs, linked to new version
          const newFiles = files.map((file) => ({
            id: createSkillFileId(uuidv4()),
            skillVersionId: newVersionId,
            path: file.path,
            content: file.content,
            permissions: file.permissions,
            isBase64: file.isBase64,
          }));
          await this.skillFileRepository.addMany(newFiles);
        }
      }

      this.logger.info('Skill duplicated to space successfully', {
        originalSkillId: skillId,
        newSkillId,
        destinationSpaceId,
        versionsCount: versions.length,
      });

      return savedSkill;
    } catch (error) {
      this.logger.error('Failed to duplicate skill to space', {
        skillId,
        destinationSpaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async markSkillAsMoved(
    skillId: SkillId,
    destinationSpaceId: SpaceId,
  ): Promise<void> {
    this.logger.info('Marking skill as moved', {
      skillId,
      destinationSpaceId,
    });

    try {
      const skill = await this.skillRepository.findById(skillId);
      if (!skill) {
        throw new Error(`Skill with id ${skillId} not found`);
      }

      await this.skillRepository.markAsMoved(skillId, destinationSpaceId);

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
