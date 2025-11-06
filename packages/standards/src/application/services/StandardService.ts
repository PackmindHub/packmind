import { v4 as uuidv4 } from 'uuid';

import {
  Standard,
  StandardId,
  createStandardId,
} from '../../domain/entities/Standard';
import { IStandardRepository } from '../../domain/repositories/IStandardRepository';
import { PackmindLogger } from '@packmind/logger';
import { GitCommit } from '@packmind/git';
import { OrganizationId, UserId } from '@packmind/accounts';
import { SpaceId } from '@packmind/shared/types';

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

  async listStandardsBySpace(spaceId: SpaceId): Promise<Standard[]> {
    this.logger.info('Listing standards with scope by space', {
      spaceId,
    });

    try {
      const standards = await this.standardRepository.findBySpaceId(spaceId);
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

  async listStandardsByOrganizationAndUser(
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<Standard[]> {
    this.logger.info('Listing standards by organization and user', {
      organizationId,
      userId,
    });

    try {
      const standards = await this.standardRepository.findByOrganizationAndUser(
        organizationId,
        userId,
      );
      this.logger.info(
        'Standards retrieved by organization and user successfully',
        {
          organizationId,
          userId,
          count: standards.length,
        },
      );
      return standards;
    } catch (error) {
      this.logger.error('Failed to list standards by organization and user', {
        organizationId,
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
}
