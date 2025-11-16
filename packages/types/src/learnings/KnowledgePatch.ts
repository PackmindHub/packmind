import { UserId } from '../accounts/User';
import { SpaceId } from '../spaces/SpaceId';
import { KnowledgePatchId } from './KnowledgePatchId';
import { KnowledgePatchStatus } from './KnowledgePatchStatus';
import { KnowledgePatchType } from './KnowledgePatchType';
import { TopicId } from './TopicId';

export type KnowledgePatch = {
  id: KnowledgePatchId;
  spaceId: SpaceId;
  topicId: TopicId;
  patchType: KnowledgePatchType;
  proposedChanges: Record<string, unknown>;
  diffPreview: string;
  status: KnowledgePatchStatus;
  reviewedBy: UserId | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
};
