import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import { JobsService } from '@packmind/node-utils';
import {
  IAccountsPort,
  IAccountsPortName,
  IRecipesPort,
  IRecipesPortName,
  ISpacesPort,
  ISpacesPortName,
  IStandardsPort,
  IStandardsPortName,
} from '@packmind/types';
import { LearningsAdapter } from './LearningsAdapter';
import { LearningsServices } from '../services/LearningsServices';
import { TopicService } from '../services/TopicService';
import { KnowledgePatchService } from '../services/KnowledgePatchService';

describe('LearningsAdapter', () => {
  let adapter: LearningsAdapter;
  let learningsServices: jest.Mocked<LearningsServices>;
  let topicService: jest.Mocked<TopicService>;
  let knowledgePatchService: jest.Mocked<KnowledgePatchService>;
  let mockAccountsPort: jest.Mocked<IAccountsPort>;
  let mockSpacesPort: jest.Mocked<ISpacesPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockRecipesPort: jest.Mocked<IRecipesPort>;
  let mockJobsService: jest.Mocked<JobsService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    topicService = {
      addTopic: jest.fn(),
      getTopicById: jest.fn(),
      listTopicsBySpaceId: jest.fn(),
    } as unknown as jest.Mocked<TopicService>;

    knowledgePatchService = {
      addKnowledgePatch: jest.fn(),
      addKnowledgePatches: jest.fn(),
      getKnowledgePatchById: jest.fn(),
      listKnowledgePatchesByTopicId: jest.fn(),
      listKnowledgePatchesBySpaceId: jest.fn(),
      listPendingReviewPatches: jest.fn(),
    } as unknown as jest.Mocked<KnowledgePatchService>;

    learningsServices = {
      getTopicService: jest.fn().mockReturnValue(topicService),
      getKnowledgePatchService: jest
        .fn()
        .mockReturnValue(knowledgePatchService),
      getTopicRepository: jest.fn().mockReturnValue({
        add: jest.fn(),
        findById: jest.fn(),
        deleteById: jest.fn(),
        restoreById: jest.fn(),
        findBySpaceId: jest.fn(),
        updateStatus: jest.fn(),
        findPendingDigestion: jest.fn(),
      }),
      getTopicKnowledgePatchRepository: jest.fn().mockReturnValue({
        linkTopicToPatch: jest.fn(),
        linkTopicToPatches: jest.fn(),
        findPatchIdsByTopicId: jest.fn(),
        findTopicIdsByPatchId: jest.fn(),
      }),
      initializePatchApplicationService: jest.fn(),
      getPatchApplicationService: jest.fn().mockReturnValue(null),
    } as unknown as jest.Mocked<LearningsServices>;

    mockAccountsPort = {
      getUsersByOrganizationId: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    mockSpacesPort = {
      getSpaceById: jest.fn(),
      listSpacesByOrganization: jest.fn(),
    } as unknown as jest.Mocked<ISpacesPort>;

    mockStandardsPort = {
      getStandard: jest.fn(),
      listStandardsBySpace: jest.fn(),
      getLatestRulesByStandardId: jest.fn(),
      findStandardBySlug: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    mockRecipesPort = {
      getRecipeByIdInternal: jest.fn(),
      listRecipesByOrganization: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    mockJobsService = {
      registerJobQueue: jest.fn(),
      getJobQueue: jest.fn(),
    } as unknown as jest.Mocked<JobsService>;

    stubbedLogger = stubLogger();

    adapter = new LearningsAdapter(learningsServices, stubbedLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('initializes successfully with ports and services', async () => {
      await adapter.initialize({
        [IAccountsPortName]: mockAccountsPort,
        [ISpacesPortName]: mockSpacesPort,
        [IStandardsPortName]: mockStandardsPort,
        [IRecipesPortName]: mockRecipesPort,
        jobsService: mockJobsService,
      });
      expect(adapter.isReady()).toBe(true);
    });
  });

  describe('isReady', () => {
    it('returns true after initialization with ports and services', async () => {
      await adapter.initialize({
        [IAccountsPortName]: mockAccountsPort,
        [ISpacesPortName]: mockSpacesPort,
        [IStandardsPortName]: mockStandardsPort,
        [IRecipesPortName]: mockRecipesPort,
        jobsService: mockJobsService,
      });
      expect(adapter.isReady()).toBe(true);
    });

    it('returns false before initialization', () => {
      expect(adapter.isReady()).toBe(false);
    });
  });

  describe('getPort', () => {
    it('returns the adapter instance as the port', () => {
      const port = adapter.getPort();
      expect(port).toBe(adapter);
    });
  });
});
