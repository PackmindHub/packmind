import { Factory } from '@packmind/test-utils';
import {
  createKnowledgePatchId,
  createSpaceId,
  KnowledgePatch,
  KnowledgePatchStatus,
  KnowledgePatchType,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export const knowledgePatchFactory: Factory<KnowledgePatch> = (
  patch?: Partial<KnowledgePatch>,
) => {
  const now = new Date();
  return {
    id: createKnowledgePatchId(uuidv4()),
    spaceId: createSpaceId(uuidv4()),
    patchType: KnowledgePatchType.UPDATE_STANDARD,
    proposedChanges: {
      standardId: uuidv4(),
      action: 'addRule',
      content: 'Test rule content',
    },
    diffOriginal: 'Original standard content',
    diffModified: 'Original standard content\n+ Test rule content',
    status: KnowledgePatchStatus.PENDING_REVIEW,
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
};
