import { v4 as uuidv4 } from 'uuid';
import { IKnowledgePatchRepository } from '../../domain/repositories/IKnowledgePatchRepository';
import { KnowledgePatchRepository } from '../../infra/repositories/KnowledgePatchRepository';
import { PackmindLogger } from '@packmind/logger';
import {
  createKnowledgePatchId,
  KnowledgePatch,
  KnowledgePatchId,
  KnowledgePatchType,
  KnowledgePatchStatus,
  SpaceId,
  TopicId,
} from '@packmind/types';

const origin = 'KnowledgePatchService';

export type CreateKnowledgePatchData = {
  spaceId: SpaceId;
  topicId: TopicId;
  patchType: KnowledgePatchType;
  proposedChanges: Record<string, unknown>;
  diffPreview: string;
};

export class KnowledgePatchService {
  constructor(
    private readonly knowledgePatchRepository: IKnowledgePatchRepository = new KnowledgePatchRepository(),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('KnowledgePatchService initialized');
  }

  async addKnowledgePatch(
    patchData: CreateKnowledgePatchData,
  ): Promise<KnowledgePatch> {
    this.logger.info('Adding new knowledge patch', {
      topicId: patchData.topicId,
      patchType: patchData.patchType,
      spaceId: patchData.spaceId,
    });

    try {
      const patchId = createKnowledgePatchId(uuidv4());

      const patch: KnowledgePatch = {
        id: patchId,
        ...patchData,
        status: KnowledgePatchStatus.PENDING_REVIEW,
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
      };

      const savedPatch = await this.knowledgePatchRepository.add(patch);
      this.logger.info('Knowledge patch added successfully', {
        patchId,
        patchType: patchData.patchType,
      });

      return savedPatch;
    } catch (error) {
      this.logger.error('Failed to add knowledge patch', {
        topicId: patchData.topicId,
        patchType: patchData.patchType,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async addKnowledgePatches(
    patchDataArray: CreateKnowledgePatchData[],
  ): Promise<KnowledgePatch[]> {
    this.logger.info('Adding batch of knowledge patches', {
      count: patchDataArray.length,
    });

    try {
      const patches: KnowledgePatch[] = patchDataArray.map((patchData) => ({
        id: createKnowledgePatchId(uuidv4()),
        ...patchData,
        status: KnowledgePatchStatus.PENDING_REVIEW,
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
      }));

      const savedPatches =
        await this.knowledgePatchRepository.addBatch(patches);
      this.logger.info('Batch of knowledge patches added successfully', {
        count: savedPatches.length,
      });

      return savedPatches;
    } catch (error) {
      this.logger.error('Failed to add batch of knowledge patches', {
        count: patchDataArray.length,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getKnowledgePatchById(
    patchId: KnowledgePatchId,
  ): Promise<KnowledgePatch | null> {
    this.logger.info('Getting knowledge patch by ID', { patchId });

    try {
      const patch = await this.knowledgePatchRepository.findById(patchId);

      if (patch) {
        this.logger.info('Knowledge patch found', { patchId });
      } else {
        this.logger.warn('Knowledge patch not found', { patchId });
      }

      return patch;
    } catch (error) {
      this.logger.error('Failed to get knowledge patch by ID', {
        patchId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listKnowledgePatchesByTopicId(
    topicId: TopicId,
  ): Promise<KnowledgePatch[]> {
    this.logger.info('Listing knowledge patches by topic ID', { topicId });

    try {
      const patches =
        await this.knowledgePatchRepository.findByTopicId(topicId);
      this.logger.info('Knowledge patches found by topic ID', {
        topicId,
        count: patches.length,
      });
      return patches;
    } catch (error) {
      this.logger.error('Failed to list knowledge patches by topic ID', {
        topicId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listKnowledgePatchesBySpaceId(
    spaceId: SpaceId,
  ): Promise<KnowledgePatch[]> {
    this.logger.info('Listing knowledge patches by space ID', { spaceId });

    try {
      const patches =
        await this.knowledgePatchRepository.findBySpaceId(spaceId);
      this.logger.info('Knowledge patches found by space ID', {
        spaceId,
        count: patches.length,
      });
      return patches;
    } catch (error) {
      this.logger.error('Failed to list knowledge patches by space ID', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listPendingReviewPatches(spaceId: SpaceId): Promise<KnowledgePatch[]> {
    this.logger.info('Listing pending review knowledge patches', { spaceId });

    try {
      const patches =
        await this.knowledgePatchRepository.findPendingReview(spaceId);
      this.logger.info('Pending review knowledge patches found', {
        spaceId,
        count: patches.length,
      });
      return patches;
    } catch (error) {
      this.logger.error('Failed to list pending review knowledge patches', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
