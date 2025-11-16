import { PackmindLogger } from '@packmind/logger';
import {
  DistillTopicCommand,
  DistillTopicResponse,
  IDistillTopicUseCase,
  IStandardsPort,
  IRecipesPort,
  KnowledgePatch,
} from '@packmind/types';
import { DistillationService } from '../../services/DistillationService';
import { KnowledgePatchService } from '../../services/KnowledgePatchService';
import { TopicService } from '../../services/TopicService';

const origin = 'DistillTopicUsecase';

export class DistillTopicUsecase implements IDistillTopicUseCase {
  constructor(
    private readonly topicService: TopicService,
    private readonly knowledgePatchService: KnowledgePatchService,
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('DistillTopicUsecase initialized');
  }

  async execute(command: DistillTopicCommand): Promise<DistillTopicResponse> {
    this.logger.info('Executing distillTopic use case', {
      topicId: command.topicId,
      userId: command.userId,
    });

    try {
      // Fetch the topic
      const topic = await this.topicService.getTopicById(command.topicId);
      if (!topic) {
        throw new Error(`Topic not found: ${command.topicId}`);
      }

      // Create distillation service
      const distillationService = new DistillationService(
        this.standardsPort,
        this.recipesPort,
        this.logger,
      );

      // Distill the topic to generate patch proposals
      const patchDataArray = await distillationService.distillTopic(
        topic,
        command.organizationId,
        command.userId,
      );

      this.logger.info('Topic distillation completed', {
        topicId: command.topicId,
        patchesGenerated: patchDataArray.length,
      });

      // Create knowledge patches
      let patches: KnowledgePatch[];
      if (patchDataArray.length === 0) {
        this.logger.warn('No patches generated for topic', {
          topicId: command.topicId,
        });
        patches = [];
      } else if (patchDataArray.length === 1) {
        const patch = await this.knowledgePatchService.addKnowledgePatch(
          patchDataArray[0],
        );
        patches = [patch];
      } else {
        patches =
          await this.knowledgePatchService.addKnowledgePatches(patchDataArray);
      }

      // TODO: Soft-delete the topic if patches were created
      // This would require adding a delete method to TopicService

      this.logger.info('DistillTopic use case completed successfully', {
        topicId: command.topicId,
        patchesCreated: patches.length,
      });

      return {
        jobId: `sync-${Date.now()}`, // Placeholder since we're running synchronously
        topicId: command.topicId,
        patchIds: patches.map((p) => p.id),
      };
    } catch (error) {
      this.logger.error('Failed to execute distillTopic use case', {
        topicId: command.topicId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
