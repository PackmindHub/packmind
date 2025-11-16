import { PackmindLogger } from '@packmind/logger';
import {
  itHandlesSoftDelete,
  makeTestDatasource,
  stubLogger,
} from '@packmind/test-utils';
import {
  createSpaceId,
  createTopicId,
  Topic,
  WithSoftDelete,
} from '@packmind/types';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { topicFactory } from '../../../test/topicFactory';
import { ITopicRepository } from '../../domain/repositories/ITopicRepository';
import { TopicSchema } from '../schemas/TopicSchema';
import { TopicRepository } from './TopicRepository';

describe('TopicRepository', () => {
  let datasource: DataSource;
  let topicRepository: ITopicRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let typeormRepo: Repository<Topic>;

  beforeEach(async () => {
    datasource = await makeTestDatasource([TopicSchema]);
    await datasource.initialize();
    await datasource.synchronize();

    stubbedLogger = stubLogger();
    typeormRepo = datasource.getRepository(TopicSchema);

    topicRepository = new TopicRepository(typeormRepo, stubbedLogger);
  });

  afterEach(async () => {
    await datasource.destroy();
  });

  it('can find a topic by id', async () => {
    const topic = topicFactory();
    await topicRepository.add(topic);

    const foundTopic = await topicRepository.findById(topic.id);
    expect(foundTopic).toEqual(topic);
  });

  describe('when finding a non-existent topic', () => {
    it('returns null', async () => {
      const foundTopic = await topicRepository.findById(
        createTopicId(uuidv4()),
      );
      expect(foundTopic).toBeNull();
    });
  });

  describe('findBySpaceId', () => {
    it('can find topics by space ID', async () => {
      const spaceId = createSpaceId(uuidv4());
      const topic1 = topicFactory({ spaceId, title: 'Topic 1' });
      const topic2 = topicFactory({ spaceId, title: 'Topic 2' });
      const topic3 = topicFactory({ title: 'Topic 3' }); // Different space

      await topicRepository.add(topic1);
      await topicRepository.add(topic2);
      await topicRepository.add(topic3);

      const topics = await topicRepository.findBySpaceId(spaceId);
      expect(topics).toHaveLength(2);
      expect(topics.map((t) => t.title)).toEqual(
        expect.arrayContaining(['Topic 1', 'Topic 2']),
      );
    });

    describe('when no topics exist for space', () => {
      it('returns empty array', async () => {
        const spaceId = createSpaceId(uuidv4());
        const topics = await topicRepository.findBySpaceId(spaceId);
        expect(topics).toHaveLength(0);
      });
    });

    it('orders topics by created date descending', async () => {
      const spaceId = createSpaceId(uuidv4());
      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-01-02');
      const topic1 = topicFactory({
        spaceId,
        title: 'Old Topic',
        createdAt: oldDate,
        updatedAt: oldDate,
      });
      const topic2 = topicFactory({
        spaceId,
        title: 'New Topic',
        createdAt: newDate,
        updatedAt: newDate,
      });

      await topicRepository.add(topic1);
      await topicRepository.add(topic2);

      const topics = await topicRepository.findBySpaceId(spaceId);
      expect(topics[0].title).toBe('New Topic');
      expect(topics[1].title).toBe('Old Topic');
    });
  });

  itHandlesSoftDelete<Topic>({
    entityFactory: topicFactory,
    getRepository: () => topicRepository,
    queryDeletedEntity: async (id) =>
      typeormRepo.findOne({
        where: { id },
        withDeleted: true,
      }) as Promise<WithSoftDelete<Topic> | null>,
  });
});
