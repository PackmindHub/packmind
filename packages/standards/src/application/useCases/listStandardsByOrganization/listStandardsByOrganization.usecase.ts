import { StandardService } from '../../services/StandardService';
import { Standard } from '../../../domain/entities/Standard';
import { OrganizationId } from '@packmind/accounts';
import { LogLevel, PackmindLogger } from '@packmind/shared';

const origin = 'ListStandardsByOrganizationUsecase';

export class ListStandardsByOrganizationUsecase {
  constructor(
    private readonly standardService: StandardService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('ListStandardsByOrganizationUsecase initialized');
  }

  public async listStandardsByOrganization(
    organizationId: OrganizationId,
  ): Promise<Standard[]> {
    this.logger.info('Listing standards by organization', { organizationId });

    try {
      const standards =
        await this.standardService.listStandardsByOrganization(organizationId);
      this.logger.info('Standards listed by organization successfully', {
        organizationId,
        count: standards.length,
      });
      return standards;
    } catch (error) {
      this.logger.error('Failed to list standards by organization', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
