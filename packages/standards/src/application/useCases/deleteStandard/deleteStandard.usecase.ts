import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  createOrganizationId,
  createUserId,
  DeleteStandardCommand,
  DeleteStandardResponse,
  IAccountsPort,
  IDeleteStandardUseCase,
  StandardDeletedEvent,
} from '@packmind/types';
import { StandardService } from '../../services/StandardService';

const origin = 'DeleteStandardUsecase';

export class DeleteStandardUsecase
  extends AbstractMemberUseCase<DeleteStandardCommand, DeleteStandardResponse>
  implements IDeleteStandardUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly standardService: StandardService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: DeleteStandardCommand & MemberContext,
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
