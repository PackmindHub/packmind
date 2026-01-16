import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  createOrganizationId,
  createUserId,
  DeleteStandardsBatchCommand,
  DeleteStandardsBatchResponse,
  IAccountsPort,
  IDeleteStandardsBatchUseCase,
  StandardDeletedEvent,
} from '@packmind/types';
import { StandardService } from '../../services/StandardService';

const origin = 'DeleteStandardsBatchUsecase';

export class DeleteStandardsBatchUsecase
  extends AbstractMemberUseCase<
    DeleteStandardsBatchCommand,
    DeleteStandardsBatchResponse
  >
  implements IDeleteStandardsBatchUseCase
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
    command: DeleteStandardsBatchCommand & MemberContext,
  ): Promise<DeleteStandardsBatchResponse> {
    const { standardIds, organizationId, userId, source = 'ui' } = command;

    const brandedUserId = createUserId(userId);
    const brandedOrganizationId = createOrganizationId(organizationId);

    this.logger.info('Deleting standards batch', { count: standardIds.length });

    // Get all standards before deleting to retrieve their spaceIds
    const standards = await Promise.all(
      standardIds.map((id) => this.standardService.getStandardById(id)),
    );

    // Delete all standards
    await Promise.all(
      standardIds.map((id) =>
        this.standardService.deleteStandard(id, brandedUserId),
      ),
    );

    // Emit events for each deleted standard
    for (let i = 0; i < standardIds.length; i++) {
      const standard = standards[i];
      if (standard) {
        const event = new StandardDeletedEvent({
          standardId: standardIds[i],
          spaceId: standard.spaceId,
          organizationId: brandedOrganizationId,
          userId: brandedUserId,
          source,
        });
        this.eventEmitterService.emit(event);
      }
    }

    this.logger.info('Standards batch deleted successfully', {
      count: standardIds.length,
    });

    return {};
  }
}
