import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  IAccountsPort,
  IListStandardsBySpaceUseCase,
  ISpacesPort,
  ListStandardsBySpaceCommand,
  ListStandardsBySpaceResponse,
} from '@packmind/types';
import { StandardService } from '../../services/StandardService';

const origin = 'ListStandardsBySpaceUsecase';

export class ListStandardsBySpaceUsecase
  extends AbstractMemberUseCase<
    ListStandardsBySpaceCommand,
    ListStandardsBySpaceResponse
  >
  implements IListStandardsBySpaceUseCase
{
  constructor(
    accountsAdapter: IAccountsPort,
    private readonly standardService: StandardService,
    private readonly spacesPort: ISpacesPort | null,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
    logger.info('ListStandardsBySpaceUsecase initialized');
  }

  async executeForMembers(
    command: ListStandardsBySpaceCommand & MemberContext,
  ): Promise<ListStandardsBySpaceResponse> {
    this.logger.info('Listing standards by space', {
      spaceId: command.spaceId,
      organizationId: command.organizationId,
    });

    try {
      // Verify the space belongs to the organization
      if (!this.spacesPort) {
        this.logger.error('SpacesPort not available for space validation');
        throw new Error('SpacesPort not available');
      }

      const space = await this.spacesPort.getSpaceById(command.spaceId);
      if (!space) {
        this.logger.warn('Space not found', {
          spaceId: command.spaceId,
        });
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

      // Get standards in the specified space
      // Standards are now always space-specific, no organization-level standards
      const standardsInSpace = await this.standardService.listStandardsBySpace(
        command.spaceId,
      );

      const sortedStandards = standardsInSpace.sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      this.logger.info('Standards listed by space successfully', {
        spaceId: command.spaceId,
        organizationId: command.organizationId,
        count: sortedStandards.length,
      });

      return { standards: sortedStandards };
    } catch (error) {
      this.logger.error('Failed to list standards by space', {
        spaceId: command.spaceId,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
