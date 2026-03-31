import { v4 as uuidv4 } from 'uuid';

import { IStandardVersionRepository } from '../../domain/repositories/IStandardVersionRepository';
import { IRuleRepository } from '../../domain/repositories/IRuleRepository';
import { IRuleExampleRepository } from '../../domain/repositories/IRuleExampleRepository';
import { IStandardRepository } from '../../domain/repositories/IStandardRepository';
import { PackmindLogger } from '@packmind/logger';
import {
  createRuleExampleId,
  createRuleId,
  createStandardId,
  createStandardVersionId,
  DuplicateStandardResult,
  GitCommit,
  OrganizationId,
  QueryOption,
  RuleId,
  SpaceId,
  Standard,
  StandardId,
  UserId,
} from '@packmind/types';

const origin = 'StandardService';

export type CreateStandardData = {
  name: string;
  slug: string;
  description: string;
  version: number;
  gitCommit?: GitCommit;
  userId: UserId;
  scope: string | null;
  spaceId: SpaceId; // Required space ID for space-specific standards
};

export type UpdateStandardData = {
  name: string;
  slug: string;
  description: string;
  version: number;
  gitCommit?: GitCommit;
  userId: UserId;
  scope: string | null;
};

export class StandardService {
  constructor(
    private readonly standardRepository: IStandardRepository,
    private readonly standardVersionRepository: IStandardVersionRepository,
    private readonly ruleRepository: IRuleRepository,
    private readonly ruleExampleRepository: IRuleExampleRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('StandardService initialized');
  }

  async addStandard(standardData: CreateStandardData): Promise<Standard> {
    this.logger.info('Adding new standard', {
      name: standardData.name,
      slug: standardData.slug,
      spaceId: standardData.spaceId,
      userId: standardData.userId,
    });

    try {
      const standardId = createStandardId(uuidv4());
      this.logger.debug('Generated standard ID', { standardId });

      const standard: Standard = {
        id: standardId,
        ...standardData,
        movedTo: null,
      };

      this.logger.debug('Adding standard to repository');
      const savedStandard = await this.standardRepository.add(standard);
      this.logger.info('Standard added to repository successfully', {
        standardId,
        name: standardData.name,
      });

      return savedStandard;
    } catch (error) {
      this.logger.error('Failed to add standard', {
        name: standardData.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listStandardsBySpace(
    spaceId: SpaceId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Standard[]> {
    this.logger.info('Listing standards with scope by space', {
      spaceId,
      includeDeleted: opts?.includeDeleted ?? false,
    });

    try {
      const standards = await this.standardRepository.findBySpaceId(
        spaceId,
        opts,
      );
      this.logger.info('Standards with scope retrieved by space successfully', {
        spaceId,
        count: standards.length,
      });
      return standards;
    } catch (error) {
      this.logger.error('Failed to list standards with scope by space', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listStandardsByUser(userId: UserId): Promise<Standard[]> {
    this.logger.info('Listing standards by user', { userId });

    try {
      const standards = await this.standardRepository.findByUserId(userId);
      this.logger.info('Standards retrieved by user successfully', {
        userId,
        count: standards.length,
      });
      return standards;
    } catch (error) {
      this.logger.error('Failed to list standards by user', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getStandardById(id: StandardId): Promise<Standard | null> {
    this.logger.info('Getting standard by ID', { id });

    try {
      const standard = await this.standardRepository.findById(id);
      if (standard) {
        this.logger.info('Standard found successfully', {
          id,
          name: standard.name,
        });
      } else {
        this.logger.warn('Standard not found', { id });
      }
      return standard;
    } catch (error) {
      this.logger.error('Failed to get standard by ID', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findStandardBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Standard | null> {
    this.logger.info('Finding standard by slug and organization', {
      slug,
      organizationId,
    });

    try {
      const standard = await this.standardRepository.findBySlug(
        slug,
        organizationId,
      );
      if (standard) {
        this.logger.info(
          'Standard found by slug and organization successfully',
          {
            slug,
            organizationId,
            standardId: standard.id,
          },
        );
      } else {
        this.logger.warn('Standard not found by slug and organization', {
          slug,
          organizationId,
        });
      }
      return standard;
    } catch (error) {
      this.logger.error('Failed to find standard by slug and organization', {
        slug,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateStandard(
    standardId: StandardId,
    standardData: UpdateStandardData,
  ): Promise<Standard> {
    this.logger.info('Updating standard', {
      standardId,
      name: standardData.name,
      userId: standardData.userId,
    });

    try {
      // Check if the standard exists
      this.logger.debug('Checking if standard exists', { standardId });
      const existingStandard =
        await this.standardRepository.findById(standardId);
      if (!existingStandard) {
        this.logger.error('Standard not found for update', { standardId });
        throw new Error(`Standard with id ${standardId} not found`);
      }

      // Update the standard
      const updatedStandard: Standard = {
        id: standardId,
        ...standardData,
        spaceId: existingStandard.spaceId,
        movedTo: existingStandard.movedTo,
      };

      this.logger.debug('Updating standard in repository');
      const savedStandard = await this.standardRepository.add(updatedStandard);
      this.logger.info('Standard updated in repository successfully', {
        standardId,
        version: standardData.version,
      });

      return savedStandard;
    } catch (error) {
      this.logger.error('Failed to update standard', {
        standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async deleteStandard(standardId: StandardId, userId: UserId): Promise<void> {
    this.logger.info('Deleting standard and all its versions', { standardId });

    try {
      // Check if the standard exists
      this.logger.debug('Checking if standard exists for deletion', {
        standardId,
      });
      const standard = await this.standardRepository.findById(standardId);
      if (!standard) {
        this.logger.error('Standard not found for deletion', { standardId });
        throw new Error(`Standard with id ${standardId} not found`);
      }

      // Delete the standard (versions will be automatically deleted by SQL CASCADE)
      this.logger.debug('Deleting standard', { standardId });
      await this.standardRepository.deleteById(standardId, userId);

      this.logger.info('Standard and all its versions deleted successfully', {
        standardId,
      });
    } catch (error) {
      this.logger.error('Failed to delete standard', {
        standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async duplicateStandardToSpace(
    standardId: StandardId,
    destinationSpaceId: SpaceId,
    newUserId: UserId,
  ): Promise<DuplicateStandardResult> {
    this.logger.info('Duplicating standard to space', {
      standardId,
      destinationSpaceId,
    });

    try {
      // 1. Read the original standard
      const original = await this.standardRepository.findById(standardId);
      if (!original) {
        throw new Error(`Standard with id ${standardId} not found`);
      }

      // 2. Create new standard with fresh ID
      const newStandardId = createStandardId(uuidv4());
      const newStandard: Standard = {
        id: newStandardId,
        name: original.name,
        slug: original.slug,
        description: original.description,
        summary: original.summary,
        version: original.version,
        gitCommit: original.gitCommit,
        userId: newUserId,
        scope: original.scope,
        spaceId: destinationSpaceId,
        movedTo: null,
      };
      const savedStandard = await this.standardRepository.add(newStandard);
      const ruleMappings: Array<{ oldRuleId: RuleId; newRuleId: RuleId }> = [];

      // 3. Read all versions for this standard
      const versions =
        await this.standardVersionRepository.findByStandardId(standardId);

      for (const version of versions) {
        // 4. Create new version with fresh ID, linked to new standard
        const newVersionId = createStandardVersionId(uuidv4());
        await this.standardVersionRepository.add({
          id: newVersionId,
          standardId: newStandardId,
          name: version.name,
          slug: version.slug,
          description: version.description,
          version: version.version,
          summary: version.summary,
          gitCommit: version.gitCommit,
          userId: version.userId,
          scope: version.scope,
        });

        // 5. Read all rules for this version
        const rules = await this.ruleRepository.findByStandardVersionId(
          version.id,
        );

        for (const rule of rules) {
          // 6. Create new rule with fresh ID, linked to new version
          const newRuleId = createRuleId(uuidv4());
          await this.ruleRepository.add({
            id: newRuleId,
            content: rule.content,
            standardVersionId: newVersionId,
          });
          ruleMappings.push({ oldRuleId: rule.id, newRuleId });

          // 7. Read all examples for this rule
          const examples = await this.ruleExampleRepository.findByRuleId(
            rule.id,
          );

          for (const example of examples) {
            // 8. Create new example with fresh ID, linked to new rule
            await this.ruleExampleRepository.add({
              id: createRuleExampleId(uuidv4()),
              lang: example.lang,
              positive: example.positive,
              negative: example.negative,
              ruleId: newRuleId,
            });
          }
        }
      }

      this.logger.info('Standard duplicated to space successfully', {
        originalStandardId: standardId,
        newStandardId,
        destinationSpaceId,
        versionsCount: versions.length,
        ruleMappingsCount: ruleMappings.length,
      });

      return { standard: savedStandard, ruleMappings };
    } catch (error) {
      this.logger.error('Failed to duplicate standard to space', {
        standardId,
        destinationSpaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async markStandardAsMoved(
    standardId: StandardId,
    destinationSpaceId: SpaceId,
  ): Promise<void> {
    this.logger.info('Marking standard as moved', {
      standardId,
      destinationSpaceId,
    });

    try {
      const standard = await this.standardRepository.findById(standardId);
      if (!standard) {
        throw new Error(`Standard with id ${standardId} not found`);
      }

      await this.standardRepository.markAsMoved(standardId, destinationSpaceId);

      this.logger.info('Standard marked as moved successfully', {
        standardId,
        destinationSpaceId,
      });
    } catch (error) {
      this.logger.error('Failed to mark standard as moved', {
        standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async hardDeleteStandard(standardId: StandardId): Promise<void> {
    this.logger.info('Hard deleting standard', { standardId });
    await this.standardRepository.hardDeleteById(standardId);
  }
}
