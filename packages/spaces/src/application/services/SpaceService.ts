import { PackmindLogger } from '@packmind/shared';
import { Space, SpaceId, createSpaceId } from '../../domain/entities/Space';
import { ISpaceRepository } from '../../domain/repositories/ISpaceRepository';
import { SpaceSlugConflictError } from '../../domain/errors/SpaceSlugConflictError';
import { OrganizationId } from '@packmind/shared/types';
import { v4 as uuidv4 } from 'uuid';
import slug from 'slug';

const origin = 'SpaceService';

export const DEFAULT_SPACE_NAME = 'Global';

export class SpaceService {
  constructor(
    private readonly spaceRepository: ISpaceRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('SpaceService initialized');
  }

  async createSpace(
    name: string,
    organizationId: OrganizationId,
  ): Promise<Space> {
    this.logger.info('Creating space', { name, organizationId });

    try {
      const baseSlug = slug(name);
      const existingSpace = await this.spaceRepository.findBySlug(
        baseSlug,
        organizationId,
      );

      if (existingSpace) {
        throw new SpaceSlugConflictError(name, organizationId);
      }

      const space: Space = {
        id: createSpaceId(uuidv4()),
        name,
        slug: baseSlug,
        organizationId,
      };

      const createdSpace = await this.spaceRepository.add(space);
      this.logger.info('Space created successfully', {
        spaceId: createdSpace.id,
        name,
        slug: baseSlug,
        organizationId,
      });
      return createdSpace;
    } catch (error) {
      this.logger.error('Failed to create space', {
        name,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async createDefaultSpace(organizationId: OrganizationId): Promise<Space> {
    this.logger.info('Creating default space for organization', {
      organizationId,
    });

    return this.createSpace(DEFAULT_SPACE_NAME, organizationId);
  }

  async getSpaceById(id: SpaceId): Promise<Space | null> {
    this.logger.info('Getting space by ID', { id });

    try {
      const space = await this.spaceRepository.findById(id);
      if (space) {
        this.logger.info('Space found', { id });
      } else {
        this.logger.warn('Space not found', { id });
      }
      return space;
    } catch (error) {
      this.logger.error('Failed to get space by ID', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getSpaceBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Space | null> {
    this.logger.info('Getting space by slug', { slug, organizationId });

    try {
      const space = await this.spaceRepository.findBySlug(slug, organizationId);
      if (space) {
        this.logger.info('Space found by slug', { slug, organizationId });
      } else {
        this.logger.warn('Space not found by slug', { slug, organizationId });
      }
      return space;
    } catch (error) {
      this.logger.error('Failed to get space by slug', {
        slug,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listSpacesByOrganization(
    organizationId: OrganizationId,
  ): Promise<Space[]> {
    this.logger.info('Listing spaces by organization', { organizationId });

    try {
      const spaces =
        await this.spaceRepository.findByOrganizationId(organizationId);
      this.logger.info('Spaces listed successfully', {
        organizationId,
        count: spaces.length,
      });
      return spaces;
    } catch (error) {
      this.logger.error('Failed to list spaces by organization', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listSpaces(): Promise<Space[]> {
    this.logger.info('Listing all spaces');

    try {
      const spaces = await this.spaceRepository.list();
      this.logger.info('All spaces listed successfully', {
        count: spaces.length,
      });
      return spaces;
    } catch (error) {
      this.logger.error('Failed to list all spaces', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
