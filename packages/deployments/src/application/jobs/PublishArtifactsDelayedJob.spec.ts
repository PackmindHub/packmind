import { PublishArtifactsDelayedJob } from './PublishArtifactsDelayedJob';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import {
  PublishArtifactsJobInput,
  PublishArtifactsJobOutput,
} from '../../domain/jobs/PublishArtifactsJob';
import {
  createDistributionId,
  createGitRepoId,
  createOrganizationId,
  createTargetId,
  createUserId,
  DistributionStatus,
  IGitPort,
} from '@packmind/types';
import { SSEEventPublisher } from '@packmind/node-utils';
import { mockInterface, stubLogger } from '@packmind/test-utils';
import { PackmindLogger } from '@packmind/logger';
import { Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';

describe('PublishArtifactsDelayedJob', () => {
  let delayedJob: PublishArtifactsDelayedJob;
  let mockDistributionRepository: jest.Mocked<IDistributionRepository>;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockLogger: PackmindLogger;
  let publishSSEEvent: jest.SpyInstance;

  const organizationId = createOrganizationId(uuidv4());
  // One job publishes every target of a repository, so it carries one
  // distribution per target.
  const distributionId1 = createDistributionId(uuidv4());
  const distributionId2 = createDistributionId(uuidv4());

  const jobInput: PublishArtifactsJobInput = {
    distributionIds: [distributionId1, distributionId2],
    organizationId,
    userId: createUserId(uuidv4()),
    targetIds: [createTargetId(uuidv4()), createTargetId(uuidv4())],
    gitRepoId: createGitRepoId(uuidv4()),
    fileUpdates: { createOrUpdate: [], delete: [] },
    commitMessage: '[PACKMIND] Update artifacts',
    commandVersionIds: [],
    standardVersionIds: [],
    skillVersionIds: [],
    activeRenderModes: [],
    packagesSlugs: [],
    source: 'ui',
  };

  beforeEach(() => {
    mockLogger = stubLogger();
    mockDistributionRepository = mockInterface<IDistributionRepository>();
    mockGitPort = mockInterface<IGitPort>();
    publishSSEEvent = jest
      .spyOn(SSEEventPublisher, 'publishDistributionStatusChangeEvent')
      .mockResolvedValue(undefined);

    delayedJob = new PublishArtifactsDelayedJob(
      jest.fn(),
      mockDistributionRepository,
      mockGitPort,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('when the commit succeeds', () => {
    const result: PublishArtifactsJobOutput = {
      distributionIds: [distributionId1, distributionId2],
      organizationId,
      success: true,
      status: DistributionStatus.success,
    };

    beforeEach(async () => {
      const completed = delayedJob.getWorkerListener().completed;
      await completed?.(
        { id: 'job-1', data: jobInput } as Job<
          PublishArtifactsJobInput,
          PublishArtifactsJobOutput,
          string
        >,
        result,
      );
    });

    it('updates the status of every distribution', () => {
      expect(mockDistributionRepository.updateStatus).toHaveBeenCalledTimes(2);
    });

    it('updates the first distribution', () => {
      expect(mockDistributionRepository.updateStatus).toHaveBeenCalledWith(
        distributionId1,
        DistributionStatus.success,
        undefined,
      );
    });

    it('updates the second distribution', () => {
      expect(mockDistributionRepository.updateStatus).toHaveBeenCalledWith(
        distributionId2,
        DistributionStatus.success,
        undefined,
      );
    });

    it('notifies the frontend for every distribution', () => {
      expect(publishSSEEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('when the commit fails', () => {
    beforeEach(async () => {
      const failed = delayedJob.getWorkerListener().failed;
      await failed?.(
        { id: 'job-1', data: jobInput } as Job<
          PublishArtifactsJobInput,
          PublishArtifactsJobOutput,
          string
        >,
        new Error('Commit failed'),
      );
    });

    it('fails every distribution', () => {
      expect(mockDistributionRepository.updateStatus).toHaveBeenCalledTimes(2);
    });

    it('fails the second distribution with the error message', () => {
      expect(mockDistributionRepository.updateStatus).toHaveBeenCalledWith(
        distributionId2,
        DistributionStatus.failure,
        undefined,
        'Commit failed',
      );
    });

    it('notifies the frontend for every distribution', () => {
      expect(publishSSEEvent).toHaveBeenCalledTimes(2);
    });
  });
});
