import { GitProviderId, GitRepo } from '@packmind/types';
import { OwnerReading } from '../../GitProviderService';

/**
 * The first repository a reading of the owner finds, readings tried in order,
 * each looked up among the repositories of the provider it names, if any.
 */
export async function findByOwnerReadings(
  readings: ReadonlyArray<OwnerReading>,
  find: (
    owner: string,
    opts: { providerId?: GitProviderId },
  ) => Promise<GitRepo | null>,
): Promise<GitRepo | null> {
  for (const { owner, providerId } of readings) {
    const gitRepo = await find(owner, providerId ? { providerId } : {});
    if (gitRepo) {
      return gitRepo;
    }
  }
  return null;
}
