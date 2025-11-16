import {
  KnowledgePatchId,
  KnowledgePatchStatus,
  SpaceId,
  TopicId,
} from '@packmind/types';
import { ORGANIZATION_QUERY_SCOPE } from '../../organizations/api/queryKeys';
import { SPACES_SCOPE } from '../../spaces/api/queryKeys';

export const LEARNINGS_QUERY_SCOPE = 'learnings';

export enum LearningsQueryKeys {
  LIST_PATCHES = 'list-patches',
  GET_PATCH_BY_ID = 'get-patch-by-id',
  LIST_TOPICS = 'list-topics',
  GET_TOPIC_BY_ID = 'get-topic-by-id',
}

export function getKnowledgePatchesBySpaceKey(
  spaceId: SpaceId | undefined,
  status?: KnowledgePatchStatus,
) {
  const baseKey = [
    ORGANIZATION_QUERY_SCOPE,
    SPACES_SCOPE,
    spaceId,
    LEARNINGS_QUERY_SCOPE,
    LearningsQueryKeys.LIST_PATCHES,
  ];

  return status ? [...baseKey, status] : baseKey;
}

export function getKnowledgePatchByIdKey(
  spaceId: SpaceId | undefined,
  patchId: KnowledgePatchId,
) {
  return [
    ORGANIZATION_QUERY_SCOPE,
    SPACES_SCOPE,
    spaceId,
    LEARNINGS_QUERY_SCOPE,
    LearningsQueryKeys.GET_PATCH_BY_ID,
    patchId,
  ];
}

export function getTopicsBySpaceKey(spaceId: SpaceId | undefined) {
  return [
    ORGANIZATION_QUERY_SCOPE,
    SPACES_SCOPE,
    spaceId,
    LEARNINGS_QUERY_SCOPE,
    LearningsQueryKeys.LIST_TOPICS,
  ];
}

export function getTopicByIdKey(
  spaceId: SpaceId | undefined,
  topicId: TopicId,
) {
  return [
    ORGANIZATION_QUERY_SCOPE,
    SPACES_SCOPE,
    spaceId,
    LEARNINGS_QUERY_SCOPE,
    LearningsQueryKeys.GET_TOPIC_BY_ID,
    topicId,
  ];
}
