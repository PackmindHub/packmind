import { SSEEventPublisher } from '@packmind/node-utils';
import { mockInterface, stubLogger } from '@packmind/test-utils';
import {
  createDistributionId,
  createGitRepoId,
  createOrganizationId,
  createUserId,
  DistributionId,
  DistributionStatus,
  IGitPort,
} from '@packmind/types';
import { Job } from 'bullmq';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import {
  PublishArtifactsJobInput,
  PublishArtifactsJobOutput,
} from '../../domain/jobs/PublishArtifactsJob';
import { PublishArtifactsDelayedJob } from './PublishArtifactsDelayedJob';

jest.mock('@packmind/node-utils', () => ({
  ...jest.requireActual('@packmind/node-utils'),
  SSEEventPublisher: { publishDistributionStatusChangeEvent: jest.fn() },
}));

const publishStatusChange =
  SSEEventPublisher.publishDistributionStatusChangeEvent as jest.Mock;

describe('PublishArtifactsDelayedJob', () => {
  const organizationId = createOrganizationId('org-1');
  let distributionRepository: jest.Mocked<IDistributionRepository>;
  let job: PublishArtifactsDelayedJob;
  let firstDistributionId: DistributionId;
  let secondDistributionId: DistributionId;

  const jobInput = (
    distributionIds: DistributionId[],
  ): PublishArtifactsJobInput => ({
    distributionIds,
    organizationId,
    userId: createUserId('user-1'),
    gitRepoId: createGitRepoId('repo-1'),
    fileUpdates: { createOrUpdate: [], delete: [] },
    commitMessage: 'a commit',
    commandVersionIds: [],
    standardVersionIds: [],
    skillVersionIds: [],
    activeRenderModes: [],
    packagesSlugs: [],
    source: 'ui',
  });

  const asJob = (input: PublishArtifactsJobInput) =>
    ({ id: 'job-1', data: input }) as Job<
      PublishArtifactsJobInput,
      PublishArtifactsJobOutput,
      string
    >;

  beforeEach(() => {
    firstDistributionId = createDistributionId('distribution-1');
    secondDistributionId = createDistributionId('distribution-2');
    distributionRepository = mockInterface<IDistributionRepository>();
    publishStatusChange.mockResolvedValue(undefined);
    job = new PublishArtifactsDelayedJob(
      jest.fn(),
      distributionRepository,
      mockInterface<IGitPort>(),
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /*
   * A repository gets one job for all of its targets. Moving only the first
   * distribution left the others reading as 'Distributing now' after the
   * commit had already landed.
   */
  describe('when a job covering two distributions completes', () => {
    beforeEach(async () => {
      const input = jobInput([firstDistributionId, secondDistributionId]);

      await job.getWorkerListener().completed?.(asJob(input), {
        distributionIds: input.distributionIds,
        organizationId,
        success: true,
        status: DistributionStatus.success,
      });
    });

    it('moves both distributions out of in_progress', () => {
      expect(distributionRepository.updateStatus.mock.calls).toEqual([
        [firstDistributionId, DistributionStatus.success, undefined],
        [secondDistributionId, DistributionStatus.success, undefined],
      ]);
    });

    it('announces both distributions', () => {
      expect(publishStatusChange.mock.calls).toEqual([
        [firstDistributionId, DistributionStatus.success, organizationId],
        [secondDistributionId, DistributionStatus.success, organizationId],
      ]);
    });
  });

  describe('when one distribution cannot be updated', () => {
    beforeEach(async () => {
      const input = jobInput([firstDistributionId, secondDistributionId]);
      distributionRepository.updateStatus.mockRejectedValueOnce(
        new Error('the database is down'),
      );

      await job.getWorkerListener().completed?.(asJob(input), {
        distributionIds: input.distributionIds,
        organizationId,
        success: true,
        status: DistributionStatus.success,
      });
    });

    it('still updates the next one', () => {
      expect(distributionRepository.updateStatus).toHaveBeenCalledWith(
        secondDistributionId,
        DistributionStatus.success,
        undefined,
      );
    });
  });

  describe('when a job covering two distributions fails', () => {
    beforeEach(async () => {
      const input = jobInput([firstDistributionId, secondDistributionId]);

      await job
        .getWorkerListener()
        .failed?.(asJob(input), new Error('git refused the push'));
    });

    it('fails both distributions', () => {
      expect(distributionRepository.updateStatus.mock.calls).toEqual([
        [
          firstDistributionId,
          DistributionStatus.failure,
          undefined,
          'git refused the push',
        ],
        [
          secondDistributionId,
          DistributionStatus.failure,
          undefined,
          'git refused the push',
        ],
      ]);
    });
  });

  // Jobs enqueued before `distributionIds` existed are still in the queue.
  describe('when a job enqueued under the old payload fails', () => {
    beforeEach(async () => {
      const input = {
        ...jobInput([]),
        distributionIds: undefined as unknown as DistributionId[],
        distributionId: firstDistributionId,
      };

      await job
        .getWorkerListener()
        .failed?.(asJob(input), new Error('git refused the push'));
    });

    it('fails the distribution it names', () => {
      expect(distributionRepository.updateStatus).toHaveBeenCalledWith(
        firstDistributionId,
        DistributionStatus.failure,
        undefined,
        'git refused the push',
      );
    });
  });
});
