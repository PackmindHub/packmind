import { UserId } from '../accounts/User';
import { SpaceId } from '../spaces/SpaceId';
import { KnowledgePatchId } from './KnowledgePatchId';
import { KnowledgePatchStatus } from './KnowledgePatchStatus';
import { KnowledgePatchType } from './KnowledgePatchType';

export type KnowledgePatch = {
  id: KnowledgePatchId;
  spaceId: SpaceId;
  patchType: KnowledgePatchType;
  proposedChanges: Record<string, unknown>;
  diffOriginal: string;
  diffModified: string;
  status: KnowledgePatchStatus;
  reviewedBy: UserId | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
};
