import { PackmindLogger } from '@packmind/logger';
import {
  createSpaceId,
  OrganizationId,
  Space,
  SpaceColor,
  SpaceId,
  SpaceType,
  SPACE_COLOR_PALETTES,
} from '@packmind/types';
import slug from 'slug';
import { v4 as uuidv4 } from 'uuid';
import { SpaceSlugConflictError } from '../../domain/errors/SpaceSlugConflictError';
import { ISpaceRepository } from '../../domain/repositories/ISpaceRepository';

const origin = 'SpaceService';

function deriveColorFromName(name: string): SpaceColor {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = Math.trunc(hash * 31 + (name.codePointAt(i) ?? 0));
  }
  return SPACE_COLOR_PALETTES[Math.abs(hash) % SPACE_COLOR_PALETTES.length];
}

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
    isDefaultSpace = true,
    type: SpaceType = SpaceType.private,
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
        type,
        organizationId,
        isDefaultSpace,
        color: deriveColorFromName(name),
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

    return this.createSpace(
      DEFAULT_SPACE_NAME,
      organizationId,
      true,
      SpaceType.open,
    );
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

  async findOrgPagePaginated(
    organizationId: OrganizationId,
    page: number,
    pageSize: number,
  ): Promise<{ items: Space[]; totalCount: number }> {
    return this.spaceRepository.findOrgPagePaginated(
      organizationId,
      page,
      pageSize,
    );
  }

  async updateSpace(
    spaceId: SpaceId,
    fields: { name?: string; type?: SpaceType; color?: SpaceColor },
  ): Promise<Space> {
    this.logger.info('Updating space', { spaceId });

    const repoFields: {
      name?: string;
      type?: SpaceType;
      color?: SpaceColor;
    } = {};

    if (fields.name !== undefined) {
      const space = await this.spaceRepository.findById(spaceId);
      if (!space) {
        throw new Error(`Space ${spaceId} not found`);
      }
      const candidateSlug = slug(fields.name);
      const existingBySlug = await this.spaceRepository.findBySlug(
        candidateSlug,
        space.organizationId,
      );
      if (existingBySlug && existingBySlug.id !== spaceId) {
        throw new SpaceSlugConflictError(fields.name, space.organizationId);
      }
      repoFields.name = fields.name;
    }

    if (fields.type !== undefined) {
      repoFields.type = fields.type;
    }

    if (fields.color !== undefined) {
      repoFields.color = fields.color;
    }

    return this.spaceRepository.updateFields(spaceId, repoFields);
  }

  async deleteSpace(spaceId: SpaceId, deletedBy: string): Promise<void> {
    await this.spaceRepository.deleteById(spaceId, deletedBy);
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
