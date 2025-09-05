import { StandardService } from '../../services/StandardService';
import { Standard } from '../../../domain/entities/Standard';
import { LogLevel, PackmindLogger } from '@packmind/shared';

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

  public async findStandardBySlug(slug: string): Promise<Standard | null> {
    this.logger.info('Finding standard by slug', { slug });

    try {
      const standard = await this.standardService.findStandardBySlug(slug);
      this.logger.info('Standard search by slug completed', {
        slug,
        found: !!standard,
      });
      return standard;
    } catch (error) {
      this.logger.error('Failed to find standard by slug', {
        slug,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
