import {
  GitCommit,
  IGitPort,
  MarketplaceDistributionId,
  MarketplaceId,
  OrganizationId,
  PackageId,
  UserId,
} from '@packmind/types';
import { TestApp } from './TestApp';

/**
 * Shape of the removal job exposed by the deployments adapter. Only the two
 * methods the integration tests drive are typed here.
 */
interface RemovalJobHandle {
  addJob: (...args: unknown[]) => Promise<string>;
  runJob: (
    jobId: string,
    input: {
      marketplaceDistributionId: MarketplaceDistributionId;
      marketplaceId: MarketplaceId;
      packageId: PackageId;
      organizationId: OrganizationId;
      userId: UserId;
    },
    controller: AbortController,
  ) => Promise<unknown>;
}

/**
 * Prepares the `RemovePluginFromMarketplaceDelayedJob` for deterministic
 * in-test driving and returns its handle.
 *
 * Since the Jun-2026 refactor, `markPluginForRemoval` no longer flips the
 * distribution to `to_be_removed`; that flip is owned by the removal job once
 * the deletion lands on the rolling `packmind/sync` branch. Tests that need a
 * `to_be_removed` row must therefore run the job explicitly, mirroring what the
 * BullMQ worker does in production.
 *
 * This stubs:
 *  - `addJob` to a no-op so the enqueue triggered by `markPluginForRemoval`
 *    does not also reach a real queue / async worker (mirrors the
 *    reconciliation-job stub pattern), and
 *  - the write-side git operations the job performs on the sync branch so
 *    `runJob` commits successfully and reaches the status flip. Descriptor
 *    reads (`getFileFromRepo`) are left to the caller, which controls the
 *    descriptor content per scenario.
 *
 * Call this in `beforeEach` BEFORE invoking `markPluginForRemoval`, then call
 * `runMarketplaceRemovalJob` once the plugin has been marked.
 */
export function prepareMarketplaceRemovalJob(
  testApp: TestApp,
  gitPort: IGitPort,
): RemovalJobHandle {
  jest.spyOn(gitPort, 'checkBranchExists').mockResolvedValue(false);
  jest.spyOn(gitPort, 'createBranchFromBase').mockResolvedValue(undefined);
  jest
    .spyOn(gitPort, 'commitToGit')
    .mockResolvedValue({ sha: 'removal-commit-sha' } as GitCommit);
  jest.spyOn(gitPort, 'openOrUpdatePullRequest').mockResolvedValue({
    url: 'https://github.com/anthropic/marketplace/pull/1',
    number: 1,
    wasCreated: true,
  });

  const job = (
    testApp.deploymentsHexa.getAdapter() as unknown as {
      getRemovePluginFromMarketplaceJob: () => RemovalJobHandle;
    }
  ).getRemovePluginFromMarketplaceJob();

  jest.spyOn(job, 'addJob').mockResolvedValue('mock-removal-job-id');

  return job;
}

/**
 * Runs the removal job inline for a single distribution, flipping it from
 * `success` to `to_be_removed` exactly as the production worker does after the
 * deletion lands on the sync branch.
 */
export async function runMarketplaceRemovalJob(
  job: RemovalJobHandle,
  input: {
    marketplaceDistributionId: MarketplaceDistributionId;
    marketplaceId: MarketplaceId;
    packageId: PackageId;
    organizationId: OrganizationId;
    userId: UserId;
  },
): Promise<void> {
  await job.runJob('manual-removal-job-id', input, new AbortController());
}
