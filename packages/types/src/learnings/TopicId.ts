import { Branded, brandedIdFactory } from '../brandedTypes';

export type TopicId = Branded<'TopicId'>;
export const createTopicId = brandedIdFactory<TopicId>();
