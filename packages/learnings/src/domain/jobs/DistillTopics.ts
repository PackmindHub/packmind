import { OrganizationId, TopicId } from '@packmind/types';

export type DistillTopicsInput = {
  topicIds: TopicId[];
  organizationId: OrganizationId;
  userId: string;
};

export type DistillTopicsOutput = {
  topicIds: TopicId[];
  processedCount: number;
  failedCount: number;
};
