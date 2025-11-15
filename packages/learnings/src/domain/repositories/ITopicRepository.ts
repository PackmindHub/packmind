import { IRepository, Topic, SpaceId } from '@packmind/types';

export interface ITopicRepository extends IRepository<Topic> {
  findBySpaceId(spaceId: SpaceId): Promise<Topic[]>;
}
