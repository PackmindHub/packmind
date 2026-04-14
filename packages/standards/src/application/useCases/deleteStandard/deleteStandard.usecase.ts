import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  createOrganizationId,
  createUserId,
  DeleteStandardCommand,
  DeleteStandardResponse,
  IAccountsPort,
  IDeleteStandardUseCase,
  ISpacesPort,
  StandardDeletedEvent,
} from '@packmind/types';
import { StandardService } from '../../services/StandardService';

const origin = 'DeleteStandardUsecase';

export class DeleteStandardUsecase
  extends AbstractSpaceMemberUseCase<
    DeleteStandardCommand,
    DeleteStandardResponse
  >
  implements IDeleteStandardUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly standardService: StandardService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsPort, logger);
  }

  protected async executeForSpaceMembers(
    command: DeleteStandardCommand & SpaceMemberContext,
  ): Promise<DeleteStandardResponse> {
    const { standardId, organizationId, userId, source = 'ui' } = command;

    const brandedUserId = createUserId(userId);
    const brandedOrganizationId = createOrganizationId(organizationId);

    this.logger.info('Deleting standard', { standardId });

    // Get the standard before deleting to retrieve its spaceId
    const standard = await this.standardService.getStandardById(standardId);
    if (!standard) {
      throw new Error(`Standard with id ${standardId} not found`);
    }

    await this.standardService.deleteStandard(standardId, brandedUserId);

    // Emit event to notify other domains
    const event = new StandardDeletedEvent({
      standardId,
      spaceId: standard.spaceId,
      organizationId: brandedOrganizationId,
      userId: brandedUserId,
      source,
    });
    this.eventEmitterService.emit(event);
    this.logger.info('StandardDeletedEvent emitted', {
      standardId,
      spaceId: standard.spaceId,
    });

    this.logger.info('Standard deleted successfully', { standardId });

    return {};
  }
}
