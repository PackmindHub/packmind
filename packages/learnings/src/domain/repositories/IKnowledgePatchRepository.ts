import { IRepository, KnowledgePatch, SpaceId } from '@packmind/types';

export interface IKnowledgePatchRepository extends IRepository<KnowledgePatch> {
  findBySpaceId(spaceId: SpaceId): Promise<KnowledgePatch[]>;
  findPendingReview(spaceId: SpaceId): Promise<KnowledgePatch[]>;
  addBatch(patches: KnowledgePatch[]): Promise<KnowledgePatch[]>;
}
