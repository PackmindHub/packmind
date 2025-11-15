import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { LearningsAdapter } from './LearningsAdapter';
import { LearningsServices } from '../services/LearningsServices';
import { TopicService } from '../services/TopicService';

describe('LearningsAdapter', () => {
  let adapter: LearningsAdapter;
  let learningsServices: jest.Mocked<LearningsServices>;
  let topicService: jest.Mocked<TopicService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    topicService = {
      addTopic: jest.fn(),
      getTopicById: jest.fn(),
      listTopicsBySpaceId: jest.fn(),
    } as unknown as jest.Mocked<TopicService>;

    learningsServices = {
      getTopicService: jest.fn().mockReturnValue(topicService),
    } as unknown as jest.Mocked<LearningsServices>;

    stubbedLogger = stubLogger();

    adapter = new LearningsAdapter(learningsServices, stubbedLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('initializes successfully', async () => {
      await adapter.initialize();
      expect(adapter.isReady()).toBe(true);
    });
  });

  describe('isReady', () => {
    it('returns true after initialization', async () => {
      await adapter.initialize();
      expect(adapter.isReady()).toBe(true);
    });

    it('returns true even before initialization', () => {
      expect(adapter.isReady()).toBe(true);
    });
  });

  describe('getPort', () => {
    it('returns the adapter instance as the port', () => {
      const port = adapter.getPort();
      expect(port).toBe(adapter);
    });
  });
});
