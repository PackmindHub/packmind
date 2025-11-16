import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  createSpaceId,
  createTopicId,
  GetTopicByIdCommand,
  GetTopicByIdResponse,
  IAccountsPort,
  IGetTopicByIdUseCase,
  ISpacesPort,
} from '@packmind/types';
import { TopicService } from '../../services/TopicService';

const origin = 'GetTopicByIdUsecase';

export class GetTopicByIdUsecase
  extends AbstractMemberUseCase<GetTopicByIdCommand, GetTopicByIdResponse>
  implements IGetTopicByIdUseCase
{
  constructor(
    accountsAdapter: IAccountsPort,
    private readonly topicService: TopicService,
    private readonly spacesPort: ISpacesPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsAdapter, logger);
    this.logger.info('GetTopicByIdUsecase initialized');
  }

  async executeForMembers(
    command: GetTopicByIdCommand & MemberContext,
  ): Promise<GetTopicByIdResponse> {
    this.logger.info('Getting topic by ID', {
      topicId: command.topicId,
      spaceId: command.spaceId,
    });

    try {
      const spaceId = createSpaceId(command.spaceId);
      const topicId = createTopicId(command.topicId);

      // Verify the space belongs to the organization
      const space = await this.spacesPort.getSpaceById(spaceId);
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

      const topic = await this.topicService.getTopicById(topicId);

      if (!topic) {
        this.logger.info('Topic not found', { topicId: command.topicId });
        return { topic: null };
      }

      // Verify the topic belongs to the space
      if (topic.spaceId !== command.spaceId) {
        this.logger.warn('Topic does not belong to space', {
          topicId: command.topicId,
          topicSpaceId: topic.spaceId,
          requestSpaceId: command.spaceId,
        });
        throw new Error(
          `Topic ${command.topicId} does not belong to space ${command.spaceId}`,
        );
      }

      this.logger.info('Topic retrieved successfully', {
        topicId: command.topicId,
      });
      return { topic };
    } catch (error) {
      this.logger.error('Failed to get topic by ID', {
        topicId: command.topicId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
