import { StandardService } from '../../services/StandardService';
import { Standard } from '@packmind/types';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { OrganizationId } from '@packmind/types';

const origin = 'FindStandardBySlugUsecase';

export class FindStandardBySlugUsecase {
  constructor(
    private readonly standardService: StandardService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('FindStandardBySlugUsecase initialized');
  }

  public async findStandardBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<Standard | null> {
    this.logger.info('Finding standard by slug and organization', {
      slug,
      organizationId,
    });

    try {
      const standard = await this.standardService.findStandardBySlug(
        slug,
        organizationId,
      );
      this.logger.info('Standard search by slug and organization completed', {
        slug,
        organizationId,
        found: !!standard,
      });
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
}
