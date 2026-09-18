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
import { gitCommitFactory, gitRepoFactory } from '@packmind/git/test';
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

  describe('when one distribution cannot be updated', () => {
    const result: PublishArtifactsJobOutput = {
      distributionIds: [distributionId1, distributionId2],
      organizationId,
      success: true,
      status: DistributionStatus.success,
    };

    beforeEach(async () => {
      mockDistributionRepository.updateStatus.mockRejectedValueOnce(
        new Error('Database unavailable'),
      );

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

    it('still finalizes the other distribution', () => {
      expect(mockDistributionRepository.updateStatus).toHaveBeenCalledWith(
        distributionId2,
        DistributionStatus.success,
        undefined,
      );
    });

    it('still notifies the frontend for the other distribution', () => {
      expect(publishSSEEvent).toHaveBeenCalledWith(
        distributionId2,
        DistributionStatus.success,
        organizationId,
      );
    });
  });

  describe('when a job enqueued before the deploy is processed', () => {
    // The queue keeps its name, so a job holding the previous single
    // distributionId payload is still waiting in Redis after a deploy.
    const legacyJobData = {
      ...jobInput,
      distributionIds: undefined,
      distributionId: distributionId1,
    } as unknown as PublishArtifactsJobInput;

    it('names the job after its distribution', () => {
      expect(delayedJob.getJobName(legacyJobData)).toBe(
        `publish-artifacts-${distributionId1}`,
      );
    });

    describe('when it runs', () => {
      let output: PublishArtifactsJobOutput;

      beforeEach(async () => {
        mockGitPort.getRepositoryById.mockResolvedValue(gitRepoFactory());
        mockGitPort.commitToGit.mockResolvedValue(gitCommitFactory());

        output = await delayedJob.runJob(
          'job-1',
          legacyJobData,
          new AbortController(),
        );
      });

      it('commits instead of failing on the missing array', () => {
        expect(mockGitPort.commitToGit).toHaveBeenCalledTimes(1);
      });

      it('reports its distribution', () => {
        expect(output.distributionIds).toEqual([distributionId1]);
      });
    });

    describe('when the commit fails', () => {
      beforeEach(async () => {
        const failed = delayedJob.getWorkerListener().failed;
        await failed?.(
          { id: 'job-1', data: legacyJobData } as Job<
            PublishArtifactsJobInput,
            PublishArtifactsJobOutput,
            string
          >,
          new Error('Commit failed'),
        );
      });

      it('still fails its distribution instead of leaving it in progress', () => {
        expect(mockDistributionRepository.updateStatus).toHaveBeenCalledWith(
          distributionId1,
          DistributionStatus.failure,
          undefined,
          'Commit failed',
        );
      });
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
