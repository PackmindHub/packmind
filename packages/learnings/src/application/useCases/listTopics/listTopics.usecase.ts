import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  createSpaceId,
  IAccountsPort,
  IListTopicsUseCase,
  ISpacesPort,
  ListTopicsCommand,
  ListTopicsResponse,
} from '@packmind/types';
import { TopicService } from '../../services/TopicService';

const origin = 'ListTopicsUsecase';

export class ListTopicsUsecase
  extends AbstractMemberUseCase<ListTopicsCommand, ListTopicsResponse>
  implements IListTopicsUseCase
{
  constructor(
    accountsAdapter: IAccountsPort,
    private readonly topicService: TopicService,
    private readonly spacesPort: ISpacesPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
    this.logger.info('ListTopicsUsecase initialized');
  }

  async executeForMembers(
    command: ListTopicsCommand & MemberContext,
  ): Promise<ListTopicsResponse> {
    this.logger.info('Listing topics by space', {
      spaceId: command.spaceId,
      organizationId: command.organizationId,
    });

    try {
      const spaceId = createSpaceId(command.spaceId);

      // Verify the space belongs to the organization
      const space = await this.spacesPort.getSpaceById(spaceId);
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

      // Get topics in the specified space
      const topics = await this.topicService.listTopicsBySpaceId(spaceId);

      this.logger.info('Topics listed by space successfully', {
        spaceId: command.spaceId,
        organizationId: command.organizationId,
        count: topics.length,
      });

      return { topics };
    } catch (error) {
      this.logger.error('Failed to list topics by space', {
        spaceId: command.spaceId,
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
