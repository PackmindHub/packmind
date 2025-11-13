import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  GetStandardByIdCommand,
  GetStandardByIdResponse,
  IAccountsPort,
  IGetStandardByIdUseCase,
  ISpacesPort,
} from '@packmind/types';
import { StandardService } from '../../services/StandardService';

const origin = 'GetStandardByIdUsecase';

export class GetStandardByIdUsecase
  extends AbstractMemberUseCase<GetStandardByIdCommand, GetStandardByIdResponse>
  implements IGetStandardByIdUseCase
{
  constructor(
    accountsAdapter: IAccountsPort,
    private readonly standardService: StandardService,
    private readonly spacesPort: ISpacesPort | null,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
    this.logger.info('GetStandardByIdUsecase initialized');
  }

  async executeForMembers(
    command: GetStandardByIdCommand & MemberContext,
  ): Promise<GetStandardByIdResponse> {
    this.logger.info('Getting standard by ID', {
      id: command.standardId,
      spaceId: command.spaceId,
    });

    try {
      // Verify the space belongs to the organization
      if (!this.spacesPort) {
        this.logger.error('SpacesPort not available for space validation');
        throw new Error('SpacesPort not available');
      }

      const space = await this.spacesPort.getSpaceById(command.spaceId);
      if (!space) {
        this.logger.warn('Space not found', { spaceId: command.spaceId });
        throw new Error(`Space with id ${command.spaceId} not found`);
      }

      if (space.organizationId !== command.organizationId) {
        this.logger.warn('Space does not belong to organization', {
          spaceId: command.spaceId,
          spaceOrganizationId: space.organizationId,
          requestOrganizationId: command.organizationId,
        });
        throw new Error(
          `Space ${command.spaceId} does not belong to organization ${command.organizationId}`,
        );
      }

      const standard = await this.standardService.getStandardById(
        command.standardId,
      );

      if (!standard) {
        this.logger.info('Standard not found', { id: command.standardId });
        return { standard: null };
      }

      // Verify the standard belongs to the space
      // Standards are now always space-specific (spaceId is never null)
      if (standard.spaceId !== command.spaceId) {
        this.logger.warn('Standard does not belong to space', {
          standardId: command.standardId,
          standardSpaceId: standard.spaceId,
          requestSpaceId: command.spaceId,
        });
        throw new Error(
          `Standard ${command.standardId} does not belong to space ${command.spaceId}`,
        );
      }

      this.logger.info('Standard retrieved successfully', {
        id: command.standardId,
      });
      return { standard };
    } catch (error) {
      this.logger.error('Failed to get standard by ID', {
        id: command.standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
